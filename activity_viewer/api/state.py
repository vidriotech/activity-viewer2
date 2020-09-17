from pathlib import Path
from typing import List, Optional, Union

from allensdk.core.structure_tree import StructureTree
from flask import Flask
import numpy as np

from activity_viewer.base import type_check
from activity_viewer.compute.mappings import AestheticMapping, ColorMapping, ScalarMapping
from activity_viewer.compute.summaries import TimeseriesSummary
from activity_viewer.cache import Cache
from activity_viewer.loaders import NpzLoader
from activity_viewer.settings import AVSettings, make_default_settings


PathType = Union[str, Path]


def make_settings(app: Flask, filename: Optional[PathType]) -> AVSettings:
    """Make an AVSettings object for use with the Flask app.

    Parameters
    ----------
    app : Flask
        The Flask app. Used for logging.
    filename : str or Path
        Path to file to create settings object from.

    Returns
    -------
    settings : AVSettings
    """
    if filename is None:
        app.logger.debug(f"No settings file passed.")
        return make_default_settings()
    
    filename = Path(filename).resolve()
    if not filename.is_file():
        app.logger.warning(f"Passed settings file '{filename}' does not exist.")
        settings = make_default_settings()
    else:
        try:
            settings = AVSettings.from_file(filename)
        except Exception as e:
            app.logger.warning(f"Failed to load settings file '{filename}': {e}")
            settings = make_default_settings()

    return settings


class APIState:
    """Class representing state of the HTTP API."""
    def __init__(self, settings: AVSettings = None):
        self._settings = None
        self._penetrations = {}
        self._active_penetration = None
        self._npz_loader = NpzLoader()
        self._timeseries_summaries = {}

        self.settings = settings

    def _annotation_to_rgb(self, vals: np.ndarray):
        if vals is None:
            return

        # encode colors
        tree = StructureTree(self.cache.load_structure_graph())
        color_map = tree.get_colormap()
        color_map[0] = [255, 255, 255]
        color_map[997] = [136, 136, 136]

        return np.reshape([color_map[p] for p in vals.flat],
                          list(vals.shape) + [3]).astype(np.uint8)

    def _find_pseudocoronal_indices(self, coords: np.ndarray):
        X = np.asmatrix(np.hstack((np.ones((coords.shape[0], 1)), coords[:, 1][:, np.newaxis])))
        y = np.asmatrix(coords[:, 0]).T
        XtX = X.T * X
        Xty = X.T * y
        b = np.linalg.solve(XtX, Xty)

        # predict x coordinates
        headers = self.cache.load_annotation_volume_headers()
        volume_shape = headers["sizes"]
        ymax = volume_shape[1]
        X2 = np.asmatrix(np.hstack((np.ones((ymax, 1)), np.arange(ymax)[:, np.newaxis])))

        return np.array(X2 * b).flatten().astype(np.int)

    def _get_coronal_slice(self, ap_coordinate: float, volume: np.ndarray):
        ap_coordinate = int(ap_coordinate / self.settings.system.resolution)

        try:
            return volume[ap_coordinate, :, :].squeeze()
        except IndexError:
            return None

    def _get_horizontal_slice(self, dv_coordinate: float, volume: np.ndarray):
        dv_coordinate = int(dv_coordinate / self.settings.system.resolution)

        try:
            return volume[:, dv_coordinate, :].squeeze()
        except IndexError:
            return None

    def _get_sagittal_slice(self, lr_coordinate: float, volume: np.ndarray):
        lr_coordinate = int(lr_coordinate / self.settings.system.resolution)

        try:
            return volume[:, :, lr_coordinate].squeeze()
        except IndexError:
            return None

    def _make_color_mapping(self, penetration_id: str, params: dict):
        timeseries_id = params["timeseriesId"]
        mapping = params["mapping"]
        bounds = params["bounds"]

        if timeseries_id not in self._timeseries_summaries:
            summary = self.make_timeseries_summary(timeseries_id)
            if summary is None:
                return None

        data = self.get_timeseries(penetration_id, timeseries_id)
        times = data[0, :]
        values = data[1:, :]

        return ColorMapping.from_bounds(timeseries_id, times, values, bounds, mapping)

    def _make_scalar_mapping(self, penetration_id: str, params: dict):
        timeseries_id = params["timeseriesId"]
        bounds = params["bounds"]

        if timeseries_id not in self._timeseries_summaries:
            summary = self.make_timeseries_summary(timeseries_id)
            if summary is None:
                return None

        data = self.get_timeseries(penetration_id, timeseries_id)
        times = data[0, :]
        values = data[1:, :]

        return ScalarMapping.from_bounds(timeseries_id, times, values, bounds)

    def add_penetrations(self, file_paths: List[PathType]):
        """Add one or more penetrations to the set of current penetrations.

        Parameters
        ----------
        file_paths : list of str or Path
        """
        for file_path in file_paths:
            try:
                self._npz_loader.load_file(file_path)
            except (FileNotFoundError, TypeError, ValueError, KeyError) as e:
                print(e)
                continue

            probe_insertion = self._npz_loader.get("probe_insertion").reshape(-1)[0]
            self._penetrations[probe_insertion] = Path(file_path)

    def clear_penetrations(self):
        """Remove all penetrations from state."""
        self._penetrations = {}
        self._active_penetration = None

    def get_compartment_tree(self):
        """Get the entire compartment hierarchy."""
        def populate_children(tr: StructureTree, node: dict):
            for child in tr.children([node["id"]])[0]:
                child["children"] = []
                node["children"].append(child)
                
            for child in node["children"]:
                populate_children(tr, child)

        tree = StructureTree(self.cache.load_structure_graph())
        root = tree.get_structures_by_id([997])[0]
        root["rgb_triplet"] = 3*[135]
        root["children"] = []
        populate_children(tree, root)

        return root

    def get_compartments(self, penetration_id: str):
        """Get compartments for each point in `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        ccf_coord = self.get_coordinates(penetration_id)  # loads this penetration
        annotation_volume = self.cache.load_annotation_volume()
        tree = StructureTree(self.cache.load_structure_graph())

        i,j,k = (ccf_coord.T / self.settings.system.resolution).astype(np.int)
        cids = annotation_volume[i, j, k]

        return tree.get_structures_by_id(cids)

    def get_coronal_annotation_rgb(self, ap_coordinate: float):
        ref_slice = self.get_coronal_annotation_slice(ap_coordinate)
        
        return self._annotation_to_rgb(ref_slice)

    def get_coronal_annotation_slice(self, ap_coordinate: float):
        volume = self.cache.load_annotation_volume()

        return self._get_coronal_slice(ap_coordinate, volume)

    def get_coronal_template_slice(self, ap_coordinate: float):
        volume = self.cache.load_template_volume()

        return self._get_coronal_slice(ap_coordinate, volume).astype(np.uint8)

    def get_sagittal_annotation_slice(self, lr_coordinate: float):
        volume = self.cache.load_annotation_volume()
        return self._get_sagittal_slice(lr_coordinate, volume)

    def get_sagittal_annotation_rgb(self, lr_coordinate: float):
        ref_slice = self.get_sagittal_annotation_slice(lr_coordinate)

        return self._annotation_to_rgb(ref_slice)

    def get_sagittal_template_slice(self, lr_coordinate: float):
        volume = self.cache.load_template_volume()

        return self._get_sagittal_slice(lr_coordinate, volume).astype(np.uint8)

    def get_coordinates(self, penetration_id: str):
        """Get CCF coordinates for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return
        
        self.load_penetration(penetration_id)
        return self.npz_loader.get("ccf_coord")

    def get_penetration_filename(self, penetration_id: str):
        if not self.has_penetration(penetration_id):
            return

        return self._penetrations[penetration_id].resolve()

    def get_pseudocoronal_annotation_slice(self, penetration_id: str):
        """Get voxel values for pseudocoronal plane of best fit for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)

        ccf_coord = self.npz_loader.get("ccf_coord") / self.settings.system.resolution
        indices = self._find_pseudocoronal_indices(ccf_coord)
        volume = self.cache.load_annotation_volume()
        ref_slice = volume[indices, np.arange(volume.shape[1]), :].squeeze()

        return ref_slice

    def get_timeseries(self, penetration_id: str, timeseries_id: str) -> np.ndarray:
        """Get a specific timeseries' values for a specific penetration."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get(timeseries_id)

    def get_timeseries_list(self, penetration_id: str):
        """Get a list of timeseries for a specific penetration."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get("timeseries")

    def get_unit_ids(self, penetration_id: str):
        """Get point ids for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get("unit_id")

    def get_unit_stat(self, penetration_id: str, stat_id: str):
        """Get a specific unit statistic for a given penetration."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get(stat_id)

    def get_unit_stats_list(self, penetration_id: str):
        """Get a list of unit stats for a specific penetration."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get("unit_stats")

    def has_penetration(self, penetration_id: str) -> bool:
        """Return true if and only if `penetration_id` exists."""
        return penetration_id in self._penetrations

    def load_penetration(self, penetration_id: str):
        """Load data from penetration file."""
        if not self.has_penetration(penetration_id) or self._active_penetration == penetration_id:
            return

        # load once without validation (validation has already been performed at the add step)
        self.npz_loader.load_file(self._penetrations[penetration_id], validate=False)

    def make_aesthetic_mapping(self, penetration_id: str, params: dict):
        """Create an aesthetic mapping for a given penetration."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)

        color_mapping = self._make_color_mapping(
            penetration_id, params["color"]
        ) if "color" in params else None

        opacity_mapping = self._make_scalar_mapping(
            penetration_id, params["opacity"]
        ) if "opacity" in params else None

        radius_mapping = self._make_scalar_mapping(
            penetration_id, params["radius"]
        ) if "radius" in params else None

        visibility = None

        return AestheticMapping(penetration_id, color_mapping, opacity_mapping, radius_mapping, visibility)

    def make_timeseries_summary(self, timeseries_id: str) -> TimeseriesSummary:
        summary = TimeseriesSummary(timeseries_id)

        for penetration_id in self.penetrations:
            data = self.get_timeseries(penetration_id, timeseries_id)
            if data is not None:
                summary.update(data)

        self._timeseries_summaries[timeseries_id] = summary

        return summary

    def rm_penetrations(self, penetration_ids: List[str]):
        """Remove a penetration from state."""
        for penetration_id in penetration_ids:
            if not self.has_penetration(penetration_id):
                continue

            self._penetrations.pop(penetration_id)
            if self._active_penetration == penetration_id:
                self._active_penetration = None

    @property
    def cache(self) -> Cache:
        """Cache object."""
        return self._cache

    @property
    def npz_loader(self) -> NpzLoader:
        """NPZ file loader object."""
        return self._npz_loader

    @property
    def penetrations(self) -> List[str]:
        """List of loaded and valid penetrations."""
        return list(self._penetrations.keys())

    @property
    def settings(self) -> AVSettings:
        """Settings object."""
        if self._settings is None:
            return make_default_settings()

        return self._settings

    @settings.setter
    def settings(self, val: Optional[AVSettings]):
        if val is None:
            val = make_default_settings()

        type_check(val, AVSettings)
        self._settings = val
        self._cache = Cache(self._settings)

        self.add_penetrations(self._settings.system.data_files)

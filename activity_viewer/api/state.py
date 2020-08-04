from collections import deque
from pathlib import Path
from typing import List, Optional, Union

from allensdk.core.structure_tree import StructureTree
from flask import Flask
import numpy as np

from activity_viewer.base import type_check
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
    def __init__(self):
        self._settings = None
        self._cache = Cache(self.settings)
        self._npz_loader = NpzLoader()
        self._penetrations = {}
        self._active_penetration = None

    def _find_pseudocoronal_indices(self, coords: np.ndarray):
        X = np.asmatrix(np.hstack((np.ones((coords.shape[0], 1)), coords[:, 1][:, np.newaxis])))
        y = np.asmatrix(coords[:, 0]).T
        XtX = X.T * X
        Xty = X.T * y
        b = np.linalg.solve(XtX, Xty)
        xhat = np.array(X * b).flatten()

        resid = xhat - y
        mae = np.mean(np.abs(resid))
        mse = np.mean(np.inner(resid, resid))

        # predict x coordinates
        headers = self.cache.load_annotation_volume_headers()
        volume_shape = headers["sizes"]
        ymax = volume_shape[1]
        X2 = np.asmatrix(np.hstack((np.ones((ymax, 1)), np.arange(ymax)[:, np.newaxis])))

        return np.array(X2 * b).flatten().astype(np.int)

    def add_penetration(self, file_path: PathType):
        """Add a penetration to the set of current penetrations.

        Parameters
        ----------
        file_path : str or Path
        """
        print(f"loading penetration {file_path}")
        try:
            self._npz_loader.load_file(file_path)
        except (FileNotFoundError, TypeError, ValueError, KeyError) as e:
            print(e)
            return

        probe_insertion = self._npz_loader.get("probe_insertion").reshape(-1)[0]
        self._penetrations[probe_insertion] = Path(file_path)

    def get_compartment_tree(self):
        """Get the entire compartment hierarchy."""
        def populate_children(tr: StructureTree, node: dict):
            for child in tr.children([node["id"]])[0]:
                node["children"].append({
                    "id": child["id"],
                    "name": child["name"],
                    "acronym": child["acronym"],
                    "rgb_triplet": child["rgb_triplet"],
                    "children": []
                })
                
            for child in node["children"]:
                populate_children(tr, child)

        tree = StructureTree(self.cache.load_structure_graph())
        root = {
            "id": 997,
            "name": "root",
            "acronym": "root",
            "rgb_triplet": [135, 135, 135],
            "children": []
        }
        populate_children(tree, root)

        return root

    def get_compartments(self, penetration_id: str):
        """Get compartments for each point in `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        ccf_coord = self.get_coordinates(penetration_id)  # loads this penetration
        annotation_volume, _ = self.cache.load_annotation_volume()
        tree = StructureTree(self.cache.load_structure_graph())

        i,j,k = (ccf_coord.T / 100).astype(np.int)
        cids = annotation_volume[i, j, k]

        return tree.get_structures_by_id(cids)

    def get_coordinates(self, penetration_id: str):
        """Get CCF coordinates for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return
        
        self.load_penetration(penetration_id)
        return self.npz_loader.get("ccf_coord")

    def get_unit_ids(self, penetration_id: str):
        """Get point ids for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)
        return self.npz_loader.get("unit_id")

    def get_pseudocoronal_annotation_slice(self, penetration_id: str):
        """Get voxel values for pseudocoronal plane of best fit for `penetration_id`."""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)

        ccf_coord = self.npz_loader.get("ccf_coord") / self.settings.system.resolution
        indices = self._find_pseudocoronal_indices(ccf_coord)
        volume, _ = self.cache.load_annotation_volume()
        ref_slice = volume[indices, np.arange(volume.shape[1]), :].squeeze()

        return ref_slice

    def has_penetration(self, penetration_id: str) -> bool:
        """Return true if and only if `penetration_id` exists."""
        return penetration_id in self._penetrations

    def load_penetration(self, penetration_id: str):
        """Load data from penetration file."""
        if not self.has_penetration(penetration_id) or self._active_penetration == penetration_id:
            return

        # load once without validation (validation has already been performed at the add step)
        self.npz_loader.load_file(self._penetrations[penetration_id], validate=False)

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
    def settings(self, val: AVSettings):
        type_check(val, AVSettings)
        self._settings = val
        self._cache = Cache(self._settings)

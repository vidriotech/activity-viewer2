from pathlib import Path
from typing import List, Optional, Union

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
        try:
            self._npz_loader.load_file(file_path)
        except (FileNotFoundError, TypeError, ValueError, KeyError):
            return

        probe_insertion = self._npz_loader.get("probe_insertion").reshape(-1)[0]
        self._penetrations[probe_insertion] = Path(file_path)

    def has_penetration(self, penetration_id: str) -> bool:
        """Return true if and only if `penetration_id` exists."""
        return penetration_id in self._penetrations

    def load_penetration(self, penetration_id: str):
        """Load data from penetration file."""
        if not self.has_penetration(penetration_id):
            return

        # load once without validation (validation has already been performed at the add step)
        self.npz_loader.load_file(self._penetrations[penetration_id], validate=False)

    def pcplane(self, penetration_id: str):
        """"""
        if not self.has_penetration(penetration_id):
            return

        self.load_penetration(penetration_id)

        ccf_coord = self.npz_loader.get("ccf_coord") / self.settings.system.resolution
        indices = self._find_pseudocoronal_indices(ccf_coord)
        volume, _ = self.cache.load_annotation_volume()
        ref_slice = volume[indices, np.arange(volume.shape[1]), :].squeeze()

        return ref_slice

    @property
    def cache(self) -> Cache:
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

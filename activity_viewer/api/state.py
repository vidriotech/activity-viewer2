from pathlib import Path
from typing import Optional, Union

from flask import Flask

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

    @property
    def npz_loader(self) -> NpzLoader:
        return self._npz_loader

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

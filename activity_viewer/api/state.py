from activity_viewer.base import type_check
from activity_viewer.settings import AVSettings, make_default_settings


class APIState:
    """Class representing state of the HTTP API."""
    def __init__(self):
        self._settings = None

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
        
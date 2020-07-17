from pathlib import Path
from typing import List, Union

import appdirs

from activity_viewer.base import Serializable, type_check, snake_to_camel

CompartmentIDType = Union[str, int]
PathType = Union[str, Path]
StrListType = List[str]


class AVSettingsSection(Serializable):
    """Superclass of sections in the settings file. Allows for defaults to be set."""
    DEFAULTS = {}


class Compartment(Serializable):
    """A class representation of the compartment-related section in the settings file. It is meant to be used as a
    property of the `activity_viewer.settings.AVSettings` class.

    Parameters
    ----------
    max_depth : int
        The maximum level number of levels below the root node in the compartment hierarchy to make available
        by default. Legal values are nonnegative integers.
    blacklist : list of (str or int)
        A list of compartments to manually exclude from the available compartment hierarchy. This also blacklists child
        compartments. The list may contain compartment IDs (integers), labels (strings), or a combination of these. The
        blacklist takes precedence over `max_depth`. If a whitelist is not also specified, then all compartments not in
        the blacklist will be shown.
    whitelist : list of (str or int)
        A list of compartments to include in the available compartment hierarchy. This will *not* whitelist child
        compartments. The list may contain compartment IDs (integers), labels (strings), or a combination of these. The
        whitelist takes precedence over `blacklist` and may be used together with it. For example, you can blacklist a
        compartment but whitelist one of that compartment's children.
    """
    ATTRS = ["max_depth", "blacklist", "whitelist"]
    DEFAULTS = {"max_depth": 0, "blacklist": [], "whitelist": []}

    def __init__(self, **kwargs):
        super().__init__()

        self._max_depth = None
        self._blacklist = None
        self._whitelist = None

        # all values in attrs are required and will populate with defaults if not found
        try:
            self.blacklist = kwargs.pop("blacklist")
        except KeyError:
            self.blacklist = self.DEFAULTS["blacklist"]

        try:
            self.whitelist = kwargs.pop("whitelist")
        except KeyError:
            self.whitelist = self.DEFAULTS["whitelist"]

        try:
            self.max_depth = kwargs.pop("max_depth")
        except KeyError:
            self.max_depth = self.DEFAULTS["max_depth"]

        if len(kwargs) > 0:
            raise ValueError(f"Unrecognized argument: '{kwargs.popitem()[0]}'.")

    @property
    def blacklist(self) -> StrListType:
        """List of compartments to exclude from the available compartment hierarchy."""
        return self._blacklist

    @blacklist.setter
    def blacklist(self, val: StrListType):
        type_check(val, list)
        self._blacklist = val

    @property
    def max_depth(self) -> int:
        """Maximum level number of levels below the root node in the compartment hierarchy made available."""
        return self._max_depth

    @max_depth.setter
    def max_depth(self, val: int):
        type_check(val, int)

        if val < 0:
            msg = f"Negative values for {snake_to_camel('max_depth')} are not permitted."
            raise ValueError(msg)

        self._max_depth = val

    @property
    def whitelist(self) -> StrListType:
        """List of compartments to include in the available compartment hierarchy."""
        return self._whitelist

    @whitelist.setter
    def whitelist(self, val: StrListType):
        type_check(val, list)
        self._whitelist = val


class System(Serializable):
    ATTRS = ["atlas_version", "data_directory"]
    DEFAULTS = {"atlas_version": "CCFv3-2017", "data_directory": Path(appdirs.user_config_dir(), "activity-viewer")}

    def __init__(self, **kwargs):
        """A class representation of the system section in the settings file. It is meant to be used as a
            property of the `activity_viewer.settings.AVSettings` class.

            Parameters
            ----------
            atlas_version : str
                The version of the Allen Brain Atlas to use.
            data_directory : str or Path
                Directory where data is cached.
            """
        super().__init__()

        self._atlas_version = None
        self._data_directory = None

        try:
            self.atlas_version = kwargs.pop("atlas_version")
        except KeyError:
            self.atlas_version = self.DEFAULTS["atlas_version"]

        try:
            self.data_directory = kwargs.pop("data_directory")
        except KeyError:
            self.data_directory = self.DEFAULTS["data_directory"]

        if len(kwargs) > 0:
            raise ValueError(f"Unrecognized argument: '{kwargs.popitem()[0]}'.")

    @property
    def atlas_version(self) -> str:
        """Version of the Allen Brain Atlas in use."""
        return self._atlas_version

    @atlas_version.setter
    def atlas_version(self, val: str):
        type_check(val, str)

        # allowable options
        options = ("CCFv3-2017", "CCFv3-2016", "CCFv3-2015")
        if val not in options:
            raise ValueError(f"""Expecting one of '{"', '".join(options)}' for atlas_version, got '{val}'.""")

        self._atlas_version = val

    @property
    def data_directory(self) -> Path:
        """Directory where data is cached."""
        return self._data_directory

    @data_directory.setter
    def data_directory(self, val: PathType):
        type_check(val, PathType.__args__)
        self._data_directory = Path(val).resolve()

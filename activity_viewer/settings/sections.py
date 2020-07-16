from pathlib import Path
from typing import List, Union

from activity_viewer.base import Serializable, type_check, snake_to_camel

CompartmentIDType = Union[str, int]
PathType = Union[str, Path]
StrListType = List[str]


class Compartment(Serializable):
    """A class representation of the compartment-related section in the settings file. It is meant to be used as a
    property of the :class:activity_viewer.settings.AVSettings class.

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

    def __init__(self, **kwargs):
        super().__init__()

        self._max_depth = None
        self._blacklist = None
        self._whitelist = None

        # all values in attrs are required and will throw a KeyError if not found
        self.blacklist = kwargs.pop("blacklist")
        self.whitelist = kwargs.pop("whitelist")
        self.max_depth = kwargs.pop("max_depth")

        if len(kwargs) > 0:
            raise ValueError(f"Unrecognized argument: '{kwargs.popitem()[0]}'.")

    @property
    def blacklist(self) -> StrListType:
        return self._blacklist

    @blacklist.setter
    def blacklist(self, val: StrListType):
        type_check(val, list)
        self._blacklist = val

    @property
    def whitelist(self) -> StrListType:
        return self._whitelist

    @whitelist.setter
    def whitelist(self, val: StrListType):
        type_check(val, list)
        self._whitelist = val

    @property
    def max_depth(self) -> int:
        return self._max_depth

    @max_depth.setter
    def max_depth(self, val: int):
        type_check(val, int)

        if val < 0:
            msg = f"Negative values for {snake_to_camel('max_depth')} are not permitted."
            raise ValueError(msg)

        self._max_depth = val


class System(Serializable):
    ATTRS = ["atlas_version", "data_directory"]

    def __init__(self, **kwargs):
        """A class representation of the system section in the settings file. It is meant to be used as a
            property of the :class:activity_viewer.settings.AVSettings class.

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

        self.atlas_version = kwargs.pop("atlas_version")
        self.data_directory = kwargs.pop("data_directory")

        if len(kwargs) > 0:
            raise ValueError(f"Unrecognized argument: '{kwargs.popitem()[0]}'.")

    @property
    def atlas_version(self) -> str:
        return self._atlas_version

    @atlas_version.setter
    def atlas_version(self, val: str):
        type_check(val, str)
        self._atlas_version = val

    @property
    def data_directory(self) -> Path:
        return self._data_directory

    @data_directory.setter
    def data_directory(self, val: PathType):
        type_check(val, PathType.__args__)
        self._data_directory = Path(val)

from pathlib import Path
from typing import List, Union

from allensdk.api.queries.ontologies_api import OntologiesApi
from allensdk.api.queries.reference_space_api import ReferenceSpaceApi
from allensdk.core.structure_tree import StructureTree
import appdirs

from activity_viewer.base import DefaultSerializable, type_check, snake_to_camel

CompartmentIDType = Union[str, int]
PathType = Union[str, Path]
StrListType = List[str]


class Compartment(DefaultSerializable):
    """A class representation of the compartment-related section in the settings file. It is meant to be used as a
    property of the `activity_viewer.settings.AVSettings` class.

    Parameters
    ----------
    max_depth : int
        The maximum level number of levels below the root node in the compartment hierarchy to make available
        by default. Legal values are nonnegative integers less than or equal to 11.
    exclude : list of (str or int)
        A list of compartments to manually exclude from the available compartment hierarchy. This also excludes child
        compartments. The list may contain compartment IDs (integers), labels (strings), or a combination of these. The
        exclude takes precedence over `max_depth`. If a include is not also specified, then all compartments not in
        the exclude will be shown.
    include : list of (str or int)
        A list of compartments to include in the available compartment hierarchy. This will *not* include child
        compartments. The list may contain compartment IDs (integers), labels (strings), or a combination of these. The
        include takes precedence over `exclude` and may be used together with it. For example, you can exclude a
        compartment but include one of that compartment's children.
    """
    ATTRS = ["max_depth", "exclude", "include"]
    DEFAULTS = {"max_depth": 0, "exclude": [], "include": []}

    def __init__(self, **kwargs):
        super().__init__()

        self._max_depth = None
        self._exclude = None
        self._include = None

        # all values in attrs are required and will populate with defaults if not found
        try:
            self.exclude = kwargs.pop("exclude")
        except KeyError:
            self.exclude = self.DEFAULTS["exclude"]

        try:
            self.include = kwargs.pop("include")
        except KeyError:
            self.include = self.DEFAULTS["include"]

        try:
            self.max_depth = kwargs.pop("max_depth")
        except KeyError:
            self.max_depth = self.DEFAULTS["max_depth"]

        if len(kwargs) > 0:
            raise ValueError(f"Unrecognized argument: '{kwargs.popitem()[0]}'.")

    @property
    def exclude(self) -> StrListType:
        """List of compartments to exclude from the available compartment hierarchy."""
        return self._exclude

    @exclude.setter
    def exclude(self, val: StrListType):
        type_check(val, list)
        self._exclude = val

    @property
    def max_depth(self) -> int:
        """Maximum level number of levels below the root node in the compartment hierarchy made available."""
        return self._max_depth

    @max_depth.setter
    def max_depth(self, val: int):
        type_check(val, int)

        if val < 0:
            raise ValueError(f"Negative values for {snake_to_camel('max_depth')} are not permitted.")

        if val > 10:
            raise ValueError(f"Maximum legal value of 10 for {snake_to_camel('max_depth')} exceeded.")

        self._max_depth = val

    @property
    def include(self) -> StrListType:
        """List of compartments to include in the available compartment hierarchy."""
        return self._include

    @include.setter
    def include(self, val: StrListType):
        type_check(val, list)
        self._include = val


class System(DefaultSerializable):
    ATTRS = ["atlas_version", "data_files", "cache_directory", "resolution"]
    DEFAULTS = {"atlas_version": ReferenceSpaceApi.CCF_2017.replace("annotation/", ""),
                "cache_directory": Path(appdirs.user_cache_dir(), "activity-viewer"),
                "resolution": 100, "data_files": []}

    def __init__(self, **kwargs):
        """A class representation of the system section in the settings file. It is meant to be used as a
        property of the `activity_viewer.settings.AVSettings` class.

        Parameters
        ----------
        atlas_version : str
            The version of the Allen Brain Atlas to use.
        cache_directory : str or Path
            Directory where data is cached.
        resolution : int
            Volume per voxel, in microns. Only 100, 50, 25, or 10 are permitted.
        """
        super().__init__()

        self._atlas_version = None
        self._cache_directory = None
        self._data_files = None
        self._resolution = None

        try:
            self.atlas_version = kwargs.pop("atlas_version")
        except KeyError:
            self.atlas_version = self.DEFAULTS["atlas_version"]

        try:
            self.cache_directory = kwargs.pop("cache_directory")
        except KeyError:
            self.cache_directory = self.DEFAULTS["cache_directory"]

        try:
            self.data_files = kwargs.pop("data_files")
        except KeyError:
            self.data_files = self.DEFAULTS["data_files"]
        except Exception as e:
            print(e)

        try:
            self.resolution = kwargs.pop("resolution")
        except KeyError:
            self.resolution = self.DEFAULTS["resolution"]

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
        options = (ReferenceSpaceApi.CCF_2017.replace("annotation/", ""),
                   ReferenceSpaceApi.CCF_2016.replace("annotation/", ""),
                   ReferenceSpaceApi.CCF_2015.replace("annotation/", ""))
        if val not in options:
            raise ValueError(f"""Expecting one of '{"', '".join(options)}' for atlas_version, got '{val}'.""")

        self._atlas_version = val

    @property
    def cache_directory(self) -> Path:
        """Directory where data is cached."""
        return self._cache_directory

    @cache_directory.setter
    def cache_directory(self, val: PathType):
        type_check(val, PathType.__args__)
        self._cache_directory = Path(val).resolve()

    @property
    def data_files(self) -> List[Path]:
        return self._data_files

    @data_files.setter
    def data_files(self, val: Union[PathType, List[PathType]]):
        type_check(val, (list,) + PathType.__args__)

        if not isinstance(val, list):
            val = [val]

        files = []

        for v in val:
            type_check(v, PathType.__args__)
            v = Path(v)
            files += [p.resolve() for p in v.parent.glob(v.name)]

        self._data_files = files

    @property
    def resolution(self) -> int:
        """Voxel resolution for annotation and template volumes, in cubic microns."""
        return self._resolution

    @resolution.setter
    def resolution(self, val: int):
        type_check(val, int)

        options = (10, 25, 50, 100)
        if val not in options:
            raise ValueError(f"""Expecting one of {', '.join(map(str, options))} for resolution, got {val}.""")

        self._resolution = val

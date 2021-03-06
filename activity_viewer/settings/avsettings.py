import json
from pathlib import Path
from typing import List, Optional, Union

import appdirs

from activity_viewer.base import DefaultSerializable, slugify, snake_to_camel, type_check
from activity_viewer.settings.epoch import Epoch
from activity_viewer.settings.sections import Compartment, System

PathType = Union[str, Path]

def touch_file(filename: PathType):
    """Creates or touches a file living at `filename`.

    Ensures the file and any parent directories exist.

    Parameters
    ----------
    filename : str or Path
        The filename to touch.
    """
    filename = Path(filename)

    filename.parent.mkdir(parents=True, exist_ok=True)
    filename.touch(exist_ok=True)


class AVSettings(DefaultSerializable):
    """A class representation of the settings file. Its members include the file path `filename`, the
    `activity_viewer.settings.sections.Compartment` class representing the 'compartment' section, and the
    `activity_viewer.settings.sections.System` class representing the 'system' section.
    You probably don't want to instantiate this directly. Instead, use the `from_file` class method.

    Parameters
    ----------
    compartment : Compartment or dict
    system : System or dict

    Examples
    --------
    >>> settings = AVSettings.from_file("/path/to/settings.json")
    """
    ATTRS = ["compartment", "system", "epochs"]
    DEFAULTS = {
        "filename": Path(appdirs.user_config_dir(),"activity-viewer", "settings.json"),
        "compartment": Compartment(),
        "system": System(),
        "epochs": [],
    }

    def __init__(self, filename: Optional[PathType] = None, **kwargs):
        super().__init__()

        self._filename = None
        self._compartment = None
        self._system = None
        self._epochs = None

        self.filename = filename if filename is not None else self.DEFAULTS["filename"]

        try:
            self.compartment = kwargs.pop("compartment")
        except KeyError:
            self.compartment = self.DEFAULTS["compartment"]

        try:
            self.system = kwargs.pop("system")
        except KeyError:
            self.system = self.DEFAULTS["system"]

        try:
            self.epochs = kwargs.pop("epochs")
        except KeyError as e:
            self.epochs = self.DEFAULTS["epochs"]

    @classmethod
    def from_dict(cls, val: dict):
        """Create a new instance of this class from a dict.

        Parameters
        ----------
        val : dict
            A dict containing key-value pairs for each of the fields in this object.

        Returns
        -------
        new : Serializable
            A new instance of this class, loaded from the dict `val`.
        """
        type_check(val, dict)  # includes OrderedDict as a subtype

        kwargs = {}
        for attr in cls.ATTRS:
            var_attr = slugify(snake_to_camel(attr))
            if var_attr not in val:
                val[var_attr] = cls.DEFAULTS[attr]

            kwargs[attr] = val[var_attr]

        return cls(val["filename"], **kwargs)

    @classmethod
    def from_file(cls, filename: PathType):
        """Create a new AVSettings object from a settings file `filename`.

        Parameters
        ----------
        filename : str or Path
            Path to file containing settings.
        """
        as_dict = {"filename": filename}
        with open(filename, "r") as fh:
            as_dict.update(json.load(fh))

        if "compartment" not in as_dict:
            as_dict["compartment"] = {}

        if "system" not in as_dict:
            as_dict["system"] = {}

        return cls.from_dict(as_dict)

    def to_file(self, filename: Optional[PathType] = None):
        """Save these settings to a file given by `filename`.

        Parameters
        ----------
        filename : str or Path, optional
            The filename to write settings to. Uses `self.filename` if not specified.
        """
        if filename is None:  # pragma: no cover
            filename = self.filename

        touch_file(filename)  # make sure file and parent directory exist

        with open(filename, "w") as fh:
            fh.write(self.to_json(prettify=True))

    @property
    def compartment(self) -> Compartment:
        """Class representation of the 'compartment' section of the settings file."""
        return self._compartment

    @compartment.setter
    def compartment(self, val: Union[Compartment, dict]):
        type_check(val, (Compartment, dict))

        if isinstance(val, dict):
            val = Compartment.from_dict(val)

        self._compartment = val

    @property
    def epochs(self) -> List[Epoch]:
        """Collection of experimental epochs."""
        return self._epochs

    @epochs.setter
    def epochs(self, val: List[Union[Epoch, dict]]):
        type_check(val, list)

        epochs = []
        for v in val:
            type_check(v, (dict, Epoch))

            if isinstance(v, dict):
                v = Epoch.from_dict(v)

            epochs.append(v)
        
        self._epochs = epochs

    @property
    def filename(self) -> Path:
        """Path to file containing these settings."""
        return self._filename

    @filename.setter
    def filename(self, val: PathType):
        type_check(val, PathType.__args__)
        self._filename = Path(val).resolve()

    @property
    def system(self) -> System:
        """Class representation of the 'system' section of the settings file."""
        return self._system

    @system.setter
    def system(self, val: Union[System, dict]):
        type_check(val, (System, dict))

        if isinstance(val, dict):
            val = System.from_dict(val)

        self._system = val

    @property
    def versioned_cache_directory(self):
        """Subdirectory of data directory containing data for a specific CCF version."""
        return self.system.cache_directory / self.system.atlas_version


def make_default_settings() -> AVSettings:
    """Return default settings"""
    return AVSettings()

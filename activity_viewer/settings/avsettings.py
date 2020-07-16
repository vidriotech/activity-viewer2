from collections import namedtuple
import json
from pathlib import Path
from typing import Optional, Union

from activity_viewer.base import Serializable, type_check

PathType = Union[Path, str]


def touch_file(filename: PathType):
    """Creates or touches a file living at `filename`.

    Ensures the file and any parent directories exist.

    Parameters
    ----------
    filename : str or Path
        The filename to touch.
    """
    filename = Path(filename)

    filename.parent.mkdirs(exist_ok=True)
    filename.touch(exist_ok=True)


class AVSettings(Serializable):
    ATTRS = ["compartment", "system"]

    def __init__(self, filename: PathType, **kwargs):
        super().__init__()

        self._filename = filename
        self._compartments = kwargs.pop("compartments")

    @classmethod
    def from_file(cls, filename: PathType):
        """Create a new AVSettings object from a settings file `filename`.

        Parameters
        ----------
        filename : str or Path
            Path to file containing settings.
        """
        with open(filename, "r") as fh:
            as_dict = json.load(fh)

        as_dict["filename"] = str(filename)
        return cls.from_dict(as_dict)

    def to_file(self, filename: Optional[PathType]):
        """Save these settings to a file given by `filename`.

        Parameters
        ----------
        filename : str or Path, optional
            The filename to write settings to. Uses self.filename if not specified.
        """
        if filename is None:
            filename = self.filename

        touch_file(filename)  # make sure file and parent directory exist

        with open(filename, "w") as fh:
            fh.write(self.to_json(prettify=True))

    @property
    def filename(self) -> Path:
        return self._filename

    @filename.setter
    def filename(self, val: PathType):
        type_check(val, PathType.__args__)
        self._filename = Path(val)

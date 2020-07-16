from collections import namedtuple
import json
from pathlib import Path
from typing import Optional, Union

from activity_viewer.base import Serializable, type_check

PathType = Union[Path, str]


class AVSettings(Serializable):
    ATTRS = ["compartment", "system"]

    def __init__(self, filename: PathType, **kwargs):
        super().__init__()

        self._filename = filename

    @classmethod
    def from_file(cls, filename: PathType):
        """Create a new AVSettings object from a settings file `filename`.

        Parameters
        ----------
        filename : str or Path
            Path to file containing settings.

        Returns
        -------

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

        with open(filename, "w") as fh:
            fh.write(self.to_json(prettify=True))

    @property
    def filename(self):
        return self._filename

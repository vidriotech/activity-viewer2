from pathlib import Path
from typing import Union

import numpy as np

from activity_viewer.base import type_check

PathType = Union[str, Path]


class FileLoader:
    """Class for loading data files."""
    def __init__(self):
        self._file_path = None
        self._data = None

    def _validate_data(self):
        """Ensure that is valid."""
        pass

    def load_file(self, file_path: PathType):
        """Load data from the file living at `file_path`.
        
        Parameters
        ----------
        file_path : str
            Path to file to load.
        """
        type_check(file_path, PathType.__args__)
        self._file_path = file_path
        self._data = np.load(self._file_path)
        self._validate_data()

    @property
    def data(self) -> np.lib.npyio.NpzFile:
        return self._data

    @property
    def file_path(self) -> PathType:
        return self._file_path

from pathlib import Path
from typing import Optional, Union

import numpy as np

from activity_viewer.base import type_check

PathType = Union[str, Path]

AP_MAX = 13200  # maximum x value
DV_MAX = 8000  # maximum y value
LR_MAX = 11400  # maximum z value


class NpzLoader:
    """Class for loading data files."""

    def __init__(self):
        self._data = None
        self._file_path = None
        self._keys = None

    def _validate_data(self):
        """Ensure data is valid."""
        # probe insertion
        try:
            probe_insertion = self._data["probe_insertion"]
        except KeyError:
            raise KeyError("Data missing 'probe_insertion' field.")

        # 1 value
        if probe_insertion.size != 1:
            raise ValueError("Too many values for probe_insertion.")

        # a string
        probe_insertion = probe_insertion.reshape(-1)[0]
        if not isinstance(probe_insertion, str):
            raise TypeError(f"Expecting a string for probe_insertion, got {type(probe_insertion).__name__}")

        # unit ids
        try:
            unit_id = self._data["unit_id"]
        except KeyError:
            raise KeyError("Data missing 'unit_id' field.")

        # integer ids
        if not np.issubdtype(unit_id.dtype, np.integer):
            raise TypeError(f"Expecting integer unit ids, got {unit_id.dtype}.")

        unit_id = unit_id.reshape(-1)  # flatten the array
        nunits = unit_id.size

        # all unique
        nunique = np.unique(unit_id).size
        if nunique != nunits:
            raise ValueError(f"Expecting {nunits} unique unit ids, got {nunique}.")

        # CCF coordinates
        try:
            ccf_coord = self._data["ccf_coord"]
        except KeyError:
            raise KeyError("Data missing 'ccf_coord' field.")

        # numeric values
        if not np.issubdtype(ccf_coord.dtype, np.integer) and not np.issubdtype(ccf_coord.dtype, np.floating):
            raise TypeError(f"Expecting numeric CCF coordinates, got {ccf_coord.dtype}.")

        # 3 coords for each unit
        if ccf_coord.shape != (nunits, 3):
            raise ValueError(f"Expecting a {nunits} x 3 array for ccf_coord, got {ccf_coord.shape}")

        # x values in range
        if ((ccf_coord[:, 0] < 0) | (ccf_coord[:, 0] > AP_MAX)).any():
            raise ValueError(f"Some coordinates in x column were outside the allowed range of [0, {AP_MAX}].")

        # y values in range
        if ((ccf_coord[:, 1] < 0) | (ccf_coord[:, 1] > DV_MAX)).any():
            raise ValueError(f"Some coordinates in y column were outside the allowed range of [0, {DV_MAX}].")

        # z values in range
        if ((ccf_coord[:, 2] < 0) | (ccf_coord[:, 2] > LR_MAX)).any():
            raise ValueError(f"Some coordinates in z column were outside the allowed range of [0, {LR_MAX}].")

        # waveform
        if "waveform" in self._data:
            waveform = self._data["waveform"]

            # numeric values
            if not np.issubdtype(waveform.dtype, np.integer) and not np.issubdtype(waveform.dtype, np.floating):
                raise TypeError(f"Expecting numeric waveform values, got {waveform.dtype}.")

            # 3 coords for each unit
            if waveform.ndim != 2 or waveform.shape[0] != nunits:
                raise ValueError(
                    f"Expecting a 2D array for waveform with {nunits} in the first dimension, got {waveform.shape}")

        # timeseries
        if "timeseries" in self._data:
            timeseries = self._data["timeseries"]

            if not np.issubdtype(timeseries.dtype, np.str_):
                raise TypeError(f"Expecting an array of strings for timeseries, got {timeseries.dtype}.")

            for t in timeseries:
                tval = self._data.get(t)
                if tval is None:
                    raise KeyError(f"Timeseries {t} specified, but not found.")

                if tval.ndim != 2 or tval.shape[0] != nunits + 1:
                    raise ValueError(
                        f"Expecting a 2D array for timeseries {t} with {nunits + 1} in the first dimension, got {tval.shape}")

        # unit statistics
        if "unit_stats" in self._data:
            unit_stats = self._data["unit_stats"]

            if not np.issubdtype(unit_stats.dtype, np.str_):
                raise TypeError(f"Expecting an array of strings for unit_stats, got {unit_stats.dtype}.")

            for s in unit_stats:
                sval = self._data.get(s)
                if sval is None:
                    raise KeyError(f"Unit statistic {s} specified, but not found.")

                if sval.size != nunits:
                    raise ValueError(
                        f"Expecting a 1D array for unit statistic {s} with {nunits} values, got {sval.shape}")

    def get(self, key: str):
        """Get value from data keyed by `key`, or None if `key` is not found."""
        if self._data is not None:
            return self._data.get(key)

    def load_file(self, file_path: PathType, validate: bool = True):
        """Load data from the file living at `file_path`.
        
        Parameters
        ----------
        file_path : str
            Path to file to load.
        validate : bool, optional
            Perform data validation iff true.
        """
        type_check(file_path, PathType.__args__)
        self._file_path = file_path
        self._data = np.load(self._file_path)
        self._keys = {k for k in self._data.keys()}

        if validate:
            self._validate_data()

    @property
    def data(self) -> np.lib.npyio.NpzFile:
        return self._data

    @property
    def file_path(self) -> PathType:
        return self._file_path

    @file_path.setter
    def file_path(self, val: PathType):
        type_check(val, PathType.__args__)
        self._file_path = Path(val).resolve()

    @property
    def keys(self) -> Optional[set]:
        return self._keys

from math import nan, isnan

import numpy as np

from activity_viewer.base import DefaultSerializable


class TimeseriesSummary(DefaultSerializable):
    ATTRS = ["timeseries_id", "min_time", "max_time", "min_step", "min_val", "max_val"]
    DEFAULTS = {
        "timeseries_id": None,
        "min_time": nan,
        "max_time": nan,
        "min_step": nan,
        "min_val": nan,
        "max_val": nan
    }

    def __init__(self, timeseries_id: str):
        super().__init__()

        self.timeseries_id = timeseries_id
        self.min_time = nan
        self.max_time = nan
        self.min_step = nan
        self.min_val = nan
        self.max_val = nan

    def update(self, data: np.ndarray):
        """Update new min/max times/values and time step."""
        times = data[0, :]
        values = data[1:, :]
        min_step = np.min(np.diff(times))
        min_val = np.min(values)
        max_val = np.max(values)

        if isnan(self.min_time) or times[0] < self.min_time:
            self.min_time = times[0]

        if isnan(self.max_time) or times[-1] > self.max_time:
            self.max_time = times[-1]

        if isnan(self.min_step) or min_step < self.min_step:
            self.min_step = min_step

        if isnan(self.min_val) or min_val < self.min_val:
            self.min_val = min_val

        if isnan(self.max_val) or max_val > self.max_val:
            self.max_val = max_val

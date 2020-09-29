import numpy as np

from activity_viewer.base import DefaultSerializable


class TimeseriesSummary(DefaultSerializable):
    ATTRS = ["timeseries_id", "time_min", "time_max", "time_step", "min_val", "max_val"]
    DEFAULTS = {
        "timeseries_id": None,
        "time_min": None,
        "time_max": None,
        "time_step": None,
        "min_val": None,
        "max_val": None
    }

    def __init__(self, timeseries_id: str):
        super().__init__()

        self.timeseries_id = timeseries_id
        self.time_min = None
        self.time_max = None
        self.time_step = None
        self.min_val = None
        self.max_val = None

    def update(self, data: np.ndarray):
        """Update new min/max times/values and time step."""
        times = data[0, :]
        values = data[1:, :]
        time_step = np.min(np.diff(times))
        min_val = np.min(values)
        max_val = np.max(values)

        if self.time_min is None or times[0] < self.time_min:
            self.time_min = times[0]

        if self.time_max is None or times[-1] > self.time_max:
            self.time_max = times[-1]

        if self.time_step is None or time_step < self.time_step:
            self.time_step = time_step

        if self.min_val is None or min_val < self.min_val:
            self.min_val = min_val

        if self.max_val is None or max_val > self.max_val:
            self.max_val = max_val

from typing import List

from activity_viewer.base import Serializable, type_check

FloatListType = List[float]


class Epoch(Serializable):
    ATTRS = ["label", "bounds"]

    def __init__(self, **kwargs):
        super().__init__()

        self._label = None
        self._bounds = None

        self.label = kwargs.pop("label")
        self.bounds = kwargs.pop("bounds")

    @property
    def bounds(self) -> FloatListType:
        return self._bounds

    @bounds.setter
    def bounds(self, val: FloatListType):
        type_check(val, list)

        if len(val) != 2:
            raise ValueError(f"Expected list of length 2, got {len(val)}")

        self._bounds = [float(v) for v in val]

    @property
    def label(self) -> str:
        return self._label

    @label.setter
    def label(self, val: str):
        type_check(val, str)

        self._label = val

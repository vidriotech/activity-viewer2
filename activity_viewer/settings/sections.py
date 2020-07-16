from typing import List, Union

from activity_viewer.base import Serializable, type_check, snake_to_camel

CompartmentIDType = Union[str, int]


class Compartment(Serializable):
    ATTRS = ["max_depth", "blacklist", "whitelist"]

    def __init__(self, **kwargs):
        super().__init__()

        self._max_depth = None
        self._blacklist = None
        self._whitelist = None

        # all values in attrs are required and will throw a KeyError if not found
        self.whitelist = kwargs.pop("whitelist")
        self.blacklist = kwargs.pop("blacklist")
        self.max_depth = kwargs.pop("max_depth")

    @property
    def blacklist(self):
        return self._blacklist

    @blacklist.setter
    def blacklist(self, val: List[str]):
        type_check(val, list)
        self._blacklist = val

    @property
    def whitelist(self):
        return self._whitelist

    @whitelist.setter
    def whitelist(self, val: List[str]):
        type_check(val, list)
        self._whitelist = val

    @property
    def max_depth(self):
        return self._max_depth

    @max_depth.setter
    def max_depth(self, val: int):
        type_check(val, int)

        if val < 0:
            msg = f"Negative values for {snake_to_camel('max_depth')} are not permitted."
            raise ValueError(msg)

        self._max_depth = val

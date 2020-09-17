from typing import Optional, Tuple, Union

import numpy as np
from matplotlib import pyplot as plt

from activity_viewer.base import Serializable, type_check

ListType = Union[np.ndarray, list]


def color_map(name: str) -> Optional[np.ndarray]:
    """Given a color map identifier `map_name`,
    return a 256-value lookup table.

    Parameters
    ----------
    name : str
        Color map identifier.

    Returns
    -------
    mapping: ndarray
        A lookup table for RGB values in a given color map.
    """
    try:
        color_map = plt.get_cmap(name)
    except ValueError:  # color map not found
        return

    return np.concatenate([color_map(i)[:3] for i in range(256)])


class ColorLUT(Serializable):
    ATTRS = ["name", "mapping"]

    def __init__(self, name: str, mapping: np.ndarray):
        super().__init__()
        
        self._name = None
        self._mapping = np.array([])
        
        self.name = name
        self.mapping = mapping

    @classmethod
    def from_name(cls, name: str):
        """Given a color map identifier `map_name`,
        return a 256-value lookup table.

        Parameters
        ----------
        name : str
            Color map identifier.

        Returns
        -------
        mapping: ndarray
            A lookup table for RGB values in a given color map.
        """
        from matplotlib.pyplot import get_cmap
        try:
            color_map = get_cmap(name)
            mapping = np.concatenate([color_map(i)[:3] for i in range(256)]).ravel()
        except ValueError:  # color map not found
            mapping = np.tile([0, 128, 255], 256)

        return cls(name, mapping)

    @property
    def name(self) -> str:
        return self._name
    
    @name.setter
    def name(self, val: str):
        type_check(val, str)
        self._name = val
    
    @property
    def mapping(self) -> list:
        return self._mapping.tolist()
    
    @mapping.setter
    def mapping(self, val: ListType):
        type_check(val, ListType.__args__)
        if isinstance(val, list):
            val = np.array(val)

        self._mapping = val


class ScalarMapping(Serializable):
    ATTRS = ["timeseries_id", "times", "values"]

    def __init__(self, timeseries_id: str, times: np.ndarray, values: np.ndarray):
        super().__init__()

        self._timeseries_id = None
        self._times = np.array([])
        self._values = np.array([])

        self.timeseries_id = timeseries_id
        self.times = times
        self.values = values

    @staticmethod
    def linear_mapping(values: np.ndarray, bounds: Tuple[float]):
        """Map `data` onto a new range.

        Parameters
        ----------
        values: ndarray
            The data to transform.
        bounds: list of float
            Min/max values of transform range.
        """
        d_min = np.min(values)
        d_max = np.max(values)
        d_range = d_max - d_min

        t_min = bounds[0]
        t_max = bounds[1]
        t_range = t_max - t_min

        if d_range == 0:
            transformed = (t_range / 2) * np.ones_like(values)
        else:
            transformed = t_min + t_range * (values - d_min) / d_range

        return transformed.ravel()

    @classmethod
    def from_bounds(cls, timeseries_id: str, times: np.ndarray, values: np.ndarray, bounds: Tuple[float]):
        transformed = cls.linear_mapping(values, bounds)
        return cls(timeseries_id, times, transformed)

    @property
    def timeseries_id(self) -> str:
        return self._timeseries_id

    @timeseries_id.setter
    def timeseries_id(self, val: str):
        type_check(val, str)
        self._timeseries_id = val

    @property
    def times(self) -> list:
        return self._times.tolist()

    @times.setter
    def times(self, val: ListType):
        type_check(val, ListType.__args__)
        if isinstance(val, list):
            val = np.array(val)

        self._times = val

    @property
    def values(self) -> list:
        return self._values.tolist()

    @values.setter
    def values(self, val: ListType):
        type_check(val, ListType.__args__)
        if isinstance(val, list):
            val = np.array(val)

        self._values = val


class ColorMapping(ScalarMapping):
    ATTRS = ScalarMapping.ATTRS + ["colorLUT"]

    def __init__(self, timeseries_id: str, times: np.ndarray, values: np.ndarray, lut: ColorLUT):
        super().__init__(timeseries_id, times, values)

        self._lut = None
        self.lut = lut

    @classmethod
    def from_bounds(cls, timeseries_id: str, times: np.ndarray, values: np.ndarray, bounds: Tuple[float], lut: ColorLUT):
        transformed = cls.linear_mapping(values, bounds)
        return cls(timeseries_id, times, transformed, lut)

    @property
    def colorLUT(self) -> ColorLUT:
        return self._lut

    @colorLUT.setter
    def colorLUT(self, val: Union[ColorLUT, dict, str]):
        type_check(val, (ColorLUT, dict, str))
        if isinstance(val, dict):
            val = ColorLUT.from_dict(val)
        elif isinstance(val, str):
            val = ColorLUT.from_name(val)

        self._lut = val


class AestheticMapping(Serializable):
    ATTRS = ["penetration_id", "color", "opacity", "radius", "visibility"]

    def __init__(
            self,
            penetration_id: str,
            color: Optional[ColorMapping],
            opacity: Optional[ScalarMapping],
            radius: Optional[ScalarMapping],
            visibility: Optional[ListType]
    ):
        super().__init__()

        self._penetration_id = None
        self._color = None
        self._opacity = None
        self._radius = None
        self._visibility = np.array([])

        self.penetration_id = penetration_id
        self.color = color
        self.opacity = opacity
        self.radius = radius
        self.visibility = visibility

    @property
    def penetration_id(self) -> str:
        return self._penetration_id

    @penetration_id.setter
    def penetration_id(self, val: str):
        type_check(val, str)
        self._penetration_id = val

    @property
    def color(self) -> Optional[ColorMapping]:
        return self._color

    @color.setter
    def color(self, val: Union[ColorMapping, dict]):
        if val is not None:
            type_check(val, (ColorMapping, dict))
            if isinstance(val, dict):
                val = ColorMapping.from_dict(val)

        self._color = val

    @property
    def opacity(self) -> Optional[ScalarMapping]:
        return self._opacity

    @opacity.setter
    def opacity(self, val: Union[ScalarMapping, dict]):
        if val is not None:
            type_check(val, (ScalarMapping, dict))
            if isinstance(val, dict):
                val = ScalarMapping.from_dict(val)

        self._opacity = val

    @property
    def radius(self) -> Optional[ScalarMapping]:
        return self._radius

    @radius.setter
    def radius(self, val: Union[ScalarMapping, dict]):
        if val is not None:
            type_check(val, (ScalarMapping, dict))
            if isinstance(val, dict):
                val = ScalarMapping.from_dict(val)

        self._radius = val

    @property
    def visibility(self) -> Optional[list]:
        if self._visibility is not None:
            return self._visibility.tolist()

    @visibility.setter
    def visibility(self, val: ListType):
        if val is not None:
            type_check(val, ListType.__args__)
            if isinstance(val, list):
                val = np.array(val)

            val = val.astype(np.bool_)

        self._visibility = val

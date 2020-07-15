from collections import OrderedDict
from datetime import datetime
import json
import re
from typing import Any, Iterable, Type, Union

import numpy as np


def nest_tuples(val: dict, list_to_tuple: bool = False) -> tuple:
    """Recursively convert a dict to a tuple of tuples of key-value pairs.

    Each tuple has exactly two entries, the first corresponding to the key and the second corresponding to the value.
    Values which are themselves dicts will be converted in like manner.

    Parameters
    ----------
    val : dict
        The dict to convert.
    list_to_tuple : bool
        Convert lists to tuples if True.

    Returns
    -------
    result : tuple
        A nested tuple representation of `val`
    """
    if isinstance(val, list):
        return tuple(nest_tuples(v, list_to_tuple) for v in val)

    if not isinstance(val, dict):
        return val

    return tuple((k, nest_tuples(v, list_to_tuple)) for k, v in val.items())


def slugify(val: str) -> str:
    """Convert a string to a slug by removing all characters outside a constrained set.

    Parameters
    ----------
    val : str
        An arbitrary string

    Returns
    -------
    slugified_val : str
        `val` with all characters removed except letters, numbers, underscores, and hyphens.

    Raises
    ------
    TypeError
        If `val` is not a string.
    """
    despace = re.compile(r"(?<!_)\s+(?!_)")  # spaces not surrounded by underscores
    underscores = re.compile(r"__+")  # multiple underscores
    nonslug = re.compile(r"[^a-zA-Z0-9_\-]")  # not letters, numbers, underscores, hyphens

    val = despace.sub("_", val)
    val = nonslug.sub("", val)
    val = underscores.sub("_", val)  # replace multiple underscores by a single one
    val = val.strip("_")  # remove leading and trailing underscores

    return val


def snake_to_camel(val: str) -> str:
    """Convert a snake_case string to a camelCase string.

    Parameters
    ----------
    val : str
        A snake_case string.

    Returns
    -------
    valCamel : str
    A camelCase version of `val`.

    Raises
    ------
    TypeError
        If `val` is not a string.
    """
    val = val.strip("_").split("_")
    return val[0] + "".join(map(lambda s: s[0].upper() + s[1:] if len(s) > 0 else "", val[1:]))


def type_check(val: Any, allowed_types: Union[Type, Iterable[Type]]):
    """Check that `val` is an instance of one of `allowed_types`.

    Parameters
    ----------
    val : object
        An object. Anything.
    allowed_types : type or iterable of types
        Set of types that `val` is allowed to be.

    Raises
    -------
    TypeError
        If (and only if) `val` is not an instance of one of `allowed_types`.
    """
    if isinstance(allowed_types, type):
        allowed_types = (allowed_types, )

    if not isinstance(val, allowed_types):
        type_names = [t.__name__ for t in allowed_types]
        msg = f"""Expected one of '{"', '".join(type_names)}',"""\
              f" but got '{type(val).__name__}'."
        raise TypeError(msg)


class Serializable:
    """Subclasses of Serializable can be instantiated from or serialized to a dict or JSON string.

    - Arguments to __init__ MUST match the ATTRS class attribute, or from_dict will break!
    - Constructors expecting subclasses of Serializable SHOULD check for dicts and use from_dict accordingly.
    """
    ATTRS = []

    def __init__(self):
        self._as_dict = None

    def __hash__(self):
        return hash(nest_tuples(self.to_dict(), list_to_tuple=True))

    def __eq__(self, other: Any) -> bool:
        return self.__hash__() == hash(other) and isinstance(other, self.__class__)

    def __str__(self):
        return self.to_json()  # pragma: no cover

    def __repr__(self):
        return str(self)

    @classmethod
    def _dictify_member(cls, val):
        if isinstance(val, Serializable):
            val = val.to_dict()
        elif isinstance(val, datetime):
            val = val.timestamp()
        elif isinstance(val, bytes):
            val = val.decode()
        elif isinstance(val, np.ndarray):
            val = val.tolist()
        elif isinstance(val, list) or isinstance(val, tuple) or isinstance(val, set):
            val_iterable = []
            for v in val:
                val_iterable.append(cls._dictify_member(v))

            val = type(val)(val_iterable)  # convert back to tuple or set
        elif not isinstance(val, (int, float)):
            val = str(val)

        return val

    def _make_dict(self):
        """Make a dict out of the serializable fields in this object and cache it for fast access later."""
        as_dict = OrderedDict()
        for attr in self.ATTRS:
            val = self._dictify_member(getattr(self, attr))

            as_dict[snake_to_camel(slugify(attr))] = val

        self._as_dict = as_dict

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
                raise KeyError(f"Missing key '{var_attr}'")

            kwargs[attr] = val[var_attr]

        return cls(**kwargs)

    @classmethod
    def from_json(cls, val: Union[str, bytes]):
        """Create a new instance of this class from its JSON string representation.

        Parameters
        ----------
        val : str or bytes
            A JSON string representation of this object.

        Returns
        -------
        new : Serializable
            A new instance of this class, loaded from the string `val`.
        """
        type_check(val, (str, bytes))

        if isinstance(val, bytes):
            val = val.decode()

        val = json.loads(val)
        return cls.from_dict(val)

    def to_dict(self) -> OrderedDict:
        """Represent this object as an OrderedDict, suitable for serializing.

        Returns
        -------
        self_dict : dict
            A representation of this object as a dict.
        """
        if self._as_dict is None:
            self._make_dict()

        return self._as_dict

    def to_json(self, minify=True, prettify=False, **kwargs) -> str:
        """Represent this object as a JSON string.

        Returns
        -------
        self_str : str
            A JSON string representation of this object.
        """
        if prettify:
            kwargs.update({
                "indent": kwargs["indent"] if "indent" in kwargs else 2,
                "separators": kwargs["separators"] if "separators" in kwargs else (", ", ": "),
                "sort_keys": kwargs["sort_keys"] if "sort_keys" in kwargs else True
            })
        if minify:
            kwargs["separators"] = kwargs["separators"] if "separators" in kwargs else (",", ":")

        return json.dumps(self.to_dict(), **kwargs)

import pytest

from collections import OrderedDict
from json.decoder import JSONDecodeError

from activity_viewer.base import Serializable, slugify, snake_to_camel, type_check


class ImplementsSerializable(Serializable):
    ATTRS = ["foo_bar"]

    def __init__(self, foo_bar):
        super().__init__()

        self._foo_bar = None
        self.foo_bar = foo_bar

    @property
    def foo_bar(self):
        return self._foo_bar

    @foo_bar.setter
    def foo_bar(self, val):
        if isinstance(val, dict):
            val = ImplementsSerializable.from_dict(val)

        self._foo_bar = val


def simple_implements_serializable():
    return ImplementsSerializable(0)


def nested_implements_serializable():
    return ImplementsSerializable(simple_implements_serializable())


@pytest.mark.parametrize(("fun", "val", "expected", "error"), [
    (slugify, "", "", None),
    (snake_to_camel, "", "", None),
    (slugify, "foo", "foo", None),
    (snake_to_camel, "foo", "foo", None),
    (slugify, "foo_", "foo", None),
    (snake_to_camel, "foo_", "foo", None),
    (slugify, "_foo", "foo", None),
    (snake_to_camel, "_foo", "foo", None),
    (slugify, "__foo", "foo", None),
    (snake_to_camel, "__foo", "foo", None),
    (slugify, "__foo___", "foo", None),
    (snake_to_camel, "__foo___", "foo", None),
    (slugify, "foo_bar", "foo_bar", None),
    (snake_to_camel, "foo_bar", "fooBar", None),
    (slugify, "__foo_ _bar__", "foo_bar", None),
    (snake_to_camel, "__foo_ _bar__", "foo Bar", None),  # weird, but not actually a variable name anyway
    (slugify, "foo_bar_baz", "foo_bar_baz", None),
    (snake_to_camel, "foo_bar_baz", "fooBarBaz", None),
    (slugify, "foo_barBaz", "foo_barBaz", None),
    (snake_to_camel, "foo_barBaz", "fooBarBaz", None),
    (slugify, "foo_b", "foo_b", None),
    (snake_to_camel, "foo_b", "fooB", None),
    (slugify, "foo:!bar?", "foobar", None),
    (snake_to_camel, "foo:!bar?", "foo:!bar?", None),
    (slugify, "foo-bar", "foo-bar", None),
    (snake_to_camel, "foo-bar", "foo-bar", None),
    (slugify, "local_ipv4", "local_ipv4", None),
    (snake_to_camel, "local_ipv4", "localIpv4", None),
    (slugify, "local ipv4", "local_ipv4", None),
    (snake_to_camel, "local ipv4", "local ipv4", None),
    (slugify, b"foo", None, TypeError),
    (snake_to_camel, b"foo", None, TypeError),  # but not where you think
    (slugify, [], None, TypeError),
    (snake_to_camel, [], None, AttributeError)
])
def test_str_transform(fun, val, expected, error):
    if error is None:
        assert fun(val) == expected
    else:
        pytest.raises(error, fun, val)


@pytest.mark.parametrize(("val", "val_type", "error"), [
    (1, int, None),  # ok
    (1., int, TypeError),  # floats are not ints!
    (OrderedDict(foo=1), dict, None),  # an OrderedDict is a dict...
    (dict(foo=1), OrderedDict, TypeError)  # ...but a dict is NOT an OrderedDict!
])
def test_type_check(val, val_type, error):
    if error is not None:
        pytest.raises(error, type_check, val, val_type)
    else:
        assert type_check(val, val_type) is None


@pytest.mark.parametrize(("str_val", "instance", "error"), [
    ('{"fooBar":0}', simple_implements_serializable(), None),  # simple, string
    (b'{"fooBar":0}', simple_implements_serializable(), None),  # decode bytes then proceed as usual
    ('{"fooBar":{"fooBar":0}}', nested_implements_serializable(), None),  # nested values
    ('{"foo":0}', None, KeyError),  # missing fooBar key
    ('{"fooBar":', None, JSONDecodeError)  # malformed JSON
])
def test_serializable_from_json(str_val, instance, error):
    if error is not None:
        pytest.raises(error, ImplementsSerializable.from_json, str_val)
    else:
        assert ImplementsSerializable.from_json(str_val) == instance


@pytest.mark.parametrize(("instance", "kwargs", "str_val"), [
    (simple_implements_serializable(), {}, '{"fooBar":0}'),
    (simple_implements_serializable(), {"minify": False}, '{"fooBar": 0}'),
    (simple_implements_serializable(), {"prettify": True}, '{\n  "fooBar": 0\n}'),
    (simple_implements_serializable(), {"prettify": True, "minify": True}, '{\n  "fooBar": 0\n}'),  # no change if you specify minify
    (nested_implements_serializable(), {},  '{"fooBar":{"fooBar":0}}')
])
def test_serializable_to_json(instance, kwargs, str_val):
    assert instance.to_json(**kwargs) == str_val


@pytest.mark.parametrize(("instance", "dict_val"), [
    (simple_implements_serializable(), OrderedDict(fooBar=0)),
    (nested_implements_serializable(), OrderedDict(fooBar=OrderedDict(fooBar=0)))
])
def test_serializable_to_dict(instance, dict_val):
    assert instance.to_dict() == dict_val

import pytest

from collections import OrderedDict
from datetime import datetime
from json.decoder import JSONDecodeError
import numpy as np

from activity_viewer.base import Serializable, nest_tuples, sha256sum_file, slugify, snake_to_camel, type_check

now = datetime.now()


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


@pytest.mark.parametrize(("value", "list_to_tuple", "expected"), [
    (["foo"], False, ["foo"]),  # list stays as a list
    (["foo"], True, ("foo",)),  # list converts to a tuple
    ({"foo": ["bar", "baz"]}, True, (("foo", ("bar", "baz")), )),

])
def test_nest_tuples(value, list_to_tuple, expected):
    assert nest_tuples(value, list_to_tuple=list_to_tuple) == expected


@pytest.mark.parametrize(("shape", "shasum"), [
    ((0,), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
    ((1,), "adece5188dea362f72013aee495ce0d7ed44950ad369125defb3f95bd0303a56"),
    ((2,), "f22961228792e461674328e980cd0c2b038c3b4f157c6ae2f6125cea5d08aa4c"),
    ((4,), "34e08bda59d78822587a217455a7163641b22ee01cf490ddae6a5e702776b1ea"),
    ((8,), "050b92db560319b5a680edf97b2420698dba228be3258304d1fede154fd990fb"),
    ((16,), "05233cefb76fc8ca6bcd16a25121ccf0f188bd5d83d0658464d7f6dc17c2e4b6"),
    ((32,), "8c22022e3803d457920f93b043d341a8d89a5db5c20571ab7f8f6c9a57bce097"),
    ((64,), "f230e9834663d2135540fb2666026ff1f1077b8e63d6fab6e85a41ab71623e05"),
    ((128,), "78d70fd526991a0d4b49391a5a1ada3015f6e6764c60a33e1dedc22078478ec3"),
    ((256,), "26df751e90fa66b173b5b3146f84963ffd252bc76a7620377328b3fc286d9c8f"),
    ((512,), "1c63649987ba84ae874fb732b07ff183aac3750acb8a1a4bbcc803d2b920562e"),
    ((1024,), "8ba8d6bee20e11874f4eddba1a5c5ef09e4281f5d0bcf11130b4956bac43ed78"),
    ((2048,), "27436887deae14f1f9fa472492809ac6f7158c11023a4c2381a8dd6cc5011d12"),
    ((4096,), "326ffb9d55aa2c275e867e7622c0c2a7d43b381c70878e00f2ca5a65215c89ed"),
    ((8192,), "837cd17d0d0d5073b1bea7c66b0e985f77d5c4d6ba6c4e9754d0f016b84493d7"),
    ((16384,), "177097c8f977b1d4aaea48e88ccea67bf9d27aa96280aa02bbc6e35a1d75dab9"),
    ((32768,), "e0dcea4b95da83b3d8500b402a0b187a14c7e7da038ff1ae28add66db6f43de5"),
    ((65536,), "dda2a48090c5b81b1fec1153e3a2a7aba3b040b60e9b999d2f0857f4d11446af"),
    ((131072,), "bae1a5eadfc8cc30d537ab1bc9931868502cb403bee3b222e6f16ea7568aa55d"),
    ((262144,), "4f9f9040f0efa2a0bcc45276174e8464c6928078d95475ac3761db42220adfc6"),
    ((524288,), "9597a0889e708f7d3de2005434434c1f54c4a65d5e03bd2aab2828f410a0ecd7"),
    ((1048576,), "8f618a2756817828b2afb1043399939b79e61c2b8a957ab622743c1258eb4df2"),
    ((2097152,), "ea6aff0ff11749db542ca7e313a608dfade179df062ec2e4fd9ebfa17cdacd73"),
    ((4194304,), "ed2fa765ec4438122501b515499e8618cf36e42d7d5cda873501d7aaaca90ecb"),
    ((8388608,), "02194b85c064093c8ea3a295772fea86584c4c7f0f7150c9681bf857cf0fce24"),
    ((16777216,), "8dae0bbd1e0fe4848eea6ebc1b778ad1c5e6f314de6e876f36414948e21ac970")
])
def test_sha256sum_file(tmp_path, shape, shasum):
    np.random.seed(0)

    file_path = tmp_path / "bin"

    if shape == (0, ):
        file_path.touch()
    else:
        mmap = np.memmap(file_path, dtype=np.int16, mode="w+", shape=shape, order="F")
        mmap[:] = np.random.randint(low=-2 ** 10, high=2 ** 12, size=shape, dtype=np.int16)
        del mmap  # flush to disk

    assert sha256sum_file(file_path) == shasum


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


@pytest.mark.parametrize(("value", "expected"), [
    (now, now.timestamp()),  # datetimes are converted into their timestamps
    (b"a string", "a string"),  # bytes are decoded
    (np.array([1, 2, 3]), [1, 2, 3]),  # numpy arrays are converted to lists
    ({1, 2, 3}, [1, 2, 3]),  # so are sets
    ((1, 2, 3), [1, 2, 3]),  # so are tuples
    (1, 1),  # ints remain ints
    (1.2, 1.2),  # floats remain floats
    (None, None),  # Nones remain Nones
])
def test_dictify_member(value, expected):
    assert Serializable._dictify_member(value) == expected


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

import pytest

import json
from pathlib import Path

from activity_viewer.settings import AVSettings
from activity_viewer.settings.avsettings import touch_file
from activity_viewer.settings.sections import Compartment, System


@pytest.mark.parametrize(("filename", "error", "emsg"), [
    (None, TypeError, "expected str, bytes or os.PathLike object, not NoneType"),  # pathlib's error message
    ("this/directory/does/not/exist/yet.txt", None, None),  # make directories
    ("foo", None, None)  # ok
])
def test_touch_file(tmp_path, filename, error, emsg):
    try:
        filename = tmp_path / filename
    except TypeError:  # testing for TypeError anyway
        pass

    if error is not None:
        with pytest.raises(error) as excinfo:
            touch_file(filename)

        assert excinfo.match(emsg)
    else:
        touch_file(filename)

        filename = Path(filename)
        assert filename.is_file()


@pytest.mark.parametrize(("kwargs", "error", "emsg"), [
    ({"blacklist": 1, "whitelist": [], "max_depth": 0}, TypeError, "Expected one of 'list', but got 'int'."),  # blacklist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": 0.9}, TypeError, "Expected one of 'int', but got 'float'."),  # max_depth should be an int
    ({"blacklist": [], "whitelist": None, "max_depth": 0}, TypeError, "Expected one of 'list', but got 'NoneType'."),  # whitelist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": -1}, ValueError, "Negative values for maxDepth are not permitted."),  # invalid max_depth
    ({"blacklist": [], "whitelist": [], "max_depth": 0, "extra_arg": None}, ValueError, "Unrecognized argument: 'extra_arg'."),  # argument not recognized
    ({"blacklist": [], "whitelist": [], "max_depth": 0}, None, None),  # ok
    ({}, None, None),  # empty kwargs, all defaults used
    ({"blacklist": ["item"]}, None, None),  # defaults used for whitelist and max_depth
    ({"blacklist": [], "whitelist": []}, None, None),  # default used for max_depth
])
def test_compartment_constructor(kwargs, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            Compartment(**kwargs)

        assert excinfo.match(emsg)
    else:
        compartment = Compartment(**kwargs)

        if "blacklist" not in kwargs:
            assert compartment.blacklist == Compartment.DEFAULTS["blacklist"]
        else:
            assert compartment.blacklist == kwargs["blacklist"]

        if "whitelist" not in kwargs:
            assert compartment.whitelist == Compartment.DEFAULTS["whitelist"]
        else:
            assert compartment.whitelist == kwargs["whitelist"]

        if "max_depth" not in kwargs:
            assert compartment.max_depth == Compartment.DEFAULTS["max_depth"]
        else:
            assert compartment.max_depth == kwargs["max_depth"]


@pytest.mark.parametrize(("kwargs", "error", "emsg"), [
    ({"atlas_version": 1, "data_directory": ""}, TypeError, "Expected one of 'str', but got 'int'."),  # atlas_version should be a string
    ({"atlas_version": "ccf_2015", "data_directory": 0.}, TypeError, "Expected one of 'str', 'Path', but got 'float'."),  # atlas_version should be a string or Path
    ({"atlas_version": "ccf_2015", "data_directory": "/foo/bar", "extra_arg": None}, ValueError, "Unrecognized argument: 'extra_arg'."),  # argument not recognized
    ({"atlas_version": "ccf_2014", "data_directory": "/foo/bar"}, ValueError,
     "Expecting one of 'ccf_2017', 'ccf_2016', 'ccf_2015' for atlas_version, got 'ccf_2014'."),  # unknown atlas version
    ({"atlas_version": "ccf_2015", "data_directory": "/foo/bar"}, None, None),  # ok
    ({}, None, None),  # empty kwargs, all defaults used
    ({"atlas_version": "ccf_2016"}, None, None),  # data_directory not given
])
def test_system_constructor(kwargs, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            System(**kwargs)

        assert excinfo.match(emsg)
    else:
        system = System(**kwargs)

        if "atlas_version" not in kwargs:
            assert system.atlas_version == System.DEFAULTS["atlas_version"]
        else:
            assert system.atlas_version == kwargs["atlas_version"]

        if "data_directory" not in kwargs:
            assert system.data_directory == System.DEFAULTS["data_directory"]
        else:
            assert system.data_directory == Path(kwargs["data_directory"]).resolve()


@pytest.mark.parametrize(("filename", "kwargs", "error", "emsg"), [
    (1, {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0},
            "system": {"atlas_version": "", "data_directory": "/foo/bar"}}, TypeError,
     "Expected one of 'str', 'Path', but got 'int'."),  # filename should be a string or Path
    ("/foo/bar/baz", {}, None, None),
    ("/foo/bar/baz", {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0}},
     None, None),
    ("/foo/bar/baz", {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0},
                      "system": {"atlas_version": "ccf_2017", "data_directory": "/foo/bar"}},
     None, None)

])
def test_avsettings_constructor(filename, kwargs, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            AVSettings(filename, **kwargs)

        assert excinfo.match(emsg)
    else:
        settings = AVSettings(filename, **kwargs)

        assert settings.filename == Path(filename).resolve()

        if "compartment" not in kwargs:
            assert settings.compartment == Compartment()

        if "system" not in kwargs:
            assert settings.system == System()


@pytest.mark.parametrize(("settings_dict", ), [
    ({}, ),
    ({
         "compartment": {
             "maxDepth": 0,
             "blacklist": [],
             "whitelist": []
         },
     }, ),
    ({
        "compartment": {
            "maxDepth": 0,
            "blacklist": [],
            "whitelist": []
        },
        "system": {
            "dataDirectory": "/foo/bar/baz",
            "atlasVersion": "ccf_2017"
        }
    }, ),
    ({
        "compartment": {
        },
        "system": {
        }
    }, ),
])
def test_avsettings_from_file(tmp_path, settings_dict):
    filename = tmp_path / "settings.json"
    with open(filename, "w") as fh:
        json.dump(settings_dict, fh)

    settings = AVSettings.from_file(filename)

    assert settings.filename == filename.resolve()

    if "compartment" not in settings_dict:
        assert settings.compartment == Compartment()
    else:
        if "blacklist" not in settings_dict["compartment"]:
            assert settings.compartment.blacklist == Compartment.DEFAULTS["blacklist"]
        else:
            assert settings.compartment.blacklist == settings_dict["compartment"]["blacklist"]

        if "maxDepth" not in settings_dict["compartment"]:
            assert settings.compartment.max_depth == Compartment.DEFAULTS["max_depth"]
        else:
            assert settings.compartment.max_depth == settings_dict["compartment"]["maxDepth"]

        if "whitelist" not in settings_dict["compartment"]:
            assert settings.compartment.whitelist == Compartment.DEFAULTS["whitelist"]
        else:
            assert settings.compartment.whitelist == settings_dict["compartment"]["whitelist"]

    if "system" not in settings_dict:
        assert settings.system == System()
    else:
        if "atlasVersion" not in settings_dict["system"]:
            assert settings.system.atlas_version == System.DEFAULTS["atlas_version"]
        else:
            assert settings.system.atlas_version == settings_dict["system"]["atlasVersion"]

        if "dataDirectory" not in settings_dict["system"]:
            assert settings.system.data_directory == System.DEFAULTS["data_directory"]
        else:
            assert settings.system.data_directory == Path(settings_dict["system"]["dataDirectory"]).resolve()



@pytest.mark.parametrize(("settings_dict",), [
    ({
        "compartment": {
            "max_depth": 0,
            "blacklist": [],
            "whitelist": []
        },
        "system": {
            "data_directory": "/foo/bar/baz",
            "atlas_version": "ccf_2017"
        }
    },),
])
def test_avsettings_to_file(tmp_path, settings_dict):
    filename = tmp_path / "settings.json"

    settings = AVSettings(filename, **settings_dict)
    settings.to_file(filename)
    settings2 = AVSettings.from_file(filename)

    assert settings == settings2

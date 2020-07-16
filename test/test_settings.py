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
    ({}, KeyError, "'blacklist'"),  # empty kwargs, required arguments not given
    ({"blacklist": []}, KeyError, "'whitelist'"),  # whitelist, max_depth not given
    ({"blacklist": [], "whitelist": []}, KeyError, "'max_depth'"),  # max_depth not given
    ({"blacklist": 1, "whitelist": [], "max_depth": 0}, TypeError, "Expected one of 'list', but got 'int'."),  # blacklist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": 0.9}, TypeError, "Expected one of 'int', but got 'float'."),  # max_depth should be an int
    ({"blacklist": [], "whitelist": None, "max_depth": 0}, TypeError, "Expected one of 'list', but got 'NoneType'."),  # whitelist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": -1}, ValueError, "Negative values for maxDepth are not permitted."),  # invalid max_depth
    ({"blacklist": [], "whitelist": [], "max_depth": 0, "extra_arg": None}, ValueError, "Unrecognized argument: 'extra_arg'."),  # argument not recognized
    ({"blacklist": [], "whitelist": [], "max_depth": 0}, None, None)  # ok
])
def test_compartment_constructor(kwargs, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            Compartment(**kwargs)

        assert excinfo.match(emsg)
    else:
        compartment = Compartment(**kwargs)

        assert compartment.blacklist == kwargs["blacklist"]
        assert compartment.whitelist == kwargs["whitelist"]
        assert compartment.max_depth == kwargs["max_depth"]


@pytest.mark.parametrize(("kwargs", "error", "emsg"), [
    ({}, KeyError, "'atlas_version'"),  # empty kwargs, required arguments not given
    ({"atlas_version": ""}, KeyError, "'data_directory'"),  # data_directory not given
    ({"atlas_version": 1, "data_directory": ""}, TypeError, "Expected one of 'str', but got 'int'."),  # atlas_version should be a string
    ({"atlas_version": "", "data_directory": 0.}, TypeError, "Expected one of 'str', 'Path', but got 'float'."),  # atlas_version should be a string or Path
    ({"atlas_version": "", "data_directory": "/foo/bar", "extra_arg": None}, ValueError, "Unrecognized argument: 'extra_arg'."),  # argument not recognized
    ({"atlas_version": "", "data_directory": "/foo/bar"}, None, None)  # ok
])
def test_system_constructor(kwargs, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            System(**kwargs)

        assert excinfo.match(emsg)
    else:
        system = System(**kwargs)

        assert system.atlas_version == kwargs["atlas_version"]
        assert system.data_directory == Path(kwargs["data_directory"]).resolve()


@pytest.mark.parametrize(("filename", "kwargs", "error", "emsg"), [
    (None, {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0},
            "system": {"atlas_version": "", "data_directory": "/foo/bar"}}, TypeError,
     "Expected one of 'str', 'Path', but got 'NoneType'."),  # filename should be a string or Path
    ("/foo/bar/baz", {}, KeyError, "'compartment'"),
    ("/foo/bar/baz", {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0}},
     KeyError, "'system'"),
    ("/foo/bar/baz", {"compartment": {"blacklist": [], "whitelist": [], "max_depth": 0},
                      "system": {"atlas_version": "", "data_directory": "/foo/bar"}},
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


@pytest.mark.parametrize(("settings_dict", "error", "emsg"), [
    ({
        "compartment": {
            "max_depth": 0,
            "blacklist": [],
            "whitelist": []
        },
        "system": {
            "data_directory": "/foo/bar/baz",
            "atlas_version": "v3"
        }
    }, None, None),
    ({
         "compartment": {
             "max_depth": 0,
             "blacklist": [],
             "whitelist": []
         },
     }, KeyError, "Missing key 'system'."),
])
def test_avsettings_from_file(tmp_path, settings_dict, error, emsg):
    filename = tmp_path / "settings.json"
    with open(filename, "w") as fh:
        json.dump(settings_dict, fh)

    import logging
    logging.debug(emsg)

    if error is not None:
        with pytest.raises(error) as excinfo:
            AVSettings.from_file(filename)

        assert excinfo.match(emsg)
    else:
        settings = AVSettings.from_file(filename)

        assert settings.filename == filename.resolve()
        assert settings.compartment.blacklist == settings_dict["compartment"]["blacklist"]
        assert settings.compartment.max_depth == settings_dict["compartment"]["max_depth"]
        assert settings.compartment.whitelist == settings_dict["compartment"]["whitelist"]
        assert settings.system.atlas_version == settings_dict["system"]["atlas_version"]
        assert settings.system.data_directory == Path(settings_dict["system"]["data_directory"]).resolve()


@pytest.mark.parametrize(("settings_dict",), [
    ({
        "compartment": {
            "max_depth": 0,
            "blacklist": [],
            "whitelist": []
        },
        "system": {
            "data_directory": "/foo/bar/baz",
            "atlas_version": "v3"
        }
    },),
])
def test_avsettings_to_file(tmp_path, settings_dict):
    filename = tmp_path / "settings.json"

    settings = AVSettings(filename, **settings_dict)
    settings.to_file(filename)
    settings2 = AVSettings.from_file(filename)

    assert settings == settings2

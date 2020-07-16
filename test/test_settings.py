import pytest

from activity_viewer.settings import AVSettings
from activity_viewer.settings.sections import Compartment, System
from pathlib import Path


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

        assert str(excinfo.value) == emsg
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

        assert str(excinfo.value) == emsg
    else:
        system = System(**kwargs)

        assert system.atlas_version == kwargs["atlas_version"]
        assert system.data_directory == Path(kwargs["data_directory"])

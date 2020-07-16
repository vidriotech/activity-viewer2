import pytest

from activity_viewer.settings import AVSettings
from activity_viewer.settings.sections import Compartment


@pytest.mark.parametrize(("kwargs", "error"), [
    ({}, KeyError),  # empty kwargs, required arguments not given
    ({"blacklist": []}, KeyError),  # whitelist, max_depth not given
    ({"blacklist": [], "whitelist": []}, KeyError),  # max_depth not given
    ({"blacklist": 1, "whitelist": [], "max_depth": 0}, TypeError),  # blacklist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": 0.9}, TypeError),  # max_depth should be an int
    ({"blacklist": [], "whitelist": 1, "max_depth": 0}, TypeError),  # whitelist should be a list
    ({"blacklist": [], "whitelist": [], "max_depth": -1}, ValueError),  # invalid max_depth
    ({"blacklist": [], "whitelist": [], "max_depth": 0}, None)
])
def test_compartment_constructor(kwargs, error):
    if error is not None:
        with pytest.raises(error) as excinfo:
            Compartment(**kwargs)
    else:
        compartment = Compartment(**kwargs)

        assert compartment.blacklist == kwargs["blacklist"]
        assert compartment.whitelist == kwargs["whitelist"]
        assert compartment.max_depth == kwargs["max_depth"]

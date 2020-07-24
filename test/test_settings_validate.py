import pytest

import json

from activity_viewer.settings.validate import SettingsValidator


@pytest.mark.parametrize(("contents", "errors", "warnings", "is_valid", "err", "emsg"), [
    ("", None, None, None, json.JSONDecodeError, r"Expecting value: line 1 column 1 \(char 0\)"),
    (json.dumps({"compartment": {"foo": "bar"}}), ["Unrecognized field 'foo' in compartment section."], [], False, None, None),
    (json.dumps({"compartment": {"maxDepth": []}}), ["maxDepth must be an integer."], [], False, None, None),
    (json.dumps({"compartment": {"maxDepth": -1}}), ["maxDepth cannot be negative."], [], False, None, None),
    (json.dumps({"compartment": {"maxDepth": 100}}), ["maxDepth cannot exceed 10."], [], False, None, None),
    (json.dumps({"compartment": {"include": ["foo"]}}),
     ["Unrecognized compartment in include: 'foo'."], [], False, None, None),
    (json.dumps({"compartment": {"include": [997, "root"]}}), [],
     ["Duplicate compartment with id 997, name 'root', or acronym 'root', found in include."], True, None, None),
    (json.dumps({"compartment": {"include": ["Orbital area, layer 1", "orbital area, layer 1"]}}), [],
     ["Duplicate compartment with id 264, name 'orbital area, layer 1', or acronym 'orb1', found in include."], True, None, None),
    (json.dumps({"compartment": {"exclude": ["foo"]}}),
     ["Unrecognized compartment in exclude: 'foo'."], [], False, None, None),
    (json.dumps({"compartment": {"exclude": [997, "root"]}}), [],
     ["Duplicate compartment with id 997, name 'root', or acronym 'root', found in exclude."], True, None, None),
    (json.dumps({"compartment": {"exclude": ["Orbital area, layer 1", "orbital area, layer 1"]}}), [],
     ["Duplicate compartment with id 264, name 'orbital area, layer 1', or acronym 'orb1', found in exclude."], True, None, None),
    (json.dumps({"compartment": {}}), [], [], True, None, None),
    (json.dumps({}), [], [], True, None, None),
])
def test_validate_compartment(tmp_path, contents, errors, warnings, is_valid, err, emsg):
    settings_file = tmp_path / "settings.json"
    with open(settings_file, "w") as fh:
        fh.write(contents)

    if err is not None:
        with pytest.raises(err) as excinfo:
            validator = SettingsValidator(settings_file)
            validator._validate_compartment({"errors": [], "warnings": []})

        assert excinfo.match(emsg)
    else:
        validator = SettingsValidator(settings_file)
        is_valid_actual, messages = validator._validate_compartment({"warnings": [], "errors": []})

        assert is_valid_actual == is_valid
        assert set(messages["errors"]) == set(errors)
        assert set(messages["warnings"]) == set(warnings)


@pytest.mark.parametrize(("contents", "errors", "warnings", "is_valid", "err", "emsg"), [
    (json.dumps({}), [], [], True, None, None),
    (json.dumps({"system": {"foo": "bar"}}), ["Unrecognized field 'foo' in system section."], [], False, None, None),
    (json.dumps({"system": {"resolution": "foo"}}), ["Unrecognized voxel resolution: foo."], [], False, None, None),
])
def test_validate_system(tmp_path, contents, errors, warnings, is_valid, err, emsg):
    settings_file = tmp_path / "settings.json"
    with open(settings_file, "w") as fh:
        fh.write(contents)

    if err is not None:
        with pytest.raises(err) as excinfo:
            validator = SettingsValidator(settings_file)
            validator._validate_system({"errors": [], "warnings": []})

        assert excinfo.match(emsg)
    else:
        validator = SettingsValidator(settings_file)
        is_valid_actual, messages = validator._validate_system({"warnings": [], "errors": []})

        assert is_valid_actual == is_valid
        assert set(messages["errors"]) == set(errors)
        assert set(messages["warnings"]) == set(warnings)

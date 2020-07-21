from click.testing import CliRunner
import pytest
from unittest import mock

from activity_viewer.cache import Cache
from activity_viewer.cli import cli


@pytest.fixture(scope="module")
def runner() -> CliRunner:
    return CliRunner()


@mock.patch.multiple(
    "activity_viewer.cli",
    Cache=mock.DEFAULT,
)
@pytest.mark.parametrize(("force", "sc_exists", "sg_exists", "sm_exists", "av_exists", "tv_exists", "error", "emsg"), [
    ([], False, False, False, False, False, None, None),
    (["-f"], False, False, False, False, False, None, None),
    (["--force"], False, False, False, False, False, None, None),
    ([], True, True, True, True, True, None, None),
])
def test_download(runner, force, sc_exists, sg_exists, sm_exists, av_exists, tv_exists, error, emsg, **kwargs):
    cache_mock = mock.MagicMock(spec=Cache)
    cache_mock.structure_centers_exists.return_value = sc_exists
    cache_mock.structure_graph_exists.return_value = sg_exists
    cache_mock.structure_mesh_exists.return_value = sm_exists
    cache_mock.annotation_volume_exists.return_value = av_exists
    cache_mock.template_volume_exists.return_value = tv_exists

    cache_cls_mock = kwargs["Cache"]
    cache_cls_mock.return_value = cache_mock

    with runner.isolated_filesystem():
        with open("settings.json", "w") as fh:
            fh.write("{}")  # an empty json file, use all defaults
        
        runner.invoke(cli, ["download"] + force)

    assert cache_mock.structure_centers_exists.call_count == 1
    assert cache_mock.save_structure_centers.call_count == 1 - (sc_exists and len(force) == 0)
    
    assert cache_mock.structure_graph_exists.call_count == 1
    assert cache_mock.save_structure_graph.call_count == 1 - (sg_exists and len(force) == 0)

    assert cache_mock.structure_mesh_exists.call_count == 1
    cache_mock.structure_mesh_exists.assert_called_with(997)
    assert cache_mock.save_structure_mesh.call_count == 1 - (sm_exists and len(force) == 0)

    assert cache_mock.annotation_volume_exists.call_count == 1
    assert cache_mock.save_annotation_volume.call_count == 1 - (av_exists and len(force) == 0)

    assert cache_mock.template_volume_exists.call_count == 1
    assert cache_mock.save_template_volume.call_count == 1 - (tv_exists and len(force) == 0)


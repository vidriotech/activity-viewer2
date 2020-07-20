import pytest

from activity_viewer.settings import AVSettings
from activity_viewer.settings.sections import System
from activity_viewer.downloader import Downloader


@pytest.fixture(scope="function")
def temp_settings(tmp_path):
    system = System(data_directory=tmp_path, resolution=100)
    yield AVSettings(system=system)


@pytest.mark.parametrize(("prop", "args", "error", "emsg"), [
    ("annotation_volume", [False], None, None),
    ("template_volume", [False], None, None),
    ("structure_centers", [False], None, None),
    ("structure_graph", [False], None, None),
    ("structure_mesh", [997, False], None, None),
])
def test_downloaders(temp_settings, prop, args, error, emsg):
    downloader = Downloader(temp_settings)

    if error is not None:
        with pytest.raises(error) as excinfo:
            getattr(downloader, "download_" + prop)(*args)

        assert excinfo.match(emsg)
    else:
        getattr(downloader, "download_" + prop)(*args)

        if prop == "structure_mesh":
            assert downloader.structure_mesh_exists(args[0])
        else:
            assert getattr(downloader, prop + "_exists")


import pytest
from unittest import mock

from activity_viewer.settings import AVSettings
from activity_viewer.settings.sections import System
from activity_viewer.cache import Cache


@pytest.fixture(scope="function")
def temp_settings(tmp_path):
    system = System(data_directory=tmp_path, resolution=100)
    yield AVSettings(system=system)


@pytest.mark.parametrize(("settings", "error", "emsg"), [
    (None, TypeError, "Expected one of 'AVSettings', but got 'NoneType'."),
    (AVSettings(), None, None)
])
def test_cache_constructor(settings, error, emsg):
    if error is not None:
        with pytest.raises(error) as excinfo:
            Cache(settings)

        assert excinfo.match(emsg)
    else:
        cache = Cache(settings)

        assert cache.settings == settings


# @pytest.mark.parametrize(("",), [

# ])

# @pytest.mark.parametrize(("prop", "args", "error", "emsg"), [
#     ("annotation_volume", [False], None, None),
#     ("template_volume", [False], None, None),
#     ("structure_centers", [False], None, None),
#     ("structure_graph", [False], None, None),
#     ("structure_mesh", [997, False], None, None),
# ])
# def test_cache_downloaders(temp_settings, prop, args, error, emsg):
#     downloader = Cache(temp_settings)

    
#     else:
#         getattr(downloader, "download_" + prop)(*args)

#         if prop == "structure_mesh":
#             assert downloader.structure_mesh_exists(args[0])
#         else:
#             assert getattr(downloader, prop + "_exists")


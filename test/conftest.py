import pytest

from appdirs import user_cache_dir, user_config_dir
from pathlib import Path


@pytest.fixture(scope="module")
def config_dir():
    pass
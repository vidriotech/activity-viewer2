from click.testing import CliRunner
import pytest


@pytest.fixture(scope="module")
def test_runner() -> CliRunner:
    yield CliRunner()


@pytest.mark.parametrize(("options", ), [

])
def test_download(options):
    pass

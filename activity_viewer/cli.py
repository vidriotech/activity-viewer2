from pathlib import Path

import click

from activity_viewer.downloader import Downloader
from activity_viewer.settings import AVSettings


def load_settings_file(filename: Path) -> AVSettings:
    """Load a settings file from disk.
    Will create the default settings file if it doesn't already exist.

    Parameters
    ----------
    filename : str or Path
        Path to the settings file.

    Returns
    -------
    settings : AVSettings
        Settings object.
    """
    # try to load a local settings file
    if filename != AVSettings.DEFAULTS["filename"] and filename.is_file():  # use a custom settings file, which exists
        settings = AVSettings.from_file(filename)
    elif filename.is_file():  # use the default settings file, and it exists
        settings = AVSettings.from_file(filename)
    else:  # custom settings file doesn't exist or default doesn't exist
        settings = AVSettings()
        settings.to_file()

    return settings


@click.group()
@click.pass_context
def cli(ctx: click.core.Context):
    """Command-line application. Settings file is a sine qua non."""
    ctx.ensure_object(dict)

    settings_file = Path("./settings.json")
    if not settings_file.is_file():
        settings_file = AVSettings.DEFAULTS["filename"]

    # load settings, warn the user if it fails somehow
    try:
        ctx.obj["settings"] = load_settings_file(settings_file)
    except Exception as e:
        click.echo(f"Failed to load '{settings_file}': {e}", err=True)


@cli.command()
@click.option("--force", "-f", is_flag=True, default=False)
@click.pass_context
def download(ctx: click.core.Context, force: bool):

    if "settings" not in ctx.obj:
        return

    # download some data from the API
    downloader = Downloader(ctx.obj["settings"])
    ops = [
        (downloader.download_structure_centers, force),
        (downloader.download_structure_graph, force),
        (downloader.download_structure_mesh, 997, force)
    ]

    with click.progressbar(ops, label="Downloading data files") as bar:
        for op in bar:
            args = op[1:]
            op[0](*args)

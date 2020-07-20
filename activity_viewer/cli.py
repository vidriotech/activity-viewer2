from pathlib import Path

import click
import numpy as np

from activity_viewer.cache import Cache
from activity_viewer.settings import AVSettings


def load_settings_file(filename: Path):
    """Load settings from a file."""
    if not filename.is_file():
        filename = AVSettings.DEFAULTS["filename"]

    try:
        settings = AVSettings.from_file(filename)
    except Exception as e:
        click.echo(f"Failed to load settings from file '{filename.resolve()}'. Using default settings.")
        settings = AVSettings()

    return settings


@click.group()
@click.pass_context
def cli(ctx: click.core.Context):
    """Command-line application. Settings file is a sine qua non."""
    ctx.ensure_object(dict)

    # load settings
    ctx.obj["settings_file"] = Path("./settings.json")


@cli.command()
@click.option("--force", "-f", is_flag=True, default=False)
@click.pass_context
def download(ctx: click.core.Context, force: bool):
    """Download large data files and store them in cache."""
    settings = load_settings_file(ctx.obj["settings"])

    # download some data from the API
    cache = Cache(settings)

    # download some data
    if cache.structure_centers_exists() and not force:
        click.echo("Structure centers file already exists. Skipping.")
    else:
        click.echo("Downloading structure centers file...", nl=False)
        cache.download_structure_centers(force)
        click.echo("done.")

    if cache.structure_graph_exists() and not force:
        click.echo("Structure graph file already exists. Skipping.")
    else:
        click.echo("Downloading structure graph file...", nl=False)
        cache.download_structure_graph(force)
        click.echo("done.")

    if cache.structure_mesh_exists(997) and not force:
        click.echo("Root node mesh file already exists. Skipping.")
    else:
        click.echo("Downloading root node mesh file...", nl=False)
        cache.download_structure_mesh(997, force)
        click.echo("done.")

    if cache.annotation_volume_exists() and not force:
        click.echo("Annotation volume already exists. Skipping.")
    else:
        click.echo("Downloading annotation volume (please be patient)...", nl=False)
        cache.download_annotation_volume(force)
        click.echo("done.")

    if cache.template_volume_exists() and not force:
        click.echo("Template volume already exists. Skipping.")
    else:
        click.echo("Downloading template volume (please be patient)...", nl=False)
        cache.download_template_volume(force)
        click.echo("done.")


@cli.command()
@click.option("--filename", "-f", type=str)
def validate(filename: str = None):
    """Validate a settings file."""
    if filename is None:
        local_filename = Path("./settings.json")
        if local_filename.is_file():
            click.echo(f"Filename not given, assuming {local_filename}.")
            filename = local_filename.resolve()
        elif AVSettings.DEFAULTS["filename"].is_file():
            click.echo(f"Filename not given, assuming {AVSettings.DEFAULTS['filename']}.")
            filename = AVSettings.DEFAULTS["filename"].resolve()
        else:
            click.echo("Filename not given and no default settings file exists.", err=True)
            return -1

    try:
        AVSettings.from_file(filename)
    except Exception as e:
        click.echo(f"Failed to load: {e}", err=True)
        return

    click.echo("Looks ok!")


@cli.command()
@click.argument("filename", type=click.Path(exists=True))
@click.pass_context
def visualize(ctx: click.core.Context, filename: str):
    """Load and validate a .npz file."""
    settings = load_settings_file(ctx.obj["settings"])

    try:
        dat = np.load(filename)
    except ValueError:
        click.echo(f"Failed to load '{filename}'. Possibly not a .npz file?", err=True)
        return

    click.echo(dat)

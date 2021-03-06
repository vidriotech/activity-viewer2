import os
from pathlib import Path
import shlex
import shutil
import subprocess
from typing import Tuple

import click
from gevent.pywsgi import WSGIServer

from activity_viewer.api import app
from activity_viewer.api.routes import state
from activity_viewer.base import REPO_BASE
from activity_viewer.cache import Cache
from activity_viewer.settings import AVSettings, make_default_settings
from activity_viewer.settings.validate import SettingsValidator


def load_settings_file(filename: Path):
    """Load settings from a file."""
    if not filename.is_file():
        filename = AVSettings.DEFAULTS["filename"]

    try:
        settings = AVSettings.from_file(filename)
    except Exception:
        click.echo(f"Failed to load settings from file '{filename.resolve()}'. Using default settings.")
        settings = make_default_settings()

    return settings


@click.group()
@click.pass_context
def cli(ctx: click.core.Context):
    """Command-line interface for the Activity Viewer."""
    ctx.ensure_object(dict)

    # create a default settings file if it does not exist
    if not AVSettings.DEFAULTS["filename"].is_file():
        default_settings = make_default_settings()
        default_settings.to_file(AVSettings.DEFAULTS["filename"])

    # load settings
    settings_file = Path("./settings.json")
    if not settings_file.is_file():
        settings_file = AVSettings.DEFAULTS["filename"]

    ctx.obj["settings_file"] = settings_file.resolve()


@cli.command()
@click.option("--force", "-f", is_flag=True, default=False,
              help="Overwrite existing files if this is set.")
@click.pass_context
def download(ctx: click.core.Context, force: bool):
    """Pre-downloads and caches large data files for quick access later."""
    settings = load_settings_file(ctx.obj["settings_file"])

    # download some data from the API
    cache = Cache(settings)

    # download some data
    if cache.structure_centers_exists() and not force:
        click.echo("Structure centers file already exists. Skipping.")
    else:
        click.echo("Downloading structure centers file...", nl=False)
        cache.save_structure_centers(force)
        click.echo("done.")

    if cache.structure_graph_exists() and not force:
        click.echo("Structure graph file already exists. Skipping.")
    else:
        click.echo("Downloading structure graph file...", nl=False)
        cache.save_structure_graph(force)
        click.echo("done.")

    if cache.structure_mesh_exists(997) and not force:
        click.echo("Root node mesh file already exists. Skipping.")
    else:
        click.echo("Downloading root node mesh file...", nl=False)
        cache.save_structure_mesh(997, force)
        click.echo("done.")

    if cache.annotation_volume_exists() and not force:
        click.echo("Annotation volume already exists. Skipping.")
    else:
        click.echo("Downloading annotation volume (please be patient)...", nl=False)
        cache.save_annotation_volume(force)
        click.echo("done.")

    if cache.template_volume_exists() and not force:
        click.echo("Template volume already exists. Skipping.")
    else:
        click.echo("Downloading template volume (please be patient)...", nl=False)
        cache.save_template_volume(force)
        click.echo("done.")


@cli.command()
def start_daemon():
    """Start the `viewerd` daemon."""
    http_server = WSGIServer(("", 3030), app)
    http_server.serve_forever()


@cli.command()
@click.argument("filename", type=click.Path(exists=True, dir_okay=False))
def validate(filename: str):
    """Validate a settings file FILENAME. Useful for basic sanity checks."""
    # formally validate
    validator = SettingsValidator(filename)
    is_valid, messages = validator.validate()

    if is_valid:
        click.echo("Looks OK!\n")
    else:
        click.echo("Your settings file is not valid.\n")

    # display errors
    if len(messages["errors"]) > 0:
        click.echo("The following errors were found:", err=True)
    
        for err in messages["errors"]:
            click.echo("- " + err, err=True)

        click.echo("")

    # display warnings
    if len(messages["warnings"]) > 0:
        click.echo("You might want to look into these issues:")

        for warn in messages["warnings"]:
            click.echo("- " + warn)


@cli.command()
@click.argument("filenames", type=click.Path(exists=True, dir_okay=False), nargs=-1)
@click.pass_context
def visualize(ctx: click.core.Context, filenames: Tuple[str]):
    """Load some number of data files and start the visualizer tool."""
    filenames = [Path(f).resolve() for f in filenames]

    os.chdir(REPO_BASE / "app")
    npm = shutil.which("npm")
    if npm is None:
        click.echo("npm not found! Please install Node.js.", err=True)
        return

    # start the API server
    api_proc = subprocess.Popen(["viewerd"])

    env = os.environ
    env["AV_SETTINGS_PATH"] = str(ctx.obj["settings_file"])
    env.update({f"AV_DATA_PATH{i}": str(f) for i, f in enumerate(filenames)})

    subprocess.run(shlex.split(f"'{npm}' start"), env=env)

    api_proc.kill()

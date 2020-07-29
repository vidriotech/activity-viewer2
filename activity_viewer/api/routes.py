import json
import os

from flask import Flask, request

from activity_viewer.settings import AVSettings, make_default_settings
from activity_viewer.loaders import NpzLoader
from .state import APIState

app = Flask(__name__)
state = APIState()


@app.route("/")
def hello():
    return "Hello, world!"


@app.route("/configure", methods=["POST"])
def configure():
    """Update settings and data files."""
    response = {}
    data = json.loads(request.data)

    data_path = data["data_path"] if "data_path" in data else None

    if "settings_path" in data:
        try:
            state.settings = AVSettings.from_file(data["settings_path"])
        except:
            app.logger.warning(f"Settings file {data['settings_path']} was not found. Using default settings.")
            state.settings = make_default_settings()
    if data_path is not None:
        try:
            state.npz_loader.load_file(data_path)
        except FileNotFoundError:
            data_path = "Not found"
        except Exception as e:
            data_path = str(e)

    response["settings"] = state.settings.to_dict()
    response["data_path"] = data_path

    return response


@app.route("/mesh/<int:structure_id>")
def get_mesh(structure_id: int):
    return state._cache.load_structure_mesh(structure_id)


@app.route("/settings", methods=["GET", "POST"])
def settings():
    """Update or fetch settings in use."""
    if request.method == "POST":
        data = json.loads(request.data)

        if "settings_path" in data:
            try:
                state.settings = AVSettings.from_file(data["settings_path"])
            except:
                app.logger.warning(f"Settings file {data['settings_path']} was not found. Using default settings.")
                state.settings = make_default_settings()
    
    return state.settings.to_dict()

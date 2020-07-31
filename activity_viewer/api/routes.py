import json
import os

from flask import Flask, make_response, request
from flask_cors import CORS

from activity_viewer.settings import AVSettings, make_default_settings
from activity_viewer.loaders import NpzLoader
from .state import APIState

app = Flask(__name__)
CORS(app)
state = APIState()


@app.route("/")
def hello():
    return "Hello, world!"


@app.route("/configure", methods=["POST"])
def configure():
    """Update settings and data files."""
    app.logger.debug(f"Received request: {request.data}")

    response = {}
    data = json.loads(request.data)

    settings_path = data["settings_path"] if "settings_path" in data else None
    data_paths = data["data_paths"] if "data_paths" in data else []

    # update settings
    if settings_path is not None:
        try:
            state.settings = AVSettings.from_file(settings_path)
        except:
            app.logger.warning(f"Settings file '{settings_path}' was not found. Using default settings.")
            state.settings = make_default_settings()

    # update penetrations
    for path in data_paths:
        state.add_penetration(path)

    response["settings"] = state.settings.to_dict()
    response["penetrations"] = state.penetrations

    return response


@app.route("/mesh/<int:structure_id>")
def get_mesh(structure_id: int):
    return state.cache.load_structure_mesh(structure_id)


@app.route("/penetrations")
def get_all_penetrations():
    return {"penetration": state.penetrations}


@app.route("/penetrations/<penetration_id>/slices/coronal/annotation")
def get_pseudocoronal_annotation_slice(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)
    
    plane = state.get_pseudocoronal_annotation_slice(penetration_id)
    return {"voxels": plane.ravel().tolist(), "stride": plane.shape[1]}


@app.route("/penetrations/<penetration_id>/coordinates")
def get_coordinates(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    ids = state.get_unit_ids(penetration_id)
    coords = state.get_coordinates(penetration_id)
    return {
        "ids": ids.ravel().tolist(),
        "coordinates": coords.ravel().tolist(),
        "stride": coords.shape[1]
    }


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

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


@app.route("/compartments")
def get_compartment_tree():
    return state.get_compartment_tree()


@app.route("/mesh/<int:structure_id>")
def get_mesh(structure_id: int):
    return state.cache.load_structure_mesh(structure_id)


@app.route("/penetrations", methods=["GET", "POST"])
def get_all_penetrations():
    if request.method == "POST":
        data = json.loads(request.data)

        if "data_paths" in data:
            for data_path in data["data_paths"]:
                state.add_penetration(data_path)

    return {"penetrations": state.penetrations}


@app.route("/penetrations/<penetration_id>")
def get_penetration_vitals(penetration_id: str):
    """Get IDs, coordinates, and compartments for each point in `penetration_id`."""
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    ids = state.get_unit_ids(penetration_id)
    coords = state.get_coordinates(penetration_id)
    compartments = state.get_compartments(penetration_id)

    return {
        "ids": ids.ravel().tolist(),
        "compartments": compartments,
        "coordinates": coords.ravel().tolist(),
        "stride": coords.shape[1]
    }


@app.route("/penetrations/<penetration_id>/slices/coronal/annotation")
def get_pseudocoronal_annotation_slice(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    plane = state.get_pseudocoronal_annotation_slice(penetration_id)
    return {"voxels": plane.ravel().tolist(), "stride": plane.shape[1]}


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

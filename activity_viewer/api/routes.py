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


@app.route("/penetrations", methods=["GET", "POST", "PUT", "DELETE"])
def get_all_penetrations():
    if request.method != "GET" and hasattr(request, "data"):
        try:
            data = json.loads(request.data)
        except json.JSONDecodeError as e:
            print(e)
            data = None
    else:
        data = None

    if request.method == "POST":  # reset all penetrations
        if data is not None and "data_paths" in data:
            state.clear_penetrations()
            state.add_penetrations(data["data_paths"])
    elif request.method == "PUT":  # add one or more penetration
        if data is not None and "data_paths" in data:
            state.add_penetrations(data["data_paths"])
    elif request.method == "DELETE":
        if data is not None and "penetrations" in data:
            state.rm_penetrations(data["penetrations"])        

    return {"penetrations": [get_penetration_vitals(pen) for pen in state.penetrations]}


@app.route("/penetrations/<penetration_id>")
def get_penetration_vitals(penetration_id: str):
    """Get IDs, coordinates, and compartments for each point in `penetration_id`."""
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    ids = state.get_unit_ids(penetration_id)
    coords = state.get_coordinates(penetration_id)
    compartments = state.get_compartments(penetration_id)

    return {
        "penetrationId": penetration_id,
        "ids": ids.ravel().tolist(),
        "compartments": compartments,
        "coordinates": coords.ravel().tolist(),
        "stride": coords.shape[1]
    }


@app.route("/penetrations/<penetration_id>/timeseries")
def get_all_timeseries(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    timeseries = state.get_all_timeseries(penetration_id).tolist()
    return {
        "penetration": penetration_id,
        "timeseries": timeseries,
    }


@app.route("/penetrations/<penetration_id>/timeseries/<timeseries_id>")
def get_timeseries(penetration_id: str, timeseries_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    timeseries = state.get_timeseries(penetration_id, timeseries_id)
    if timeseries is None:
        return make_response(f"Timeseries '{timeseries_id}' not found.", 404)

    return {
        "penetration": penetration_id,
        "data": timeseries.ravel().tolist(),
        "stride": timeseries.shape[1],
    }


@app.route("/penetrations/<penetration_id>/slices/coronal/annotation")
def get_pseudocoronal_annotation_slice(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    plane = state.get_pseudocoronal_annotation_slice(penetration_id)
    return {
        "penetration": penetration_id,
        "voxels": plane.ravel().tolist(),
        "stride": plane.shape[1]
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

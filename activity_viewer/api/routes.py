import json
from math import nan
from pathlib import Path
import shutil
from tempfile import mkdtemp

from flask import Flask, make_response, request, send_file
from flask_cors import CORS
import numpy as np

from activity_viewer.api.state import APIState
from activity_viewer.api.compute import slice_to_data_uri, summarize_timeseries
from activity_viewer.compute.mappings import color_map
from activity_viewer.settings import AVSettings, make_default_settings

app = Flask(__name__)
CORS(app)
state = APIState()


@app.route("/")
def hello():
    return "Hello, world!"


@app.route("/aesthetics", methods=["POST"])
def get_aesthetic_mappings():
    if request.method == "POST" and hasattr(request, "data"):
        data = json.loads(request.data)
        penetration_ids = data["penetrationIds"]
        params = data["params"]

        mappings = []
        for penetration_id in penetration_ids:
            mappings.append(state.make_aesthetic_mapping(penetration_id, params).to_dict())

        return {"mappings": mappings}


@app.route("/aesthetics/<penetration_id>", methods=["POST"])
def get_aesthetic_mapping(penetration_id: str):
    if request.method == "POST" and hasattr(request, "data"):
        params = json.loads(request.data)
        penetrations = state.penetrations

        mapping = state.make_aesthetic_mapping(penetration_id, params)

        return mapping.to_dict()


@app.route("/color-map/<map_name>")
def get_colormap(map_name: str):
    mapping = color_map(map_name)
    if mapping is None:
        return make_response(f"Color map identifier '{map_name}' not found.", 404)

    return {
        "name": map_name,
        "mapping": mapping.tolist()
    }


@app.route("/compartments")
def get_compartment_tree():
    return state.get_compartment_tree()


@app.route("/data-file", methods=["POST"])
def get_export_data_file():
    if request.method == "POST" and hasattr(request, "data"):
        tmpfile = Path(mkdtemp(), "export.npz")

        data = json.loads(request.data)
        export_data = {}

        for export_request in data["data"]:
            penetration_id = export_request["penetrationId"]
            unit_ids = export_request["unitIds"]
            export_data[penetration_id] = unit_ids

        np.savez(tmpfile, **export_data)
        shutil.copy2(tmpfile, Path(state.settings.filename.parent, "export.npz"))
        return send_file(tmpfile)


@app.route("/data-file/penetration/<penetration_id>")
def get_penetration_data_file(penetration_id: str):
    file_path = state.get_penetration_filename(state.penetrations[0])
    if file_path is None:
        return make_response(f"Penetration '{penetration_id}'.", 404)

    return send_file(
        file_path,
        attachment_filename=file_path.name
    )


@app.route("/mesh/<int:structure_id>")
def get_mesh(structure_id: int):
    return state.cache.load_structure_mesh(structure_id)


@app.route("/penetrations", methods=["GET", "POST", "PUT", "DELETE"])
def get_penetrations():
    data = None

    if request.method != "GET" and hasattr(request, "data"):
        try:
            data = json.loads(request.data)
        except json.JSONDecodeError as e:
            app.logger.error(e)

    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=10, type=int)

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

    n_pens = len(state.penetrations)
    response = {
        "penetrations": [],
        "info": {
            "totalCount": n_pens
        },
        "link": None
    }

    start = (page - 1) * limit
    stop = page * limit
    if start < n_pens:
        response["penetrations"] = [get_penetration_vitals(pen) for pen in state.penetrations[start:stop]]

    if stop < n_pens - 1:
        response["link"] = f"/penetrations?page={page + 1}&limit={limit}"

    return response


@app.route("/penetrations/<penetration_id>")
def get_penetration_vitals(penetration_id: str):
    """Get IDs, coordinates, and compartments for each point in `penetration_id`."""
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    ids = state.get_unit_ids(penetration_id)
    coords = state.get_coordinates(penetration_id)
    compartments = state.get_compartments(penetration_id)
    
    timeseries = state.get_timeseries_list(penetration_id)
    timeseries = timeseries.tolist() if timeseries is not None else []

    unit_stats = state.get_unit_stats_list(penetration_id)
    unit_stats = unit_stats.tolist() if unit_stats is not None else []

    return {
        "penetrationId": penetration_id,
        "ids": ids.ravel().tolist(),
        "compartments": compartments,
        "coordinates": coords.ravel().tolist(),
        "timeseries": timeseries,
        "unitStats": unit_stats,
    }


@app.route("/penetrations/<penetration_id>/timeseries")
def get_timeseries_list(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration '{penetration_id}' not found.", 404)

    timeseries = state.get_timeseries_list(penetration_id).tolist()
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

    times = timeseries[0, :].ravel()
    values = timeseries[1:, :].ravel()

    return {
        "penetrationId": penetration_id,
        "timeseriesId": timeseries_id,
        "times": times.tolist(),
        "values": values.tolist(),
        "stride": timeseries.shape[1],
        "minTime": times.min(),
        "maxTime": times.max(),
        "minStep": np.diff(times).min(),
        "minVal": values.min(),
        "maxVal": values.max(),
    }


@app.route("/penetrations/<penetration_id>/unit-stats")
def get_unit_stats_list(penetration_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration '{penetration_id}' not found.", 404)

    return {
        "penetration": penetration_id,
        "unitStats": [],
    }


@app.route("/penetrations/<penetration_id>/unit-stats/<stat_id>")
def get_unit_stat(penetration_id: str, stat_id: str):
    if not state.has_penetration(penetration_id):
        return make_response(f"Penetration not found.", 404)

    timeseries = state.get_unit_stat(penetration_id, stat_id)
    if timeseries is None:
        return make_response(f"Unit stat '{stat_id}' not found.", 404)

    return {
        "penetration": penetration_id,
        "data": timeseries.ravel().tolist(),
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
def get_settings():
    """Update or fetch settings in use."""
    if request.method == "POST":
        data = json.loads(request.data)

        if "settings_path" in data:
            try:
                state.settings = AVSettings.from_file(data["settings_path"])
            except Exception as e:
                app.logger.warning(f"Error: {e}. Using default settings.")
                state.settings = make_default_settings()
    
    return state.settings.to_dict()


@app.route("/slices/<slice_type>/<coordinate>")
def get_slices(slice_type: str, coordinate: float):
    coordinate = float(coordinate)
    rotate = 0

    if slice_type == "coronal":
        template_slice = state.get_coronal_template_slice(coordinate)
        annotation_rgb = state.get_coronal_annotation_rgb(coordinate)
        annotation_slice = state.get_coronal_annotation_slice(coordinate)
    elif slice_type == "sagittal":
        template_slice = state.get_sagittal_template_slice(coordinate)
        annotation_rgb = state.get_sagittal_annotation_rgb(coordinate)
        annotation_slice = state.get_sagittal_annotation_slice(coordinate)
        rotate = 1
    else:
        template_slice = annotation_rgb = annotation_slice = None

    if template_slice is None or annotation_rgb is None or annotation_slice is None:
        return make_response(f"No slices found for slice type '{slice_type}' and coordinate '{coordinate}'.")

    return {
        "annotationImage": slice_to_data_uri(
            annotation_rgb,
            annotation_slice,
            rotate
        ),
        "annotationSlice": annotation_slice.ravel().tolist(),
        "sliceType": slice_type,
        "stride": annotation_slice.shape[1],
        "templateImage": slice_to_data_uri(
            template_slice[:, :, np.newaxis],
            annotation_slice,
            rotate
        ),
    }


@app.route("/timeseries/<timeseries_id>")
def get_timeseries_by_id(timeseries_id: str):
    response = {
        "timeseries": [],
        "minTime": None,
        "maxTime": None,
        "minStep": None,
        "minVal": None,
        "maxVal": None,
    }

    for penetration_id in state.penetrations:
        entry = {
            "penetrationId": penetration_id,
            "times": [],
            "values": [],
            "stride": 0,
            "minTime": nan,
            "maxTime": nan,
            "minStep": nan,
            "minVal": nan,
            "maxVal": nan,
        }

        data = state.get_timeseries(penetration_id, timeseries_id)
        if data is not None:
            entry.update(summarize_timeseries(data))

            if response["minTime"] is None or entry["minTime"] < response["minTime"]:
                response["minTime"] = entry["minTime"]

            if response["maxTime"] is None or entry["maxTime"] > response["maxTime"]:
                response["maxTime"] = entry["maxTime"]

            if response["minStep"] is None or entry["minStep"] < response["minStep"]:
                response["minStep"] = entry["minStep"]

            if response["minVal"] is None or entry["minVal"] < response["minVal"]:
                response["minVal"] = entry["minVal"]

            if response["maxVal"] is None or entry["maxVal"] > response["maxVal"]:
                response["maxVal"] = entry["maxVal"]
        
        response["timeseries"].append(entry)

    return response


@app.route("/timeseries/<timeseries_id>/summary")
def get_timeseries_summary(timeseries_id: str):
    summary = state.make_timeseries_summary(timeseries_id)
    return summary.to_dict()


@app.route("/unit-stats/<stat_id>")
def get_unit_stat_by_id(stat_id: str):
    response = {"unitStats": []}

    for penetration_id in state.penetrations:
        entry = {
            "penetrationId": penetration_id,
            "data": [],
        }

        data = state.get_unit_stat(penetration_id, stat_id)
        if data is not None:
            entry["data"] = data.ravel().tolist()
        
        response["unitStats"].append(entry)

    return response

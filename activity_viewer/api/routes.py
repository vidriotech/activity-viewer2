import json
from pathlib import Path
import sys
from tempfile import mkdtemp

from flask import Flask, make_response, request, send_file
from flask_cors import CORS
import numpy as np

from activity_viewer.api.state import APIState
from activity_viewer.api.compute import slice_to_data_uri
from activity_viewer.constants import SliceType, AP_MAX
from activity_viewer.settings import AVSettings, make_default_settings

app = Flask(__name__)
CORS(app)
state = APIState()


@app.route("/")
def hello():
    return "Hello, world!"


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


@app.route("/images/<image_path>")
def get_image(image_path: str):
    base_dir = getattr(sys, "_MEIPASS", Path(__file__).parent.parent)
    file_path = Path(base_dir) / "assets" / "images" / image_path
    if not file_path.is_file():
        return make_response(f"Image '{image_path}' not found.", 404)

    return send_file(file_path)


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

    if request.method == "POST":  # reset all penetrations
        if data is not None and "dataPaths" in data:
            state.clear_penetrations()
            state.add_penetrations(data["dataPaths"])
    elif request.method == "PUT":  # add one or more penetration
        if data is not None and "dataPaths" in data:
            state.add_penetrations(data["dataPaths"])
    elif request.method == "DELETE":
        if data is not None and "penetrations" in data:
            state.rm_penetrations(data["penetrations"])        

    return {"penetrationIds": state.penetrations}


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
        "id": penetration_id,
        "unitIds": ids.ravel().tolist(),
        "compartments": compartments,
        "coordinates": coords.ravel().tolist(),
        "timeseriesIds": timeseries,
        "unitStatIds": unit_stats,
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


@app.route("/unitStat")
def get_penetration_unit_stat():
    penetration_id = request.args.get("penetrationId", type=str, default=None)
    unit_stat_id = request.args.get("unitStatId", type=str, default=None)

    if penetration_id is None or unit_stat_id is None:
        return make_response("penetrationId or unitStatId not specified.", 400)

    if not state.has_penetration(penetration_id):
        return make_response(f"penetrationId '{penetration_id}' not found.", 404)

    unit_stat = state.get_unit_stat(penetration_id, unit_stat_id)
    if unit_stat is None:
        return make_response(f"unitStatId '{unit_stat_id}' not found for penetration '{penetration_id}'.", 404)

    return {
        "penetrationId": penetration_id,
        "unitStatId": unit_stat_id,
        "data": unit_stat.tolist()
    }


@app.route("/timeseries")
def get_penetration_timeseries():
    penetration_id = request.args.get("penetrationId", type=str, default="")
    timeseries_id = request.args.get("timeseriesId", type=str, default="")

    if timeseries_id is None:
        return make_response("timeseriesId not specified.", 400)

    # if no particular penetration is specified, return a summary
    # if no penetration has this timeseries, get back an object filled with null values
    if penetration_id is None:
        summary = state.make_timeseries_summary(timeseries_id)
        return summary.to_dict()

    if not state.has_penetration(penetration_id):
        return make_response(f"penetrationId '{penetration_id}' not found.", 404)

    response = {
        "penetrationId": penetration_id,
        "timeseriesId": timeseries_id,
        "times": None,
        "values": None
    }

    data = state.get_timeseries(penetration_id, timeseries_id)
    if data is not None:
        times = data[0, :]
        values = data[1:, :]
        response["times"] = times.ravel().tolist()
        response["values"] = values.ravel().tolist()

    return response


@app.route("/settings", methods=["GET", "POST"])
def get_settings():
    """Update or fetch settings in use."""
    if request.method == "POST":
        data = json.loads(request.data)

        if "settingsPath" in data:
            try:
                state.settings = AVSettings.from_file(data["settingsPath"])
            except Exception as e:
                app.logger.warning(f"Error: {e}. Using default settings.")
                state.settings = make_default_settings()
    
    return state.settings.to_dict()


@app.route("/slices")
def get_slices():
    rotate = 0

    slice_type = request.args.get("sliceType", type=int, default=SliceType.CORONAL.value)
    coordinate = request.args.get("coordinate", type=float, default=AP_MAX / 2)

    if slice_type == SliceType.CORONAL.value:
        template_slice = state.get_coronal_template_slice(coordinate)
        annotation_rgb = state.get_coronal_annotation_rgb(coordinate)
        annotation_slice = state.get_coronal_annotation_slice(coordinate)
    elif slice_type == SliceType.SAGITTAL.value:
        template_slice = state.get_sagittal_template_slice(coordinate)
        annotation_rgb = state.get_sagittal_annotation_rgb(coordinate)
        annotation_slice = state.get_sagittal_annotation_slice(coordinate)
        rotate = 1
    else:
        template_slice = annotation_rgb = annotation_slice = None

    if template_slice is None or annotation_rgb is None or annotation_slice is None:
        return make_response(f"No slices found for slice type '{slice_type}' and coordinate '{coordinate}'.", 404)

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
        "coordinate": coordinate,
    }


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

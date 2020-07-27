import json
import logging

from flask import Flask, request

from activity_viewer.settings import AVSettings, make_default_settings
from activity_viewer.loaders import FileLoader
from .state import APIState

app = Flask(__name__)

state = APIState()


@app.route("/")
def hello():
    return "Hello, world!"


@app.route("/settings", methods=["GET", "POST"])
def settings():
    """Update or fetch settings in use."""
    if request.method == "POST":
        data = json.loads(request.data)

        if "filename" in data:
            try:
                state.settings = AVSettings.from_file(data["filename"])
                logging.warn(f"Settings file {data['filename']} was not found. Using default settings.")
            except:
                state.settings = make_default_settings()
    
    return state.settings.to_dict()

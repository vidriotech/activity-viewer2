from flask import Flask
from activity_viewer.settings import AVSettings

app = Flask(__name__)


@app.route("/")
def hello():
    settings = AVSettings()
    return settings.to_dict()


if __name__ == "__main__":
    app.run(host='127.0.0.1', port=5000)

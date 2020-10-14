import gevent
from gevent.pywsgi import WSGIServer
from gevent.subprocess import Popen
from pathlib import Path
import platform
import re
import shlex
import sys

from activity_viewer.api import app


def _get_gui_path():
    base_path = Path(__file__).parent.parent
    system = platform.system()

    build_dir = binary = path = None
    app_out = Path("app", "out")
    if system == "Windows":
        build_dir = "Activity Viewer-win32-x64"
        binary = "Activity Viewer.exe"
    elif system == "Darwin":
        build_dir = Path("Activity Viewer-darwin-x64", "Activity Viewer.app", "Contents", "MacOS")
        binary = "Activity Viewer"

    if build_dir and binary:
        if Path(base_path, build_dir).is_dir() and Path(base_path, build_dir, binary).is_file():
            path = Path(base_path, build_dir, binary)
        elif Path(base_path, app_out, build_dir).is_dir() and Path(base_path, app_out, build_dir, binary).is_file():
            path = Path(base_path, app_out, build_dir, binary)

    return path


def main():
    gui = _get_gui_path()
    if gui is not None:
        http_server = WSGIServer(("127.0.0.1", 3030), app)
        server_greenlet = gevent.spawn(http_server.serve_forever)

        gui = re.sub(r"\s+", r"\ ", str(gui).replace("\\", "\\\\"))
        gui_proc = Popen(shlex.split(gui))

        gevent.joinall([gui_proc])

        server_greenlet.kill()
    else:
        print("GUI application not found", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

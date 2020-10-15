import gevent
from gevent.pywsgi import WSGIServer
from gevent.subprocess import Popen
from pathlib import Path
import os
import platform
import re
import shlex
import sys

from activity_viewer.api import app


def run_mac(http_server):
    base_path = getattr(sys, "_MEIPASS", Path(__file__).parent.parent.resolve())
    os.chdir(base_path)

    gui = 'open -a "Activity Viewer"'
    try:
        Popen(shlex.split(gui))
    except Exception as e:
        print(f"Failed to launch: {e}", file=sys.stderr)
        sys.exit(1)

    http_server.serve_forever()


def run_win(http_server):
    base_path = Path(__file__).parent.parent
    if base_path.name == "pkgs":
        base_path = base_path.parent

    app_out = Path("app", "out")
    build_dir = "Activity Viewer-win32-x64"
    binary = "Activity Viewer.exe"

    path = None
    if build_dir and binary:
        if Path(base_path, build_dir).is_dir() and Path(base_path, build_dir, binary).is_file():
            path = Path(base_path, build_dir, binary)
        elif Path(base_path, app_out, build_dir).is_dir() and Path(base_path, app_out, build_dir, binary).is_file():
            path = Path(base_path, app_out, build_dir, binary)

    if path is None:
        print("GUI application not found", file=sys.stderr)
        sys.exit(1)

    server_greenlet = gevent.spawn(http_server.serve_forever)

    gui = re.sub(r"\s+", r"\ ", str(path).replace("\\", "\\\\"))
    gui_proc = Popen(shlex.split(gui))

    gevent.joinall([gui_proc])
    server_greenlet.kill()


def main():
    http_server = WSGIServer(("127.0.0.1", 3030), app)
    system = platform.system()

    if system == "Windows":
        run_win(http_server)
    elif system == "Darwin":
        run_mac(http_server)
    else:
        print(f"Unsupported platform: {system}.", file=sys.stderr)


if __name__ == "__main__":
    main()

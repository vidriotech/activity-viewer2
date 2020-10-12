import gevent
from gevent.pywsgi import WSGIServer
from gevent.subprocess import Popen
from pathlib import Path
import re
import shlex
import sys

from activity_viewer.api import app


def _get_gui_path():
    base_dir = Path(__file__).parent.parent
    gui_build_dir = "Activity Viewer-win32-x64"

    if Path(base_dir, gui_build_dir).is_dir():
        return Path(base_dir, gui_build_dir, "Activity Viewer.exe")
    elif Path(base_dir, "app", "out", gui_build_dir).is_dir():
        return Path(base_dir, "app", "out", gui_build_dir, "Activity Viewer.exe")


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

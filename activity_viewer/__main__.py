def run_app():
    from activity_viewer.api import app
    app.run(host="127.0.0.1", port=3030, debug=True)


if __name__ == "__main__":
    run_app()

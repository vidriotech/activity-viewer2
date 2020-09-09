# Changelog
All notable changes to this project will be documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- The `dataFiles` field in the settings file now takes a glob, or a list of
  file names, or a list of file names and globs.
- The settings file now takes an optional `epochs` field, allowing you to
  define experimental epochs. See the docs for details.
- The `viewerd` command is now deprecated. Use
  `viewer start-daemon [SETTINGS_FILE]` instead. `SETTINGS_FILE` is optional,
  and defaults either to `settings_json` in the current directory, or the
  global default settings file.
- There is a new `dataFiles` field in the settings file's `system` section.
  This replaces the need to specify files on the command line.
- The `dataDirectory` field in the settings file's `system` section is now
  `cacheDirectory`.
- There is now a `penetrations/all/timeseries` endpoint, which returns all
  timeseries ids for all penetrations.
- The `pcplane/<penetration_id>` endpoint is now at
  `/penetrations/<penetration_id>/slices/coronal/annotation`.
- The API server can now be run either via `viewerd` or
  `python -m activity_viewer`.
- Electron app now lives in the app/ folder.
- Zero or more file names can be passed as arguments to `viewer visualize`.
- Validate command is now invoked: `viewer validate FILENAME`, rather than
  `viewer validate -f FILENAME`. `FILENAME` is now a *required* argument.
- `blacklist`/`whitelist` fields in settings files are now `exclude`/`include`,
  respectively.

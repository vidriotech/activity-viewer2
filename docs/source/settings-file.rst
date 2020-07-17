.. _settings:

The settings file
-----------------

A JSON file allowing you to specify configuration options before running the
program. There are two main sections, namely:

- ``compartment``, containing fields related to the compartments shown or made
  available in the hierarchy by default. Those fields are:

  - ``maxDepth``: the maximum number of levels below the root node (i.e., the
    whole brain) in the compartment hierarchy to make available by default.
    The minimum value is 0 (so just the root node is available), and the
    maximum value is *whatever the maximum depth actually is* (**TODO**: find
    out and upate).
  - ``blacklist``: a list of compartments to manually exclude from the
    available compartment hierarchy. This also blacklists child compartments.
    **If this is defined, it takes precedence over** ``maxDepth``.
  - ``whitelist``: a list of compartments to manually *include* in the
    available compartment hierarchy. This will not whitelist child
    compartments or parent compartments. **If this is defined it takes
    precedence over** ``blacklist``.

- ``system``, containing fields related to the fetching and storage of data.
  Those fields are:

  - ``atlasVersion``: the version of the Allen Brain Atlas to use. Options are:

    - "CCFv3-2017" (October 2017) (the default value)
    - "CCFv3-2016" (October 2016)
    - "CCFv3-2015" (May 2015).
  - ``dataDirectory``: the directory where large data files are cached. If you
    don't specify a data directory, this defaults to
    ``$HOME/.activity-viewer/cache``.

.. code-block:: json

    {
        "compartment": {
            "maxDepth": 0,
            "blacklist": [],
            "whitelist": []
        },
        "system": {
            "atlasVersion": "CCFv3-2017",
            "dataDirectory": "/home/me/.activity-viewer/cache"
        }
    }

If you don't have a settings file in the current working directory, the
activity viewer will try to use ``$HOME/.activity-viewer/settings.json``. If
that file can't be found, it will be created and populated with default values.

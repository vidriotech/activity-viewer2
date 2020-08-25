The settings file
~~~~~~~~~~~~~~~~~

A JSON file allowing you to specify configuration options before running the
program. There are two main sections, namely:

- ``compartment``, containing fields related to the compartments shown or made
  available in the hierarchy by default. Those fields are:

  - ``maxDepth``: the maximum number of levels below the root node (i.e., the
    whole brain) in the compartment hierarchy to make available by default.
    The minimum value is 0 (so just the root node is available), and the
    maximum value is 10.
  - ``exclude``: a list of compartments to manually exclude from the
    available compartment hierarchy. This also excludes child compartments.
    **If this is defined, it takes precedence over** ``maxDepth``.
  - ``include``: a list of compartments to manually *include* in the
    available compartment hierarchy. This does not include child
    compartments or parent compartments. **If this is defined it takes
    precedence over** ``exclude``.

- ``system``, containing fields related to the fetching, storage, and display
  of data. Those fields are:

  - ``atlasVersion``: the version of the Allen Brain Atlas to use. Options are:

    - "ccf_2017" (October 2017) (the default value)
    - "ccf_2016" (October 2016)
    - "ccf_2015" (May 2015).
  - ``cacheDirectory``: the directory where large data files are cached. If you
    don't specify a cache directory, this defaults to a subdirectory of your
    system's user cache directory (a dot folder on a Unix-like OS, or
    C:\\Users\\me\\AppData\\Local on Windows).
  - ``dataFiles``: a list of :ref:`data files <input-data>` to visualize in the
    current session.
  - ``resolution``: the voxel resolution of the template and annotation volumes
    to use, in μm\ :sup:`3`. Options are:

    - 10 (results in very large data files)
    - 25
    - 50
    - 100 (much smaller data files).

If you don't have a settings file in the current working directory, the
activity viewer will try to use a default settings file, installed in a
system-dependent user config directory (a dot folder on a Unix-like OS, or
C:\\Users\\me\\AppData\\Local on Windows). If that file can't be found, it will be
created and populated with default values (see below).

The default settings file
+++++++++++++++++++++++++

Note that ``dataDirectory`` is system dependent and so is not defined here.

.. literalinclude:: ../../activity_viewer/settings/default_settings.json
   :language: json

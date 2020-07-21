The command-line interface
--------------------------

The Activity Viewer provides a command-line interface that can be invoked like so:

.. code-block:: shell

    $ viewer COMMAND [OPTIONS] [ARGS]

For example, to download and cache data from the Allen API, you would use

.. code-block:: shell

    $ viewer download
    

.. click:: activity_viewer.cli:cli
    :prog: viewer
    :show-nested:
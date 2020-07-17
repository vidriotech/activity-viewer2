The command-line interface
--------------------------

The Activity Viewer provides a command-line interface that can be invoked like so:

.. code-block:: shell

    $ viewer COMMAND [OPTIONS] [ARGS]

For example, to download and cache data from the Allen API, you would use

.. code-block:: shell

    $ viewer download

Commands
~~~~~~~~

The following commands are supported

download
++++++++

Downloads template and annotation data, as well as compartment .obj files, from
the Allen API and stores them in ``dataDirectory`` (as specified in your
:ref:`settings <settings_file>` file.

If you specify a non-default ``dataDirectory`` that doesn't contain any data,
the ``download`` command will not try to be smart and search the default
``dataDirectory``. Therefore the onus is on the user to specify the correct dataDirectory. If checksums are available from the Allen API, download these checksums and verify the data. It will try to be smart about determining whether or not the data is already downloaded into dataDirectory, and test that data against the checksums; if it looks ok, then prompt the user to confirm that he really wants to download the data again.
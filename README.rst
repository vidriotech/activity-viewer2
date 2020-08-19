Mesoscale Activity Viewer
=========================

This is the new and improved unit viewer for the Mesoscale Activity Project.

.. _install:

Installing
----------

This package is under development and does not have a fixed installation method
just yet. If you're adventurous, follow the instructions in
the next section to get started.

.. _install-develop:

Development
-----------

Prerequisites
~~~~~~~~~~~~~

We've tested this software on Python 3.7. It's conceivable it could work on an
earlier version of Python 3, but we won't support it. I strongly recommend
using `Anaconda <https://www.anaconda.com/>`__. Windows users will want to use
the Anaconda Prompt. Linux and Mac users should be able to get by with your
favorite terminal emulator.

We use `virtualenv <https://virtualenv.pypa.io/en/stable/>`_ to create a local
Python environment. If you're using Anaconda, ``conda install virtualenv``
should get it for you. If you don't like Anaconda, you can do
``python3 -m pip install --user virtualenv`` instead.

You'll also need to have `Node.js <https://nodejs.org/en/>`_ 12 or later with 
`Yarn <https://yarnpkg.com/>`_ installed. After installing Node,
``npm install -g yarn`` will get it for you.

Setting up
~~~~~~~~~~

Make sure your Python interpreter is the one you're expecting:

.. code-block:: shell

    > $ which python3 # where.exe python3 on Windows
    /home/alan/anaconda3/bin/python3

Once you've satisfied yourself that this is the correct Python, create and
activate a new virtual environment, then install dependencies:

.. code-block:: shell

    > $ python3 -m pip install --user virtualenv
    > $ python3 -m virtualenv venv
    > $ . venv/bin/activate # on Windows: .\venv\Scripts\activate
    (venv) > $ python3 -m pip install -U -r requirements.txt -r requirements-dev.txt
    (venv) > $ python3 -m pip install -e .
    (venv) > $ cd app && yarn install && cd .. # on Windows: cd app; yarn install; cd ..

After all the dependencies are installed, do a quick sanity check:

.. code-block:: shell

    (venv) > $ tox # or pytest if you prefer

Now you can start hacking.

Running the viewer
~~~~~~~~~~~~~~~~~~

Paths to the settings file and data files are made available to the
Electron process from the Python command ``viewer visualize ...`` by way of
environment variables. For development purposes, the main Electron process is
configured to source a ``.env`` file in the app/src/ directory so that the zombie
process issue (see below) can be circumvented. **Rather than running**
``viewer visualize ...``, **you should instead run** ``viewerd`` **in one terminal and**
``cd`` **into the app/ directory in another terminal and run** ``npm start``.

Here's what your ``.env`` file should look like:

.. code-block:: 

    AV_SETTINGS_PATH=/path/to/settings.json
    AV_DATA_PATH0=/path/to/data-file-1.npz
    AV_DATA_PATH1=/path/to/data-file-2.npz

You can specify additional data files with ``AV_DATA_PATH2``, ``AV_DATA_PATH3``, and
so forth.
**At this time it's not recommended to show more than one or two in one go unless you like long wait times.**

Current limitations and known issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Python 3.8
++++++++++

On Windows (we haven't tried on Linux or macOS), trying to install dependencies
via ``pip`` will throw something like the following error with Python 3.8 on
building the statsmodels wheel:

.. code-block:: python3

    ModuleNotFoundError: No module named 'numpy'

As a workaround, if you do

.. code-block:: shell

    (venv) > $ python3 -m pip install numpy==1.8.5
    (venv) > $ python3 -m pip install -U -r requirements.txt -r requirements-dev.txt

the dependencies should install correctly. You may also need to install the
latest `C++ Build Tools <https://visualstudio.microsoft.com/visual-cpp-build-tools/>`__.

Zombie process
++++++++++++++

Calling either ``viewerd`` or ``viewer visualize [FILENAME1 ...]`` (or
``npm start`` in the app/ directory) will spawn a Flask server which for now
needs to be manually cleaned up. This is a BUG that needs squashing.

If you make changes to any API routes that aren't reflected when you test them,
it's likely you've run afoul of this.

For right now, the best way to hack on this project is to use two separate
processes. In one terminal (with the virtualenv activated), run ``viewerd``,
like so:

.. code-block:: shell

    > $ viewerd
     * Serving Flask app "activity_viewer.api.routes" (lazy loading)
     * Environment: production
     WARNING: This is a development server. Do not use it in a production deployment.
     Use a production WSGI server instead.
     * Debug mode: on
     * Restarting with stat
     * Debugger is active!
     * Debugger PIN: 206-084-148
     * Running on http://127.0.0.1:3030/ (Press CTRL+C to quit)

In another terminal, ``cd`` to the app/ folder and run ``npm start``, like so,
expecting the following output:

.. code-block:: shell

    > $ npm start

    > app@1.0.0 start /path/to/activity-viewer2/app
    > electron-forge start

    √ Checking your system
    √ Locating Application
    √ Preparing native dependencies
    √ Compiling Main Process Code
    - Launch Dev ServersStarting type checking service...
    Using 1 worker with 2048MB memory limit
    √ Launch Dev Servers
    √ Compiling Preload Scripts
    √ Launching Application


    Webpack Output Available: http://localhost:9000


    statusCode: [object Object]
    Type checking in progress...
    webpack built ddc1507d1ec19a680ca7 in 3015ms
    No type errors found
    Version: typescript 3.9.7
    Time: 4380ms

Acknowledgments
---------------

Much of the UI code is based off of or otherwise inspired by work done previously by
Patrick Edson for the `Mouselight Neuron Browser <https://ml-neuronbrowser.janelia.org/>`__.

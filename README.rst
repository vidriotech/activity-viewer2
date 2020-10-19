Mesoscale Activity Viewer
=========================

This is the new and improved unit viewer for the Mesoscale Activity Project.

.. _install:

Installing
----------

For Windows users, head over to `Releases <https://github.com/vidriotech/activity-viewer2/releases>`_
and select the latest version for an installer. Simply extract the zip file and double click
"Activity_Viewer_0.1.0.exe".

**N.B.:** This release has not been signed. If this concerns you, you can use the installation method
in the Development section below.

Mac and Linux users, until we can build and distribute binaries, you should also use the Development instructions
below.

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
``npm install -g yarn`` will get Yarn for you.

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

    (venv) > $ pytest # or tox (slower, but sets up a self-contained environment) if you prefer

Now you can start hacking.

Running the viewer
~~~~~~~~~~~~~~~~~~

If you installed the binary on Windows, you should see an Activity Viewer entry in your Start menu.
Simply double-click that and the viewer will start up.

Otherwise, you'll need two terminals.
In the first terminal, activate your virtualenv and run ``viewerd start-daemon``.
In the second terminal, ``cd`` into the app/ directory and run ``yarn start``.
After a few moments, the frontend process will fully load.

On startup, the viewer prompts you to load a settings file or some data files, which you can do by
selecting the appropriate option from the File menu.
Selecting only data files will use the default settings, or you can specify data files within your settings file.

For a description of the formats of the settings and data files, please read
`this section <https://vidriotech.github.io/activity-viewer2/usage.html#input-files>`_ of the docs.

Current limitations and known issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Choppy camera motion when dev tools are engaged
+++++++++++++++++++++++++++++++++++++++++++++++

Moving the brain about in the viewer window may lag a bit when the dev tools
are being displayed. If you don't care about console output, simply close the
dev tools.

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


Acknowledgments
---------------

This work was supported by the Mesoscale Activity Project.
Parts of the UI code, especially the WebGL shaders, are based off of or otherwise inspired by work done previously by
Patrick Edson for the `Mouselight Neuron Browser <https://ml-neuronbrowser.janelia.org/>`__.

Mesoscale Activity Viewer
=========================

This is the new and improved unit viewer for the Mesoscale Activity Project.

.. _install:

Installing
----------

This package is under development and does not have a fixed installation method
just yet. If you're adventurous, follow the instructions in
:ref:`install-develop` to get started.

.. _install-develop:

Development
~~~~~~~~~~~

Prerequisites
+++++++++++++

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

Installing
++++++++++

Make sure your Python interpreter is the one you're expecting:

.. code-block:: shell

    > $ which python3 # where.exe python3 on Windows
    /home/alan/anaconda3/bin/python3

Once you've satisfied yourself that this is the correct Python, create and
activate a new virtual environment, then install dependencies:

.. code-block:: shell

    > $ python3 -m pip install --user virtualenv
    > $ python3 -m virtualenv venv
    > $ . venv/bin/activate # .\venv\Scripts\activate on Windows
    (venv) > $ python3 -m pip install -U -r requirements.txt -r requirements-dev.txt
    (venv) > $ python3 -m pip install -e .
    (venv) > $ yarn install

After all the dependencies are installed, do a quick sanity check:

.. code-block:: shell

    (venv) > $ tox # or pytest if you prefer

Now you can start hacking.

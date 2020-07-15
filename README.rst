Mesoscale Activity Viewer
=========================

This is the new and improved unit viewer for the Mesoscale Activity Project.

Developing
----------

After you clone this repository from GitHub, fire up your favorite terminal (I strongly recommend the Anaconda Prompt on
Windows).
Make sure your Python interpreter is the one you're expecting:

.. code-block:: shell

    > $ which python3 # where.exe python3 on Windows
    /home/alan/anaconda3/bin/python3

Once you've satisfied yourself that this is the correct Python, create and activate a new virtual environment, then
install dependencies:

.. code-block:: shell

    > $ python3 -m pip install --user virtualenv # ensure you have virtualenv installed
    > $ python3 -m virtualenv venv
    > $ . venv/bin/activate # .\venv\Scripts\activate on Windows
    (venv) > $ python3 -m pip install -U -r requirements.txt -r requirements-dev.txt

After all the dependencies are installed, do a quick sanity check:

.. code-block:: shell

    (venv) > $ tox # or pytest if you prefer

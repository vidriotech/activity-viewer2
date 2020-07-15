import os.path as op

import setuptools

readme = op.join(op.abspath(op.dirname(__file__)), "README.rst")
with open(readme, "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="activity_viewer2",
    version="0.1.0",
    packages=setuptools.find_packages(),
    url="https://github.com/vidriotech/activity-viewer2",
    license="MIT",
    author="Alan Liddell",
    author_email="alan@vidriotech.com",
    description="A utility for visualizing ephys unit activity.",
    long_description=long_description,
    long_description_content_type="text/x-rst",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)

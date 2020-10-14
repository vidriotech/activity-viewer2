import os.path as op
import setuptools

readme = op.join(op.abspath(op.dirname(__file__)), "README.rst")
with open(readme, "r") as fh:
    long_description = fh.read()


setuptools.setup(
    name="mesoscale_activity_viewer",
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
    entry_points={
        "console_scripts": [
            "viewerd=activity_viewer.__main__:main",
            "viewer=activity_viewer.app:main"
        ]
    },
    python_requires=">=3.7, <4",
    install_requires=[
        "appdirs==1.4.4",
        "allensdk==2.2.0",
        "click==7.1.2",
        "Flask==1.1.2",
        "Flask-Cors==3.0.9",
        "gevent==20.9.0",
        "importlib-metadata==1.7.0",
        "matplotlib==3.2.2",
        "numpy==1.18.5",
        "Pillow==7.2.0",
        "requests==2.24.0",
    ]
)

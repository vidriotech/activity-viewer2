import json

from allensdk.api.queries.ontologies_api import OntologiesApi
from allensdk.core.structure_tree import StructureTree
from allensdk.api.queries.reference_space_api import ReferenceSpaceApi
import requests

from activity_viewer.base import type_check
from activity_viewer.settings import AVSettings


class Downloader:
    """Downloads data from the Allen API.

    Parameters
    ==========
    settings : AVSettings
    """
    def __init__(self, settings: AVSettings):
        self._settings = None
        self._ontologies_api = OntologiesApi()
        self._reference_space_api = ReferenceSpaceApi()

        self.settings = settings

    def annotation_volume_exists(self) -> bool:
        """Return true if and only if annotation volume is already cached on disk."""
        return self.annotation_volume_path.is_file()

    def download_annotation_volume(self, force: bool = False):
        """Download and cache annotation volume."""
        if self.annotation_volume_exists() and not force:
            return

        file_path = self.annotation_volume_path
        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist

        ccf_version = "annotation/" + self.settings.system.atlas_version
        self._reference_space_api.download_annotation_volume(ccf_version, self.settings.system.resolution, file_path)

    def download_structure_mesh(self, structure_id: int, force: bool = False):
        """Download WaveFront mesh file for the compartment with ID `structure_id`."""
        if self.structure_mesh_exists(structure_id) and not force:
            return

        file_path = self.structure_mesh_path(structure_id)
        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist

        ccf_version = "annotation/" + self.settings.system.atlas_version
        self._reference_space_api.download_structure_mesh(structure_id, ccf_version, file_path)

    def download_structure_centers(self, force: bool = False):
        """Download a CSV of structure centers and save it to cache."""
        if self.structure_centers_exists() and not force:
            return

        file_path = self.structure_centers_path

        ccf_version = self.settings.system.atlas_version
        api_path = "http://download.alleninstitute.org/informatics-archive/current-release/mouse_ccf/annotation/"\
                   f"{ccf_version}/structure_centers.csv"

        res = requests.get(api_path)
        if not res.ok:
            return

        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist
        with open(file_path, "w") as fh:
            fh.write(res.content.decode())

    def download_structure_graph(self, force: bool = False):
        """Download the structure graph file and save it to cache."""
        if self.structure_graph_exists() and not force:
            return

        file_path = self.structure_graph_path
        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist

        structure_graph = self._ontologies_api.get_structures_with_sets([1])  # ID of adult mouse structure graph is 1
        structure_graph = StructureTree.clean_structures(structure_graph)

        with open(file_path, "w") as fh:
            json.dump(structure_graph, fh)

    def download_template_volume(self, force: bool = False):
        """Download and cache template volume."""
        if self.template_volume_exists() and not force:
            return

        file_path = self.template_volume_path
        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist

        ccf_version = "annotation/" + self.settings.system.atlas_version
        self._reference_space_api.download_template_volume(self.settings.system.resolution, file_path)

    def structure_centers_exists(self) -> bool:
        """Return true if and only if the CSV structure centers file exists."""
        return self.structure_centers_path.is_file()

    def structure_graph_exists(self) -> bool:
        """Return true if and only if the JSON structure graph file exists."""
        return self.structure_graph_path.is_file()

    def structure_mesh_path(self, structure_id: int):
        """Return path for the mesh file for structure `structure_id`."""
        return self.settings.versioned_data_directory / f"{structure_id}.obj"

    def structure_mesh_exists(self, structure_id: int) -> bool:
        """Return true if and only if the mesh file for structure `structure_id` exists."""
        return self.structure_mesh_path(structure_id).is_file()

    def template_volume_exists(self) -> bool:
        """Return true if and only if template volume is already cached on disk."""
        return self.template_volume_path.is_file()

    @property
    def annotation_volume_path(self):
        """Path to a binary file containing the annotation volume."""
        return self.settings.versioned_data_directory / f"annotation_{self.settings.system.resolution}.bin"

    @property
    def settings(self) -> AVSettings:
        """Settings object."""
        return self._settings

    @settings.setter
    def settings(self, val: AVSettings):
        type_check(val, AVSettings)
        self._settings = val

    @property
    def structure_centers_path(self):
        """Path to a CSV file with a list of structure centers."""
        return self.settings.versioned_data_directory / "structure_centers.csv"

    @property
    def structure_graph_path(self):
        """Path to a JSON file containing the structure graph."""
        return self.settings.versioned_data_directory / "structure_graph.json"

    @property
    def template_volume_path(self):
        """Path to a binary file containing the template volume."""
        return self.settings.versioned_data_directory / f"template_{self.settings.system.resolution}.bin"

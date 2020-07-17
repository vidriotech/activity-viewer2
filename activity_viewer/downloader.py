import json

from allensdk.api.queries.mouse_connectivity_api import MouseConnectivityApi
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

    def download_structure_mesh(self, structure_id: int, force: bool = False):
        """Download WaveFront mesh file for the compartment with ID `structure_id`."""
        file_path = self.settings.versioned_data_directory / f"{structure_id}.obj"
        if file_path.is_file() and not force:
            return

        ccf_version = "annotation/" + self.settings.system.atlas_version
        self._reference_space_api.download_structure_mesh(structure_id, ccf_version, file_path)

    def download_structure_centers(self, force: bool = False):
        """Download a CSV of structure centers and save it to cache."""
        file_path = self.settings.structure_centers_path
        if file_path.is_file() and not force:
            return

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
        file_path = self.settings.structure_graph_path
        if file_path.is_file() and not force:
            return

        # 1 is the ID of the adult mouse structure graph
        structure_graph = self._ontologies_api.get_structures_with_sets([1])
        structure_graph = StructureTree.clean_structures(structure_graph)

        file_path.parent.mkdir(parents=True, exist_ok=True)  # create parent directory if it doesn't exist

        with open(file_path, "w") as fh:
            json.dump(structure_graph, fh)

    @property
    def settings(self) -> AVSettings:
        """Settings object."""
        return self._settings

    @settings.setter
    def settings(self, val: AVSettings):
        type_check(val, AVSettings)
        self._settings = val

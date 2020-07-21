from collections import deque
import json

from allensdk.api.queries.ontologies_api import OntologiesApi
from allensdk.core.structure_tree import StructureTree

from activity_viewer.base import type_check
from activity_viewer.cache import Cache
from .avsettings import AVSettings


class SettingsValidator:
    """A class for validating AVSettings objects.

    Parameters
    ----------
    settings : AVSettings
        Settings object to validate.
    """
    def __init__(self, settings: AVSettings):
        self._settings = None

        self.settings = settings
        self._cache = Cache(self.settings)
        self._structure_tree = None
        self._tree_height = -1

    def _load_structure_tree(self):
        """Load the structure tree from cache, or download if necessary."""
        if self._structure_tree is not None:
            return

        # download but don't cache the structure tree
        if self._cache.structure_graph_exists():
            structure_graph = self._cache.load_structure_graph(recache_on_error=False)
        else:
            structure_graph = self._cache.download_structure_graph()
        
        self._structure_tree = StructureTree(structure_graph)

    def _compute_tree_height(self):
        self._load_structure_tree()
        
        root = self._structure_tree.get_structures_by_id([997])
        root[0]["depth"] = 0
        queue = deque(root)

        max_depth = 0
        while len(queue) > 0:
            node = queue.popleft()
            children = self._structure_tree.children([node["id"]])[0]

            for child in children:
                child["depth"] = node["depth"] + 1
                max_depth = max(max_depth, child["depth"])
            queue.extend(children)

        self._tree_height = max_depth

    def validate(self) -> (bool, dict):
        """Validate settings object.
        
        Returns
        -------
        is_valid : bool
            True if and only if settings are valid.
        messages : dict
            Error messages and warnings.
        """
        is_valid = True
        messages = {"errors": [], "warnings": []}
        self._compute_tree_height()

        ## validate compartment section
        compartment = self.settings.compartment

        # max depth
        if compartment.max_depth < 0:
            messages["errors"].append("Max depth cannot be negative.")
            is_valid = False

        if compartment.max_depth > self._tree_height:
            messages["errors"].append(f"Max depth cannot exceed {self._tree_height}.")

        # acronym -> id map
        ac_id_map = {k.lower(): v for k, v in self._structure_tree.get_id_acronym_map().items()}
        id_ac_map = {v: k for k, v in ac_id_map.items()}
        # name -> id map
        nm_id_map = {v.lower(): k for k, v in self._structure_tree.get_name_map().items()}
        id_nm_map = {v: k for k, v in nm_id_map.items()}

        # check whitelist first
        whitelist_ids = set()
        for val in compartment.whitelist:
            if isinstance(val, str):
                val_lower = val.lower()

                if val_lower in ac_id_map:
                    cid = ac_id_map[val_lower]
                elif val_lower in nm_id_map:
                    cid = nm_id_map[val_lower]
                else:
                    messages["errors"].append(f"Unrecognized compartment in whitelist: '{val}'.'")
                    is_valid = False
                    continue
            elif isinstance(val, int):
                if val not in ac_id_map.values():
                    messages["errors"].append(f"Unrecognized compartment ID in whitelist: {val}")
                    is_valid = False
                    continue

                cid = val
            else:
                messages["errors"].append(f"Invalid compartment in whitelist: '{val}'.")
                is_valid = False
                continue

            # duplicate entry
            if cid in whitelist_ids:
                ac = id_ac_map[cid]
                nm = id_nm_map[cid]
                messages["warnings"].append(f"Duplicate compartment with id {cid}, name '{nm}', or acronym '{ac}', found in whitelist.")

            whitelist_ids.add(cid)

        # now check blacklist
        blacklist_ids = set()
        for val in compartment.blacklist:
            if isinstance(val, str):
                val_lower = val.lower()

                if val_lower in ac_id_map:
                    cid = ac_id_map[val_lower]
                elif val_lower in nm_id_map:
                    cid = nm_id_map[val_lower]
                else:
                    messages["errors"].append(f"Unrecognized compartment in blacklist: '{val}'.'")
                    is_valid = False
                    continue
            elif isinstance(val, int):
                if val not in ac_id_map.values():
                    messages["errors"].append(f"Unrecognized compartment ID in blacklist: {val}")
                    is_valid = False
                    continue

                cid = val
            else:
                messages["errors"].append(f"Invalid compartment in blacklist: '{val}'.")
                is_valid = False
                continue

            # entry found in whitelist
            if cid in whitelist_ids:
                ac = id_ac_map[cid]
                nm = id_nm_map[cid]
                messages["warnings"].append(f"Whitelisted compartment with id {cid}, name '{nm}', or acronym '{ac}', found in blacklist. Blacklist entry will be ignored")

            # duplicate entry
            if cid in blacklist_ids:
                ac = id_ac_map[cid]
                nm = id_nm_map[cid]
                messages["warnings"].append(f"Duplicate compartment with id {cid}, name '{nm}', or acronym '{ac}', found in blacklist.")

            blacklist_ids.add(cid)

        ## validate system section
        system = self.settings.system

        # atlas version
        if system.atlas_version not in ("ccf_2015", "ccf_2016", "ccf_2017"):
            messages["errors"].append(f"Unrecognized atlas version: '{system.atlas_version}'.")
            is_valid = False
        
        # data directory
        if not system.data_directory.is_dir():
            messages["warnings"].append(f"Data directory '{system.data_directory}' does not exist or is not a directory.")

        if system.resolution not in (10, 25, 50, 100):
            messages["errors"].append(f"Unrecognized voxel resolution: {system.resolution}.")
            is_valid = False
    
        return is_valid, messages

    @property
    def settings(self) -> AVSettings:
        """Settings object."""
        return self._settings

    @settings.setter
    def settings(self, val: AVSettings):
        type_check(val, AVSettings)
        self._settings = val

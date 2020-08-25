from collections import deque
import json
from pathlib import Path
from typing import Union

from allensdk.api.queries.ontologies_api import OntologiesApi
from allensdk.core.structure_tree import StructureTree

from activity_viewer.base import type_check
from activity_viewer.cache import Cache
from .avsettings import AVSettings
from .sections import Compartment, System

PathType = Union[str, Path]


class SettingsValidator:
    """A class for validating settings files.

    Parameters
    ----------
    filename : str or Path
        Path to settings file to validate.
    """
    def __init__(self, filename: PathType):
        with open(filename, "r") as fh:
            settings = json.load(fh)

        self._compartment = settings["compartment"] if "compartment" in settings else {}
        self._system = settings["system"] if "system" in settings else {}

        # construct temporary cache for loading structure tree
        # data directory and CCF version are relevant, so use what's given
        cache_system_section = System()
        if "cacheDirectory" in self._system:
            try:
                cache_system_section.cache_directory = self._system["cacheDirectory"]
            except (TypeError, ValueError):
                pass
        if "atlasVersion" in self._system:
            try:
                cache_system_section.atlas_version = self._system["atlasVersion"]
            except (TypeError, ValueError):
                pass

        self._cache = Cache(AVSettings(None, system=cache_system_section))
        self._structure_tree = None
        self._tree_height = -1

    def _load_structure_tree(self):
        """Load the structure tree from cache, or download if necessary."""
        if self._structure_tree is not None:  # pragma: no cover
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

    def _validate_compartment(self, messages: dict) -> (bool, dict):
        """Validate compartment section of a settings file."""
        self._compute_tree_height()
        is_valid = True

        n_errors = len(messages["errors"])  # check this later to determine validity

        # collect standard keys
        max_depth = self._compartment["maxDepth"] if "maxDepth" in self._compartment else Compartment.DEFAULTS["max_depth"]
        exclude = self._compartment["exclude"] if "exclude" in self._compartment else Compartment.DEFAULTS["exclude"]
        include = self._compartment["include"] if "include" in self._compartment else Compartment.DEFAULTS["include"]

        # flag additional keys
        for k in self._compartment:
            if k not in ("maxDepth", "include", "exclude"):
                messages["errors"].append(f"Unrecognized field '{k}' in compartment section.")

        # validate maxDepth
        if not isinstance(max_depth, int):
            messages["errors"].append("maxDepth must be an integer.")

        if isinstance(max_depth, (int, float)):
            if max_depth < 0:
                messages["errors"].append("maxDepth cannot be negative.")

            if max_depth > self._tree_height:
                messages["errors"].append(f"maxDepth cannot exceed {self._tree_height}.")

        # acronym -> id map
        ac_id_map = {k.lower(): v for k, v in self._structure_tree.get_id_acronym_map().items()}
        id_ac_map = {v: k for k, v in ac_id_map.items()}
        # name -> id map
        nm_id_map = {v.lower(): k for k, v in self._structure_tree.get_name_map().items()}
        id_nm_map = {v: k for k, v in nm_id_map.items()}

        # check include first
        if isinstance(include, list):
            include_ids = set()
            for val in include:
                if isinstance(val, str):
                    val_lower = val.lower()

                    if val_lower in ac_id_map:
                        cid = ac_id_map[val_lower]
                    elif val_lower in nm_id_map:
                        cid = nm_id_map[val_lower]
                    else:
                        messages["errors"].append(f"Unrecognized compartment in include: '{val}'.")
                        continue
                elif isinstance(val, int):
                    if val not in ac_id_map.values():
                        messages["errors"].append(f"Unrecognized compartment ID in include: {val}")
                        continue

                    cid = val
                else:
                    messages["errors"].append(f"Invalid compartment in include: '{val}'.")
                    continue

                # duplicate entry
                if cid in include_ids:
                    ac = id_ac_map[cid]
                    nm = id_nm_map[cid]
                    messages["warnings"].append(f"Duplicate compartment with id {cid}, name '{nm}', or acronym '{ac}', found in include.")

                include_ids.add(cid)
        else:
            messages["errors"].append("include must be a list.")

        # now check exclude
        if isinstance(exclude, list):
            exclude_ids = set()
            for val in exclude:
                if isinstance(val, str):
                    val_lower = val.lower()

                    if val_lower in ac_id_map:
                        cid = ac_id_map[val_lower]
                    elif val_lower in nm_id_map:
                        cid = nm_id_map[val_lower]
                    else:
                        messages["errors"].append(f"Unrecognized compartment in exclude: '{val}'.")
                        continue
                elif isinstance(val, int):
                    if val not in ac_id_map.values():
                        messages["errors"].append(f"Unrecognized compartment ID in exclude: {val}")
                        continue

                    cid = val
                else:
                    messages["errors"].append(f"Invalid compartment in exclude: '{val}'.")
                    continue

                # entry found in include
                if cid in include_ids:
                    ac = id_ac_map[cid]
                    nm = id_nm_map[cid]
                    messages["warnings"].append(f"Included compartment with id {cid}, name '{nm}', or acronym '{ac}', found in exclude, exclude entry will be ignored.")

                # duplicate entry
                if cid in exclude_ids:
                    ac = id_ac_map[cid]
                    nm = id_nm_map[cid]
                    messages["warnings"].append(f"Duplicate compartment with id {cid}, name '{nm}', or acronym '{ac}', found in exclude.")

                exclude_ids.add(cid)
        else:
            messages["errors"].append("exclude must be a list.")

        if len(messages["errors"]) > n_errors:
            is_valid = False

        return is_valid, messages

    def _validate_system(self, messages: dict) -> (bool, dict):
        """Validate system section."""
        is_valid = True

        n_errors = len(messages["errors"])  # check this later to determine validity

        # collect standard keys
        atlas_version = self._system["atlasVersion"] if "atlasVersion" in self._system else System.DEFAULTS["atlas_version"]
        cache_directory = self._system["cacheDirectory"] if "cacheDirectory" in self._system else System.DEFAULTS["cache_directory"]
        resolution = self._system["resolution"] if "resolution" in self._system else System.DEFAULTS["resolution"]

        # flag additional keys
        for k in self._system:
            if k not in ("atlasVersion", "cacheDirectory", "resolution"):
                messages["errors"].append(f"Unrecognized field '{k}' in system section.")

        # atlas version
        if atlas_version not in ("ccf_2015", "ccf_2016", "ccf_2017"):
            messages["errors"].append(f"Unrecognized atlasVersion: '{atlas_version}'.")
        
        # data directory
        if not Path(cache_directory).is_dir():
            messages["warnings"].append(f"cacheDirectory '{cache_directory}' does not exist or is not a directory.")

        # resolution
        if resolution not in (10, 25, 50, 100):
            messages["errors"].append(f"Unrecognized voxel resolution: {resolution}.")

        if len(messages["errors"]) > n_errors:
            is_valid = False

        return is_valid, messages

    def validate(self) -> (bool, dict):
        """Validate settings object.
        
        Returns
        -------
        is_valid : bool
            True if and only if all settings are valid.
        messages : dict
            Error messages and warnings.
        """
        compartment_is_valid, messages = self._validate_compartment({"errors": [], "warnings": []})
        system_is_valid, messages = self._validate_system(messages)
        is_valid = compartment_is_valid and system_is_valid
    
        return is_valid, messages

from typing import Optional

import numpy as np
import matplotlib.pyplot as plt


def colormap(cmap: str) -> Optional[np.ndarray]:
    """Given a color map identifier `map_name`,
    return a 256-value lookup table.

    Parameters
    ----------
    cmap : str
        Color map identifier.

    Returns
    -------

    """
    try:
        color_map = plt.get_cmap(cmap)
    except ValueError:  # color map not found
        return

    return np.concatenate([color_map(i)[:3] for i in range(256)])

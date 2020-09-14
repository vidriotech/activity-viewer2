import base64
from io import BytesIO
from typing import Optional

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image


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


def slice_to_data_uri(slice_data: np.ndarray):
    img = Image.fromarray(slice_data)

    # convert image to PNG
    img_io = BytesIO()
    img.save(img_io, format="PNG")

    # base64-encode PNG
    img_b64 = base64.b64encode(img_io.getvalue())

    return "data:image/png;base64," + img_b64.decode()

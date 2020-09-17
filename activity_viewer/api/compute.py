import base64
from io import BytesIO

import numpy as np
from PIL import Image


def slice_to_data_uri(slice_data: np.ndarray, annotation: np.ndarray, rotate: int) -> str:
    """Convert an RGB or grayscale array to a PNG data URI.

    Parameters
    ----------
    slice_data: ndarray
        RGB or grayscale data array.
    annotation: ndarray
        Annotation values for each pixel in the slice.
    rotate: int
        Number of times to rotate the image 90 degrees (once for sagittal, none for coronal).

    Returns
    -------
    data_uri: str
        Base64-encoded PNG image with transparency.
    """
    if rotate != 0:
        slice_data = np.rot90(slice_data, rotate)
        annotation = np.rot90(annotation, rotate)

    alpha_channel = (255 * (annotation != 0)).astype(np.uint8)
    slice_alpha = np.concatenate(
        (slice_data, alpha_channel[:, :, np.newaxis]),
        axis=2
    )

    if slice_alpha.shape[2] == 4:
        mode = "RGBA"
    else:
        mode = "LA"

    img = Image.fromarray(slice_alpha, mode=mode)

    # convert image to PNG
    img_io = BytesIO()
    img.save(img_io, format="PNG")

    # base64-encode PNG
    img_b64 = base64.b64encode(img_io.getvalue())

    return "data:image/png;base64," + img_b64.decode()


def summarize_timeseries(data: np.ndarray) -> dict:
    """Compute min/max time, min/max values, and stride of timeseries.

    Parameters
    ----------
    data: ndarray
        Array of times and values for the timeseries.

    Returns
    -------
    summary: dict
        Contains the following entries:
            - data: the data itself, as a list
            - stride: the stride of the data
            - minTime: the minimum time value (time is assumed sorted)
            - maxTime: the maximum time value
            - minStep: the minimum difference between adjacent time steps
            - minVal: the minimum timeseries value over all points
            - maxVal: the maximum timeseries value over all points
    """
    times = data[0, :]
    values = data[1:, :]

    return {
        "times": times.ravel().tolist(),
        "values": values.ravel().tolist(),
        "stride": times.size,
        "minTime": times[0],
        "maxTime": times[-1],
        "minStep": np.min(np.diff(times)),
        "minVal": np.min(values),
        "maxVal": np.max(values),
    }

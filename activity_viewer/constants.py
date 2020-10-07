import enum

AP_MAX = 13200  # maximum x value
DV_MAX = 8000  # maximum y value
LR_MAX = 11400  # maximum z value


class SliceType(enum.Enum):
    CORONAL = 0
    SAGITTAL = 1
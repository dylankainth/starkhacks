"""Gesture enum and helper constants."""

from enum import Enum


class Gesture(str, Enum):
    """All recognized gesture types from the iPhone/webcam input."""
    NONE = "none"
    POINT = "point"
    PINCH = "pinch"
    OPEN_PALM = "open_palm"
    FIST = "fist"
    SWIPE_LEFT = "swipe_left"
    SWIPE_RIGHT = "swipe_right"
    SWIPE_UP = "swipe_up"
    SWIPE_DOWN = "swipe_down"


# How long (seconds) before a gesture is considered stale
GESTURE_EXPIRY_S = 0.200

# How long (seconds) without a heartbeat before we consider the sender disconnected
HEARTBEAT_TIMEOUT_S = 3.0

# Default empty gesture state
EMPTY_GESTURE: dict = {"gesture": Gesture.NONE.value}

# Default empty velocity state
EMPTY_VELOCITY: dict = {"vx": 0.0, "vy": 0.0, "vz": 0.0}

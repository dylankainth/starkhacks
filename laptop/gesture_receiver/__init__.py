"""gesture_receiver -- UDP gesture event receiver for the hologram display."""

from .gestures import Gesture, GESTURE_EXPIRY_S, HEARTBEAT_TIMEOUT_S
from .receiver import GestureReceiver

try:
    from .bonjour import BonjourAdvertiser
except ImportError:
    BonjourAdvertiser = None  # type: ignore[assignment,misc]

__all__ = [
    "Gesture",
    "GestureReceiver",
    "BonjourAdvertiser",
    "GESTURE_EXPIRY_S",
    "HEARTBEAT_TIMEOUT_S",
]

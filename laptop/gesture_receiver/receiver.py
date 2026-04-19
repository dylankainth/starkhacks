"""UDP receiver for JSON gesture events from iPhone / webcam gesture recognizer."""

import json
import socket
import threading
import time
from typing import Optional

from .gestures import (
    EMPTY_GESTURE,
    EMPTY_VELOCITY,
    GESTURE_EXPIRY_S,
    HEARTBEAT_TIMEOUT_S,
)


class GestureReceiver:
    """Listens for UDP gesture packets from iPhone and provides latest gesture state.

    Packets are JSON-encoded dicts sent over UDP. Expected fields:

        {
            "type": "gesture" | "velocity" | "heartbeat",
            "gesture": "pinch",          # for type=gesture
            "hand": "right",
            "palm": {"x": 0.5, "y": 0.3, "z": 1.2},
            "fingers": { ... },          # optional per-finger data
            "confidence": 0.95,
            "timestamp": 1713400000.123,
            "vx": 0.0, "vy": 0.0, "vz": 0.0  # for type=velocity
        }

    Thread-safe: all public methods may be called from any thread.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 9001, buf_size: int = 4096) -> None:
        self._host = host
        self._port = port
        self._buf_size = buf_size

        self._sock: Optional[socket.socket] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False

        # Shared state protected by lock
        self._lock = threading.Lock()
        self._latest_gesture: dict = dict(EMPTY_GESTURE)
        self._latest_velocity: dict = dict(EMPTY_VELOCITY)
        self._gesture_time: float = 0.0
        self._velocity_time: float = 0.0
        self._last_heartbeat: float = 0.0
        self._packet_count: int = 0

    # ── lifecycle ──────────────────────────────────────────────────────────

    def start(self) -> None:
        """Start listening for gesture packets in a background thread."""
        if self._running:
            return

        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((self._host, self._port))
        # Short timeout so the thread can check _running flag periodically
        self._sock.settimeout(0.5)

        self._running = True
        self._thread = threading.Thread(target=self._listen_loop, daemon=True, name="gesture-rx")
        self._thread.start()
        print(f"[gesture_receiver] listening on {self._host}:{self._port}")

    def stop(self) -> None:
        """Stop the listener thread and close the socket."""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        if self._sock is not None:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None
        print("[gesture_receiver] stopped")

    # ── public API ─────────────────────────────────────────────────────────

    def get_gesture(self) -> dict:
        """Return the latest gesture event, or ``{"gesture": "none"}`` if stale/absent.

        Thread-safe.
        """
        with self._lock:
            age = time.monotonic() - self._gesture_time
            if age > GESTURE_EXPIRY_S:
                return dict(EMPTY_GESTURE)
            return dict(self._latest_gesture)

    def get_velocity(self) -> dict:
        """Return the latest velocity event for swipe detection.

        Thread-safe.
        """
        with self._lock:
            age = time.monotonic() - self._velocity_time
            if age > GESTURE_EXPIRY_S:
                return dict(EMPTY_VELOCITY)
            return dict(self._latest_velocity)

    @property
    def connected(self) -> bool:
        """``True`` if a heartbeat (or any packet) was received in the last 3 seconds."""
        with self._lock:
            return (time.monotonic() - self._last_heartbeat) < HEARTBEAT_TIMEOUT_S

    @property
    def packet_count(self) -> int:
        """Total number of valid packets received since start."""
        with self._lock:
            return self._packet_count

    # ── internals ──────────────────────────────────────────────────────────

    def _listen_loop(self) -> None:
        """Background thread: receive UDP packets and decode JSON."""
        while self._running:
            try:
                data, addr = self._sock.recvfrom(self._buf_size)  # type: ignore[union-attr]
            except socket.timeout:
                continue
            except OSError:
                # Socket closed while waiting
                if not self._running:
                    break
                raise

            try:
                packet = json.loads(data.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                print(f"[gesture_receiver] bad packet from {addr}: {exc}")
                continue

            self._handle_packet(packet)

    def _handle_packet(self, packet: dict) -> None:
        """Dispatch a decoded packet to the appropriate state slot."""
        now = time.monotonic()
        pkt_type = packet.get("type", "gesture")

        with self._lock:
            self._last_heartbeat = now
            self._packet_count += 1

            if pkt_type == "heartbeat":
                # Nothing else to store -- just the timestamp bump above
                pass
            elif pkt_type == "velocity":
                self._latest_velocity = {
                    "vx": float(packet.get("vx", 0.0)),
                    "vy": float(packet.get("vy", 0.0)),
                    "vz": float(packet.get("vz", 0.0)),
                }
                self._velocity_time = now
            else:
                # Default: treat as gesture
                self._latest_gesture = packet
                self._gesture_time = now

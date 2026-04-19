"""Standalone test harness for the gesture receiver.

Run with:
    python -m gesture_receiver.test_receiver

This starts the UDP receiver and Bonjour advertiser, then prints every
gesture as it arrives.  Press Ctrl+C to stop.

You can also send test packets from another terminal:

    echo '{"type":"gesture","gesture":"pinch","hand":"right","palm":{"x":0.5,"y":0.3,"z":1.2},"confidence":0.9}' \\
        | nc -u -w0 127.0.0.1 9001

    echo '{"type":"velocity","vx":1.2,"vy":0.0,"vz":-0.3}' \\
        | nc -u -w0 127.0.0.1 9001

    echo '{"type":"heartbeat"}' | nc -u -w0 127.0.0.1 9001
"""

import signal
import sys
import time

from .receiver import GestureReceiver
from .gestures import Gesture

try:
    from .bonjour import BonjourAdvertiser
except ImportError:
    BonjourAdvertiser = None  # type: ignore[assignment,misc]

POLL_INTERVAL = 0.05  # 20 Hz polling


def main() -> None:
    receiver = GestureReceiver(port=9001)
    advertiser = BonjourAdvertiser(port=9001) if BonjourAdvertiser is not None else None

    quit_flag = False

    def _on_signal(signum: int, frame: object) -> None:
        nonlocal quit_flag
        quit_flag = True
        print("\n[test] shutting down...")

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    if advertiser is not None:
        try:
            advertiser.start()
        except Exception as exc:
            print(f"[test] WARNING: Bonjour advertisement failed ({exc}). Continuing without it.")
    else:
        print("[test] WARNING: zeroconf not installed -- Bonjour advertisement disabled.")

    receiver.start()

    print("[test] waiting for gestures (Ctrl+C to quit)...")
    print("-" * 60)

    last_gesture_str = ""
    last_connected = False

    while not quit_flag:
        gesture = receiver.get_gesture()
        velocity = receiver.get_velocity()
        is_connected = receiver.connected
        pkts = receiver.packet_count

        # Only print when something changes
        gesture_str = gesture.get("gesture", Gesture.NONE.value)

        if is_connected != last_connected:
            status = "CONNECTED" if is_connected else "DISCONNECTED"
            print(f"[test] status: {status}  (packets: {pkts})")
            last_connected = is_connected

        if gesture_str != last_gesture_str:
            if gesture_str != Gesture.NONE.value:
                hand = gesture.get("hand", "?")
                conf = gesture.get("confidence", 0.0)
                palm = gesture.get("palm", {})
                palm_str = f"({palm.get('x', 0):.2f}, {palm.get('y', 0):.2f}, {palm.get('z', 0):.2f})" if palm else "n/a"
                print(f"  gesture={gesture_str:<14} hand={hand:<6} palm={palm_str}  conf={conf:.2f}")
            else:
                print(f"  gesture=none  (expired or idle)")
            last_gesture_str = gesture_str

        # Print velocity if non-zero
        vx, vy, vz = velocity.get("vx", 0), velocity.get("vy", 0), velocity.get("vz", 0)
        if abs(vx) > 0.01 or abs(vy) > 0.01 or abs(vz) > 0.01:
            print(f"  velocity=({vx:.2f}, {vy:.2f}, {vz:.2f})")

        time.sleep(POLL_INTERVAL)

    # Cleanup
    receiver.stop()
    if advertiser is not None:
        try:
            advertiser.stop()
        except Exception:
            pass

    print("[test] done.")


if __name__ == "__main__":
    main()

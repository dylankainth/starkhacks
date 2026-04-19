"""
Holographic Display -- Quad-View Renderer

Usage:
    python -m hologram.main [--scene solar|connect4] [--port 9001] [--no-gesture]
    python -m hologram.main --scene solar --no-gesture     # keyboard only
    python -m hologram.main --scene connect4 --no-gesture  # keyboard only

Keyboard controls (when --no-gesture or as fallback):
    Arrow keys / WASD ... rotate camera
    +/-  ................ zoom in / out
    Space ............... reset camera (solar) / drop piece (connect4)
    R ................... reset (connect4)
    Q / Escape .......... quit
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from hologram.quad_renderer import QuadRenderer
from hologram.scene import SolarSystemScene, Connect4Scene


def _try_import_gesture(port: int):
    """Try to import and start the gesture receiver.  Returns the source or None."""
    try:
        # gesture_receiver lives as a sibling package
        parent = str(Path(__file__).resolve().parent.parent)
        if parent not in sys.path:
            sys.path.insert(0, parent)
        from gesture_receiver.receiver import GestureReceiver  # type: ignore
        receiver = GestureReceiver(port=port)
        receiver.start()
        print(f"[hologram] gesture receiver listening on port {port}")
        return receiver
    except ImportError:
        print("[hologram] gesture_receiver not available -- keyboard only")
        return None
    except Exception as exc:
        print(f"[hologram] failed to start gesture receiver: {exc}")
        return None


def _try_import_bonjour(port: int):
    """Try to advertise via Bonjour so iOS can auto-discover us."""
    try:
        parent = str(Path(__file__).resolve().parent.parent)
        if parent not in sys.path:
            sys.path.insert(0, parent)
        from gesture_receiver.bonjour import BonjourAdvertiser  # type: ignore
        adv = BonjourAdvertiser(port=port)
        adv.start()
        print(f"[hologram] bonjour advertising on port {port}")
        return adv
    except Exception:
        return None


SCENES = {
    "solar": SolarSystemScene,
    "connect4": Connect4Scene,
}


def main():
    parser = argparse.ArgumentParser(description="Holographic Quad-View Renderer")
    parser.add_argument(
        "--scene", choices=list(SCENES.keys()), default="solar",
        help="Scene to render (default: solar)",
    )
    parser.add_argument(
        "--port", type=int, default=9001,
        help="UDP port for gesture receiver (default: 9001)",
    )
    parser.add_argument(
        "--no-gesture", action="store_true",
        help="Disable gesture receiver (keyboard only)",
    )
    parser.add_argument(
        "--width", type=int, default=1920,
        help="Screen width (default: 1920)",
    )
    parser.add_argument(
        "--height", type=int, default=1080,
        help="Screen height (default: 1080)",
    )
    parser.add_argument(
        "--windowed", action="store_true",
        help="Run in a window instead of fullscreen",
    )
    args = parser.parse_args()

    # Scene
    scene = SCENES[args.scene]()

    # Gesture source
    gesture_source = None
    bonjour = None
    if not args.no_gesture:
        gesture_source = _try_import_gesture(args.port)
        if gesture_source is not None:
            bonjour = _try_import_bonjour(args.port)

    # Renderer
    renderer = QuadRenderer(
        width=args.width,
        height=args.height,
        fullscreen=not args.windowed,
    )

    print(f"[hologram] scene={args.scene}  gesture={'on' if gesture_source else 'off'}")
    print("[hologram] controls: arrows/WASD=rotate  +/-=zoom  space=action  q=quit")

    try:
        renderer.run(scene, gesture_source=gesture_source)
    except KeyboardInterrupt:
        pass
    finally:
        if bonjour is not None:
            try:
                bonjour.stop()
            except Exception:
                pass
        print("[hologram] done")


if __name__ == "__main__":
    main()

# Pony Stark — Hologram Display & Gesture Receiver

Python-based quad-view renderer for Pepper's Ghost holographic display, with a UDP gesture receiver that connects to the iPhone HoloGesture app. Includes two built-in scenes: a solar system and a Connect 4 game.

## What It Does

- **Quad-view renderer**: Renders any 3D scene from four camera angles (0, 90, 180, 270 degrees) in a 2x2 grid. Each quadrant is horizontally mirrored because Pepper's Ghost reflects off angled acrylic, which flips the image.
- **Gesture receiver**: Listens for UDP JSON packets from the iPhone (or any sender) on port 9001. Thread-safe, with gesture expiry and heartbeat timeout.
- **Bonjour advertiser**: Publishes `_hologesture._udp.` via mDNS so the iPhone can auto-discover the laptop without manual IP entry.
- **Orbit camera**: Spherical coordinate camera with smooth lerp for gesture-driven rotation and zoom.

## Tech Stack

- **Python 3.11+**
- **Pygame** -- window management, input, OpenGL context
- **PyOpenGL** -- OpenGL rendering (immediate mode, GLU quadrics)
- **NumPy** -- math, board state
- **zeroconf** -- Bonjour/mDNS service advertisement

## Setup

```bash
cd laptop
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Requirements

```
pygame
PyOpenGL
numpy
zeroconf
```

## Usage

```bash
# Solar system scene with gesture input (default)
python -m hologram.main

# Connect 4 scene
python -m hologram.main --scene connect4

# Keyboard only (no gesture receiver)
python -m hologram.main --no-gesture

# Windowed mode (not fullscreen)
python -m hologram.main --windowed

# Custom screen size
python -m hologram.main --width 1920 --height 1080

# All options
python -m hologram.main --scene solar --port 9001 --windowed --width 1280 --height 720
```

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Rotate camera |
| +/- | Zoom in / out |
| Space | Reset camera (solar) / Drop piece (connect4) |
| R | Reset game (connect4) |
| Q / Escape | Quit |

### Gestures (from iPhone)

| Gesture | Action |
|---------|--------|
| Swipe left/right | Rotate view azimuth |
| Open palm (Z movement) | Zoom in/out |
| Fist | Reset camera / confirm |
| Pinch | Selection (forwarded to scene) |

## Architecture

```
laptop/
  hologram/
    main.py            CLI entry point, scene selection, gesture/bonjour setup
    quad_renderer.py   Core Pepper's Ghost renderer (4 viewports, mirror, camera)
    scene.py           Base Scene class + SolarSystemScene + Connect4Scene
    camera.py          OrbitCamera with spherical coords and smooth lerp
  gesture_receiver/
    receiver.py        UDP listener, JSON parsing, thread-safe gesture state
    gestures.py        Gesture enum, expiry constants, empty state defaults
    bonjour.py         Bonjour/mDNS advertiser (zeroconf)
    test_receiver.py   Unit tests
  requirements.txt
```

### Quad-View Layout

```
+----------+----------+
|  Front   |  Right   |
|  (0 deg) | (90 deg) |
+----------+----------+
|  Left    |  Back    |
| (270 deg)| (180 deg)|
+----------+----------+
```

Each viewport applies:
1. Scissor test to isolate the quadrant
2. Perspective projection
3. Horizontal mirror (`glScalef(-1, 1, 1)`) with `glFrontFace(GL_CW)` to fix winding
4. Camera view transform with the quadrant's extra azimuth rotation
5. Scene draw calls

The result is four views of the same scene, each mirrored, on a pure black background. Place an acrylic pyramid in the center and you get a hologram.

## Scenes

### Solar System

Rotating planets orbiting a pulsing emissive sun. Stars twinkle on a distant sphere. Camera orbits around the system. Gesture-controllable rotation and zoom.

### Connect 4

3D Connect 4 board with wireframe grid and emissive sphere pieces (red and yellow). Supports gesture-based column selection (swipe) and piece dropping (fist). Winner gets a pulsing glow ring.

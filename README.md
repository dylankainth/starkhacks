# Pony Stark

**A DIY Pepper's Ghost holographic display you build with a cardboard box, a laptop, and an iPhone.**

Built at StarkHacks 2026 (Purdue University).

## What Is This?

Pony Stark turns everyday hardware into a holographic display. Place an acrylic pyramid on your laptop screen, point your iPhone at the viewing area, and control floating 3D holograms with hand gestures -- no VR headset, no special display, no webcam needed.

The system has three layers:

1. **iPhone** detects hand gestures using ARKit + Vision framework and streams them over WiFi
2. **Laptop** renders 3D content in a four-quadrant Pepper's Ghost layout (each quadrant reflects off one face of the pyramid)
3. **Content apps** provide the things you actually look at: an exoplanet explorer powered by Gemini AI, a holographic Connect 4 game, and a procedural moon

## Hardware You Need

- A cardboard box (cut to size)
- An acrylic pyramid (4 trapezoidal panels taped together, or a single sheet bent into shape)
- Any laptop with a screen (renders the quad-view)
- An iPhone with LiDAR (iPhone 12 Pro or newer) for gesture input
- Both devices on the same WiFi network

No webcam. No projector. No special hardware.

## Repository Structure

```
starkhacks/
  astrodex/     C++ / OpenGL exoplanet renderer with AI inference
  ios/          Swift / ARKit gesture recognition app
  web/          Three.js holographic Connect 4
  laptop/       Python quad-view renderer and gesture receiver
  contribute/   Vite + React Solana contribution platform
  docs/         Protocol specs and design documents
  moon.py       Standalone holographic moon display
```

Each subdirectory has its own README with setup instructions.

## How It Works

```
iPhone (ARKit + Vision)
    |
    | UDP gestures @ 15-30 Hz
    | (fist, pinch, point, open palm, swipe)
    v
Laptop (gesture receiver)
    |
    | feeds into
    v
Renderer (C++ OpenGL / Python PyOpenGL / Three.js)
    |
    | quad-view output (Front/Back/Left/Right)
    | each quadrant mirrored for Pepper's Ghost
    v
Laptop Screen
    |
    | light reflects off acrylic pyramid faces
    v
Floating Hologram (visible to the naked eye)
```

The iPhone uses LiDAR depth data for 3D palm tracking (x, y, z in meters) and the Vision framework for hand pose classification. Gestures are sent as JSON over UDP. The laptop receives them, maps them to scene actions, and renders the scene from four camera angles laid out in a 2x2 grid. Bonjour/mDNS handles device discovery automatically.

## Quick Start

### 1. Holographic Moon (simplest demo)

```bash
pip install pygame PyOpenGL numpy
python moon.py          # press F for fullscreen
```

Place your acrylic pyramid in the center of the screen. You should see a rotating moon floating inside.

### 2. Exoplanet Explorer (full experience)

```bash
cd astrodex
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./astrosplat
```

Set `GEMINI_API_KEY` for AI-powered planet generation via Google Gemini.

### 3. Holographic Connect 4 (web)

```bash
cd web
npm install
npm run dev
```

Open in browser. Uses webcam + MediaPipe for gesture control, or keyboard as fallback.

### 4. iPhone Gesture App

Open `ios/` in Xcode, build to a LiDAR-equipped iPhone, enter the laptop's IP, and tap Start. Gestures stream automatically.

## Hackathon Tracks

- **Best Use of Gemini** -- astrodex uses `gemini-3-flash-preview` to generate scientifically plausible planet rendering parameters from real NASA exoplanet data. The AI applies molecular absorption physics, stellar type color corrections, and temperature-dependent atmospheric modeling to produce unique visualizations for every confirmed exoplanet.

## Key Technologies

| Component | Stack |
|-----------|-------|
| Exoplanet renderer | C++23, OpenGL 4.1, GLSL raymarching, ImGui, ImPlot |
| AI inference | Google Gemini (gemini-3-flash-preview), AWS Bedrock, Groq |
| Gesture recognition | ARKit, Vision framework (VNDetectHumanHandPoseRequest) |
| Depth sensing | iPhone LiDAR (ARWorldTrackingConfiguration + sceneDepth) |
| Network protocol | UDP JSON, Bonjour/mDNS auto-discovery |
| Web demo | Three.js, Vite, TypeScript, MediaPipe HandLandmarker |
| Hologram display | Python, Pygame, PyOpenGL |
| Contribution platform | React, Vite, Solana wallet-adapter, SPL tokens |
| Data sources | NASA Exoplanet Archive TAP, ExoMAST, Exoplanet.eu |

## Team

Built in ~36 hours at StarkHacks 2026, Purdue University.

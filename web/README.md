# Pony Stark — Orbital Four (Holographic Connect 4)

A holographic Connect 4 game rendered with Three.js in quad-view for Pepper's Ghost projection. Players drop planet-themed pieces into a floating neon grid using hand gestures or keyboard controls.

## What It Does

Renders a Connect 4 board from four camera angles simultaneously (front, back, left, right), each in its own quadrant of the screen. When placed under an acrylic pyramid, each quadrant reflects off one face, creating a 3D hologram visible from all sides.

- **Front/back cameras** show the game board with pieces rendered as glowing spheres
- **Left/right cameras** show a side panel with turn indicator, cursor position dots, and drop animations
- **Bloom post-processing** on every quadrant gives the neon-in-darkness look that Pepper's Ghost needs (pure black background, bright emissive objects)
- **Gesture control** via webcam + MediaPipe HandLandmarker (pinch to drop, open palm to reset)
- **Calibration HUD** (press `C`) lets you nudge each quadrant's position and size to align with your specific pyramid

## Tech Stack

- **Three.js** 0.164 -- scene graph, perspective cameras, mesh rendering
- **Vite** -- dev server and build tool
- **TypeScript**
- **MediaPipe** HandLandmarker (WASM + GPU delegate) for webcam gesture recognition
- **UnrealBloomPass** from Three.js examples for per-quadrant bloom

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. Grant camera permission if prompted (optional -- keyboard works without it).

### Production Build

```bash
npm run build
npm run preview
```

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| Left/Right arrows | Move cursor |
| Space / Enter | Drop piece |
| R | Reset game |
| C | Toggle calibration HUD |

### Hand Gestures (webcam)

| Gesture | Action |
|---------|--------|
| Move index finger left/right | Move cursor (middle 70% of frame maps to columns) |
| Pinch (thumb + index) | Drop piece |
| Hold open palm 2 seconds | Reset game |

Gesture input uses hysteresis and cooldowns to prevent accidental double-triggers.

### Calibration

Press `C` to enter calibration mode. Use `1`/`2`/`3`/`4` to select a quadrant (top/bottom/left/right), arrow keys to nudge position, `+`/`-` to resize. Hold `Shift` for 10x step. Press `0` to zero out. Settings persist in localStorage.

## Architecture

```
src/
  main.ts          App entry: cameras, composers, quad-view render loop, input wiring
  game.ts          Pure Connect 4 logic (board state, drop, win check)
  board.ts         Three.js board mesh: frame, grid, slot rings, planet-sphere pieces
  gestures.ts      MediaPipe HandLandmarker setup, pinch/palm detection with cooldowns
  particles.ts     GPU particle system for drop bursts and win sparkles
  sidePanel.ts     Turn indicator ring, cursor dots, drop streak animations (layer 1)
  calibration.ts   Per-quadrant offset/size tweaking with keyboard HUD
index.html         Canvas element, black background
```

### Quad-View Layout

```
+--------+--------+
|  Back  | Right  |  (top half of screen)
| cam    | cam    |
+--------+--------+
|  Left  | Bottom |  (bottom half of screen)
| cam    | cam    |
+--------+--------+
```

Each quadrant gets its own `EffectComposer` (RenderPass + UnrealBloomPass + OutputPass) sized to the quadrant dimensions so bloom radius is correct and glow does not bleed between quadrants.

Side cameras (left/right) are rolled 90 degrees and render only layer 1 (the side panel), so the turn ring and cursor dots face inward and reflect correctly off the side pyramid faces.

## Design Notes

- **Pure black background** is critical for Pepper's Ghost -- anything non-black becomes a visible smudge on the acrylic
- Pieces are spheres (not discs) so they read as 3D planets from every viewing angle around the pyramid
- Player 1 is warm orange-red ("Mars"), Player 2 is cool blue ("Neptune")
- A shared starfield on a distant sphere shell gives depth without breaking the illusion

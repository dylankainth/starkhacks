# Pony Stark — DIY Holographic Exoplanet Explorer

**StarkHacks 2026 @ Purdue | ~36 hours**

A cardboard box, a laptop screen, an iPhone, and four pieces of acrylic turn into a holographic display that lets you explore every confirmed exoplanet with your bare hands.

---

## The Story

Most people will never see an exoplanet. There are 5,800+ confirmed worlds orbiting other stars, but the best we get is a data table — mass, radius, orbital period, maybe a transit light curve. What would these planets actually *look* like?

**Pony Stark** answers that question by combining real NASA data, AI inference, and procedural rendering into a Pepper's Ghost hologram you can build for under $5. Point your phone at the display, pinch to rotate Jupiter, swipe to fly across the galaxy, and zoom into TRAPPIST-1 e to see what a tidally-locked ocean world might look like floating in mid-air in front of you.

The system pulls data from three public APIs (NASA Exoplanet Archive, ExoMAST, Exoplanet.eu), uses Gemini Flash to fill in the 90%+ of missing data with astrophysically-grounded inference, and renders each planet in real-time using raymarching shaders — no textures, every world generated purely from math.

---

## How It Works

```
    iPhone (ARKit + Vision)
           │
           │  Hand gestures over UDP (15-30 Hz)
           v
    ┌─────────────────────────────────────────┐
    │          Laptop (astrodex C++)           │
    │                                         │
    │  NASA TAP ──┐                           │
    │  ExoMAST ───┼──> Aggregator ──> AI ──>  │
    │  Exo.eu  ───┘    (3 APIs)    (Gemini)   │
    │                                         │
    │  60+ shader uniforms ──> GLSL raymarcher│
    │                                         │
    │  Render scene ──> FBO capture           │
    │  Blit 4x with UV flips (diamond layout) │
    │  ImGui controls rendered full-size on top│
    └─────────────┬───────────────────────────┘
                  │
                  v
           Laptop Screen
          (4 mirrored views)
                  │
                  v
        Acrylic Pyramid (45°)
         (Pepper's Ghost)
                  │
                  v
       Floating 3D Hologram
      (visible to naked eye)
```

---

## Architecture

### 1. astrodex (C++23 / OpenGL 4.1) — The Core

The main application. A real-time procedural planet renderer with a galaxy view, n-body solar system simulation, and Pepper's Ghost hologram output.

| System | What it does |
|--------|-------------|
| **Galaxy View** | 5,800+ exoplanets at real sky positions (RA/Dec), plus Gaia DR3 background stars with LOD. Click any dot to zoom in. |
| **Planet Renderer** | Raymarching fragment shader — surface noise (FBM, ridged, domain-warped), biome coloring, volumetric clouds, Rayleigh atmosphere, ring systems. Every planet is unique. |
| **Data Aggregator** | Parallel HTTP queries to NASA TAP, ExoMAST, and Exoplanet.eu. Conflict resolution prefers measured over inferred values. |
| **AI Inference** | Sends partial exoplanet data to Gemini Flash (or Bedrock/Groq/chatjimmy fallbacks). Returns 60+ rendering parameters grounded in astrophysics. |
| **N-Body Simulation** | Barnes-Hut octree-accelerated gravitational simulation. Full solar system with real orbital mechanics. |
| **Hologram Mode (F5)** | Captures scene to an FBO at face-size resolution, blits 4x with Pepper's Ghost UV flips (bottom=normal, top=flip-both, left=flip-X, right=flip-Y). ImGui renders full-size on top. |
| **Gesture Input** | UDP listener (port 9001) receives hand pose data from iPhone. Pinch=orbit, palm=zoom, fist=warp, point=fine rotate. |
| **UI** | Dear ImGui (docking) + ImPlot. Planet editor, data visualization, search, cached planet browser. |

**Key rendering insight**: The planet shader is a per-pixel raymarcher with volumetric cloud stepping — expensive at full Retina resolution. In hologram mode, the FBO renders at face size (~447x447) instead of full screen (~3456x2234), cutting GPU work ~38x.

### 2. HoloGesture (Swift / ARKit / Vision) — iPhone App

Hand gesture recognition and streaming.

- **ARKit**: 60fps camera + LiDAR depth
- **Vision**: `VNDetectHumanHandPoseRequest` — 21-point hand skeleton
- **Gestures**: point, pinch, open_palm, fist, swipe (rule-based classification from joint distances)
- **Output**: UDP JSON at 15-30 Hz
- **Discovery**: Bonjour (`_hologesture._udp.`)

### 3. Web Hologram (Three.js / TypeScript) — Connect 4

A browser-based holographic Connect 4 game for a second demo.

- Quad-view rendering with per-quadrant EffectComposer + UnrealBloomPass
- MediaPipe HandLandmarker for webcam gesture input
- Calibration HUD for per-quadrant positioning

### 4. Python Renderer (PyOpenGL / Pygame) — Lightweight Alternative

A simpler quad-view renderer for solar system visualization.

- 4 scissor-test viewports with `glScalef(-1,1,1)` horizontal mirror
- Gesture receiver + Bonjour advertiser
- OrbitCamera with smooth lerp

### 5. Contribute Platform (React 19 / Solana) — Crowdsourced Science

When astrodex shows a planet with missing data, a "Contribute Data (Solana)" button opens a web form where researchers can submit observations.

- Submit observational data with DOI/arXiv citation
- Earn $ASTRO SPL tokens on Solana devnet
- Reward tiers by data rarity (atmosphere=50, radius=10, etc.)

---

## The Pepper's Ghost Physics

A 45° acrylic plate acts as a partial mirror — it reflects the laptop screen while remaining transparent. With four plates arranged in a pyramid, four viewers around the display each see a different reflected face, creating the illusion of a 3D object floating inside the pyramid.

**The software math**:
- Render the scene once into an FBO
- Blit it 4 times in a diamond layout with UV coordinate flips:
  - **Bottom** (nearest viewer): `UV(0,0)→(1,1)` — normal
  - **Top** (opposite): `UV(1,1)→(0,0)` — flip both axes
  - **Left**: `UV(1,0)→(0,1)` — flip X
  - **Right**: `UV(0,1)→(1,0)` — flip Y
- The reflection "un-flips" the image, so each viewer sees the correct orientation

Based on research from [nazar-ivantsiv/peppers-ghost](https://github.com/nazar-ivantsiv/peppers-ghost), [veebch/pepper](https://github.com/veebch/pepper), and [xanderchinxyz/OpenGhost](https://github.com/xanderchinxyz/OpenGhost).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | C++23, Swift 5, TypeScript, Python |
| **Graphics** | OpenGL 4.1, GLFW, GLAD, Three.js, PyOpenGL |
| **Shaders** | 19 custom GLSL files (raymarching, terrain, atmosphere, rings, starfield) |
| **UI** | Dear ImGui (docking) + ImPlot |
| **AI** | Gemini Flash, AWS Bedrock (Claude), Groq (Kimi K2), chatjimmy |
| **Data APIs** | NASA TAP, ExoMAST, Exoplanet.eu (all public, no keys needed) |
| **Physics** | N-body Barnes-Hut octree simulation |
| **Input** | ARKit + Vision hand tracking, UDP JSON, Bonjour discovery |
| **Blockchain** | Solana devnet, @solana/web3.js, $ASTRO SPL token |
| **Build** | CMake 3.25+ (FetchContent), Vite, Xcode |
| **Math** | GLM |

---

## Build & Run

### astrodex (main app)
```bash
cd astrodex
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./astrosplat
```

**Controls**:
- **F5**: Toggle hologram mode
- **Click + drag**: Orbit planet
- **Scroll**: Zoom
- **WASD**: Move camera (disabled in hologram planet view)
- **Tab**: FPS mouse lock
- **F1**: Help overlay

**Environment variables** (optional):
```bash
GEMINI_API_KEY="..."        # AI inference (preferred)
AWS_ACCESS_KEY_ID="..."     # Bedrock fallback
HOLO_SCALE=5.0              # Diamond face size (smaller = bigger faces)
HOLO_GAP=0.25               # Gap between faces
```

### iPhone gesture app
Open `ios/HoloGesture/` in Xcode. Requires iPhone 12 Pro+ with LiDAR.

### Web Connect 4
```bash
cd web && npm install && npm run dev
```

---

## Data Pipeline

```
Search "TRAPPIST-1 e"
        │
        ├──> NASA TAP: mass, radius, period, eccentricity, discovery year...
        ├──> ExoMAST: atmospheric spectral detections (H2O, CO2, CH4...)
        └──> Exoplanet.eu: albedo, equilibrium temp, alternative measurements
        │
        v
   ExoplanetData struct (MeasuredValue<T> with uncertainty + source tracking)
        │
        v
   InferenceEngine (Gemini Flash)
   "Given this planet data, what would it look like?"
        │
        v
   PlanetParams (60+ uniforms)
   → surface colors, noise type, FBM octaves, water level,
     atmosphere density, cloud coverage, ring properties,
     terrain features (ridges, craters, continents)...
        │
        v
   GLSL Raymarcher
   → unique procedural planet rendered at 60fps
```

---

## What Makes This Different

1. **Every planet is real data** — not generic sci-fi. The renderer uses actual measured mass, radius, temperature, atmospheric composition, and stellar properties.

2. **AI fills the gaps responsibly** — of 5,800+ exoplanets, fewer than 70 have detected atmospheres. Gemini infers what's missing using astrophysical models, and every value tracks its source (`NASA_TAP`, `AI_INFERRED`, `CALCULATED`).

3. **$5 hologram** — no VR headset, no special glasses. Cardboard box + acrylic sheets + laptop + phone. The Pepper's Ghost illusion works in ambient light with the naked eye.

4. **Gesture-controlled** — iPhone LiDAR + ARKit hand tracking at 15-30 Hz over WiFi. Pinch to grab, palm to zoom, fist to warp through the galaxy.

5. **Crowdsourced science** — incomplete data triggers a Solana-backed contribution flow where researchers earn tokens for verified observations.

---

## Project Structure

```
starkhacks/
├── astrodex/          C++/OpenGL exoplanet renderer (main app)
│   ├── src/
│   │   ├── core/      Window, Application, Logger
│   │   ├── render/    Renderer, Camera, Shaders, Sphere/Orbit/Ring
│   │   ├── ui/        ImGui panels, GalaxyView, DataVisualization
│   │   ├── ai/        InferenceEngine + 4 backend clients
│   │   ├── data/      API clients, ExoplanetData, Aggregator
│   │   ├── physics/   N-body sim, Octree, Integrator
│   │   ├── input/     GestureInput (UDP)
│   │   └── explorer/  Star navigator (Gaia DR3 + LOD)
│   └── shaders/       19 GLSL files
├── ios/               Swift/ARKit gesture app (HoloGesture)
├── web/               Three.js holographic Connect 4
├── laptop/            Python quad-view renderer
├── contribute/        React + Solana contribution platform
└── docs/              Protocol specs, PRD
```

---

*Built at StarkHacks 2026, Purdue University.*

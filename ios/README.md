# Pony Stark — HoloGesture (iOS)

iPhone app that recognizes hand gestures using ARKit + Vision framework and streams them over UDP to the hologram renderer on the laptop. Uses LiDAR for 3D depth tracking.

## What It Does

Point your iPhone at your hand near the hologram display. The app:

1. Runs ARKit with `sceneDepth` to get LiDAR depth data at 60fps
2. Feeds camera frames to `VNDetectHumanHandPoseRequest` (Apple Vision framework) for hand pose detection
3. Classifies gestures from joint positions and distances (no ML model training needed)
4. Sends gesture events as JSON over UDP at 15-30 Hz to the laptop
5. Auto-discovers the laptop via Bonjour/mDNS (`_hologesture._udp.`)

## Supported Gestures

| Gesture | Detection Method | Hologram Action |
|---------|-----------------|-----------------|
| Point | Index extended, others curled | Cursor / select |
| Pinch | Thumb-index distance < 0.03 | Grab and drag |
| Open Palm | 3+ fingers extended, spread > 0.08 | Push/pull (Z axis) |
| Fist | All fingertips close to wrist | Confirm / action |

## Tech Stack

- **Swift 5**, SwiftUI
- **ARKit** (`ARWorldTrackingConfiguration` with `.sceneDepth`)
- **Vision** (`VNDetectHumanHandPoseRequest`)
- **Network.framework** for Bonjour browsing (`NWBrowser`)
- **Raw BSD sockets** for UDP streaming (minimal overhead)
- iOS 17+ deployment target

## Requirements

- iPhone with LiDAR sensor (iPhone 12 Pro, 13 Pro, 14 Pro, 15 Pro, 16 Pro, or any iPad Pro with LiDAR)
- Xcode 15+
- Both iPhone and laptop on the same WiFi network

## Setup

1. Open the project in Xcode:
   - Either open `HoloGesture.xcodeproj` directly
   - Or generate from `project.yml` using [XcodeGen](https://github.com/yonaskolb/XcodeGen): `xcodegen generate`

2. Set your development team in Signing & Capabilities

3. Build and run on a LiDAR-equipped iPhone (simulator will not work -- needs real camera + LiDAR)

## Usage

1. Start the gesture receiver on the laptop (either astrodex or the Python hologram app)
2. Launch HoloGesture on the iPhone
3. The app auto-discovers the laptop via Bonjour. If discovery fails, manually enter the laptop's IP address
4. Tap **Start**
5. Hold your hand in front of the camera and make gestures

### UI Features

- **Depth overlay** -- toggle the LiDAR depth heatmap (close = red, far = blue) to debug tracking
- **Mirror mode** -- flip palm X when the camera faces the user (mounted inside the Pepper's Ghost box). Also corrects hand chirality (left/right swap)
- **FPS counter** -- shows actual gesture send rate
- **Connection status** -- idle / connecting / streaming / unreachable
- **Battery heartbeat** -- sends device name and battery level to the laptop every second

## Network Protocol

UDP JSON, one packet per datagram. See [`docs/gesture-protocol.md`](../docs/gesture-protocol.md) for the full spec.

### Gesture packet

```json
{
  "type": "gesture",
  "gesture": "pinch",
  "hand": "right",
  "confidence": 0.95,
  "palm": { "x": 0.5, "y": 0.3, "z": 1.2 },
  "fingers_extended": 2,
  "timestamp": 1713400000.123
}
```

- `palm.x`, `palm.y`: normalized 0-1 in Vision coordinate space (origin bottom-left)
- `palm.z`: depth in meters from LiDAR
- `timestamp`: ARFrame timestamp + boot time offset (for cross-device sync)

## Architecture

```
HoloGestureApp.swift     SwiftUI app entry + ContentView (camera preview, controls, status)
GestureStreamer.swift     ARSessionDelegate + gesture classification + UDP streaming + Bonjour
Info.plist               Camera, network, and Bonjour permissions
project.yml              XcodeGen project definition
```

The gesture classifier runs entirely on-device using Vision framework landmarks -- no network calls, no ML model downloads, no cloud dependency. Classification is rule-based using finger extension detection (tip-to-wrist distance vs. tip-to-MCP distance) and inter-finger distances.

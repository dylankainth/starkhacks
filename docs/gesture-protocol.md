# Gesture Protocol Spec — UDP JSON over WiFi

## Transport
- **Protocol**: UDP (fire-and-forget, ~1-3ms local WiFi latency)
- **Default port**: 9001
- **Direction**: iPhone → Laptop (unidirectional)
- **Rate**: 15-30 Hz (throttled from 60fps camera)
- **Discovery**: Bonjour/mDNS service type `_hologesture._udp.`

## Packet Format
UTF-8 JSON, one object per UDP datagram. Max ~512 bytes.

### Gesture Event
```json
{
  "type": "gesture",
  "gesture": "pinch",
  "hand": "right",
  "confidence": 0.95,
  "palm": {"x": 0.5, "y": 0.3, "z": 1.2},
  "fingers_extended": 2,
  "timestamp": 1713400000.123
}
```

### Gesture Types
| Gesture | Detection | Hologram Action |
|---------|-----------|-----------------|
| `point` | Index extended, others curled | Cursor / select |
| `pinch` | Thumb-index distance < 0.03 | Grab and drag |
| `open_palm` | 3+ fingers extended, spread > 0.08 | Push/pull (Z movement) |
| `fist` | All tips close to wrist (< 1.5cm) | Confirm / action |
| `swipe_left` | Palm velocity X < -threshold | Rotate scene left |
| `swipe_right` | Palm velocity X > threshold | Rotate scene right |
| `swipe_up` | Palm velocity Y > threshold | Next item |
| `swipe_down` | Palm velocity Y < -threshold | Previous item |
| `none` | No hand detected or no gesture | Idle |

### Coordinate System
- `x`, `y`: Normalized 0-1 in camera frame (Vision framework coords, origin bottom-left)
- `z`: Depth in meters from LiDAR sceneDepth (0 = camera, increasing away)
- `palm`: 3D position of palm center (average of MCP joints)

### Velocity Events (for swipes)
```json
{
  "type": "velocity",
  "hand": "right",
  "vx": -0.8,
  "vy": 0.1,
  "vz": 0.0,
  "timestamp": 1713400000.123
}
```

### Heartbeat (every 1s when connected)
```json
{
  "type": "heartbeat",
  "device": "iPhone 16 Pro",
  "battery": 85
}
```

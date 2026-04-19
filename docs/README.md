# Pony Stark — Documentation

Design documents and protocol specifications for the Pony Stark holographic display system.

## Contents

### [gesture-protocol.md](gesture-protocol.md)

Full specification for the UDP JSON protocol used between the iPhone gesture app and the laptop renderer.

Covers:
- Transport details (UDP, port 9001, 15-30 Hz, Bonjour discovery)
- Gesture event packet format (type, gesture name, hand, confidence, palm 3D position, finger count)
- Coordinate system (Vision framework normalized coords + LiDAR depth in meters)
- Velocity events for swipe detection
- Heartbeat packets (device name, battery level)
- All nine gesture types and their detection criteria

### [PRD_solana_science.md](PRD_solana_science.md)

Product requirements document for the Solana-powered decentralized science contribution platform.

Covers:
- Problem statement (5,800+ confirmed exoplanets, most with data gaps)
- Architecture (astrodex + Express API + Supabase + Anchor program + React web app)
- User stories prioritized into P0 (hackathon MVP), P1 (post-hackathon), P2 (future)
- Anchor smart contract design ($ASTRO SPL token, contribution submission, review, reward claim)
- API design (REST endpoints for contributions, reviews, leaderboard)
- Reward tier table (by data rarity)
- Security considerations (sybil resistance, data quality checks, contract safety)
- Tech stack breakdown and buildability estimate (~12-14 hours for MVP)

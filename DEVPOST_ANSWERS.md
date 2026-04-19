# Devpost Submission Answers — Pony Stark

## Inspiration

We've landed on the Moon. We've mapped 6,150+ confirmed exoplanets. We've taken photos of galaxies so far away that the light left them before Earth had oxygen in its atmosphere. And yet, the way almost everyone experiences space is the same way they experience a TikTok: a flat 2D rectangle, usually a few inches wide. That gap bothered us. Space is the most three-dimensional thing that exists, and we've flattened it. The obvious fix is VR/AR headsets, but those cost $300 to $3,500, require accounts, require calibration, and end up sitting in a drawer. None of that scales to a classroom in Lagos or a science museum in Indianapolis. StarkHacks is hosted by the Humanoid Robot Club at Purdue, the cradle of astronauts. Walking into the Armory made us ask: what would it take to put a planet in the palm of someone's hand, with nothing between them and it? That was the spark for Pony Stark. The name is a wink at Tony Stark projecting the Iron Man suit in mid-air and flicking through schematics with his hands. We wanted that, but for planets. And we wanted it to cost under $50 in parts.

## What it does

Pony Stark is three things stitched into one experience:

1. **A gesture-controlled 3D holographic display for space, using Pepper's Ghost.** Wave a hand and the galaxy spins. Pinch to orbit around a planet. Open your palm to zoom. The planet appears to float inside a transparent acrylic pyramid, visible from all four sides with no headset, no glasses, no app install. The gesture input comes from an iPhone running ARKit and the Vision framework for hand-pose estimation, streamed over UDP to the laptop.

2. **A live AI planetary encyclopedia.** The moment you select a planet, we pull its real data from three NASA-affiliated APIs and stream the gaps into the Gemini API. Gemini infers what the planet would actually look like — surface colors, atmosphere density, cloud coverage, terrain features — using astrophysical models. No pre-scripted paragraphs: every planet gets a unique, procedurally generated 3D world rendered in real-time from pure math.

3. **A decentralized data layer for the gaps NASA can't fill.** NASA's Exoplanet Archive is peer-reviewed and incomplete by design: it only ingests parameters from refereed publications, and for most of those 6,150 confirmed exoplanets, fields like atmospheric composition, surface imagery, and habitability estimates are blank. There's also no real incentive for anyone outside academia to fill them in. So when a planet has missing data, Pony Stark shows a "Contribute Data (Solana)" button that sends the user to a React web app where they can submit observations with DOI/arXiv citations and earn $ASTRO SPL tokens on Solana devnet as a reward. Contributions are tracked on-chain with reward tiers based on data rarity — atmosphere composition is worth 5x more than orbital period because fewer than 70 of 5,800+ planets have detected atmospheres. Peer review, decentralized, with skin in the game.

## How we built it

We had 36 hours, one Armory, and a very large pile of acrylic.

**The hardware stack:** The display is a four-sided acrylic pyramid placed on a laptop screen. Each face is cut at exactly 45° to the base. This is the Pepper's Ghost principle: light from the screen hits the acrylic at 45°, reflects toward the viewer, and the brain fuses four reflected images into one floating 3D object. The geometry matters — for a viewer at horizontal line-of-sight, θ_incidence = θ_reflection = 45°, which means the image appears to sit at the centroid of the pyramid regardless of where the viewer stands. That is what gives it the "real object" feel.

**The sensor:** An iPhone 12 Pro+ running a custom Swift app (HoloGesture) that uses ARKit for 60fps camera + LiDAR depth capture and Apple's Vision framework (`VNDetectHumanHandPoseRequest`) for 21-point hand skeleton estimation. Gestures — point, pinch, open palm, fist — are classified from joint distances and streamed as UDP JSON packets at 15-30 Hz, auto-discovered via Bonjour.

**The compute:** A MacBook Pro running `astrodex`, a C++23/OpenGL 4.1 application that is the heart of the project.

**The software stack:**

- **C++23 + OpenGL 4.1 + GLSL** for the main renderer. Planets are rendered using raymarching fragment shaders — no textures, no mesh-based spheres. Every planet is generated procedurally from noise functions (FBM with domain warping, ridged noise, craters, continent blending), volumetric cloud ray-marching, Rayleigh atmospheric scattering, and altitude-based biome coloring. 19 custom GLSL shader files in total.
- **Dear ImGui (docking branch) + ImPlot** for the full UI — planet editor, data visualization, galaxy browser, search.
- **Galaxy view** renders 5,800+ exoplanets at their real sky positions (RA/Dec) with a Gaia DR3 star catalog background using LOD rendering. Click any dot to zoom in.
- **N-body simulation** with Barnes-Hut octree acceleration for a full solar system with real orbital mechanics.
- **Exoplanet data aggregation** — parallel HTTP queries (via libcurl) to three public APIs: NASA TAP (Exoplanet Archive), ExoMAST (atmospheric spectral detections), and Exoplanet.eu (albedo, temperature, alternative measurements). Conflict resolution prefers measured over inferred values, with source provenance tracked per-field.
- **Gemini API** (`gemini-3-flash-preview`) for AI inference, with fallbacks to AWS Bedrock (Claude), Groq (Kimi K2), and chatjimmy.ai (Qwen/Llama). Structured prompts pull live context from the aggregated exoplanet data and return 60+ rendering parameters grounded in astrophysics.
- **Pepper's Ghost hologram rendering** — the scene is captured into an FBO (framebuffer object) at the face size resolution, then blitted four times in a diamond layout with UV coordinate flips (bottom=normal, top=flip-both, left=flip-X, right=flip-Y). ImGui controls render at full screen size on top, so users can navigate planets while in hologram mode.
- **Solana devnet** for the data-contribution protocol. The web app is built with React 19, Vite, @solana/web3.js, and @solana/spl-token. The Anchor smart contract and staking/challenge mechanism are designed but not yet deployed to devnet — the current demo routes users to the contribution web form.
- **Python + PyOpenGL + Pygame** for a lightweight alternative quad-view renderer with four scissor-test viewports and horizontal mirroring.
- **Three.js + TypeScript + Vite** for the holographic Connect 4 game, with per-quadrant EffectComposer + UnrealBloomPass and MediaPipe HandLandmarker for webcam gesture input.

**The gaming prototype that came first:** We actually started on the Gaming and Entertainment track with a holographic Connect 4 you play with gestures. The pitch: a single physical setup replaces every board game you own. Chess today, Connect 4 tomorrow, Settlers of Catan next week, and the pieces never get lost under the couch. Midway through Saturday we realized the exact same hardware and gesture engine could point at the sky instead of a game board, and the space angle was a much bigger swing. We pivoted, kept the game as a working demo for the "future applications" section, and re-skinned its UI with a cosmic theme so it felt like one coherent product.

## Challenges we ran into

**The pyramid geometry is unforgiving.** Our first cut was 2° off and the four reflections refused to fuse. From any angle you could see the seam. We re-cut all four faces with a laser cutter using a jig we designed in Fusion 360, and that fixed it. Lesson: in optics, "close enough" is not close enough.

**Ambient light is the enemy.** Pepper's Ghost only works when the reflecting surface is significantly brighter than the surroundings. The Armory is lit like a stadium. We ended up building a matte-black shroud around the pyramid to kill stray light, which made the illusion pop even under full hackathon lighting.

**Gesture latency vs. gesture accuracy.** The first iPhone gesture classifier was accurate but had noticeable latency. We tuned the Vision framework's confidence thresholds and throttled the UDP stream to 15-30 Hz (down from 60fps camera rate) to balance classification quality against responsiveness. The result feels natural — people instinctively reach out without being told how it works.

**The hologram rendering pipeline was the hardest bug.** Rendering the 3D scene into an FBO and blitting it four times with correct Pepper's Ghost flips sounds simple on paper. In practice, `glBlitFramebuffer` with flipped source coordinates is broken on macOS OpenGL Core Profile — it silently produces black output. We had to replace it with a shader-based textured quad approach (a tiny vertex + fragment shader pair that draws four quads with UV flipping). Then we discovered the FBO was rendering at full Retina resolution (~3456x2234) even though each diamond face is only ~450px — a ~38x waste of GPU fragment work. Matching the FBO size to the face size gave us back our frame rate.

**Keeping the UI usable in hologram mode.** The first version scaled down all ImGui elements with the 3D scene into the tiny diamond faces, making them unreadable. The fix was architecturally clean but required restructuring every render function: capture only the 3D scene into the FBO, blit the hologram, then render ImGui on the default framebuffer at full resolution on top.

**Camera math across wildly different planet sizes.** Planet radii in the renderer span ~30x (Mercury at 0.383 to Jupiter at 10.97 in shader units). A fixed camera distance meant small planets were dots and large ones clipped the near plane. We made the camera distance, zoom limits, and scroll sensitivity all scale relative to planet radius.

**The pivot.** Switching from Connect 4 to a full space explorer 18 hours in was scary. We had working hardware and a working game. Throwing away a polished thing to build a riskier thing is the part of hackathons that nobody tells you about.

## Accomplishments that we're proud of

We built a working sub-$50 holographic display from raw acrylic and the physics of a 163-year-old stage illusion. No VR headset required.

Gesture control feels good. People who tried it instinctively reached out without being told how it worked.

Every planet is real data, not generic sci-fi. The renderer pulls from three NASA-affiliated APIs and uses Gemini to fill in what's missing — and every value tracks whether it came from NASA_TAP, EXOATMOS, AI_INFERRED, or CALCULATED. Watching someone zoom into TRAPPIST-1 e and see a procedurally generated tidally-locked ocean world — rendered from actual measured mass, radius, and orbital parameters — was the moment we knew we had something.

The rendering is pure math. 19 custom GLSL shaders, zero textures. Raymarched surfaces with FBM noise, volumetric clouds, Rayleigh scattering, and ring systems. Every planet is unique.

The Solana contribution platform has a working web frontend with wallet connection and the reward tier system designed. The smart contract architecture is specified in our PRD.

We didn't quit the pivot. The space version is dramatically better than the game-only version would have been, and the game is still in there as a future-applications demo.

We respected the physics. We never call it a "hologram" in our docs without the asterisk. It's a Pepper's Ghost reflective display, and that distinction matters to the people judging this.

## What we learned

**Optics is a branch of engineering, not decoration.** Getting four reflections to fuse into one object is a geometry problem, a materials problem, and a lighting problem simultaneously. We learned to design for all three at once.

**Scarcity of incentives is often the real bottleneck, not scarcity of data.** NASA has better telescopes than anyone on Earth. What it doesn't have is a mechanism to reward a high schooler in Mumbai for correctly identifying something the telescope missed. Token-based incentive systems are genuinely good at this specific thing, and we learned how to design one that's hard to game.

**GPU performance is a physics problem too.** A raymarching fragment shader that looks fine at 60fps on a normal display can tank to single digits when you naively render at full Retina resolution for a hologram that only needs ~450px per face. The 38x performance win from matching FBO size to output size was the most impactful optimization we made.

**Latency is a feature.** The difference between sluggish and responsive gesture control is the difference between "cool tech demo" and "I want one of these."

**Pivot early or pivot never.** We almost didn't pivot. The Connect 4 demo was working and safe. The space version was speculative and half-built. If we'd waited four more hours, we wouldn't have had time. The lesson is that in a 36-hour window, the cost of pivoting grows exponentially with time remaining.

**Hardware hackathons reward honesty.** A judge who builds robots for a living can tell the difference between a "3D display" and a reflective pyramid in about two seconds. Calling it what it is and explaining why Pepper's Ghost is the right choice at this price point won more respect than a breathless claim would have.

## What's next for Pony Stark

**Short term (next 30 days):** Replace the acrylic pyramid with a single conical reflector made of first-surface mirror, which removes the double-reflection ghosting we still have at sharp viewing angles. Train a custom gesture model rather than relying solely on Apple's Vision framework joint-distance rules, targeting sub-30 ms latency. Deploy the Anchor smart contracts to Solana devnet and partner with one citizen-science group (Exoplanet Watch is the obvious first target) to seed real contributions.

**Medium term:** Integrate live telescope feeds. If JWST drops new spectra for an exoplanet, Pony Stark should update in near-real-time — the data aggregator already queries three APIs, adding a fourth for new publications is straightforward. Educational licensing: we want one of these in every STEM classroom that can afford $50, not every classroom that can afford a $3,500 headset per student. Expand the gesture vocabulary to include two-handed manipulation (pulling a galaxy apart, rotating a binary system around its barycenter).

**Long term, the part we're actually excited about:** The holographic gesture display is not fundamentally about space. It's a general-purpose interface. The Connect 4 prototype hinted at this. The same hardware can show molecular structures for chemistry class, surgical anatomy for med students, CAD models for engineers reviewing designs, or an entire D&D table without a single miniature. The board game pitch still stands: one device, infinite boards, nothing to lose under the couch. The data-contribution protocol is also not fundamentally about planets. Anywhere there's an authoritative-but-incomplete dataset and a crowd of people who know things the authority doesn't — local maps, endangered species sightings, infrastructure damage after disasters — the same incentive mechanism works.

We came to StarkHacks to build a hologram. We're leaving with a thesis: the flat screen was a temporary compromise, and the gap between what humanity knows and what official datasets contain is a problem tokenized incentives were built to solve. Space was just the first planet we pointed it at.

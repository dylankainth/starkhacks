"""Core quad-view renderer for Pepper's Ghost holographic display.

Renders a 3D scene from four perspectives (Front 0deg, Right 90deg,
Back 180deg, Left 270deg) laid out on a 2x2 grid.  Each quadrant image
is horizontally mirrored because Pepper's Ghost reflects off angled
acrylic, which flips the image.
"""

from __future__ import annotations

import math
import time
import sys

import numpy as np
import pygame
from pygame.locals import *

from OpenGL.GL import *
from OpenGL.GLU import *

from hologram.camera import OrbitCamera
from hologram.scene import Scene


# Quadrant layout -- angles in degrees around Y axis
# ┌──────────┬──────────┐
# │  Front   │  Right   │
# │  (0deg)  │  (90deg) │
# ├──────────┼──────────┤
# │  Left    │  Back    │
# │  (270deg)│ (180deg) │
# └──────────┴──────────┘
_QUADRANTS = [
    {"label": "Front", "angle": 0.0,   "grid": (0, 0)},
    {"label": "Right", "angle": 90.0,  "grid": (1, 0)},
    {"label": "Left",  "angle": 270.0, "grid": (0, 1)},
    {"label": "Back",  "angle": 180.0, "grid": (1, 1)},
]


class QuadRenderer:
    """Renders a 3D scene from 4 perspectives for Pepper's Ghost display."""

    def __init__(self, width: int = 1920, height: int = 1080, fullscreen: bool = True):
        self.screen_w = width
        self.screen_h = height
        self.fullscreen = fullscreen

        # Each quadrant is half the screen in each dimension
        self.quad_w = width // 2
        self.quad_h = height // 2

        self.camera = OrbitCamera(distance=5.0, elevation=30.0, azimuth=0.0)

        self._running = False
        self._clock = None

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def _init_display(self):
        pygame.init()
        pygame.display.set_caption("Hologram -- Quad View")

        flags = DOUBLEBUF | OPENGL
        if self.fullscreen:
            flags |= FULLSCREEN
            info = pygame.display.Info()
            self.screen_w = info.current_w
            self.screen_h = info.current_h
            self.quad_w = self.screen_w // 2
            self.quad_h = self.screen_h // 2

        pygame.display.set_mode((self.screen_w, self.screen_h), flags)
        self._clock = pygame.time.Clock()

        # Global OpenGL state
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_COLOR_MATERIAL)
        glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE)
        glClearColor(0.0, 0.0, 0.0, 1.0)  # PURE BLACK -- critical for Pepper's Ghost
        glShadeModel(GL_SMOOTH)

    # ------------------------------------------------------------------
    # Per-quadrant rendering
    # ------------------------------------------------------------------

    def _setup_viewport(self, grid_col: int, grid_row: int):
        """Set glViewport and scissor for one quadrant."""
        x = grid_col * self.quad_w
        # OpenGL origin is bottom-left; pygame row 0 = top of screen
        y = (1 - grid_row) * self.quad_h
        glViewport(x, y, self.quad_w, self.quad_h)
        glEnable(GL_SCISSOR_TEST)
        glScissor(x, y, self.quad_w, self.quad_h)

    def _setup_projection(self):
        """Set perspective projection for one quadrant (roughly square aspect)."""
        aspect = self.quad_w / max(1, self.quad_h)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(45.0, aspect, 0.1, 100.0)

    def _apply_mirror(self):
        """Horizontally mirror the viewport for Pepper's Ghost reflection.

        We achieve this by scaling X by -1 *before* the projection, then
        flipping the front face so lighting/culling still work.
        """
        glMatrixMode(GL_PROJECTION)
        # Flip X axis in clip space
        glScalef(-1.0, 1.0, 1.0)
        glFrontFace(GL_CW)  # winding order reverses after mirror

    # ------------------------------------------------------------------
    # Frame rendering
    # ------------------------------------------------------------------

    def render_frame(self, scene: Scene, gesture_state: dict):
        """Render one complete frame (all 4 viewports)."""
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        for quad in _QUADRANTS:
            col, row = quad["grid"]
            angle = quad["angle"]

            # 1. viewport + scissor
            self._setup_viewport(col, row)

            # 2. projection (with mirror)
            self._setup_projection()
            self._apply_mirror()

            # 3. camera view with extra rotation for this quadrant
            self.camera.apply(extra_azimuth=angle)

            # 4. draw the scene
            glEnable(GL_DEPTH_TEST)
            scene.render(None, None)

            # 5. clean up
            glFrontFace(GL_CCW)
            glDisable(GL_SCISSOR_TEST)

        pygame.display.flip()

    # ------------------------------------------------------------------
    # Gesture processing
    # ------------------------------------------------------------------

    def _process_gesture(self, gesture: dict, scene: Scene):
        """Map gesture dict to camera / scene actions with smoothing."""
        gesture_name = gesture.get("gesture", "none")

        if gesture_name == "swipe_left":
            self.camera._target_azimuth -= 3.0
        elif gesture_name == "swipe_right":
            self.camera._target_azimuth += 3.0
        elif gesture_name == "open_palm":
            # Z-movement maps to zoom
            z = gesture.get("z", 0.0)
            self.camera.set_target_distance(self.camera.distance - z * 0.05)
        elif gesture_name == "fist":
            self.camera.reset()
        elif gesture_name == "pinch":
            # Could be used for selection -- forward to scene
            pass

    # ------------------------------------------------------------------
    # Keyboard / mouse fallback
    # ------------------------------------------------------------------

    def _process_events(self, scene: Scene) -> bool:
        """Handle pygame events.  Returns False when the app should quit."""
        for event in pygame.event.get():
            if event.type == QUIT:
                return False
            if event.type == KEYDOWN:
                if event.key == K_ESCAPE or event.key == K_q:
                    return False
                elif event.key == K_LEFT:
                    self.camera.rotate(-5.0)
                    if hasattr(scene, "handle_key"):
                        scene.handle_key("left")
                elif event.key == K_RIGHT:
                    self.camera.rotate(5.0)
                    if hasattr(scene, "handle_key"):
                        scene.handle_key("right")
                elif event.key == K_UP:
                    self.camera.rotate(0.0, 5.0)
                elif event.key == K_DOWN:
                    self.camera.rotate(0.0, -5.0)
                elif event.key == K_PLUS or event.key == K_EQUALS:
                    self.camera.zoom(-0.5)
                elif event.key == K_MINUS:
                    self.camera.zoom(0.5)
                elif event.key == K_SPACE:
                    if hasattr(scene, "handle_key"):
                        scene.handle_key("space")
                    else:
                        self.camera.reset()
                elif event.key == K_r:
                    if hasattr(scene, "handle_key"):
                        scene.handle_key("r")
                    else:
                        self.camera.reset()

        # Continuous key presses for smoother rotation
        keys = pygame.key.get_pressed()
        if keys[K_a]:
            self.camera._target_azimuth -= 2.0
        if keys[K_d]:
            self.camera._target_azimuth += 2.0
        if keys[K_w]:
            self.camera._target_elevation = min(89.0, self.camera._target_elevation + 2.0)
        if keys[K_s]:
            self.camera._target_elevation = max(-89.0, self.camera._target_elevation - 2.0)

        return True

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self, scene: Scene, gesture_source=None):
        """Main loop: initialise, then render + process input until quit.

        *gesture_source* is an optional object with ``get_gesture()``
        and ``get_velocity()`` methods (e.g. GestureReceiver).
        If ``None``, keyboard/mouse controls are used exclusively.
        """
        self._init_display()
        scene.setup()
        self._running = True

        last_time = time.monotonic()

        try:
            while self._running:
                now = time.monotonic()
                dt = now - last_time
                last_time = now

                # Input
                if not self._process_events(scene):
                    break

                # Gesture
                gesture: dict = {}
                if gesture_source is not None:
                    try:
                        gesture = gesture_source.get_gesture()
                        velocity = gesture_source.get_velocity()
                        # Merge velocity info into gesture dict for scene use
                        if velocity:
                            gesture.update(velocity)
                        if gesture:
                            self._process_gesture(gesture, scene)
                    except Exception:
                        pass

                # Update
                self.camera.smooth_update(dt)
                scene.update(dt, gesture)

                # Render
                self.render_frame(scene, gesture)

                self._clock.tick(60)
        finally:
            pygame.quit()

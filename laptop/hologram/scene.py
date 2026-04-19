"""Base scene class and demo scenes for the holographic display."""

from __future__ import annotations

import math
import random
import time
from abc import ABC, abstractmethod

import numpy as np
from OpenGL.GL import *
from OpenGL.GLU import *


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class Scene(ABC):
    """Abstract base for renderable 3D scenes."""

    @abstractmethod
    def setup(self):
        """One-time initialisation (called after OpenGL context exists)."""

    @abstractmethod
    def update(self, dt: float, gesture: dict):
        """Advance simulation by *dt* seconds, reacting to *gesture* state."""

    @abstractmethod
    def render(self, view_matrix_fn, projection_setup_fn):
        """Draw the scene.

        *view_matrix_fn* and *projection_setup_fn* are callables that the
        renderer has already invoked to set up GL state; the scene simply
        issues draw calls.
        """


# ---------------------------------------------------------------------------
# Solar System
# ---------------------------------------------------------------------------

class SolarSystemScene(Scene):
    """Rotating planets/spheres representing a solar system.

    Bright saturated colours on a pure-black background -- ideal for
    Pepper's Ghost.  Gesture controls:

    * swipe left/right  -> rotate view azimuth
    * open_palm z       -> zoom in/out
    * fist              -> reset view
    """

    def __init__(self):
        self._time = 0.0
        self._stars: list[tuple[float, float, float]] = []
        self._sun_quadric = None
        self._planet_quadric = None

        # Planet definitions: (orbit_radius, size, colour_rgb, orbit_speed, start_angle)
        self._planets = [
            (1.2, 0.12, (0.7, 0.7, 0.9), 1.8, random.uniform(0, 2 * math.pi)),   # Mercury
            (1.8, 0.18, (1.0, 0.8, 0.3), 1.2, random.uniform(0, 2 * math.pi)),   # Venus
            (2.5, 0.20, (0.2, 0.5, 1.0), 0.8, random.uniform(0, 2 * math.pi)),   # Earth
            (3.3, 0.15, (1.0, 0.3, 0.2), 0.5, random.uniform(0, 2 * math.pi)),   # Mars
        ]

    # -- lifecycle ----------------------------------------------------------

    def setup(self):
        # Stars: random points on a large sphere
        self._stars = []
        for _ in range(400):
            theta = random.uniform(0, 2 * math.pi)
            phi = random.uniform(-math.pi / 2, math.pi / 2)
            r = 15.0
            x = r * math.cos(phi) * math.cos(theta)
            y = r * math.sin(phi)
            z = r * math.cos(phi) * math.sin(theta)
            self._stars.append((x, y, z))

        self._sun_quadric = gluNewQuadric()
        gluQuadricNormals(self._sun_quadric, GLU_SMOOTH)
        self._planet_quadric = gluNewQuadric()
        gluQuadricNormals(self._planet_quadric, GLU_SMOOTH)

    def update(self, dt: float, gesture: dict):
        self._time += dt

    # -- drawing ------------------------------------------------------------

    def render(self, view_matrix_fn, projection_setup_fn):
        """Called once per viewport after the renderer sets GL matrices."""
        self._draw_stars()
        self._draw_sun()
        self._draw_orbits()
        self._draw_planets()

    def _draw_stars(self):
        glDisable(GL_LIGHTING)
        glPointSize(2.0)
        glBegin(GL_POINTS)
        for x, y, z in self._stars:
            brightness = random.uniform(0.5, 1.0)  # twinkle
            glColor3f(brightness, brightness, brightness)
            glVertex3f(x, y, z)
        glEnd()

    def _draw_sun(self):
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)
        # Sun emits light
        glLightfv(GL_LIGHT0, GL_POSITION, [0.0, 0.0, 0.0, 1.0])
        glLightfv(GL_LIGHT0, GL_DIFFUSE, [1.0, 1.0, 0.9, 1.0])
        glLightfv(GL_LIGHT0, GL_AMBIENT, [0.15, 0.15, 0.1, 1.0])

        # Sun material: bright yellow, emissive
        glMaterialfv(GL_FRONT, GL_EMISSION, [1.0, 0.85, 0.2, 1.0])
        glMaterialfv(GL_FRONT, GL_DIFFUSE, [1.0, 0.9, 0.3, 1.0])
        glMaterialfv(GL_FRONT, GL_AMBIENT, [0.3, 0.25, 0.05, 1.0])

        glPushMatrix()
        # Gentle pulsing
        pulse = 0.35 + 0.03 * math.sin(self._time * 2.0)
        glScalef(pulse, pulse, pulse)
        gluSphere(self._sun_quadric, 1.0, 32, 32)
        glPopMatrix()

        # Reset emission for other objects
        glMaterialfv(GL_FRONT, GL_EMISSION, [0.0, 0.0, 0.0, 1.0])

    def _draw_orbits(self):
        glDisable(GL_LIGHTING)
        glLineWidth(1.0)
        for orbit_r, _sz, colour, _spd, _sa in self._planets:
            glColor3f(colour[0] * 0.3, colour[1] * 0.3, colour[2] * 0.3)
            glBegin(GL_LINE_LOOP)
            for i in range(120):
                a = 2 * math.pi * i / 120
                glVertex3f(orbit_r * math.cos(a), 0.0, orbit_r * math.sin(a))
            glEnd()

    def _draw_planets(self):
        glEnable(GL_LIGHTING)
        for orbit_r, size, colour, speed, start in self._planets:
            angle = start + self._time * speed
            px = orbit_r * math.cos(angle)
            pz = orbit_r * math.sin(angle)

            glMaterialfv(GL_FRONT, GL_DIFFUSE, [colour[0], colour[1], colour[2], 1.0])
            glMaterialfv(GL_FRONT, GL_AMBIENT, [colour[0] * 0.3, colour[1] * 0.3, colour[2] * 0.3, 1.0])
            glMaterialfv(GL_FRONT, GL_SPECULAR, [0.4, 0.4, 0.4, 1.0])
            glMaterialf(GL_FRONT, GL_SHININESS, 30.0)

            glPushMatrix()
            glTranslatef(px, 0.0, pz)
            # Tilt planet slightly for visual interest
            glRotatef(20.0, 1.0, 0.0, 0.0)
            gluSphere(self._planet_quadric, size, 20, 20)
            glPopMatrix()


# ---------------------------------------------------------------------------
# Connect 4
# ---------------------------------------------------------------------------

class Connect4Scene(Scene):
    """3D Connect 4 game rendered for holographic display.

    Gesture controls:

    * swipe left/right  -> move cursor column
    * fist              -> drop piece
    * open_palm         -> reset game
    """

    ROWS = 6
    COLS = 7
    EMPTY = 0
    RED = 1
    YELLOW = 2

    def __init__(self):
        self._board = np.zeros((self.ROWS, self.COLS), dtype=int)
        self._current_player = self.RED
        self._cursor_col = 3
        self._winner = self.EMPTY
        self._quadric = None
        self._time = 0.0
        self._drop_anim: dict | None = None  # {col, row, player, progress}

        # Cooldowns for gesture-based controls
        self._last_swipe_time = 0.0
        self._last_fist_time = 0.0

    def setup(self):
        self._quadric = gluNewQuadric()
        gluQuadricNormals(self._quadric, GLU_SMOOTH)

    def update(self, dt: float, gesture: dict):
        self._time += dt

        # Process drop animation
        if self._drop_anim is not None:
            self._drop_anim["progress"] += dt * 4.0  # speed
            if self._drop_anim["progress"] >= 1.0:
                self._drop_anim = None

        # Gesture handling with cooldowns
        gesture_name = gesture.get("gesture", "none")
        now = time.time()

        if gesture_name == "swipe_left" and now - self._last_swipe_time > 0.3:
            self._cursor_col = max(0, self._cursor_col - 1)
            self._last_swipe_time = now
        elif gesture_name == "swipe_right" and now - self._last_swipe_time > 0.3:
            self._cursor_col = min(self.COLS - 1, self._cursor_col + 1)
            self._last_swipe_time = now
        elif gesture_name == "fist" and now - self._last_fist_time > 0.5:
            self._try_drop(self._cursor_col)
            self._last_fist_time = now
        elif gesture_name == "open_palm":
            self._reset_game()

    def _try_drop(self, col: int):
        if self._winner != self.EMPTY or self._drop_anim is not None:
            return
        # Find lowest empty row in column
        for row in range(self.ROWS - 1, -1, -1):
            if self._board[row][col] == self.EMPTY:
                self._board[row][col] = self._current_player
                self._drop_anim = {
                    "col": col, "row": row,
                    "player": self._current_player,
                    "progress": 0.0,
                }
                self._check_win(row, col)
                self._current_player = self.YELLOW if self._current_player == self.RED else self.RED
                return

    def _check_win(self, row: int, col: int):
        player = self._board[row][col]
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dr, dc in directions:
            count = 1
            for sign in (1, -1):
                r, c = row + dr * sign, col + dc * sign
                while 0 <= r < self.ROWS and 0 <= c < self.COLS and self._board[r][c] == player:
                    count += 1
                    r += dr * sign
                    c += dc * sign
            if count >= 4:
                self._winner = player
                return

    def _reset_game(self):
        self._board[:] = self.EMPTY
        self._current_player = self.RED
        self._winner = self.EMPTY
        self._cursor_col = 3
        self._drop_anim = None

    # -- rendering ----------------------------------------------------------

    def render(self, view_matrix_fn, projection_setup_fn):
        self._draw_frame_structure()
        self._draw_pieces()
        self._draw_cursor()
        if self._winner != self.EMPTY:
            self._draw_winner_effect()

    def _board_pos(self, row: int, col: int) -> tuple[float, float, float]:
        """Map (row, col) to 3D world coords.  Row 0 = top, ROWS-1 = bottom."""
        spacing = 0.45
        x = (col - (self.COLS - 1) / 2.0) * spacing
        y = ((self.ROWS - 1) / 2.0 - row) * spacing
        z = 0.0
        return x, y, z

    def _draw_frame_structure(self):
        """Draw the board grid as bright blue wireframe."""
        glDisable(GL_LIGHTING)
        glLineWidth(2.0)
        glColor3f(0.15, 0.35, 0.9)

        spacing = 0.45
        half_w = self.COLS / 2.0 * spacing
        half_h = self.ROWS / 2.0 * spacing
        depth = 0.15

        # Vertical dividers
        for c in range(self.COLS + 1):
            x = (c - self.COLS / 2.0) * spacing
            glBegin(GL_LINE_STRIP)
            glVertex3f(x, -half_h, -depth)
            glVertex3f(x, -half_h, depth)
            glVertex3f(x, half_h, depth)
            glVertex3f(x, half_h, -depth)
            glVertex3f(x, -half_h, -depth)
            glEnd()

        # Horizontal dividers
        for r in range(self.ROWS + 1):
            y = (r - self.ROWS / 2.0) * spacing
            glBegin(GL_LINE_STRIP)
            glVertex3f(-half_w, y, -depth)
            glVertex3f(-half_w, y, depth)
            glVertex3f(half_w, y, depth)
            glVertex3f(half_w, y, -depth)
            glVertex3f(-half_w, y, -depth)
            glEnd()

    def _draw_pieces(self):
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)
        glLightfv(GL_LIGHT0, GL_POSITION, [2.0, 5.0, 5.0, 0.0])
        glLightfv(GL_LIGHT0, GL_DIFFUSE, [1.0, 1.0, 1.0, 1.0])
        glLightfv(GL_LIGHT0, GL_AMBIENT, [0.2, 0.2, 0.2, 1.0])

        for row in range(self.ROWS):
            for col in range(self.COLS):
                piece = self._board[row][col]
                if piece == self.EMPTY:
                    continue

                x, y, z = self._board_pos(row, col)

                # Animate current drop
                if (self._drop_anim is not None
                        and self._drop_anim["col"] == col
                        and self._drop_anim["row"] == row):
                    t = min(1.0, self._drop_anim["progress"])
                    # Ease-out bounce
                    t_ease = 1.0 - (1.0 - t) ** 2
                    top_y = self._board_pos(0, col)[1] + 0.5
                    y = top_y + (y - top_y) * t_ease

                if piece == self.RED:
                    glMaterialfv(GL_FRONT, GL_DIFFUSE, [1.0, 0.15, 0.15, 1.0])
                    glMaterialfv(GL_FRONT, GL_AMBIENT, [0.4, 0.05, 0.05, 1.0])
                    glMaterialfv(GL_FRONT, GL_EMISSION, [0.3, 0.0, 0.0, 1.0])
                else:
                    glMaterialfv(GL_FRONT, GL_DIFFUSE, [1.0, 0.95, 0.1, 1.0])
                    glMaterialfv(GL_FRONT, GL_AMBIENT, [0.4, 0.35, 0.02, 1.0])
                    glMaterialfv(GL_FRONT, GL_EMISSION, [0.3, 0.28, 0.0, 1.0])

                glMaterialfv(GL_FRONT, GL_SPECULAR, [0.6, 0.6, 0.6, 1.0])
                glMaterialf(GL_FRONT, GL_SHININESS, 40.0)

                glPushMatrix()
                glTranslatef(x, y, z)
                gluSphere(self._quadric, 0.16, 20, 20)
                glPopMatrix()

        # Reset emission
        glMaterialfv(GL_FRONT, GL_EMISSION, [0.0, 0.0, 0.0, 1.0])

    def _draw_cursor(self):
        """Bright indicator above the selected column."""
        if self._winner != self.EMPTY:
            return
        glDisable(GL_LIGHTING)

        x, _, _ = self._board_pos(0, self._cursor_col)
        top_y = self._board_pos(0, self._cursor_col)[1] + 0.45

        # Pulsing triangle
        pulse = 0.5 + 0.5 * math.sin(self._time * 6.0)
        if self._current_player == self.RED:
            glColor3f(1.0, 0.2 * pulse, 0.2 * pulse)
        else:
            glColor3f(1.0, 0.95, 0.1 * pulse)

        sz = 0.08
        glBegin(GL_TRIANGLES)
        glVertex3f(x - sz, top_y + sz, 0.0)
        glVertex3f(x + sz, top_y + sz, 0.0)
        glVertex3f(x, top_y, 0.0)
        glEnd()

    def _draw_winner_effect(self):
        """Pulsing glow ring around the board when someone wins."""
        glDisable(GL_LIGHTING)
        pulse = 0.5 + 0.5 * math.sin(self._time * 4.0)
        if self._winner == self.RED:
            glColor3f(1.0, pulse * 0.3, pulse * 0.3)
        else:
            glColor3f(1.0, 0.95, pulse * 0.3)

        glLineWidth(3.0)
        radius = 2.2
        glBegin(GL_LINE_LOOP)
        for i in range(60):
            a = 2 * math.pi * i / 60
            glVertex3f(radius * math.cos(a), radius * math.sin(a), 0.0)
        glEnd()

    # -- keyboard shortcuts (used by QuadRenderer) -------------------------

    def handle_key(self, key: str):
        if key == "left":
            self._cursor_col = max(0, self._cursor_col - 1)
        elif key == "right":
            self._cursor_col = min(self.COLS - 1, self._cursor_col + 1)
        elif key == "space":
            self._try_drop(self._cursor_col)
        elif key == "r":
            self._reset_game()

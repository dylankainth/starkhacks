"""Holographic moon display for a 4-sided Pepper's ghost pyramid.

Run:
    python moon.py
"""

from __future__ import annotations

import math
import random
import sys
from dataclasses import dataclass

import pygame
from OpenGL.GL import (
    GL_BLEND,
    GL_COLOR_BUFFER_BIT,
    GL_CULL_FACE,
    GL_DEPTH_BUFFER_BIT,
    GL_DEPTH_TEST,
    GL_FALSE,
    GL_MODELVIEW,
    GL_ONE_MINUS_SRC_ALPHA,
    GL_PROJECTION,
    GL_SCISSOR_TEST,
    GL_SRC_ALPHA,
    GL_SMOOTH,
    GL_TRIANGLE_STRIP,
    GL_TRIANGLES,
    glBegin,
    glBlendFunc,
    glClear,
    glClearColor,
    glColor4f,
    glDepthMask,
    glDisable,
    glEnable,
    glEnd,
    glLoadIdentity,
    glMatrixMode,
    glPopMatrix,
    glPushMatrix,
    glRotatef,
    glScalef,
    glScissor,
    glShadeModel,
    glVertex2f,
    glVertex3f,
    glViewport,
)
from OpenGL.GLU import gluLookAt, gluOrtho2D, gluPerspective


WINDOWED_SIZE = (1200, 1200)
FPS = 60

BASE_TINT = (0.94, 0.96, 1.0)
LIGHT_DIR = (0.48, 0.72, 0.50)
AMBIENT = 0.16
DIFFUSE = 0.95


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize(vector: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = vector
    length = math.sqrt(x * x + y * y + z * z)
    if length <= 1e-8:
        return 0.0, 0.0, 0.0
    return x / length, y / length, z / length


LIGHT_DIR = normalize(LIGHT_DIR)


@dataclass(frozen=True)
class Crater:
    cx: float
    cy: float
    cz: float
    radius: float
    bowl_depth: float
    rim_gain: float
    bowl_sigma: float
    rim_sigma: float
    influence_cos: float


class MoonMesh:
    def __init__(self, stacks: int = 36, slices: int = 72, seed: int = 7) -> None:
        self.rings: list[list[tuple[float, float, float, float]]] = []
        self.craters = self._build_craters(seed)
        self._build_mesh(stacks, slices)

    def _build_craters(self, seed: int) -> list[Crater]:
        rng = random.Random(seed)
        craters: list[Crater] = []

        for index in range(48):
            u = rng.random()
            v = rng.random()
            theta = 2.0 * math.pi * u
            phi = math.acos(2.0 * v - 1.0)
            cx = math.sin(phi) * math.cos(theta)
            cy = math.cos(phi)
            cz = math.sin(phi) * math.sin(theta)

            if index < 12:
                radius = rng.uniform(0.12, 0.20)
                bowl_depth = rng.uniform(0.26, 0.42)
                rim_gain = rng.uniform(0.10, 0.18)
            else:
                radius = rng.uniform(0.03, 0.10)
                bowl_depth = rng.uniform(0.12, 0.28)
                rim_gain = rng.uniform(0.04, 0.11)

            bowl_sigma = radius * rng.uniform(0.42, 0.58)
            rim_sigma = radius * rng.uniform(0.18, 0.28)
            influence_cos = math.cos(radius * rng.uniform(2.5, 3.2))

            craters.append(
                Crater(
                    cx=cx,
                    cy=cy,
                    cz=cz,
                    radius=radius,
                    bowl_depth=bowl_depth,
                    rim_gain=rim_gain,
                    bowl_sigma=bowl_sigma,
                    rim_sigma=rim_sigma,
                    influence_cos=influence_cos,
                )
            )

        return craters

    def _surface_albedo(self, nx: float, ny: float, nz: float) -> float:
        warm_variation = 0.02 * math.sin(7.0 * nx + 5.0 * ny) + 0.015 * math.sin(11.0 * nz + 3.0 * nx)
        albedo = 0.80 + warm_variation

        for crater in self.craters:
            dot = nx * crater.cx + ny * crater.cy + nz * crater.cz
            if dot < crater.influence_cos:
                continue

            angle = math.acos(clamp(dot, -1.0, 1.0))
            bowl = math.exp(-((angle / crater.bowl_sigma) ** 2))
            rim_offset = abs(angle - crater.radius * 0.95)
            rim = math.exp(-((rim_offset / crater.rim_sigma) ** 2))

            albedo -= crater.bowl_depth * bowl
            albedo += crater.rim_gain * rim

        return clamp(albedo, 0.35, 1.0)

    def _build_mesh(self, stacks: int, slices: int) -> None:
        for stack in range(stacks):
            lat0 = math.pi * (-0.5 + stack / stacks)
            lat1 = math.pi * (-0.5 + (stack + 1) / stacks)
            z0 = math.sin(lat0)
            z1 = math.sin(lat1)
            zr0 = math.cos(lat0)
            zr1 = math.cos(lat1)

            ring: list[tuple[float, float, float, float]] = []

            for slice_index in range(slices + 1):
                lon = 2.0 * math.pi * (slice_index / slices)
                x = math.cos(lon)
                y = math.sin(lon)

                nx0 = x * zr0
                ny0 = y * zr0
                nz0 = z0
                albedo0 = self._surface_albedo(nx0, ny0, nz0)
                ring.append((nx0, ny0, nz0, albedo0))

                nx1 = x * zr1
                ny1 = y * zr1
                nz1 = z1
                albedo1 = self._surface_albedo(nx1, ny1, nz1)
                ring.append((nx1, ny1, nz1, albedo1))

            self.rings.append(ring)

    def draw(self, camera_dir: tuple[float, float, float], spin_deg: float = 0.0) -> None:
        lx, ly, lz = LIGHT_DIR
        vx, vy, vz = camera_dir

        glPushMatrix()
        glRotatef(spin_deg, 0.0, 1.0, 0.0)

        for ring in self.rings:
            glBegin(GL_TRIANGLE_STRIP)
            for nx, ny, nz, albedo in ring:
                lambert = max(0.0, nx * lx + ny * ly + nz * lz)
                view = max(0.0, nx * vx + ny * vy + nz * vz)
                limb = 0.50 + 0.50 * (view ** 0.38)
                light = (AMBIENT + DIFFUSE * lambert) * limb
                brightness = clamp(albedo * light, 0.0, 1.25)

                r = clamp(BASE_TINT[0] * brightness, 0.0, 1.0)
                g = clamp(BASE_TINT[1] * brightness, 0.0, 1.0)
                b = clamp(BASE_TINT[2] * brightness, 0.0, 1.0)
                glColor4f(r, g, b, 1.0)
                glVertex3f(nx, ny, nz)
            glEnd()

        glPopMatrix()

    def draw_halo(self) -> None:
        glPushMatrix()
        glScalef(1.04, 1.04, 1.04)
        glColor4f(0.25, 0.45, 0.65, 0.08)
        for ring in self.rings[::4]:
            glBegin(GL_TRIANGLE_STRIP)
            for nx, ny, nz, _ in ring:
                glVertex3f(nx, ny, nz)
            glEnd()
        glPopMatrix()


def draw_filled_triangle(points: tuple[tuple[float, float], tuple[float, float], tuple[float, float]]) -> None:
    glBegin(GL_TRIANGLES)
    for px, py in points:
        glVertex2f(px, py)
    glEnd()


class App:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Holographic Moon")

        self.fullscreen = False
        self.window_size = WINDOWED_SIZE
        self.screen = self._create_display(self.window_size, self.fullscreen)

        self.mesh = MoonMesh()
        self.clock = pygame.time.Clock()

        self.orbit_yaw = 20.0
        self.orbit_pitch = 12.0
        self.distance = 3.4
        self.target = [0.0, 0.0, 0.0]
        self.spin = 0.0

        self.dragging_orbit = False
        self.dragging_pan = False
        self.last_mouse = (0, 0)

    def _create_display(self, size: tuple[int, int], fullscreen: bool):
        flags = pygame.OPENGL | pygame.DOUBLEBUF
        if fullscreen:
            flags |= pygame.FULLSCREEN
            size = (0, 0)

        screen = pygame.display.set_mode(size, flags)
        width, height = screen.get_size()
        self._configure_gl(width, height)
        return screen

    def _configure_gl(self, width: int, height: int) -> None:
        glClearColor(0.0, 0.0, 0.0, 1.0)
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_SCISSOR_TEST)
        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        glDisable(GL_CULL_FACE)
        glShadeModel(GL_SMOOTH)
        glDepthMask(True)

        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        aspect = max(1.0, width / max(1.0, height))
        gluPerspective(38.0, aspect, 0.1, 50.0)
        glMatrixMode(GL_MODELVIEW)

    def toggle_fullscreen(self) -> None:
        self.fullscreen = not self.fullscreen
        self.screen = self._create_display(self.window_size, self.fullscreen)

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_q, pygame.K_ESCAPE):
                return False
            if event.key == pygame.K_f:
                self.toggle_fullscreen()

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                self.dragging_orbit = True
                self.last_mouse = event.pos
            elif event.button in (2, 3):
                self.dragging_pan = True
                self.last_mouse = event.pos
            elif event.button == 4:
                self.distance = max(1.7, self.distance * 0.92)
            elif event.button == 5:
                self.distance = min(8.0, self.distance * 1.08)

        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1:
                self.dragging_orbit = False
            elif event.button in (2, 3):
                self.dragging_pan = False

        elif event.type == pygame.MOUSEMOTION:
            if self.dragging_orbit:
                dx, dy = event.rel
                self.orbit_yaw += dx * 0.35
                self.orbit_pitch = clamp(self.orbit_pitch - dy * 0.30, -80.0, 80.0)
            elif self.dragging_pan:
                dx, dy = event.rel
                pan_scale = self.distance * 0.0018
                self.target[0] -= dx * pan_scale
                self.target[1] += dy * pan_scale

        elif event.type == pygame.MOUSEWHEEL:
            zoom_factor = 0.90 if event.y > 0 else 1.10
            self.distance = clamp(self.distance * zoom_factor, 1.7, 8.0)

        elif event.type == pygame.VIDEORESIZE:
            self.window_size = (max(320, event.w), max(320, event.h))
            if not self.fullscreen:
                self.screen = self._create_display(self.window_size, self.fullscreen)

        return True

    def _camera_position(self, base_yaw: float) -> tuple[float, float, float]:
        yaw = math.radians(self.orbit_yaw + base_yaw)
        pitch = math.radians(self.orbit_pitch)
        dist = self.distance

        cos_pitch = math.cos(pitch)
        x = self.target[0] + dist * cos_pitch * math.cos(yaw)
        y = self.target[1] + dist * math.sin(pitch)
        z = self.target[2] + dist * cos_pitch * math.sin(yaw)
        return x, y, z

    def _render_quadrant(self, x: int, y: int, width: int, height: int, base_yaw: float) -> None:
        if width <= 0 or height <= 0:
            return

        glViewport(x, y, width, height)
        glScissor(x, y, width, height)

        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(38.0, width / float(height), 0.1, 50.0)

        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()

        cam_x, cam_y, cam_z = self._camera_position(base_yaw)
        target_x, target_y, target_z = self.target

        gluLookAt(
            cam_x,
            cam_y,
            cam_z,
            target_x,
            target_y,
            target_z,
            0.0,
            1.0,
            0.0,
        )

        forward = normalize((target_x - cam_x, target_y - cam_y, target_z - cam_z))
        self.mesh.draw(forward, self.spin)

        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        self.mesh.draw_halo()

    def _draw_corner_masks(self, width: int, height: int, split_x: int, split_y: int) -> None:
        glDisable(GL_DEPTH_TEST)
        glDisable(GL_BLEND)
        glDisable(GL_SCISSOR_TEST)

        glMatrixMode(GL_PROJECTION)
        glPushMatrix()
        glLoadIdentity()
        gluOrtho2D(0.0, float(width), 0.0, float(height))

        glMatrixMode(GL_MODELVIEW)
        glPushMatrix()
        glLoadIdentity()

        glColor4f(0.0, 0.0, 0.0, 1.0)

        # Top quadrant: keep the center-pointing triangle with base on the top edge.
        draw_filled_triangle(((0.0, float(split_y)), (0.0, float(height)), (float(split_x), float(split_y))))
        draw_filled_triangle(((float(width), float(split_y)), (float(width), float(height)), (float(split_x), float(split_y))))

        # Bottom quadrant: keep the center-pointing triangle with base on the bottom edge.
        draw_filled_triangle(((0.0, 0.0), (0.0, float(split_y)), (float(split_x), float(split_y))))
        draw_filled_triangle(((float(width), 0.0), (float(width), float(split_y)), (float(split_x), float(split_y))))

        # Left quadrant: keep the center-pointing triangle with base on the left edge.
        draw_filled_triangle(((float(split_x), float(height)), (0.0, float(height)), (float(split_x), float(split_y))))
        draw_filled_triangle(((float(split_x), 0.0), (0.0, 0.0), (float(split_x), float(split_y))))

        # Right quadrant: keep the center-pointing triangle with base on the right edge.
        draw_filled_triangle(((float(split_x), float(height)), (float(width), float(height)), (float(split_x), float(split_y))))
        draw_filled_triangle(((float(split_x), 0.0), (float(width), 0.0), (float(split_x), float(split_y))))

        glPopMatrix()
        glMatrixMode(GL_PROJECTION)
        glPopMatrix()
        glMatrixMode(GL_MODELVIEW)

    def render(self) -> None:
        width, height = self.screen.get_size()
        split_x = int(round(width * 0.5))
        split_y = int(round(height * 0.5))

        glScissor(0, 0, width, height)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        quadrants = [
            (0, split_y, split_x, height - split_y, 180.0),
            (split_x, split_y, width - split_x, height - split_y, 90.0),
            (0, 0, split_x, split_y, 270.0),
            (split_x, 0, width - split_x, split_y, 0.0),
        ]

        glEnable(GL_BLEND)
        for qx, qy, qw, qh, yaw in quadrants:
            self._render_quadrant(qx, qy, qw, qh, yaw)

        self._draw_corner_masks(width, height, split_x, split_y)

        pygame.display.flip()

    def run(self) -> None:
        running = True
        while running:
            for event in pygame.event.get():
                running = self.handle_event(event)
                if not running:
                    break

            self.spin = (self.spin + 0.08) % 360.0
            self.render()
            self.clock.tick(FPS)


def main() -> int:
    try:
        app = App()
        app.run()
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Moon display failed: {exc}", file=sys.stderr)
        return 1
    finally:
        pygame.quit()


if __name__ == "__main__":
    raise SystemExit(main())
"""Orbit camera for computing view transforms in legacy OpenGL."""

import math
import numpy as np
from OpenGL.GL import *
from OpenGL.GLU import *


class OrbitCamera:
    """Orbit camera that rotates around a center point.

    Uses spherical coordinates (distance, elevation, azimuth) to position the
    camera on a sphere looking at ``center``.
    """

    def __init__(self, distance: float = 5.0, elevation: float = 30.0, azimuth: float = 0.0):
        self.distance = distance
        self.elevation = elevation  # degrees above the horizon
        self.azimuth = azimuth  # degrees around Y axis
        self.center = np.array([0.0, 0.0, 0.0])

        # Smoothing targets (for lerp-based gesture input)
        self._target_azimuth = azimuth
        self._target_elevation = elevation
        self._target_distance = distance

        # Limits
        self.min_distance = 1.5
        self.max_distance = 20.0
        self.min_elevation = -89.0
        self.max_elevation = 89.0

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def apply(self, extra_azimuth: float = 0.0):
        """Apply this camera's view transform to the current modelview matrix.

        *extra_azimuth* (degrees) is added on top of ``self.azimuth`` so the
        four Pepper's Ghost viewpoints can share one camera object and just
        pass 0, 90, 180, 270.
        """
        az = math.radians(self.azimuth + extra_azimuth)
        el = math.radians(self.elevation)

        # Spherical -> Cartesian (Y-up)
        cos_el = math.cos(el)
        eye_x = self.center[0] + self.distance * cos_el * math.sin(az)
        eye_y = self.center[1] + self.distance * math.sin(el)
        eye_z = self.center[2] + self.distance * cos_el * math.cos(az)

        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()
        gluLookAt(
            eye_x, eye_y, eye_z,
            self.center[0], self.center[1], self.center[2],
            0.0, 1.0, 0.0,
        )

    def rotate(self, d_azimuth: float, d_elevation: float = 0.0):
        """Instantly rotate the camera."""
        self.azimuth += d_azimuth
        self.elevation = max(self.min_elevation, min(self.max_elevation, self.elevation + d_elevation))
        self._target_azimuth = self.azimuth
        self._target_elevation = self.elevation

    def zoom(self, dz: float):
        """Instantly change distance (positive = zoom out)."""
        self.distance = max(self.min_distance, min(self.max_distance, self.distance + dz))
        self._target_distance = self.distance

    def set_target_azimuth(self, az: float):
        self._target_azimuth = az

    def set_target_distance(self, d: float):
        self._target_distance = max(self.min_distance, min(self.max_distance, d))

    def smooth_update(self, dt: float, factor: float = 8.0):
        """Lerp current values toward targets for smooth gesture input."""
        t = min(1.0, factor * dt)
        self.azimuth += (self._target_azimuth - self.azimuth) * t
        self.elevation += (self._target_elevation - self.elevation) * t
        self.distance += (self._target_distance - self.distance) * t

    def reset(self, distance: float = 5.0, elevation: float = 30.0, azimuth: float = 0.0):
        self.distance = self._target_distance = distance
        self.elevation = self._target_elevation = elevation
        self.azimuth = self._target_azimuth = azimuth

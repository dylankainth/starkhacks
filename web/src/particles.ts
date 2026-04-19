import * as THREE from 'three';

const MAX_PARTICLES = 300;

export class ParticleField {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private baseColors: Float32Array;
  private colors: Float32Array;
  private ages: Float32Array;
  private lifetimes: Float32Array;
  private next = 0;

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.baseColors = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.ages = new Float32Array(MAX_PARTICLES);
    this.lifetimes = new Float32Array(MAX_PARTICLES);
    this.positions.fill(1e6);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  burst(
    pos: THREE.Vector3,
    color: THREE.Color,
    count = 24,
    speed = 0.9,
    lifetime = 0.75,
  ): void {
    for (let i = 0; i < count; i++) {
      const idx = this.next;
      this.next = (this.next + 1) % MAX_PARTICLES;
      const o = idx * 3;

      this.positions[o] = pos.x;
      this.positions[o + 1] = pos.y;
      this.positions[o + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + 0.8 * Math.random());
      this.velocities[o] = s * Math.sin(phi) * Math.cos(theta);
      this.velocities[o + 1] = s * Math.cos(phi);
      this.velocities[o + 2] = s * Math.sin(phi) * Math.sin(theta);

      this.baseColors[o] = color.r;
      this.baseColors[o + 1] = color.g;
      this.baseColors[o + 2] = color.b;

      this.ages[idx] = 0;
      this.lifetimes[idx] = lifetime * (0.7 + 0.6 * Math.random());
    }
  }

  update(dt: number): void {
    const damp = Math.pow(0.88, dt * 60);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.lifetimes[i] <= 0) continue;
      this.ages[i] += dt;
      const frac = this.ages[i] / this.lifetimes[i];
      if (frac >= 1) {
        this.lifetimes[i] = 0;
        const o = i * 3;
        this.positions[o] = 1e6;
        this.colors[o] = 0;
        this.colors[o + 1] = 0;
        this.colors[o + 2] = 0;
        continue;
      }
      const o = i * 3;
      this.positions[o] += this.velocities[o] * dt;
      this.positions[o + 1] += this.velocities[o + 1] * dt - 0.8 * dt;
      this.positions[o + 2] += this.velocities[o + 2] * dt;
      this.velocities[o] *= damp;
      this.velocities[o + 1] *= damp;
      this.velocities[o + 2] *= damp;
      const fade = 1 - frac;
      this.colors[o] = this.baseColors[o] * fade;
      this.colors[o + 1] = this.baseColors[o + 1] * fade;
      this.colors[o + 2] = this.baseColors[o + 2] * fade;
    }
    const geo = this.points.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}

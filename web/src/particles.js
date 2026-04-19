"use strict";
exports.__esModule = true;
exports.ParticleField = void 0;
var THREE = require("three");
var MAX_PARTICLES = 300;
var ParticleField = /** @class */ (function () {
    function ParticleField() {
        this.next = 0;
        this.positions = new Float32Array(MAX_PARTICLES * 3);
        this.velocities = new Float32Array(MAX_PARTICLES * 3);
        this.baseColors = new Float32Array(MAX_PARTICLES * 3);
        this.colors = new Float32Array(MAX_PARTICLES * 3);
        this.ages = new Float32Array(MAX_PARTICLES);
        this.lifetimes = new Float32Array(MAX_PARTICLES);
        this.positions.fill(1e6);
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        var mat = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.points = new THREE.Points(geo, mat);
        this.points.frustumCulled = false;
    }
    ParticleField.prototype.burst = function (pos, color, count, speed, lifetime) {
        if (count === void 0) { count = 24; }
        if (speed === void 0) { speed = 0.9; }
        if (lifetime === void 0) { lifetime = 0.75; }
        for (var i = 0; i < count; i++) {
            var idx = this.next;
            this.next = (this.next + 1) % MAX_PARTICLES;
            var o = idx * 3;
            this.positions[o] = pos.x;
            this.positions[o + 1] = pos.y;
            this.positions[o + 2] = pos.z;
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            var s = speed * (0.4 + 0.8 * Math.random());
            this.velocities[o] = s * Math.sin(phi) * Math.cos(theta);
            this.velocities[o + 1] = s * Math.cos(phi);
            this.velocities[o + 2] = s * Math.sin(phi) * Math.sin(theta);
            this.baseColors[o] = color.r;
            this.baseColors[o + 1] = color.g;
            this.baseColors[o + 2] = color.b;
            this.ages[idx] = 0;
            this.lifetimes[idx] = lifetime * (0.7 + 0.6 * Math.random());
        }
    };
    ParticleField.prototype.update = function (dt) {
        var damp = Math.pow(0.88, dt * 60);
        for (var i = 0; i < MAX_PARTICLES; i++) {
            if (this.lifetimes[i] <= 0)
                continue;
            this.ages[i] += dt;
            var frac = this.ages[i] / this.lifetimes[i];
            if (frac >= 1) {
                this.lifetimes[i] = 0;
                var o_1 = i * 3;
                this.positions[o_1] = 1e6;
                this.colors[o_1] = 0;
                this.colors[o_1 + 1] = 0;
                this.colors[o_1 + 2] = 0;
                continue;
            }
            var o = i * 3;
            this.positions[o] += this.velocities[o] * dt;
            this.positions[o + 1] += this.velocities[o + 1] * dt - 0.8 * dt;
            this.positions[o + 2] += this.velocities[o + 2] * dt;
            this.velocities[o] *= damp;
            this.velocities[o + 1] *= damp;
            this.velocities[o + 2] *= damp;
            var fade = 1 - frac;
            this.colors[o] = this.baseColors[o] * fade;
            this.colors[o + 1] = this.baseColors[o + 1] * fade;
            this.colors[o + 2] = this.baseColors[o + 2] * fade;
        }
        var geo = this.points.geometry;
        geo.getAttribute('position').needsUpdate = true;
        geo.getAttribute('color').needsUpdate = true;
    };
    return ParticleField;
}());
exports.ParticleField = ParticleField;

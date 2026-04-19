"use strict";
exports.__esModule = true;
exports.createSidePanel = exports.SIDE_PANEL_LAYER = void 0;
var THREE = require("three");
var game_1 = require("./game");
var board_1 = require("./board");
exports.SIDE_PANEL_LAYER = 1;
var TURN_RING_Y = 1.55;
var CURSOR_DOT_Y = 0.45;
var COL_SPACING = 0.26;
var zForCol = function (col) { return (col - (game_1.COLS - 1) / 2) * COL_SPACING; };
var yForRow = function (row) { return -board_1.BOARD_HEIGHT / 2 + (row + 0.5) * board_1.CELL; };
function createSidePanel() {
    var group = new THREE.Group();
    group.name = 'sidePanel';
    // --- Turn indicator: ring at top, faces the side cameras (along ±X).
    var ringGeo = new THREE.TorusGeometry(0.34, 0.035, 16, 64);
    var turnMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: board_1.P1_COLOR,
        emissiveIntensity: 1.5,
        roughness: 1,
        metalness: 0
    });
    var turnRing = new THREE.Mesh(ringGeo, turnMat);
    turnRing.position.set(0, TURN_RING_Y, 0);
    turnRing.rotation.y = Math.PI / 2;
    group.add(turnRing);
    // A dim outer halo ring so the turn indicator reads even if bloom is subtle.
    var haloGeo = new THREE.TorusGeometry(0.5, 0.012, 12, 48);
    var haloMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x004466,
        emissiveIntensity: 0.9,
        roughness: 1,
        metalness: 0
    });
    var halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, TURN_RING_Y, 0);
    halo.rotation.y = Math.PI / 2;
    group.add(halo);
    // --- Cursor dots: one per column, brighter for the active one.
    var dotGeo = new THREE.SphereGeometry(0.042, 12, 12);
    var dotInactiveMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x003344,
        emissiveIntensity: 0.9,
        roughness: 1,
        metalness: 0
    });
    var dotActiveMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: board_1.P1_COLOR,
        emissiveIntensity: 2.0,
        roughness: 1,
        metalness: 0
    });
    var dots = [];
    for (var i = 0; i < game_1.COLS; i++) {
        var d = new THREE.Mesh(dotGeo, dotInactiveMat);
        d.position.set(0, CURSOR_DOT_Y, zForCol(i));
        group.add(d);
        dots.push(d);
    }
    var cursorCol = Math.floor(game_1.COLS / 2);
    dots[cursorCol].material = dotActiveMat;
    // --- A faint "fall track" line so users read the column axis even when idle.
    var trackPoints = [];
    for (var i = 0; i < game_1.COLS; i++) {
        trackPoints.push(new THREE.Vector3(0, CURSOR_DOT_Y - 0.1, zForCol(i)));
        trackPoints.push(new THREE.Vector3(0, yForRow(0) - 0.05, zForCol(i)));
    }
    var trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
    var trackMat = new THREE.LineBasicMaterial({
        color: 0x0088aa,
        transparent: true,
        opacity: 0.18
    });
    group.add(new THREE.LineSegments(trackGeo, trackMat));
    // --- Ambient drifting points: pure eye-candy, time-oscillated positions.
    var AMBIENT_COUNT = 50;
    var ambientPos = new Float32Array(AMBIENT_COUNT * 3);
    var ambientBase = new Float32Array(AMBIENT_COUNT * 3);
    var ambientPhase = new Float32Array(AMBIENT_COUNT);
    for (var i = 0; i < AMBIENT_COUNT; i++) {
        var y = (Math.random() - 0.5) * 2.8;
        var z = (Math.random() - 0.5) * 2.0;
        ambientPos[i * 3] = 0;
        ambientPos[i * 3 + 1] = y;
        ambientPos[i * 3 + 2] = z;
        ambientBase[i * 3 + 1] = y;
        ambientBase[i * 3 + 2] = z;
        ambientPhase[i] = Math.random() * Math.PI * 2;
    }
    var ambientGeo = new THREE.BufferGeometry();
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    var ambient = new THREE.Points(ambientGeo, new THREE.PointsMaterial({
        color: 0x00ccff,
        size: 0.022,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    }));
    ambient.frustumCulled = false;
    group.add(ambient);
    var streaks = [];
    var streakGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.42, 12);
    function showDrop(col, row, player) {
        var mat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: player === 1 ? board_1.P1_COLOR : board_1.P2_COLOR,
            emissiveIntensity: 2.6,
            transparent: true,
            opacity: 1,
            roughness: 1,
            metalness: 0
        });
        var mesh = new THREE.Mesh(streakGeo, mat);
        mesh.layers.set(exports.SIDE_PANEL_LAYER);
        var startY = 1.15;
        var endY = yForRow(row);
        mesh.position.set(0, startY, zForCol(col));
        group.add(mesh);
        streaks.push({ mesh: mesh, mat: mat, startY: startY, endY: endY, age: 0, lifetime: 0.55 });
    }
    function setTurn(player) {
        var hex = player === 1 ? board_1.P1_COLOR : board_1.P2_COLOR;
        turnMat.emissive.setHex(hex);
        turnMat.emissiveIntensity = 1.5;
        dotActiveMat.emissive.setHex(hex);
    }
    function setCursorCol(col) {
        if (col < 0 || col >= game_1.COLS || col === cursorCol)
            return;
        dots[cursorCol].material = dotInactiveMat;
        dots[col].material = dotActiveMat;
        cursorCol = col;
    }
    function setWinner(winner, isDraw) {
        if (winner !== null) {
            turnMat.emissive.setHex(winner === 1 ? board_1.P1_COLOR : board_1.P2_COLOR);
            turnMat.emissiveIntensity = 2.8;
        }
        else if (isDraw) {
            turnMat.emissive.setHex(0xaaaaaa);
            turnMat.emissiveIntensity = 1.0;
        }
    }
    var t = 0;
    function update(dt) {
        t += dt;
        for (var i = 0; i < AMBIENT_COUNT; i++) {
            ambientPos[i * 3 + 1] = ambientBase[i * 3 + 1] + Math.sin(t * 0.5 + ambientPhase[i]) * 0.05;
            ambientPos[i * 3 + 2] = ambientBase[i * 3 + 2] + Math.cos(t * 0.35 + ambientPhase[i]) * 0.04;
        }
        ambientGeo.getAttribute('position').needsUpdate = true;
        // Gentle pulse on the turn ring so a static game still feels alive.
        var pulse = 1 + Math.sin(t * 3) * 0.04;
        turnRing.scale.setScalar(pulse);
        for (var i = streaks.length - 1; i >= 0; i--) {
            var s = streaks[i];
            s.age += dt;
            var f = Math.min(1, s.age / s.lifetime);
            var eased = f * f;
            s.mesh.position.y = s.startY + (s.endY - s.startY) * eased;
            s.mat.opacity = 1 - f;
            if (f >= 1) {
                group.remove(s.mesh);
                s.mat.dispose();
                streaks.splice(i, 1);
            }
        }
    }
    // Put everything built so far on the side-panel layer.
    // Streaks added later explicitly set their own layer at creation time.
    group.traverse(function (o) { return o.layers.set(exports.SIDE_PANEL_LAYER); });
    return { group: group, update: update, setTurn: setTurn, setCursorCol: setCursorCol, showDrop: showDrop, setWinner: setWinner };
}
exports.createSidePanel = createSidePanel;

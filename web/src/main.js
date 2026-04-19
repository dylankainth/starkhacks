"use strict";
exports.__esModule = true;
var THREE = require("three");
var EffectComposer_js_1 = require("three/examples/jsm/postprocessing/EffectComposer.js");
var RenderPass_js_1 = require("three/examples/jsm/postprocessing/RenderPass.js");
var UnrealBloomPass_js_1 = require("three/examples/jsm/postprocessing/UnrealBloomPass.js");
var OutputPass_js_1 = require("three/examples/jsm/postprocessing/OutputPass.js");
var board_1 = require("./board");
var game_1 = require("./game");
var particles_1 = require("./particles");
var gestures_1 = require("./gestures");
var sidePanel_1 = require("./sidePanel");
var canvas = document.getElementById('stage');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
var boardView = (0, board_1.createBoard)();
scene.add(boardView.group);
var particles = new particles_1.ParticleField();
scene.add(particles.points);
var sidePanel = (0, sidePanel_1.createSidePanel)();
scene.add(sidePanel.group);
var state = (0, game_1.createState)();
var cursorCol = Math.floor(game_1.COLS / 2);
function refreshCursor() {
    if (state.status === 'playing')
        boardView.setCursor(cursorCol, state.current);
    else
        boardView.hideCursor();
    sidePanel.setCursorCol(cursorCol);
}
function burstAt(col, row, colorHex, count, speed, lifetime) {
    var p = (0, board_1.cellWorldPos)(col, row);
    particles.burst(p, new THREE.Color(colorHex), count, speed, lifetime);
}
function tryDrop() {
    var next = (0, game_1.drop)(state, cursorCol);
    if (next === state)
        return;
    state = next;
    if (state.lastMove) {
        var _a = state.lastMove, col = _a.col, row = _a.row, player = _a.player;
        boardView.setDisc(col, row, player);
        var c = player === 1 ? board_1.P1_COLOR : board_1.P2_COLOR;
        burstAt(col, row, c, 28, 1.1, 0.65);
        sidePanel.showDrop(col, row, player);
    }
    if (state.winningCells)
        boardView.highlightWin(state.winningCells);
    if (state.status === 'playing')
        sidePanel.setTurn(state.current);
    else
        sidePanel.setWinner(state.winner, state.status === 'draw');
    refreshCursor();
}
function resetGame() {
    state = (0, game_1.createState)();
    boardView.clearDiscs();
    cursorCol = Math.floor(game_1.COLS / 2);
    sidePanel.setTurn(state.current);
    refreshCursor();
}
(0, gestures_1.initGestures)({
    onColumnChange: function (col) {
        cursorCol = col;
        refreshCursor();
    },
    onDrop: function () { return tryDrop(); },
    onReset: function () { return resetGame(); }
})["catch"](function (e) { return console.warn('[main] Gestures init error:', e); });
window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') {
        cursorCol = Math.max(0, cursorCol - 1);
        refreshCursor();
    }
    else if (e.key === 'ArrowRight') {
        cursorCol = Math.min(game_1.COLS - 1, cursorCol + 1);
        refreshCursor();
    }
    else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tryDrop();
    }
    else if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});
// Four cameras, each positioned at a compass point, all aimed at origin.
var CAM_DISTANCE = 5;
var FOV = 35;
function makeCam() {
    return new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
}
var frontCam = makeCam();
frontCam.position.set(0, 0, CAM_DISTANCE);
frontCam.lookAt(0, 0, 0);
var backCam = makeCam();
backCam.position.set(0, 0, -CAM_DISTANCE);
backCam.lookAt(0, 0, 0);
var leftCam = makeCam();
leftCam.position.set(-CAM_DISTANCE, 0, 0);
leftCam.lookAt(0, 0, 0);
leftCam.layers.set(sidePanel_1.SIDE_PANEL_LAYER);
var rightCam = makeCam();
rightCam.position.set(CAM_DISTANCE, 0, 0);
rightCam.lookAt(0, 0, 0);
rightCam.layers.set(sidePanel_1.SIDE_PANEL_LAYER);
// Per-quadrant composer: RenderPass → UnrealBloomPass → OutputPass.
// Sizing each composer to the quadrant keeps bloom radius correct and
// prevents glow from bleeding between quadrants (which would kill the illusion).
function makeComposer(camera) {
    var c = new EffectComposer_js_1.EffectComposer(renderer);
    c.addPass(new RenderPass_js_1.RenderPass(scene, camera));
    //                                    (resolution,         strength, radius, threshold)
    c.addPass(new UnrealBloomPass_js_1.UnrealBloomPass(new THREE.Vector2(1, 1), 0.95, 0.75, 0.28));
    c.addPass(new OutputPass_js_1.OutputPass());
    return c;
}
// Order matches the rect order used in tick() below.
var composers = [
    makeComposer(backCam),
    makeComposer(frontCam),
    makeComposer(leftCam),
    makeComposer(rightCam), // right quadrant
];
var lastQuadSize = 0;
function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener('resize', resize);
resize();
var prevTime = performance.now();
function tick() {
    var now = performance.now();
    var dt = Math.min(0.05, (now - prevTime) / 1000);
    prevTime = now;
    particles.update(dt);
    sidePanel.update(dt);
    // Ambient sparkle on winning cells once the game is over.
    if (state.status === 'win' && state.winningCells && Math.random() < 0.45) {
        var _a = state.winningCells[Math.floor(Math.random() * 4)], c = _a[0], r = _a[1];
        var colorHex = state.winner === 1 ? board_1.P1_COLOR : board_1.P2_COLOR;
        burstAt(c, r, colorHex, 5, 0.45, 0.6);
    }
    var w = window.innerWidth;
    var h = window.innerHeight;
    var size = Math.floor(Math.min(w, h) / 3);
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    if (size !== lastQuadSize) {
        for (var _i = 0, composers_1 = composers; _i < composers_1.length; _i++) {
            var c = composers_1[_i];
            c.setSize(size, size);
        }
        lastQuadSize = size;
    }
    // Full-black wipe each frame.
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.clear(true, true, true);
    var rects = [
        [cx - size / 2, h - size],
        [cx - size / 2, 0],
        [0, cy - size / 2],
        [w - size, cy - size / 2], // right
    ];
    for (var i = 0; i < 4; i++) {
        var _b = rects[i], x = _b[0], y = _b[1];
        renderer.setViewport(x, y, size, size);
        renderer.setScissor(x, y, size, size);
        renderer.setScissorTest(true);
        composers[i].render();
    }
    requestAnimationFrame(tick);
}
refreshCursor();
tick();

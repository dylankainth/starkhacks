"use strict";
exports.__esModule = true;
exports.cellWorldPos = exports.createBoard = exports.P2_COLOR = exports.P1_COLOR = exports.BOARD_DEPTH = exports.BOARD_HEIGHT = exports.BOARD_WIDTH = exports.CELL = void 0;
var THREE = require("three");
var game_1 = require("./game");
exports.CELL = 0.35;
exports.BOARD_WIDTH = game_1.COLS * exports.CELL;
exports.BOARD_HEIGHT = game_1.ROWS * exports.CELL;
exports.BOARD_DEPTH = 0.15;
var FRAME_COLOR = 0x00ffff;
var GRID_COLOR = 0x0066aa;
var SLOT_COLOR = 0x00ffff;
exports.P1_COLOR = 0xff3355;
exports.P2_COLOR = 0xffdd33;
var WIN_COLOR = 0xffffff;
function createBoard() {
    var group = new THREE.Group();
    group.name = 'connectFourBoard';
    var halfW = exports.BOARD_WIDTH / 2;
    var halfH = exports.BOARD_HEIGHT / 2;
    var halfD = exports.BOARD_DEPTH / 2;
    // Outer frame.
    var frameGeo = new THREE.BoxGeometry(exports.BOARD_WIDTH, exports.BOARD_HEIGHT, exports.BOARD_DEPTH);
    var frameEdges = new THREE.EdgesGeometry(frameGeo);
    frameGeo.dispose();
    group.add(new THREE.LineSegments(frameEdges, new THREE.LineBasicMaterial({ color: FRAME_COLOR })));
    // Interior grid on both faces.
    var gridPoints = [];
    for (var c = 1; c < game_1.COLS; c++) {
        var x = -halfW + c * exports.CELL;
        gridPoints.push(new THREE.Vector3(x, -halfH, halfD), new THREE.Vector3(x, halfH, halfD));
        gridPoints.push(new THREE.Vector3(x, -halfH, -halfD), new THREE.Vector3(x, halfH, -halfD));
    }
    for (var r = 1; r < game_1.ROWS; r++) {
        var y = -halfH + r * exports.CELL;
        gridPoints.push(new THREE.Vector3(-halfW, y, halfD), new THREE.Vector3(halfW, y, halfD));
        gridPoints.push(new THREE.Vector3(-halfW, y, -halfD), new THREE.Vector3(halfW, y, -halfD));
    }
    var gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    group.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: GRID_COLOR, transparent: true, opacity: 0.55 })));
    // Slot rings on both faces.
    var ringGeo = new THREE.TorusGeometry(exports.CELL * 0.38, 0.006, 8, 48);
    var ringMat = new THREE.MeshBasicMaterial({ color: SLOT_COLOR });
    for (var c = 0; c < game_1.COLS; c++) {
        for (var r = 0; r < game_1.ROWS; r++) {
            var p = cellWorldPos(c, r);
            var front = new THREE.Mesh(ringGeo, ringMat);
            front.position.set(p.x, p.y, halfD);
            group.add(front);
            var back = new THREE.Mesh(ringGeo, ringMat);
            back.position.set(p.x, p.y, -halfD);
            group.add(back);
        }
    }
    // Disc geometry + materials (shared across all disc meshes).
    // Emissive-only standard material so bloom picks them up as glowing sources.
    var discGeo = new THREE.CylinderGeometry(exports.CELL * 0.36, exports.CELL * 0.36, exports.BOARD_DEPTH * 0.55, 32);
    discGeo.rotateX(Math.PI / 2);
    var p1Mat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: exports.P1_COLOR,
        emissiveIntensity: 1.4,
        roughness: 1,
        metalness: 0
    });
    var p2Mat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: exports.P2_COLOR,
        emissiveIntensity: 1.4,
        roughness: 1,
        metalness: 0
    });
    var winMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: WIN_COLOR,
        emissiveIntensity: 2.0,
        roughness: 1,
        metalness: 0
    });
    var discs = new Map();
    var discKey = function (col, row) { return "".concat(col, ",").concat(row); };
    // Cursor: a floating preview disc above the top row.
    var cursorP1 = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: exports.P1_COLOR,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.6,
        roughness: 1,
        metalness: 0
    });
    var cursorP2 = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: exports.P2_COLOR,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.6,
        roughness: 1,
        metalness: 0
    });
    var cursor = new THREE.Mesh(discGeo, cursorP1);
    cursor.visible = false;
    group.add(cursor);
    function setCursor(col, player) {
        var p = cellWorldPos(col, game_1.ROWS - 1);
        cursor.position.set(p.x, halfH + exports.CELL * 0.8, 0);
        cursor.material = player === 1 ? cursorP1 : cursorP2;
        cursor.visible = true;
    }
    function hideCursor() {
        cursor.visible = false;
    }
    function setDisc(col, row, player) {
        var key = discKey(col, row);
        var existing = discs.get(key);
        if (existing)
            group.remove(existing.mesh);
        var mesh = new THREE.Mesh(discGeo, player === 1 ? p1Mat : p2Mat);
        var p = cellWorldPos(col, row);
        mesh.position.set(p.x, p.y, 0);
        discs.set(key, { mesh: mesh, player: player });
        group.add(mesh);
    }
    function clearDiscs() {
        for (var _i = 0, _a = discs.values(); _i < _a.length; _i++) {
            var mesh = _a[_i].mesh;
            group.remove(mesh);
        }
        discs.clear();
    }
    function highlightWin(cells) {
        for (var _i = 0, cells_1 = cells; _i < cells_1.length; _i++) {
            var _a = cells_1[_i], c = _a[0], r = _a[1];
            var entry = discs.get(discKey(c, r));
            if (entry)
                entry.mesh.material = winMat;
        }
    }
    return { group: group, setDisc: setDisc, clearDiscs: clearDiscs, setCursor: setCursor, hideCursor: hideCursor, highlightWin: highlightWin };
}
exports.createBoard = createBoard;
function cellWorldPos(col, row) {
    return new THREE.Vector3(-exports.BOARD_WIDTH / 2 + (col + 0.5) * exports.CELL, -exports.BOARD_HEIGHT / 2 + (row + 0.5) * exports.CELL, 0);
}
exports.cellWorldPos = cellWorldPos;

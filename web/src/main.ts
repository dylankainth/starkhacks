import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createBoard, cellWorldPos, P1_COLOR, P2_COLOR } from './board';
import { COLS, createState, drop } from './game';
import { ParticleField } from './particles';
import { initGestures } from './gestures';
import { createSidePanel, SIDE_PANEL_LAYER } from './sidePanel';

const canvas = document.getElementById('stage') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const boardView = createBoard();
scene.add(boardView.group);

const particles = new ParticleField();
scene.add(particles.points);

const sidePanel = createSidePanel();
scene.add(sidePanel.group);

let state = createState();
let cursorCol = Math.floor(COLS / 2);

function refreshCursor(): void {
  if (state.status === 'playing') boardView.setCursor(cursorCol, state.current);
  else boardView.hideCursor();
  sidePanel.setCursorCol(cursorCol);
}

function burstAt(col: number, row: number, colorHex: number, count: number, speed: number, lifetime: number): void {
  const p = cellWorldPos(col, row);
  particles.burst(p, new THREE.Color(colorHex), count, speed, lifetime);
}

function tryDrop(): void {
  const next = drop(state, cursorCol);
  if (next === state) return;
  state = next;
  if (state.lastMove) {
    const { col, row, player } = state.lastMove;
    boardView.setDisc(col, row, player);
    const c = player === 1 ? P1_COLOR : P2_COLOR;
    burstAt(col, row, c, 28, 1.1, 0.65);
    sidePanel.showDrop(col, row, player);
  }
  if (state.winningCells) boardView.highlightWin(state.winningCells);
  if (state.status === 'playing') sidePanel.setTurn(state.current);
  else sidePanel.setWinner(state.winner, state.status === 'draw');
  refreshCursor();
}

function resetGame(): void {
  state = createState();
  boardView.clearDiscs();
  cursorCol = Math.floor(COLS / 2);
  sidePanel.setTurn(state.current);
  refreshCursor();
}

initGestures({
  onColumnChange: (col) => {
    cursorCol = col;
    refreshCursor();
  },
  onDrop: () => tryDrop(),
  onReset: () => resetGame(),
}).catch((e) => console.warn('[main] Gestures init error:', e));

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    cursorCol = Math.max(0, cursorCol - 1);
    refreshCursor();
  } else if (e.key === 'ArrowRight') {
    cursorCol = Math.min(COLS - 1, cursorCol + 1);
    refreshCursor();
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    tryDrop();
  } else if (e.key === 'r' || e.key === 'R') {
    resetGame();
  }
});

// Four cameras, each positioned at a compass point, all aimed at origin.
const CAM_DISTANCE = 5;
const FOV = 35;

function makeCam(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
}

const frontCam = makeCam();
frontCam.position.set(0, 0, CAM_DISTANCE);
frontCam.lookAt(0, 0, 0);

const backCam = makeCam();
backCam.position.set(0, 0, -CAM_DISTANCE);
backCam.lookAt(0, 0, 0);

const leftCam = makeCam();
leftCam.position.set(-CAM_DISTANCE, 0, 0);
leftCam.lookAt(0, 0, 0);
leftCam.layers.set(SIDE_PANEL_LAYER);

const rightCam = makeCam();
rightCam.position.set(CAM_DISTANCE, 0, 0);
rightCam.lookAt(0, 0, 0);
rightCam.layers.set(SIDE_PANEL_LAYER);

// Per-quadrant composer: RenderPass → UnrealBloomPass → OutputPass.
// Sizing each composer to the quadrant keeps bloom radius correct and
// prevents glow from bleeding between quadrants (which would kill the illusion).
function makeComposer(camera: THREE.PerspectiveCamera): EffectComposer {
  const c = new EffectComposer(renderer);
  c.addPass(new RenderPass(scene, camera));
  //                                    (resolution,         strength, radius, threshold)
  c.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.95,     0.75,   0.28));
  c.addPass(new OutputPass());
  return c;
}

// Order matches the rect order used in tick() below.
const composers: EffectComposer[] = [
  makeComposer(backCam),   // top quadrant
  makeComposer(frontCam),  // bottom quadrant
  makeComposer(leftCam),   // left quadrant
  makeComposer(rightCam),  // right quadrant
];

let lastQuadSize = 0;

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener('resize', resize);
resize();

let prevTime = performance.now();

function tick(): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - prevTime) / 1000);
  prevTime = now;

  particles.update(dt);
  sidePanel.update(dt);

  // Ambient sparkle on winning cells once the game is over.
  if (state.status === 'win' && state.winningCells && Math.random() < 0.45) {
    const [c, r] = state.winningCells[Math.floor(Math.random() * 4)];
    const colorHex = state.winner === 1 ? P1_COLOR : P2_COLOR;
    burstAt(c, r, colorHex, 5, 0.45, 0.6);
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.floor(Math.min(w, h) / 3);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  if (size !== lastQuadSize) {
    for (const c of composers) c.setSize(size, size);
    lastQuadSize = size;
  }

  // Full-black wipe each frame.
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear(true, true, true);

  const rects: [number, number][] = [
    [cx - size / 2, h - size],      // top    — back cam
    [cx - size / 2, 0],             // bottom — front cam
    [0, cy - size / 2],             // left
    [w - size, cy - size / 2],      // right
  ];
  for (let i = 0; i < 4; i++) {
    const [x, y] = rects[i];
    renderer.setViewport(x, y, size, size);
    renderer.setScissor(x, y, size, size);
    renderer.setScissorTest(true);
    composers[i].render();
  }

  requestAnimationFrame(tick);
}

refreshCursor();
tick();

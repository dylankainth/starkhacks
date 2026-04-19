import * as THREE from 'three';
import { COLS, type Player } from './game';
import { P1_COLOR, P2_COLOR, BOARD_HEIGHT, CELL } from './board';

export const SIDE_PANEL_LAYER = 1;

const TURN_RING_Y = 1.55;
const CURSOR_DOT_Y = 0.45;
const COL_SPACING = 0.26;

const zForCol = (col: number): number => (col - (COLS - 1) / 2) * COL_SPACING;
const yForRow = (row: number): number => -BOARD_HEIGHT / 2 + (row + 0.5) * CELL;

export interface SidePanelView {
  group: THREE.Group;
  update(dt: number): void;
  setTurn(player: Player): void;
  setCursorCol(col: number): void;
  showDrop(col: number, row: number, player: Player): void;
  setWinner(winner: Player | null, isDraw: boolean): void;
}

export function createSidePanel(): SidePanelView {
  const group = new THREE.Group();
  group.name = 'sidePanel';

  // --- Turn indicator: ring at top, faces the side cameras (along ±X).
  const ringGeo = new THREE.TorusGeometry(0.34, 0.035, 16, 64);
  const turnMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P1_COLOR,
    emissiveIntensity: 1.5,
    roughness: 1,
    metalness: 0,
  });
  const turnRing = new THREE.Mesh(ringGeo, turnMat);
  turnRing.position.set(0, TURN_RING_Y, 0);
  turnRing.rotation.y = Math.PI / 2;
  group.add(turnRing);

  // A dim outer halo ring so the turn indicator reads even if bloom is subtle.
  const haloGeo = new THREE.TorusGeometry(0.5, 0.012, 12, 48);
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x004466,
    emissiveIntensity: 0.9,
    roughness: 1,
    metalness: 0,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0, TURN_RING_Y, 0);
  halo.rotation.y = Math.PI / 2;
  group.add(halo);

  // --- Cursor dots: one per column, brighter for the active one.
  const dotGeo = new THREE.SphereGeometry(0.042, 12, 12);
  const dotInactiveMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x003344,
    emissiveIntensity: 0.9,
    roughness: 1,
    metalness: 0,
  });
  const dotActiveMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P1_COLOR,
    emissiveIntensity: 2.0,
    roughness: 1,
    metalness: 0,
  });
  const dots: THREE.Mesh[] = [];
  for (let i = 0; i < COLS; i++) {
    const d = new THREE.Mesh(dotGeo, dotInactiveMat);
    d.position.set(0, CURSOR_DOT_Y, zForCol(i));
    group.add(d);
    dots.push(d);
  }
  let cursorCol = Math.floor(COLS / 2);
  dots[cursorCol].material = dotActiveMat;

  // --- A faint "fall track" line so users read the column axis even when idle.
  const trackPoints: THREE.Vector3[] = [];
  for (let i = 0; i < COLS; i++) {
    trackPoints.push(new THREE.Vector3(0, CURSOR_DOT_Y - 0.1, zForCol(i)));
    trackPoints.push(new THREE.Vector3(0, yForRow(0) - 0.05, zForCol(i)));
  }
  const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
  const trackMat = new THREE.LineBasicMaterial({
    color: 0x0088aa,
    transparent: true,
    opacity: 0.18,
  });
  group.add(new THREE.LineSegments(trackGeo, trackMat));

  // --- Ambient drifting points: pure eye-candy, time-oscillated positions.
  const AMBIENT_COUNT = 50;
  const ambientPos = new Float32Array(AMBIENT_COUNT * 3);
  const ambientBase = new Float32Array(AMBIENT_COUNT * 3);
  const ambientPhase = new Float32Array(AMBIENT_COUNT);
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const y = (Math.random() - 0.5) * 2.8;
    const z = (Math.random() - 0.5) * 2.0;
    ambientPos[i * 3] = 0;
    ambientPos[i * 3 + 1] = y;
    ambientPos[i * 3 + 2] = z;
    ambientBase[i * 3 + 1] = y;
    ambientBase[i * 3 + 2] = z;
    ambientPhase[i] = Math.random() * Math.PI * 2;
  }
  const ambientGeo = new THREE.BufferGeometry();
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
  const ambient = new THREE.Points(
    ambientGeo,
    new THREE.PointsMaterial({
      color: 0x00ccff,
      size: 0.022,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  ambient.frustumCulled = false;
  group.add(ambient);

  // --- Last-move falling streak — spawns on drop, eases down, fades out.
  interface Streak {
    mesh: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
    startY: number;
    endY: number;
    age: number;
    lifetime: number;
  }
  const streaks: Streak[] = [];
  const streakGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.42, 12);

  function showDrop(col: number, row: number, player: Player): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: player === 1 ? P1_COLOR : P2_COLOR,
      emissiveIntensity: 2.6,
      transparent: true,
      opacity: 1,
      roughness: 1,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(streakGeo, mat);
    mesh.layers.set(SIDE_PANEL_LAYER);
    const startY = 1.15;
    const endY = yForRow(row);
    mesh.position.set(0, startY, zForCol(col));
    group.add(mesh);
    streaks.push({ mesh, mat, startY, endY, age: 0, lifetime: 0.55 });
  }

  function setTurn(player: Player): void {
    const hex = player === 1 ? P1_COLOR : P2_COLOR;
    turnMat.emissive.setHex(hex);
    turnMat.emissiveIntensity = 1.5;
    dotActiveMat.emissive.setHex(hex);
  }

  function setCursorCol(col: number): void {
    if (col < 0 || col >= COLS || col === cursorCol) return;
    dots[cursorCol].material = dotInactiveMat;
    dots[col].material = dotActiveMat;
    cursorCol = col;
  }

  function setWinner(winner: Player | null, isDraw: boolean): void {
    if (winner !== null) {
      turnMat.emissive.setHex(winner === 1 ? P1_COLOR : P2_COLOR);
      turnMat.emissiveIntensity = 2.8;
    } else if (isDraw) {
      turnMat.emissive.setHex(0xaaaaaa);
      turnMat.emissiveIntensity = 1.0;
    }
  }

  let t = 0;
  function update(dt: number): void {
    t += dt;

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ambientPos[i * 3 + 1] = ambientBase[i * 3 + 1] + Math.sin(t * 0.5 + ambientPhase[i]) * 0.05;
      ambientPos[i * 3 + 2] = ambientBase[i * 3 + 2] + Math.cos(t * 0.35 + ambientPhase[i]) * 0.04;
    }
    (ambientGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    // Gentle pulse on the turn ring so a static game still feels alive.
    const pulse = 1 + Math.sin(t * 3) * 0.04;
    turnRing.scale.setScalar(pulse);

    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.age += dt;
      const f = Math.min(1, s.age / s.lifetime);
      const eased = f * f;
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
  group.traverse((o) => o.layers.set(SIDE_PANEL_LAYER));

  return { group, update, setTurn, setCursorCol, showDrop, setWinner };
}

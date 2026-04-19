import * as THREE from 'three';
import { COLS, ROWS, type Player } from './game';

export const CELL = 0.35;
export const BOARD_WIDTH = COLS * CELL;
export const BOARD_HEIGHT = ROWS * CELL;
export const BOARD_DEPTH = 0.15;

const FRAME_COLOR = 0x00ffff;
const GRID_COLOR = 0x0066aa;
const SLOT_COLOR = 0x00ffff;

export const P1_COLOR = 0xff5522; // warm rocky world — "Mars"
export const P2_COLOR = 0x33aaff; // ice giant — "Neptune"
const WIN_COLOR = 0xffffff;

export interface BoardView {
  group: THREE.Group;
  setDisc(col: number, row: number, player: Player): void;
  clearDiscs(): void;
  setCursor(col: number, player: Player): void;
  hideCursor(): void;
  highlightWin(cells: [number, number][]): void;
}

export function createBoard(): BoardView {
  const group = new THREE.Group();
  group.name = 'connectFourBoard';

  const halfW = BOARD_WIDTH / 2;
  const halfH = BOARD_HEIGHT / 2;
  const halfD = BOARD_DEPTH / 2;

  // Outer frame.
  const frameGeo = new THREE.BoxGeometry(BOARD_WIDTH, BOARD_HEIGHT, BOARD_DEPTH);
  const frameEdges = new THREE.EdgesGeometry(frameGeo);
  frameGeo.dispose();
  group.add(
    new THREE.LineSegments(frameEdges, new THREE.LineBasicMaterial({ color: FRAME_COLOR })),
  );

  // Interior grid on both faces.
  const gridPoints: THREE.Vector3[] = [];
  for (let c = 1; c < COLS; c++) {
    const x = -halfW + c * CELL;
    gridPoints.push(new THREE.Vector3(x, -halfH, halfD), new THREE.Vector3(x, halfH, halfD));
    gridPoints.push(new THREE.Vector3(x, -halfH, -halfD), new THREE.Vector3(x, halfH, -halfD));
  }
  for (let r = 1; r < ROWS; r++) {
    const y = -halfH + r * CELL;
    gridPoints.push(new THREE.Vector3(-halfW, y, halfD), new THREE.Vector3(halfW, y, halfD));
    gridPoints.push(new THREE.Vector3(-halfW, y, -halfD), new THREE.Vector3(halfW, y, -halfD));
  }
  const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
  group.add(
    new THREE.LineSegments(
      gridGeo,
      new THREE.LineBasicMaterial({ color: GRID_COLOR, transparent: true, opacity: 0.55 }),
    ),
  );

  // Slot rings on both faces.
  const ringGeo = new THREE.TorusGeometry(CELL * 0.38, 0.006, 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: SLOT_COLOR });
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const p = cellWorldPos(c, r);
      const front = new THREE.Mesh(ringGeo, ringMat);
      front.position.set(p.x, p.y, halfD);
      group.add(front);
      const back = new THREE.Mesh(ringGeo, ringMat);
      back.position.set(p.x, p.y, -halfD);
      group.add(back);
    }
  }

  // Planet geometry + materials (shared across all planet meshes).
  // Sphere reads as a planet from every viewing angle around the pyramid.
  const discGeo = new THREE.SphereGeometry(CELL * 0.36, 24, 16);
  const p1Mat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P1_COLOR,
    emissiveIntensity: 1.4,
    roughness: 1,
    metalness: 0,
  });
  const p2Mat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P2_COLOR,
    emissiveIntensity: 1.4,
    roughness: 1,
    metalness: 0,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: WIN_COLOR,
    emissiveIntensity: 2.0,
    roughness: 1,
    metalness: 0,
  });

  const discs = new Map<string, { mesh: THREE.Mesh; player: Player }>();
  const discKey = (col: number, row: number): string => `${col},${row}`;

  // Cursor: a floating preview disc above the top row.
  const cursorP1 = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P1_COLOR,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.6,
    roughness: 1,
    metalness: 0,
  });
  const cursorP2 = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: P2_COLOR,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.6,
    roughness: 1,
    metalness: 0,
  });
  const cursor = new THREE.Mesh(discGeo, cursorP1);
  cursor.visible = false;
  group.add(cursor);

  function setCursor(col: number, player: Player): void {
    const p = cellWorldPos(col, ROWS - 1);
    cursor.position.set(p.x, halfH + CELL * 0.8, 0);
    cursor.material = player === 1 ? cursorP1 : cursorP2;
    cursor.visible = true;
  }

  function hideCursor(): void {
    cursor.visible = false;
  }

  function setDisc(col: number, row: number, player: Player): void {
    const key = discKey(col, row);
    const existing = discs.get(key);
    if (existing) group.remove(existing.mesh);
    const mesh = new THREE.Mesh(discGeo, player === 1 ? p1Mat : p2Mat);
    const p = cellWorldPos(col, row);
    mesh.position.set(p.x, p.y, 0);
    discs.set(key, { mesh, player });
    group.add(mesh);
  }

  function clearDiscs(): void {
    for (const { mesh } of discs.values()) group.remove(mesh);
    discs.clear();
  }

  function highlightWin(cells: [number, number][]): void {
    for (const [c, r] of cells) {
      const entry = discs.get(discKey(c, r));
      if (entry) entry.mesh.material = winMat;
    }
  }

  return { group, setDisc, clearDiscs, setCursor, hideCursor, highlightWin };
}

export function cellWorldPos(col: number, row: number): THREE.Vector3 {
  return new THREE.Vector3(
    -BOARD_WIDTH / 2 + (col + 0.5) * CELL,
    -BOARD_HEIGHT / 2 + (row + 0.5) * CELL,
    0,
  );
}

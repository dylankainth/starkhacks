import { mkdir, cp, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const WASM_SRC = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const WASM_DST = resolve(root, 'public/mediapipe/wasm');
const MODEL_DIR = resolve(root, 'public/models');
const MODEL_PATH = resolve(MODEL_DIR, 'hand_landmarker.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyWasm() {
  if (!(await exists(WASM_SRC))) {
    console.warn('[prepare-assets] @mediapipe/tasks-vision not installed yet — skipping WASM copy.');
    return;
  }
  await mkdir(WASM_DST, { recursive: true });
  await cp(WASM_SRC, WASM_DST, { recursive: true });
  console.log('[prepare-assets] Copied MediaPipe WASM → public/mediapipe/wasm');
}

async function downloadModel() {
  if (await exists(MODEL_PATH)) {
    console.log('[prepare-assets] hand_landmarker.task already present — skipping download.');
    return;
  }
  await mkdir(MODEL_DIR, { recursive: true });
  console.log('[prepare-assets] Downloading hand_landmarker.task …');
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    console.warn(`[prepare-assets] Model download failed (${res.status}). Game still runs on keyboard.`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(MODEL_PATH, buf);
  console.log(`[prepare-assets] Saved model (${(buf.length / 1024 / 1024).toFixed(1)} MB).`);
}

await copyWasm();
await downloadModel();

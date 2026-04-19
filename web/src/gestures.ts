import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { COLS } from './game';

export interface GestureEvents {
  onColumnChange: (col: number) => void;
  onDrop: () => void;
  onReset: () => void;
}

const PINCH_ENTER = 0.05; // fraction of frame diagonal; thumb-index distance
const PINCH_EXIT = 0.09; // hysteresis — must separate past this to re-arm
const PINCH_COOLDOWN_MS = 280;
const PALM_HOLD_MS = 2000;
const PALM_RETRIGGER_MS = 3000; // block re-reset for this long after fire

// Only the middle 70% of the frame width controls column — edges are dead zone
// so the user doesn't have to fully extend their arm.
const ACTIVE_MIN = 0.15;
const ACTIVE_MAX = 0.85;

export async function initGestures(events: GestureEvents): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn('[gestures] getUserMedia unavailable — keyboard only.');
    return false;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });
  } catch (e) {
    console.warn('[gestures] Camera permission denied — keyboard only.', e);
    return false;
  }

  let hl: HandLandmarker;
  try {
    const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
    hl = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/models/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  } catch (e) {
    console.warn('[gestures] HandLandmarker failed to load — keyboard only.', e);
    stream.getTracks().forEach((t) => t.stop());
    return false;
  }

  const { video, holdFill } = mountPreview(stream);
  await waitForVideo(video);

  let lastCol = -1;
  let pinchArmed = true;
  let lastPinchTs = 0;
  let palmStart = 0;
  let palmBlockUntil = 0;
  let lastDetectTs = -1;

  function detect(): void {
    if (video.readyState >= 2) {
      const ts = performance.now();
      if (ts !== lastDetectTs) {
        lastDetectTs = ts;
        const r = hl.detectForVideo(video, ts);
        process(r, ts);
      }
    }
    requestAnimationFrame(detect);
  }

  function process(r: HandLandmarkerResult, now: number): void {
    if (!r.landmarks || r.landmarks.length === 0) {
      palmStart = 0;
      holdFill.style.width = '0%';
      return;
    }
    const lms = r.landmarks[0];
    const indexTip = lms[8];
    const thumbTip = lms[4];

    // Column: mirror x (user's right == cursor's right) and map through the active range.
    const xMirror = 1 - indexTip.x;
    const t = Math.max(0, Math.min(1, (xMirror - ACTIVE_MIN) / (ACTIVE_MAX - ACTIVE_MIN)));
    const col = Math.max(0, Math.min(COLS - 1, Math.round(t * (COLS - 1))));
    if (col !== lastCol) {
      lastCol = col;
      events.onColumnChange(col);
    }

    // Pinch: thumb tip ↔ index tip distance, with hysteresis + cooldown so one
    // physical pinch = one drop even if landmarks jitter across the threshold.
    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const dz = (indexTip.z ?? 0) - (thumbTip.z ?? 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (pinchArmed && dist < PINCH_ENTER && now - lastPinchTs > PINCH_COOLDOWN_MS) {
      pinchArmed = false;
      lastPinchTs = now;
      events.onDrop();
    } else if (!pinchArmed && dist > PINCH_EXIT) {
      pinchArmed = true;
    }

    // Open palm: all four non-thumb fingers extended AND thumb-index separated.
    const isPalm = isOpenPalm(lms) && dist > PINCH_EXIT;
    if (isPalm && now >= palmBlockUntil) {
      if (palmStart === 0) palmStart = now;
      const held = now - palmStart;
      const frac = Math.min(1, held / PALM_HOLD_MS);
      holdFill.style.width = `${frac * 100}%`;
      if (held >= PALM_HOLD_MS) {
        palmStart = 0;
        palmBlockUntil = now + PALM_RETRIGGER_MS;
        holdFill.style.width = '0%';
        events.onReset();
      }
    } else {
      palmStart = 0;
      holdFill.style.width = '0%';
    }
  }

  detect();
  console.log('[gestures] MediaPipe ready.');
  return true;
}

function isOpenPalm(lms: NormalizedLandmark[]): boolean {
  const wrist = lms[0];
  const d = (a: NormalizedLandmark, b: NormalizedLandmark): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  // Index, middle, ring, pinky: tip should be significantly farther from wrist than MCP knuckle.
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];
  let extended = 0;
  for (let i = 0; i < 4; i++) {
    if (d(lms[tips[i]], wrist) > d(lms[mcps[i]], wrist) * 1.5) extended++;
  }
  return extended >= 4;
}

function mountPreview(stream: MediaStream): { video: HTMLVideoElement; holdFill: HTMLDivElement } {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;bottom:16px;right:16px;width:200px;z-index:10;pointer-events:none;font-family:sans-serif;';

  const holdBar = document.createElement('div');
  holdBar.style.cssText =
    'height:4px;background:#00ffff22;margin-bottom:4px;border-radius:2px;overflow:hidden;';
  const holdFill = document.createElement('div');
  holdFill.style.cssText = 'height:100%;width:0%;background:#00ffff;transition:width 60ms linear;';
  holdBar.appendChild(holdFill);
  wrap.appendChild(holdBar);

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  video.style.cssText =
    'width:200px;height:150px;object-fit:cover;transform:scaleX(-1);border:1px solid #00ffff66;border-radius:6px;background:#000;';
  wrap.appendChild(video);

  document.body.appendChild(wrap);
  return { video, holdFill };
}

function waitForVideo(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2) {
      video.play().catch(() => {});
      resolve();
      return;
    }
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
      resolve();
    };
  });
}

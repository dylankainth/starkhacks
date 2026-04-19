export type Quad = 'top' | 'bottom' | 'left' | 'right';

export interface QuadOffset {
  offsetX: number; // framebuffer pixels; + moves right on screen
  offsetY: number; // framebuffer pixels; + moves up on screen
  sizeDelta: number; // pixels added to base size, applied symmetrically around the center
}

export type CalibrationMap = Record<Quad, QuadOffset>;

export interface Calibration {
  isActive(): boolean;
  get(quad: Quad): QuadOffset;
}

const STORAGE_KEY = 'holo-calibration';
const QUADS: Quad[] = ['top', 'bottom', 'left', 'right'];
const STEP = 2;
const BIG_STEP = 20;

function defaults(): CalibrationMap {
  return {
    top: { offsetX: 0, offsetY: 0, sizeDelta: 0 },
    bottom: { offsetX: 0, offsetY: 0, sizeDelta: 0 },
    left: { offsetX: 0, offsetY: 0, sizeDelta: 0 },
    right: { offsetX: 0, offsetY: 0, sizeDelta: 0 },
  };
}

function load(): CalibrationMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const base = defaults();
    for (const q of QUADS) {
      const v = parsed?.[q];
      if (v && typeof v === 'object') {
        base[q].offsetX = Number(v.offsetX) || 0;
        base[q].offsetY = Number(v.offsetY) || 0;
        base[q].sizeDelta = Number(v.sizeDelta) || 0;
      }
    }
    return base;
  } catch {
    return defaults();
  }
}

function save(map: CalibrationMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or disabled — fine, session-only calibration still works */
  }
}

export function computeQuadRect(
  quad: Quad,
  baseSize: number,
  w: number,
  h: number,
  cal: QuadOffset,
): { x: number; y: number; size: number } {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const size = Math.max(20, baseSize + cal.sizeDelta);
  let bx: number;
  let by: number;
  switch (quad) {
    case 'top':
      bx = cx - baseSize / 2;
      by = h - baseSize;
      break;
    case 'bottom':
      bx = cx - baseSize / 2;
      by = 0;
      break;
    case 'left':
      bx = 0;
      by = cy - baseSize / 2;
      break;
    case 'right':
      bx = w - baseSize;
      by = cy - baseSize / 2;
      break;
  }
  const dS = cal.sizeDelta / 2;
  return {
    x: Math.round(bx - dS + cal.offsetX),
    y: Math.round(by - dS + cal.offsetY),
    size,
  };
}

export function initCalibration(): Calibration {
  const map = load();
  let active = false;
  let selected: Quad = 'bottom';

  const hud = document.createElement('div');
  hud.style.cssText =
    'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:30;' +
    'padding:8px 14px;background:rgba(0,0,0,0.75);border:1px solid #00ffff88;' +
    'border-radius:4px;color:#00ffff;font-family:monospace;font-size:11px;' +
    'pointer-events:none;display:none;white-space:pre;text-align:center;line-height:1.5;';
  document.body.appendChild(hud);

  const outline = document.createElement('div');
  outline.style.cssText =
    'position:fixed;z-index:30;pointer-events:none;display:none;' +
    'border:2px dashed #00ffff;box-sizing:border-box;';
  document.body.appendChild(outline);

  function renderHud(): void {
    if (!active) {
      hud.style.display = 'none';
      outline.style.display = 'none';
      return;
    }
    const q = map[selected];
    const sign = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
    hud.textContent =
      `[CALIBRATION]   ${selected.toUpperCase()}   offset (${sign(q.offsetX)}, ${sign(q.offsetY)})   size ${sign(q.sizeDelta)}\n` +
      `1/2/3/4=select   arrows=move   +/-=size   shift=×10   0=zero   C/Esc=exit`;
    hud.style.display = 'block';
    drawOutline();
  }

  function drawOutline(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const baseSize = Math.floor(Math.min(w, h) / 3);
    const { x, y, size } = computeQuadRect(selected, baseSize, w, h, map[selected]);
    // Convert framebuffer (y from bottom) to DOM (y from top).
    const domX = x;
    const domY = h - (y + size);
    outline.style.display = 'block';
    outline.style.left = `${domX}px`;
    outline.style.top = `${domY}px`;
    outline.style.width = `${size}px`;
    outline.style.height = `${size}px`;
  }

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'c' || e.key === 'C') {
        active = !active;
        renderHud();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!active) return;

      const q = map[selected];
      const step = e.shiftKey ? BIG_STEP : STEP;
      let handled = true;
      switch (e.key) {
        case '1':
          selected = 'top';
          break;
        case '2':
          selected = 'bottom';
          break;
        case '3':
          selected = 'left';
          break;
        case '4':
          selected = 'right';
          break;
        case 'ArrowLeft':
          q.offsetX -= step;
          break;
        case 'ArrowRight':
          q.offsetX += step;
          break;
        case 'ArrowUp':
          q.offsetY += step;
          break;
        case 'ArrowDown':
          q.offsetY -= step;
          break;
        case '+':
        case '=':
          q.sizeDelta += step;
          break;
        case '-':
        case '_':
          q.sizeDelta -= step;
          break;
        case '0':
          q.offsetX = 0;
          q.offsetY = 0;
          q.sizeDelta = 0;
          break;
        case 'Escape':
          active = false;
          break;
        default:
          handled = false;
      }
      if (handled) {
        save(map);
        renderHud();
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  window.addEventListener('resize', () => {
    if (active) drawOutline();
  });

  return {
    isActive: () => active,
    get: (q) => map[q],
  };
}

import { keys } from './main.js';

// ── Fit game container to viewport ───────────────────────────────
// Natural height: HUD(40) + canvas(648) = 688
const GAME_W = 960, GAME_H = 688;
const container  = document.getElementById('game-container');
const canvasWrap = document.getElementById('canvas-wrap');

function fit() {
  const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  container.style.transformOrigin = 'top left';
  container.style.transform = `scale(${scale})`;
  container.style.left = ((window.innerWidth  - GAME_W * scale) / 2) + 'px';
  container.style.top  = ((window.innerHeight - GAME_H * scale) / 2) + 'px';
}
window.addEventListener('resize', fit);
requestAnimationFrame(fit);

// ── Touch zone mapping ────────────────────────────────────────────
// Left 28% = rotate left | Center 44% = thrust | Right 28% = rotate right
const ZONE_L = 0.28, ZONE_R = 0.72;

function keyForTouch(t) {
  const rect = canvasWrap.getBoundingClientRect();
  const nx = (t.clientX - rect.left) / rect.width;
  if (nx < ZONE_L) return 'ArrowLeft';
  if (nx > ZONE_R) return 'ArrowRight';
  return 'ArrowUp';
}

// Track active touches so multi-touch works (e.g. rotate + thrust simultaneously)
const active = new Map(); // touch identifier → key

function sync() {
  keys['ArrowLeft'] = keys['ArrowRight'] = keys['ArrowUp'] = false;
  for (const k of active.values()) keys[k] = true;
}

canvasWrap.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!document.getElementById('overlay').classList.contains('hidden')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    return;
  }
  for (const t of e.changedTouches) active.set(t.identifier, keyForTouch(t));
  sync();
}, { passive: false });

canvasWrap.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (active.has(t.identifier)) active.set(t.identifier, keyForTouch(t));
  }
  sync();
}, { passive: false });

canvasWrap.addEventListener('touchend', e => {
  e.preventDefault();
  for (const t of e.changedTouches) active.delete(t.identifier);
  sync();
}, { passive: false });

canvasWrap.addEventListener('touchcancel', e => {
  e.preventDefault();
  for (const t of e.changedTouches) active.delete(t.identifier);
  sync();
}, { passive: false });

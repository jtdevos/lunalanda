import { keys, setCanvasSize } from './main.js';

// ── Fit canvas to available screen space ─────────────────────
const HUD_H  = 44;   // must match #hud height in mobile.html
const CTRL_H = 80;   // must match #controls height in mobile.html
const canvas = document.getElementById('canvas');

function fit() {
  const w = window.innerWidth;
  const h = window.innerHeight - HUD_H - CTRL_H;
  setCanvasSize(w, h);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}

window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 150));
requestAnimationFrame(fit);

// ── Button → key binding ─────────────────────────────────────
function bindBtn(id, key) {
  const btn = document.getElementById(id);
  const on  = e => { e.preventDefault(); keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  btn.addEventListener('touchstart',  on,  { passive: false });
  btn.addEventListener('touchend',    off, { passive: false });
  btn.addEventListener('touchcancel', off, { passive: false });
  // Mouse fallback for desktop testing
  btn.addEventListener('mousedown',  () => keys[key] = true);
  btn.addEventListener('mouseup',    () => keys[key] = false);
  btn.addEventListener('mouseleave', () => keys[key] = false);
}
bindBtn('btn-left',   'ArrowLeft');
bindBtn('btn-thrust', 'ArrowUp');
bindBtn('btn-right',  'ArrowRight');

// ── Tap canvas to advance game state (simulates Space) ───────
document.getElementById('canvas-wrap').addEventListener('touchstart', e => {
  e.preventDefault();
  if (!document.getElementById('overlay').classList.contains('hidden')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  }
}, { passive: false });

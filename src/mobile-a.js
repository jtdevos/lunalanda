import { keys } from './main.js';

// ── Fit game container to viewport ───────────────────────────────
// Natural height: HUD(40) + canvas(648) + controls(140) = 828
const GAME_W = 960, GAME_H = 828;
const container = document.getElementById('game-container');

function fit() {
  const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  container.style.transformOrigin = 'top left';
  container.style.transform = `scale(${scale})`;
  container.style.left = ((window.innerWidth  - GAME_W * scale) / 2) + 'px';
  container.style.top  = ((window.innerHeight - GAME_H * scale) / 2) + 'px';
}
window.addEventListener('resize', fit);
requestAnimationFrame(fit);

// ── Button → key binding ─────────────────────────────────────────
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

// ── Tap canvas to advance game state (simulates Space) ───────────
document.getElementById('canvas-wrap').addEventListener('touchstart', e => {
  e.preventDefault();
  if (!document.getElementById('overlay').classList.contains('hidden')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  }
}, { passive: false });

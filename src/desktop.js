import { setCanvasSize } from './main.js';

// ── Fit canvas to desktop window, preserving aspect ratio ────
const GAME_W = 960, GAME_H = 648;

function fit() {
  const scale = Math.min(
    window.innerWidth  / GAME_W,
    window.innerHeight / GAME_H,
    1,  // never upscale beyond native resolution
  );
  const w = Math.round(GAME_W * scale);
  const h = Math.round(GAME_H * scale);
  setCanvasSize(w, h);
  const canvas = document.getElementById('canvas');
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}

window.addEventListener('resize', fit);
requestAnimationFrame(fit);

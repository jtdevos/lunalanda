import { keys } from './main.js';

// ── Fit game container to viewport ───────────────────────────────
// Natural height: HUD(40) + canvas(648) + tilt bar(70) = 758
const GAME_W = 960, GAME_H = 758;
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

// ── Tilt → rotation ──────────────────────────────────────────────
const TILT_DEAD = 7; // degrees deadzone — ignore small wobble

function onTilt(e) {
  const gamma = e.gamma ?? 0; // left-right tilt: negative=left, positive=right
  keys['ArrowLeft']  = gamma < -TILT_DEAD;
  keys['ArrowRight'] = gamma >  TILT_DEAD;
}

async function enableTilt() {
  if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
    // iOS 13+ requires explicit permission from a user gesture
    const perm = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
    if (perm !== 'granted') {
      document.getElementById('tilt-status').textContent = 'PERMISSION DENIED — USE ARROW KEYS';
      return;
    }
  }
  window.addEventListener('deviceorientation', onTilt);
  document.getElementById('tilt-btn').style.display = 'none';
  document.getElementById('tilt-status').textContent = 'TILT ACTIVE';
}

// Auto-enable on Android (no permission API needed)
if (typeof DeviceOrientationEvent?.requestPermission !== 'function') {
  window.addEventListener('deviceorientation', onTilt);
  document.getElementById('tilt-btn').style.display = 'none';
  document.getElementById('tilt-status').textContent = 'TILT ACTIVE';
}

const tiltBtn = document.getElementById('tilt-btn');
tiltBtn.addEventListener('click', enableTilt);
tiltBtn.addEventListener('touchend', e => { e.preventDefault(); enableTilt(); });

// ── Touch → thrust + advance state ──────────────────────────────
canvasWrap.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!document.getElementById('overlay').classList.contains('hidden')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    return;
  }
  keys['ArrowUp'] = true;
}, { passive: false });

canvasWrap.addEventListener('touchend', e => {
  e.preventDefault();
  keys['ArrowUp'] = false;
}, { passive: false });

canvasWrap.addEventListener('touchcancel', e => {
  e.preventDefault();
  keys['ArrowUp'] = false;
}, { passive: false });

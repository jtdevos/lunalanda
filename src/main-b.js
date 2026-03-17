const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const hudFuel = document.getElementById('hud-fuel');
const hudVel = document.getElementById('hud-vel');
const hudAlt = document.getElementById('hud-alt');
const hudLives = document.getElementById('hud-lives');
const hudScore = document.getElementById('hud-score');

// ── Constants ────────────────────────────────────────────────
const GRAVITY = 0.04;
const THRUST_POWER = 0.10;
const ROTATION_SPEED = 2.5;          // deg/frame
const MAX_SAFE_SPEED = 1.8;          // m/s total velocity for safe landing
const MAX_SAFE_ANGLE = 15;           // degrees from vertical
const FUEL_MAX = 100;
const FUEL_BURN_RATE = 0.25;         // per frame while thrusting

// ── State ────────────────────────────────────────────────────
let state = 'title';   // 'title' | 'playing' | 'won' | 'dead' | 'gameover'
let score = 0;
let lives = 3;

let lander, terrain;
let keys = {};

// ── Camera (spring + damper) ─────────────────────────────────
let cam = { y: H / 2, vy: 0 };

function updateCamera(dt) {
  if (!lander) return;
  const target = lander.y + H * 0.15;
  // Spring pulls toward target, damper bleeds velocity
  cam.vy += (target - cam.y) * 0.010 * dt;
  cam.vy *= Math.pow(0.84, dt);
  cam.y += cam.vy * dt;
  if (terrain) {
    const maxCamY = terrain.minTerrainY + H * 0.49;
    const minCamY = -H * 0.35;
    cam.y = Math.max(minCamY, Math.min(maxCamY, cam.y));
    if (cam.y === maxCamY || cam.y === minCamY) cam.vy = 0;
  }
}

// ── Input ────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    if (state === 'title' || state === 'gameover') startNewGame();
    else if (state === 'won') nextRound();
    else if (state === 'dead') respawn();
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ── Terrain generation ───────────────────────────────────────
function generateTerrain() {
  const segments = 20;
  const segW = W / segments;
  // Pad is 2 segments wide; keep it away from edges
  const padSeg = 4 + Math.floor(Math.random() * (segments - 10));
  const padY = Math.round(H * 0.58 + Math.random() * (H * 0.18));

  const points = [];
  let y = H * 0.37 + Math.random() * (H * 0.28);
  for (let i = 0; i <= segments; i++) {
    const x = i * segW;
    if (i === padSeg || i === padSeg + 1 || i === padSeg + 2) {
      points.push({ x, y: padY });
    } else {
      if (i > 0) y += (Math.random() - 0.5) * 90;
      y = Math.max(H * 0.37, Math.min(H - 70, y));
      points.push({ x, y });
    }
  }

  const minTerrainY = Math.min(...points.map(p => p.y));
  const maxTerrainY = Math.max(...points.map(p => p.y));
  return { points, segW, padSeg, padY, minTerrainY, maxTerrainY };
}

function terrainYAt(x) {
  const { points, segW } = terrain;
  const idx = Math.floor(x / segW);
  if (idx < 0) return points[0].y;
  if (idx >= points.length - 1) return points[points.length - 1].y;
  const t = (x - points[idx].x) / segW;
  return points[idx].y + t * (points[idx + 1].y - points[idx].y);
}

// ── Lander drawing (scaled to ~70% of original) ───────────────
// Feet tips are at local (±18, 15) — used in checkLanding too
const LANDER_SHAPE = [
  { type: 'poly', pts: [[-8, 7], [8, 7], [6, -7], [-6, -7]] },
  { type: 'line', p1: [-8, 7],  p2: [-14, 15] },
  { type: 'line', p1: [-14, 15], p2: [-18, 15] },
  { type: 'line', p1: [8, 7],   p2: [14, 15] },
  { type: 'line', p1: [14, 15], p2: [18, 15] },
  { type: 'line', p1: [-4, 7],  p2: [-4, 10] },
  { type: 'line', p1: [4, 7],   p2: [4, 10] },
  { type: 'line', p1: [-4, 10], p2: [4, 10] },
  { type: 'circle', cx: 0, cy: -1, r: 4 },
];

function drawLander(x, y, angleDeg, thrustOn, fuel) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1.5;

  for (const part of LANDER_SHAPE) {
    ctx.beginPath();
    if (part.type === 'poly') {
      ctx.moveTo(...part.pts[0]);
      for (let i = 1; i < part.pts.length; i++) ctx.lineTo(...part.pts[i]);
      ctx.closePath();
    } else if (part.type === 'line') {
      ctx.moveTo(...part.p1);
      ctx.lineTo(...part.p2);
    } else if (part.type === 'circle') {
      ctx.arc(part.cx, part.cy, part.r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  if (thrustOn && fuel > 0) {
    const flameH = 7 + Math.random() * 9;
    ctx.strokeStyle = `rgba(255, ${120 + (Math.random() * 80) | 0}, 0, 0.9)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 10); ctx.lineTo(0, 10 + flameH); ctx.lineTo(4, 10);
    ctx.stroke();
    ctx.strokeStyle = '#fff8';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-2, 10); ctx.lineTo(0, 10 + flameH * 0.6); ctx.lineTo(2, 10);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Terrain drawing ──────────────────────────────────────────
function drawTerrain() {
  const { points, padSeg } = terrain;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(W, H * 10); ctx.lineTo(0, H * 10);
  ctx.closePath();
  ctx.fillStyle = '#010801';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = '#0a0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Landing pad (2 segments wide)
  const p0 = points[padSeg];
  const p1 = points[padSeg + 2];
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Flags
  for (const fx of [p0.x + 4, p1.x - 4]) {
    ctx.beginPath();
    ctx.moveTo(fx, p0.y); ctx.lineTo(fx, p0.y - 18);
    ctx.strokeStyle = '#0ff8'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    const dir = fx < W / 2 ? 10 : -10;
    ctx.moveTo(fx, p0.y - 18);
    ctx.lineTo(fx + dir, p0.y - 13);
    ctx.lineTo(fx, p0.y - 8);
    ctx.closePath();
    ctx.fillStyle = '#0ff4'; ctx.fill();
  }
}

// ── Stars — two parallax layers ───────────────────────────────
// Far stars: many, tiny, barely move (parallax 0.05)
const STARS_FAR = Array.from({ length: 130 }, () => ({
  x: Math.random() * W,
  y: -100 + Math.random() * (H + 200),
  r: 0.3 + Math.random() * 0.8,
  b: 0.2 + Math.random() * 0.5,
}));

// Near stars: fewer, larger, move more (parallax 0.28)
const STARS_NEAR = Array.from({ length: 55 }, () => ({
  x: Math.random() * W,
  y: -100 + Math.random() * (H + 200),
  r: 0.8 + Math.random() * 1.4,
  b: 0.4 + Math.random() * 0.6,
}));

function drawStars() {
  for (const s of STARS_FAR) {
    const sy = s.y + (H / 2 - cam.y) * 0.05;
    if (sy < -4 || sy > H + 4) continue;
    ctx.beginPath();
    ctx.arc(s.x, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.b})`;
    ctx.fill();
  }
  for (const s of STARS_NEAR) {
    const sy = s.y + (H / 2 - cam.y) * 0.28;
    if (sy < -4 || sy > H + 4) continue;
    ctx.beginPath();
    ctx.arc(s.x, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.b})`;
    ctx.fill();
  }
}

// ── Grid ─────────────────────────────────────────────────────
function drawGrid() {
  ctx.strokeStyle = '#0f0108';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

// ── Particles ────────────────────────────────────────────────
let particles = [];

function spawnExplosion(cx, cy) {
  // Sparks — fast thin streaks
  for (let i = 0; i < 83; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 7;
    const r = Math.random();
    const color = r < 0.40 ? '#0f0' : r < 0.65 ? '#fff' : '#ff0';
    particles.push({
      type: 'spark',
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.011 + Math.random() * 0.016,
      len: 5 + Math.random() * 10,
      color,
    });
  }

  // Debris — small rotating wireframe triangles, quads, and dots
  for (let i = 0; i < 21; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 3;
    const roll = Math.random();
    const shape = roll < 0.33 ? 'dot' : roll < 0.66 ? 3 : 4;  // dot | triangle | quad
    const size = 3 + Math.random() * 7;
    const verts = shape === 'dot' ? null : Array.from({ length: shape }, (_, k) => {
      const a = (k / shape) * Math.PI * 2;
      const r = size * (0.6 + Math.random() * 0.4);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    particles.push({
      type: 'debris',
      shape,
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      size,
      verts,
      life: 1,
      decay: 0.006 + Math.random() * 0.010,
    });
  }

  // Dots — small bright points, faster decay
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 4;
    particles.push({
      type: 'dot',
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1 + Math.random() * 2.5,
      life: 1,
      decay: 0.014 + Math.random() * 0.018,
      color: (() => { const r = Math.random(); return r < 0.45 ? '#0f0' : r < 0.70 ? '#fff' : '#ff0'; })(),
    });
  }
}

function updateParticles(dt) {
  // Physics pass
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY * 1.4 * dt;
    if (p.type === 'debris') p.rot += p.spin * dt;
    p.life -= p.decay * dt;
  }
  particles = particles.filter(p => p.life > 0);

  // Draw pass
  for (const p of particles) {
    const a = Math.max(0, p.life);
    if (p.type === 'spark') {
      // Draw as a trailing line in the direction of travel
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const tx = (p.vx / speed) * p.len * a;
      const ty = (p.vy / speed) * p.len * a;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - tx, p.y - ty);
      ctx.strokeStyle = p.color === '#fff'
        ? `rgba(255,255,255,${a})`
        : p.color === '#ff0'
          ? `rgba(255,180,0,${a})`
          : `rgba(0,255,0,${a * 0.9})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (p.type === 'debris') {
      if (p.shape === 'dot') {
        // Dot variant: small filled circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, p.size * 0.4 * a), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,0,${a})`;
        ctx.fill();
      } else {
        // Triangle or quad: rotating wireframe polygon
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(...p.verts[0]);
        for (let i = 1; i < p.verts.length; i++) ctx.lineTo(...p.verts[i]);
        ctx.closePath();
        ctx.strokeStyle = `rgba(0,255,0,${a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    } else if (p.type === 'dot') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0, p.r * a), 0, Math.PI * 2);
      ctx.fillStyle = p.color === '#fff'
        ? `rgba(255,255,255,${a})`
        : p.color === '#ff0'
          ? `rgba(255,180,0,${a})`
          : `rgba(0,255,0,${a})`;
      ctx.fill();
    }
  }
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  if (!lander) return;
  const speed = Math.hypot(lander.vx, lander.vy);
  const altitude = Math.max(0, terrainYAt(lander.x) - lander.y);
  const fuelPct = (lander.fuel / FUEL_MAX * 100).toFixed(0);

  hudFuel.textContent = `${fuelPct}%`;
  hudFuel.className = 'hud-value' + (lander.fuel < 25 ? ' danger' : lander.fuel < 50 ? ' warn' : '');

  hudVel.textContent = `${speed.toFixed(1)} m/s`;
  hudVel.className = 'hud-value' + (speed > MAX_SAFE_SPEED * 1.5 ? ' danger' : speed > MAX_SAFE_SPEED ? ' warn' : '');

  hudAlt.textContent = `${altitude.toFixed(0)} m`;
  hudLives.textContent = '♦ '.repeat(lives).trim() || '—';
  hudLives.className = 'hud-value' + (lives === 1 ? ' danger' : '');
  hudScore.textContent = score;
}

// ── Collision ────────────────────────────────────────────────
function localToWorld(lx, ly, cx, cy, rad) {
  return {
    x: cx + lx * Math.cos(rad) - ly * Math.sin(rad),
    y: cy + lx * Math.sin(rad) + ly * Math.cos(rad),
  };
}

function checkLanding() {
  const { x, y, vx, vy, angle } = lander;
  const speed = Math.hypot(vx, vy);
  const rad = (angle * Math.PI) / 180;

  // Feet are at local (±18, 15) — matches scaled LANDER_SHAPE
  const feet = [
    localToWorld(-18, 15, x, y, rad),
    localToWorld( 18, 15, x, y, rad),
  ];

  for (const foot of feet) {
    if (foot.y >= terrainYAt(foot.x) - 1) {
      const { points, padSeg } = terrain;
      const p0 = points[padSeg], p1 = points[padSeg + 2]; // 2-segment pad
      const bothOnPad = feet.every(f => f.x >= p0.x && f.x <= p1.x);
      const norm = ((angle % 360) + 360) % 360;
      const upright = norm <= MAX_SAFE_ANGLE || norm >= 360 - MAX_SAFE_ANGLE;

      if (bothOnPad && speed <= MAX_SAFE_SPEED && upright) {
        win(speed);
      } else {
        crash();
      }
      return;
    }
  }
}

function win(speed) {
  state = 'won';
  const pts = Math.round((MAX_SAFE_SPEED - speed) / MAX_SAFE_SPEED * 500 + lander.fuel * 3);
  score += pts;
  overlayTitle.textContent = `LANDED! +${pts} PTS`;
  overlayTitle.style.color = '#0ff';
  overlaySub.textContent = `Speed: ${speed.toFixed(2)} m/s  |  SPACE for next`;
  overlay.classList.remove('hidden');
  updateHUD();
}

function crash() {
  state = 'dead';
  spawnExplosion(lander.x, lander.y);
  lives -= 1;
  if (lives <= 0) {
    // Show CRASH briefly, then transition to game over after explosion plays out
    overlayTitle.textContent = 'CRASH!';
    overlayTitle.style.color = '#f40';
    overlaySub.textContent = 'No lives remaining...';
    overlay.classList.remove('hidden');
    setTimeout(gameOver, 1200);
  } else {
    overlayTitle.textContent = 'CRASH!';
    overlayTitle.style.color = '#f40';
    overlaySub.textContent = `${lives} ${lives === 1 ? 'life' : 'lives'} remaining  |  SPACE to try again`;
    overlay.classList.remove('hidden');
  }
  updateHUD();
}

function gameOver() {
  state = 'gameover';
  overlayTitle.textContent = 'GAME OVER';
  overlayTitle.style.color = '#f40';
  overlaySub.textContent = `Final score: ${score}  |  SPACE to play again`;
  overlay.classList.remove('hidden');
}

// ── Game flow ────────────────────────────────────────────────
const SPAWN_PROTECT_FRAMES = 90;  // ~1.5s of invulnerability after spawn
let spawnProtect = 0;

function spawnLander() {
  lander = {
    x: 80 + Math.random() * (W - 160),
    y: 50,
    vx: (Math.random() - 0.5) * 0.8,
    vy: 0.2,
    angle: 0,
    fuel: FUEL_MAX,
    thrustOn: false,
  };
  spawnProtect = SPAWN_PROTECT_FRAMES;
}

function startNewGame() {
  score = 0;
  lives = 3;
  terrain = generateTerrain();
  spawnLander();
  cam.y = lander.y + H * 0.15;
  cam.vy = 0;
  particles = [];
  state = 'playing';
  overlay.classList.add('hidden');
  updateHUD();
}

function respawn() {
  // same terrain, new lander
  spawnLander();
  cam.y = lander.y + H * 0.15;
  cam.vy = 0;
  particles = [];
  state = 'playing';
  overlay.classList.add('hidden');
  updateHUD();
}

function nextRound() {
  terrain = generateTerrain();
  spawnLander();
  cam.y = lander.y + H * 0.15;
  cam.vy = 0;
  particles = [];
  state = 'playing';
  overlay.classList.add('hidden');
  updateHUD();
}

// ── Loop ─────────────────────────────────────────────────────
function update(dt) {
  if (state !== 'playing') return;

  if (keys['ArrowLeft'])  lander.angle -= ROTATION_SPEED * dt;
  if (keys['ArrowRight']) lander.angle += ROTATION_SPEED * dt;

  const thrusting = keys['ArrowUp'] && lander.fuel > 0;
  lander.thrustOn = thrusting;
  if (thrusting) {
    const rad = (lander.angle * Math.PI) / 180;
    lander.vx += Math.sin(rad) * THRUST_POWER * dt;
    lander.vy -= Math.cos(rad) * THRUST_POWER * dt;
    lander.fuel = Math.max(0, lander.fuel - FUEL_BURN_RATE * dt);
  }

  lander.vy += GRAVITY * dt;
  lander.x += lander.vx * dt;
  lander.y += lander.vy * dt;

  // Wrap horizontally
  if (lander.x < -30) lander.x = W + 30;
  if (lander.x > W + 30) lander.x = -30;
  // Bounce off top
  if (lander.y < -40) lander.vy = Math.abs(lander.vy) * 0.5;

  if (spawnProtect > 0) {
    spawnProtect -= dt;
  } else {
    checkLanding();
  }
  updateHUD();

  updateCamera(dt);
}

function draw(dt) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawGrid();
  drawStars();

  ctx.save();
  ctx.translate(0, H / 2 - cam.y);

  if (terrain) drawTerrain();

  if (state === 'playing' && lander) {
    const blinkOn = spawnProtect <= 0 || Math.floor(spawnProtect / 6) % 2 === 0;
    if (blinkOn) drawLander(lander.x, lander.y, lander.angle, lander.thrustOn, lander.fuel);
  }
  if (state === 'dead') updateParticles(dt);
  if (state === 'won' && lander) drawLander(lander.x, lander.y, lander.angle, false, lander.fuel);

  ctx.restore();
}

let lastTimestamp = null;
function loop(timestamp) {
  // dt is normalized: 1.0 = one 60fps frame. Cap at 3 to avoid huge jumps on tab resume.
  const dt = lastTimestamp === null ? 1 : Math.min((timestamp - lastTimestamp) / (1000 / 60), 3);
  lastTimestamp = timestamp;
  update(dt);
  draw(dt);
  requestAnimationFrame(loop);
}

overlay.classList.remove('hidden');
hudScore.textContent = score;
hudLives.textContent = '♦ ♦ ♦';
loop();

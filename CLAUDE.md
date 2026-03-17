# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Production build
npm run preview  # Preview production build
```

## Project Structure

Lunalanda is a Lunar Lander-style browser game built with vanilla JS + Canvas 2D, bundled by Vite. There are three parallel variants (A/B/C), each with its own HTML entry point and JS file:

| File | Entry | Variant |
|------|-------|---------|
| `index-a.html` → `src/main-a.js` | `/` (default dev) | Smooth tracking camera |
| `index-b.html` → `src/main-b.js` | `/index-b.html` | Spring/damper camera + two-layer parallax stars |
| `index-c.html` → `src/main-c.js` | `/index-c.html` | Spring camera + dynamic zoom based on altitude |

The variants share identical game logic and differ only in camera and rendering behavior. When adding gameplay features, apply changes to all three variants.

## Architecture

Each `src/main-*.js` is a self-contained module (no imports). Everything lives at module scope:

- **Constants** — `GRAVITY`, `THRUST_POWER`, `ROTATION_SPEED`, `MAX_SAFE_SPEED`, `MAX_SAFE_ANGLE`, `FUEL_MAX`, `FUEL_BURN_RATE`
- **State machine** — `state`: `'title' | 'playing' | 'won' | 'dead' | 'gameover'`
- **Game loop** — `loop(timestamp)` → normalized `dt` (1.0 = one 60fps frame, capped at 3) → `update(dt)` + `draw(dt)`
- **Terrain** — procedurally generated polyline (20 segments); landing pad is 2 segments wide at a random position. `terrainYAt(x)` returns interpolated Y for collision.
- **Lander** — object `{ x, y, vx, vy, angle, fuel, thrustOn }`. Feet at local `(±18, 15)` used for collision.
- **Collision** — `checkLanding()` transforms feet to world space, checks terrain contact, then checks pad/speed/angle for win vs crash.
- **Particles** — `spawnExplosion()` generates three particle types: `spark` (trailing streaks), `debris` (rotating wireframe polygons), `dot` (filled circles). Updated and drawn inside `draw()` when `state === 'dead'`.
- **Camera** — world rendered with `ctx.translate(0, H/2 - cam.y)`. Stars and grid are screen-space (drawn before translate). Variant C adds `zoom` applied via `ctx.scale`.
- **HUD** — DOM elements updated via `updateHUD()`; color classes `warn`/`danger` applied based on thresholds.
- **Spawn protection** — `spawnProtect` counter (~90 frames) causes lander to blink and skips collision checks after spawn.

## Key Coordinates

Canvas is 960×648. World Y increases downward. The lander spawns at `y: 50` (near top). Terrain generates between ~37%–87% of canvas height. The camera offset is `H/2 - cam.y`, so `cam.y` is the world-Y that maps to the vertical center of the screen.

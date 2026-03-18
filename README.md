# Lunalanda

```
     *    .       *    .    *    .    *
  .    *    .  *    .    *    .    *
              ___
          ___/   \___
         |  _     _  |
         | | |   | | |
         |___|   |___|
         /  / \ / \  \
        /__/   V   \__\
            * . * . *

       L U N A L A N D A
        a lunar lander
```

A retro lunar lander game for the browser. Guide your ship onto the landing pad — too fast or too tilted and you're scrap metal.

**Play it:** [lunalanda.pages.dev](https://lunalanda.pages.dev)

## How to Play

**Desktop** — keyboard controls:

| Key | Action |
|-----|--------|
| `←` `→` | Rotate |
| `↑` | Thrust |
| `Space` | Launch / next round / retry |

**Mobile** — on-screen buttons for thrust and rotation; tap the screen to launch.

**Land both feet on the cyan pad** with:
- Speed ≤ 1.8 m/s
- Angle within 15° of vertical

Score is based on landing speed and remaining fuel. You have 3 lives.

## Build & Run

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

To test on a phone on the same network:

```bash
npm run dev -- --host
```

Then open `mobile.html` at the IP address shown (e.g. `http://192.168.x.x:5173/mobile.html`).

## Acknowledgements

Built with vanilla JavaScript and the Canvas 2D API, bundled with [Vite](https://vite.dev). Procedural audio via the Web Audio API — no sound files. Hosted on [Cloudflare Pages](https://pages.cloudflare.com).

Most of this game was designed and written with the help of [Claude Code](https://claude.ai/code) (Anthropic).

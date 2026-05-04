# For Ava

A pixel-art Santorini love letter, rendered in your browser.

A man hangs laundry on a balcony at sunset. After a few seconds he notices
you, picks up a bouquet, and follows your cursor along the cobblestone roads.
The cursor *is* the woman — her hand holds yours; her body sways as you move.
Above it all, a countdown ticks down to the day we see each other again.

---

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`). The page is a
single-page app — no backend, no build complexity.

To produce a static deploy:

```bash
npm run build
```

The output goes to `dist/`. Everything in there can be served from any
static host.

---

## Editing the countdown

The countdown reads from `public/countdown.json`:

```json
{
  "targetDate": "2026-05-26T18:00:00-04:00",
  "name": "Ava"
}
```

- `targetDate` is any ISO 8601 timestamp. Include the timezone offset
  (`-04:00`, `Z`, etc.) — otherwise browsers in different time zones will
  render different remaining times.
- `name` templates into the bottom line: `I miss you {name} <3`.
- If the date is in the past the countdown clamps to `0 days, 0 hours,
  0 minutes, 0 seconds` rather than going negative.

Edits to `public/countdown.json` are picked up on the next page load — no
rebuild needed when running `npm run dev`. For deploys you rebuild and
republish `dist/`.

---

## Deploying to GitHub Pages

This repo is intended to live at `https://<username>.github.io/ava/`.

1. Push the repo to GitHub at `<username>/ava` (or wherever).
2. In `vite.config.ts` the `base` is set to `'/ava/'`. Change it to:
   - `'/ava/'` — deploying as a project page at `<user>.github.io/ava/`
   - `'/'` — deploying as a user page at the domain root, **or** when
     publishing to a custom domain.
3. Run `npm run build` and publish the contents of `dist/` to the
   `gh-pages` branch (or wherever Pages reads from).

A minimal manual deploy:

```bash
npm run build
# from repo root
git checkout --orphan gh-pages
git --work-tree dist add --all
git --work-tree dist commit -m "deploy"
git push origin gh-pages -f
git checkout main
```

(Or use any of the standard `gh-pages` GitHub Actions if you'd rather.)

---

## Tweaking the feel

All hand-tunable constants live in `src/config.ts`. The most useful knobs:

| Constant                         | Effect                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `MAN_SPEED_PX_PER_SEC`           | How fast the man walks (in internal pixel units; the canvas is 480×270).              |
| `MAN_LAUNDRY_TIME_MS`            | How long he hangs laundry before noticing you. 3000 ms by default.                    |
| `MAN_REPLAN_MS`                  | How often he reconsiders his destination as the cursor moves. Lower = more reactive.  |
| `MAN_FOLLOW_RANGE_PX`            | "Close enough" — when the cursor is within this many pixels, he stops and watches.    |
| `WOMAN_SPRING_K`                 | Pendulum stiffness. Higher = snappier, more upright.                                  |
| `WOMAN_DAMP`                     | Damping. Higher = swing settles faster. Lower = pronounced oscillation.               |
| `WOMAN_BODY_LENGTH`              | Distance from cursor (her hand) to her hip. Affects pendulum period and feel.         |
| `WOMAN_MAX_TILT_DEG`             | Hard clamp on swing angle so she never goes horizontal.                               |
| `DOLPHIN_INTERVAL_{MIN,MAX}_MS`  | Time between dolphin appearances.                                                     |
| `BIRD_INTERVAL_{MIN,MAX}_MS`     | Time between bird flyovers.                                                           |
| `SUN_DESCENT_PX_PER_MIN`         | How fast the sun sinks. Default is barely-perceptible.                                |

The internal canvas size (`VIEW_W`, `VIEW_H`) is 480×270. Keep that 16:9 if
you change it; rendering integer-scales to fit any window without blurring.

---

## Project layout

```
src/
├── main.ts              # Boot: Pixi app, layers, ticker
├── config.ts            # All tunable constants and the palette
├── style.css            # Countdown overlay + loading screen
├── scene/
│   ├── sprites.ts       # Pixel-array → Texture utility
│   ├── ocean.ts         # Sky gradient, sun, clouds, sea, waves, boats
│   ├── island.ts        # Ground, roads, palace/bakery/coffee/market/fountain/decor
│   ├── pathfinding.ts   # Road waypoint graph + A*
│   └── ambient.ts       # Steam, smoke, fountain spray, dolphins, birds
├── characters/
│   ├── man.ts           # IDLE_LAUNDRY → TRANSITION → WALKING → FOLLOWING
│   └── woman.ts         # Cursor-attached pendulum (rotational spring-damper)
└── ui/
    ├── countdown.ts     # 1Hz countdown, reads /countdown.json
    └── loading.ts       # Hides the loading screen after init
```

All sprites are generated programmatically from pixel-array strings inside
the source — there are no external image assets to ship.

---

## Notes

- Rendering uses PixiJS v8 with `NEAREST` filtering; everything stays crisp
  at any window size because the canvas integer-scales.
- The cursor is hidden over the canvas (`cursor: none`) so the woman *is*
  the cursor.
- The man walks an A* path on the cobblestone graph defined in
  `pathfinding.ts`. To add a road, add a node and link it; the rest is
  automatic.
- Performance target: 60 fps on a mid-range laptop. The hottest path each
  frame is the wave/sparkle/particle Graphics regeneration — if you ever
  see frame drops, that's the first place to look.

Made with care.

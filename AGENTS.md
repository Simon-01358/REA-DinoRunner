# AGENTS.md

## Status

Dino Runner is a finished static site: `index.html`, `styles.css`, `js/sprites.js`,
`js/game.js`, `favicon.svg`, `preview.png`. No package manager, no build step, no
test suite, no git history. The page is a canvas endless-runner (dino game homage)
with original pixel art.

## Commands

```bash
# serve locally (pick one)
python3 -m http.server 8080
npx serve .

# syntax check the scripts (the only automated check that exists)
node --check js/game.js && node --check js/sprites.js
```

There is no build, lint, or test pipeline. Do not add one unless the project grows
past a few static files.

## Conventions

- `js/sprites.js` is generated-looking ASCII art: one array per sprite, `#` = ink,
  `o` = eye hole (transparent), `.` = empty. Rows must all be the same length.
  Frames of one animation must share dimensions so they stay aligned.
- `js/game.js` is a single IIFE, strictly ordered: utils → sprites → font →
  canvas/layout → audio → draw helpers → game flow → update → render → input → boot.
  Keep it dependency-free and ES2020-compatible (no modules, no imports).
- Sizes are in "design pixels" multiplied by `U`, an integer chosen from the stage
  size. Never draw a sprite at a fractional scale — it stops looking pixel art.
- Colours come from the `PALETTE` object and are lerped by `state.night`; the page
  follows through `--bg` / `--ink` CSS variables. Do not hardcode colours in CSS
  for anything inside the stage.
- Gameplay state lives in `state` (phase machine: ready/run/over/pause), `dino`
  (physics), and `obstacles`. Hitboxes are deliberately smaller than sprites.
- `window.__runner()` is a small read-only probe used for automated checks; update
  it when you add state that is useful to inspect.

# Dino Runner

A tiny, dependency-free endless runner in the spirit of the Chrome dino game. Pure
HTML, CSS and canvas — no build step, no frameworks, no external assets. Drop the
folder on any static host and it plays.

![Dino Runner running: the dino mid-stride with a cactus ahead and the score in the top right](preview.png)

## Play

| Action | Keyboard | Touch |
| --- | --- | --- |
| Start / retry | `Space` · `↑` · `Enter` | tap the game area |
| Jump (hold longer = higher) | `Space` · `↑` · `W` | **JUMP** button |
| Duck / fast-fall | `↓` · `S` | **DUCK** button |
| Pause | `P` · `Esc` | **PAUSE** button |
| Mute | `M` | **SOUND** button |

The run speeds up as your score grows, pterodactyls join in after 300 points, and
the palette flips to night every 700 points. Your best score is kept in
`localStorage`, so it survives reloads.

## Run it locally

No install, no build:

```bash
# option 1 — python is everywhere
python3 -m http.server 8080

# option 2 — node
npx serve .

# option 3 — just open the file
xdg-open index.html
```

Then visit <http://localhost:8080>.

## Deploy it

Everything is static, so any host works. The whole site is `index.html`,
`styles.css`, `js/` and `favicon.svg`.

- **GitHub Pages** — push the folder to a repo, then *Settings → Pages → Deploy from
  branch → main / (root)*.
- **Render** — *New → Static Site*, connect the repo, leave the build command empty
  and set the publish directory to `.`. Or use the included `render.yaml` blueprint
  (*New → Blueprint*). See [Deploy on Render](#deploy-on-render) below.
- **Netlify** — drag the folder onto <https://app.netlify.com/drop>.
- **Vercel** — `npx vercel` in this folder (framework preset: *Other*).
- **Cloudflare Pages** — connect the repo, leave the build command empty, output
  directory `/`.
- **Anything else** — copy the files to any web server. No SPA rewrites needed.

### Deploy on Render

Render builds from a Git repo, so the project must be on GitHub, GitLab or Bitbucket
first. This repo is already on GitHub at
`https://github.com/Simon-01358/REA-DinoRunner`.

**Option A — dashboard**

1. In the [Render Dashboard](https://dashboard.render.com/), click **New → Static
   Site**.
2. Connect GitHub and pick the `REA-DinoRunner` repo (grant Render access to it if
   asked).
3. Fill in:
   - **Name**: `dino-runner` (or anything you like — it becomes the `onrender.com`
     subdomain)
   - **Branch**: `main`
   - **Build Command**: leave **empty**
   - **Publish Directory**: `.`
4. Click **Create Static Site**. The first deploy takes a few seconds.
5. Your game is live at `https://<name>.onrender.com`.

**Option B — blueprint (this repo's `render.yaml`)**

1. Push the repo with `render.yaml` at the root.
2. In Render, click **New → Blueprint**, connect the repo, and apply the plan.
3. Render creates the static site with the same settings as above.

Every push to `main` redeploys automatically. Static sites are free (bandwidth and
build minutes count against the workspace allowance), get automatic HTTPS, and can
use a custom domain under **Settings → Custom Domains** (add a `CNAME` to
`<name>.onrender.com`).

No rewrite rules or environment variables are needed. The site is plain files and
`localStorage` works normally.

## How it works

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, canvas, buttons, accessible live region |
| `styles.css` | Page chrome; the palette is driven by `--bg` / `--ink`, which the game updates during the day/night fade |
| `js/sprites.js` | Pixel art as ASCII grids (`#` = ink, `o` = eye hole). Add a sprite by adding another grid |
| `js/game.js` | Parsed sprites, 5×7 pixel font, physics, spawning, collisions, HUD, audio |

Design notes:

- The canvas is rendered in CSS pixels at `devicePixelRatio` (capped at 2) and every
  sprite is drawn at an integer scale `U`, so it stays crisp without image assets.
- `U` follows both the stage width and height, and the base speed follows the stage
  width, so reaction time and jump arcs stay fair from phone to desktop.
- The day/night cycle lerps two RGB palettes; the page background follows along via
  CSS custom properties.
- Jump height is variable: releasing early cuts vertical velocity.
- Sound is synthesised with the WebAudio API — no audio files.

### Tuning

The knobs live at the top of `js/game.js`:

```js
BASE_SPEED = clamp(W * 0.42, 190, 560); // px per second
GRAVITY = 830 * U;
JUMP_V = 292 * U;                       // roughly 0.7s of airtime
```

Night starts at 700 points, the run caps out at ~1500 points of speed ramp, and
pterodactyls appear after 300. All three are single constants in `update()` /
`spawn()`.

## Notes

The art is original pixel art made for this project; the game is an homage to the
Chrome offline dino, not affiliated with Google. Do whatever you like with the code.

/* Dino Runner — a dependency-free canvas endless runner.
   Original pixel art, procedural obstacles, day/night cycle.
   Everything is drawn at integer pixel scale so it stays crisp. */
(() => {
  "use strict";

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const $ = (id) => document.getElementById(id);

  const load = (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode — ignore */
    }
  };

  // ---------------------------------------------------------------- sprites
  function parse(rows) {
    const w = rows[0].length;
    const h = rows.length;
    const px = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (rows[y][x] === "#") px.push(x, y);
      }
    }
    return { w, h, px };
  }

  const SPR = {};
  for (const [name, rows] of Object.entries(window.RUNNER_SPRITES)) {
    SPR[name] = parse(rows);
  }

  // ---------------------------------------------------------------- 5x7 font
  const GLYPHS = {
    A: "01110 10001 10001 11111 10001 10001 10001",
    B: "11110 10001 10001 11110 10001 10001 11110",
    C: "01110 10001 10000 10000 10000 10001 01110",
    D: "11110 10001 10001 10001 10001 10001 11110",
    E: "11111 10000 10000 11110 10000 10000 11111",
    F: "11111 10000 10000 11110 10000 10000 10000",
    G: "01110 10001 10000 10111 10001 10001 01111",
    H: "10001 10001 10001 11111 10001 10001 10001",
    I: "11111 00100 00100 00100 00100 00100 11111",
    J: "00111 00010 00010 00010 00010 10010 01100",
    K: "10001 10010 10100 11000 10100 10010 10001",
    L: "10000 10000 10000 10000 10000 10000 11111",
    M: "10001 11011 10101 10101 10001 10001 10001",
    N: "10001 11001 10101 10011 10001 10001 10001",
    O: "01110 10001 10001 10001 10001 10001 01110",
    P: "11110 10001 10001 11110 10000 10000 10000",
    Q: "01110 10001 10001 10001 10101 10010 01101",
    R: "11110 10001 10001 11110 10100 10010 10001",
    S: "01111 10000 10000 01110 00001 00001 11110",
    T: "11111 00100 00100 00100 00100 00100 00100",
    U: "10001 10001 10001 10001 10001 10001 01110",
    V: "10001 10001 10001 10001 10001 01010 00100",
    W: "10001 10001 10001 10101 10101 11011 10001",
    X: "10001 10001 01010 00100 01010 10001 10001",
    Y: "10001 10001 01010 00100 00100 00100 00100",
    Z: "11111 00001 00010 00100 01000 10000 11111",
    0: "01110 10001 10011 10101 11001 10001 01110",
    1: "00100 01100 00100 00100 00100 00100 01110",
    2: "01110 10001 00001 00010 00100 01000 11111",
    3: "11111 00010 00100 00010 00001 10001 01110",
    4: "00010 00110 01010 10010 11111 00010 00010",
    5: "11111 10000 11110 00001 00001 10001 01110",
    6: "00110 01000 10000 11110 10001 10001 01110",
    7: "11111 00001 00010 00100 01000 01000 01000",
    8: "01110 10001 10001 01110 10001 10001 01110",
    9: "01110 10001 10001 01111 00001 00010 01100",
    " ": "00000 00000 00000 00000 00000 00000 00000",
    ".": "00000 00000 00000 00000 00000 01100 01100",
    ",": "00000 00000 00000 00000 01100 01100 00100",
    ":": "00000 01100 01100 00000 01100 01100 00000",
    "!": "00100 00100 00100 00100 00100 00000 00100",
    "?": "01110 10001 00001 00010 00100 00000 00100",
    "-": "00000 00000 00000 11111 00000 00000 00000",
    "+": "00000 00100 00100 11111 00100 00100 00000",
    "/": "00001 00010 00010 00100 01000 01000 10000",
    "'": "00100 00100 01000 00000 00000 00000 00000",
    "(": "00010 00100 01000 01000 01000 00100 00010",
    ")": "01000 00100 00010 00010 00010 00100 01000",
  };
  const FONT = {};
  for (const [ch, src] of Object.entries(GLYPHS)) FONT[ch] = src.split(" ");

  const GLYPH_W = 5;
  const GLYPH_H = 7;

  // ---------------------------------------------------------------- dom / canvas
  const stage = $("stage");
  const canvas = $("game");
  // alpha:true so the page background shows through the very first frame
  // instead of an opaque black flash before the loop paints
  const ctx = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  let DPR = 1;
  let U = 3; // sprite pixel size in css px
  let GROUND = 240;
  let DINO_X = 120;
  let BASE_SPEED = 420;
  let GRAVITY = 2490;
  let JUMP_V = 876;
  let HUD = 3;

  const PALETTE = {
    light: { bg: [247, 247, 247], ink: [76, 76, 76], soft: [190, 190, 190] },
    dark: { bg: [22, 22, 22], ink: [232, 232, 232], soft: [86, 86, 86] },
  };

  const S = { READY: "ready", RUN: "run", OVER: "over", PAUSE: "pause" };

  const state = {
    phase: S.READY,
    score: 0,
    best: load("dino.best", 0) || 0,
    speed: 0,
    night: 0,
    nightOn: false,
    nextNight: 700,
    nextPoint: 100,
    spawnIn: 1.1,
    frame: 0,
    frameT: 0,
    shake: 0,
    overAt: 0,
  };

  const dino = { y: 0, vy: 0, air: false, duck: false, duckHeld: false };
  let obstacles = [];
  let clouds = [];
  let stars = [];
  let bumps = [];
  let bumpSpan = 1;

  // ---------------------------------------------------------------- audio
  const audio = {
    ac: null,
    muted: load("dino.muted", false) === true,
    ensure() {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
          this.ac = new AC();
        } catch {
          return;
        }
      }
      if (this.ac.state === "suspended") this.ac.resume().catch(() => {});
    },
    tone(freq, dur, type, vol, slideTo) {
      if (this.muted || !this.ac) return;
      const t0 = this.ac.currentTime;
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },
    play(name) {
      if (this.muted) return;
      this.ensure();
      if (!this.ac) return;
      if (name === "jump") this.tone(480, 0.09, "square", 0.045, 720);
      else if (name === "point") this.tone(880, 0.07, "square", 0.04, 1280);
      else if (name === "hit") {
        this.tone(200, 0.28, "sawtooth", 0.075, 55);
        this.tone(90, 0.32, "square", 0.05, 40);
      } else if (name === "night") this.tone(620, 0.14, "sine", 0.05, 930);
      else if (name === "start") this.tone(520, 0.08, "square", 0.04, 780);
    },
  };

  // ---------------------------------------------------------------- layout
  function layout() {
    // measure the canvas itself: the stage has a border, and a 1px mismatch
    // would stretch every pixel we draw
    const rect = canvas.getBoundingClientRect();
    const oldW = W;
    W = Math.max(280, Math.round(rect.width));
    H = Math.max(150, Math.round(rect.height));
    DPR = clamp(Math.round((window.devicePixelRatio || 1) * 100) / 100, 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // sprite scale: follow the shorter constraint so the dino never dominates a phone
    const byWidth = Math.max(2, Math.round(W / 360));
    const byHeight = Math.max(2, Math.round(H / 106));
    U = clamp(Math.min(byWidth, byHeight), 2, 5);
    GROUND = Math.round(H * 0.8);
    HUD = clamp(U, 2, 4);
    DINO_X = Math.round(W * 0.12);
    // speed follows the play area width so reaction time stays fair on any screen
    BASE_SPEED = clamp(W * 0.42, 190, 560);
    GRAVITY = 830 * U;
    JUMP_V = 292 * U;

    if (oldW && oldW !== W) {
      const k = W / oldW;
      for (const o of obstacles) o.x *= k;
    }
    buildScenery();
  }

  function buildScenery() {
    clouds = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({ x: rand(-40, W), y: rand(H * 0.08, H * 0.4), s: rand(0.75, 1.2) });
    }
    stars = [];
    for (let i = 0; i < 42; i++) {
      stars.push({ x: rand(0, W), y: rand(H * 0.05, H * 0.55), r: Math.random() < 0.3 ? 2 : 1 });
    }
    bumps = [];
    let x = -10;
    while (x < W + 260) {
      const w = rand(5, 24);
      bumps.push({ x, w, d: Math.random() < 0.3 ? 2 : 1 });
      x += w + rand(22, 78);
    }
    bumpSpan = Math.max(W + 260, x);
  }

  // ---------------------------------------------------------------- drawing
  const mix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

  function drawSprite(sprite, x, y, unit, color) {
    ctx.fillStyle = color;
    const ox = Math.round(x);
    const oy = Math.round(y);
    const px = sprite.px;
    for (let i = 0; i < px.length; i += 2) {
      ctx.fillRect(ox + px[i] * unit, oy + px[i + 1] * unit, unit, unit);
    }
  }

  function textWidth(str, size) {
    return str.length * (GLYPH_W + 1) * size - size;
  }

  function drawText(str, x, y, size, color, align = "left", alpha = 1) {
    str = String(str).toUpperCase();
    const w = textWidth(str, size);
    if (align === "center") x -= w / 2;
    else if (align === "right") x -= w;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const ch of str) {
      const g = FONT[ch] || FONT["?"];
      for (let row = 0; row < GLYPH_H; row++) {
        const bits = g[row];
        for (let col = 0; col < GLYPH_W; col++) {
          if (bits[col] === "1") ctx.fillRect(cx + col * size, cy + row * size, size, size);
        }
      }
      cx += (GLYPH_W + 1) * size;
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- game flow
  function resetRun() {
    state.score = 0;
    state.speed = BASE_SPEED;
    state.night = 0;
    state.nightOn = false;
    state.nextNight = 700;
    state.nextPoint = 100;
    state.spawnIn = 1.0;
    state.frame = 0;
    state.frameT = 0;
    state.shake = 0;
    dino.y = 0;
    dino.vy = 0;
    dino.air = false;
    dino.duck = false;
    dino.duckHeld = false;
    obstacles = [];
  }

  function startRun() {
    resetRun();
    state.phase = S.RUN;
    audio.ensure();
    audio.play("start");
    live("Run started. Press space to jump, down arrow to duck.");
  }

  function endRun() {
    state.phase = S.OVER;
    state.overAt = performance.now();
    state.shake = 1;
    audio.play("hit");
    const final = Math.floor(state.score);
    if (final > state.best) {
      state.best = final;
      save("dino.best", final);
    }
    bestEl.textContent = state.best;
    live(`Game over. Score ${final}. Best ${state.best}. Press space to try again.`);
    canvas.setAttribute("aria-label", `Dino Runner. Game over, score ${final}.`);
  }

  function primary() {
    if (state.phase === S.READY) {
      startRun();
    } else if (state.phase === S.OVER) {
      if (performance.now() - state.overAt > 350) startRun();
    } else if (state.phase === S.PAUSE) {
      setPaused(false);
    } else {
      jump();
    }
  }

  function jump() {
    if (state.phase !== S.RUN) return;
    if (dino.air) return;
    dino.vy = JUMP_V;
    dino.air = true;
    dino.duck = false;
    audio.play("jump");
  }

  function cutJump() {
    if (dino.air && dino.vy > JUMP_V * 0.42) dino.vy = JUMP_V * 0.42;
  }

  function setDuck(on) {
    dino.duckHeld = on;
    if (state.phase !== S.RUN) dino.duck = false;
  }

  function setPaused(on) {
    if (on && state.phase === S.RUN) {
      state.phase = S.PAUSE;
      pauseBtn.textContent = "RESUME";
      pauseBtn.setAttribute("aria-pressed", "true");
    } else if (!on && state.phase === S.PAUSE) {
      state.phase = S.RUN;
      pauseBtn.textContent = "PAUSE";
      pauseBtn.setAttribute("aria-pressed", "false");
    }
  }

  // ---------------------------------------------------------------- obstacles
  function spawnCactus() {
    const large = state.score > 120 && Math.random() < 0.42;
    const sprite = large ? SPR.cactusLarge : SPR.cactusSmall;
    const r = Math.random();
    let count = 1;
    if (large) count = r < 0.32 ? 2 : 1;
    else count = r < 0.22 ? 3 : r < 0.58 ? 2 : 1;

    const gap = 2;
    const parts = [];
    let dx = 0;
    for (let i = 0; i < count; i++) {
      parts.push({ sprite, dx });
      dx += sprite.w + gap;
    }
    const width = dx - gap;
    obstacles.push({
      type: "cactus",
      x: W + 20,
      w: width * U,
      h: sprite.h * U,
      bottom: 0,
      parts,
      hit: { l: 1, r: 1, t: 0, b: 0 },
    });
  }

  function spawnPtero() {
    // level 13 puts the body at head height (duck under), level 0 sits low (jump over)
    const bottom = Math.random() < 0.58 ? 13 : 0;
    obstacles.push({
      type: "ptero",
      x: W + 20,
      w: SPR.pteroUp.w * U,
      h: SPR.pteroUp.h * U,
      bottom: bottom * U,
      parts: null,
      frame: 0,
      frameT: 0,
      hit: { l: 0, r: 2, t: 6, b: 5 },
    });
  }

  function spawn() {
    const canFly = state.score > 300;
    if (canFly && Math.random() < 0.28) spawnPtero();
    else spawnCactus();
    const pace = 1 - 0.5 * clamp(state.score / 1500, 0, 1);
    state.spawnIn = rand(1.0, 1.75) * (0.85 + pace * 0.15);
  }

  function obstacleBox(o) {
    return {
      x: o.x + o.hit.l * U,
      y: GROUND - o.bottom - o.h + o.hit.t * U,
      w: o.w - (o.hit.l + o.hit.r) * U,
      h: o.h - (o.hit.t + o.hit.b) * U,
    };
  }

  function dinoBox() {
    const ducking = dino.duck && !dino.air;
    const sprite = ducking ? SPR.dinoDuck : SPR.dinoIdle;
    const h = sprite.h * U;
    const bottom = GROUND - dino.y;
    const t = 1;
    const b = 1;
    return {
      x: DINO_X + 3 * U,
      y: bottom - h + t * U,
      w: sprite.w * U - 6 * U,
      h: h - (t + b) * U,
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    state.frameT += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3.2);

    const moving = state.phase === S.RUN;
    const speed = moving ? state.speed : 0;

    // clouds drift on the title screen, race during play, and freeze on pause
    const drift = moving ? speed * 0.22 : state.phase === S.PAUSE ? 0 : 18;
    for (const c of clouds) {
      c.x -= drift * dt;
      if (c.x < -SPR.cloud.w * 3) {
        c.x = W + rand(20, 240);
        c.y = rand(H * 0.08, H * 0.4);
        c.s = rand(0.75, 1.2);
      }
    }

    if (!moving) {
      // let the dino drop to the ground after a crash while the world stays frozen
      if (state.phase === S.OVER && dino.air) {
        dino.vy -= GRAVITY * dt;
        dino.y += dino.vy * dt;
        if (dino.y <= 0) {
          dino.y = 0;
          dino.vy = 0;
          dino.air = false;
        }
      }
      return;
    }

    // pace & score
    const ramp = clamp(state.score / 1500, 0, 1);
    state.speed = BASE_SPEED * (1 + ramp * 1.05);
    const dist = state.speed * dt;
    state.score += dist * 0.025;

    if (state.score >= state.nextPoint) {
      state.nextPoint += 100;
      audio.play("point");
    }
    if (state.score >= state.nextNight) {
      state.nextNight += 700;
      state.nightOn = !state.nightOn;
      audio.play("night");
    }
    state.night += ((state.nightOn ? 1 : 0) - state.night) * Math.min(1, dt * 1.7);

    // dino physics
    if (dino.air) {
      const g = dino.duckHeld ? GRAVITY * 2.4 : GRAVITY;
      dino.vy -= g * dt;
      dino.y += dino.vy * dt;
      if (dino.y <= 0) {
        dino.y = 0;
        dino.vy = 0;
        dino.air = false;
      }
    }
    dino.duck = !dino.air && dino.duckHeld;

    // run cycle
    const frameRate = 0.055 + 0.25 / state.speed;
    if (!dino.air && state.frameT > frameRate) {
      state.frameT = 0;
      state.frame = state.frame === 0 ? 1 : 0;
    }

    // ground
    for (const b of bumps) {
      b.x -= dist;
      if (b.x + b.w < -20) b.x += bumpSpan;
    }

    // obstacles
    for (const o of obstacles) {
      o.x -= dist;
      if (o.type === "ptero") {
        o.frameT += dt;
        if (o.frameT > 0.13) {
          o.frameT = 0;
          o.frame = o.frame === 0 ? 1 : 0;
        }
      }
    }

    // collision
    const db = dinoBox();
    for (const o of obstacles) {
      if (o.x + o.w < DINO_X - 10) continue;
      if (o.x > DINO_X + 160 * U) continue;
      if (overlaps(db, obstacleBox(o))) {
        endRun();
        return;
      }
    }
    obstacles = obstacles.filter((o) => o.x + o.w > -40);

    // spawning
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) spawn();
  }

  // ---------------------------------------------------------------- render
  let lastBg = "";
  let lastInk = "";

  function render() {
    const n = state.night;
    const bg = mix(PALETTE.light.bg, PALETTE.dark.bg, n);
    const ink = mix(PALETTE.light.ink, PALETTE.dark.ink, n);
    const soft = mix(PALETTE.light.soft, PALETTE.dark.soft, n);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (bg !== lastBg) {
      document.documentElement.style.setProperty("--bg", bg);
      lastBg = bg;
    }
    if (ink !== lastInk) {
      document.documentElement.style.setProperty("--ink", ink);
      lastInk = ink;
    }

    ctx.save();
    if (state.shake > 0) {
      const s = state.shake * 6;
      ctx.translate(rand(-s, s), rand(-s, s));
    }

    drawSky(ink, bg, n);
    drawClouds(soft);
    drawGround(ink);
    drawObstacles(ink);
    drawDino(ink);
    ctx.restore();

    drawHud(ink);
    drawOverlay(ink, bg);
  }

  function drawSky(ink, bg, n) {
    if (n < 0.02) return;
    ctx.globalAlpha = n * 0.85;
    ctx.fillStyle = ink;
    for (const s of stars) ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r);
    // crescent moon
    const r = Math.max(9, H * 0.045);
    const mx = W * 0.72;
    const my = H * 0.28;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(mx - r * 0.42, my - r * 0.18, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawClouds(soft) {
    const cu = Math.max(2, U - 1);
    for (const c of clouds) {
      drawSprite(SPR.cloud, c.x, c.y, Math.max(2, Math.round(cu * c.s)), soft);
    }
  }

  function drawGround(ink) {
    const lineH = Math.max(2, Math.round(H / 150));
    ctx.fillStyle = ink;
    ctx.fillRect(0, GROUND, W, lineH);
    for (const b of bumps) {
      ctx.fillRect(Math.round(b.x), GROUND + lineH, Math.round(b.w), b.d);
    }
  }

  function drawObstacles(ink) {
    for (const o of obstacles) {
      const top = GROUND - o.bottom - o.h;
      if (o.type === "cactus") {
        for (const p of o.parts) {
          drawSprite(p.sprite, o.x + p.dx * U, top, U, ink);
        }
      } else {
        const sprite = o.frame === 0 ? SPR.pteroUp : SPR.pteroDown;
        drawSprite(sprite, o.x, top, U, ink);
      }
    }
  }

  function drawDino(ink) {
    let sprite;
    if (dino.duck && !dino.air) sprite = SPR.dinoDuck;
    else if (dino.air) sprite = SPR.dinoIdle;
    else if (state.phase === S.RUN || state.phase === S.PAUSE) sprite = state.frame === 0 ? SPR.dinoRunA : SPR.dinoRunB;
    else sprite = SPR.dinoIdle;

    const y = GROUND - dino.y - sprite.h * U;
    drawSprite(sprite, DINO_X, y, U, ink);
  }

  function drawHud(ink) {
    const best = String(Math.floor(state.best)).padStart(5, "0");
    const score = String(Math.floor(state.score)).padStart(5, "0");
    const size = HUD;
    const pad = Math.round(H * 0.045);
    drawText(`HI ${best}`, W - pad, pad, size, ink, "right", 0.5);
    drawText(score, W - pad, pad + size * GLYPH_H + size * 2, size, ink, "right", 1);
  }

  function drawOverlay(ink, bg) {
    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    const room = W - 24;
    if (state.phase === S.READY) {
      const y = GROUND - 44 * U;
      const msg = textWidth("PRESS SPACE OR TAP TO START", HUD) <= room ? "PRESS SPACE OR TAP TO START" : "TAP TO START";
      drawText(msg, W / 2, y, HUD, ink, "center", blink ? 0.9 : 0.45);
    } else if (state.phase === S.OVER) {
      const size = HUD + Math.max(1, Math.round(HUD / 2));
      drawText("GAME OVER", W / 2, H * 0.24, size, ink, "center", 1);
      const y = H * 0.24 + size * GLYPH_H + size * 3;
      const msg = textWidth("PRESS SPACE OR TAP TO RETRY", HUD) <= room ? "PRESS SPACE OR TAP TO RETRY" : "TAP TO RETRY";
      drawText(msg, W / 2, y, HUD, ink, "center", blink ? 0.85 : 0.4);
    } else if (state.phase === S.PAUSE) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      drawText("PAUSED", W / 2, H * 0.34, HUD + 1, ink, "center", 1);
      drawText("PRESS P TO RESUME", W / 2, H * 0.34 + (HUD + 1) * GLYPH_H + 14, HUD, ink, "center", 0.6);
    }
  }

  // ---------------------------------------------------------------- main loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- input
  const bestEl = $("best");
  const pauseBtn = $("btn-pause");
  const soundBtn = $("btn-sound");
  const liveEl = $("live");

  function live(msg) {
    liveEl.textContent = msg;
  }

  function syncSoundBtn() {
    soundBtn.textContent = audio.muted ? "SOUND OFF" : "SOUND ON";
    soundBtn.setAttribute("aria-pressed", String(!audio.muted));
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    save("dino.muted", audio.muted);
    syncSoundBtn();
    if (!audio.muted) audio.play("start");
  }

  window.addEventListener("keydown", (e) => {
    const code = e.code;
    if (code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "Enter") {
      e.preventDefault();
      if (!e.repeat) primary();
    } else if (code === "ArrowDown" || code === "KeyS") {
      e.preventDefault();
      if (!e.repeat) setDuck(true);
    } else if (code === "KeyP" || code === "Escape") {
      e.preventDefault();
      setPaused(state.phase === S.RUN);
    } else if (code === "KeyM") {
      toggleMute();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") cutJump();
    else if (e.code === "ArrowDown" || e.code === "KeyS") setDuck(false);
  });

  // touch / mouse: tap the stage to start or jump
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    audio.ensure();
    primary();
    e.preventDefault();
  });

  // dedicated mobile buttons
  for (const [id, down, up] of [
    ["btn-jump", () => primary(), () => cutJump()],
    ["btn-duck", () => setDuck(true), () => setDuck(false)],
  ]) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      audio.ensure();
      down();
    });
    el.addEventListener("pointerup", (e) => {
      e.preventDefault();
      up();
    });
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }

  pauseBtn.addEventListener("click", () => {
    if (state.phase === S.RUN || state.phase === S.PAUSE) setPaused(state.phase === S.RUN);
    else if (state.phase === S.READY || state.phase === S.OVER) startRun();
  });

  soundBtn.addEventListener("click", toggleMute);

  $("btn-restart").addEventListener("click", () => {
    audio.ensure();
    startRun();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === S.RUN) setPaused(true);
  });

  // ---------------------------------------------------------------- boot
  // tiny read-only probe, handy for debugging and automated checks
  window.__runner = () => ({
    phase: state.phase,
    score: Math.floor(state.score),
    best: state.best,
    speed: Math.round(state.speed),
    night: Math.round(state.night * 100) / 100,
    u: U,
    w: W,
    h: H,
    ground: GROUND,
    dino: { x: DINO_X, y: Math.round(dino.y), air: dino.air, duck: dino.duck, box: dinoBox() },
    obs: obstacles.map((o) => ({
      type: o.type,
      x: Math.round(o.x),
      w: Math.round(o.w),
      h: Math.round(o.h),
      bottom: Math.round(o.bottom),
      box: obstacleBox(o),
    })),
  });

  bestEl.textContent = state.best;
  syncSoundBtn();
  layout();
  new ResizeObserver(() => layout()).observe(stage);
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();

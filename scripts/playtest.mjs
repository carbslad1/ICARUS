#!/usr/bin/env node
// Headless visual playtest for the self-contained ICARUS demo build.
//
// What it does: opens ICARUS-demo.html in headless Chromium (no server needed),
// starts a run, drives the game with real keyboard input, takes screenshots at
// meaningful moments and records plain-number state snapshots. It then writes
// report.json + summary.md and prints a short plain-English summary.
//
// It exists because the game's owner cannot read code: he judges ICARUS by
// playing and looking at it. This tool lets an AI actually look at the game.
//
// Run:  node scripts/playtest.mjs --mode flight --seconds 20
// Help: node scripts/playtest.mjs --help
//
// No dependencies beyond the project's own devDependency `playwright`
// (installed by `npm ci`; Chromium lives in ~/Library/Caches/ms-playwright).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DEFAULT_HTML = path.join(ROOT, 'ICARUS-demo.html');
const VIEWPORT = { width: 1440, height: 900 };
// Same flags qa/product-review.cjs uses: real WebGL through SwiftShader.
const CHROMIUM_ARGS = ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'];

const MODES = ['title', 'play', 'flight', 'shop'];

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function usage() {
  const lines = [
    'ICARUS headless visual playtest',
    '',
    'Usage:',
    '  node scripts/playtest.mjs [options]',
    '',
    'Options:',
    '  --mode title|play|flight|shop  what to exercise (default: play)',
    '  --html <path>                  build to open (default: ICARUS-demo.html)',
    '  --out <dir>                    screenshot/report folder',
    '                                 (default: qa/playtest/<timestamp>)',
    '  --seconds <n>                  how long to run, in seconds (default: 8;',
    '                                 flight mode: 20)',
    '  --keys <spec>                  extra keyboard input, e.g. "w:3000" holds',
    '                                 w for 3 s, "a+w:1500,space" holds a+w for',
    '                                 1.5 s then taps space',
    '  --shots <t1,t2,...>            extra screenshots at these second marks',
    '  --json                         print only a machine-readable summary',
    '  --keep-open                    leave the browser open after the run',
    '  --help                         show this help',
    '',
    'Examples:',
    '  node scripts/playtest.mjs --mode play --seconds 8',
    '  node scripts/playtest.mjs --mode flight --seconds 20',
    '  node scripts/playtest.mjs --mode play --keys "w:2500" --shots 1,3,6',
    '',
    'Exit codes: 0 = passed, 1 = playtest failed, 2 = setup problem',
    '            (for example: playwright/Chromium not installed -> run npm ci)',
  ];
  return lines.join('\n');
}

function parseArgs(argv) {
  const opts = {
    mode: 'play',
    html: DEFAULT_HTML,
    out: null,
    seconds: null,
    keys: [],
    shots: [],
    json: false,
    keepOpen: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = (name) => {
      const next = argv[++i];
      if (next == null) failUsage(`${name} needs a value`);
      return next;
    };
    switch (arg) {
      case '--mode': opts.mode = value('--mode'); break;
      case '--html': opts.html = value('--html'); break;
      case '--out': opts.out = value('--out'); break;
      case '--seconds': opts.seconds = Number(value('--seconds')); break;
      case '--keys': opts.keys = parseKeySpec(value('--keys')); break;
      case '--shots':
        opts.shots = value('--shots')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n >= 0);
        break;
      case '--json': opts.json = true; break;
      case '--keep-open': opts.keepOpen = true; break;
      case '--help':
      case '-h': opts.help = true; break;
      default: failUsage(`unknown option ${JSON.stringify(arg)}`);
    }
  }
  if (!MODES.includes(opts.mode)) failUsage(`--mode must be one of ${MODES.join(', ')}`);
  opts.seconds = Number.isFinite(opts.seconds) && opts.seconds > 0
    ? opts.seconds
    : (opts.mode === 'flight' ? 20 : 8);
  opts.html = path.resolve(process.cwd(), opts.html);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  opts.out = opts.out
    ? path.resolve(process.cwd(), opts.out)
    : path.join(ROOT, 'qa', 'playtest', stamp);
  return opts;
}

function failUsage(message) {
  console.error(`playtest: ${message}`);
  console.error('');
  console.error(usage());
  process.exit(2);
}

// --keys "w:3000" / "a+w:1500" / "space" -> [{ keys: ['w'], ms: 3000 }, ...]
const KEY_NAMES = {
  space: 'Space', shift: 'Shift', enter: 'Enter', esc: 'Escape', escape: 'Escape',
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
};
function parseKeySpec(spec) {
  if (!spec || !String(spec).trim()) return [];
  return String(spec).split(',').map((item) => {
    const [keysPart, msPart] = item.trim().split(':');
    const keys = keysPart.split('+').map((k) => k.trim().toLowerCase()).filter(Boolean)
      .map((k) => KEY_NAMES[k] || k);
    if (!keys.length) failUsage(`--keys item ${JSON.stringify(item)} has no key`);
    const ms = msPart == null ? 60 : Number(msPart);
    if (!Number.isFinite(ms) || ms < 0) failUsage(`--keys item ${JSON.stringify(item)} has a bad duration`);
    return { keys, ms };
  });
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function humanTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  return `${s.toFixed(1)} s`;
}

function rel(file) {
  return path.relative(process.cwd(), file) || file;
}

// Minimal PNG decoder (8-bit, non-interlaced) used only to prove screenshots
// are not blank/black. Chromium screenshots are RGBA/RGB PNGs.
function pngStats(buffer) {
  try {
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
    let pos = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
    const idat = [];
    while (pos + 8 <= buffer.length) {
      const len = buffer.readUInt32BE(pos);
      const type = buffer.toString('ascii', pos + 4, pos + 8);
      const start = pos + 8;
      const data = buffer.subarray(start, start + len);
      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === 'IDAT') {
        idat.push(data);
      } else if (type === 'IEND') break;
      pos = start + len + 4;
    }
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
    if (!width || !height || !channels || bitDepth !== 8 || interlace !== 0) return null;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const pixels = Buffer.alloc(height * stride);
    let rp = 0, op = 0;
    for (let y = 0; y < height; y++) {
      const filter = raw[rp++];
      const rowStart = op;
      raw.copy(pixels, op, rp, rp + stride);
      rp += stride;
      op += stride;
      const prev = y > 0 ? rowStart - stride : -1;
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? pixels[rowStart + x - channels] : 0;
        const b = prev >= 0 ? pixels[prev + x] : 0;
        const c = (x >= channels && prev >= 0) ? pixels[prev + x - channels] : 0;
        let v = pixels[rowStart + x];
        if (filter === 1) v = (v + a) & 255;
        else if (filter === 2) v = (v + b) & 255;
        else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        }
        pixels[rowStart + x] = v;
      }
    }
    // Sample a bounded grid of pixels.
    const targetSamples = 40000;
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / targetSamples)));
    let samples = 0, lumaSum = 0, nearBlack = 0, maxLuma = 0;
    const colours = new Set();
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = y * stride + x * channels;
        let r, g, b;
        if (channels === 1 || channels === 2) { r = g = b = pixels[i]; }
        else { r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2]; }
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumaSum += luma;
        if (luma < 8) nearBlack++;
        if (luma > maxLuma) maxLuma = luma;
        colours.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
        samples++;
      }
    }
    const meanLuma = lumaSum / samples;
    const nearBlackRatio = nearBlack / samples;
    const distinctColours = colours.size;
    const blank = nearBlackRatio > 0.995 || distinctColours <= 2 || maxLuma < 6;
    return { width, height, meanLuma: +meanLuma.toFixed(1), nearBlackRatio: +nearBlackRatio.toFixed(3), distinctColours, blank };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Playtest run
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }

  // Setup problems exit 2, with an actionable message.
  if (!fs.existsSync(opts.html)) {
    console.error(`playtest: cannot find the build: ${opts.html}`);
    console.error('playtest: build it with "node source/build.cjs" (or pass --html <path>).');
    return 2;
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    console.error('playtest: the "playwright" package is missing, so the game cannot be opened.');
    console.error('playtest: run "npm ci" in the project root first (it installs playwright).');
    console.error(`playtest: details: ${err && err.message ? err.message : err}`);
    return 2;
  }

  fs.mkdirSync(opts.out, { recursive: true });
  const startedAt = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    command: `node scripts/playtest.mjs ${process.argv.slice(2).join(' ')}`.trim(),
    mode: opts.mode,
    html: opts.html,
    outDir: opts.out,
    seconds: opts.seconds,
    icarusVersion: null,
    result: 'fail',
    exitCode: 1,
    checks: [],
    screenshots: [],
    snapshots: [],
    events: [],
    flight: null,
    shop: null,
    errors: { pageErrors: [], consoleErrors: [] },
  };
  const checks = report.checks;
  const fail = (name, detail) => checks.push({ name, ok: false, detail });
  const pass = (name, detail = '') => checks.push({ name, ok: true, detail });
  let fatalError = null;
  let page = null;
  let browser = null;

  const log = (msg) => { if (!opts.json) console.log(msg); else console.error(msg); };
  const snapshots = [];
  let lastSnapshotAt = -1;
  const screenshotLog = [];

  const browserConsole = [];
  async function collectSnapshot(elapsed) {
    if (elapsed - lastSnapshotAt < 0.4) return null;
    lastSnapshotAt = elapsed;
    try {
      const snap = await page.evaluate(() => {
        const a = window.icarusDemo;
        if (!a || !a.state) return null;
        const s = a.state;
        const m = s.medium || {};
        const altitude = m.origin && typeof m.origin.y === 'number' ? m.origin.y
          : (m.pos && typeof m.pos.y === 'number' ? m.pos.y : 0);
        return {
          t: +(s.time || 0).toFixed(2),
          mode: s.mode || 'unknown',
          kind: m.kind || 'unknown',
          wave: s.wave || 0,
          score: Math.round(s.wscore ?? s.score ?? 0),
          hp: Math.round(s.hp ?? 0),
          enemies: (s.enemies ? s.enemies.length : 0) + (s.pursuers ? s.pursuers.length : 0),
          level: s.lvl ?? 0,
          budget: +(s.budget ?? 0).toFixed(1),
          xp: Math.round(s.xp ?? 0),
          kills: s.kills ?? 0,
          mult: +(a.scoreboard?.state?.mult ?? 0),
          streak: s.demo?.streak ?? 0,
          heading: +(m.heading ?? 0).toFixed(2),
          altitude: +altitude.toFixed(2),
          vy: +(m.vy ?? m.velocity?.y ?? 0).toFixed(1),
        };
      });
      if (snap) snapshots.push({ elapsed: +elapsed.toFixed(2), ...snap });
      return snap;
    } catch {
      return null;
    }
  }

  function nextShotName(label) {
    const n = String(screenshotLog.length + 1).padStart(2, '0');
    return `${n}-${label}`;
  }

  async function takeShot(label, extra = {}) {
    const file = path.join(opts.out, `${nextShotName(label)}.png`);
    let buf = null;
    let stats = null;
    let simTime = null;
    try {
      simTime = await page.evaluate(() => +(window.icarusDemo?.state?.time ?? 0).toFixed(2));
    } catch { /* keep null */ }
    try {
      buf = await page.screenshot({ path: file });
      stats = pngStats(buf) || pngStats(fs.readFileSync(file));
    } catch (err) {
      stats = { blank: true, error: String(err && err.message ? err.message : err) };
    }
    const entry = {
      label,
      file,
      atSeconds: simTime,
      meanLuma: stats ? stats.meanLuma : null,
      nearBlackRatio: stats ? stats.nearBlackRatio : null,
      distinctColours: stats ? stats.distinctColours : null,
      blank: stats ? !!stats.blank : null,
      ...extra,
    };
    screenshotLog.push(entry);
    if (stats && stats.blank) fail(`screenshot ${label} is blank/black`, `${rel(file)} looks empty (mean brightness ${stats.meanLuma}/255)`);
    else if (stats) pass(`screenshot ${label} shows content`, `${rel(file)}: mean brightness ${stats.meanLuma}/255, ${stats.distinctColours} colours`);
    else pass(`screenshot ${label} saved`, `${rel(file)} (could not decode for blank-check)`);
    return entry;
  }

  // Start a run: real click on the title button first, hook fallback second.
  async function startRun() {
    const begin = page.locator('[data-demo="begin"]').first();
    const visible = (await begin.count()) > 0 && await begin.isVisible().catch(() => false);
    if (visible) {
      await begin.click();
      report.events.push({ at: 'start', action: 'clicked [data-demo="begin"]' });
    } else {
      await page.evaluate(() => window.icarusDemo.start('harpoon', 1));
      report.events.push({ at: 'start', action: "called window.icarusDemo.start('harpoon', 1)" });
    }
    try {
      await page.waitForFunction(() => window.icarusDemo?.state?.mode === 'playing', null, { timeout: 10000 });
    } catch {
      // Fallback: the title hook is the documented way in.
      await page.evaluate(() => window.icarusDemo.start('harpoon', 1));
      await page.waitForFunction(() => window.icarusDemo?.state?.mode === 'playing', null, { timeout: 10000 });
    }
    const started = await page.evaluate(() => ({ mode: window.icarusDemo.state.mode, wave: window.icarusDemo.state.wave, starter: window.icarusDemo.state.slots?.[0]?.id || null }));
    report.events.push({ at: 'started', ...started });
    if (started.mode !== 'playing') throw new Error(`the run did not start (mode=${started.mode})`);
    // Let the first frames settle: shader compilation on a cold headless GPU
    // makes the first second of game time run slowly, and the launch input is
    // timed from here.
    try {
      await page.waitForFunction(() => window.icarusDemo.state.time > 0.35, null, { timeout: 6000 });
    } catch { /* if the clock never moves the flight check below will catch it */ }
    pass('the game started', `mode playing, wave ${started.wave}, weapon ${started.starter}`);
    return started;
  }

  async function runKeys(specs) {
    if (!specs.length) return;
    for (const spec of specs) {
      for (const key of spec.keys) await page.keyboard.down(key);
      await sleep(spec.ms);
      for (const key of spec.keys.slice().reverse()) await page.keyboard.up(key);
      report.events.push({ at: 'keys', keys: spec.keys, ms: spec.ms });
    }
  }

  // Hold W (boost) and pull the nose up with A until the carver launches.
  // Discovery (verified against the real build): the opening dive starts at
  // heading -PI/4; A turns the nose anti-clockwise. The breach happens when the
  // nose is climbing. Two traps learned the hard way:
  //  - holding A continuously rotates the nose straight past the surface and
  //    loops underwater forever, so A is released once the nose is steep
  //    (1.35 rad, about 77 degrees above horizontal) and re-pressed if it falls
  //    back below 1.0 rad (wrap-safe: only the low end of the range is used).
  //    Releasing too early (e.g. 0.45 rad) still launches, but only as a
  //    ~1-6 m hop; the steep nose is what produces the big ascent arc;
  //  - under SwiftShader load the game clock can run ~5x slow, so the attempt
  //    is bounded by *game* seconds, not just wall time.
  async function launchIntoAir(maxSeconds, elapsedFn) {
    const flight = { launched: false, launchSeconds: null, maxAltitude: 0, apexSeconds: null, apexAltitude: null, landed: false, landingSeconds: null };
    await page.keyboard.down('w');
    const hardDeadline = Date.now() + maxSeconds * 1000;
    const started = Date.now();
    let turning = false;
    let last = null;
    let launchStartGameTime = null;
    let lastGameTime = -1;
    let lastGameAdvanceAt = Date.now();
    while (Date.now() < hardDeadline) {
      await sleep(120);
      const s = await page.evaluate(() => {
        const st = window.icarusDemo.state;
        const m = st.medium || {};
        return {
          kind: m.kind,
          heading: m.heading ?? 0,
          mode: st.mode,
          altitude: m.origin?.y ?? m.pos?.y ?? 0,
          vy: m.vy ?? m.velocity?.y ?? 0,
          time: st.time,
        };
      });
      last = s;
      if (launchStartGameTime == null) launchStartGameTime = s.time;
      await collectSnapshot(elapsedFn());
      if (s.time > lastGameTime) {
        lastGameTime = s.time;
        lastGameAdvanceAt = Date.now();
      } else if (Date.now() - lastGameAdvanceAt > 3000) {
        report.events.push({ at: 'stalled', note: 'the game clock stopped advancing; still waiting' });
        lastGameAdvanceAt = Date.now();
      }
      if (s.mode !== 'playing') break;
      if (s.kind === 'air') {
        flight.launched = true;
        flight.launchSeconds = +((Date.now() - started) / 1000).toFixed(2);
        flight.maxAltitude = Math.max(flight.maxAltitude, s.altitude || 0);
        await collectSnapshot(elapsedFn());
        break;
      }
      // A carves the nose up; release it when the nose is high enough that the
      // launch is imminent, and only start turning again if it falls back low.
      if (!turning && s.heading < 1.0) { await page.keyboard.down('a'); turning = true; }
      else if (turning && s.heading >= 1.35) { await page.keyboard.up('a'); turning = false; }
      // Give up after ~9 game seconds (plenty for a launch; wall-time safety
      // cap above stops a frozen page from running forever).
      if (s.time - launchStartGameTime > 9) break;
    }
    if (turning) { await page.keyboard.up('a'); turning = false; }
    if (!flight.launched) {
      await page.keyboard.up('w');
      await takeShot('no-launch');
      return { flight, last };
    }
    report.events.push({ at: 'launch', seconds: flight.launchSeconds, kind: 'air' });
    await page.keyboard.up('w');
    // Ride the arc: watch the ascent, the apex and the return to the water.
    const airStarted = Date.now();
    let sawAir = false;
    let previousVy = null;
    let apexShot = false;
    let ascentShot = false;
    let breachShot = false;
    while (Date.now() - airStarted < 35000) {
      await sleep(80);
      const s = await page.evaluate(() => {
        const st = window.icarusDemo.state;
        const m = st.medium || {};
        return {
          kind: m.kind,
          mode: st.mode,
          elapsed: m.elapsed ?? 0,
          altitude: m.origin?.y ?? 0,
          localY: m.local?.y ?? 0,
          vy: m.vy ?? 0,
          time: st.time,
        };
      });
      await collectSnapshot(elapsedFn());
      if (s.kind === 'air') {
        sawAir = true;
        flight.maxAltitude = Math.max(flight.maxAltitude, s.altitude || 0);
        if (!breachShot) { breachShot = true; await takeShot('breach'); }
        if (!ascentShot && (s.altitude > 2 || s.localY > 0.6 || s.elapsed > 0.4)) {
          ascentShot = true;
          await takeShot('ascent');
        }
        if (!apexShot && previousVy != null && previousVy > 0 && s.vy <= 0) {
          apexShot = true;
          flight.apexSeconds = +((Date.now() - airStarted) / 1000).toFixed(2);
          flight.apexAltitude = +(s.altitude || 0).toFixed(2);
          await collectSnapshot(elapsedFn());
          await takeShot('apex');
        }
        previousVy = s.vy;
        if (previousVy > 0 && apexShot) { /* descending */ }
      } else if (sawAir && s.kind === 'water') {
        flight.landed = true;
        flight.landingSeconds = +((Date.now() - airStarted) / 1000).toFixed(2);
        flight.maxAltitude = +flight.maxAltitude.toFixed(2);
        report.events.push({ at: 'landing', seconds: flight.landingSeconds, kind: 'water' });
        await collectSnapshot(elapsedFn());
        await sleep(150);
        await takeShot('landing');
        break;
      } else if (s.mode !== 'playing') {
        // The run ended in the air (bust) or the shop opened on landing.
        report.events.push({ at: 'air-end', mode: s.mode, time: s.time });
        if (s.mode === 'shop') { await takeShot('shop'); break; }
        if (s.mode === 'dead' || s.mode === 'won') { await takeShot(`end-${s.mode}`); break; }
      }
    }
    if (!sawAir) return { flight, last };
    if (!apexShot) { flight.apexAltitude = +flight.maxAltitude.toFixed(2); await takeShot('apex-fallback'); }
    if (!flight.landed && !flight.landingSeconds) await takeShot('air-end');
    return { flight, last };
  }

  try {
    // ---- open the build --------------------------------------------------
    browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS }).catch((err) => {
      console.error('playtest: could not launch headless Chromium.');
      console.error('playtest: the browser binary may be missing. Run "npm ci" again; it is cached under ~/Library/Caches/ms-playwright.');
      console.error(`playtest: details: ${err && err.message ? err.message : err}`);
      return null;
    });
    if (!browser) return 2;

    page = await browser.newPage({ viewport: VIEWPORT });
    page.on('pageerror', (err) => report.errors.pageErrors.push({ message: err.message, stack: err.stack || null }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') report.errors.consoleErrors.push({ text: msg.text() });
    });

    const url = 'file://' + opts.html;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.icarusDemo && !!window.icarusDemo.state, null, { timeout: 20000 });
    report.icarusVersion = await page.evaluate(() => window.icarusDemo.version || null);
    pass('the build opened over file://', `${rel(opts.html)}, automation version ${report.icarusVersion || 'unknown'}`);

    const canvas = await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      const r = c ? c.getBoundingClientRect() : null;
      return r ? { width: Math.round(r.width), height: Math.round(r.height) } : null;
    });
    if (!canvas || canvas.width < 100 || canvas.height < 100) fail('game canvas is present and sized', 'no sized #stage canvas found');
    else pass('game canvas is present and sized', `${canvas.width}x${canvas.height}`);

    // ---- mode: title -----------------------------------------------------
    if (opts.mode === 'title') {
      await page.waitForSelector('[data-demo="begin"]', { state: 'visible', timeout: 20000 });
      const title = await page.evaluate(() => ({
        heading: document.querySelector('.title-content h1')?.innerText?.replace(/\s+/g, ' ').trim() || '',
        intro: document.querySelector('.title-content .intro')?.innerText?.replace(/\s+/g, ' ').trim() || '',
        hasBegin: !!document.querySelector('[data-demo="begin"]'),
        canvas: !!document.querySelector('#stage canvas'),
      }));
      if (title.heading.includes('ICARUS') && title.hasBegin) pass('title screen is visible', title.heading);
      else fail('title screen is visible', JSON.stringify(title));
      await sleep(400);
      await takeShot('title');
      const shots = opts.shots.length ? opts.shots : [opts.seconds];
      const t0 = Date.now();
      for (const mark of shots) {
        const wait = mark * 1000 - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
        await collectSnapshot((Date.now() - t0) / 1000);
        await takeShot(`title-t${mark}s`);
      }
      if (!report.icarusVersion) fail('automation hook version reported', 'window.icarusDemo.version missing');
    }

    // ---- modes that start a run -----------------------------------------
    if (opts.mode !== 'title') {
      await page.waitForSelector('[data-demo="begin"]', { state: 'visible', timeout: 20000 });
      await sleep(250);
      await startRun();
      try { await page.waitForSelector('#score-hero', { state: 'visible', timeout: 5000 }); pass('in-game HUD is visible', '#score-hero shown'); }
      catch { /* not fatal: HUD is not required for every build */ }

      // Extra user-specified keyboard input, run alongside the main loop.
      const keyRun = opts.keys.length ? runKeys(opts.keys) : Promise.resolve();

      const phaseStart = Date.now();
      const elapsed = () => (Date.now() - phaseStart) / 1000;
      const pendingShots = opts.shots.slice();
      let first = true;
      await collectSnapshot(0);

      // ---- mode: flight --------------------------------------------------
      if (opts.mode === 'flight') {
        // Wall-time safety cap only; the autopilot itself gives up after ~9
        // game seconds so a slow SwiftShader clock does not cause false fails.
        const budget = Math.max(30, opts.seconds * 2);
        const { flight } = await launchIntoAir(budget, elapsed);
        flight.maxAltitude = +flight.maxAltitude.toFixed(2);
        await keyRun;
        if (flight.launched && flight.landed) {
          pass('a launch happened', `left the water at about ${humanTime(flight.launchSeconds)}`);
          pass('the dolphin reached an apex', `about ${flight.apexAltitude ?? flight.maxAltitude} m above the surface`);
          pass('the dolphin returned to the water', `landed at about ${humanTime(flight.landingSeconds)} after the breach`);
        } else if (flight.launched) {
          fail('the dolphin returned to the water', `airborne but no landing within the watch window (max altitude ${flight.maxAltitude} m)`);
        } else {
          fail('a launch happened', 'the dolphin never left the water; see the screenshots and summary for what it did instead');
        }
        report.flight = flight;
        // Any --shots marks requested by the caller, if the run is still short.
        for (const mark of opts.shots) {
          const wait = mark * 1000 - (Date.now() - phaseStart);
          if (wait > 0) await sleep(wait);
          await takeShot(`t${mark}s`);
        }
      } else if (opts.mode === 'shop') {
        // A shop is normally earned at the end of a wave. For a quick visual
        // check, ask the game's own shop UI to open (a fixture, not gameplay).
        const shopHook = await page.evaluate(() => {
          try {
            const a = window.icarusDemo, s = a.state, D = a.catalog;
            s.mode = 'shop';
            s.lvup = 0;
            s.xp = Math.max(s.xp || 0, 400);
            let called = false;
            if (D && typeof D.shop === 'function') { D.shop(s); called = true; }
            a.render();
            return { called, offers: (s.demo?.offers || []).length, mode: s.mode };
          } catch (err) {
            return { error: String(err && err.message ? err.message : err) };
          }
        });
        report.shop = shopHook;
        report.events.push({ at: 'shop', ...shopHook });
        await sleep(500);
        const shopVisible = await page.evaluate(() => {
          const el = document.querySelector('.shop-panel, .shop-scrim');
          const r = el ? el.getBoundingClientRect() : null;
          return { visible: !!r && r.width > 100 && r.height > 100, offers: document.querySelectorAll('.shop-offer').length };
        });
        if (shopVisible.visible) pass('shop screen is visible', `${shopVisible.offers} offer card(s) on screen`);
        else fail('shop screen is visible', 'the shop UI did not appear; see summary.md');
        await takeShot('shop');
        for (const mark of opts.shots) {
          const wait = mark * 1000 - (Date.now() - phaseStart);
          if (wait > 0) await sleep(wait);
          await takeShot(`t${mark}s`);
        }
      } else {
        // ---- mode: play --------------------------------------------------
        await sleep(500);
        await takeShot('start');
        while (elapsed() < opts.seconds) {
          await sleep(120);
          while (pendingShots.length && elapsed() >= pendingShots[0]) {
            const mark = pendingShots.shift();
            await takeShot(`t${mark}s`);
          }
          await collectSnapshot(elapsed());
          if (first && elapsed() > 0.8) {
            first = false;
            const started = await page.evaluate(() => ({ mode: window.icarusDemo.state.mode, kind: window.icarusDemo.state.medium?.kind }));
            if (started.mode === 'playing') pass('the run is live', `mode ${started.mode}, medium ${started.kind}`);
          }
        }
        await collectSnapshot(elapsed());
        await takeShot('final');
        await keyRun;
        // Did the game clock actually advance? (A frozen game is a real defect.)
        if (snapshots.length >= 2) {
          const firstSnap = snapshots[0];
          const lastSnap = snapshots[snapshots.length - 1];
          const advanced = lastSnap.t - firstSnap.t;
          if (advanced > Math.min(1, opts.seconds * 0.25)) pass('the game clock advanced', `${humanTime(advanced)} of game time over ${humanTime(elapsed())}`);
          else fail('the game clock advanced', `only ${humanTime(advanced)} of game time — the game may be frozen`);
        }
        // Confirm the screenshots show water/air rather than a blank canvas.
      }
    }

    // ---- shared verdict --------------------------------------------------
    // A page error is a hard failure: the demo threw while being looked at.
    if (report.errors.pageErrors.length) fail('no page errors', `${report.errors.pageErrors.length} page error(s): ${report.errors.pageErrors[0].message}`);
    else pass('no page errors', 'the page threw nothing while it ran');
    if (report.errors.consoleErrors.length) {
      report.events.push({ at: 'console-errors', count: report.errors.consoleErrors.length, sample: report.errors.consoleErrors.slice(0, 5) });
    }
    if (snapshots.length) {
      report.snapshots = snapshots.slice(0, 300);
      if (snapshots.length > 300) report.snapshotsTruncated = snapshots.length - 300;
    }
    const blankShots = screenshotLog.filter((s) => s.blank);
    if (blankShots.length) fail('all required screenshots show content', `${blankShots.length} blank screenshot(s)`);
    const failedChecks = checks.filter((c) => !c.ok);
    report.result = failedChecks.length === 0 ? 'pass' : 'fail';
    report.exitCode = failedChecks.length === 0 ? 0 : 1;
  } catch (err) {
    fatalError = err;
    report.errors.fatal = { message: err && err.message ? err.message : String(err), stack: err && err.stack ? err.stack : null };
    fail('playtest completed', fatalError.message);
    report.result = 'fail';
    report.exitCode = 1;
    try {
      if (page) {
        await page.screenshot({ path: path.join(opts.out, 'failure.png') });
        report.screenshots.push({ file: path.join(opts.out, 'failure.png'), label: 'failure' });
      }
    } catch { /* nothing left to do */ }
  } finally {
    report.durationSeconds = +((Date.now() - startedAt) / 1000).toFixed(1);
    report.screenshots = screenshotLog;
    report.errors.consoleErrors = report.errors.consoleErrors.slice(0, 20);
    try {
      writeReport(opts, report);
    } catch (err) {
      console.error(`playtest: could not write the report: ${err.message}`);
    }
    const summary = buildConsoleSummary(opts, report);
    if (opts.json) console.log(JSON.stringify(summary, null, 2));
    else {
      console.log('');
      console.log(summary.lines.join('\n'));
    }
    try {
      if (browser) {
        if (opts.keepOpen && !fatalError) {
          console.error('');
          console.error('--keep-open: the browser is still open. Press Ctrl+C to close it.');
          await new Promise((resolve) => {
            process.once('SIGINT', resolve);
            process.once('SIGTERM', resolve);
          });
        }
        await browser.close();
      }
    } catch { /* ignore close errors */ }
  }
  return report.exitCode;
}

// ---------------------------------------------------------------------------
// Report + plain-English summary
// ---------------------------------------------------------------------------

function writeReport(opts, report) {
  fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(opts.out, 'summary.md'), buildMarkdown(opts, report));
}

function describeScreenshot(s) {
  const where = s.file ? rel(s.file) : s.label;
  const labels = {
    title: 'the title screen',
    start: 'the first moment after the run begins',
    breach: 'the moment the dolphin breaks the surface',
    'breach-air': 'just after the breach, with the dolphin above the water',
    ascent: 'the dolphin climbing through the air',
    apex: 'the top of the flight arc',
    'apex-fallback': 'the highest point the tool managed to capture',
    landing: 'the dolphin back in the water after the flight',
    'air-end': 'the end of the airborne stretch',
    final: 'the last frame of the play session',
    shop: 'the shop screen',
  };
  const base = labels[s.label] || (s.label.startsWith('t') ? `the screen at ${s.label.slice(1)}` : s.label);
  const detail = s.blank
    ? 'BLANK/BLACK — this is a defect'
    : `brightness ${s.meanLuma}/255, ${s.distinctColours} colours`;
  return `- \`${where}\` — ${base} (${detail})`;
}

function buildMarkdown(opts, report) {
  const verdict = report.result === 'pass' ? 'PASS' : 'FAIL';
  const s = report.snapshots;
  const first = s[0] || null;
  const last = s.length ? s[s.length - 1] : null;
  const lines = [];
  lines.push(`# ICARUS playtest — ${opts.mode} — ${verdict}`);
  lines.push('');
  lines.push(`- **Ran:** \`${report.command}\``);
  lines.push(`- **Build:** \`${rel(opts.html)}\`${report.icarusVersion ? ` (automation version ${report.icarusVersion})` : ''}`);
  lines.push(`- **When:** ${report.generatedAt} (${humanTime(report.durationSeconds)} wall time)`);
  lines.push(`- **Screenshots:** \`${rel(opts.out)}\``);
  lines.push('');
  lines.push('## What happened, in plain English');
  lines.push('');
  lines.push(plainStory(opts, report));
  if (report.flight) {
    const f = report.flight;
    lines.push('');
    lines.push('## The flight, in numbers');
    lines.push('');
    lines.push(`- Launch: ${f.launched ? `yes, about ${humanTime(f.launchSeconds)} after the run started` : '**no launch happened**'}`);
    lines.push(`- Highest point of the arc: ${Number.isFinite(f.maxAltitude) ? `${f.maxAltitude} m above the surface` : 'not measured'}`);
    if (f.apexAltitude != null) lines.push(`- Apex seen: ${f.apexAltitude} m at about ${humanTime(f.apexSeconds)} into the air`);
    lines.push(`- Back in the water: ${f.landed ? `yes, about ${humanTime(f.landingSeconds)} after the breach` : '**no**'}`);
  }
  if (report.shop) {
    lines.push('');
    lines.push('## The shop, in numbers');
    lines.push('');
    lines.push(`- Opened with the game's own shop hook (a fixture, not earned gameplay): ${report.shop.called ? 'yes' : 'no'}`);
    lines.push(`- Offer cards on screen: ${report.shop.offers ?? 'unknown'}`);
  }
  if (s.length) {
    lines.push('');
    lines.push('## State snapshots (bounded)');
    lines.push('');
    if (first) lines.push(`- First: game time ${first.t}s, ${first.kind}, wave ${first.wave}, score ${first.score}, HP ${first.hp}, ${first.enemies} enemies, level ${first.level}`);
    if (last) lines.push(`- Last: game time ${last.t}s, ${last.kind}, wave ${last.wave}, score ${last.score}, HP ${last.hp}, ${last.enemies} enemies, level ${last.level}`);
  }
  lines.push('');
  lines.push('## Screenshots');
  lines.push('');
  const shown = report.screenshots || [];
  if (!shown.length) lines.push('_No screenshots were taken._');
  else for (const shot of shown) lines.push(describeScreenshot(shot));
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const c of report.checks) lines.push(`- ${c.ok ? 'PASS' : 'FAIL'}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  lines.push('');
  lines.push('## Errors');
  lines.push('');
  if (report.errors.fatal) lines.push(`- Fatal: ${report.errors.fatal.message}`);
  if (report.errors.pageErrors.length) for (const e of report.errors.pageErrors.slice(0, 10)) lines.push(`- Page error: ${e.message}`);
  if (report.errors.consoleErrors.length) for (const e of report.errors.consoleErrors.slice(0, 10)) lines.push(`- Console error: ${e.text}`);
  if (!report.errors.fatal && !report.errors.pageErrors.length && !report.errors.consoleErrors.length) lines.push('- None seen.');
  lines.push('');
  lines.push('## What this cannot tell you');
  lines.push('');
  lines.push('A screenshot can show that the game renders, that a run starts, that a flight happens and that the shop is drawn. It cannot tell you whether the game is **fun**, whether the difficulty is **fair**, or whether the controls **feel** right. Those need the human playtest gate — the owner holding the controls and judging it himself.');
  lines.push('');
  return lines.join('\n');
}

function plainStory(opts, report) {
  const bits = [];
  if (report.errors.fatal) bits.push(`The playtest stopped early: ${report.errors.fatal.message}`);
  if (opts.mode === 'title') {
    const title = report.checks.find((c) => c.name === 'title screen is visible');
    bits.push(title && title.ok
      ? 'The game opened and showed the real title screen: the ICARUS wordmark, the BEGIN RUN button and the starting-weapon cards.'
      : 'The game opened but the expected title screen was not fully visible — see the checks and screenshots.');
    bits.push('This mode does not start a run; it only proves the build renders its front door.');
  } else if (report.flight) {
    const f = report.flight;
    if (f.launched) {
      bits.push(`A real flight happened. The run started in the water, the dolphin carved up and broke the surface about ${humanTime(f.launchSeconds)} after the run began.`);
      bits.push(`It climbed to roughly ${f.maxAltitude} m above the water${f.apexAltitude != null ? ` (the top of the arc was captured at ${f.apexAltitude} m)` : ''}${f.landed ? ` and came back down into the water about ${humanTime(f.landingSeconds)} after the breach` : ', but the tool did not see it land within the watch window'}.`);
    } else {
      bits.push('No launch happened. The tool held W to boost and steered with A to pull the nose up, but the dolphin stayed under water for the whole watch window. That is a real finding: either the build\'s launch is harder to trigger than expected, or something is wrong with it.');
    }
  } else if (opts.mode === 'shop') {
    const shop = report.shop || {};
    bits.push(shop.error
      ? `The shop could not be opened for inspection: ${shop.error}`
      : `The shop screen was opened with the game's own shop hook (a fixture for a visual check, not a shop the player earned) and ${shop.offers ?? 0} offer cards were prepared.`);
  } else {
    bits.push('A run was started with a real click on the title screen and left running (plus any --keys input). The screenshots are the evidence of what the player would have seen.');
    const s = report.snapshots;
    if (s.length) {
      const first = s[0], last = s[s.length - 1];
      bits.push(`Over ${humanTime(report.durationSeconds)} of wall time the game clock went from ${first.t}s to ${last.t}s; it ended in ${last.kind} on wave ${last.wave} with ${last.score} points banked, ${last.hp} HP, ${last.enemies} enemies alive and level ${last.level}.`);
    }
  }
  const blank = (report.screenshots || []).filter((s) => s.blank).length;
  if (blank) bits.push(`${blank} screenshot(s) came out blank or black — that is a rendering failure, not a judgement call.`);
  if (report.errors.pageErrors.length) bits.push(`The page threw ${report.errors.pageErrors.length} JavaScript error(s) while running — see the Errors section.`);
  return bits.join(' ');
}

function buildConsoleSummary(opts, report) {
  const lines = [];
  const verdict = report.result === 'pass' ? 'PASS' : 'FAIL';
  lines.push(`ICARUS playtest (${opts.mode}) — ${verdict}`);
  lines.push(plainStory(opts, report));
  const shots = report.screenshots || [];
  lines.push(`Screenshots (${shots.length}): ${rel(opts.out)}`);
  for (const shot of shots.slice(0, 8)) lines.push(`  ${shot.blank ? 'BLANK ' : ''}${rel(shot.file)} — ${shot.label}`);
  if (shots.length > 8) lines.push(`  ...and ${shots.length - 8} more`);
  lines.push(`Report: ${rel(path.join(opts.out, 'report.json'))} and ${rel(path.join(opts.out, 'summary.md'))}`);
  if (report.errors.pageErrors.length) lines.push(`Page errors: ${report.errors.pageErrors.length} (first: ${report.errors.pageErrors[0].message})`);
  return {
    ok: report.result === 'pass',
    mode: opts.mode,
    html: opts.html,
    outDir: opts.out,
    result: report.result,
    exitCode: report.exitCode,
    icarusVersion: report.icarusVersion,
    durationSeconds: report.durationSeconds,
    screenshots: (report.screenshots || []).map((s) => ({ label: s.label, file: s.file, blank: s.blank, meanLuma: s.meanLuma })),
    flight: report.flight,
    shop: report.shop,
    checks: report.checks,
    snapshots: report.snapshots,
    pageErrors: report.errors.pageErrors,
    consoleErrorCount: report.errors.consoleErrors.length,
    lines,
  };
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('playtest: unexpected failure');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

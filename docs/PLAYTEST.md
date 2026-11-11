# Playtesting ICARUS with the AI harness

ICARUS is judged by playing it and looking at it. Nobody on the team reads code
for fun — so the harness needs a way to **open the real build headlessly, look at
it, and say plainly what happened**. This is that way.

`scripts/playtest.mjs` opens the self-contained `ICARUS-demo.html` in headless
Chromium (no server needed), starts a real run, presses real keys, takes real
screenshots, and writes a plain-English report.

---

## The exact commands

```bash
# 1. A normal play session (title -> run starts -> 8 seconds of game)
node scripts/playtest.mjs --mode play --seconds 8

# 2. Prove the launch/flight loop: carve up, breach, apex, land
node scripts/playtest.mjs --mode flight --seconds 20

# The same thing through npm (one-liner added for convenience)
npm run playtest

# Look at the title screen only
node scripts/playtest.mjs --mode title --seconds 3

# Look at the shop screen (opened with the game's own shop hook, see limits)
node scripts/playtest.mjs --mode shop --seconds 3

# Hold keys yourself, and grab extra frames at chosen second marks
node scripts/playtest.mjs --mode play --keys "w:2500" --shots 1,3,6

# Machine-readable output only (for scripts)
node scripts/playtest.mjs --mode flight --json
```

Every run prints a short plain-English summary plus the screenshot folder, and
writes `report.json` and `summary.md` into that folder. Default folder:
`qa/playtest/<timestamp>/`.

Exit codes: **0** = passed, **1** = playtest failed (blank screenshots, page
errors, a launch that never happened, a frozen clock…), **2** = setup problem
(no `playwright`, no Chromium, wrong `--html` path). If you ever see exit 2
about `playwright`, run `npm ci` in the project root first.

---

## Flags

| Flag | Meaning |
|---|---|
| `--mode title\|play\|flight\|shop` | What to exercise. Default `play`. |
| `--html <path>` | Build to open. Default `ICARUS-demo.html` at the repo root. |
| `--out <dir>` | Where screenshots and reports go. Default `qa/playtest/<stamp>`. |
| `--seconds <n>` | How long to run. Default 8 (flight: 20). |
| `--keys <spec>` | Extra input, comma-separated. `w:3000` holds W for 3 s; `a+w:1500` holds both; `space` taps. |
| `--shots <t1,t2,...>` | Extra screenshots at those wall-clock second marks. |
| `--json` | Print only the machine-readable summary. |
| `--keep-open` | Leave the browser open after the run (Ctrl+C closes it). |

Screenshots are titled by moment: `01-title.png`, `01-start.png`,
`01-breach.png`, `02-ascent.png`, `03-apex.png`, `04-landing.png`,
`01-shop.png`, plus `NN-t<second>s.png` for `--shots` requests. `failure.png`
appears if the run crashed.

---

## What the tool actually proves

When a run passes, these are facts, not opinions:

1. **The build opens over `file://`** — no server, no missing assets. (Prints the
   automation version, currently `scoreboard-S3`.)
2. **The game renders.** Every screenshot is decoded by the tool; a mostly
   black or single-colour frame fails the run instead of being passed off as
   "dark art". Each screenshot gets a brightness and colour count in the report.
3. **A run starts from the title screen.** It clicks the real
   `[data-demo="begin"]` button (with the automation hook as a fallback), then
   confirms the game state says `mode: "playing"`.
4. **The game clock advances.** If the clock is frozen, the run fails.
5. **In flight mode, a real flight happens**: the dolphin breaks the surface,
   climbs (altitude is recorded), reaches an apex, and lands back in the water.
6. **No page errors.** Any uncaught JavaScript error during the run fails it.
   Console errors are recorded and reported (they do not fail the run).
7. **The required screens are visible** — title, in-game HUD, or shop — and
   their names/numbers are captured in the snapshots.

The snapshots in `report.json` are bounded number lines: game time, medium
(`water`/`air`), wave, score, HP, enemies alive, level, air budget, heading,
altitude. That is enough to tell a story without reading a single line of code.

---

## How the flight is triggered (important — this is a trap)

The build opens in **free swimming**, not in the older carve mode. Under water:

- **A / D turn the body**, **W (or Space) boosts along the heading**.
- The run starts in a dive. Holding only W drives the dolphin **into the
  seabed**; it does not launch.
- To launch: hold **W** to boost and **A** to pull the nose up. The autopilot
  watches `medium.heading`: it presses A while the heading is below **1.0 rad**
  and releases it once the nose is steep (**1.35 rad**, about 77° above
  horizontal), re-pressing if the nose drops back. The violation of both naive
  strategies is real and was observed:
  - **holding A forever** rotates the nose past vertical and the dolphin loops
    underwater forever — no launch;
  - **releasing A as soon as the heading is merely positive (≈0.45 rad)**
    launches, but only as a 1–6 m hop.
  With the steep-nose gate, a normal launch arrives about **2–4 s** after the
  run starts and produces a proper arc — in verified runs the dolphin climbed
  **29.7 m** and **28.7 m** above the surface before coming back down.
- `state.medium.kind` flips from `'water'` to `'air'` at the breach.

`--mode flight` automates exactly this. If a future build flips the control
scheme back to "hold W to carve" (the `ro.on`/`carve.on` settings), the
autopilot may need adjusting; the summary will plainly say "no launch happened"
rather than pretending.

Other useful hooks: `window.icarusDemo.state`, `.version`,
`.start('harpoon', 1)`, `.render()`, `.catalog` (the demo's shop/level
functions), `.scoreboard.state`.

---

## How to read the screenshots

1. Open the PNG paths printed at the end of the run (they are also listed in
   `summary.md`).
2. Use the harness `read_image` tool on them — never guess from file size or
   the brightness number alone. The number only proves "not blank".
3. Check the obvious things a human would: Is it the **title screen** with the
   ICARUS wordmark and BEGIN RUN? Is the **dolphin** visible? Is the
   **waterline** there? Are the HUD numbers sensible (wave, air remaining,
   integrity, pearls)? In the shop: are the offer cards readable?
4. If a screenshot is black, an error page, or shows a frozen/blank canvas,
   that is a **failure**, even if every check passed. Say so plainly.
5. Compare against the previous run when judging a change: put before/after
   images side by side and describe what is different.

---

## What the tool cannot prove

- **Fun, feel and fairness.** It cannot tell you whether carving feels good,
  whether a wave is too punishing, or whether the shop is exciting. Only the
  owner playing it can.
- **Exact visual taste.** It proves pixels appeared; not that a colour, layout
  or animation looks *right*.
- **Frame-exact moments.** A flight lasts a couple of seconds and one
  screenshot costs a few hundred milliseconds, so "apex" is the frame nearest
  the detected apex, not the mathematical peak. The report records the actual
  game time of every screenshot.
- **Earned shops.** `--mode shop` opens the shop with the game's own shop hook
  so the screen can be inspected quickly. That is a fixture for a visual check;
  it does not prove the player would earn those offers naturally.
- **Real device performance.** Headless Chromium with SwiftShader is a software
  renderer. It says nothing about phone thermals or touch controls.
- **Balance over a whole run.** These are short, scripted sessions. Nothing here
  replaces a full 20-wave human playtest.

## The human playtest gate

A passing automated playtest means *the build works and renders*. It does not
mean *the game is good*. Before telling the owner that a change is good, the
harness must still hand it to him and let him play it. The rule: **screenshots
for the facts, the owner for the judgement.**

---

## Common traps for the next agent

- **The launch input is a balancing act.** A held forever makes the dolphin
  loop underwater; A released too early makes a tiny hop. The autopilot uses a
  gated 1.0→1.35 rad range. If a future build changes the water controls, the
  autopilot will need the same kind of tuning — always watch the actual
  `medium.heading` trace in `report.json`, never assume.
- **The game clock can run ~5× slower than wall time under SwiftShader load**
  (frames are capped at 0.1 s of simulation each). The flight autopilot is
  therefore budgeted in *game* seconds with a generous wall-time safety cap;
  do not replace it with a tight wall-clock timeout.
- **Screenshot latency.** Taking a screenshot blocks the page briefly; after a
  breach the simulation keeps moving. The tool reduces the cost by taking one
  shot per milestone, but do not expect an exact apex frame.
- **Wall time is longer than `--seconds`.** Browser launch, page load and PNG
  encoding are outside the game clock. `--seconds 8` is typically ~15–20 s
  wall time; a flight run is ~15–25 s. Budget for it.
- **A blank screenshot is caught by a real PNG decode**, not by file size. Do
  not delete the check; a black frame must never pass.
- **The default starter is Harpoon.** The tool clicks BEGIN RUN, so it starts
  with whatever the title has selected.
- **Do not judge from the JPEG-style numbers alone.** Use `read_image`.
- `file://` absolute paths only; the tool builds the URL from `--html`.

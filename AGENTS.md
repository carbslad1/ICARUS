# ICARUS — working instructions

**Last rewritten 2026-11-08.** Read this file, then `docs/CURRENT_STATE.md` (where we are today), then
`docs/INDEX.md` (what every document is and how much to trust it). This file replaces all earlier AGENTS.md
content; the old phase instructions it used to hold describe the TypeScript build in `src/`, not the game the
designer plays.

## What ICARUS is

ICARUS is a neon dolphin game in two halves joined at the water surface. Underwater you are a momentum
machine: dive, carve, trade speed for depth. Then you breach into a fast, weightless air combat arena that
rides a ballistic arc, with guns that fire on their own.
The designer is a solo indie developer who cannot code. **You are the engineer, analyst and tester; he is the
designer and the final judge of feel.**

## Trust order: code > dated docs > memory

1. **The code and the built game win for behaviour.** `ICARUS-demo.html` and the `source/*.js` that build it
   are what the designer actually plays. If any document disagrees with the code, the code is right and the
   document is out of date — fix the document, do not "fix" the code to match prose.
2. **The dated live docs win for intent.**
   - `docs/CURRENT_STATE.md` — the single "where we are" file (updated every session).
   - `docs/DECISIONS.md` — the append-only designer decision log, newest first. A newer entry supersedes an
     older one; a decision is never silently deleted.
3. **The rules the code must keep:** `docs/ENEMY_RULES.md` (2026-11-06/07) and `docs/CAMERA_RULES.md`
   (2026-11-03), each checked by a named QA suite.
4. **Measurements:** `docs/WAVE_BASELINE.md` (2026-11-01) and `docs/flow-study/` (2026-10-26). These are dated
   evidence, not current status.
5. **Orientation and history:** `docs/GAME_MAP.md` (snapshot 2026-10-26, later notes),
   `docs/SESSION_HANDOFF.md` (2026-10-31), `docs/TRICK_LAB.md`, `README.md`, `NEXT-PASS.md`.
   `docs/archive/` is old design work and is not the plan.
6. **Memory, training assumptions and the Harness's prior context: last.** Never let them override a file.

If two documents conflict, use the newer date for intent and the code for behaviour, then record the
resolution in `docs/DECISIONS.md` and correct the stale document.

## Two codebases in one repo

| Path | What it is | Status |
|---|---|---|
| `source/*.js` -> `ICARUS-demo.html` | The live playable demo. `source/build.cjs` injects the demo scripts into the minified v3 engine (`source/carve-reference.html`) and writes one self-contained HTML file. Most QA for it is in `qa/*.cjs` (Node-only, no install); browser visual checks need Playwright (below). | **This is the current work.** Everything the designer plays is here. |
| `src/`, `tests/`, `package.json` scripts | An older phased TypeScript build (deterministic `sim/`, fixed 1/120 s step). `npm run verify` typechecks and tests it. It reached Phase 2 and was never signed off (`docs/GAME_MAP.md` §1, 2026-10-26); its later destination is the port step of the design plans. | **Not the current work.** `npm run verify` is **not** the demo gate; `npm run dev` / `npm run build` target this app, not `ICARUS-demo.html`. |

This repo is a git worktree (`.git` is a file) of `~/Projects/icarus`, on branch
`prototype/brotato-port-2026-11`. The worktree has uncommitted prototype work; **never reset or
clean it** and never touch another worktree's files. `docs/BROTATO_PORT.md` records this branch's port of Brotato's
weapons, items, stats and shop, which the designer asked for as an exception to "weapons as they are" on this branch. Those mechanics must match the source exactly; names, text, art and code must be ICARUS's own.

## Locked and open

**Locked: keep these exactly as they play today unless the designer asks for a change.**
Movement and swim physics, camera, controls, weapons, enemy behaviour, enemy health, and Brotato's spawn schedule (which
enemies, how many and when, on Brotato's wave clock). The code in `source/` defines them, along with
`docs/ENEMY_RULES.md` and `docs/CAMERA_RULES.md`.

**Open: no design has been decided.** The roguelite structure, progression, shop, economy, items, scoring and
overall design direction are all open to interpretation.

- Everything in `docs/archive/`, and any entry in `docs/DECISIONS.md`
  about these open areas dated before 2026-11-08 is old experiment, mostly AI-written. It is not the plan. Do
  not quote it as the design, continue it by default or use it to judge a new idea.
- The shop and the systems built around it are prototypes. "The code wins" tells
  you what the game does now, not what it should be.
- The older shop and scoring suites only test earlier prototypes. They do not limit new ideas.
- Comparisons to other games are not requirements, apart from the Brotato spawn schedule above.
- Offer ideas in these areas as proposals. The designer decides.

## Build and verify (exact commands)

From the repo root. Node 20.19+ (the project has used Node 22).

- **Rebuild the demo:** `node source/build.cjs` then open `ICARUS-demo.html` in a browser (self-contained,
  no server). Never hand-edit `ICARUS-demo.html` — it is generated. `node source/watch.cjs` rebuilds on
  source changes.
- **Current prototype checks** (these are the ones that describe today's work):
  - `node qa/port.cjs` — 35 behaviour checks for the armory. `--runs` adds bot runs.
- **Rules the code must keep:** `node qa/camera-rules.cjs` (camera rules) and
  `node qa/enemy-sandbox.cjs --gate` (enemy goals). Both have known failures recorded (2026-11-03 and
  2026-11-07) — read `docs/CAMERA_RULES.md` and `docs/ENEMY_RULES.md` §3b before treating a failure as a
  regression.
- **See the game:** `node scripts/playtest.mjs --mode flight --seconds 20` (also `--mode play|title|shop`;
  `npm run playtest`) opens the built HTML headlessly, drives a real flight, screenshots it and writes a
  plain-English `summary.md`. It proves the build renders and plays; it cannot prove feel or fun. Look at the
  PNGs with `read_image`. Setup: `npm ci`, then `npx playwright install chromium`. Details: `docs/PLAYTEST.md`
  and the `playtest` skill.
- **Measurement:** `node qa/flightlog-bot.cjs` plays the bot runs and checks the study's baseline;
  `node qa/flightlog-metrics.cjs <log.json>` reads a saved flight log (from the demo's SAVE FLIGHT LOG).
- **Browser suites** need the dependencies and browser: `npm ci`, then
  `npx playwright install chromium`; then `node qa/scoreboard-browser.cjs` and
  `node qa/product-review.cjs --browser --round=S4`.
- **Discover the live suite list at run time** with `ls qa/*.cjs`. Do not trust the suite list in
  `README.md`: it describes the S4 build and was last accurate around 2026-10-27.
- **The older S4 suites** (`qa/five-score.cjs`, `qa/five-combat.cjs`, `qa/scoreboard.cjs`, `qa/shop.cjs`,
  `qa/shop-ui.cjs`, `qa/weapon-shop.cjs`, `qa/scoring-*.cjs`, ...) still exist, but `qa/load.cjs` pins them
  to old settings (style rules off, forward-only swimming). They test history; a pass does not prove current
  default behaviour.
- `npm run verify` = typecheck, lint, `test:sim`, `test:web`, `test:e2e` for `src/` + `tests/` only. It is the
  old TypeScript build's gate, not the demo's.

## Hard rules

- **Never weaken a test, gate or tolerance.** Do not skip checks, loosen thresholds, delete assertions or
  silently replace a reference result. If a check is wrong, raise it and update it deliberately.
- **No new dependencies, installs or network access without asking the designer.**
- **Keep the game playable.** Rebuild and open the demo before claiming any change works; a broken
  `ICARUS-demo.html` is worse than no change.
- **One risk (one change) per step.** Build it, verify it, show it, then move on.
- **Test side effect:** several suites rewrite files under `reviews/`. Before committing, restore them:
  `git checkout -- reviews/ && git clean -fd reviews/` — but first check that no wanted measurement lives
  only there, because the clean deletes generated review JSON.
- **Commits are small checkpoints with plain-English messages,** only when asked or when the task authorises
  it. Never commit the review-file churn.
- **Do not edit the Harness** (the ICARUS Studio preset, the profile, plugins or presets) or files another
  teammate owns. Do not delete anything unless explicitly asked.
- **Do not rewrite history in docs.** Supersede with a dated note or a new DECISIONS entry.

## How to talk to the designer

- **Plain English only.** No code, file paths, terminal output, function names or jargon unless he asks.
  Translate technical results into what the player sees and feels.
- **Show the game, not a description.** Use screenshots and the playable build as evidence
  (`node scripts/playtest.mjs --mode flight --seconds 20`, then `read_image` the PNGs). Never claim a visual
  or behavioural change you have not seen.
- **Ask at most one decision question at a time,** and only about feel, fun, risk or direction — the calls
  that are actually his.
- **Separate proven from not proven.** Say what changed, what was proven with what evidence, what was not
  proven, and what the next decision is. Date every status. Inventing progress is a failure.

## Update protocol (every session)

- **Before work:** read `docs/CURRENT_STATE.md`; read `docs/DECISIONS.md` newest-first. Use `docs/INDEX.md` to
  find anything else.
- **After work:** update `docs/CURRENT_STATE.md` (dated, short, truthful) and append any designer decision
  to `docs/DECISIONS.md` (newest first, with its date, its source and what it supersedes).
- **If code and docs disagree:** the code wins; correct the doc and note it. Never silently work around the
  conflict and never invent designer approval.
- **When a document becomes stale:** say so in `docs/INDEX.md` or `docs/CURRENT_STATE.md` rather than
  rewriting the past.

## Harness

- Sessions run through the DeepSeek Harness preset **ICARUS Studio**; the preset lives outside this repo at `~/Documents/deepseek-harness/icarus-studio/` (bundled into the desktop profile), and `docs/HARNESS.md` is its guide.
- Project skills in `.dsh/skills/` are live-reloaded: **`playtest`, `design-truth`, `build-and-verify`, `balance-pass`**. Load the matching one before doing that kind of work.
- **Never change the Harness profile, plugins or presets without the designer asking.**

## Where to look first

| Need | File |
|---|---|
| Where we are today | `docs/CURRENT_STATE.md` |
| Every document, freshness and the design-doc section map | `docs/INDEX.md` |
| Designer decisions and what they replaced | `docs/DECISIONS.md` |
| Enemy / camera rules the code must keep | `docs/ENEMY_RULES.md`, `docs/CAMERA_RULES.md` |
| How the Harness is set up for the designer | `docs/HARNESS.md` |

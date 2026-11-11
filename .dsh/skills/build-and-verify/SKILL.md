---
name: build-and-verify
description: Use before saying any ICARUS demo change is done, and whenever asked "is it done?", "does it pass?", or "can we commit?" — rebuilds ICARUS-demo.html from source/, runs the headless qa/ suites and the Playwright browser checks that actually gate the playable demo, and applies the no-weakening and evidence rules.
whenToUse: After any edit under source/ (the demo), before a commit or a report to the designer, after merging or rebasing, and when a suite result is disputed.
---

# Build and verify the ICARUS demo

The designer cannot read code, so "done" must be a claim you can defend with a command and its output. Done means all three:

1. `node source/build.cjs` rebuilt `ICARUS-demo.html` from the current `source/`.
2. The suites that gate the demo ran on that build and passed — or their failures are named, understood and reported.
3. You wrote down what that proves and what it does not.

## Two codebases — do not confuse them

| Path | What it is | Gate |
|---|---|---|
| `source/` → `ICARUS-demo.html` | the playable demo: the v3 engine (`source/carve-reference.html`) with `source/*.js` injected | `node source/build.cjs` + `qa/` suites |
| `src/`, `tests/` | the older TypeScript game | `npm run verify` |

`npm run verify` (typecheck, lint, vitest sim/web, Playwright e2e) never builds or opens `ICARUS-demo.html` and is NOT the demo gate. Passing it says nothing about the demo. `docs/SESSION_HANDOFF.md` §2 says the same.

## 1. Build

```
node source/build.cjs
```

Prints `Built ICARUS-demo.html` and rewrites `build.json` (`built` timestamp, `referenceSha256` of `source/carve-reference.html`, `outputSha256` of `ICARUS-demo.html`). Commit the rebuilt HTML and `build.json` with the source change, or the checked-in demo no longer matches `source/`. Then `git status --short` so you know which files are yours.

## 2. Run the gate

Run from the repo root. **Verify the suite list live** — `ls qa/` and `head -5 qa/<script>.cjs` — before citing a suite; trust the headers over README tables and over this page. The folder also holds older studies; not every script is a gate.

Most headless suites load the built `ICARUS-demo.html` through `qa/load.cjs`, not `source/` — a stale build tests old code, so build first. Exceptions: `five-score.cjs` and `five-combat.cjs` require `source/five-score.js` / `source/five-combat.js` directly, and `flightlog-metrics.cjs` only reads saved logs. When comparing against an earlier commit, `qa/core.cjs` takes `BUILD=<path>` and `qa/enemy-sandbox.cjs` takes `--build=rev:<sha>`.

Headless (Node; fast, no browser):

**S4-era suites** — still exist and should stay green, but they test history: most load through `qa/load.cjs`, which pins old settings (style rules off, forward-only swimming), and `five-score` / `five-combat` require the old `source/five-*.js` modules directly. A pass does not prove current default behaviour.

- `node qa/five-score.cjs`, `node qa/five-combat.cjs` — S4 scoring and combat items (many assertions)
- `node qa/scoreboard.cjs` — score cues match the bank
- `node qa/shop.cjs`, `node qa/shop-ui.cjs`, `node qa/weapon-shop.cjs` — shop transactions, offers, rarity, previews
- `node qa/scoring-mechanics.cjs`, `node qa/combat-integration.cjs`, `node qa/score-stress.cjs` — overtime, bosses, busts, item hooks, CPU stress

**Current-work suites** — these can prove the game as it ships today:

- `node qa/core.cjs` — core-loop rule checks (about a second)
- `node qa/slots.cjs` — slot items on the real demo (`--combat`, `--rate` are studies)
- `node qa/enemy-sandbox.cjs --gate` — enemy goals; prints `PASS all gate checks` or the failing lines. **On the 2026-11-08 build it reports 10 failures** (`docs/ENEMY_RULES.md` §3b). Report them as known; never edit the gate to pass.
- `node qa/flightlog-bot.cjs` — flight-log recorder and metrics against the flow-study baseline. **On the 2026-11-08 build it prints 6 FAIL** (481 flights vs 291; see the balance-pass skill): the baseline is dated, not a green light.
- `node qa/camera-rules.cjs` — camera rules, every scenario
- others exist (`rules`, `statuses`, `tricks`, `routine`, `jumpstyle`, `flightlog-metrics`, ...): run the ones your change touches, and read their headers for flags.

Browser (install once: `npx playwright install chromium`):

- `node qa/scoreboard-browser.cjs`
- `node qa/product-review.cjs --browser --round=<round>`

Before asking the designer to play, check `ls scripts/` for `scripts/playtest.mjs` (the designed playtest entry when present). Until then, open `ICARUS-demo.html` directly and use SAVE FLIGHT LOG (Esc) or the Core Loop Lab export as evidence.

Browser runs can fail for environment reasons (a software-GL Chromium reaches about 4.5 s of simulated air in the 15-second rendered stress test; README "Source and checks"). That is not a free pass: read README, say exactly which check failed, and do not call it a regression without reproducing it on a second build or machine.

## Definition of done — checklist

- [ ] Build ran after the last `source/` edit
- [ ] Every gate suite ran on that exact build; output kept or quoted
- [ ] Any failure named: which check, expected vs got, and whether it predates the change
- [ ] No suite, tolerance, threshold, seed or fixture changed to make anything pass
- [ ] `reviews/` restored before commit
- [ ] Docs updated for what changed (even one honest line)
- [ ] Plain-English report written (template below)

## Hard rules

- Never weaken, skip, delete or "temporarily" disable a test, tolerance, threshold, seed or golden, and never edit a fixture to match new output. A failing gate is a finding, not an obstacle.
- Keep run output out of the commit: `git checkout -- reviews/ && git clean -fd reviews/`. Those are generated artifacts. `git clean -fd` deletes untracked files, so run it only in `reviews/` and only after you have the numbers you need. Derived results that belong in the repo go under `docs/`, not `reviews/`.
- No new dependency without asking the designer; no network fetch to "make it work".
- Keep the game playable. If the build breaks the demo (won't open, can't launch, soft-lock), fix or revert before doing anything else. Passing suites on an unplayable game is not done.
- Do not commit or push unless asked; one commit per coherent step.
- Other agents may share this worktree. Check `git status --short` and leave their files alone.

## Checkpoint convention (small step, commit)

1. Pick one small step and say what it should prove.
2. Edit `source/` only.
3. `node source/build.cjs`, then run the suites that cover the change — plus the cheap ones.
4. Update the current-state doc: `AGENTS.md` names `docs/CURRENT_STATE.md` as the dated "where we are" file. Confirm it with `ls docs/`, update it in place, and do not create a second state file.
5. Commit with a plain-English subject and a short why body, like the existing history (`git log -1` shows the pattern): "Enemies plunge at the water, swim out and clear your landing". The body says what changed, what rule it serves, and what was verified (command + result).
6. Report to the designer.

## Report to the designer (plain English)

Four headings, in this order. No jargon and no file lists unless they asked.

- **What changed** — one or two sentences a non-coder can picture. What will they see differently?
- **What was proven** — the command(s), the result, and what the check actually measures. Quote numbers ("the core grid: 48 of 75 cells make the arc, up from 46"). Never say "all tests pass" on its own.
- **What was NOT proven** — the honest list: what no suite covers (fun, feel, learning time, real-device performance, real players), anything only checked in a headless imitation, any known failure left in place.
- **The next decision** — the one question you need answered: options, your recommendation, and the evidence that would settle it. For tuning, that evidence is the designer's 1–5 ratings in the Core Loop Lab.

If a claim is not in "What was proven", do not make it anywhere else.

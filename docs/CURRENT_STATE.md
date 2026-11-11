# Current state: 2026-11-12

**Working here:** nobody. (Put your tool, session and date here when you start; clear it when you stop. One agent per worktree.)

**This is the game.** `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11` (designer, 2026-11-12). `~/Projects/icarus` (Rush/Kite) and `~/Projects/icarus-slots` are archive. Everything is committed; the last checkpoint tag is `ladders-cp1-auto`. The GitHub repo is public and this branch has not been pushed: ask before pushing.

## Where the plan is

`docs/TRICK_LADDERS_PLAN.md` (the only copy). Trick levels and skill trees, in seven steps.

| Step | State |
|---|---|
| 0 Baseline and tools | Signed 2026-11-10 |
| 1 The tricks themselves (Front flip is a shove only) | Signed 2026-11-12: the designer answered "yes" |
| 2 The shop report | **Next.** Signed by automated checks; no play test needed |
| 3 Trick levels scale the weapons | Not started. Play checkpoint |
| 4 to 7 | Not started |

## Before step 3

- **One question is open with the designer:** do the Close, Shot and Blast lines come off the items? He asked on 2026-11-12 to be reminded what this means; the explanation is in the plan, section 3. Step 3 cannot be built without the answer.
- **Make the measurement harness faster** (designer, 2026-11-12: long runs are disliked). A full trick measurement takes about 40 minutes. Wanted: each flight on its own random stream so on and off runs use matching seeds, cached baselines, and a short smoke tier. Not built yet.
- **Belly flop is tabled.** Step 3 builds Front flip, Backflip and Corkscrew only. The reading of "tabled" in the plan is marked [ASSUMED] and is to be confirmed at checkpoint 3.

## What is built and playable

- `ICARUS-demo.html` is the whole game in one file. Rebuild with `node source/build.cjs`; never hand-edit it.
- Controls: A/D turn, W or Space boosts; hold D/A/W/S as you breach for a trick; WASD moves in the air; guns fire on their own; Esc pauses.
- The armoury: 48 of 62 weapons and 105 of 209 items ported, with Brotato's shop rules (`docs/BROTATO_PORT.md`).
- Trick ladders so far, behind the `ladders` setting (on by default): Front flip has no invulnerability, only its shove; no trick changes weapon damage.

## Checks (run 2026-11-12)

`node qa/gate.cjs` is the gate. Results pinned in `qa/gate-expected.json`:

- Quick tier (about 5 seconds): the build is fresh; `qa/port.cjs` 35 of 35; `qa/tricks.cjs` 33 of 33; `qa/rules.cjs` 9 of 9; `qa/statuses.cjs` 15 of 15; `qa/routine.cjs` 18 of 18; `qa/shop-ui.cjs` runs clean.
- Full tier (`--full`, about 2 minutes) adds the two rule gates below. `GATE PASS` on 2026-11-12.
- `qa/camera-rules.cjs`: 5 scenarios fail, all at 100 to 125 m/s (shake, and sky on screen in fast deep dives). Accepted as the baseline by the designer on 2026-11-12.
- `qa/enemy-sandbox.cjs --gate`: 14 checks fail (touching under water, two water-line stays at wave 12, two screen-flick readings, two bunched spreads). Accepted as the baseline on 2026-11-12. This is more lines than `docs/ENEMY_RULES.md` section 3b lists from 2026-11-07; the gate file is the current record.
- Both rule gates give identical output on repeated runs.

## Not verified

- Feel and fun beyond the designer's "yes" at checkpoint 1; device performance; balance of a full run by a human.
- The in-reach bot dies on waves 3 to 6, so it cannot be used for balance runs yet.

## Stale documents

Suites for earlier prototypes are in `qa/legacy/` and gate nothing. `docs/SESSION_HANDOFF.md` (2026-10-31), `docs/GAME_MAP.md` sections 3, 4 and 8, `docs/TRICK_LAB.md` design content, everything in `docs/archive/`. The old TypeScript build is on branch `archive/typescript-build`. See `docs/INDEX.md`.

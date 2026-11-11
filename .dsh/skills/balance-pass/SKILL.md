---
name: balance-pass
description: Use when asked "is it tuned?" or before changing any ICARUS gameplay number — charm sizes, Surge, spawn density, enemy hit/health, gun counts, quota, clock. Runs the core grid, enemy sandbox gate and flight-log bot, changes one [TUNE] value at a time, and never treats bot wins as player fun.
whenToUse: Tuning or balance work, a suite number that looks wrong, a "make it easier/harder" request, and before claiming a change is tuned.
---

# Balance pass: measure, change one number, measure again

## What you are working under

`AGENTS.md` lists what is locked and what is open. The core grid, its bands and the Core Loop Lab ratings below measure one throwaway prototype of the open design. Use them when tuning that prototype; they are not requirements for a different design.

- Never change a locked system to make a number pass: movement, camera, controls, weapons, enemy behaviour, enemy health, Brotato's spawn schedule and wave clock.
- Never guess a value. State the starting number, the target behaviour, and the one number you are changing.
- Never tune by gut, and never tune so bots win. Bots are a measuring instrument, not a player.

## The loop (one change at a time)

1. **Name the number and the behaviour.** Example: "Fruit Press at Breach gives +2.2 Surge/air-sec; I want the wave-10 crowd to peak at 25–80% and then break."
2. **Record a baseline** with the exact commands below; keep the table and any JSON.
3. **Change exactly one [TUNE] value** in `source/`.
4. **Rebuild:** `node source/build.cjs`. The qa suites fly the built `ICARUS-demo.html`, not `source/`, so an unbuilt change is invisible to them.
5. **Re-run the same commands** with the same flags, seeds, density and target — a different seed set is a different experiment.
6. **Compare before/after** in one table; say whether the delta is bigger than seed-to-seed noise.
7. **Hand the feel to the designer.** Numbers show the arc's shape, not fun.

## Core grid: does the wave arc happen?

```
node qa/core.cjs --grid
```

75 cells: 3 engines × 5 Fruit Press slots × waves 1, 5, 10, 15, 20, flown headless on the game's own code by a dodging pilot. Options: `--density` (default .5), `--fruit` (60), `--target` (crowd peak, 20), `--seeds` (2). Writes `reviews/core-surge-<density>-<fruit>.json`. With no flag it runs the rule checks (a second). **`node qa/core.cjs --feel`, which `docs/archive/CORE_LOOP.md` line 115 cites, does not exist in the script as of 2026-11-08** — read the header's option list before using a flag.

Bands, [TUNE], from `docs/archive/CORE_LOOP.md`:

| Band | Question | Pass at the default target 20 |
|---|---|---|
| peak | Is the crowd readable? | peak ≤ target × 1.25 (≤ 25) |
| middle | Does it turn mid-wave? | peak happens 25–80% through the wave |
| broke | Do the guns win? | end crowd ≤ max(4, peak/3) |
| phases | Kills in every part of the flight? | each phase ≥ 10% of kills |

Columns: crowd by quarter, peak, peak-at %, end, fire rate at end (×), Surge gained per air second (`+/s`), cleared %, hits, and PASS or the miss list. Budget unit: Surge per air second; measured need was about +4 at 50% spawns. The results in `docs/archive/CORE_LOOP.md` are dated starting points, not promises; quote the flags and seeds.

How to read it: 25 or fewer is the readable-crowd limit (Brotato's 100 cap suits a game you run through; every enemy here is on one screen). A peak after 80% did not build through the wave; it arrived late. A wave that ends at half its peak did not break. Phase shares catch a build that only kills on the way down. A cell that misses one band is a shape problem, not a difficulty problem — do not lower the band.

## Enemy behaviour gate: balance must not move enemies

```
node qa/enemy-sandbox.cjs --gate
```

6 seeds, waves 4 and 12. It measures what the player sees (`docs/ENEMY_RULES.md` goals G1–G8): off-screen share while swimming ≤25% and while flying ≤20%, time touching you underwater ≤0.05%, longest water-line stay ≤1 s, copying your sideways moves (slope) ≤0.4, reversals, screen flicks ≤3/min, zero screen jumps, Clark-Evans spread R ≥0.65 in flight and ≥0.5 in swims (≥60 samples), overlap ≤20%. It prints `PASS all gate checks` or the failing lines (non-zero exit). **On the build of 2026-11-08 it prints 10 failed checks** — touching you underwater in four scenarios, water-line stays in `swim-level` and `weave` at wave 12, R 0.59 in `hops` wave 4, one screen-flick reading, and looping enemies surfacing together: the same families `docs/ENEMY_RULES.md` §3b records as known. So expect a non-zero gate today. Report the exact failures and whether the change added one; never edit `GATE` values or seeds to force PASS. Run this whenever spawn density, enemy speed or size, camera or combat timing could reach enemy behaviour: fixing the crowd by moving enemies changes two things at once. A pure Surge/charm change should not move a gate line; if it does, something is coupled.

## Flight-log bot: does the run behave like the study?

```
node qa/flightlog-bot.cjs
node qa/flightlog-metrics.cjs <flight-log.json> [--json]
```

The bot plays the four flow-study runs headless, saves each SAVE FLIGHT LOG, and checks that `qa/flightlog-metrics.cjs` reproduces the study baseline: 291 flights, 59 hits, 4533 kills (ascent 1915 / apex 793 / descent 1825), 18.63% off-screen. On the 2026-11-08 build it prints 6 FAIL (481 flights vs 291, 15,098 kills vs 4,533, 153 hits vs 59; only off-screen passes): the baseline predates the branch, so treat it as dated and compare like-for-like runs. `--space`, `--danger`, `--verbs`, `--lead`, `--mines` switch game steps on; compare like flags only. The metrics read: kills and time by phase, nearest-enemy distance, off-screen enemy share, hits per flight, launch-angle spread, tricks landed. Limits: a scripted policy is not a player and gives no fun evidence; the baseline is machine-sensitive (`docs/SESSION_HANDOFF.md` §8b: an M1 Mac printed 253 flights against 291), so compare same machine, same flags, never across machines.

## The only fun evidence

Bot wins are not player fun. A bot clearing waves 5–12 at 5–40× quota is a known balance state (README), not quality.

The only fun evidence is the designer's own play. For the Core Loop Lab prototype, that means 1–5 ratings: title screen › ★ CORE LOOP LAB; pick a wave and cell, play, answer three 1–5 questions — fun; did power build through the wave; did the crowd build then break. Ratings save beside that wave's numbers (`source/core-lab.js`) and export as `icarus-core-ratings.json`. ★ marks the first 12 cells, about 13 minutes. That prototype's old gate, `docs/archive/CORE_LOOP.md`: at least two engines each have a cell scoring 4+ on fun and on power building, in cells that also pass the bands, and the designer can tell the engines apart. Ask them to play ★ cells before and after a pass; quote their words, not a bot score.

## Proposing the next change

One change, one number, one reason:

- **Number:** `Fruit Press at Breach: +2.2 → +2.6 Surge per Fruit killed` (one [TUNE] value).
- **Why this one:** which band it should move and which way ("raises the floor so wave 5's peak lands after 25%").
- **How it will be measured:** exact command, flags and seeds, e.g. `node qa/core.cjs --grid --seeds=4`.
- **Prediction:** what each relevant number should do, so a wrong prediction is visible.
- **Cost:** what it could break — other engines, earlier waves, the enemy gate, the flight-log baseline.
- **What would change your mind:** the reading that would make you revert.

Then get the designer's verdict from play before calling it tuned.

## Hard rules

- One [TUNE] change per pass; two numbers, two passes.
- Never change anything locked in `AGENTS.md` without the designer asking, and record the old value.
- Never edit bands, thresholds or seeds to make a cell pass. If a new design no longer uses a band, say so and write the old band down.
- Never report a bot result as "fun", "playable" or "the player will like it". Say exactly which metric moved.
- Record every pass: number changed, before/after table, command, date, outcome. An unrecorded change cannot be judged later.

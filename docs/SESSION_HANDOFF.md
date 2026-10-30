# Session handoff: 2026-10-27

Everything needed to continue this work on another machine: where the code is, how to run it, where the plan stands, what has been decided and what is still open.

- **Read alongside:** `docs/GAME_MAP.md` (what the demo does) and `ICARUS_DESIGN.md` §4 (the target design and the plan).
- **Origin:** a cloud Claude Code session that ran 2026-10-25 to 2026-10-27, `session_01W2ejQJcAVtz9kP8Dd8fsTa`.

## 1. Get the code

- **Repo:** `carbslad1/ICARUS`
- **Branch:** `design/scoring-revision-2026-10`. It is ahead of `main`, not merged, and has no PR. The branch was pushed at every step.

```sh
git clone https://github.com/carbslad1/ICARUS.git
cd ICARUS
git checkout design/scoring-revision-2026-10
```

## 2. Two codebases in one repo

| Path | What it is | This session |
|---|---|---|
| `source/` → `ICARUS-demo.html` | The playable demo: a minified v3 engine (`source/carve-reference.html`) with the demo's scripts injected | All the work happened here |
| `src/`, `tests/`, `AGENTS.md` "Current phase" | The TypeScript game built in phases (`npm run verify`) | Not touched, and not run |

`AGENTS.md` now starts with a pointer to `docs/GAME_MAP.md`. Its "Current phase" section still describes `src/`.

## 3. Play the demo

1. Open `ICARUS-demo.html` in a browser. It is self-contained and needs no server.
2. Controls:
   - Underwater: hold **Space** to carve and release to launch; there is no boost.
   - In the air: **W A S D / arrows** move; weapons fire on their own. (Stomp, dive and dash are parked under Settings › Score › Experimental.)
   - **Esc** pauses.
3. **SAVE FLIGHT LOG** is in the pause menu and on the end-of-run screen.
4. **Settings › Score** has:
   - "Marked spawns ahead and flocking (step 1)": on or off.
   - "Step 1: share of spawns from the screen edge": 0.2 by default.

## 3b. Always-current demo and playtest loadout (2026-10-30)

- `node source/watch.cjs` rebuilds `ICARUS-demo.html` whenever a file in `source/` changes. Claude sessions in the Dolphin game folder also rebuild after each edit through a hook in that folder's `.claude/settings.json`.
- The title screen's **PLAYTEST LOADOUT** sets the starting weapons, tricks, wave and pearls, and switches the parked abilities, leading shots, rules, carve key and mines. It is saved in the browser (`icarus.scoreshow.loadout`) and applies only while "Use this loadout" is ticked.

## 4. Build and check (Node 20.19+; the session used 22)

```sh
node source/build.cjs                      # rebuild ICARUS-demo.html from source/

# Headless demo suites (Node only, no install needed)
node qa/five-score.cjs                     # 16 groups pass
node qa/five-combat.cjs
node qa/scoreboard.cjs
node qa/shop.cjs
node qa/shop-ui.cjs
node qa/weapon-shop.cjs
node qa/scoring-mechanics.cjs
node qa/combat-integration.cjs
node qa/score-stress.cjs

# Flight-log tools
node qa/flightlog-bot.cjs                  # step 1 off: must print 7 PASS (reproduces the flow study)
node qa/flightlog-bot.cjs out --space      # step 1 on: prints its metrics and writes bot logs to out/
node qa/flightlog-metrics.cjs run.json     # metrics for any saved flight log (several files allowed, --json)
```

- **Browser suites** (`qa/scoreboard-browser.cjs`, `qa/product-review.cjs --browser --round=S4`) need `npm ci` and `npx playwright install chromium`.
- **Review files:** several suites rewrite files in `reviews/`. Restore them before committing: `git checkout -- reviews/ && git clean -fd reviews/`.
- **Last results (2026-10-27):** every headless suite passed, `flightlog-bot` printed 7 PASS, and there were no page errors in Chromium.

## 5. Where the plan stands (`ICARUS_DESIGN.md` §4.20)

| Step | State |
|---|---|
| 0: decide and baseline | **Done.** The demo is the prototype codebase. `qa/flightlog-metrics.cjs` is built; the bot baseline is checked (`docs/flow-study/bot-baseline-metrics.json`); the human baseline is 1 run, 24 flights (`docs/flow-study/human-baseline-2026-10-27.json`) |
| 1: space | **Built, then revised after playtest 1. Playtest 2 pending** (needs the designer's flight log) |
| 2: danger | **Built locally 2026-10-27, playtest pending** (`source/danger.js`; see §4.20 row 2). Settings › Score: on/off, lead 0–1 (0.5), mines per flight 0–4 (3). Bot: `node qa/flightlog-bot.cjs out --danger [--lead=x] [--mines=n]` |
| 3: flight verbs | **Built, then parked 2026-10-27** (`source/verbs.js`, off; to become tricks) |
| 4: rules reset | **Built locally 2026-10-27** (`demo.js` `style`, `finish`, `hit`; `qa/rules.cjs`); playtest pending |
| 5: first routine | **Built locally 2026-10-27** (`source/routine.js`, `qa/routine.cjs`); playtest pending |
| 6: world layer | **Built 2026-10-30**: Minefield trick (`source/routine.js`); playtest pending |
| 7–10: statuses, sides, stretch slots | **Built 2026-10-30** (`source/statuses.js`, `source/routine.js`, `qa/statuses.cjs`); playtest pending |
| Trick redesign | **2026-10-30, designer:** air tricks are effects only (guns do the damage); only water tricks damage; impacts removed. Audit: guns kill mostly placed enemies (50–86% in two-trick routines), but placing does not raise gun kills yet (everything is already within the starter Harpoon's 30 m), water tricks dominate kills, and most tricks still favour high launches. `qa/routine.cjs --gate` and `qa/statuses.cjs --gate` step 10 now fail for that reason |
| Gun pairing (option 1) | **2026-10-30:** each placement trick names the guns it feeds (Gravity anchor: Blast; Chum line, Slipstream: piercing; Eddy (new), Bubble net: Close; Breach wave: Arc); the shop's trick place and weapon offers lean toward matching pairs. **Finding (`node qa/placement.cjs .`): placement changes gun damage by only −6% to +8%, because chasers crowd the dolphin by themselves and every gun aims at the nearest enemy.** Positioning needs guns that aim by position or enemies that do not come to you; not decided |
| Brotato enemy movement | **2026-10-30, base game only (designer):** `source/movement.js` (setting "Brotato enemy movement", on) gives existing kinds base-game roles at Brotato's distances scaled by player speed (1 px ≈ 0.076 m): turrets keep ~23 m away (Spitter), drifters hover ~11 m around you (Fly), splitters hold their own offset up to 23 m (Slasher), non-charger elites hover ~23 m (Gargoyle). `qa/placement.cjs` with a mixed roster: Close guns + Eddy +46% damage; Blast + Gravity anchor +9%; piercing + Chum line +8%, Slipstream +1%, because Blast and piercing guns still aim at the nearest enemy, not the cluster or line |
| Formations on the guns' target | **2026-10-30:** Brotato's weapons aim at the nearest enemy (its weapon script, checked), so ICARUS keeps that and builds the formations on it instead: the Gravity anchor well sits on the nearest enemy, Chum line lines enemies up through it, Slipstream through the nearest one behind. Placement experiment: Blast + Gravity anchor +19%, Close + Eddy +46%, piercing + Chum line +7% / Slipstream +4%. Piercing is capped by the guns: Laser hits at most 3 enemies, Harpoon pierces only on crits; doubling Chum line's pull gave +9% |
| Tiered pierce | **2026-10-30:** after Brotato's tiered pierce (Crossbow 1-4 on crits, shotgun 2-3 with 30% loss), setting "Pierce by tier" (on): Laser hits 3 enemies at T1 up to 6 at T4; Harpoon always passes through 1 more and crits through 1 more per tier, losing 20% per enemy (the demo's shots now apply that loss). Placement experiment: piercing guns +7% on their own, but Chum line still adds only +9% at T1 and +4% at T3 (Slipstream +4% / +2%). Over 5 s every gun kills nearly all 14 enemies, so the test saturates; it needs a steady stream of spawns to measure further |
| 11–15 | Not started |

### Step 1 as it is now

The code is in `source/space.js`.

- About 80% of spawns appear behind a 0.6 s red marker inside the view, 14–24 m ahead on your path and at least 10 m above the water. The rest (the slider) enter from the screen edge as before.
- Chasers, swarmers and splitters flock about 6 m apart and follow the dolphin's track from 0.5 s earlier.
- Enemies returning at the breach from beyond the screen re-enter at its edge, so turning round underwater no longer loses them.
- The landing pool is built but **off** (`pool: false`).
- Spawn behaviour reads a per-run profile (`r.space`) so later items can change it.

### Bot measurements (flight logs, 4 styles, seed 7)

| Measure | Flow study (step 1 off) | Step 1 now |
|---|---|---|
| Nearest enemy (median) | 23 m | 12 m |
| Enemies from screen centre (median; edge is 38.4 m) | 31 m | 15.3 m |
| Off-screen enemies | 18.4% | 3.1% |
| Hits per flight | 0.2 | 0.5 |
| Apex share of kills vs time | 17.5% vs 20% | 20% vs 19.9% |

The human baseline, with step 1 off, was 0 hits in 24 flights and a median launch of 74°.

### Playtest 1 feedback (2026-10-27), all addressed

- Spawns at the water line felt unfair, so the pool was switched off and the 10 m floor added.
- Flocking was good but too crowded, so separation went from 3.5 m to 6 m.
- Some enemies should still come from the screen edge, so about 20% do.
- Enemies shouldn't be lost off-screen when the dolphin turns on the water, so they are recalled at the breach.

## 6. Decisions made in this session

- **Design direction, 2026-10-26:**
  - The S4 slot-machine reels are replaced by a five-slot trick routine: breach, ascent, apex, descent, entry.
  - Style score is paid as pearls; 0 HP ends the run; there is no quota.
  - S4 is kept as Appendix A of the design doc.
- **Positional design, 2026-10-27:**
  - **Rejected:** proximity scaling.
  - **Kept:** setups and payoffs. A payoff on enemies your own setup moved is "linked" and adds style.
  - **Grammar:** every effect is anchor + trigger + shape + verb.
  - **Statuses replace tags:** Soaked, Shock, Burn, Freeze and Bleed, with three reactions (Conduct, Flash-freeze, Steam).
  - **Enemies** have exposed sides.
  - **Hard surfaces:** enemies, frozen blocks and the water, where knocked-in enemies drown.
- **Answered by the designer, 2026-10-27:**
  - The clean streak carries across flights.
  - Evolutions are earned by feats.
  - Tricks count toward class set bonuses.
  - Spawns lean ahead on the path, with items able to alter spawning later.
  - Step 1 was rolled out all at once.
- **Classes:** 12 Brotato-style classes; the roster target is Brotato's weapon count.
- **Locked rules from earlier:**
  - Launch speed is 30 m/s, +5 per wave.
  - Guns auto-fire.
  - There is no entry or landing grade.
  - Charms must be readable in at most two lines.
  - No "this jump needs X" readout.
  - Airtime gating is rejected; XP orbs stay, without free Max HP; heat is removed.
- **Correction (2026-10-27):** the view is 76.8 m wide, because the game locks it to the arena and letterboxes 16:9. It is not 57 m. All docs were fixed.

## 7. Open questions for the designer

1. Should the landing pool come back in another form, for example existing enemies gathering, never new spawns? Or should it be dropped?
2. What is Brotato's exact weapon count, the roster target? Sources found disagree.
3. Does the clean streak survive the shop between waves?
4. Kill-lift or stomp-bounce?
5. Which spawn-altering items to build.
6. The rest of design doc §4.14: the trick list, how stretch slots fire, the payout curve, evolutions, how charms fold in, how tricks aim.

## 8. Noticed but not changed

- Markers near the top of the view can sit under the air-remaining display.
- In playtest 1 the designer ended wave 4 with two Harpoon T1s and two Minigun T1s unmerged. Merging may not be discoverable.
- In headless Chromium at 1280×800, the title footer intercepted clicks on BEGIN RUN. This has not been confirmed for real users.

## 8b. Reproducibility on the designer's Mac (2026-10-27)

- `node qa/flightlog-bot.cjs` (step 1 off) prints 7 FAIL on the committed branch on the designer's M1 Mac with Node 22.16: 253 flights against the baseline's 291. The cause is not found; compare runs on one machine.

## 9. Working conventions used in this session

- **The designer's standing preference:** be rigorous; do not assume or guess missing parameters; ask when a request is ambiguous.
- **Pushing:** push only to `design/scoring-revision-2026-10`; do not open a PR unless asked; do not add dependencies without asking.
- **Player data:** raw logs are not committed; only derived metrics are, in `docs/flow-study/`.
- **Measuring changes:** use the flight log and `qa/flightlog-metrics.cjs`, and keep `qa/flightlog-bot.cjs` (step 1 off) passing.

## 10. Continuing with Claude Code locally

- **Teleport (if your Claude Code version supports it):** `claude --teleport session_01W2ejQJcAVtz9kP8Dd8fsTa`, or `/teleport` inside Claude Code. It needs the same claude.ai account and a pushed branch, which this one is. The only sources found for it on 2026-10-27 were community guides, so check `claude --help` for your version.
- **A fresh session:** open the repo on this branch and start Claude Code. It reads `AGENTS.md`, which points to `docs/GAME_MAP.md`. Then ask it to read this file and continue with step 1 playtest 2 or step 2.
- **The raw transcript** and the session's scratch files (screenshots, bot logs, diagnostic scripts) are in the export bundle sent in the session. They are not committed, because the transcript contains environment and account details.

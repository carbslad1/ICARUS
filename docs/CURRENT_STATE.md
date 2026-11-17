# Current state: 2026-11-15

**Working here:** nobody. (Put your tool, session and date here when you start; clear it when you stop. One agent per worktree.)

**This is the game.** `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11`. `~/Projects/icarus` (Rush/Kite) and `~/Projects/icarus-slots` are archive. Everything is committed. The GitHub repo is public and this branch has not been pushed: ask before pushing.

## Where the plan is

`docs/FEED_FRENZY_PLAN.md`, locked by the designer on 2026-11-15. Feed on the way up builds a multiplier; frenzy on the way down spends it as fire rate; it resets on landing; jumps get faster through each wave.

**The rules are frozen until the baseline is signed (checkpoint 3).** New ideas go on the plan's parked list.

| Step | State |
|---|---|
| Plan locked | 2026-11-15 |
| 0 Facts and a fast measure | **Built and measured 2026-11-15.** Waiting on the designer: the measurement took 5.6 minutes against a 5-minute target |
| 1 The jump ramp | Signed 2026-11-15: "Yes, it builds" |
| 2 Feed and frenzy | Signed 2026-11-15: "Yes, it reads" |
| 3 The numbers (signs the baseline) | **Play test 2026-11-16: "too opressive for a baseline"** (died on wave 7 with 2 to 5 guns). Waiting on the designer's choice of fix |

Built so far (behind the `feed` setting, on by default): the old Harpoon as the only start weapon, a shop that sells only the seven baseline weapons, and the jump ramp (each wave starts at 30 m/s and each jump adds 5, up to the wave's speed). Feed and frenzy itself (step 2): kills while rising build a multiplier, falling multiplies every gun's fire rate up to a cap, shown as cyan rings, a pink burst at the peak and pink pulses. Step 0's floor is in the plan: six Harpoons already kill 94 to 99% of every wave, far above the other six weapons.

## Answered

- **Start weapon:** the old Harpoon (designer, 2026-11-15). With the armoury on, the old Harpoon is not in the catalogue (the port replaced the old weapons), so step 0 has to bring it back as the start weapon.

## Fixed 2026-11-15: the wave 1 freeze

The designer reported the game freezing in wave 1 with only Esc working, and sent a screenshot of the dolphin at the breach. Cause: the engine looks up each shot's colour in its own weapon table, and the ported weapons were missing from it, so the first shot from any ported ranged weapon (Pressure Cannon, Brine Sprayer and the rest) crashed the drawing every frame. Tuna Gaff is melee and fires no shots, which is why it never froze. Fixed in `source/demo.js`; `qa/port.cjs` has a new check that every weapon has a colour (it fails on the old build). Replayed in a headless browser with both ranged starters and the A, D and W tricks held: no errors, and shots land.

Small display bugs found on the way: the start-weapon cards and loadout slots read "undefined" where a weapon description should be, and the selected start-weapon card's text is nearly invisible.

## Fixed, not yet committed: "webpage is using too much memory" (designer report 2026-11-17, fixed 2026-11-17)

**Cause, measured.** Reproduced in real Safari 26.2 (`node qa/safari-memory.mjs`; record `qa/feed/safari-memory-2026-11-17.txt`): the page process grew from 0.6 GB (wave 1) to 8.1 GB (wave 14, 7 min at 2x speed) and the page died; the graphics process grew to 1.3 GB. Counting calls in Chrome: about 18 new WebGL buffers per frame, none ever deleted. Stack traces put all of them in the PixiJS graphics-context pool bundled in `source/carve-reference.html`: its pooled render-data `init()` built a new batcher (with new GPU buffers) on every reuse and dropped the old one without freeing it.
**Fix.** One change in `source/carve-reference.html`: `init()` keeps the batcher it already has. After it: 0 new buffers over 1,227 frames (Chrome); Safari page process flat at 412-461 MB and graphics process about 72 MB through wave 14 (`qa/feed/safari-memory-fixed-2026-11-17.jsonl`). Quick gate passes. Frames look right on inspection; an exact pixel comparison was not possible because the browser harness does not step identically between runs.
**Not checked:** a person playing in Safari; Chrome showing no growth before the fix is not explained.

## Pearls at water entry (code read 2026-11-17)

The designer's reading is right: pearls you do not fly into are not banked. In the air a pearl is picked up only within about 6 m of the dolphin (`Oxe.pick` 6 m, scaled by the Pickup stat). Uncollected pearls drift back and sink; any that leave the screen, and all that are still in the air when you enter the water, go into the bag (`Oxelose`, `Oxebag`). The bag is paid back one pearl at a time: each later drop carries one extra pearl while the bag lasts (`Oxedrop`), and those drops also have to be flown into. **Changed 2026-11-17** (designer: "Yes, bank them"): with `feed` on, pearls you do not fly into are paid straight into your pearls (both the ones that drift off screen and all still in the air at water entry), so the bag stays empty. Measured with `node qa/income.cjs --nochase --tune='{"feed":1}'` (bot never steers for pearls, seed 81855343): earned per wave 22, 44, 73, 101, 158, 194 against Brotato's 28, 46, 70, 99, 130, 170.

## Things the plan found (2026-11-15)

- The "+5 m/s per jump, capped by the wave" rule is not in this build. Launch speed is fixed for a whole wave today. Step 1 builds it.
- Only 4 of the 48 ported weapons scale with Blast.

## What is built and playable

- `ICARUS-demo.html` is the whole game in one file. Rebuild with `node source/build.cjs`; never hand-edit it.
- Controls: A/D turn, W or Space boosts; hold D/A/W/S as you breach for a trick; WASD moves in the air; guns fire on their own; Esc pauses.
- The armoury: 48 of 62 weapons and 105 of 209 items ported, with Brotato's shop rules (`docs/BROTATO_PORT.md`).
- From the paused trick levels plan, behind the `ladders` setting (on by default): Front flip has no invulnerability, only its shove; no trick changes weapon damage. Signed by the designer on 2026-11-12.

## Checks

`node qa/gate.cjs` is the gate. Results pinned in `qa/gate-expected.json` on 2026-11-12:

- Quick tier (about 5 seconds): the build is fresh; `qa/port.cjs` 36 of 36; `qa/tricks.cjs` 33 of 33; `qa/rules.cjs` 9 of 9; `qa/statuses.cjs` 15 of 15; `qa/routine.cjs` 18 of 18; `qa/shop-ui.cjs` runs clean. Passed again on 2026-11-15.
- Full tier (`--full`, about 2 minutes) adds the two rule gates. Last run 2026-11-12: `GATE PASS`.
- `qa/camera-rules.cjs`: 5 scenarios fail, all at 100 to 125 m/s. `qa/enemy-sandbox.cjs --gate`: 14 checks fail. Both accepted as the baseline by the designer on 2026-11-12 and pinned line by line.

## Not verified

- Feel and fun of anything in the new plan: none of it exists yet.
- Device performance; balance of a full run by a human.
- The measurement harness is still slow (about 40 minutes for a full trick comparison). Step 0 fixes that first.

## Stale documents

`docs/TRICK_LADDERS_PLAN.md` is paused (its measurements stay valid for the 2026-11-10 build). Suites for earlier prototypes are in `qa/legacy/` and gate nothing. `docs/SESSION_HANDOFF.md`, `docs/GAME_MAP.md` sections 3, 4 and 8 (and its "launch speed is fixed per wave" line once step 1 lands), `docs/TRICK_LAB.md` design content, everything in `docs/archive/`. See `docs/INDEX.md`.

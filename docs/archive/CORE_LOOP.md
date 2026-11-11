> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# The core loop: rules, plan and results

**7 Nov 2026, branch `prototype/slot-items-2026-11`.** The smallest game that shows the loop: one gun, one enemy, the Fruit pool, five charm slots. Everything else waits until this is fun. Slot history and earlier lessons: `docs/SLOT_ITEMS.md`.

**Power is Surge.** The designer replaced the Discharge on 7 Nov: a two-second peak can't answer a crowd that builds for a minute. Power now builds through the wave.

## The fundamental rules

**Fixed:**
1. **Spawn schedule, wave clock and enemy health are Brotato's.** All 20 waves match Crash Zone at danger 0; health is Brotato's curve × 14/3. The lab currently runs them at 50% spawns.
2. **One enemy, the chaser,** with the wave's mean health. No bosses.
3. **One gun, Harpoon T1.** No tiers and no stats. Copies are the only way to add guns: 1, 1, 3, 5, 6 at waves 1, 5, 10, 15, 20.
4. **Each wave is a run-up.** The first jump launches at 30 m/s and each jump adds 5, up to the wave's cap (30 + 5 per wave).

**The loop:**
1. **Enemies are the draw.** Each rolls a family by weight: Fruit, Bell, Chest, Seven at 60 : 20 : 16 : 5 in the Fruit build (26 unbuilt).
2. **Surge is power.** Guns fire +1% faster per point of Surge, always. It builds through the wave and resets at the wave's end.
3. **Five charms fire in order, once per flight:** Breach, Ascent, Apex, Descent, Entry. A charm adds Surge at once.
4. **Mult is per flight.** It starts at 1 and multiplies each later charm's gain. Nothing multiplies total Surge.
5. **Phases differ by what they can read, not when they land.** Where a stack lands in a flight makes no measurable difference. Later slots read more of the flight, so gain charms want to be late, Mult wants to be early, and there is one of each slot.
6. **Every +100% Surge fires every gun at once:** the milestone beat.

## The charms

| Charm | Rule |
|---|---|
| **Fruit Press** | +2 Surge per Fruit killed this flight |
| **Updraft** | +0.75 Surge per air second so far |
| **Thermal** | +0.5 Surge per air second since the apex |
| **Crest** | +4 Surge if you launched at 56° or more |
| **Ripple** | +1.5 Surge if you launched below 27° |
| **Lens** | +1 Mult |
| **Skipping Stone** | ×1.75 Mult if you launched below 27° |
| **Hoard** | If you launched below 42°: hold this flight's Surge for your next leap |
| **Pounce** | If you launched at 56° or more: release held Surge ×1.5 |

| Engine | Flight | Charms in order (Fruit Press moves through them) |
|---|---|---|
| **Skim** | Hops at 20° | Skipping Stone, Ripple, Updraft, Thermal |
| **Soar** | Leaps at 75° | Lens, Updraft, Crest, Thermal |
| **Hunt** | Three hops at 20°, then a leap at 75° | Pounce, Lens, Updraft, Hoard |

## How it's balanced

- **Budget unit: Surge per air second.** Measured need at 50% spawns: about +4.
- **Most gain should come from kills.** Kills are capped by arrivals, so kill-fed Surge can't run away and it rises with pressure by itself. Time charms set a floor.
- **Size gains by airtime.** At wave 10 Skim gets 21 flights, Hunt 16, Soar 10. Flat gains per flight (Crest, Ripple) are deliberate leans.
- **Nothing multiplies total Surge.** Mult touches this flight's gain only.

## Testing

**1. The numbers:** `node qa/core.cjs --grid`. Every engine × Fruit Press slot × wave on the game's own code, flown by a dodging pilot. Options: `--density`, `--fruit`, `--target`, `--seeds`. With no flag it runs the rule checks.

| Band [TUNE] | Asks | Pass |
|---|---|---|
| peak | The crowd stays readable | Peak ≤ 25 (target 20, not yet set by the designer) |
| middle | The crowd turns mid-wave | Peak 25–80% through the wave |
| broke | The guns win | End crowd ≤ a third of the peak, or ≤ 4 |
| phases | Kills in every part of the flight | Each ≥ 10% |

**2. The feel:** title screen › ★ CORE LOOP LAB. Pick a wave and a cell, play, answer three 1–5 questions. Ratings save with that wave's numbers. ★ marks the first 12 cells, about 13 minutes.

**Gate:** at least 2 engines each have a cell scoring 4+ on fun and on power building, in cells that also pass the bands, and you can tell the engines apart.

## Results (Surge, 50% spawns, 2 seeds)

**46 of 75 cells make the arc.** Misses: broke 29, middle 10, peak 3, phases 0.

| Wave | Peak with no charms | With charms | Peak at | End crowd | Fire rate at end | Pass |
|---|---|---|---|---|---|---|
| 1 | 4 | 3 | 40% | 1 | ×1.7 | 15 |
| 5 | 14 | 8 | 62% | 3 | ×2.6 | 8 |
| 10 | 55 | 15 | 74% | 8 | ×3.9 | 4 |
| 15 | 65 | 18 | 58% | 9 | ×4.2 | 4 |
| 20 | 27 | 17 | 31% | 1 | ×3.9 | 15 |

| Fruit Press at | Gain per air second | Pass |
|---|---|---|
| Breach | +2.2 | 7 |
| Ascent | +2.9 | 8 |
| Apex | +4.1 | 10 |
| Descent | +5.0 | 9 |
| Entry | +5.0 | 12 |

| Engine | Gain per air second | Fire rate at end | Pass |
|---|---|---|---|
| Skim | +4.1 | ×3.2 | 10 |
| Soar | +4.3 | ×3.6 | 19 |
| Hunt | +3.2 | ×3.0 | 17 |

- **The pool matters:** one-seed runs with Fruit weight 26 vs 150 end at ×3.0 vs ×3.6 (Skim) and ×3.2 vs ×4.0 (Soar).
- **100% spawns is too much for these charms:** before the last sizing, peaks were 56 at wave 10 and 67 at wave 15 (Fruit Press +1). Not re-run at +2.

**Problems:**
- **Waves 10 and 15 turn late and don't fully break.** The crowd ends around half its peak.
- **Skim passes nothing at waves 10 and 15.**
- **Waves 1 and 5 barely have a crowd.** There may be little arc to feel.
- **The target crowd is still assumed.**
- **Family colour is only a small dot.**

## Playtest history

## First playtest and what changed

**Designer's report:** overwhelming pressure, and the boost didn't thin the crowd. The bands had said Discharges cut 30%; on screen the crowd sat at the 100 cap, so a cut was refilled at once. **The crowd's size, not the percentage cut, is what the player sees.** The grid now reports it.

**The speed ramp fixed most of it,** with spawns unchanged. At wave 10, Soar at Apex with 3 Harpoons went from sitting near the cap to a crowd averaging 27 and peaking at 60. Shorter early flights mean more Discharges (10 a wave, was 7) and the crowd never gets ahead.

**Pierce adds a little more:** across the sweep, crowd 23 → 21, peak 3.8 → 4.3, cut 33% → 37%. Spawn density is a lab option (100, 70, 50%), still at 100%.

## Second playtest: still overwhelming at 50% spawns

**The cause was hit size, not the crowd.** At 50% spawns, wave 10, a dodging pilot had a crowd of about 11 and took 17 hits a minute, and still would have died 9 times in the wave. One hit takes 64 of 100 HP at wave 10 and 94 at wave 15. Brotato's damage curve assumes HP and Armour, which this game no longer has. Spawn density can only halve that.

Deaths per wave, dodging pilot (`node qa/core.cjs --feel`, one seed, mean of Soar and Hunt at Apex):

| Setting | Wave 5 | 10 | 15 | 20 |
|---|---|---|---|---|
| 50% spawns, Brotato hit | 0.5 | 9 | 12 | 11.5 |
| 100%, Brotato hit | 1.5 | 18 | 32 | 24.5 |
| 100%, hit 10 | 0 | 4.5 | 4.5 | 3 |
| 100%, hit 5 | 0 | 3 | 3 | 2 |
| 100%, hit 5, Brotato speed | 0 | 1 | 2 | 2 |
| **50%, hit 5 (lab default)** | 0 | 1 | 0.5 | 0.5 |
| 100%, hit 5, not dodging | 5 | 12 | 11.5 | 16 |

- **Enemy hit** is now a lab setting: a flat 5, 10 or 20 HP, or Brotato's scaling. It's not one of the fixed variables.
- **Enemy speed:** chasers move about 14 m/s, 1.4× Brotato's 10 m/s (250 px/s at 25 px per metre). The 70% option matches Brotato.
- Small hits give shorter invulnerability, so hits a minute rise as hit size falls.

**Lesson:** crowd size, percentage cut and deaths are three different pressures. Measure what reaches the player.

## Third playtest: it's the crowd on screen

**Designer's answer:** the crowd on screen, not the hits. Real frames at 50% spawns, wave 10, showed why the count misled: 10 enemies, 6 of them within 4 m, stacked on the dolphin and hiding it. Enemy art is 80 px on a 1920 screen, Brotato's size, but the collision radius is far smaller than the picture, so they pile up. The test pilot wasn't steering in those frames.

**New lab defaults: 50% spawns, 5 HP hits, Brotato enemy speed, 70% enemy size.** The same moment now reads as open space, with the dolphin visible. HUD shows the count on screen (`N ON SCREEN`).

Crowd mean / peak, dodging pilot (one seed, Soar and Hunt at Apex):

| Setting | Wave 5 | 10 | 15 | 20 |
|---|---|---|---|---|
| 50%, current speed and size | 3 / 8 | 11 / 34 | 14 / 36 | 5 / 20 |
| **50%, Brotato speed, size 70% (default)** | 3 / 9 | 13 / 34 | 14 / 34 | 6 / 24 |
| 100%, Brotato speed, size 70% | 11 / 25 | 34 / 90 | 41 / 88 | 21 / 63 |

Speed and size change how the crowd looks and how it reaches you, not its count. **Waves 10 and 15 still peak around 34 at 50% spawns.**

**Open:** the target number. How many enemies on screen feels right just before a Discharge? With that, gun counts and spawns can be solved. Brotato's 100-enemy cap suits a game where you run through them; every enemy here is always on one screen.


**Discharge results (superseded):** best at fire rate + pierce, 12 of 75 cells, Hunt ×4.6 kill rate. Damage passed none because early enemies die in one shot.

## The plan

Each step has a gate. Nothing is added until the step before it passes.

1. **Fixed variables. Done.** Pressure and health match Brotato.
2. **The maths. Done for Surge,** first pass.
3. **The feel. Next, yours.** Play the ★ cells and name the crowd that feels right.
4. **Tune the arc.** Use your ratings to set charm sizes, Harpoon counts and spawns so the crowd turns mid-wave. Tune the bands to what felt good.
5. **Survival.** Settle the hit size, and whether it grows at all, now the player has no stats.
6. **The shop loop.** Buy Harpoon copies, items and Fruit weight between waves, and play waves in a row.
7. **A second family.** Bells with their own items. Gate: the same weight purchase helps one build and hurts another.
8. **Weapon diversity.** Add guns one at a time, re-running the grid.
9. **Characters and the full item list.**

# ICARUS game map: the demo as it is on 2026-10-26

This is the shared understanding of the dolphin game (ICARUS) as of **2026-10-26**: what the playable demo does, how a flight actually unfolds (measured, not assumed), where the design is heading, and the rules the designer has set. Read it before discussing the demo, its design or its balance.

- **Snapshot:** branch `design/scoring-revision-2026-10`, demo build at commit `5bdcf36` (the S4 build plus a flight-log export).
- **Design direction (§8, §11, §12) updated 2026-10-27** with the positional design decisions.
- **Step 1 built and revised after playtest 1, 2026-10-27** (`source/space.js`, on by default; Settings › Score has a toggle and an edge-share slider). **§3–§4 describe the demo with step 1 off**, as measured by the flow study.
  - About 80% of spawns appear behind markers inside the view, ahead on your path, at least 10 m above the water. The rest enter from the screen edge.
  - Chasers flock about 6 m apart and follow your recent track.
  - Enemies left beyond the screen after you turn underwater re-enter at the edge at the breach.
  - The landing pool is built but off: the designer found water-line spawns unfair.
  - With it on, the bot measures nearest enemy 12 m, enemies 15.3 m from the screen centre, 3.1% off-screen, 0.5 hits per flight and 20% of kills at the apex. These are saved in `docs/flow-study/bot-step1-metrics.json`.
- **Trust order:** the code beats this file; this file beats memory. Each fact below says where it comes from. If something here disagrees with the code, the code is right and this file is out of date.
- **What's not verified:** human feel, device performance and anything past wave 11 in play (see §9).

## 1. Two codebases in one repo

| Path | What it is | Status |
|---|---|---|
| `src/`, `tests/`, `AGENTS.md` | The TypeScript game built in phases (deterministic `sim/`, fixed 1/120 s step). `AGENTS.md` holds its invariants and phase gates. | Phase 2 (the frame) implemented; its human playtest is pending. |
| `source/` → `ICARUS-demo.html` | The playable scoring/shop **demo**: a minified v3 engine (`source/carve-reference.html`) with the demo's scripts injected by `node source/build.cjs`. | Build S4. Everything in §2–§8 describes this demo. |
| `ICARUS_DESIGN.md` | The design doc. §4 and §10 (revised 2026-10-26) describe the **target** design; Appendix A describes S4, which the demo implements. | Target design not built yet. |
| `qa/` | Headless and browser checks for the demo (`qa/load.cjs` runs the built HTML in a Node vm; `qa/bot.cjs` is the test bot). | All suites pass on S4 (see `README.md`). |

Demo source files: `five-score.js` (scoring, charms), `five-combat.js` (combat items), `demo.js` (rules, shop, waves), `space.js` (step 1: marked spawns, flocking, landing pool), `flightlog.js` (recorder), `score-cues.js`, `scoreboard.js`, `onboarding.js`, `shop.js`, plus CSS.

## 2. Controls (demo)

- **Underwater:** hold **Space** to carve, release to launch (since 2026-10-27; `source/controls.js`). The carve turns the nose up toward the side you face, as in v3 (an always-anticlockwise option exists in Settings › Score, off since the designer reverted it on 2026-10-27). **There is no boost.** Holding Space in the air arms the carve for the splash; held through the surface it adds the corkscrew. Settings › Score can restore W carving with Space boost, and facing-based direction.
- **Water camera:** sits 12 m above the dolphin (setting: 0 restores v3's camera; 7.2 m showed too little sky in the first playtest), so the dolphin is about a fifth of the way up the view. It has no velocity lead in either direction. The pan from the arena centre to the dolphin at the splash is unchanged.
- **In the air:** **W A S D / arrows** move the dolphin inside the arena. Step 3's stomp, dive (S) and dash (Space) exist in `source/verbs.js` but are **parked** (2026-10-27): off by default, under "Experimental" in Settings › Score. The designer wants them to become tricks. **Weapons fire automatically**; the player never aims or times shots.
- **Esc** pauses. The pause menu and the end-of-run screen have **SAVE FLIGHT LOG** (§10).

## 3. The loop and its real timings

One cycle is a dive followed by a flight. These are medians from 291 bot flights (§9 has the limits).

| Launch | Waves | Underwater | In the air | Peak height |
|---|---|---|---|---|
| Low hop (~30°) | 1–3 | 1.15 s | 2.3 s | 19 m |
| Low hop | 7+ | 0.97 s | 4.7 s | 51 m |
| Mid (~55°) | 1–3 | 1.7 s | 3.9 s | 38 m |
| Mid | 7+ | 1.5 s | 6.8 s | 94 m |
| High (~80°) | 1–3 | 2.7 s | 4.7 s | 49 m |
| High | 7+ | 2.5 s | 8.1 s | 128 m |

- **The water phase is about 1–3 seconds.** That's too short to read anything; the designer has said so explicitly.
- **Launch speed is fixed per wave:** 30 m/s at wave 1, +5 m/s per wave (engine `Dd`; a locked designer rule).
- **Threat tier comes from the launch angle only** (engine `YT`): tier = 1 + the number of thresholds 27°, 42°, 56° and 70° that the angle reaches. So below 27° is tier 1, and 70° or more is tier 5. Higher tiers mean harder enemies and better loot; this altitude-band risk/reward already exists.
- **Release decides the flight.** Angle sets tier, height and air time together. After release the player only moves inside the arena that rides the arc.

## 4. Space: the arena, the camera and where enemies are

- **The arena** is 76 × 43.2 m (`arena.width`, `arena.height` in the engine settings) and travels along the ballistic arc. The dolphin's position is arena-local.
- **The view shows the whole arena.** In the air the camera locks to the arena origin, and the view locks to the arena's 43.2 m height ("Lock view to arena", on by default). The game letterboxes a 16:9 frame, so the view is 76.8 m wide whatever the window's shape. This was measured at runtime and confirmed with 16:10 and 4:3 screenshots on 2026-10-27. Earlier versions of this map said 57 m, from the `frame.width` setting, which the lock overrides. The arena's ±38 m bounds sit at the view's edge, so the dolphin can reach the screen edge.
- **Enemies spawn just outside the view's edge on a random side** (`demo.js` `spawn`, and the engine's `Obq`). Measured:
  - The median enemy sits 31 m from the centre, near the edge of a ±38.4 m view; 18% of enemy positions are off-screen, entering from the sides. A human run on 2026-10-27 measured 32 m and 16%.
  - The median nearest enemy is 11–31 m away. Shot weapons reach 30 m, so most kills happen toward the screen edges, and the centre of the screen is usually empty.
- **Pursuers above the water while you swim (fixed 2026-10-27, `space.js` `holdAbove`, setting "Enemies above the water stay ahead of you"):** v3 flew them straight on in the direction they faced at the splash, so a carve that turned you round left them flying out of the arena (bot: 35% off-screen, up to 95 m away). They now hold 8–26 m ahead of you on the side you're moving toward, 5–12 m up and under the view's top edge (bot: 0.4% off a side edge, at most 44 m away). When a deep dive takes the surface out of view they are above the top edge, since they stay at least 1.5 m above the water.
- **Spawning goes on while you swim (2026-10-27, `space.js` `wetSpawn`, setting "Enemies keep spawning while you swim"):** the wave's spawn schedule now also advances during water stays, once the wave's first launch has started it; the air clock still pauses. New enemies appear behind step 1's markers above the water in view and are held ahead of you until the next launch. Bot: 1.2 spawns/s in the water against 1.9/s in the air.
- **The surface is the busiest place.** Enemies left over at water entry become **pursuers**: they wait at the surface and some follow underwater ("wet"). The first kill comes 0–0.7 s after breach. Between 3 and 10 pursuers gather at the landing point, and at waves 7+ up to 8 follow underwater.
- **Kills are spread evenly over the flight.** The apex window (±10% of air time around the apex, so 20% of the time) gets 17% of kills; ascent gets 42% and descent 40%. No phase concentrates kills today.
- **Hits are rare for a cautious player:** 59 hits in 291 bot flights, and 83% of flights had none. The bot keeps about 8 m away and dodges, so real players may differ.
- **Kill mix:** chasers 56%, swarmers 24%, chargers 15%, turrets 4%. The roster also includes drifters, splitters (which split into two swarmers) and a boss (a large charger).

## 5a. Step 4 rules (the default since 2026-10-27)

- **0 HP ends the run.** There is no quota and no bust. A wave is survived: when its air clock runs out, enemies keep coming and it ends at the next water entry. Clearing a wave restores HP.
- **Style score per flight** = kills this flight × mult × clean streak. The mult is 1 until step 5's tricks feed it. The streak counts clean flights in a row including this one, up to ×5; a hit puts it back to ×1; it survives the shop.
- **Pearls** are the one shop currency (shown as ◈ in places): round(3 × √score) at each splashdown, plus each wave's clear pay (24 + 4 × wave) and 10% interest on saved pearls (at most 10).
- **The shop** has no charms and no reel routines; their places go to weapons and gear. Settings › Score › "Style score rules" off restores S4 below.

- **The routine (step 5, `source/routine.js`):** three slots fire, Breach (as the arena opens), Apex and Entry (water contact, before the bank). Tricks: Corkscrew (setup, pushes within 8 m), Gravity anchor (setup, pulls within 20 m for 1.5 s; a hit cancels it), Star pose (payoff, bursts within 7 m), Spout (payoff, splashes 4–12 m around the landing point by peak height, soaks). The mult is 1 + connected trick levels + 1 per linked payoff (a payoff that hits enemies a setup moved this flight). The run starts with one trick picked on the title screen; the shop always has one trick place, and its routine panel moves tricks between slots.

## 5. Waves and the loss condition (S4 demo)

- **Air clock:** 20 s at wave 1, +5 s per wave, capped at 60 s; wave 20 is 90 s (`clock`). It runs only in the air. When it runs out, enemies keep coming and the wave ends at the next water entry. There is no safe coast.
- **The only way to lose is missing the wave's quota:** `quota = ceil(expectedChips(w) × 2.2 × 1.23^(w−1))`. Clearing wave 20 wins.
- **Bosses:** on waves divisible by 10, once 30% of the clock's air time has passed. The demo's boss never despawns.
- **0 HP busts the jump**, and does not end the run. The dolphin falls out of combat (`BUST.fall` 24), the jump banks nothing (half with Second wind), and you come back at 50% HP (`BUST.revive`).

## 6. Scoring in S4: tricks as reels

- **Every jump banks chips × mult at water entry.**
  - Chips are kills plus bonus chips: multi-kill +1, apex kill +2, crit kill +1.
  - Mult comes from tricks, combos and charms.
- **Tricks are drawn reels** that play automatically in order across the flight. There are 3 draws by default; buying raises this to 6, and Loaded reels makes it 7. The five tricks are Front flip, Backflip, Corkscrew, Star pose and Spout.
- **A hit bails the trick in progress**, shown as a red ✕; it pays nothing. Landed tricks keep their value.
- **37 charms**, each at most two lines with at most one condition. They resolve left to right at the bank. No charm changes weapon damage.
- **Pearls** are the currency: wave pay plus overscore pearls, which are capped at the base pay.

## 7. Build layers (S4 demo)

- **Weapons:** 9 automatic weapons in 3 types × 3 cadences, with 6 slots. Merging equal copies raises the tier, up to T4.

  | Type | Rapid | Steady | Heavy |
  |---|---|---|---|
  | Close (6 m) | Fin | Sonic | Arc |
  | Shot (30 m) | Minigun | Harpoon | Laser |
  | Blast (18 m) | Flak | Rocket | Depth charge |

- **Stats:**
  - Combat: Close, Shot, Blast, Damage %, Attack speed, Crit, Reach, Area.
  - Defence: Max HP, Armour, Regen.
  - Flight: Lift, Hang, Air steering. Drive exists but is kept out of gear offers; whether level-up picks can offer it is unverified.
  - Economy: Pickup, Luck, XP gain.
- **XP:** kills drop orbs that you steer through to collect. Each level gives a free pick of three stats before the shop. **Levels give no free Max HP** (designer decision, 2026-10-25).
- **Shop:** Weapons, Gear (stat and combat items), Charms and Routine (trick values, combo levels, draw odds, extra draws, techniques).
  - Run rules (charm slot, reroll discount, extra shelf) are rare offers.
  - Rarity is coloured and sets how often an offer appears.
  - Lock, rerolls, selling at 50% and weapon replacement all exist.
  - The trick scoreboard is always visible.

## 8. Where the design is heading (not built)

`ICARUS_DESIGN.md` §4 (revised 2026-10-27) and §10 replace the slot-machine reels with a **five-slot routine of positional setups and payoffs**:

- **The routine:**
  - The slots are breach, ascent, apex, descent and entry, and any trick can go in any slot.
  - A routine holds one copy of each trick; extra copies level a trick up.
  - All five slots are open from the start, but the run begins with one trick.
- **Setups and payoffs:** setups move, hold or status enemies; payoffs consume them. A payoff on enemies your own setup moved is **linked** and adds style mult.
- **The positional grammar (§4.16):** every effect is anchor + trigger + shape + verb.
  - Anchors are body (Ahead, Behind, Above, Below, Around), path (Trajectory, Wake, Arc), landmark (breach, apex and landing points, the surface) and target.
  - There are two layers: the arena rides the arc, while the world layer, including the surface, sweeps through it. This is still to be verified in play.
  - Enemies have exposed sides, and there are three hard surfaces: enemies, frozen blocks and the water (drowning).
- **Statuses replace tags:** Soaked, Shock, Burn, Freeze and Bleed, plus three reactions (Conduct, Flash-freeze, Steam). Each status changes where enemies go.
- **Classes (§4.17):** 12 Brotato-style classes with set bonuses at 2, 4 and 6. Weapons have a delivery (Close, Shot or Blast) and one or two classes, and tricks count as one item toward set bonuses. The roster target is Brotato's weapon count; the exact number is open.
- **Evolutions are earned by feats:** a T4 weapon plus its positional feat performed N times.
- **Style score:** chips × mult × clean streak, paid as pearls on a diminishing curve. The **clean streak carries across flights**, and a hit resets it.
- **0 HP ends the run;** there is no quota and no bust.
- **Space (§4.18):**
  - Enemies spawn on the arc, the arena fits the view, chasers flock and the landing pool is visible.
  - Shots lead your arc; there are clutch events and new flight verbs (stomp-bounce, dive, dash).
- **Rejected (2026-10-27):** proximity scaling (Pressure, Point-blank, Graze).
- **The plan (§4.20):** 16 linear steps, each with a build, an automated check, a playtest question and a gate measured with the flight log. Step 0 is choosing which codebase prototypes the routine: the demo or `src/`.

**Why: the flow study (§4).** Enemies sat at the screen edges and kills were spread evenly over the flight. Hits were rare for careful play, and agency ended at release. Each part of the new design targets one of these.

## 9. How the flow numbers were measured, and their limits

- **Source:** the S4 demo, run headless by `qa/bot.cjs` with positions logged 10 times per second. There were four styles (low, mid, high, and mid turning round at launch) with one seed (7) each, and a simple shop policy (harpoon start; buys weapons plus Armour, Max HP, Regen, Damage % and Shot). Screenshots come from the same bot driving the real renderer.
- **The bot is not a player.** It decides about every 0.27 s, keeps about 8 m from the nearest enemy, dodges three in four of the shots it notices, collects orbs when safe and never performs tricks.
- **No data past wave 11 and none on bosses:** all bot runs ended on the quota at waves 7–11.
- **The report** (filmstrips, arena heat maps and flight maps) is `docs/flow-study/icarus-flow-study.html`. Its scripts and regeneration steps are in `docs/flow-study/`.

## 10. Tools for seeing the game

- **SAVE FLIGHT LOG** (`source/flightlog.js`) downloads JSON with:
  - each flight's launch, dive samples (20 Hz) and air samples (10 Hz): inputs `[x, y, boost, w, turn]`, dolphin world and arena-local position, arena origin, every air enemy (`[kind, local x, local y, hp]`; version 2 of the format, 2026-10-27) and pursuers
  - kills, hits, the bank, wave results and shop actions

  It only reads state. `icarusDemo.flightLog()` returns the same JSON.
- **`node qa/flightlog-metrics.cjs logs/*.json`** prints the plan's gate metrics (design doc §4.20). `qa/flightlog-bot.cjs` checks it against the bot baseline (step 1 off), which is saved in `docs/flow-study/bot-baseline-metrics.json`. `--space` plays with step 1 on and prints its metrics instead. **Real player logs are the best next evidence;** ask the designer for them.
- **Headless runs:** `qa/load.cjs` and `qa/bot.cjs`, with `flyer(controls, style, seed, {keep})`; the styles are low, mid and high × keep or turn.
- **Browser:** use Playwright with `--enable-webgl --use-gl=angle --use-angle=swiftshader`. Rendering in the cloud container is software-only and slow; the 15-second render stress check fails there for that reason.
- **Test-run side effect:** some QA scripts rewrite `reviews/*.json`. Restore those files with git instead of committing the test noise.

## 11. Designer rules and corrections (keep these)

**Locked rules:**
- Launch speed is 30 m/s, +5 per wave.
- Guns auto-fire.
- There is no entry, landing or entry-angle grade; that feature was removed.
- Charms must be readable in at most two lines.
- No "this jump needs X" readout.
- Airtime gating is rejected.
- Proximity scaling is rejected (2026-10-27).
- The clean streak carries across flights; evolutions are earned by feats; tricks count toward class set bonuses (2026-10-27).
- There is no safe coast after the clock.
- XP orbs stay, without free Max HP. The heat cue is removed.

**Corrections the designer made; don't repeat these mistakes:**
- The water phase is about 1 s, so nothing can be read underwater, and nothing can be read in the air either while dodging.
- The player can't time kills.
- Altitude risk/reward already exists through threat tiers.

**Priorities:**
- Novelty and fundamentals, as with Balatro and Vampire Survivors.
- The game should appeal to a Northernlion-style audience.
- Tricks are the Tony Hawk layer. Removing them would turn the game into a Balatro clone.

**Working rules:**
- Be rigorous: ask instead of assuming.
- Push only to the authorised branch, and open a PR only when asked.
- The ethical constraints in design doc §4.13 are binding.

## 12. Open questions waiting for the designer

1. How the designer actually plays: low hops, high launches or a mix; turning round at launch; where the dolphin sits on screen; how often and where they get hit; whether enemies feel edge-borne. A flight log would answer most of this.
2. Which codebase prototypes the routine: the demo or `src/` (design doc §4.20, step 0).
3. Brotato's exact weapon count, which is the roster target.
4. Whether the clean streak survives the shop between waves.
5. Kill-lift versus stomp-bounce.
6. Stat questions: a projectile cap, the scope of attack speed, and how evolved weapons behave.
7. The rest of the design doc §4.14 list.

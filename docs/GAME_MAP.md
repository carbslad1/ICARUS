# ICARUS game map: the demo as it is on 2026-10-26

This is the shared understanding of the dolphin game (ICARUS) as of **2026-10-26**: what the playable demo does, how a flight actually unfolds (measured, not assumed), where the design is heading, and the rules the designer has set. Read it before discussing the demo, its design or its balance.

- **Snapshot:** branch `design/scoring-revision-2026-10`, demo build at commit `5bdcf36` (the S4 build plus a flight-log export).
- **Design direction (§8, §11, §12) updated 2026-10-31:** the 2026-10-30 run structure. One trick or combo is chosen each dive and boosts its weapon type; tricks never deal damage; items only modify; levels give item drafts; catalysts evolve weapons. The routine, placement tricks and positional design built on the branch up to 2026-10-30 are superseded but **still in the code** until design doc §4.17 replaces them.
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
| `ICARUS_DESIGN.md` | The design doc. §4 and §10 (revised 2026-10-30) describe the **target** design. Appendix A describes S4; Appendix B the routine and positional design, much of which is built in the demo. | Target design not built yet. Its build order is §4.17. |
| `qa/` | Headless and browser checks for the demo (`qa/load.cjs` runs the built HTML in a Node vm; `qa/bot.cjs` is the test bot). | All suites pass on S4 (see `README.md`). |

Demo source files: `five-score.js` (scoring, charms), `five-combat.js` (combat items), `demo.js` (rules, shop, waves), `space.js` (step 1: marked spawns, flocking, landing pool), `flightlog.js` (recorder), `score-cues.js`, `scoreboard.js`, `onboarding.js`, `shop.js`, plus CSS.

## 2. Controls (demo)

> **Changed 2026-10-31:** the default water controls are v3's free swimming again (forward-only swimming off): A and D turn, W or Space boosts. A trick is the key held as you breach (D Front flip, A Backflip, W Corkscrew, S Belly flop); D always turns clockwise and the sprite no longer half-rolls to keep its back up (2026-11-01); see design doc §4.3. The Space carve below applies only with forward-only swimming on. The QA loader pins the suites and bots to forward-only swimming.

- **Underwater:** hold **Space** to carve, release to launch (since 2026-10-27; `source/controls.js`). The carve turns the nose up toward the side you face, as in v3 (an always-anticlockwise option exists in Settings › Score, off since the designer reverted it on 2026-10-27). **There is no boost.** Holding Space in the air arms the carve for the splash; held through the surface it adds the corkscrew. Settings › Score can restore W carving with Space boost, and facing-based direction.
- **Enemies waiting above the water while you loop (2026-11-01, `space.js` holdAbove; setting "hold their side and height", on):** their side comes from your sideways travel averaged over about 2.5 s, and they stay level (2 m below to 3 m above their 5-12 m holding height) while they move. Looping under water no longer drags them down to the waterline (`node qa/holdloop.cjs`: 0% at the waterline, against 42-61% before).
- **Water view (2026-11-01, `source/controls.js` WaterView; settings "Water view", on):** the top of the view is pinned above the waterline (20 m of air, and at least a quarter of the view), so the air and the enemies waiting there stay in view at any speed. The view's height covers the deepest point the dolphin is about to reach (its current turn 0.6 s ahead), zooming smoothly out and slowly back in, up to 3× the air view; entering the water it carries on from the air's framing, and after a breach it eases back to the air view over 0.6 s. No cap on the water speed (designer). Checked by `node qa/watercam.cjs` (hold D, loops at 30-125 m/s: air 100%, dolphin ≥ 99%) and `node qa/waterview.cjs` (bot dives).
- **Rapid short hops (2026-11-01, designer: "enemies are teleporting ... jittering, and expanding in and out from water to breach"):** measured headlessly per enemy on screen (`qa/` checks plus a hop tracker). Fixed: a surfacing enemy was lifted to the 2 m floor in one step (a 2 m pop); at the breach `Space.recall` moved waiting enemies beyond the arena's side up to 31 m in one step (now, while they hover in view, they keep their place and fly in); an enemy under the water dodging your path could go at twice its speed (150 m/s); one touching you at the splash was shoved 2-3 m in one step (now eased out at your speed + 10 m/s); the water view looked 0.6 s ahead, so a short hop's 55° dive read as 37 m deep at wave 10 and every hop zoomed out 1.2-1.5× and back (setting "how far ahead the zoom looks", now 0.15 s: 1.0× at wave 3, 1.24× at wave 10; hold-D loops still keep the air in view 100%). The waiting enemies' side margin is 22% of the view (at least 6 m).
- **Skimming at speed (2026-11-01, designer's flight log: Wave 1 speed 100, launches 0-12°, 0.2-0.5 s swims, S held):** measured frame by frame in the real renderer (the game's own frame loop driven at 60 fps of game time). Fixed: the air camera started each breach where the water camera was, so the breach's step had no camera motion and that frame showed half the scroll (a stutter at every breach); now it carries on with the camera's last step (0.96-1.02x its neighbours). Waiting enemies were carried with the camera by its move since the hover last ran "within 0.1 s", which after a flight shorter than that shifted them all up to 12 m at the splash; now only from the step before. At the breach they became arena enemies with the arena's speed taken off their wander, so they flew back across the screen about 8 m in 0.12 s (the clump and spread); now their wander is their speed in the arena (common screen motion after a breach at most 3 px a frame, spread within 5%). The view's edge brings a waiting enemy back at up to 12 m/s (a 10/s pull lunged at about 100 m/s). The simulation step itself is cheap: crossing steps 1.6-4 ms headless, 2-11 ms a frame in the browser with drawing.
- **Climb built under water (2026-11-03, `source/controls.js` WaterView + a Zq wrapper; setting "Breach camera: builds the climb under water", on, 0.35 s):** designer: "i dont like how it feels like the camera speeds up in the air at high speed", then chose "build speed under water". Measured: the camera left the water at rest vertically and reached the arena's climb over 0.5 s (16 against 46 m/s at wave 15, 5 against 22 at wave 4). Now, heading out, over the last 0.35 s before the surface the camera starts to climb, aiming its total climb (the zoom's plus the rise) at the launch's climb as the breach scales it ($T); at the breach the arena is placed with its centre on the camera's next position (at most 18 m up or down; the dolphin and enemies keep their world places), so the camera rides it at once. Waiting enemies climb with the camera (homes included), so they keep their screen places. Measured: camera / arena climb at the breach 17/19 (wave 4), 29/30 (wave 10), 38-45/40-42 (wave 15) headless, 21/21-23 in the renderer at wave 4, jolt 0.83-0.91 px/frame²; the water line drops 6-8% of the view in the last 0.4 s at wave 4, up to 18% at waves 10-15 (5% without). A hard turn up to the surface does not count as heading out and keeps the 0.5 s ramp.
- **Breach latch (2026-11-03, `source/controls.js`; setting "Breach latch", on):** designer: holding D "i have to let go to stop the dolphin hitting the edge of the screen". A direction held as you leave the water is the trick's, so in the air it does not move the dolphin until it is let go; a direction pressed in the air moves it at once (each axis on its own). Checked: D held through a breach and for 1 s in the air chooses the Front flip and leaves the dolphin where it was (0.1 m); with the latch off it reached the arena's edge (36 m) in 1 s. Rejected: a short lock-out after the breach (a longer hold still drifts), the camera and arena following a held key (not self-explanatory, designer), a soft arena edge (still ends at the edge). Squash and stretch is off by default (designer: "i dont like the squash and stretch"; a one-time migration turns off a saved setting too).
- **Momentum feel (2026-11-03, designer: "analyse the smoothness and visual of the breach, entry and camera ... the most satisfying momentum based movement"):** measured in the visible pane at full speed. The crossings were smooth by then (the background's speed changes gradually through a breach, the dolphin's on-screen speed is continuous, 840/840 frames). Two gaps against the genre's practice (Tiny Wings, Sonic, Ecco-likes), both added behind settings: (1) look-ahead under water ("Water camera: leans ahead", 0.2 s of travel, at most 22% of the half-width, eased over 1 s): the camera held the dolphin dead centre at every speed; the lean costs some camera smoothness under water (horizontal jolt 0.22 -> about 0.5-0.9 px/frame², gentle drift, a quarter of the old breach jolt); (2) squash and stretch at the crossings ("Squash and stretch", 0.16): the body stretches along its travel leaving the water and squashes hitting it, easing back over 0.22 s; nothing pauses or slows. Not added, by the designer's standing rules: hit-stop, freezes or slow motion, entry-quality judging, zoom with speed.
- **Breach smoothness (2026-11-03):** designer: "stutter and lag around the breach ... is it all the enemies updating their positions at once? is it camera? is it telemetry?". Measured in the visible browser pane at full speed: the frame rate is not it (v3 carve 825/840 frames in 14 s, 99% under 17.7 ms; the demo 824/840, the same; per-frame work at a breach 6-12 ms drawing, 2-6 ms events, 3-7 ms GPU submit; the flight log keeps a small record in memory). It was the enemies: with the breach camera carrying its speed, waiting enemies became arena enemies with only their wander as their speed in the arena, so they jumped up the screen (their on-screen speed changed 5.7-8.1 px a frame within 5 frames, against 0.38 at the 95th percentile elsewhere). They now keep their on-screen speed (the camera's last step added): 1.1-1.7 px a frame. (Timing hooks on every function cost far more than the game and showed 0.5-1 s stalls; measure with light recording only.)
- **Breach shockwave (2026-11-02, `source/controls.js`; setting "Breach shockwave", on):** designer: "turn the splash knockback/rocketboost that pushed enemies back on". Forward-only swimming fires a rocket blast as you leave the water, and the Space carve a breach burst; free swimming fired neither. Now every breach in free swimming fires v3's exit blast where you leave the water, leaning the way you launch, with its splash and sound; Settings › Launch › Rocket boost sets its size (shockwave size 14 m × exit blast 1), push (30 m/s) and spread (0.5 s), and v3's `Orshock` pushes the enemies it reaches. Checked headlessly (wave 6, 28 breaches): a ring at every breach; it hit 47 of the 100 enemies within 14 m, which moved a median 9.5 m in the next 0.6 s.
- **Splash, deep dives and fast swims (2026-11-02):** measured in the renderer (frame loop driven at 60 fps, or 12-22 ms frames for the jitter).
  - Splash: the water view's top carries the camera's fall, up to as fast as it can reach its framing plus 6 m/s (setting "Splash camera ..."): the worst splash jolt at 30 m/s went from 4.1 to 1.4 px/frame². Carrying all of a 60-100 m/s fall took the top below the water at waves 10-20; 20 m/s more gave 0.35 but lost waiting enemies off the top (71-79% on screen).
  - A wave's first jump: a run or wave starts with the dolphin diving, and the designer's flight log shows 66-92 m dives breaching 2.2-2.7× zoomed out (the view held the depth and let it go at 10 m/s), so the view zoomed in during the flight with the arena's red outline inside the screen. Now, heading out (rising, turning under 1.5 rad/s averaged over 0.3 s, within 4 s of the surface), the held depth comes up at 1.6× the climb and the zoom follows its target without lag (setting "zooms back in as you rise"): a 70 m dive breaches at 0.98× (30 m/s) and 1.07× (100 m/s); hold-D loops are unchanged (zoom 0.22/s). The arena's outline is not drawn while the view is more than 5% bigger than the arena.
  - Fast swims: the hover set a waiting enemy's step start after the camera carry, so the renderer drew the carry in jumps of a step; with uneven frames at 120 m/s their on-screen speed changed by 10.9 px/frame each frame (median), now 0.19. `qa/wateravoid.cjs` takes the carry off the wander speed it measures.
- **Breach camera (2026-11-01, setting "Breach camera: carries its speed through the breach", on; "seconds to settle onto the arena", 0.5):** designer: "the camera lurches on breach ... a little jolt, even at 30". Under the water the camera's height is held; from the breach it rides the arena, which is already climbing (about 19 m/s at 30 m/s), and the offset from the water's framing eased out from rest, so the camera took the climb in one frame and swung back (up to 4.1 px/frame² of jolt). Now the offset eases out as before plus a term that starts at the camera's own speed and fades over the same 0.5 s: measured in the renderer at 30 m/s, the worst jolt near a breach is 0.44 px/frame² (old ease 2.2-4.1; a spring tried first, 5.2). The splash has the mirror jolt (falling at about 4.4 px a frame, stopped within one or two frames by the water framing); not yet changed.
- **Sizes held at 30 m/s (2026-11-01, `source/controls.js` SizeHold; setting "keep their 30 m/s size", on):** the designer wanted the dolphin and enemies "the same size as they are at 30 at all speeds". Everything the renderer sizes by its zoom (dolphin, enemies, shots, orbs, trail, bubbles, particles) stops shrinking once the view zooms out past 1.12 × the air view (setting `sizeref`; the water view's median at 30 m/s; at 125 m/s its median is 1.38 and its most 2.7). Positions, hitboxes and the air are unchanged. Measured: under water the dolphin is never under 69 px wide (of 1440) at any speed, where it fell to 36 px at 125 m/s and 48 px at 30 m/s; in the real renderer at 2.4-2.6× zoom-out, 118 px against 50-54 px.
- **Water camera (before 2026-11-01, and with "Water view" off):** sits 12 m above the dolphin (setting: 0 restores v3's camera; 7.2 m showed too little sky in the first playtest), so the dolphin is about a fifth of the way up the view. It has no velocity lead in either direction. The pan from the arena centre to the dolphin at the splash is unchanged.
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
- **Jump height for testing (2026-11-01):** Settings › Launch › "Wave 1 speed" and "Gain per wave" set the launch speed (50 m/s at wave 1: a 70 m apex instead of 33 m). Settings › Swimming › "Gravity (hang time)" sets the air's gravity (−15 m/s² default; −8: 52 m apex, 6.6 s in the air; −25: 24 m, 2.1 s). Until 2026-11-01 that slider did nothing: the demo's air step, the landing predictions (`danger.js`, `space.js`) and the engine's flight guides (patched in `source/build.cjs`) used a fixed 15 or 16.
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

- **The routine** (superseded design, still in the code; design doc Appendix B) (`source/routine.js`, redesigned 2026-10-30): in the air the guns do all the damage; tricks are effects that place enemies for them, and only water tricks damage. Five slots: Breach, Ascent (pulses every 0.6 s at a third of the power), Apex, Descent (pulses), Entry. Air effects: Gravity anchor (a well on the nearest enemy, the guns' target), Chum line (lines enemies up through the nearest enemy), Slipstream (files chasers behind through the nearest of them), Eddy (rings enemies at 4.5 m, inside Close reach), Bubble net (holds enemies around you 1 s), Bow wave (pushes enemies ahead aside), Breach wave (lifts surface enemies, soaks), Frost wake (your trail chills), Snare buoys (world-fixed points on the arc that freeze). Water tricks: Spout (landing splash), Riptide (drags low enemies into the water), Belly flop (drives enemies below you into the water), Undertow (pulls enemies at the landing under). mult = 1 + levels of tricks that affected an enemy + 1 per linked trick (a gun or water kill of an enemy it affected). The run starts with one trick picked on the title screen; the shop always has one trick place.
- **Statuses (step 7, `source/statuses.js`):** Spout and Breach wave soak, Arc shocks (jumps within 5 m), Depth charge and Frost wake chill (3 = frozen block). Reactions: Conduct, Flash-freeze, Shatter (any gun hit on a frozen enemy).
- **Brotato enemy movement (`source/movement.js`, base game only):** turrets keep about 23 m from you like Spitters, drifters fly to points about 11 m around you like Flies, splitters hold their own spot around you like Slashers, elites other than chargers hover like Gargoyles; chasers, swarmers and chargers still chase.
- **Sides and drowning (step 8):** from wave 3 some enemies are Shielders, Turtles or Spikers, armoured except from behind, below or above (20% through armour). Soaked or driven enemies that reach the water drown. Pushed enemies do not damage each other.

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

`ICARUS_DESIGN.md` §4 and §10 (revised 2026-10-30) are the target. In short:

- **The hook:** the dive (a short, calm decision every 4–8 s) and the splashdown (a payout moment).
- **Input:** underwater, tap **W/A/S/D** to choose the trick(s); the last choice carries over. Hold **Space** to carve; the Space carve is already built. In the air, WASD only moves.
- **The four tricks (defaults).** They never deal damage, and each boosts one weapon type for the flight:

  | Key | Trick | Boosts | Moment | Ability |
  |---|---|---|---|---|
  | D | Front flip | Melee | Breach | Charge: boosted launch, about 1 s invulnerable |
  | A | Backflip | Ranged | Breach | Repulse: pushes enemies away |
  | W | Corkscrew | Elemental | Apex | Time slow: about 1.5 s |
  | S | Belly flop | Economy | Water entry | Shockwave knockback; this flight's kills drop extra XP and pearls |

- **Boost [TUNE]:** single +30%, pair +18% each, triple +12% each. A weapon with two tags gets both boosts.
- **Combos:** any set except Front flip + Backflip, played in order: breach → apex → entry. A pair unlocks when you hold a weapon carrying both of its tags; triples come from the rare item *Triple threat*.
- **Weapons:** 6 slots, merge T1–T4, 1–2 type tags (never melee + ranged). No set bonuses.
- **Items:**
  - Common, Rare, Legendary, Cursed, Catalyst.
  - Stats come only from items and stack linearly, with every number shown.
  - **Items never create attacks:** no torpedoes, no "chance to" effects.
- **Getting things:** a level-up is a 1-of-3 item draft; drops (elites, crates) give one random item; the shop sells weapons, items and catalysts between waves.
- **Catalysts:** convert every copy of a weapon into its evolved form, permanently, at any tier.
- **Splashdown:** (kills + orbs) × clean streak → pearls. There is no freshness decay. The built step-4 rules (streak cap ×5, survives the shop) are the starting point.
- **Characters:** one in the demo. The full version has passives and alternative trick versions unlocked by challenges.
- **Run:** 20 waves, about 25 minutes, bosses at waves 10 and 20, 0 HP ends the run.
- **Build order (design doc §4.17):**
  1. playtest and tune the built danger
  2. the four tricks, singles only, proven one at a time with the Trick Lab process
  3. splashdown payout and clean streak
  4. drafts, drops and the shop
  5. two-tag weapons and combos
  6. catalysts

**Why:** the designer's playtest found that the fun is killing and collecting orbs while moving around. Positional rules fought that, and several tricks per flight looked janky. The flow study (§4) and the designer's 0 hits in 24 flights show that **danger must come first,** or the tricks' utility won't matter.

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
- **`node qa/flightlog-metrics.cjs logs/*.json`** prints the gate metrics for the build order (design doc §4.17). `qa/flightlog-bot.cjs` checks it against the bot baseline (step 1 off), which is saved in `docs/flow-study/bot-baseline-metrics.json`. `--space` plays with step 1 on and prints its metrics instead. **Real player logs are the best next evidence;** ask the designer for them.
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
- Positional rules (above, below, behind) are rejected; the fun is killing and collecting orbs while moving around (2026-10-30).
- Tricks are chosen only underwater, never deal damage (water tricks included), and boost their weapon type (2026-10-30).
- Items modify and never attack; no "chance to" effects (2026-10-30).
- No freshness decay, no class set bonuses, no Brotato-style stat picks, no skill tree or map, no engineering deployables (2026-10-30).
- The clean streak carries across flights (2026-10-27). Evolutions come from catalysts that convert at any tier (2026-10-30).
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
- The audience is players of Brotato, Balatro, Ball x Pit and CloverPit: choice-driven upgrades, visible maths, short runs with an ending.

**Working rules:**
- Be rigorous: ask instead of assuming.
- Push only to the authorised branch, and open a PR only when asked.
- The ethical constraints in design doc §4.15 are binding.

## 12. Open questions waiting for the designer

1. Does critical chance stay, as the one random stat?
2. What do W/A/S/D do underwater today, and how does tapping them to choose tricks fit with the Space carve?
3. The boost numbers and the size of the trick utilities, after the danger pass.
4. Confirm the built streak rules: cap ×5, survives the shop.
5. How does Time slow feel? Test it early.
6. Brotato's exact weapon count, the long-term roster target.

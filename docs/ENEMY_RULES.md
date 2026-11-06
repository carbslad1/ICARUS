# Enemy behaviour: goals and rules

Status: goals confirmed by the designer 2026-11-06; rewritten around the stage 2026-11-07 (section 3). Every parameter belongs to a rule
here, and each goal has a check in `qa/enemy-sandbox.cjs`.

## 1. Goals (what the player sees)

Purpose: Brotato's pressure in a game where you move far faster than Brotato's player. There is always a varied spread
of enemies around you to fight, and their motion looks like their own.

- **G1. Always with you.** You cannot leave enemies behind by swimming or flying. Those above the water keep up at your
  speed too (designer, 2026-11-06).
- **G2. In the water they get out.** Enemies carried in by their fall avoid you and head for the air, then fly on with
  you. They do not chase you under the water. Turrets stay in the air.
- **G3. Consistent on the screen.** They travel with the camera. Your turns and speed do not move them on the screen;
  only their own steering does.
- **G4. Smooth.** An enemy never snaps direction, jumps or teleports, in flight, in the water or crossing the line.
- **G5. Never stuck on the water line.** It is a place they pass through.
- **G6. Spread and variety.** Brotato's roles, spread over the screen: no clump, no line, no overlap.
- **G7. A few metres off you under the water.** In flight, touching you is still the threat.
- **G8. No moment of change.** Enemies change behaviour gradually as you approach the water, from when the water line
  comes into view, not all together at the splash. The same on the way back up.

Confirmed: enemies above the water cross the background at your speed, and G3 limits how they *turn*; in flight they
stay slower than you within the arena; turrets keep up too.

## 2. Facts the rules rest on

From Brotato (`brotato-reference/BROTATO-SYSTEMS.md`, reference only):
- **Speeds:** enemies are slower than the player. The player moves at 450, Chasers 380 (84%), Chargers 400 (89%),
  Bruisers 300, Spitters 200 (px/s).
- **Spawns:** at least 300 px from you, behind a red X for about 1 s. A group appears clustered in a small square,
  anywhere on the map, or on the map's edge.
- **Roles** (`source/movement.js`): most chase; Spitters keep their range; Flies move between random points around you;
  Slashers hold their own offset from you; Chargers wind up and dash.
- [ASSUMED, to check in the decompile] Enemies push each other apart softly, so a crowd spreads rather than overlaps.

From ICARUS as it is (measured in the sandbox, HEAD 6f0c08c):
- The dolphin is far faster than in Brotato. It flies at 30+ m/s and swims at 40–125 m/s by wave. Enemies fly at
  13–21 m/s.
- Every cause of G2–G4 failures found was a *seam*: a place where one movement system hands an enemy to another, or a
  clamp holds it.
  - Arena enemies ↔ pursuers at the splash and the breach.
  - The hold and hover carried enemies with the camera.
  - The breach recall teleported them.
  - The surface hold kept them at −0.3 m.
  - Speed caps fought the steering.
  - The wet-avoid shove snapped headings.

## 3. Rules: the stage (designer, 2026-11-07; `source/enemies.js`)

Combat happens on a **stage**: the screen rectangle, 76 × 43 m at every speed and zoom. The dolphin's world speed never
enters enemy logic. World speed is spectacle; stage position is what you play.

**S1. The stage is the camera before shake, ignoring zoom.** After each step every enemy is carried by what the camera
did, so an enemy that does not steer does not move on the screen. Zooming out only changes the world behind it.

**S2. Enemies move only on the stage, at fixed stage speeds** (v3's speeds), the same at every wave's dolphin speed.
Velocity eases toward the wanted one over TAU = 0.24 s, never set outright. Knockback, shocks and tricks push as before.

**S3. Roles are Brotato's** and hold at all times: chase; keep range (turret); around you (drifter); own offset
(splitter); charge. Targets stay inside the stage, so the stage's edges are Brotato's walls.

**S4. They stay above the water.** Each enemy has its own height over the water line, 8–20 m by its seed, and no target
of its goes below that. When you go lower than that height it aims at the point above you at its own height, moved to
its own side as you go deeper. Each enemy starts this at its own height above the water, so they do not change together,
and it is finished well before you splash. Near the top of the screen, heights are capped inside the stage.

**S5. The water line sweeps across the stage.** It is world geometry mapped onto the stage. As the camera dives it passes
over the enemies, which are then in the water; they rise out by S4, and as you breach it sweeps back down past them.

**S6. They push apart, and making room comes first.** Under the water you count as a neighbour 4 m wide. No flocking.

**S7. Spawns are fixed on the stage**, anywhere in view at least 14 m from you, at least 10 m above the water when that
is in view, behind a marker that stays where it is on the screen.

## 3b. Results (sandbox, 6 seeds, waves 4 and 12, all on-screen measures; 2026-11-07)

| | HEAD 6f0c08c | world-space rewrite | stage |
|---|---|---|---|
| Off screen while you swim | 1–38% | 4–60% | 0.3–7.6% |
| Off screen while you fly | 1–14% | 4–16% | 0.1–4% |
| Screen flicks per enemy-minute | 5–29 | 6–27 | 0–0.7 |
| Rapid on-screen sideways swings per minute | up to 60 | up to 76 | up to 7.6 |
| Copying you on the screen (slope) | −0.35–0.03 | −0.90–−0.30 | 0–0.10 |
| Overlapping | 13–55% | 4–31% | 0.5–6.5% |
| Clark-Evans R (on-screen spread) | 0.35–0.76 | 0.44–0.81 | 0.59–0.90 |
| Longest on the water line | 3.3 s | 0.9 s | 2.1 s |
| Touching you under the water (share of enemy time while you swim) | up to 0.02% | up to 0.18% | up to 0.98% |

The gate still fails on touching (limit 0.05%; harmless, contact under the water does nothing), one hops reading of R
(0.62 against 0.65) and one 2.1 s stay on the water line (limit 2 s). Not judged yet: how the stage feels, and whether
enemies need grounding (lean, wakes), which only play can show.

## 4. Questions for the designer (answered 2026-11-04: Q1 not left behind, Q2 keep a few metres off, Q3 turrets stay in the air; 2026-11-06: above the water too, they keep up at your speed)

- **Q1. Should enemies be left behind when you outrun them?** In Brotato they are slower than you, so running away
  works. In a long one-way swim this leaves about half of them off screen. The only ways to keep them on screen are
  to make them as fast as you, or to bring them back unseen. Choose one:
  - (a) left behind, as in Brotato (my recommendation);
  - (b) as fast as you under the water;
  - (c) off-screen enemies return unseen.
- **Q2. Under the water, do they touch you?** At the moment contact under the water does nothing. Under R3, chasers
  will reach you. Choose one:
  - (a) they pass through harmlessly;
  - (b) they keep a stand-off of a few metres (the earlier "get out of your way" request);
  - (c) contact damage.
- **Q3. Do all roles follow you under the water?** For example, does a turret keep its range above the water and
  shoot down, or dive in too?

## 5. What the stage replaced

`source/enemies.js` took over the enemy step in flight (v3's steering block in `ME`, through `build.cjs`) and in the
water (v3's pursuer step `Orpq0`). Removed: flocking, `recall`, `holdAbove`, `hover`, `avoidWet`, the speed caps,
`movement.js`, the settings hold, hover, holdlevel and wetavoid, and `qa/holdloop.cjs`, `qa/waterspread.cjs` and
`qa/wateravoid.cjs`. Settings › Pursuit › In the water no longer has any effect. The earlier world-space rewrite is kept
for comparison in `qa/compare/` (not in git).

## 6. Checks

`node qa/enemy-sandbox.cjs --gate` measures the goals on the screen: off screen (G1), rapid swings, copying and screen
flicks and jumps (G3, G4), the longest stay on the water line (G5), R and overlap (G6), touching (G7). Thresholds come
from the goals; the rules are not tuned to fit them.

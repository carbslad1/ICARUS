# Trick lab: design goal and how tricks are proven

Written 2026-10-30 with the designer. Read this before changing a trick.

## The design goal

ICARUS is a gun-and-stat roguelite with an unusual core movement: carve a launch, fight in the air, return to the water.

- **The guns do the work in the air.** Tricks are effects that place enemies for the guns; only water tricks damage.
- **A trick is a build archetype, not a chore.** Owning one should make a style of jumping attractive. It should never be the only way to play.
- **Every trick has a home jump style and is still viable in the others.** Home: clearly better. Elsewhere: not worse than having no trick.
- **Feel first, then numbers.** A trick earns a place only when it feels good to play *and* its numbers meet the criteria below.
- **One trick at a time.** Prove one archetype is fun before adding the next. Expand the pool only from proven tricks.
- **Mines stay off** (designer, 2026-10-30).

## Jump styles

Measured on the launch (exit) angle above the horizontal.

| Style | Launch angle | Character |
|---|---|---|
| Low hop | 20–35° | Short, quick, near the water; more flights |
| Mid arc | 45–65° | The flexible default |
| High launch | 70–85° | Long air time, long ascent and descent |

## Criteria for a proven trick

Measured with `node qa/jumpstyle.cjs <trick>`. The harness forces an exact launch angle for each style. The bot flies the air phase, and the dolphin cannot die. It compares gun damage per second of air time with the trick against the same runs without it. **All thresholds are [TUNE].**

| Criterion | Threshold |
|---|---|
| Home style gain | **+20% or more** gun damage per air-second |
| Other styles | **0% or more**: never worse than no trick |
| Home is clearly home | home gain is at least **10 points** above the best other style |
| Safety | hits taken per flight no more than 10% above no trick, in every style |

And in the Trick Lab: the designer plays it and says it is fun, and can tell when it is working.

## The pool

| Trick | Status | Home style (intended) | Pairs with |
|---|---|---|---|
| Eddy | **Proven by the numbers; feel test pending** | Low hop | Close guns |
| Gravity anchor | Shortlist | to be found | Blast guns |
| Riptide | Shortlist | Low hop | drowning |
| Snare buoys | Shortlist | to be found | every gun (world layer) |
| Bubble net, Slipstream, Chum line, Bow wave, Frost wake, Breach wave, Belly flop, Undertow, Spout | Parked | — | Lab and loadout only |

Normal play offers only the shortlist (setting "Trick pool"). Parked tricks stay selectable in the Trick Lab and the playtest loadout.

## Process for each trick

1. **Lab:** play it with the Trick Lab. Adjust its sliders until it feels good; note the values.
2. **Numbers:** run the harness. Adjust until it meets the criteria.
3. **Repeat** until both agree. Then record the settled values here and mark it proven.

## Log

- 2026-10-30: lab, harness and shortlist built; Eddy first.
- 2026-10-30, Eddy (Fin + Sonic T1, wave 5, 16 seeds × 10 flights per style). Reach 14 m (the old default): low +19.9%, mid +5.7%, high +3.7%: just short of the home threshold. **Reach 18 m (now the default): low +43%, mid +15%, high +8%; hits per flight 0.49 → 0.52 on low hops, fewer elsewhere: proven by the numbers.** Reach 20 m: similar gains but +18% hits on low hops (fails safety). A slower spin (5 m/s) and a 5.5 m ring did not help. Noise: the same setting moved by up to 10 points between 6-seed and 16-seed runs, so use at least 16 seeds × 10 flights before deciding. **Next: the designer's feel test in the Trick Lab.**

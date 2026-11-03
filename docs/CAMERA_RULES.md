# Camera rules: the breach, the entry and the view

Written 2026-11-03 with the designer. These are the rules the camera, the breach and the entry must keep. They come first; features that break one are removed or changed, not traded against it. Checked by `node qa/camera-rules.cjs` (every rule, every scenario; it exits non-zero on any failure).

All the camera, breach and entry code lives in one module, `source/camera.js`. Other modules read it (`Camera.*`) and do not patch the camera themselves.

## The rules

Measured on screen as the renderer draws it (1440 × 810, 60 frames a second, two simulation steps a frame), in every scenario below.

| # | Rule | Limit |
|---|---|---|
| R1 | **The camera is smooth.** No frame changes the picture's scroll speed by more than the limit (the camera's screen acceleration, any frame, including breaches and entries). | 1.5 px/frame² |
| R2 | **The camera rides the arena in the air.** From 0.15 s after a breach until the entry lead starts (falling, the camera sheds part of its fall before the splash: `Camera.leading`), the camera moves with the arena (no speeding up, no catching up). | within 2 m/s of the arena |
| R3 | **The dolphin does not change size visibly.** Its drawn size stays within the limit of its size in the air, always. | ±3% |
| R4 | **Enemies do not jump on screen.** No enemy's on-screen speed changes by more than the limit in a frame, unless it is being hit, knocked back, charging, has just spawned or is dodging the dolphin under the water (within 6 m of it or of where it will be in 0.3 s, as the speed limit in `source/space.js` marks it: `p.dodgeT`). Dodging, it may change speed 3× as fast as otherwise (setting "Enemies dodging you"); unlimited, a dodge at 100 m/s shot one out of the water at 99 m/s in a frame. | 4 px/frame² |
| R5 | **No teleports.** No enemy's on-screen movement changes by more than the limit from one frame to the next, even while it is being hit, knocked back or charging. | 30 px/frame² |
| R6 | **You can see the sky under water.** While swimming, the waterline and at least 8 m of air above it are on screen, so you can read where to breach. | 99% of water time |
| R7 | **You can see the dolphin.** It stays at least 4% inside the screen's edges. | 100% of the time |

## The scenarios

Driven by a human-like pilot (`qa/pilot.cjs`): it reacts to what it saw 0.18 s ago, steers by tapping and holding the turn keys, and holds keys through breaches as a player choosing a trick does.

| Scenario | What it does | Waves (speed) |
|---|---|---|
| Hops, low speed | Mid and low launches | 1 (30 m/s) |
| Hops, high speed | Mid and low launches | 15 (100 m/s), 20 (125 m/s) |
| Skims (re-entries) | Flat launches, short flights and swims, back to back | 4, 15 |
| Loops | Holds D under water for 6 s (clockwise loops, no breach) | 1, 10, 20 |
| Deep dives | Dives to 70 m, then climbs out | 1, 15 |
| Turnarounds | Reverses direction under water every swim | 4, 15 |
| Trick holds | Holds S or D through the breach and on into the air | 4, 15 |

## What the rules rule out

These were tried and broke a rule, or compete with the camera above:

- Zoom with speed in the air, squash and stretch (R3), look-ahead under water (R1: it drifted the camera), steady-camera framing (R2/R4), hit-stop or slow motion (the designer's standing rule).

## Results (2026-11-03, `node qa/camera-rules.cjs`, 2 seeds per plan, 30 s per run)

| Scenario | m/s | R1 ≤1.5 | R2 ≤2 | R3 ≤3% | R4 ≤4 | R5 ≤30 | R6 ≥99% | R7 100% | |
|---|---|---|---|---|---|---|---|---|---|
| Hops, low speed | 30 | 0.67 | 0.7 | 0% | 3.3 | 8 | 100% | 100% | PASS |
| Hops, high speed | 100 | 3.21 | 2.4 | 0% | 9.2 | 11 | 100% | 99.9% | fail |
| Hops, top speed | 125 | 3.79 | 2.9 | 0% | 6.6 | 12 | 99.8% | 99.4% | fail |
| Skims | 45 | 0.91 | 0.4 | 0% | 3.0 | 6 | 100% | 100% | PASS |
| Skims, fast | 100 | 1.79 | 1.0 | 0% | 5.5 | 13 | 100% | 100% | fail |
| Loops | 30 | 0.53 | – | 0% | 0 | 0 | 100% | 100% | PASS |
| Loops, fast | 75 | 1.34 | – | 0% | 0 | 0 | 100% | 100% | PASS |
| Loops, top speed | 125 | 2.28 | – | 0% | 0 | 0 | 100% | 99.0% | fail |
| Deep dives | 30 | 0.59 | 0.7 | 0% | 3.1 | 3 | 100% | 100% | PASS |
| Deep dives, fast | 100 | 3.09 | 2.2 | 0% | 8.8 | 11 | 100% | 99.6% | fail |
| Turnarounds | 45 | 0.77 | 1.1 | 0% | 3.6 | 9 | 100% | 100% | PASS |
| Turnarounds, fast | 100 | 2.89 | 1.5 | 0% | 5.8 | 11 | 100% | 100% | fail |
| Trick holds | 45 | 0.89 | 1.1 | 0% | 3.7 | 19 | 100% | 100% | PASS |
| Trick holds, fast | 100 | 3.21 | 2.4 | 0% | 8.0 | 14 | 100% | 99.8% | fail |

Every scenario at 30-75 m/s keeps every rule; every one at 100-125 m/s breaks some. R3 (size) and R5 (teleports) hold everywhere, and R6 (sky) everywhere but 99.8% at top speed.

What is left, and why:

- **R1 and R7 at 100+ m/s are one trade-off.** At the splash the camera must stop falling with the arena (80-100 m/s) and the view must grow as fast as the dolphin dives (a 100 m/s dive needs the view's height to grow about 100 m/s to keep 30 m of sky and the dolphin). Within R1's 1.5 px/frame² the camera cannot do both in time: shedding more of the fall before the splash ("Entry camera", 0.4) keeps the sky but loses the dolphin off the bottom for a few frames (R7 99.4-99.9%); shedding none kept the dolphin but lost the sky for over a second (R6 87.7%). Growing the view faster jolted every enemy on screen (the zoom moves them: R4 42-62).
- **R4 at 100+ m/s:** enemies change hands at the crossings. At the splash an arena enemy below the line becomes a waiting enemy still carrying the arena's fall (60 m/s), braked at 500 m/s² (5-12 px/frame² against the camera's own change); at the breach a waiting enemy becomes an arena chaser and takes up the chaser's own steering.
- **R2 at 100+ m/s (2.2-2.9 m/s):** the breach's blend lasts past 0.15 s at that speed.
- **`qa/holdloop.cjs` wave 15** (100 m/s): 10% of the waiting enemies are at the waterline in the first seconds after a straight dive: the ones that came in with the arena's fall sink about 4 m under before they climb back.

Tried and rejected on these numbers: a dive look-ahead for the view's height (R1, R6 and R7 all worse), growing the view without its acceleration cap near the bottom (R4/R5 at 40-95), unlimited dodges under the water (R5 66-109: a dodge shot an enemy out of the water at 99 m/s).

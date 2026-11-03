# Camera rules: the breach, the entry and the view

Written 2026-11-03 with the designer, rewritten the same day. These are the rules the camera, the breach and the entry must keep. Checked by `node qa/camera-rules.cjs` (every rule, every scenario; it exits non-zero on any failure; `--tune=cam:0` scores v3's camera).

All the camera code lives in one module, `source/camera.js`. Other modules read it (`Camera.moved`, `Camera.H`) and do not patch the camera themselves.

## The camera

It is v3's camera (designer: the first rebuild, made for a smooth picture, "feels mushy and does not feel smooth and speedy"; measured, it left the dolphin 37-65% of the half-view off the centre after breaches and entries, where v3 keeps it within 2-6%):

- One spring (v3's 0.28 s, `lr.follow`) onto a target that moves at its own speed, so a breach or a splash needs no blend or ease. In the air the target is the arena's centre (across, it scrolls once the dolphin is past the dead zone); under the water it is the dolphin.
- The spring's time shortens above 45 m/s, so the camera trails by no more than it does at 45 (at 100 m/s it trailed 28 m and lost the sky and, in fast loops, the dolphin).
- v3's speed cap is on the dolphin's speed (on its target's, a target held at the sky line stopped the camera from 44 m/s in a frame).
- One change from v3: under the water the view widens with depth, just enough that the waterline and 20 m of air (setting "Water view: air kept in view", `airband`) stay on screen with the dolphin no lower than 0.64 of the half-view below the centre (v3's own limit), at most 3× the air view (`viewmax`), past which it follows the dolphin down. v3 lost the sky below about 30 m. 20 m rather than less: with 12 m the enemies waiting above the water were squeezed under the top of the view and surfaced slowly (`qa/wateravoid.cjs`).
- Sprites (the dolphin, enemies, shots, orbs, effects) are drawn at their air size at every zoom.
- Under the water an enemy's speed (its own swimming and its step out of your way) changes at most 1500 m/s² (`Space.WET_ACCEL`, `source/space.js`): v3 turned an enemy that dived in with you round in one step (96 m/s forward to 112 back) and shoved one beside you aside at your speed + 10 m/s at once. Above the water and in the air enemies are not capped.

Removed with the first rebuild: the climb before the breach, the slowing before the splash, the blends at every crossing, the arena placed on the camera at the breach, the 500 m/s² cap on every enemy off the arena.

## The rules

Measured on screen as the renderer draws it (1440 × 810, 60 frames a second, two simulation steps a frame), in every scenario below.

| # | Rule | Limit |
|---|---|---|
| R1 | **The camera keeps up.** Within 0.6 s of a breach or an entry, the camera trails its own framing (the arena in the air, the dolphin or the sky line under the water) by at most the limit, as a share of the half-view. | 40% |
| R2 | **No shake.** The dolphin's own speed on the screen changes by at most the limit a frame (a camera that lags, overshoots or snaps shows as the dolphin jumping about on the screen). | 3 px/frame² |
| R3 | **The dolphin does not change size visibly.** Its drawn size stays within the limit of its size in the air. | ±3% |
| R4 | **Enemies do not jump on screen.** No enemy's on-screen speed changes by more than the limit in a frame, whatever it is doing. | 30 px/frame² |
| R5 | **You can see the sky under water.** While swimming, the waterline and at least 8 m of air above it are on screen. | 99% of water time |
| R6 | **You can see the dolphin.** It stays at least 4% inside the screen's edges. | 100% of the time |

The table also shows the picture's scroll change (px/frame²) for reference. It is not a rule: a camera that keeps up moves as the dolphin moves.

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

Zoom with speed in the air, squash and stretch (R3); hit-stop or slow motion (the designer's standing rule); a camera that trades keeping up for a smooth picture (the first rebuild: it eased into every breach and entry and left the dolphin behind).

## Results (2026-11-03, `node qa/camera-rules.cjs`, 2 seeds per plan, 30 s per run)

| Scenario | m/s | R1 ≤40% | R2 ≤3 | R3 ≤3% | R4 ≤30 | R5 ≥99% | R6 100% | scroll change | |
|---|---|---|---|---|---|---|---|---|---|
| Hops, low speed | 30 | 11% | 0.9 | 0% | 16 | 100% | 100% | 0.4 | PASS |
| Hops, high speed | 100 | 17% | 3.7 | 0% | 30 | 100% | 100% | 2.7 | fail |
| Hops, top speed | 125 | 18% | 5.1 | 0% | 28 | 100% | 100% | 3.9 | fail |
| Skims | 45 | 12% | 1.1 | 0% | 11 | 100% | 100% | 0.5 | PASS |
| Skims, fast | 100 | 13% | 2.5 | 0% | 22 | 100% | 100% | 1.5 | PASS |
| Loops | 30 | 0% | 0.5 | 0% | 0 | 100% | 100% | 0.5 | PASS |
| Loops, fast | 75 | 0% | 0.8 | 0% | 0 | 100% | 100% | 1.4 | PASS |
| Loops, top speed | 125 | 0% | 1.3 | 0% | 0 | 100% | 100% | 2.3 | PASS |
| Deep dives | 30 | 11% | 0.9 | 0% | 10 | 100% | 100% | 0.4 | PASS |
| Deep dives, fast | 100 | 17% | 3.5 | 0% | 23 | 86.7% | 100% | 2.4 | fail |
| Turnarounds | 45 | 13% | 1.2 | 0% | 16 | 100% | 100% | 0.8 | PASS |
| Turnarounds, fast | 100 | 17% | 3.5 | 0% | 20 | 100% | 100% | 2.3 | fail |
| Trick holds | 45 | 13% | 1.2 | 0% | 16 | 100% | 100% | 0.6 | PASS |
| Trick holds, fast | 100 | 17% | 3.7 | 0% | 32 | 100% | 100% | 2.7 | fail |

v3's camera on the same rules (`--tune=cam:0`): it keeps up the same at 30 m/s (9%) but trails by 55-64% at 100 m/s, shakes 2.8-39 px/frame², shows the sky 20-84% of the time under water, and its enemies jump 26-80.

Still open, at 100-125 m/s: shake 3.5-5.1 (the dolphin's own speed changes on the screen through hops and dives at that speed), two enemy jumps of 30-32 px/frame², and the sky on screen 86.7% of the time in 70 m dives at 100 m/s (the view is at its widest, 3× the air view, so the camera follows the dolphin down).

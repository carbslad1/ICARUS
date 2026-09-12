# ICARUS

A dolphin momentum game with an arena carried through the sky by each breach.
Phase 2 is the playable flight-frame trial. The arena is deliberately empty for
the next human playtest; combat, rewards, audio, and the final visual pipeline
come in subsequent phases.

[Play ICARUS](https://carbslad1.github.io/ICARUS/).

## Controls

- Water: A/D curve the carried momentum; W thrusts. Arrow keys also work.
- Air: WASD or arrows move freely inside the arena. Shift dashes; Space commits
  to a dive. Touch screens have directional, dash, and dive controls.
- Return: A/D align the dolphin with the incoming-velocity line during the
  0.3-second entry window. Natural flight expiry adds 60% orientation assistance.
- Escape pauses. The top-right buttons open movement settings, restart, or pause.

The camera follows the ballistic arena origin in flight. Local movement and
dash never steer or accelerate that origin. Projected apex sets the arena tier;
the time bar shows remaining flight time. Two dash charges replenish after an
actual water entry, never from a surface skip.

Early commitment banks the frame's current speed. A quick return animation
brings the sprite to the surface without adding fall energy, so an early escape
costs momentum even with perfect alignment. An upward frame vector is mirrored
downward. This is a provisional interpretation of the design's ambiguous early
re-entry rule, exposed for this playtest.

## Movement Settings

The user's selected defaults are water resistance 0.001, thrust speed limit 37,
flow response 14, steering angle 0.24, and turn resistance 0.02. The remaining
13 settings retain their selected values. Thrust adds speed only below its limit;
it never removes speed earned from an entry.

The gear opens 18 live sliders with exact number inputs, device persistence,
reset, and versioned JSON export. The panel docks beside the game or below it
on phones. Edits take effect on the next fixed step without resetting the run.
Previously saved settings remain intact; Reset defaults selects this new baseline.
Air rotation controls entry alignment; free flight movement has its own direct
response. Clipboard denial leaves selectable JSON available.

## Run And Verify

Node 22 LTS is used (minimum 20.19).

```sh
npm ci
npx playwright install chromium
npm run dev
npm run verify
```

Verification runs strict TypeScript, architecture lint, simulation/static tests,
Chromium tests, and Playwright against the production build, with a 120-second
budget. Individual projects: `test:sim`, `test:web`, `test:e2e`. Longer benchmarks
use `npm run bench`. No dependencies were added for Phase 2.

Latest local result: all checks passed in 92.98 seconds, including 188 simulation/
static tests, 14 browser tests, and 30 Playwright checks. Human flight feedback is
still required before the next phase.

The browser hook is available in development or with `?test=1`. Test mode starts
paused; `stepFrames(n)` pumps exact fixed steps without animation callbacks.
Paused worlds redraw only on an explicit change or resize.

## Architecture And Replay

The simulation is deterministic and renderer-free. World coordinates are Y-up,
SI units are branded, and the timestep is always 1/120 second. Breach dilation
changes fixed-step scheduling; input still samples at display rate. The arena
owns one ballistic origin; its player owns one local position. The water body
is removed at breach and recreated from `toWorld` at commitment.

The normal page uses the flight cycle. `?scene=water` preserves the original
ballistic trial, and `?test=1&scene=empty` preserves the empty Phase 0 fixture.
Version 1 traces select the empty world; version 2 selects `water` or `flight`
and supports initial/per-step tuning profiles. Explicit replay ignores saved
browser settings. The recorder and headless harness support all scenarios.

The Phase 0 goldens and the Phase 1 water CSV are byte-identical to the previous
build. The water trace now pins its historical movement profile explicitly.
No golden CSV was regenerated for the new defaults. The earlier half-second
turn test retains its original profile; the terminal-speed check runs longer
for lower resistance while preserving its tolerance. New checks exercise the
selected defaults and the complete flight cycle.

Phase 2 checks cover ballistic apex/airtime, tier boundaries, local movement,
edge bounds, dash distance/charges, position transfer, early versus full-flight
entry, forced assist, breach timeout/cooldown, 30/60/120 Hz scheduling, shallow
hops, surface skips, and exact cross-runtime cycle replay. Playwright exercises
keyboard/touch controls, phone/desktop layouts, persistent tuning, and canvas
visibility. Screenshots and timing evidence are written under `test-results/`
and `artifacts/`.

## Build Sequence

The user approved moving beyond water after supplying the movement profile.
The next human gate is the flight contrast: play several cycles, move around
inside the arena, and describe how it differs from underwater movement.
Enemies are Phase 3, combat Phase 4, rewards Phase 5, depth Phase 6, and final
visuals/audio Phase 7. Advance one phase per session.

GitHub Actions verifies every main-branch build before deploying the exact tested
artifact to Pages. Read `ICARUS_DESIGN.md` for the full design and `AGENTS.md`
for operational rules and the current gate.

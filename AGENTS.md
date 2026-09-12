# ICARUS working instructions

## Run and verify

- Node 22 LTS; install with `npm ci` and `npx playwright install chromium`.
- `npm run dev`: local Vite server. `npm run build`: static output in `dist/`.
- `npm run verify` is the only definition of done; all checks must pass in <120 s.
- Individual checks: `typecheck`, `lint`, `test:sim`, `test:web`, `test:e2e`.
- `npm run bench`: longer benchmarks, outside verify.
- `npm run record:empty -- <new-directory>` and `npm run replay -- <trace> <new.csv>`.
- `npm run record:water -- <new-directory>` records the Phase 1 launch/entry trace.
- Never weaken harness rules, skip tests, loosen tolerances, or silently replace goldens.
- Do not add dependencies without asking. The user approved `@types/node` in Phase 0.

## Invariants

- Y-up; origin at the surface; SI units and radians, all branded.
- `sim/` is renderer-free, deterministic, and runnable in pure Node.
- One arena origin, one `toWorld` transform in `sim/units.ts`.
- No entity holds two positions. Air entities store only arena-local positions.
- Phase 1's temporary ballistic water body remains world-space in both media;
  it is not an air-arena entity. Phase 2 must introduce the specified frame model.
- Branded constructors/conversions live only in `sim/units.ts`; no external casts.
- Fixed 1/120 s timestep. Dilation changes step count, never dt.
- One seeded RNG on the world; no wall-clock or `Math.random` in simulation.
- Tunables live in the deeply frozen constants object; colours in `palette.ts`.
- Input drivers produce PlayerIntent upstream; no platform/debug/headless gameplay branches.

## Update order (§14.4, verbatim)

```
 1. Sample input → PlayerIntent
 2. Resolve dilation factor (breach window state machine)

 — WATER ONLY —
 3. Water: intent → thrust + steering forces
 4. Water: integrate (semi-implicit Euler)
 5. Water: solve surface crossing → BREACH (up) or ENTRY (down)

 — AIR ONLY —
 6. Frame: integrate ballistic arc
 7. Arena: origin := frame.position; check arc termination
 8. Player: intent → local velocity, clamp to bounds
 9. Enemies: spawn (arena-local)
10. Enemies: behaviours → accelerations → integrate
11. Projectiles: integrate
12. Spatial grid rebuild
13. Collisions: projectile↔enemy, enemy↔player, pickup↔player
14. Deaths, drops, XP, level-ups
15. Commitment check → RE-ENTRY if voluntary or forced

 — BOTH —
16. Camera
17. Telemetry frame (if recording)
```

Steps 3–5 and 6–15 are mutually exclusive. Do not reorder or insert steps.

## Current phase

Phase 1 (Water) implemented on 2026-09-12 after the user approved proceeding.
The first human playtest FAILED: the user reported sluggish movement, slow turning,
excessive sinking/depth, and wanted slightly faster speed growth from good entries.
Retune 1 addresses that feedback; its human re-test is PENDING. Phase 1 is not complete.
Mechanical gate passed: `npm run verify` completed 133 Node/static + 10 browser +
12 Playwright tests in 25.36 s after the retune.
Do not begin Phase 2 without the user's five-minute playtest approval.

Retune 1: turn rate 4.8 rad/s, velocity redirect 1.25/s, thrust 32 m/s2, water
gravity -1.2 m/s2, starting depth -4 m and vertical speed -2 m/s. Perfect entries
add 2.25 m/s plus 0.4 per prior perfect, capped at 5.5; clean entries add 1 m/s
after their unchanged retention. Only perfect entries build the streak. No changes
to drag, turn cost, thrust speed ceiling, air gravity, or grading thresholds.
The recovery test improved from 24.15 m / 2.767 s to 13.601 m / 1.500 s. Six new
feel regression tests cover the requested behavior. Existing assertions stay intact.

A/D rotate, W thrusts; in air only heading changes, not the arc. Arrow alternatives,
touch hold controls, restart, and Escape/pause are available. The renderer is just
a dolphin silhouette, one surface line, camera, and readouts, as Phase 1 requires.

Exact cross-runtime replay uses fixed numeric series in `sim/math.ts`; do not
replace them with native transcendental functions without preserving the tests.
The new water golden is version 2 with scenario `water`. The original version 1
empty trace and CSV remain byte-identical; `?test=1&scene=empty` selects that fixture.
Normal development runs automatically; `?test=1` starts manual stepping paused.
Thrust only adds remaining speed headroom, never clamps earned momentum. See
README for the reviewed water-golden retune and current tuning values.

Phase 0's 1000-step record/replay gate remains green alongside all water checks.

Published at https://carbslad1.github.io/ICARUS/ from the verified `main` build.
Playwright verified Phase 1's first live build on desktop/mobile with exact water
replay, production hook isolation, and real-time controls. The user explicitly approved publishing
the source code and design document in the public carbslad1/ICARUS repository.

Stop at the Phase 1 human gate. Ask the user to dive and breach for five minutes;
do not self-assess enjoyment. Retune water if it does not feel good. Update this
section every session, including the user's actual verdict when available.

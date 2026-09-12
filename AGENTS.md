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
- Tuning defaults and allowed ranges live in the deeply frozen constants object;
  live overrides are validated, immutable per-world profiles. Never mutate global defaults.
  Colours live in `palette.ts`.
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
Retune 1 also FAILED its human playtest: yo-yo movement, free nose spinning,
excessive velocity loss, and unnatural momentum. The user explicitly approved
replacing the original hard-turn speed punishment with fluid momentum preservation.
Flow steering is now implemented; its human re-test is PENDING. Phase 1 is not complete.
The user requested live movement sliders to find preferred values themselves.
There are now 18 controls across Water, Steering, Air, and Entries, with numeric
inputs, local persistence, reset defaults, and a complete copyable settings profile.
The panel docks beside the game or below it on phones. Changes latch at the next
fixed step without restarting; restarting retains settings. Air rotation is now
independently adjustable but defaults to the unchanged 4.8 rad/s.
Mechanical gate passed: `npm run verify` completed 156 Node/static + 13 browser +
24 Playwright tests in 105.24 s. Do not restore the obsolete speed-loss requirement.
Do not begin Phase 2 without the user's five-minute playtest approval.

Current water steering: the commanded nose lead is bounded to 0.45 rad relative
to the flow, with a 4.8 rad/s body slew limit and 12/s velocity response. Neutral
steering aligns the nose to velocity. Below 1 m/s, the body can orient to start.
Quadratic drag is 0.003/m and residual turn resistance is 0.01/rad. There is no
steering-dependent throttle penalty. Thrust, gravity, entry rewards, grading,
start state, and air controls are unchanged from Retune 1.

The user-approved design change is recorded in ICARUS_DESIGN sections 5, 15, and
17. The two old mandatory-braking assertions were replaced by same-angle radius
and momentum checks. Four new simulation cases verify coasting, sustained flow,
and release; Playwright verifies real keyboard steering on desktop and mobile.
All other invariants, replay equality, thresholds, tolerances, and time budgets
remain intact. Do not interpret this specific approval as permission to weaken
other tests. Water input traces and both Phase 0 goldens are unchanged; only the
reviewed water CSV changed for the new physics. See README for measurements.

A/D steer the flow underwater and rotate in air; W thrusts underwater. Arrow alternatives,
touch hold controls, restart, and Escape/pause are available. The renderer is just
a dolphin silhouette, one surface line, camera, and readouts, as Phase 1 requires.

Exact cross-runtime replay uses fixed numeric series in `sim/math.ts`; do not
replace them with native transcendental functions without preserving the tests.
The new water golden is version 2 with scenario `water`. The original version 1
empty trace and CSV remain byte-identical; `?test=1&scene=empty` selects that fixture.
Version 2 also accepts optional initial `tuning` and per-entry `tuning` profiles.
Explicit replay ignores saved browser settings. Non-default snapshots include
their immutable profile; default snapshots keep the original shape. All four
golden fixtures remain byte-identical in the live-tuning change.
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

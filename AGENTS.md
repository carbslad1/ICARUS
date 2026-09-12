# ICARUS working instructions

## Run and verify

- Node 22 LTS; install with `npm ci` and `npx playwright install chromium`.
- `npm run dev`: local Vite server. `npm run build`: static output in `dist/`.
- `npm run verify` is the only definition of done; all checks must pass in <120 s.
- Individual checks: `typecheck`, `lint`, `test:sim`, `test:web`, `test:e2e`.
- `npm run bench`: longer benchmarks, outside verify.
- `npm run record:empty -- <new-directory>` and `npm run replay -- <trace> <new.csv>`.
- Never weaken harness rules, skip tests, loosen tolerances, or silently replace goldens.
- Do not add dependencies without asking. The user approved `@types/node` in Phase 0.

## Invariants

- Y-up; origin at the surface; SI units and radians, all branded.
- `sim/` is renderer-free, deterministic, and runnable in pure Node.
- One arena origin, one `toWorld` transform in `sim/units.ts`.
- No entity holds two positions. Air entities store only arena-local positions.
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

Phase 0 (Scaffold) complete on 2026-09-12. Gate: record 1000 stationary-world steps,
replay, and compare both CSVs byte-identical to the deliberately created golden.
`npm run verify`: 73 Node/static + 8 browser + 6 Playwright tests passed locally in
11.87 s and on GitHub in 19.21 s. No gameplay exists.

Published at https://carbslad1.github.io/ICARUS/ from the verified `main` build.
Playwright verified the live site's exact 1000-step replay, production hook
isolation, and absence of page errors. The user explicitly approved publishing
the source code and design document in the public carbslad1/ICARUS repository.

Stop after Phase 0. The next session may begin Phase 1 (Water), whose gate requires
both the water simulation tests (especially hard-turn versus gentle-turn) and a
human enjoying five minutes of diving. Write those tests alongside the physics;
do not self-assess the human gate. Update this section every session.

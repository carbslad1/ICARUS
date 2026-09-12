# ICARUS working instructions

## Run and verify

- Node 22 LTS; install with `npm ci` and `npx playwright install chromium`.
- `npm run dev`: local Vite server. `npm run build`: static output in `dist/`.
- `npm run verify` is the only definition of done; all checks must pass in <120 s.
- Individual checks: `typecheck`, `lint`, `test:sim`, `test:web`, `test:e2e`.
- `npm run bench`: longer benchmarks, outside verify.
- Never weaken harness rules, skip tests, loosen tolerances, or silently replace goldens.
- Do not add dependencies without asking. The user approved `@types/node` in Phase 0.

## Invariants

- Y-up; origin at the surface; SI units and radians, all branded.
- `sim/` is renderer-free, deterministic, and runnable in pure Node.
- One arena origin, one `toWorld` transform in `sim/units.ts`.
- Air players store only local positions. The world-space water body is removed
  on launch and reconstructed from the sprite position at commitment.
- The arena owns the ballistic origin; its flight state owns velocity. No duplicate
  frame position. The camera follows this origin, not local player movement.
- Fixed 1/120 s timestep. Dilation changes step count, never dt. The driver samples
  input every display frame and resolves changing dilation at each fixed-step boundary.
- One seeded RNG on the world; no wall-clock or `Math.random` in simulation.
- All tunables and allowed ranges live in the deeply frozen constants object;
  live overrides are validated, immutable per-world profiles. Colours live in `palette.ts`.
- Branded constructors/conversions live only in `sim/units.ts`; no external casts.
- No platform/debug/headless branches in gameplay. Scenario factories are upstream.
- Fixed numeric series in `sim/math.ts` preserve byte-identical browser/Node replay.

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

Phase 2 (The frame), implemented 2026-09-12. Mechanical verification PASSED:
188 simulation/static, 14 browser, and 30 Playwright checks in 92.98 seconds.
The Phase 2 human playtest is PENDING; this phase is not yet fully signed off.
The user supplied their preferred movement JSON and explicitly asked to proceed
with the rest of the game. This is authorization to leave the Phase 1 human gate.
Their defaults are now: water drag 0.001, thrust ceiling 37, flow response 14,
steering angle 0.24, turn resistance 0.02; the other 13 settings are unchanged.
Do not restore the obsolete mandatory hard-turn speed punishment.

The playable default now uses `createFlightWorld`: breach dilation, an empty
arena, direct air movement, two dash charges, voluntary/forced return, and entry
grading. `?scene=water` retains the Phase 1 ballistic trial for regression tests;
`?test=1&scene=empty` retains Phase 0. All share water physics and the fixed-step
driver. Version 2 traces now also accept scenario `flight`.

Provisional design call: early commitment banks current frame speed, mirrors
an upward Y component downward, and transfers the actual sprite world position
to a 0.3 s return animation. The animation moves to the surface without adding
fall energy; A/D controls alignment. Forced return applies the specified 60%
orientation assist. This resolves the specification's ambiguity about early
commitment above the water. The user was offered quick return or natural fall;
quick return is the stated assumption pending playtest feedback.

The existing water CSV is unchanged. Its trace now explicitly pins the earlier
five movement settings so changed defaults cannot rewrite historical evidence.
The old half-second steering check explicitly uses its earlier profile; terminal
velocity gets more settling time for lower drag, with the same tolerance.
The belly-flop check starts facing left so positive steering follows the flow;
its lockout and post-release rotation assertions remain intact.

Next gate: publish Phase 2, then ask the player to describe how the air movement
feels compared with underwater movement. Do not add enemies before that human
gate. Advance one phase per session, as requested in the kickoff prompt.

Published at https://carbslad1.github.io/ICARUS/ via the verified main build.
The user authorized publishing source and design in public carbslad1/ICARUS.

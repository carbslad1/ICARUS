# ICARUS

Phase 1: a playable water trial with momentum, steering, breaches, ballistic falls,
graded re-entry, perfect-entry streaks, and surface skips. No arena, combat, audio,
or final visual pipeline yet. Two human playtests rejected slow, then unnatural
movement. This version replaces free underwater rotation with flow-aligned
steering under the user's explicitly revised momentum-preservation rule.

Play at https://carbslad1.github.io/ICARUS/.

## Controls

A/D curve the underwater trajectory counterclockwise/clockwise; W thrusts. Release
steering to glide along the carried velocity. Arrow keys also work. In the air,
rotation aims the next entry but does not steer the ballistic trajectory. Point the
nose along the incoming velocity for a perfect entry. The faint line shows velocity.
Escape pauses; the top-right buttons pause or restart. Narrow/touch screens have
hold controls. Begin with W and a short hold of A to turn the initial dive upward.

## Run

Use Node 22 LTS (minimum supported Node: 20.19).

```sh
npm ci
npx playwright install chromium
npm run dev
npm run verify
```

`verify` runs strict TypeScript checking, architecture lint, Node simulation/static
tests, Vitest in Chromium, and Playwright against the production build at desktop
and mobile sizes. A post-verification check enforces the 120-second budget.
`npm run test:sim`, `npm run test:web`, and `npm run test:e2e` run each test project.
`npm run bench` keeps longer performance work outside the fast verification path.

The allowed toolchain uses Vitest 3.2.7 so its Playwright provider remains inside
`@vitest/browser`, without requiring an additional browser-provider dependency.
`@types/node` is the single additional dev dependency, explicitly approved by the
user because the Node test tools require it. The lockfile pins all resolved versions.
Test workers are bounded to avoid CPU oversubscription. Playwright uses SwiftShader
for a repeatable WebGL environment independent of other applications' GPU load;
all architecture checks, numeric tolerances, timeouts, and the 120-second gate remain
intact. The user-approved replacement of the old turn-punishment rule is documented below.

## Deterministic harness

The hook at `window.__icarus` is registered in development or with `?test=1`.
Reset and trace loading pause automatic simulation. `stepFrames(n)` runs exactly
n fixed steps synchronously, even while paused, without calling animation APIs.
`setPaused(false)` resumes real-time advancement. Inputs are held until changed.
The regular page starts the water trial immediately. The explicit test fixture
`?test=1&scene=empty` retains Phase 0. Version 1 traces select the empty scenario;
version 2 traces declare `scenario: "water"`. Scenario selection happens upstream
of the simulation. Both use the same fixed-step driver.

The `sim/` code runs with no browser dependencies. The headless harness exposes
`reset`, `step`, and `snapshot`. Coordinates are Y-up, lengths are metres, and time
is seconds at a fixed 120 Hz. Branded constructors and the single arena-to-world
transform live in `src/sim/units.ts`.

```sh
npm run record:empty -- artifacts/new-recording
npm run replay -- artifacts/new-recording/empty.trace.json artifacts/replayed.csv
diff artifacts/new-recording/empty.csv artifacts/replayed.csv
npm run record:water -- artifacts/new-water-recording
npm run replay -- artifacts/new-water-recording/water.trace.json artifacts/water-replayed.csv
```

Output files must not already exist. Golden fixtures are checked in under
`tests/golden/`; verification never updates them. Gate evidence is written to
`artifacts/gate/`, screenshots to `test-results/`, and timing to
`artifacts/verify-result.json`.

## Water Gate And Tuning

Verified locally: 137 Node/static, 10 browser, and 14 Playwright tests, in 71.38 s.
Tight and wide turns have mean radii of 6.337/19.009 m at a 26 m/s start, with both
exiting around 26 m/s through the same 120-degree trajectory. At 60 m/s the radii
are 13.910/39.114 m, with exit speeds of 54.203/47.149 m/s. Ten complete
perfect-entry cycles increase flight apices at each of three initial launch speeds.
Tests also cover exact crossings, entry bands, skip thresholds, control lockout,
terminal velocity, 30/60/120 Hz equivalence, immutable snapshots, and browser/Node
state equality. The 600-step water golden includes a breach and perfect entry.

### Flow Steering (Current)

The user explicitly approved replacing mandatory hard-turn braking with fluid
momentum. The previous model let the nose spin independently while velocity lagged
far behind, then applied large speed losses to the correction. The first retune
sped up the nose without fixing that relationship.

Underwater steering now commands a bounded 0.45 rad lead from the current flow;
the body approaches it at up to 4.8 rad/s. Velocity curves toward the nose with a
12/s response. Releasing input aligns the nose with velocity instead of carrying
on rotating toward an independently aimed heading. Below 1 m/s the dolphin can
orient to start moving. This does not affect air rotation or ballistic flight.

Turn resistance is 0.01/rad rather than 0.35/rad, and quadratic water drag is
0.003/m rather than 0.012/m. Thrust is not reduced for steering. The stronger entry
rewards from Retune 1 remain, and ten complete perfect-entry cycles still compound.

| Unpowered quarter turn | Retune 1 | Flow steering |
| --- | --- | --- |
| Exit speed from 26 m/s | 11.657 m/s | 24.528 m/s |
| Exit speed from 60 m/s | 22.404 m/s | 54.757 m/s |
| Turn time from 26 m/s | 0.858 s | 0.408 s |
| Maximum body/flow separation from 26 m/s | 144.93 degrees | 20.57 degrees |

The same powered dive recovery now bottoms out at 8.086 m and breaches in 0.833 s.
These measurements are regression evidence, not a substitute for the human gate.
The original hard-turn speed comparison was replaced by same-angle curvature and
momentum assertions with explicit user approval. New tests require over 90% speed
retention in both unpowered quarter turns, bounded nose/flow separation, no reversal
during sustained turns, and stable coasting after release. No other test contracts,
numerical tolerances, or harness limits were relaxed.

The existing 600-step input trace was kept byte-identical. Its reviewed CSV now
breaches at step 87, enters perfectly at step 422, and reaches 17.542 m. The prior
CSV is retained in git history and `artifacts/water-before-flow-v3/`. Both original
empty-world fixtures are unchanged.

### Responsiveness Retune 1 (Historical)

User feedback: sluggish movement, slow turning, too much sinking, and good entries
should build speed a little faster. Changes from the first published water build:

| Setting | Before | Now |
| --- | --- | --- |
| Body turn rate | 2.8 rad/s | 4.8 rad/s |
| Velocity redirect rate | 0.55/s | 1.25/s |
| Thrust | 22 m/s2 | 32 m/s2 |
| Water gravity | -3.5 m/s2 | -1.2 m/s2 |
| Starting depth / vertical speed | -8 m / -6 m/s | -4 m / -2 m/s |
| Perfect bonus / streak increment / cap | 1.5 / 0.25 / 4 m/s | 2.25 / 0.4 / 5.5 m/s |
| Clean entry bonus after retention | 0 | 1 m/s |

Measured with identical recovery input: a 24 m/s downward dive now reaches only
13.601 m depth instead of 24.150 m and breaches in 1.500 s instead of 2.767 s.
From rest, 0.75 s of thrust reaches 22.350 m/s instead of 15.778 m/s. Three perfect
entry rewards add 7.95 m/s instead of 5.25 m/s, before intervening water losses.
Six regression tests were added before tuning; the original mechanical checks,
entry thresholds, retention values, and test tolerances remain unchanged.

Added thrust remains limited by headroom below 26 m/s; velocity itself is never
clamped. Drag, turn cost, air gravity, and skip settings are unchanged. Skipping
requires 8 m/s total speed and settles below 0.25 m/s vertical speed to avoid endless
tiny bounces. Only perfect entries build a streak; a clean entry still resets it.
These values await a human verdict, not a declaration of final balance.

Runtime-specific native trigonometry caused browser/Node drift around 1e-13.
Simulation math now uses fixed, range-reduced series and scaled vector magnitude;
accuracy is independently tested to 14 decimal places. The first uncommitted water
CSV was deliberately regenerated after this correction and the thrust-headroom
fix: the largest numeric change was 0.162216, with no categorical changes. Its
input trace was unchanged at that stage. Both original empty goldens remain
unchanged throughout.

For Retune 1 the water trace and CSV were deliberately re-recorded and reviewed:
faster turning requires shorter holds. The trace still has 600 steps, one breach,
an airborne frame 300, and one perfect entry; none of its behavioral assertions
were removed. The breach now occurs at step 113 instead of 178, entry at 392
instead of 448, and best height is 12.113 m instead of 11.334 m. Prior fixtures
remain in git history and were also archived locally under
`artifacts/water-before-feel-v2/`. Future golden changes must likewise be deliberate
and reviewed.

Stop here for a human to dive and breach for five minutes. Do not start Phase 2
until they want to keep going; retune the water first if they do not.

## Publish

The repository is `carbslad1/ICARUS`. GitHub Pages must use **GitHub Actions** as its
source. Pushing to `main` runs verification and publishes the exact tested `dist/`
artifact only after all checks pass. Pull requests verify without deploying.

Read `ICARUS_DESIGN.md` for the full design and `AGENTS.md` for the current phase,
working commands, and binding update order. Advance one phase per session.

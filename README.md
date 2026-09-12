# ICARUS

Phase 1: a playable water trial with momentum, steering, breaches, ballistic falls,
graded re-entry, perfect-entry streaks, and surface skips. No arena, combat, audio,
or final visual pipeline yet. The five-minute human playtest gate is still pending.

Play at https://carbslad1.github.io/ICARUS/.

## Controls

A/D rotate counterclockwise/clockwise; W thrusts. Arrow keys also work. In the air,
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
all original assertions, tolerances, timeouts, and the 120-second gate remain intact.

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

Verified locally: 127 Node/static, 10 browser, and 12 Playwright tests, in 22.45 s.
Hard turns exit at 20.658/20.393 m/s versus gentle turns at 25.903/25.902 m/s
through the same 120-degree trajectory, starting at 26/60 m/s. Ten complete
perfect-entry cycles increase flight apices at each of three initial launch speeds.
Tests also cover exact crossings, entry bands, skip thresholds, control lockout,
terminal velocity, 30/60/120 Hz equivalence, immutable snapshots, and browser/Node
state equality. The new 600-step water golden includes a breach and perfect entry.

The design's starting force constants are retained. Added thrust is limited by
the remaining headroom below 26 m/s; velocity itself is never clamped. Previously
unspecified values: perfect bonus grows by 0.25 m/s to a 4 m/s cap; skipping requires
8 m/s total speed and settles below 0.25 m/s vertical speed to avoid endless tiny
bounces. These are starting values for the human feel test, not final balance.

Runtime-specific native trigonometry caused browser/Node drift around 1e-13.
Simulation math now uses fixed, range-reduced series and scaled vector magnitude;
accuracy is independently tested to 14 decimal places. The first uncommitted water
CSV was deliberately regenerated after this correction and the thrust-headroom
fix: the largest numeric change was 0.162216, with no categorical changes. Its
input trace and both original empty goldens remain unchanged. Future golden
changes must likewise be deliberate and reviewed.

Stop here for a human to dive and breach for five minutes. Do not start Phase 2
until they want to keep going; retune the water first if they do not.

## Publish

The repository is `carbslad1/ICARUS`. GitHub Pages must use **GitHub Actions** as its
source. Pushing to `main` runs verification and publishes the exact tested `dist/`
artifact only after all checks pass. Pull requests verify without deploying.

Read `ICARUS_DESIGN.md` for the full design and `AGENTS.md` for the current phase,
working commands, and binding update order. Advance one phase per session.

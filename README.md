# ICARUS

Phase 0: deterministic verification infrastructure, with an empty stationary world.
There is no dolphin, physics, arena, combat, or visual pipeline yet.

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

## Deterministic harness

The hook at `window.__icarus` is registered in development or with `?test=1`.
Reset and trace loading pause automatic simulation. `stepFrames(n)` runs exactly
n fixed steps synchronously, even while paused, without calling animation APIs.
`setPaused(false)` resumes real-time advancement. Inputs are held until changed.

The `sim/` code runs with no browser dependencies. The headless harness exposes
`reset`, `step`, and `snapshot`. Coordinates are Y-up, lengths are metres, and time
is seconds at a fixed 120 Hz. Branded constructors and the single arena-to-world
transform live in `src/sim/units.ts`.

```sh
npm run record:empty -- artifacts/new-recording
npm run replay -- artifacts/new-recording/empty.trace.json artifacts/replayed.csv
diff artifacts/new-recording/empty.csv artifacts/replayed.csv
```

Output files must not already exist. Golden fixtures are checked in under
`tests/golden/`; verification never updates them. Gate evidence is written to
`artifacts/gate/`, screenshots to `test-results/`, and timing to
`artifacts/verify-result.json`.

## Publish

The repository is `carbslad1/ICARUS`. GitHub Pages must use **GitHub Actions** as its
source. Pushing to `main` runs verification and publishes the exact tested `dist/`
artifact only after all checks pass. Pull requests verify without deploying.

Read `ICARUS_DESIGN.md` for the full design and `AGENTS.md` for the current phase,
working commands, and binding update order. Advance one phase per session.

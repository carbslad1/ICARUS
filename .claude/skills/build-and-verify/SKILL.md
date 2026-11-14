---
name: build-and-verify
description: Use before saying any ICARUS change is done, and whenever asked "is it done?", "does it pass?" or "can we commit?". Rebuilds ICARUS-demo.html, runs the one gate command, and applies the no-weakening and evidence rules.
---

# Build and verify the ICARUS demo

The designer cannot read code, so "done" is a claim you can defend with a command and its output. Done means all three:

1. `node source/build.cjs` rebuilt `ICARUS-demo.html` from the current `source/`. Never hand-edit the HTML.
2. The gate ran on that build and printed `GATE PASS`.
3. You wrote down what that proves and what it does not.

## The gate

```
node qa/gate.cjs          # quick: build is fresh, qa/port.cjs, qa/tricks.cjs. Seconds. After every change.
node qa/gate.cjs --full   # adds qa/camera-rules.cjs and qa/enemy-sandbox.cjs --gate. About 2 minutes. Before every checkpoint and commit.
```

The gate compares each suite with `qa/gate-expected.json`.

- `port` and `tricks` are pinned by their pass and fail counts.
- The camera and enemy gates have failures the designer accepted as the baseline on 2026-11-12. They are pinned line by line, numbers included. A new failure, a changed number, or a failure that went away is a difference, and the gate fails.
- Both rule gates are deterministic: the same build gives the same output every time. A difference always has a cause in the code.

## When the gate fails

1. Read the lines it prints. Find the cause before changing anything.
2. If the change was not meant to touch that behaviour, it is a regression: fix the code.
3. If the plan calls for the change (a new test, a trick rule that moves enemies), re-pin with `node qa/gate.cjs --full --record`, and name the reason in the commit message and in the step's results in `docs/FEED_FRENZY_PLAN.md`.
4. A worse pinned result (more failures, a larger failing number) needs the designer's yes first. Never loosen a threshold, skip a check or delete an assertion to pass.

## Before a checkpoint commit

1. `node qa/gate.cjs --full` prints `GATE PASS`.
2. Suites may rewrite files under `reviews/`; the gate warns when they do. Do not commit that churn: `git checkout -- reviews/`, after checking no wanted measurement lives only there.
3. Commit the rebuilt `ICARUS-demo.html` and `build.json` with the source change, then tag `feed-cpN-auto`.
4. Do not push without asking: the GitHub repo is public.

## What the gate does not prove

Feel, fun, balance over a full run, or anything on screen. For the screen, use the `playtest` skill and look at the pictures. For balance, use `qa/jumpstyle.cjs` and `qa/port.cjs --runs` as the plan's steps describe. `qa/legacy/` suites test earlier prototypes and gate nothing.

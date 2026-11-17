# ICARUS: working rules

This is the game. `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11`, is the one build being developed (designer, 2026-11-12). The other worktrees (`~/Projects/icarus`, `~/Projects/icarus-slots`) and `~/Projects/Dolphin game` are archive and reference: read them, never edit them.

ICARUS is a neon dolphin game: build speed under water, breach, and fight in the air on a ballistic arc with guns that fire on their own. The designer is a solo developer who does not code. You are the engineer, analyst and tester; he judges feel and fun.

## Read first, every session

1. `docs/CURRENT_STATE.md`: where we are, who is working here, what is next.
2. `docs/FEED_FRENZY_PLAN.md`: the step-by-step plan and its checkpoint log.
3. `docs/DESIGN_RULES.md`: the standing design rules. `docs/DECISIONS.md` is the dated decision log.

Trust order: the code and built game for behaviour, then these dated docs for intent, then memory last. If they disagree, fix the doc and note it. `docs/INDEX.md` says how far to trust every other document; `docs/archive/` is never the plan.

## Locked and open

- **Locked** unless the designer asks: movement and swim physics, camera, controls, enemy behaviour, enemy health, Brotato's spawn schedule, and the ported weapons and shop rules (`docs/BROTATO_PORT.md`).
- **Being built:** the feed and frenzy baseline, by the plan. Every new behaviour sits behind `DEMO.tune.feed`; with it off the game plays as before.
- **Frozen until the baseline is signed (plan checkpoint 3):** the rules in the plan's sections 1 and 2. A new idea goes on the plan's parked list, not into the build. If play shows a rule is wrong, stop and ask.
- **Parked:** trick levels and skill trees (`docs/TRICK_LADDERS_PLAN.md`, paused after step 1), Belly flop's economy role, and the rest of the plan's parked list.

## Build and check

- Edit `source/*.js`, then `node source/build.cjs`. Never hand-edit `ICARUS-demo.html`.
- `node qa/gate.cjs`: the quick gate (seconds). Run it after every change.
- `node qa/gate.cjs --full`: adds the camera and enemy rule gates (about 2 minutes). Run it before every checkpoint and commit.
- The gate compares against `qa/gate-expected.json`. Known failures are pinned there as accepted results; any difference is a regression until explained. Re-pin with `--record` only for a change the plan calls for, and say so in the commit. Never re-pin a worse result without the designer's yes.
- `node qa/income.cjs --nochase`: pearl income per wave beside Brotato's gold.
- `node qa/floor.cjs --quick` (about 40 s) and `node qa/floor.cjs` (about 6 min): how much of each wave plain builds kill. `--vs='{...}'` compares two settings on the same seeds.
- `node qa/safari-memory.mjs --minutes=8`: the built game in real Safari with the free-swim bot, memory read from outside the browser every 5 s (needs Safari's Develop > Allow Remote Automation).
- `node scripts/playtest.mjs --mode flight --seconds 20` screenshots a real flight. Look at the pictures before claiming anything visual.
- Suites in `qa/legacy/` test earlier prototypes. They do not gate anything.

## Steps and checkpoints

- One step at a time, one change at a time, measured before and after on the same seeds.
- A step is done when: the gate passes, measurements are in the plan, the work is committed and tagged `feed-cpN-auto`, and, for play checkpoints (steps 1, 2, 3), the designer has played and said go.
- Commit and tag at every passed checkpoint without asking. **Ask before pushing: the GitHub repo is public.**
- A step that does not depend on a pending play test may be built ahead; it cannot be signed ahead.
- Hand over a play checkpoint as one page: what changed for the player, the one build to open, two or three questions, the evidence, what is not proven. Write his answers into the plan's log word for word.
- Prefer fast measurements. Long background runs are a last resort; make the harness faster first.

## Hard rules

- Never weaken a test, threshold or tolerance to pass. Thresholds marked [TUNE] are confirmed by the designer at their step.
- No new dependencies, installs or network access without asking.
- One agent per worktree. Put your name and date on the "Working here" line in `docs/CURRENT_STATE.md` when you start and clear it when you stop. If another name is there, stop and ask.
- `brotato-reference/` is local reference and is git-ignored. Mechanics may match it; names, text, art and code are ICARUS's own. Never commit it.
- Do not delete anything unless asked. Supersede docs with a dated note; do not rewrite history.

## Talking to the designer

Plain English, no code or file paths unless he asks. Show the game, not a description. One decision question at a time, only about feel, fun, risk or direction. Say what is proven, with what, and what is not. Date every status.

**No made-up explanations (designer, 2026-11-16).** Every claim about how or why the game behaves must come from the code you read or a number you measured this session, and say which. Anything else is labelled a guess, or left out. Never fill a gap with how Brotato or another game works, or with how the dolphin "probably" moves. Known traps: a wave's air time is its combat time and equals Brotato's wave length; WASD steers in the air. When the designer reports a problem, measure it before explaining it.

## End of every session

Update `docs/CURRENT_STATE.md` (short, dated, true) and add any designer decision to `docs/DECISIONS.md`, newest first, in his words.

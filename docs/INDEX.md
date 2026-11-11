# ICARUS docs index

**Last verified 2026-11-08** against the files in this working tree on branch `prototype/slot-items-2026-11`.
If a date here is older than a file's own content, trust the file and update this table.

Use this page to find the right document instead of reading 135 KB of design doc to answer one question.
For the short version of where the project is, read `docs/CURRENT_STATE.md`. For what is locked and what is
open, read `AGENTS.md`.

## Truth order in one line

**Code > dated docs > memory.** Behaviour is settled by `ICARUS-demo.html` + `source/*.js`. Intent is settled
by `AGENTS.md` (locked and open) and the newest entry in `docs/DECISIONS.md`. Nothing in `docs/archive/` is current.

## Read in this order

1. `AGENTS.md` — how to work here (auto-loaded).
2. `docs/CURRENT_STATE.md` — where we are today, dated.
3. `docs/DECISIONS.md` — what the designer decided, newest first.
4. `docs/INDEX.md` (this file) — for anything else.

## Every document

Authority labels: **CURRENT** = use it for decisions now; **RULES** = binding constraints the code must pass;
**MEASURED** = dated evidence, not current status; **SNAPSHOT** = a map of a past moment; **HISTORY** =
superseded, kept for context; **ARCHIVED** = old design work that is not the plan; **PROPOSAL** = a
design idea that is not built; **PROCEDURE** = a working method that still applies even if its design content
was superseded.

| Document | What it is | Authority / freshness |
|---|---|---|
| `AGENTS.md` | Working instructions for an AI agent in this repo. | **CURRENT** — rewritten 2026-11-08. It replaces the old phase instructions. |
| `docs/INDEX.md` | This file: what every document is, how much to trust it, and the design-doc section map. | **CURRENT** — verified 2026-11-08; update it when a document is added or becomes stale. |
| `docs/CURRENT_STATE.md` | The single "where we are" file: branch, build, direction, next, open, broken. | **CURRENT** — dated 2026-11-08, updated every session. |
| `docs/DECISIONS.md` | Append-only designer decision log, newest first, with source and what each supersedes. | **CURRENT** for intent. Never edit old entries; add new ones on top. |
| `docs/archive/CORE_LOOP.md` | The 7 Nov 2026 smallest-loop experiment: Surge, Core Loop Lab, measured results. | **ARCHIVED** — not the plan. |
| `docs/archive/SLOT_ITEMS.md` | Branch record for the slot-items prototype. | **ARCHIVED** — not the plan. |
| `docs/archive/slot-items/ICARUS-flight-model.md` | Model of every launch angle/speed/wave on the demo's own code. | **ARCHIVED** — its flight measurements (3 Nov 2026) may still be useful; its rules for items are not the plan. |
| `docs/archive/slot-items/ICARUS-slot-sim.md` | Arrangement simulator for the five-slot item system. | **ARCHIVED** — not the plan. |
| `docs/archive/slot-items/ICARUS-condition-items.md` | Draft condition-based item design. | **ARCHIVED** — not the plan. |
| `docs/BROTATO_PORT.md` | Every Brotato rule ported on this branch, and what was left out. | **CURRENT** — 2026-11-08. |
| `docs/GAME_MAP.md` | The dated shared understanding of the demo (2026-10-26): controls, measured flight timings, arena, enemies, S4 scoring, where the design is heading, locked rules. | **SNAPSHOT** with notes up to 2026-11-03. §3–§4 describe the demo with step 1 off. Code wins. |
| `docs/SESSION_HANDOFF.md` | Long handoff from the cloud session (updated 2026-10-31): how to run, plan state, decisions, open questions. | **HISTORY** — old branch (`design/scoring-revision-2026-10`), old controls, old plan. Some commands and decisions are still useful; do not treat its status as current. |
| `docs/ENEMY_RULES.md` | Enemy goals (designer, 2026-11-06) and the stage rules S1–S8 (2026-11-07), with measured results and the sandbox check. | **RULES** — current. Its gate still fails some thresholds; §3b records which. |
| `docs/CAMERA_RULES.md` | Camera, breach and entry rules R1–R6 (2026-11-03) and the measured scenario table. | **RULES** — current. Some 100–125 m/s scenarios fail as recorded at the end. |
| `docs/archive/KILL_LAYER_PROPOSAL.md` | A proposal (8 Nov 2026) for a kill-time resolution layer: every kill is an automatically played hand, and a six-slot rack routes the resulting CHAIN to killing more (echo), surviving (barrier), fire rate (Surge) or pearls. Nothing built; the designer has not decided. | **ARCHIVED** — not the plan. |
| `docs/archive/kill-layer/LAB_SPEC.md` | Build spec (v1, 8 Nov 2026) for a standalone, self-contained HTML design toy that proves the kill-layer thesis; it also names planned `LAB_NOTES.md` and screenshots. | **ARCHIVED** — not the plan. |
| `docs/archive/kill-layer/CODE_NOTES.md` | Code archaeology (8 Nov 2026): the exact current kill path in `source/demo.js`, ordering, and where a kill-time layer would hook in. Read-only study; proposes no code change. | **ARCHIVED** — not the plan. |
| `docs/archive/kill-layer/RESEARCH.md` | Research (8 Nov 2026) on ordered modifier resolution (Balatro), the bullet-heaven/survival-curve contrast (Brotato) and prior art, with an evidence legend and sources. | **ARCHIVED** — not the plan. |
| `docs/WAVE_BASELINE.md` | ICARUS vs Brotato waves 1–5 (2026-11-01): spawns, kills, on-screen counts, and the per-second-of-play decision. | **MEASURED** — pre-Surge baseline. Useful history, not current balance. |
| `docs/TRICK_LAB.md` | Jump styles, proof criteria and the one-trick-at-a-time process; the four tricks and their 2026-10-31 results. | **PROCEDURE** still applies; its design goal and trick pool are marked superseded (2026-10-31). Not the live focus while the core loop is gated. |
| `docs/flow-study/README.md` | The 2026-10-26 visual flow study: what it measured, its limits, how to regenerate it. | **MEASURED** — S4 demo, 291 bot flights. History. |
| `docs/HARNESS.md` | The DeepSeek Harness setup for the designer: what the ICARUS Studio preset changes, how to use it, what the project skills are for. | **CURRENT** — harness guide (2026-11-08). |
| `docs/PLAYTEST.md` | Plain-English guide to the headless playtest tool (`scripts/playtest.mjs`, `npm run playtest`): what it proves, what it cannot, how to read screenshots. | **CURRENT** — built and verified 2026-11-08 (title, play, flight and shop modes produce real screenshots of `ICARUS-demo.html`). |
| `README.md` | The S4 demo's orientation: how a run works, controls, charms, suite table, known balance. | **STALE (S4-era, 2026-10-25/27)** for quotas, charms, controls, balance and suites. Keep for S4 history, the flight-log description and the step-1 notes only. |
| `NEXT-PASS.md` | The 2026-10-25 approved continuation note (whitespace-mangled): scoring acceptance and work split. | **HISTORY** — its mandate was superseded by the 2026-10-26/27/30 design revisions. |
| `docs/archive/ICARUS_DESIGN.md` | The old design and build specification (2,080 lines). Section map in `docs/archive/README.md`. | **ARCHIVED** — not the plan. §13–15 still describe the unfinished TypeScript build in `src/`. |
| `reviews/product-rubric.md` | Product-review protocol/rubric from the scoring-satisfaction review (S4 era). | **HISTORY** — its scoring mandate predates later revisions; not a current gate. |

## If documents disagree

1. Behaviour: `ICARUS-demo.html` + `source/*.js` win.
2. Intent: `AGENTS.md` (locked and open), then the newest entry in `docs/DECISIONS.md`.
3. Rules/gates: `docs/ENEMY_RULES.md` and `docs/CAMERA_RULES.md` win for their areas until re-decided.
4. Record the resolution in `docs/DECISIONS.md` and correct the stale document; do not silently fix history.

## Harness and skills

- Harness guide for the designer: `docs/HARNESS.md`. The preset definition lives outside this repo at
  `~/Documents/deepseek-harness/icarus-studio/` (bundled into the desktop profile as the **ICARUS Studio** preset).
- Project skills live in `.dsh/skills/` (live-reloaded): `playtest`, `design-truth`, `build-and-verify`,
  `balance-pass`. Load the matching one before doing that kind of work.

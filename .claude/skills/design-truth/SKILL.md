---
name: design-truth
description: Use before any ICARUS design work, when documents disagree, or when you need to know what is decided. Says what is locked, what is open, where the truth lives, and how to treat the archive of old design documents.
whenToUse: Before proposing or building anything about the roguelite structure, progression, shop, items, scoring or direction; before citing a design rule; when a doc seems to contradict the game or another doc.
---

# Design truth: what is decided and what is open

## Decided by the designer, 2026-11-08

**Locked: keep exactly as they play today unless the designer asks for a change.** Movement and swim physics,
camera, controls, weapons, enemy behaviour, enemy health, and Brotato's spawn schedule (which enemies, how many and when, on
Brotato's wave clock). The code in `source/` defines them, with `docs/ENEMY_RULES.md` and
`docs/CAMERA_RULES.md`. No hit-stop, slow motion or freezes.

**Chosen on 2026-11-15:** the feed and frenzy baseline, built step by step from `docs/FEED_FRENZY_PLAN.md`. Its section 1
is locked and frozen until its checkpoint 3 is signed; its section 4 is the parked list, where new ideas go. The earlier
trick levels plan (`docs/TRICK_LADDERS_PLAN.md`, 2026-11-10) is paused after its step 1.

## Where the truth lives

- Behaviour: the code (`source/*.js` -> `ICARUS-demo.html`).
- Locked and open: `CLAUDE.md`. Standing rules: `docs/DESIGN_RULES.md`. The plan: `docs/FEED_FRENZY_PLAN.md`.
- Status: `docs/CURRENT_STATE.md`.
- Designer decisions: `docs/DECISIONS.md`, newest first. An entry about the open areas dated before 2026-11-08
  is history.
- Everything else: `docs/INDEX.md`.

## The archive is not the plan

`docs/archive/` (the old `ICARUS_DESIGN.md`, `CORE_LOOP.md`, the slot-items and kill-layer work) holds old
experiments, mostly AI-written. Do not quote them as the design, continue them by
default or use them to judge a new idea. Open them only when the designer asks or to look up a past measurement.

## Common traps

- A system existing in the code does not make it the design. The shop, slot items, Discharge, Surge and the Core
  Loop Lab are throwaway prototypes.
- `qa/core.cjs` and `qa/slots.cjs` test those prototypes. A new idea is not wrong because it would not pass them.
- `docs/ENEMY_RULES.md` and `docs/CAMERA_RULES.md` do bind the locked systems, and their QA gates still count.
- Do not trust `docs/archive/NEXT-PASS.md` or `docs/SESSION_HANDOFF.md` for status.
- Do not read `docs/GAME_MAP.md` §3–§4 as today's demo, or §8 as the plan.
- §13–15 of the archived design describe only the unfinished TypeScript build in `src/`.
- The old TypeScript build is on branch `archive/typescript-build`; `ICARUS-demo.html` is generated, so never edit it by hand.

If a claim cannot be traced to code, a dated document or the designer's words, say so. Never invent status.

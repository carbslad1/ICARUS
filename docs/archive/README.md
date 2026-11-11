# Archive: old design work

**Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

Nothing here is the plan. Open these only when the designer asks, or to look up a past measurement. Words like "current" and "target" below only compare old revisions with each other.

## ICARUS_DESIGN.md section map

Read the revision header (`ICARUS_DESIGN.md` lines 8–21) before any section. It is the only cheap way to know
which revision a section belongs to.

### Revisions (each rewrote §4 (run structure) and §10 (progression))

| Date | Revision | Where it lives now |
|---|---|---|
| 2026-10-25 | Scoring and run structure: chips × mult; removed the altimeter as score, apex tiers/loot, entry grading and speed compounding. | Appendix A (the S4 slot-machine design). |
| 2026-10-26 | The routine: five-slot trick routine, style pays pearls, 0 HP ends the run. | Appendix B. |
| 2026-10-27 | Positional play: effect grammar, classes, statuses, space/flight rules, step-by-step plan. | Appendix B (B1.16–B1.20). |
| **2026-10-30** | **Tricks, weapons and items — the current target:** one trick or combo per dive, boosts its weapon type; tricks never deal damage; items only modify; level-up item drafts; catalysts evolve weapons; splashdown pays (kills + orbs) × clean streak. | **§4 and §10 are current.** Build order §4.17. |

### Where the weight is

| Section | Role | Status |
|---|---|---|
| §1–4 | Design core: what the game is, the frame, and **§4 the load-bearing run structure**. | §4 current target. §2–3 contain 2026-10-25 superseded notes (entry grading, compounding). |
| §5–10 | Systems design: water, breach, air, enemies, combat, progression. | Many inline **Superseded** notes (2026-10-25/27/30). Read them; do not build the paragraphs they mark. |
| §11 | Visual language — as important as the mechanics. | Direction current, but §11.5/§11.7 still describe entry grading and recommend hit-stop, both overruled by the designer in 2026-11-03 (`docs/CAMERA_RULES.md`). |
| §12 | Audio. | Some 2026-10-25 superseded notes (perfect-entry sounds). |
| §13–15 | **Binding architecture:** coordinates/one transform, units, fixed timestep and crossings, update order, determinism, single source of truth, static checks. | Binding for the TypeScript build in `src/` and any port. The `source/` demo predates them and does not satisfy them; do not claim it does. |
| §16 | Performance targets. | Aspirational/testable per section. |
| §17 | Phase-by-phase build sequence (Phases 0–8) with gates. | **For the TypeScript build (`src/`), not the demo.** The target design's own build order is §4.17; the current live plan is `docs/CORE_LOOP.md` "The plan". |
| §18 | Non-goals for v1. | Partly superseded (2026-10-25: bosses and Armour now exist). |

### Superseded material — never implement as current

- **Appendix A** (`# Appendix A. S4 slot-machine design (superseded 2026-10-26)`) — reels, charms, wave quota, bails, busts.
- **Appendix B** (`# Appendix B. The routine and positional design (superseded 2026-10-30)`) — five-slot routine, placement/water tricks, statuses, armoured sides, classes, its B1.20 build plan. Some of its code stays in the demo behind settings; that is legacy, not the plan.
- Any paragraph or table carrying a **`Superseded …`** note. They describe removed systems; the note points at §4 or §10 for the replacement.

### Markers

- **[TUNE]** — a starting number; the *structure* beside it is the requirement. Change it only with a measurement.
- **[OPEN]** — an unresolved question. Raise it with the designer; never guess an answer.
- **[CALL]** — a decision made in the designer's favour on the document's own authority; it can be overridden cheaply.
- **[VERIFY]** (Appendix B only) — a claim that follows from the engine's structure but was never tested in play.

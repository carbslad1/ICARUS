# Current state — 2026-11-08

**Branch:** `prototype/brotato-port-2026-11`, a git worktree of `~/Projects/icarus` at `~/Projects/icarus-brotato`, from
commit `73bf67d`. Nothing on this branch is committed yet; **do not reset or clean the worktree.** This is the single
"where we are" file. Update it every session; keep it dated and short.

**Next (2026-11-10):** the designer chose to build the trick ladders on this branch, step by step with a checkpoint
after each step. The guide is `~/Projects/Dolphin game/ICARUS-trick-ladders-plan.md`. Read it first; nothing in it is
built yet, and no step starts before the previous checkpoint is signed in its log.

## What is built and playable

- **`ICARUS-demo.html`** is the whole live game: one self-contained file. Rebuild with `node source/build.cjs`; never
  hand-edit it.
- **Controls:** free swimming (A/D turn, W or Space boosts); hold D/A/W/S as you breach for a trick; WASD moves in the air;
  guns fire automatically; Esc pauses.
- **New on this branch:** the armory replaces the old weapons, gear and shop: 48 of 62 weapons and 105 of 209 items so far.
  `docs/BROTATO_PORT.md` has the coverage and what is left.
- **Verified 2026-11-08:** `node qa/port.cjs` passes 35 checks. Bots die on waves 4 to 6 (they hold 8 m from enemies, and the
  starter weapon reaches about 6 m). Human feel and balance are not verified.

## Design status (designer, 2026-11-08)

**Locked:** movement, camera, controls, enemy behaviour, enemy health and Brotato's spawn schedule. Weapons are locked
elsewhere; on this branch they follow the port the designer asked for.

**Open:** the roguelite element, progression, shop and design direction. This port is one prototype of those, not a
decided design.

## Where the evidence stands (dated)

- **Enemy stage (ENEMY_RULES, 2026-11-07):** the sandbox gate still fails on touching (0.29% vs a 0.05% limit),
  two water-line stays at wave 12, one flick reading (3.02 vs 3) and spread R (0.60–0.64 vs 0.65) in wave-4
  hops/loops.
- **Camera (CAMERA_RULES, 2026-11-03):** at 100–125 m/s some scenarios fail shake (3.5–5.1 vs 3 px/frame²),
  two enemy jumps (30–32 vs 30) and sky on screen (86.7% vs 99% in 70 m dives at 100 m/s).

## What is next

Nothing is scheduled for the open areas. Ask the designer what to explore.

## Open questions

The roguelite element, progression, shop and design direction (see `AGENTS.md`).

## Known stale / not verified

- **Not verified:** human feel or enjoyment of the current build; device performance; any playtest after the
  ones recorded in the docs; this state was verified by rule suites and code inspection, not by human play.
- **Stale docs:** `README.md` and `NEXT-PASS.md` (S4-era), `SESSION_HANDOFF.md` (2026-10-31, old branch and
  controls), `GAME_MAP.md` §3–§4 (step 1 off) and §8, `AGENTS.md` before 2026-11-08, and the suite list in
  `README.md`. Everything in `docs/archive/` is old design work. See `docs/INDEX.md`.

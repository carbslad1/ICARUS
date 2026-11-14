# ICARUS decisions

**Append-only designer decision log — newest first.** This is the dated record of what the designer asked for.
It is not a wish list: only add an entry when a designer statement or a document recording one backs it up.
When a decision is reversed, add a new entry on top that names what it supersedes; never edit or delete an
older entry. Dates are when the decision was recorded, not always when it was first discussed.

Entry format:

```
### YYYY-MM-DD — one-line decision
- **Decision:** what was decided, in plain English.
- **Supersedes:** the earlier decision or built behaviour this replaces (or "nothing; new direction").
- **Source:** exactly where this is recorded (file, section, and the original date if different).
```

For current state see `docs/CURRENT_STATE.md`; for which old document is stale see `docs/INDEX.md`.

---

### 2026-11-15 — Feed and frenzy baseline locked; trick levels plan paused
- **Decision:** the direction is feed and frenzy: "I have settled on a final option. a feed and frenzy mechanic. still 6 weapons." After discussion the designer fixed feed to the ascent and frenzy to the descent (frenzy kills stealing feed "will annoy players"), with tiers raising "feed, frenzy, feed, frenzy ie T1-T4" and items and characters making "unique rules around feed and frenzy" later. On 2026-11-15 he locked the baseline as written in `docs/FEED_FRENZY_PLAN.md`, section 1 ("Yes, lock it"). He also restated as stable: "tricks are tied to a weapon class. jumps increase speed by 5ms/ cap increases by 5 each wave" and "default weapon is harpoon".
- **Why a baseline:** "we are getting stuck on iterative changes and not progressing the build of the game. I feel we should try and keep as many variables as possible stable and then build from there." Nothing in the baseline's rules changes until it has been played to wave 10 and signed.
- **Supersedes:** the 2026-11-10 direction (trick levels and skill trees), which is paused after its step 1 and parked. It also changes "launch speed is fixed per wave" (recorded as a locked rule in `docs/GAME_MAP.md`): jumps now start at 30 m/s and gain 5 m/s each, up to the wave's speed. That per-jump rule was not in this build on 2026-11-15; it is step 1 of the new plan.
- **Source:** the designer's messages in a Claude Code session on 2026-11-14 and 2026-11-15. Parts of the baseline were the engineer's proposals that he accepted with the lock; the plan's section 3 says which.

### 2026-11-12 — Checkpoint 1 signed; three plan questions answered; Belly flop tabled
- **Decision:** Front flip with the shove only feels right and the shove is the right size ("yes"). XP from a flight with no trick waits for the next trick flown ("yes"). The five Mage runs are not read before Corkscrew's numbers are built ("no"). [TUNE] thresholds are confirmed "at its step". On Belly flop: "we haven't figured this out yet, we would use belly flop for interesting Econ builds but it should be tabled as a feature for now".
- **Supersedes:** it parks, without cancelling, the 2026-11-10 decision that Belly flop's level is Harvesting (`docs/TRICK_LADDERS_PLAN.md`, section 2). How step 3 treats Belly flop meanwhile is the engineer's reading, marked [ASSUMED] in the plan.
- **Source:** the designer's written answers in a Claude Code session on 2026-11-12. Still open: whether Close, Shot and Blast come off the items (he asked what the question meant).

### 2026-11-12 — How the work is run
- **Decision:** Claude Code is the engineer, one agent per worktree. `icarus-brotato` is the game; the slots, Rush/Kite and v3 builds are archive. A local commit and tag are made at every passed checkpoint without asking. The recorded camera and enemy gate failures are acceptable as today's baseline. The old TypeScript build moves to an archive branch. Steps that do not depend on a pending play test may be built ahead. Long measurement runs: "Occasionally, I don't like these and would prefer if they could be run faster somehow, like not in real time or in sped up versions". What happens after step 7 is "undecided".
- **Supersedes:** the plan's rule that no step starts before the previous checkpoint is signed (it may now be built, not signed); the earlier "commits only when asked" rule, for checkpoint commits. Pushing was also answered "yes", but the repo turned out to be public, so the engineer holds each push for a fresh yes.
- **Source:** the designer's written answers in a Claude Code session on 2026-11-12.

### 2026-11-10 — Trick levels and skill trees are the direction
- **Decision:** Brotato's melee, ranged and elemental scaling moves onto the tricks as trick levels; a skill tree per trick replaces the general level-up screen; Front flip is not invulnerable; no new weapons and no evolutions; tricks give no flat fire-rate bonus. The full list is in `docs/TRICK_LADDERS_PLAN.md`, section 2.
- **Supersedes:** the 2026-10-30 rejection of a skill tree; "nothing is scheduled for the open areas" in the 2026-11-08 state.
- **Source:** `docs/TRICK_LADDERS_PLAN.md`, section 2 (written with the designer on 2026-11-10). Entered here on 2026-11-12.

### 2026-11-08 — Port Brotato's weapons, stats and shop on a new branch
- **Decision:** on `prototype/brotato-port-2026-11`, port Brotato's weapons, stats and shop into ICARUS. Rules and numbers only; `docs/BROTATO_PORT.md` lists them. This is the designer's requested exception to "weapons as they are", for this branch.
- **Supersedes:** nothing outside this branch.
- **Source:** the designer, in a Claude Code session on 2026-11-08.

### 2026-11-08 — Enemy health is locked too
- **Decision:** keep enemy health as it is, alongside the locked systems in the entry below.
- **Supersedes:** nothing; it adds to the entry below.
- **Source:** the designer, in a Claude Code session on 2026-11-08.

### 2026-11-08 — Core systems locked; roguelite, progression, shop and direction are open
- **Decision:** keep movement, camera, controls, weapons, enemy behaviour and Brotato's spawn schedule as they
  are. The roguelite element, progression, shop and design direction are open to interpretation. Earlier design
  documents are old experiments, not the plan.
- **Supersedes:** the design content of every earlier entry about run structure, scoring, items, the shop and
  progression, including the 2026-11-07 smallest-loop direction and the 2026-10-30 target design.
- **Source:** the designer, in a Claude Code session on 2026-11-08.

### 2026-11-07 — Reduce to the smallest loop; power is Surge, not Discharge
- **Decision:** build and prove the smallest game that shows the loop before anything else: Brotato's spawn
  schedule, wave clock and enemy health; one enemy (the chaser); one gun (Harpoon T1, copies only); the
  Fruit/Bell/Chest/Seven pool; five phase-locked charm slots. Power is **Surge**, a fire rate that builds
  through the wave and resets at its end, with a milestone beat every +100%. Everything else waits until this
  is fun.
- **Supersedes:** the slot-items power design where a Discharge spends banked Charge for a short damage
  window (`docs/SLOT_ITEMS.md`, 2026-11-06), and it narrows the §4.17 build order (tricks, items, shop) until
  the core-loop feel gate passes.
- **Source:** `docs/CORE_LOOP.md` ("7 Nov 2026" note: "The designer replaced the Discharge on 7 Nov";
  "The fundamental rules"; "The plan"). Code state checked 2026-11-08: Surge is in the Core Loop Lab only;
  normal play still uses the Discharge engine.

### 2026-11-07 — Enemies live on a "stage" carried by the camera
- **Decision:** combat happens on the screen rectangle, 76 × 43 m at every speed and zoom. Enemies move only
  in stage space at fixed stage speeds; the dolphin's world speed never enters enemy logic. Roles are
  Brotato's; each enemy has its own height over the water, pushes apart, gets out of your way under water, and
  plunges/swims out on its own schedule. No teleports, snaps, flocking or clamps at seams.
- **Supersedes:** the world-space enemy rewrite and the earlier flocking, recall, hold-above, hover and
  wet-avoid behaviour (all removed; see `docs/ENEMY_RULES.md` §5).
- **Source:** `docs/ENEMY_RULES.md` §3 ("Rules: the stage (designer, 2026-11-07)").

### 2026-11-06 — Enemy goals confirmed: always with you, a few metres off, turrets in the air
- **Decision:** enemies are never left behind by swimming or flying (they keep up at your speed, above the
  water too); under water they do not chase, they get out and head for the air; they keep a few metres off
  you; turrets stay in the air; on-screen behaviour is consistent, smooth and never stuck on the water line.
- **Supersedes:** the earlier question of whether enemies could be outrun or touch you under water.
- **Source:** `docs/ENEMY_RULES.md` §1 goals G1–G8 and §4 answers (2026-11-04 and 2026-11-06).

### 2026-11-03 — Camera, breach and entry rules R1–R6
- **Decision:** the camera is v3's camera rebuilt: one 0.28 s spring onto the arena centre in the air and the
  dolphin under water; no blends or leads at a breach or splash; it keeps up within 40% of the half-view and
  does not shake (≤3 px/frame²), the dolphin does not visibly change size, enemies do not jump, the sky stays
  visible under water and the dolphin stays on screen.
- **Also decided the same day:** squash and stretch off by default; the breach latch (a direction held as you
  leave the water picks the trick and does not move you until released); no hit-stop, freezes or slow motion;
  no zoom with speed in the air. Rejected the first "smooth" camera rebuild as "mushy".
- **Supersedes:** the earlier smooth-camera rebuild, the separate water view/size-hold/look-ahead/squash code
  and the breach-camera experiments (kept as history in `docs/GAME_MAP.md` §2).
- **Source:** `docs/CAMERA_RULES.md` (2026-11-03, written with the designer); `docs/GAME_MAP.md` §2 bullets
  dated 2026-11-01 to 2026-11-03.

### 2026-11-01 — No half-roll: D is always clockwise, A always anticlockwise
- **Decision:** the dolphin no longer rolls its sprite to keep its back up when turning past vertical. D always
  turns clockwise and performs the Front flip; A always anticlockwise and performs the Backflip. The dolphin
  can be upside down mid-turn.
- **Supersedes:** v3's half-roll, which made the turn keys seem to swap (2026-10-31 controls).
- **Source:** `ICARUS_DESIGN.md` §4.3 ("No half-roll (designer, 2026-11-01)"); `docs/GAME_MAP.md` §2;
  commit `ebedfad`.

### 2026-11-01 — Spawns match Brotato per second of play, not per second of air
- **Decision:** keep spawning while you swim, but scale the wave's spawn schedule by the share of the wave
  spent in the air (seeded from the last wave). The zone-1 groups play out once over the whole wave, swims
  included, and the wave's total spawns match Brotato's ×1.1.
- **Supersedes:** the "per second of air" option, where the water was a breather and totals ran about twice
  Brotato's.
- **Source:** `docs/WAVE_BASELINE.md`, "Decision and result (2026-11-01): per second of play".

### 2026-10-31 — Tricks are performed by the key held as you breach
- **Decision:** hold D/A/W/S as you leave the water to perform Front flip / Backflip / Corkscrew / Belly flop.
  The last key pressed wins (singles only for now); hold nothing for no trick. Nothing carries over. The
  animation turns the body for the whole flight.
- **Supersedes:** the same-morning design where tricks were tapped underwater and the last choice carried over.
- **Source:** `ICARUS_DESIGN.md` §4.3 and its revision note ("Revised 2026-10-31 (designer)"); commit
  `3128d3c`; `docs/TRICK_LAB.md` (2026-10-31).

### 2026-10-31 — One trick or combo per dive; tricks never deal damage
- **Decision:** run structure chosen over the routine and Trick Lab pool: one trick or combo is chosen each
  dive and boosts its weapon type for the flight; tricks never deal damage (water tricks included); items only
  modify and never create attacks; levels give 1-of-3 item drafts; catalysts evolve every copy of a weapon at
  any tier; splashdown pays (kills + orbs) × clean streak; characters are one in the demo; a run is 20 waves,
  about 25 minutes, 0 HP ends it.
- **Supersedes:** the five-slot routine, placement tricks, positional grammar and Trick Lab pool built
  2026-10-26 to 2026-10-30 (now Appendix B; built code stays behind settings).
- **Source:** `docs/SESSION_HANDOFF.md` §6 ("Chosen 2026-10-31"); `ICARUS_DESIGN.md` revision header
  (2026-10-30), §4 and §10.

### 2026-10-30 — Tricks, weapons and items revision (the current target design)
- **Decision:** the one-trick-per-dive structure above was set after the designer's playtest: the fun is
  killing enemies and collecting XP orbs while moving; positional rules fought that. §4 and §10 were rewritten
  to tricks/weapons/items; the old designs became appendices.
- **Supersedes:** the 2026-10-26 routine design and the 2026-10-27 positional design (both now Appendix B);
  the S4 slot-machine design (already Appendix A).
- **Source:** `ICARUS_DESIGN.md` revision header 2026-10-30 and §4 ("Why the change (designer playtest,
  2026-10-30)").

### 2026-10-30 — Considered and rejected
- **Decision:** rejected the routine, the placement and water tricks built on it, the positional effect
  grammar, enemy sides/hard surfaces, proximity scaling (also 2026-10-27), tricks that deal damage, items that
  spawn attacks, freshness decay, class set bonuses, Brotato-style stat picks on level-up, Risk of Rain 2-style
  automatic levels and hidden maths, a skill tree/map, mounting weapons on keys, practice mutations, carried
  orbs, engineering deployables, and choosing tricks mid-air. Mines stay off.
- **Supersedes:** the designs listed above; they remain in history (Appendix A/B) and some code remains behind
  settings.
- **Source:** `ICARUS_DESIGN.md` §4.19; `docs/TRICK_LAB.md` ("Mines stay off", designer 2026-10-30);
  `docs/GAME_MAP.md` §11.

### 2026-10-27 — Positional design revision: statuses, feats, clean streak
- **Decision:** §4 added the positional effect grammar, classes, space/flight rules, example effects and a
  linear build-and-playtest plan; statuses replace tags; evolutions are earned by feats; a clean streak across
  flights replaces the per-flight ×2. Also answered that the clean streak carries across flights and tricks
  count toward class set bonuses.
- **Supersedes:** the 2026-10-26 routine; note this whole revision was itself superseded on 2026-10-30 and is
  kept as Appendix B.
- **Source:** `ICARUS_DESIGN.md` revision header 2026-10-27; `docs/SESSION_HANDOFF.md` §6 ("Positional design,
  2026-10-27" and "Answered by the designer, 2026-10-27").

### 2026-10-26 — The five-slot routine replaces the S4 slot machine
- **Decision:** §4 and §10 were rewritten to a five-slot routine of abilities placed on the flight; style pays
  pearls; 0 HP ends the run; there is no quota. The S4 slot-machine design is kept as Appendix A.
- **Supersedes:** the 2026-10-25 S4 chips × mult design and its wave quota (Appendix A).
- **Source:** `ICARUS_DESIGN.md` revision header 2026-10-26; `docs/SESSION_HANDOFF.md` §6 ("Design direction,
  2026-10-26").

### 2026-10-25 — Scoring acceptance: chips × mult, no re-opening
- **Decision:** the designer accepted the chips × mult scoring spectacle: keep automatic visual tricks, move
  the score to the bottom, remove the box and secondary scoreboard rows, keep three components + operators and
  animated additions. Do not re-open scoring-direction validation. The later work items (shop information and
  visual redesign, scoring-build communication, clearer first wave, full-run balance, launch styles, mobile
  legibility, local performance) must be measured, not difficulty cuts for bot wins.
- **Supersedes:** the original altimeter score, apex tiers/tier loot, entry-quality grading and perfect-entry
  streaks, and speed compounding across cycles.
- **Source:** `NEXT-PASS.md` ("User accepted scoring spectacle on 25 October 2026"; "Do not re-open
  scoring-direction validation"); `ICARUS_DESIGN.md` revision header 2026-10-25.

### 2026-10-25 and earlier — Locked rules still standing
- **Decision:** launch speed is 30 m/s at wave 1 and +5 per wave (preserve); guns auto-fire; there is no entry,
  landing or entry-angle grade; charms must be readable in at most two lines; no "this jump needs X" readout;
  airtime gating is rejected; XP orbs stay but levels give no free Max HP; the heat cue is removed; the water
  phase is about a second and nothing can be read in it; the player cannot time kills; proximity scaling is
  rejected (2026-10-27); altitude risk/reward already comes from launch-angle threat tiers.
- **Supersedes:** the original design's entry grading, altimeter and stat-pick progression.
- **Source:** `docs/GAME_MAP.md` §11 ("Designer rules and corrections (keep these)"); `ICARUS_DESIGN.md` §5–§10
  superseded notes.

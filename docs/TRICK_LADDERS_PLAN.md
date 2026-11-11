# ICARUS trick levels and skill trees: build guide

**Written 2026-11-10 with the designer; revised 2026-11-12.** This is the guide document for this work and the only copy (`docs/TRICK_LADDERS_PLAN.md` in `~/Projects/icarus-brotato`; it moved here from the Dolphin game folder on 2026-11-12). It lists what to build, in order, and the checks that must pass before the next step starts. Update it when a decision changes; sign off each checkpoint in the log at the bottom.

**Build target:** `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11`. This is the build that has Brotato's weapons, stats and shop. `~/Projects/icarus-slots` has the same tricks, movement and enemies but the older slot-items shop. Confirmed by the designer at checkpoint 0 (2026-11-10).

---

## 1. What we are building

Brotato's weapons and shop rules stay. Its melee, ranged and elemental scaling stats move onto the tricks, and its general level-up screen is replaced by a skill tree for each trick.

### The rules

1. **You level what you fly.** XP earned in a flight goes to that flight's trick. Each trick has its own level.
2. **Weapons scale with trick level.** Brotato's scaling stats are no longer picked or bought. Each one is a trick's level, and it is always on, whichever trick you are flying.
3. **Levelling a trick opens its skill tree.** There is no general level-up screen. A level in Front flip is spent in Front flip's tree.
4. **Holding a key gives the trick's ability and sends the flight's XP to that trick.** It does not change how the guns fire.
5. **A shop report** per trick and per weapon: flights, kills, hits taken. Measured numbers only.

### Which trick scales which weapons

Counted from each weapon's scaling in `source/armory-data.js` on 2026-11-10 (48 weapons).

| Key | Trick | Brotato stat it replaces | Weapons that scale with it |
|---|---|---|---|
| D | Front flip | Melee damage (Close in the port) | 25 |
| A | Backflip | Ranged damage (Shot) | 18 |
| W | Corkscrew | Elemental damage (Blast) | 8, plus 2 whose secondary shots do |
| S | Belly flop | Economy: see section 3 | 3 scale with Engineering; none with an economy stat |

Some weapons scale with two stats, as in Brotato, so they follow two tricks: for example Mantis Punch and Moray Fang (Front flip and Corkscrew) and Barb Crossbow (Backflip and Corkscrew). These are the bridges between builds. One weapon, Conch Mace, scales only with Armour and follows no trick.

### How much scaling: Brotato's numbers

The spawn schedule, enemy health, weapon damage and fire rate are Brotato's, so the amount of scaling a build needs at each wave is already known: it is what winning Brotato builds have. Source: 32 real runs at Danger 0 from the Run Tracker, read every wave on 2026-11-10 (`~/Projects/Dolphin game/brotato-reference/map/tracker-runs-2026-11-10.md`; reference material stays out of this repo): 11 Well Rounded wins, 8 Well Rounded losses, 9 Brawler wins and 4 usable Ranger wins.

**Level:** about 14 after wave 10, 19 after wave 15 and 23 after wave 19 (median of 24 wins), about 23 level-up picks in a run. The site's per-wave view shows stats at the start of each wave, so the table below pairs each stat with the level it was read at. Brotato's XP rule is (level + 3)² for the next level.

**Flat damage at each wave (wins, medians):**

| Build | Stat | Start of wave 5 (level 5) | Start of wave 10 (level 12) | Start of wave 15 (level 18) | Start of wave 20 (level 23) | Range at wave 20 |
|---|---|---|---|---|---|---|
| Brawler (melee) | Melee | 3 | 12 | 24 | 34 | 26 to 71 |
| Ranger (ranged) | Ranged | 5 | 11 | 14 | 21 | 12 to 36 |

**So trick level sets the stat from this table, not a fixed amount per level.** A one-trick player gets about every level in that trick, so trick level L gives what a specialist Brotato build has at level L:

| Trick level | 5 | 12 | 18 | 23 |
|---|---|---|---|---|
| Front flip: Close | 3 | 12 | 24 | 34 |
| Backflip: Shot | 5 | 11 | 14 | 21 |
| Corkscrew: Blast | 5 | 11 | 14 | 21 |

Values between are interpolated. Corkscrew copies Backflip's row, because Brotato gives Elemental the same level-up sizes as Ranged and the Mage runs were not read [ASSUMED until Mage runs are read]. Melee grows faster late because Brotato's melee level-up and item sizes are twice the ranged ones.

What else the runs say, which this plan has to respect:

- **Most flat damage comes from items, not level-ups.** Level-up picks gave about 30% of Brawler's melee and 35% of Ranger's ranged at wave 20. Players spend only 3 to 5 of their 23 picks on the main damage stat. So trick level replacing the whole stat means items stop selling it, or builds end at about three times Brotato's.
- **% Damage and Attack speed are the most-picked damage stats.** % Damage is the single most common pick in every build (about 4 picks a run), reaching a median of 67% at wave 20; Attack speed 36%. They must stay, in the trees or on items.
- **Economy separates wins from losses.** Well Rounded losers level at the same rate as winners, but by wave 15 they have half the Harvesting (40 against 90), less Max HP (44 against 59) and less % Damage (33 against 43). This supports Belly flop as the Harvesting trick.
- **Brotato has one level track,** which is now decided (section 2).

One thing Brotato's numbers cannot say: how often an ICARUS weapon has a target in reach. In Brotato it is nearly always. Here enemies hold 8 to 20 m above the water, and on 2026-11-08 the Close reach measured 20% of air time on skims and about 48% on mid and high arcs. Step 0 measures this for the port's weapons, because it multiplies everything above. Matching Brotato's inputs was tried once before (2026-11-07) and the playtests were overwhelming, which is why the per-wave outcome checks in steps 3 and 6 stay.

---

## 2. Decisions so far (designer)

| Date | Decision |
|---|---|
| 2026-11-10 | **Keep as they play today:** the choice of four tricks, the flow, launch speed +5 m/s per wave, the enemies, the pace of jumping with auto-firing weapons, the movement. |
| 2026-11-10 | **No new weapons and no evolutions.** |
| 2026-11-10 | **Front flip is not invulnerable. It has only a repulsion, smaller than Backflip's, because it is the melee trick.** Today it is invulnerable for 1 s and shoves enemies within 2.5 m at 30 m/s; Backflip pushes within 12 m at 40 m/s (`source/tricks.js`). Step 1 removes the invulnerability and keeps the small shove, starting from today's 2.5 m and 30 m/s [TUNE]. |
| 2026-11-10 | **Brotato's ranged, elemental and melee scaling moves onto the tricks.** Weapons scale innately with trick level. |
| 2026-11-10 | **Levelling a trick replaces Brotato's general level-up screen with a class-based skill tree.** This supersedes the 2026-10-30 rejection of a skill tree. |
| 2026-11-10 | **Tricks give no flat fire-rate bonus.** The earlier "hold the key, the family fires 30% faster" idea is dropped. |
| 2026-11-10 | **Scaling is sized with Brotato's math, not tuned by hand,** because the spawn schedule, enemy health, weapon damage and fire rate are Brotato's. |
| 2026-11-10 | **Build target is `~/Projects/icarus-brotato`,** branch `prototype/brotato-port-2026-11`. |
| 2026-11-10 | **Belly flop's level is Harvesting,** and it stands in for Engineering on the three weapons that scale with it. |
| 2026-11-10 | **One XP track on Brotato's curve.** The number of level-ups is Brotato's. Each level-up goes to the trick that earned the most XP in it. |
| 2026-11-12 | **Front flip with the shove only is right, and the shove is the right size.** Checkpoint 1 signed ("yes"). |
| 2026-11-12 | **XP from a flight with no trick waits and is added to the next trick you fly.** ("yes") |
| 2026-11-12 | **Belly flop's economy role is tabled.** The designer: "we haven't figured this out yet, we would use belly flop for interesting Econ builds but it should be tabled as a feature for now". Reading of this for the build [ASSUMED, confirm at checkpoint 3]: Belly flop keeps playing as it does today; step 3 builds Front flip, Backflip and Corkscrew first and does not move Harvesting or Engineering onto Belly flop yet. This parks the 2026-11-10 "Belly flop's level is Harvesting" decision; it does not cancel it. |
| 2026-11-12 | **The Mage runs are not read before Corkscrew's numbers are built.** Corkscrew copies Backflip's row. ("no") |
| 2026-11-12 | **[TUNE] thresholds are confirmed at their own step,** not in one batch. |
| 2026-11-12 | **The recorded camera and enemy gate failures are accepted as today's baseline.** They are pinned in `qa/gate-expected.json`; a change in them is what counts as a regression. |
| 2026-11-12 | **Process:** Claude Code is the engineer, one agent per worktree. A local commit and a tag are made at every passed checkpoint without asking. A step that does not depend on a pending play test may be built while the designer plays the previous one. Long measurement runs are disliked: make the harness faster before running more of them. |

Earlier rules that still bind this work: damage comes only from weapons; tricks never deal damage; nothing is read during a flight or a dive; no freezes or slow motion on the player; entries are never judged; feedback lives on the dolphin and the guns, never in a corner panel; dodging is never something you buy.

---

## 3. Open decisions, with a recommendation

Each is settled at the checkpoint named. Until then the recommendation is what gets built.

| Question | Recommendation | Settled at |
|---|---|---|
| How much scaling does one trick level give? | The table in section 1, taken from the winning Brotato runs. | Checkpoint 3 |
| ~~Where does XP go on a flight with no trick?~~ | **Settled 2026-11-12:** it waits and is added to the next trick you fly. | Done |
| Belly flop multiplies XP by 1.5 today. With rule 1 that would feed itself. | **Tabled 2026-11-12** with the rest of Belly flop's economy role (section 2). Until it is picked up, Belly flop is left as it plays today. | When the designer reopens it |
| What shape is a tree? | Three branches of four upgrades per trick, all visible in the shop. Each level buys one upgrade you can reach. Nothing random. | Checkpoint 4 |
| Where do the other level-up stats go (Max HP, Armour, Regen, Attack speed, Reach, Luck and the rest)? | Into the trees, by theme. Section 5, step 4 has a draft. | Checkpoint 4 |
| Items sell Close, Shot and Blast today (20, 18 and 15 item lines out of 105 items). | Those lines come off the items, so trick level is the only source of scaling. Brotato's totals already include items, so keeping both would roughly double them. | Checkpoint 3 |
| Do Brotato's class set bonuses stay? | No. The trees take their place. | Checkpoint 5 |
| Are any stats cut? | Damage % and Attack speed stay: five of twelve winning Brotato runs depend on them. Crit and Dodge could go, but only if the designer wants fewer stats. | Checkpoint 5 |

---

## 4. How a checkpoint works

A step is finished only when all of these are true, in this order:

1. **The automated checks pass** on the built file, and `node qa/gate.cjs --full` matches its pinned results.
2. **The measurements are recorded** in the step's results table in this document, with the command and date.
3. **The work is committed and tagged** `ladders-cpN-auto` (no need to ask).
4. **For a play checkpoint, the designer has played it** and answered the step's play questions. The agent hands over one page: what changed in the player's terms, the one build to open, the two or three questions, the evidence, and what is not proven. The answers go into the log word for word.
5. **The designer says go.** The log at the bottom gets a dated line and the commit is tagged `ladders-cpN`.

**Who signs (designer, 2026-11-12):** steps 0, 2 and 7 are signed by the automated checks, with a one-line report. Steps 1, 3, 4, 5 and 6 are play checkpoints. A step whose build does not depend on a pending play test may be built while the designer plays the previous one; it still cannot be signed before the earlier checkpoint is.

If a check fails, the step is changed and re-run. A threshold is never moved to make a step pass; if a threshold is wrong, the designer changes it here first, with a reason.

### Standing rules for every step

- Every new behaviour sits behind one setting, `DEMO.tune.ladders`. With it off, the game must behave exactly as it does today.
- One change at a time. Measure before and after on the same seeds.
- Use at least 16 seeds and 10 flights per style before deciding anything from the jump-style harness. Smaller runs moved by up to 10 points on 2026-10-30.
- Judge by damage landed, kills, time to kill, crowd on screen and hits taken. Never by damage fired alone: about 37% of fired damage is lost to overkill.
- Rebuild with `node source/build.cjs`. Never edit `ICARUS-demo.html` by hand.
- Back up `reviews/` before running suites and restore it afterwards.
- Thresholds marked [TUNE] were chosen for this plan and need the designer's confirmation.

### State of the checks (after step 0, 2026-11-10)

| Check | Result |
|---|---|
| `node qa/port.cjs` | 35 of 35 pass |
| `node qa/tricks.cjs` | 20 of 20 pass: the suite runs twice, port off and port on |
| `node qa/jumpstyle.cjs <trick>` | Runs on the armoury; repeatable |
| `node qa/port.cjs --runs --bot=god` | Six of six runs reach wave 20 |

---

## 5. The steps

### Step 0: baseline and tools

**Goal:** be able to measure a trick on the port's real weapons, and record how the game plays today. No game behaviour changes.

Build:
- Teach `qa/jumpstyle.cjs` the armoury: run with the port on and pick guns by the trick they scale with.
- Make `qa/tricks.cjs` run with the port on as well as off.
- Add a skim style (about 10°) to the harness beside low 28°, mid 55° and high 78°.
- Give the run bot two modes: one that cannot die, for counting levels and income to wave 20, and one that flies inside its weapons' reach, for balance runs.
- Record the baseline: for each trick and style at waves 5, 10 and 15, with and without the trick.

| Check | Pass when |
|---|---|
| Harness runs | All four tricks finish at waves 5, 10 and 15 without errors |
| Repeatable | The same seeds give the same numbers twice |
| Suites | `qa/port.cjs` 35 of 35; `qa/tricks.cjs` passes with the port on and off |
| Baseline saved | A table of damage landed, kills, time to kill, crowd and hits per flight is in this document |
| Front flip today | Hits per flight with Front flip as it is now (invulnerable) are recorded in every style |
| Run bot | The cannot-die bot reaches wave 20. Recorded per wave: its level, its pearls, and its Close, Shot and Blast totals from level-ups and items. The in-reach bot's death wave is recorded. |
| Levels match Brotato | The cannot-die bot's level is within 2 of the real runs' median at every wave (after wave 10: 14, after wave 15: 19, after wave 19: 23; the full curve is in the tracker file, "picks so far" column). If not, the XP income is off and is fixed before step 3. |
| Target in reach | For one Close and one Shot weapon per style: the share of air time with a target in reach. This is the one factor Brotato's numbers do not cover. |
| Damage against health | Damage landed per wave at waves 5, 10 and 15, beside the real wins' medians: about 1,200, 10,100 and 24,800. Kills per wave beside theirs: 137, 378 and 521. |

**Designer:** confirm the build target and the Belly flop decision.

#### Checkpoint 0 results (2026-11-10)

Raw output: `qa/ladders/step0/` in `~/Projects/icarus-brotato` (one text file and one raw JSON per trick, and the two bot runs).

**The harness changes.** Most of the step 0 tooling was already in the working tree when this step started (edited 11:48 to 12:49 on 2026-11-10; I could not find which session or tool made them): the jump-style harness flies armoury weapons by trick, adds a skim style (10°), reports each weapon's target-in-reach share and damage against health sent, and can split seeds into batches; `qa/tricks.cjs` runs with the port off and on; `qa/port.cjs --runs` has `--bot=god` and `--bot=reach`. One fix was made in this step: the cannot-die bot set HP to its maximum each tick, so a large late burst could still kill it (one run died at wave 17). It now sets HP far above the maximum, as the jump-style harness does.

**Guns per trick in the harness:** Front flip: Trident + Tuna Gaff (Close), held 4 m from enemies. Backflip: Spitter + Pressure Cannon (Shot), 8 m. Corkscrew: Squid Launcher + Riptide Carbine (Blast), 8 m. Belly flop: Pearl Knuckle (Engineering), 4 m. Tier 1 at wave 5, tier 2 at wave 10, tier 3 at wave 15. 16 seeds × 10 flights per cell. Command: `node qa/jumpstyle.cjs <trick> --waves=5:1,10:2,15:3 --seeds=16 --flights=10`.

| Check | Result |
|---|---|
| Harness runs | **Pass.** All four tricks, waves 5, 10 and 15, four styles |
| Repeatable | **Pass.** The same seeds gave identical output twice |
| Suites | **Pass.** `qa/port.cjs` 35 of 35; `qa/tricks.cjs` 20 of 20 |
| Baseline saved | **Pass.** Tables below |
| Front flip today | **Recorded.** Below |
| Run bot | **Cannot-die bot: pass,** six of six reach wave 20. **In-reach bot: dies on waves 3 to 6** (median 3), so it cannot be used for balance runs as built |
| Levels match Brotato | **Pass.** After wave 10: 14.2 against 14; after wave 15: 19.8 against 19; after wave 19: 23.8 against 23 |
| Target in reach | **Recorded.** Below |
| Damage against health | **Recorded,** below; well short of Brotato's |

**Levels and money (cannot-die bot, 6 runs, after each wave):**

| Wave | Level | Brotato level | Money earned | Brotato gold | Close / Shot / Blast held | Average weapon tier | Damage against health sent |
|---|---|---|---|---|---|---|---|
| 5 | 6.5 | 6 | 123 | 130 | 1.3 / 1.5 / 1.7 | 1.3 | 83% |
| 10 | 14.2 | 14 | 387 | 400 | 9.0 / 6.5 / 5.5 | 1.3 | 79% |
| 15 | 19.8 | 19 | 466 | 491 | 17.7 / 9.3 / 9.0 | 1.3 | 84% |
| 19 | 23.8 | 23 | 611 | 656 | 25.2 / 11.8 / 12.3 | 1.3 | 77% |

The XP and money curves match Brotato's within about 7%. The bot's weapons stay at tier 1.3 all run because it rarely combines them; real players reach tier 3 to 4. So its damage understates a real build.

**What each trick does today (change against no trick, only where outside the 95% band):**

| Trick | Safer (hits per flight) | Faster or more kills | Worse |
|---|---|---|---|
| Front flip (invulnerable 1 s) | Skims: −30% at wave 10, −44% at wave 15. Low hops at wave 15: −12%. Elsewhere −3 to −9%, mostly inside the noise | None | Damage −10% on skims at wave 10, −6% on high at wave 10, −8% on mid at wave 15 |
| Backflip (Repulse) | Low hops at wave 15: −14% | Low hops at wave 10: kills +66%, time to kill −18% | Damage −5% on low hops at waves 10 and 15 |
| Corkscrew (slow) | Mid and high at wave 5: −23 to −25%. Low hops: −18% at wave 10, −10% at wave 15 | None | None |
| Belly flop (shockwave, ×1.5 pearls) | None in combat | None | None. Its payoff is money, which this harness does not measure |

Verdicts against the old trick criteria: Corkscrew proven; Front flip and Backflip fail "never worse"; Belly flop shows nothing in combat.

**For step 1:** today's invulnerability already does little outside skims. Removing it should cost at most about 10% more hits on low, mid and high flights, and 30 to 45% more on skims at waves 10 and 15.

**Target in reach (share of air time with an enemy within the weapon's range, no trick):**

| Weapons | Wave | Skim | Low | Mid | High |
|---|---|---|---|---|---|
| Close (Trident, Tuna Gaff) | 5 | 4% | 56% | 65% | 67% |
| | 10 | 40% | 78% | 78% | 80% |
| | 15 | 56% | 84% | 85% | 85% |
| Shot (Spitter / Pressure Cannon) | 5 | 55 / 76% | 88 / 90% | 88 / 90% | 90 / 92% |
| | 10 | 82 / 86% | 93 / 94% | 94% | 95% |
| | 15 | 85 / 86% | 96% | 96% | 96 / 97% |
| Blast (Squid Launcher / Riptide Carbine) | 5 | 77 / 55% | 89 / 87% | 90 / 88% | 92 / 90% |
| | 10 | 86 / 85% | 94% | 94% | 95% |
| | 15 | 86% | 96% | 96% | 97% |

Ranged weapons have a target about 90 to 97% of the time, close to Brotato's "nearly always". Close weapons have one 56 to 85%, and almost never on skims at wave 5, where a 10° launch peaks at about 1.6 m and enemies hold 8 to 20 m up. Skims lift as launch speed rises, which is why Close reach on skims grows from 4% to 56%.

**Damage against health sent (no trick, waves completed in the harness):**

| Weapons | Wave 5 | Wave 10 | Wave 15 |
|---|---|---|---|
| Close, 2 weapons | 50 to 52% | 50 to 51% | 66 to 69% |
| Shot, 2 weapons | 57 to 58% | 46% | 56 to 59% |
| Blast, 2 weapons | 37 to 40% | 26% | 30 to 32% |
| Engineering, 1 weapon | 67 to 68% | 61 to 62% | 77 to 81% |
| Cannot-die bot, 6 weapons at tier 1.3 | 83% | 79% | 84% |

Real winning Brotato runs land about 100% of the health sent. Only mid and high flights complete whole waves within 10 flights, so skim and low cells have no figure. The two-weapon builds are not full builds, so these are comparisons between tricks, not balance targets. The Blast pair lands a third of the health sent at waves 10 and 15, the lowest of the four.

**Run cost:** about 40 minutes of one fast core per trick, nearly all in mid and high flights at wave 15 (13 s of air each, with the biggest crowd). Split seeds across cores with `--seed0`, `--raw` and `--merge` for later runs.

### Step 1: the tricks themselves

**Goal:** the four tricks do what the designer has decided, before anything is built on them.

Build:
- Front flip: no invulnerability, only the small shove at the breach.
- Remove the trick label's "+30% damage" claim, which does nothing to the ported weapons.

| Check | Pass when |
|---|---|
| Front flip | A Front flip flight takes damage from a touch in its first second; enemies within the shove radius are pushed out and no others are |
| Front flip's cost | Hits per flight with the new Front flip are reported beside checkpoint 0's, for Close weapons in every style. On 2026-10-31 the invulnerable version cut hits by 21 to 28%, so expect most of that to go. |
| Other tricks | Backflip, Corkscrew and Belly flop measure the same as checkpoint 0 |
| Setting off | With `ladders` off, `qa/port.cjs` gives the same results as checkpoint 0 |

**Designer plays** three waves with Close weapons: does Front flip feel right for a melee trick without the invulnerability? Is the shove the right size: enough room to breach, with enemies still inside Close reach?

#### Step 1 results (2026-11-10)

**Built** in `~/Projects/icarus-brotato` (uncommitted), behind the new setting `DEMO.tune.ladders` ("Trick ladders plan", on by default, in Settings):
- Front flip keeps its shove (enemies within 2.5 m pushed out at 30 m/s for 1 s from the breach) and loses its invulnerability. Its name on screen is now "Shove".
- No trick changes weapon damage. The "+30% <type>" tag in flight, the type names under the keys, the title screen line "it boosts one weapon type" and the Trick Lab's "Boosts … weapons" are gone; each shows the trick's ability instead.
- The Trick Lab slider "Invulnerable for (s)" now reads "Shove lasts (s)".
- Files: `source/demo.js` (setting, title text), `source/tricks.js`, `source/lab.js`; tests in `qa/tricks.cjs`; `--ladders=0` switch in `qa/jumpstyle.cjs`. Results in `qa/ladders/step1/`.

| Check | Result |
|---|---|
| Front flip rule | **Pass.** A hit in the first second costs HP; enemies within the radius are shoved and no others (new checks in `qa/tricks.cjs`) |
| Front flip's cost | **Recorded, small.** Below |
| Other tricks | **Pass.** Backflip, Corkscrew and Belly flop give identical results with the setting on and off (waves 5 and 10, same command, 32 runs each). Wave 15 was not compared that way; the code path for them is unchanged |
| Setting off | **Pass.** `qa/port.cjs` 35 of 35; `qa/tricks.cjs` 33 of 33, run three ways: old weapons, armoury with ladders off (the old Charge check passes), armoury with ladders on |
| Screens | Checked in the browser (`scripts/playtest.mjs`, frames in `qa/ladders/step1/playtest/`): the keys read Time slow, Repulse, Shockwave, Shove; the in-flight tag reads "Corkscrew · Time slow" |

**Front flip's cost (hits per flight, change against no trick; Close weapons, 16 seeds × 10 flights):**

| Wave | Style | Old Front flip (invulnerable) | New Front flip (shove only) |
|---|---|---|---|
| 5 | Low | −9% (inside the noise) | −14% (inside the noise) |
| 10 | Skim | **−30%** | **−25%** |
| 10 | Low | −2% | **−13%** |
| 10 | Mid | **−7%** | **−6%** |
| 10 | High | −5% | **−6%** |
| 15 | Skim | **−44%** | **−30%** |
| 15 | Low | **−12%** | **−7%** |
| 15 | Mid | **−7%** | −2% |

Bold is outside the 95% band. The two runs used different seed batches, so their no-trick numbers differ slightly; compare the changes, not the raw hit counts.

**What this means:** the shove was doing most of Front flip's protecting. Without invulnerability it still cuts hits by a quarter to a third on skims at waves 10 and 15 and keeps a small cut elsewhere. It now passes the old "never worse" test (the invulnerable version failed it, losing up to 10% damage in three cells) and stays "clearly safer" on skims.

**Process note:** the harness shares one random stream across a whole run, so the same seeds only reproduce under the same command. Identity checks must compare the same command with the setting on and off, not a short run against a long one.

### Step 2: the shop report

**Goal:** proof of what each trick and weapon did, so later steps can be judged in play.

Build: a panel in the shop for the wave just flown. Per trick: flights, air seconds, kills, hits taken. Per weapon: kills, damage landed, share lost to overkill. No forecasts and no "what if" numbers.

| Check | Pass when |
|---|---|
| Adds up | Per-trick kills sum to the wave's kills exactly; per-weapon damage sums to total damage landed |
| Matches the log | The numbers equal the flight log for the same run |
| Shop tests | `qa/shop-ui.cjs` and `qa/port.cjs` still pass |
| Readable | Each row fits one line at the shop's normal size |

**Designer plays** two waves: from the report alone, can you say which trick and which weapon carried the wave, in under ten seconds?

### Step 3: trick levels scale the weapons

**Goal:** the key you hold becomes the build decision, and your weapons grow with the tricks you fly.

Build:
- One XP track on Brotato's curve. XP earned in a flight is counted for that flight's trick, and each level-up goes to the trick that earned the most XP in it.
- Each trick's level sets its scaling stat from the section 1 table: Front flip sets Close, Backflip sets Shot, Corkscrew sets Blast. The weapon damage formula itself does not change. **Belly flop is tabled (2026-11-12):** it does not set Harvesting or Engineering in this step; those two stay where they are today (level-ups and items) until the designer reopens Belly flop [ASSUMED, confirm at checkpoint 3].
- Close, Shot and Blast come off the items.
- Close, Shot and Blast leave the level-up screen (Engineering and Harvesting stay while Belly flop is tabled). For this step only, the old screen stays for the other stats; step 4 replaces it.
- The +1 Max HP per level that the port gives today follows the total of the four trick levels.
- Every weapon card names the trick it scales with and shows its damage at your current trick levels.
- The shop shows each trick's level and progress.
- XP from a flight with no trick waits for the next trick flown (settled 2026-11-12). A Belly flop flight's XP is treated the same way while Belly flop is tabled [ASSUMED, confirm at checkpoint 3].

| Check | Pass when |
|---|---|
| Accounting | Every point of XP in a run is credited to exactly one trick |
| Damage rule | For every weapon and tier, the damage on the card and the damage dealt equal the port's formula with the trick-level stat in place, exactly |
| Screen | The level-up screen never offers a stat that a trick now owns |
| Power curve | The one-trick bot's scaling stat at waves 5, 10, 15 and 20 matches the section 1 table for its trick level (it is set from it), and its trick level is within 2 of the real runs' level at that wave |
| Level count | Every bot, whatever tricks it flies, has the same number of level-ups as at checkpoint 0, within 1 |
| Damage against health | For a one-trick bot, damage landed as a share of health sent at waves 5, 10 and 15 is no lower than at checkpoint 0 |
| Economy | Pearls earned per wave match checkpoint 0 within 5% |
| Suites | `qa/port.cjs` and `qa/tricks.cjs` pass |

**Designer plays** to wave 8:
- Do the trick levels in the shop match what you flew?
- When a trick levelled, could you tell its weapons got stronger on the next wave?
- Did you ever fly a trick to grow it when another trick was safer?

### Step 4: the skill trees

**Goal:** levelling a trick is a clear, authored choice, and the general level-up screen is gone.

Build: one tree per trick, shown whole in the shop. Each level in a trick buys one upgrade in that trick's tree. The old level-up screen is removed.

Draft content, for the designer to redraw. It places every stat the old screen offered.

| Trick | Branch 1 | Branch 2 | Branch 3 | The trick itself |
|---|---|---|---|---|
| Front flip (melee) | Reach | Swing rate | Body: Max HP, Armour, Life steal | A wider or stronger shove |
| Backflip (ranged) | Range | Extra shots, pierce, bounce | Attack speed | A wider Repulse |
| Corkscrew (elemental) | Burn and its spread | Blast size | Damage %, Crit | A longer slow |
| Belly flop (economy) | Pearls | Pickup range, Luck | Regen | A bigger landing knockback |

Two fire-rate effects already exist as a prototype and can be tree upgrades if wanted: a burst after each breach, and fire rate that builds with air time (branch `prototype/rush-kite-2026-11` in `~/Projects/icarus`, checks in `qa/engines.cjs` there).

| Check | Pass when |
|---|---|
| Each upgrade works | One rule check per upgrade: the stat or behaviour changes by the stated amount |
| Each upgrade matters | Taken alone at wave 10, it moves at least one measure outside the noise band in its trick's home style |
| Tree rules | An upgrade can be bought only with a level in its own trick, and only when it can be reached |
| Tree size | A one-trick run to wave 20 fills about two thirds of that trick's tree [TUNE] |
| No collapse | Across waves 5, 10, 15, 20 and low, mid, high styles, the best single trick is not the same in every cell, and two are within 10% of each other in most cells. **If one trick wins everywhere, the design has failed.** |
| One key forever | A bot with mixed weapons that picks tricks by need flies no single trick for more than 80% of flights after wave 5 [TUNE] |
| Skims | No upgrade pays more than 1.5 times as much per air second on skims as on mid arcs [TUNE] |

**Designer plays** one run to wave 10:
- At each level, did you know which upgrade you wanted without working it out?
- After each one, could you say what changed on the next wave?

### Step 5: stats and items

**Goal:** a shop where you know what to buy.

Build, each line subject to its open decision in section 3:
- Class set bonuses are removed.
- Crit and Dodge are cut, only if the designer wants fewer stats. Damage % and Attack speed stay.
- Every remaining item is tagged to a trick or to the body, and its card states its effect on your loadout in plain units, for example "Your 4 Shot guns reach 20 → 24 m".
- The shop's lean toward owned classes points at the tricks you have levelled instead.
- Brotato's shop rules stay: four offers, reroll, lock, sell, combine, prices.

| Check | Pass when |
|---|---|
| Card is true | For every item, the number on the card equals the real change after buying it |
| Card is short | One effect line and at most one cost on every card |
| Enough to buy | At least 8 items for each trick and for the body [TUNE]; the number of items left on sale is recorded |
| Shop rules | The price, reroll, lock, tier-odds and combine checks in `qa/port.cjs` still pass |

**Designer plays** ten shops: for each offer, say buy or skip and why within five seconds. Pass when "I don't know" comes up for no more than 1 offer in 10 [TUNE].

### Step 6: the whole run

**Goal:** the run holds together from wave 1 to wave 20 for more than one build.

Build nothing new. Tune numbers only.

| Check | Pass when |
|---|---|
| Six builds | Four one-trick bots and two mixed bots play full runs with `qa/port.cjs --runs` |
| Balance | No build clears waves at more than 1.5 times the rate of another [TUNE] |
| Curve | Per-wave crowd, hits taken and income stay inside the bands recorded at checkpoint 0, or the change is explained here |
| Brotato's outcomes | Winning bot runs kill about everything sent (real wins: about 100%), and kills, damage dealt and gold per wave stay within the real wins' per-wave range in the tracker file |
| Early waves | Recorded: the first wave at which a trick level shows in kills |

**Designer plays** three full runs with a different main trick each time: was each run a different game?

### Step 7: tidy and record

- Remove the chips × mult panel and any label that no longer matches the rules.
- Update `docs/CURRENT_STATE.md`, `docs/INDEX.md` and `docs/BROTATO_PORT.md`; add the decisions to `docs/DECISIONS.md`.
- Commit, with the designer's go-ahead.

| Check | Pass when |
|---|---|
| All suites | Every suite that passed at checkpoint 0 passes |
| Playtest | `scripts/playtest.mjs` title, flight and shop modes pass |
| Docs | A fresh session can find this system from `docs/CURRENT_STATE.md` |

---

## 6. Known risks

| Risk | Where it is caught |
|---|---|
| Brotato's numbers assume a weapon nearly always has a target; in ICARUS it may not | Step 0, target in reach; step 3, damage against health |
| A level is worth more here than in Brotato: it gives scaling and a tree pick, where Brotato gives one pick | Step 3, power curve; step 6 |
| The Brotato tables rest on 9 Brawler and 4 Ranger wins, and no Mage runs yet | Step 6; read the 5 Mage runs (IDs in the tracker file) before step 3 builds Corkscrew |
| One key forever: flying one trick levels it, which makes flying it better still | Steps 3 and 4 |
| Belly flop has almost no weapons of its own, so it may be a trick nobody levels, or one everybody levels early for pearls | Checkpoint 0 and step 6 |
| Corkscrew has only 8 to 10 weapons | Step 4, no collapse |
| Front flip protects much less without invulnerability, so the melee trick becomes the riskiest one to fly | Step 1, Front flip's cost |
| Anything in a tree that pays per breach is multiplied by skims | Step 4, the skims check |

---

## 7. Checkpoint log

| Checkpoint | Date | Result | Designer's note |
|---|---|---|---|
| 0 Baseline and tools | 2026-11-10 | Passed. Automated checks and measurements done; one bot fix in `qa/port.cjs` | Confirmed the build target and Belly flop as Harvesting ("Yes, both") |
| 1 The tricks themselves | 2026-11-12 | Passed. Automated checks and measurements done 2026-11-10 (tag `ladders-cp1-auto`) | "Does Front flip feel right with the shove only, and is the shove the right size?": "yes" |
| 2 Shop report | | | |
| 3 Trick levels scale the weapons | | | |
| 4 The skill trees | | | |
| 5 Stats and items | | | |
| 6 The whole run | | | |
| 7 Tidy and record | | | |

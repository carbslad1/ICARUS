# ICARUS trick levels and skill trees: build guide

**Written 2026-11-10 with the designer; revised the same day.** This is the guide document for this work. It lists what to build, in order, and the checks that must pass before the next step starts. Update it when a decision changes; sign off each checkpoint in the log at the bottom.

**Build target:** `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11`. This is the build that has Brotato's weapons, stats and shop. `~/Projects/icarus-slots` has the same tricks, movement and enemies but the older slot-items shop. Confirm the target at checkpoint 0.

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

The spawn schedule, enemy health, weapon damage and fire rate are Brotato's, so the amount of scaling a build needs at each wave is already known. It is what winning Brotato builds have. These are real winning runs at Danger 0 from the Run Tracker (`brotato-reference/map/tracker_runs.json`, one run per character, so a small sample).

| Run | Stat | Wave 10 | Wave 20 | Level at wave 10 | Level at wave 20 |
|---|---|---|---|---|---|
| Brawler | Melee damage | 21 | 52 | 12 | 21 |
| Ranger | Ranged damage | 22.5 | 33 | 12 | 21 |
| Mage | Elemental damage | 25 | 81 (with the character's own bonus) | 13 | 23 |
| Engineer | Engineering | 31 | 56 | 13 | 25 |

Across all twelve runs the level is 11 to 13 at wave 10 (one run at 8) and 21 to 25 at wave 20 (one at 15, one at 30). Brotato's XP rule is (level + 3)² for the next level.

**So a trick level is worth about 2 Close, 1.5 Shot or 2 Blast.** A one-trick player on Brotato's XP curve is then where these runs are:

| Trick level | Close at 2 per level | Brawler | Shot at 1.5 per level | Ranger | Blast at 2 per level | Mage |
|---|---|---|---|---|---|---|
| 12 (wave 10) | 24 | 21 | 18 | 22.5 | 24 | 25 |
| 22 (wave 20) | 44 | 52 | 33 | 33 | 44 | 81 |

Three things Brotato's numbers also say, which this plan has to respect:

- **Flat scaling is only one of Brotato's routes to damage.** Five of the twelve winning runs end with almost none of it and win on Damage % (106 to 163%) and Attack speed (57 to 236%). Those two stats must stay available, in the trees or on items.
- **These totals include items.** In Brotato the stat comes from level-up picks and items together. If trick level gives the whole amount, items must stop selling the same stat, or builds will have about twice what Brotato's do.
- **Brotato has one level track.** Four separate tracks on the same curve would give a player who spreads XP evenly about 13 levels in each trick by wave 20: 52 level-ups against Brotato's 23.

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
| 2026-11-10 | **One XP track on Brotato's curve.** The number of level-ups is Brotato's. Each level-up goes to the trick that earned the most XP in it. |

Earlier rules that still bind this work: damage comes only from weapons; tricks never deal damage; nothing is read during a flight or a dive; no freezes or slow motion on the player; entries are never judged; feedback lives on the dolphin and the guns, never in a corner panel; dodging is never something you buy.

---

## 3. Open decisions, with a recommendation

Each is settled at the checkpoint named. Until then the recommendation is what gets built.

| Question | Recommendation | Settled at |
|---|---|---|
| What does Belly flop's level scale? No weapon scales with an economy stat. | Its level is Harvesting (pearls at the end of each wave), and it stands in for Engineering on the three weapons that use it. | Checkpoint 0 |
| How much scaling does one trick level give? | 2 Close, 1.5 Shot, 2 Blast per level, from the winning Brotato runs in section 1. | Checkpoint 3 |
| Where does XP go on a flight with no trick? | It waits and is added to the next trick you fly. | Checkpoint 3 |
| Belly flop multiplies XP by 1.5 today. With rule 1 that would feed itself. | Belly flop multiplies pearls only. | Checkpoint 3 |
| What shape is a tree? | Three branches of four upgrades per trick, all visible in the shop. Each level buys one upgrade you can reach. Nothing random. | Checkpoint 4 |
| Where do the other level-up stats go (Max HP, Armour, Regen, Attack speed, Reach, Luck and the rest)? | Into the trees, by theme. Section 5, step 4 has a draft. | Checkpoint 4 |
| Items sell Close, Shot and Blast today (20, 18 and 15 item lines out of 105 items). | Those lines come off the items, so trick level is the only source of scaling. Brotato's totals already include items, so keeping both would roughly double them. | Checkpoint 3 |
| Do Brotato's class set bonuses stay? | No. The trees take their place. | Checkpoint 5 |
| Are any stats cut? | Damage % and Attack speed stay: five of twelve winning Brotato runs depend on them. Crit and Dodge could go, but only if the designer wants fewer stats. | Checkpoint 5 |

---

## 4. How a checkpoint works

A step is finished only when all four are true, in this order:

1. **The automated checks pass** on the built file, and the suites that passed before still pass.
2. **The measurements are recorded** in the step's results table in this document, with the command and date.
3. **The designer has played it** and answered the step's play questions.
4. **The designer says go.** The log at the bottom gets a dated line.

If a check fails, the step is changed and re-run. A threshold is never moved to make a step pass; if a threshold is wrong, the designer changes it here first, with a reason.

### Standing rules for every step

- Every new behaviour sits behind one setting, `DEMO.tune.ladders`. With it off, the game must behave exactly as it does today.
- One change at a time. Measure before and after on the same seeds.
- Use at least 16 seeds and 10 flights per style before deciding anything from the jump-style harness. Smaller runs moved by up to 10 points on 2026-10-30.
- Judge by damage landed, kills, time to kill, crowd on screen and hits taken. Never by damage fired alone: about 37% of fired damage is lost to overkill.
- Rebuild with `node source/build.cjs`. Never edit `ICARUS-demo.html` by hand.
- Back up `reviews/` before running suites and restore it afterwards.
- Thresholds marked [TUNE] were chosen for this plan and need the designer's confirmation.

### State of the checks today (run 2026-11-10 on the port build)

| Check | Result |
|---|---|
| `node qa/port.cjs` | 35 of 35 pass |
| `node qa/tricks.cjs` | 10 of 10 pass, but it runs with the port switched off |
| `node qa/jumpstyle.cjs front` | **Crashes.** Its gun table lists the old weapons, which the port removes. |
| Bot runs (`qa/port.cjs --runs`) | Not re-run today. The port's notes of 2026-11-08 say bots die on waves 4 to 6, because they hold 8 m from enemies and the starter weapon reaches about 6 m. Steps 3 and 6 need a bot that finishes a run. |

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
| Levels match Brotato | The cannot-die bot's level is 11 to 13 at wave 10 and 21 to 25 at wave 20, as in the real runs. If not, the XP income is off and is fixed before step 3. |
| Target in reach | For one Close and one Shot weapon per style: the share of air time with a target in reach. This is the one factor Brotato's numbers do not cover. |
| Damage against health | Damage landed per wave as a share of the health sent, at waves 5, 10 and 15. One real winning run had 99%, 102% and 138%. |

**Designer:** confirm the build target and the Belly flop decision.

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
- Each trick's level sets its scaling stat at the section 1 rate: Front flip sets Close, Backflip sets Shot, Corkscrew sets Blast, Belly flop as decided at checkpoint 0. The weapon damage formula itself does not change.
- Close, Shot and Blast come off the items.
- Close, Shot, Blast (and Engineering and Harvesting, if Belly flop takes them) leave the level-up screen. For this step only, the old screen stays for the other stats; step 4 replaces it.
- The +1 Max HP per level that the port gives today follows the total of the four trick levels.
- Every weapon card names the trick it scales with and shows its damage at your current trick levels.
- The shop shows each trick's level and progress.
- The two open decisions in section 3 about no-trick flights and Belly flop's XP.

| Check | Pass when |
|---|---|
| Accounting | Every point of XP in a run is credited to exactly one trick |
| Damage rule | For every weapon and tier, the damage on the card and the damage dealt equal the port's formula with the trick-level stat in place, exactly |
| Screen | The level-up screen never offers a stat that a trick now owns |
| Power curve | The one-trick bot's scaling stat at waves 10 and 20 is within 20% of the matching Brotato run in section 1 |
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
| Brotato's outcomes | Winning bot runs kill about everything sent (real wins: about 100%), and damage landed against health sent follows the real run's 99%, 102%, 138% at waves 5, 10, 15 |
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
| The Brotato table is one run per character | Step 6; add runs from the Run Tracker if a target looks wrong |
| One key forever: flying one trick levels it, which makes flying it better still | Steps 3 and 4 |
| Belly flop has almost no weapons of its own, so it may be a trick nobody levels, or one everybody levels early for pearls | Checkpoint 0 and step 6 |
| Corkscrew has only 8 to 10 weapons | Step 4, no collapse |
| Front flip protects much less without invulnerability, so the melee trick becomes the riskiest one to fly | Step 1, Front flip's cost |
| Anything in a tree that pays per breach is multiplied by skims | Step 4, the skims check |

---

## 7. Checkpoint log

| Checkpoint | Date | Result | Designer's note |
|---|---|---|---|
| 0 Baseline and tools | | | |
| 1 The tricks themselves | | | |
| 2 Shop report | | | |
| 3 Trick levels scale the weapons | | | |
| 4 The skill trees | | | |
| 5 Stats and items | | | |
| 6 The whole run | | | |
| 7 Tidy and record | | | |

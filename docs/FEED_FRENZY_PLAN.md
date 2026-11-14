# ICARUS feed and frenzy: the baseline plan

**Locked by the designer on 2026-11-15** ("Yes, lock it"), after three rounds of questions on 2026-11-14. This is the guide document for the current work. It replaces `docs/TRICK_LADDERS_PLAN.md`, which is paused after its step 1.

**Build target:** `~/Projects/icarus-brotato`, branch `prototype/brotato-port-2026-11`.

**Why a baseline:** the designer, 2026-11-14: "we are getting stuck on iterative changes and not progressing the build of the game. I feel we should try and keep as many variables as possible stable and then build from there." So this plan builds the smallest version of one idea, holds everything else still, and gets it played to wave 10 before anything is added.

---

## 1. The rules

1. **Every jump has two halves, split at the peak.** Rising is **feed**. Falling is **frenzy**.
2. **Feed:** each kill while rising adds your Feed total to a multiplier. The multiplier starts each jump at 1.
3. **Frenzy:** while falling, every weapon's fire rate is multiplied by that number, up to your Frenzy total.
4. **Landing resets the multiplier to 1.**
5. **Every weapon does both.** Feed and Frenzy are two totals across the weapons you hold. No weapon is "a feed weapon" or "a frenzy weapon", so no gun can take kills away from another.
6. **Tiers raise them in turn.** Tier 1 has a little of both, tier 2 raises Feed, tier 3 raises Frenzy, tier 4 raises Feed. An upgrade always means "builds faster" or "goes higher".
7. **One thing grows within a wave: jump speed.** Each wave starts at 30 m/s and each jump adds 5 m/s, up to that wave's top speed (30 m/s at wave 1, 5 more each wave). Longer jumps give more time to feed and more time to spend. Nothing else carries from jump to jump.
8. **You start with one Harpoon.** Up to six weapons, as now.

Everything new sits behind one setting, `DEMO.tune.feed`. With it off the game plays as it does today.

## 2. What does not change

Held still on purpose. A change to any of these waits for the baseline to be signed.

- Movement and swim physics, camera, controls.
- Enemies, enemy health, Brotato's spawn schedule and wave clock.
- The four tricks as they play today (Front flip is a shove only), and which weapon type each belongs to.
- The ported weapons' own numbers, the shop rules (four offers, reroll, lock, sell, combine, prices), items, level-ups and stats. Taking stats out broke survival on 2026-11-06, so they stay.
- Six weapon slots; weapons fire on their own for the whole jump.

Standing rules in `docs/DESIGN_RULES.md` still bind: damage only from weapons, nothing to read in flight, feedback on the dolphin and the guns, no freezes or slow motion on the player.

## 3. Decisions (designer)

| Date | Decision |
|---|---|
| 2026-11-14 | **Feed and frenzy is the direction.** "I have settled on a final option. a feed and frenzy mechanic. still 6 weapons." Feed builds a multiplier; frenzy spends it. |
| 2026-11-14 | **Stable facts restated:** "tricks are tied to a weapon class. jumps increase speed by 5ms/ cap increases by 5 each wave." "default weapon is harpoon." |
| 2026-11-14 | **Feed is the ascent, frenzy is the descent, fixed.** His reason: frenzy kills stealing feed "will annoy players". This drops the earlier idea of choosing a phase per weapon. |
| 2026-11-14 | **Tiers raise feed and frenzy in turn,** "feed, frenzy, feed, frenzy ie T1-T4". |
| 2026-11-14 | **Items and characters are where unique feed and frenzy rules go,** later. |
| 2026-11-15 | **The start weapon is the old Harpoon** ("old harpoon"), not a ported weapon. |
| 2026-11-15 | **The baseline in section 1 is locked.** It includes the engineer's proposals he accepted with it: two halves split at the peak with no apex phase; Feed and Frenzy as totals; tier 1 has some of both; the multiplier acts on fire rate only; it resets on landing; jump speed is the only growth within a wave. |

## 4. Parked

Ideas raised and deliberately not in the baseline. One at a time after the baseline is signed, each behind its own setting and measured against the baseline.

1. Weapons that lean feed-heavy or frenzy-heavy.
2. Choosing feed or frenzy per weapon at purchase, and choosing its phase (ascent, apex, descent), with merges widening the phase.
3. The multiplier also raising damage. (On 2026-11-06 about two thirds of extra damage was lost to overkill, while extra fire rate landed.)
4. Some of the multiplier carrying to the next jump.
5. Item and character rules about feed and frenzy.
6. Belly flop's economy role (tabled 2026-11-12).
7. Trick levels and skill trees (`docs/TRICK_LADDERS_PLAN.md`, paused at step 1), including its shop report.

A new idea during the baseline is added to this list, not to the build.

## 5. Open numbers

All [TUNE]: first values to build with, set properly in step 3 and confirmed by the designer there.

| Number | First value | Notes |
|---|---|---|
| Feed per weapon | Tier 1: 2% per kill. Tiers 2 and 4: +2% each | Six tier 1 weapons would add 12% per kill |
| Frenzy per weapon | Tier 1: +0.25 to the cap. Tier 3: +0.5 | Cap = 1 + the total. One tier 1 weapon: 1.25. Six: 2.5 |
| Jump ramp | Start 30 m/s, +5 per jump, capped at the wave's speed | The designer's rule from the 2026-11-06 lab |
| Baseline shop pool | Trident, Tuna Gaff (Close); Spitter, Pressure Cannon (Shot); Squid Launcher, Riptide Carbine (Blast) | The six weapons measured at checkpoint 0 of the old plan, two per type. Only 4 of 48 weapons scale with Blast |

## 6. Facts this plan rests on

Checked in the code and docs on 2026-11-15.

| Fact | Source | What it means |
|---|---|---|
| Launch speed is fixed for a whole wave: 30 m/s at wave 1, +5 per wave. There is no per-jump ramp in this build. | `source/demo.js` (the 20 Oct note); `docs/GAME_MAP.md` | Rule 7 has to be built (step 1). It existed only in the Core Loop Lab on the slots branch. It changes a rule recorded as locked, on the designer's instruction of 2026-11-14 |
| No weapon in the ported armoury is called Harpoon. The port's starters are Tuna Gaff, Pressure Cannon and Brine Sprayer. The old Harpoon (long shots, 30 m reach) is still in the code from before the port. | `source/armory-data.js`, `source/demo.js` | **Answered 2026-11-15: the old Harpoon**, with its own numbers, is the start weapon |
| Every ported weapon has tiers 1 to 4, and combining two of the same tier makes the next tier. | `source/demo.js` | Rule 6 needs no new merge rule |
| One fire-rate number already speeds up every gun's cooldown. | `source/demo.js` | Frenzy multiplies it while falling |
| Close weapons had a target in reach only 4% of air time on skims at wave 5; ranged weapons 55 to 97%. | Old plan, checkpoint 0 (2026-11-10) | A build with only Close weapons may barely feed on low jumps. Measured in step 3 |
| Kills are limited by how many enemies arrive; six plain harpoons cleared about 70% of arrivals at wave 10. | Core Loop Lab, 2026-11-06/07, an older build with one weapon type | The idea behind the floor and ceiling in step 3. To be re-measured, not trusted |

## 7. How a checkpoint works

As in `CLAUDE.md`. In short: the gate passes (`node qa/gate.cjs --full`), the measurements are written into this document, the work is committed and tagged `feed-cpN-auto`, and at a play checkpoint the designer plays and says go (tag `feed-cpN`). His answers go into the log word for word. A threshold is never moved to make a step pass.

**The freeze:** from now until checkpoint 3 is signed, no rule in section 1 or 2 changes. If play shows a rule is wrong, the step stops and the designer decides; the engineer does not patch around it.

## 8. The steps

### Step 0: facts and a fast measure (signed by automated checks)

**Goal:** know today's numbers for the baseline weapons, in minutes rather than hours.

Build:
- Make the measurement quick (the designer dislikes long runs): each flight on its own random stream so on and off runs use the same seeds, and a short smoke run.
- Record today's floor with `feed` off: for the six baseline weapons and the start weapon, kills against arrivals and crowd on screen at waves 5, 10, 15 and 20.
- Restrict the shop to the baseline pool when `feed` is on.

| Check | Pass when |
|---|---|
| Fast | A full on/off comparison for one build finishes in under 5 minutes [TUNE] |
| Paired | The same seeds give the same flights with a setting on and off, up to the first moment the setting changes anything |
| Floor recorded | The table of kills against arrivals is in this document |
| Gate | `node qa/gate.cjs --full` passes unchanged |

**Designer:** answered 2026-11-15: the start weapon is the old Harpoon ("old harpoon").

#### Step 0 results (2026-11-15)

**Built** in `~/Projects/icarus-brotato`, behind `DEMO.tune.feed` (on by default; "Feed and frenzy baseline" in Settings):
- The old Harpoon is back, in the armoury's format with its own numbers, and is the only start weapon. Left out: its extra pierce on a critical hit (no armoury rule for it) [ASSUMED]; its price tiers copy Pressure Cannon's [ASSUMED].
- The shop sells only the pool: Harpoon, Trident, Tuna Gaff, Spitter, Pressure Cannon, Squid Launcher, Riptide Carbine. The Harpoon is in the pool so it can be combined.
- Fixed on the way: the wave 1 freeze (ported ranged weapons had no bullet colour, so their first shot crashed the drawing); the title screen crashing with the Harpoon back; "undefined" on the start-weapon cards.
- `qa/feed.cjs`: 7 checks (start weapon, its numbers, the pool, combining, setting off). In the gate.
- `qa/floor.cjs`: the floor harness. Every (weapon, wave, seed) run starts fresh from its own seed, so a result never depends on what else is in the command; `--vs` runs two settings in one paired batch; `--quick` is the smoke tier; `--check` proves a cell repeats.
- Speed: the enemies' push-apart step was 44% of all simulation time. It now skips far pairs before the square root, which halves a heavy run (28 s to 14.6 s). Results are bit-identical: both rule gates and 24 floor runs match their earlier output exactly.
- The camera and enemy gates now run with `feed` off, so they keep proving the locked movement and enemies are unchanged. With `feed` on their numbers move, because the default weapon changed (more kills); that is not a code change in either system.

| Check | Result |
|---|---|
| Fast | **Not met, narrowly.** A full on/off comparison for one build (4 waves × 6 seeds × 2 settings) took 338 s with 4 workers, against a 300 s target, while another game was using the machine (load 11). The smoke tier takes 36 s. `--seeds=4` would bring the comparison to about 4 minutes |
| Paired | **Pass.** The same 24 cells gave identical results with a setting on and off (`ladders`, which the bot never triggers), and a cell gives the same result alone or inside another batch |
| Floor recorded | **Pass.** Below |
| Gate | **Pass.** `node qa/gate.cjs --full`, 2026-11-15 |

**The floor** (`node qa/floor.cjs`, 2026-11-15; raw in `qa/feed/step0-floor.json`). Six copies of one weapon at the wave's tier (T1 at wave 5, T2 at 10, T3 at 15, T4 at 20 [ASSUMED]), no stats, no items, no feed or frenzy; a cannot-die bot flying mid arcs and holding 8 m from enemies; one whole wave; 6 seeds. "Killed" is kills against arrivals. Crowd is enemies on screen in the air (the game caps it at 100).

| Weapon | Wave 5 killed / crowd | Wave 10 | Wave 15 | Wave 20 |
|---|---|---|---|---|
| Harpoon | 96% / 4 | 94% / 13 | 97% / 14 | 99% / 4 |
| Trident | 71% / 21 | 63% / 60 (hits 100) | 77% / 62 (hits 100) | 92% / 18 |
| Tuna Gaff | 74% / 18 | 62% / 60 (hits 100) | 76% / 64 (hits 100) | 90% / 21 |
| Spitter | 84% / 14 | 70% / 48 (hits 100) | 79% / 59 (hits 100) | 92% / 20 |
| Pressure Cannon | 91% / 9 | 65% / 55 (hits 100) | 71% / 62 (hits 100) | 97% / 11 |
| Squid Launcher | 89% / 8 | 75% / 34 | 80% / 47 | 98% / 7 |
| Riptide Carbine | 86% / 13 | 68% / 54 (hits 100) | 74% / 64 (hits 100) | 91% / 21 |

Arrivals per wave: about 145 at wave 5, 310 to 400 at wave 10, 370 to 485 at 15 and 280 at 20 (fewer get in once the screen is full). Spread between seeds is 1 to 4 points, 8 at most.

**What this says for step 3 (not decided):**
- **The Harpoon is far stronger than the other six.** Six Harpoons kill 94 to 99% of every wave with no multiplier, where the others kill 62 to 80% at waves 10 and 15. Its 30 m reach (the others reach 6 to 16 m) and two-enemy pierce are why. If the Harpoon stays as it is, a Harpoon build has nothing left for frenzy to do.
- **Waves 10 and 15 are where the floor is lowest** for every other weapon: the screen fills to its 100-enemy cap. That is the room feed and frenzy has to fill.
- **Wave 20 is easier than 15** for every weapon at tier 4. Whether that holds with a real build is unknown.
- These are pure builds of one weapon, not what a player holds, and the bot never uses tricks or moves the way a person does.

### Step 1: the jump ramp (play checkpoint)

**Goal:** jumps get faster through a wave, as rule 7 says, before anything is built on it.

Build: each wave's first jump launches at 30 m/s; each jump after adds 5 m/s, up to that wave's top speed. Behind `feed`.

| Check | Pass when |
|---|---|
| Rule | Jump n of wave w launches at min(30 + 5 × (n − 1), 30 + 5 × (w − 1)) m/s, exactly |
| Wave 1 | Plays exactly as today (its cap is 30) |
| Setting off | Every suite gives the same results as before |
| Recorded | Crowd on screen and hits taken at waves 5, 10 and 15 beside step 0's, since early jumps in a wave are now shorter |
| Camera | `qa/camera-rules.cjs` matches its pinned results |

**Designer plays** waves 1 to 6: does each wave feel like it builds? Is the slow first jump of a late wave a problem?

#### Step 1 results (2026-11-15)

**Built** behind `feed` (on by default): each wave's first jump launches at 30 m/s and each finished flight adds 5 m/s, up to the wave's own speed. The count starts again every wave. `source/demo.js` wraps the engine's wave-speed function; with `feed` off it is untouched. `feedRamp: 0` turns only the ramp off, for measuring.

| Check | Result |
|---|---|
| Rule | **Pass.** Real bot jumps at waves 1, 4, 6 and 10 launch at exactly min(30 + 5(n − 1), 30 + 5(w − 1)) m/s, within 0.5 m/s. Wave 6 reads 30, 35, 40, 45, 50, 55, 55, 55 (`qa/feed.cjs`) |
| Wave 1 | **Pass.** Every jump at 30 m/s |
| Setting off | **Pass.** Every jump at the wave's speed; the camera and enemy gates match their pinned results exactly |
| Recorded | Below |
| Camera | **Pass** with `feed` off (pinned). With the ramp on, early jumps are slower than the cases the camera gate tests, so it adds no new speeds |

**Crowd and hits, ramp off against on** (`node qa/floor.cjs --weapons=harpoon,tuna_gaff --waves=5,10,15 --seeds=4 --tune='{"feed":1,"feedRamp":0}' --vs='{"feed":1}'`; raw in `qa/feed/step1-ramp.json`; six copies of one weapon, cannot-die bot, mid arcs):

| Build | Wave | Killed: off → on | Crowd in the air: off → on | Hits per wave: off → on |
|---|---|---|---|---|
| Harpoon | 5 | 97% → 95% | 4.3 → 4.2 | 77 → 62 |
| | 10 | 94% → 95% | 13.6 → 12.5 | 199 → 185 |
| | 15 | 97% → 97% | 14.0 → 14.1 | 259 → 213 |
| Tuna Gaff | 5 | 73% → 79% | 19.2 → 17.7 | 72 → 74 |
| | 10 | 62% → 63% | 59.9 → 62.3 | 156 → 143 |
| | 15 | 75% → 73% | 65.2 → 72.5 | 276 → 229 |

**What this means:** the ramp barely changes how much of a wave gets killed (within about 6 points, about the seed spread). The bot takes somewhat fewer hits with it, up to 18% fewer at wave 15, probably because short early jumps spend less time among enemies; the wave clock counts air time, so a wave lasts the same air time either way. The crowd is a little larger for the Tuna Gaff at wave 15. The feel of a wave that starts slow is the designer's call.

### Step 2: feed and frenzy (play checkpoint)

**Goal:** the loop itself, with first-guess numbers.

Build:
- Rules 1 to 6: the multiplier, the two halves, the reset, Feed and Frenzy totals from the weapons' tiers.
- Showing it without text: the guns visibly charge while rising and visibly let go while falling, stronger as the multiplier grows. Nothing in a corner panel.
- In the shop: each weapon card shows its Feed and Frenzy, and one line shows your two totals.

| Check | Pass when |
|---|---|
| Feed | A kill while rising adds exactly the Feed total; a kill while falling adds nothing |
| Frenzy | While falling, every gun's fire rate is multiplied by min(multiplier, cap); while rising it is not |
| Reset | The multiplier is 1 at every breach |
| Totals | Feed and Frenzy equal the sums over held weapons by tier, after every buy, sell and combine |
| Setting off | Every suite gives the same results as before |
| Seen | `scripts/playtest.mjs` frames show the charge while rising and the release while falling |

**Designer plays** to wave 5: can you see the build and the release without reading anything? Does the release feel like a payoff?

### Step 3: the numbers (play checkpoint; this signs the baseline)

**Goal:** a floor a little behind the wave and a ceiling ahead of it.

Build nothing new. Set the section 5 numbers.

| Check | Pass when |
|---|---|
| Floor and ceiling | At waves 5, 10, 15 and 20, kills against arrivals with the multiplier held at 1 and held at the cap are both recorded, and arrivals sit between them [TUNE: how far] |
| Reach | The multiplier bots actually reach per jump is recorded (median and top tenth). The median is neither stuck at 1 nor stuck at the cap [TUNE] |
| Styles | Skim, low, mid and high jumps are each recorded; no style gets more than twice another's kills per air second [TUNE] |
| Close weapons | A Close-only build still feeds on low jumps, or the result is written here for the designer |
| Suites | The gate passes |

**Designer plays** one run to wave 10: does power build against the pressure of each wave? Was there a wave where it felt hopeless or a wave where it felt already won?

**When this is signed, the baseline is frozen as the reference.** Parked ideas are then tried one at a time against it.

## 9. Known risks

| Risk | Where it is caught |
|---|---|
| The release does not thin the crowd, as the 2026-11-06 Discharge did not | Step 2 play test; step 3 floor and ceiling |
| With every weapon doing both, the baseline has no build decision beyond which weapons to buy | Accepted for the baseline; parked items 1, 2 and 5 are the answers |
| Shorter first jumps make late waves start too weak | Step 1 |
| Early enemies die in one hit, so a faster fire rate has nothing to hit | Step 3 floor and ceiling |
| Close-only builds cannot feed on low jumps | Step 3 |
| Feed from kills favours whoever already kills fastest | Step 3 reach measure; the cap bounds it |

## 10. Checkpoint log

| Checkpoint | Date | Result | Designer's note |
|---|---|---|---|
| Plan locked | 2026-11-15 | Written from the designer's answers of 2026-11-14 and 15 | "Yes, lock it" |
| 0 Facts and a fast measure | 2026-11-15 | Built and measured; gate passes. The "Fast" check missed its 5-minute target by 38 s under load, so this step waits on the designer's word on that threshold | |
| 1 The jump ramp | 2026-11-15 | Built; automated checks pass (tag `feed-cp1-auto`). Waiting on the designer's play test | |
| 2 Feed and frenzy | | | |
| 3 The numbers (baseline signed) | | | |

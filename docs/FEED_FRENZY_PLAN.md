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

#### Step 2 results (2026-11-15)

**Built** behind `feed` (on by default), in `source/demo.js` and `source/shop.js`:
- Every kill while rising (before the peak) adds your Feed total to this flight's multiplier, which starts at 1 at each breach. Kills while falling add nothing.
- While falling, every gun's cooldown runs faster by min(multiplier, cap). The cap is 1 + your Frenzy total.
- Per weapon by tier, the plan's first numbers [TUNE]: Feed 2%, 4%, 4%, 6% per kill; Frenzy +0.25, +0.25, +0.75, +0.75.
- On screen, no text: a cyan ring on the dolphin for each feeding kill, bigger as the multiplier grows; a pink burst at the peak sized by the multiplier; pink pulses while falling, faster and bigger with the multiplier.
- In the shop: each weapon card adds "Feed +n% · Frenzy +n"; under your weapons, one line gives your totals ("FEED +2% per kill while rising · FRENZY up to ×1.25 fire rate while falling").

| Check | Result |
|---|---|
| Feed | **Pass.** A kill while rising adds exactly the Feed total; a kill while falling adds nothing (`qa/feed.cjs`) |
| Frenzy | **Pass.** Falling, a tick of every gun's cooldown is exactly the multiplier times a plain tick; rising, it is not; the cap holds |
| Reset | **Pass.** The multiplier is 1 at every breach, over 4 breaches |
| Totals | **Pass.** Equal to the sums by tier after a buy, a combine and a sell |
| Setting off | **Pass.** No frenzy; the camera and enemy gates match their pins exactly (`node qa/gate.cjs --full`) |
| Seen | **Pass.** Frames in `qa/feed/step2-frames/` (made with `qa/feed/frames.cjs`): the cyan ring while rising, the pink burst at the peak, the pink pulses while falling, and the shop |

**A bot flight, for a sense of size** (wave 8, six tier 1 weapons, mid arcs): kills while rising per flight 0 to 9; multiplier reached 1.0 to 2.1 against a cap of 2.5; guns fired 5.9 shots per air second rising and 8.6 falling.

**Not changed:** the old CHIPS × MULT panel at the bottom of the screen is still there. Its "MULT" is the old scoring, not this multiplier, and may confuse a play test. Removing it is outside this plan's steps; it is noted for the designer.

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

#### Step 3 measurements (2026-11-15)

All with `node qa/floor.cjs` (cannot-die bot, one whole wave, 4 seeds per cell; raw in `qa/feed/step3/`). Two builds: **mixed** = one each of Trident, Tuna Gaff, Spitter, Pressure Cannon, Squid Launcher, Riptide Carbine; **Harpoon** = six Harpoons. All six weapons at the wave's tier (T1 at wave 5 up to T4 at wave 20 [ASSUMED]). **Floor** holds the falling multiplier at 1, **ceiling** holds it at the cap, **actual** is the game as built. "Mult" is the multiplier each flight reached, median against the cap.

| Build | Wave | Floor: killed / crowd | Actual: killed / crowd | Ceiling: killed / crowd | Actual mult: median of cap |
|---|---|---|---|---|---|
| Mixed | 5 | 88% / 12 | 88% / 10 | 91% / 8 | 1.84 of 2.5 |
| | 10 | 69% / 50 | 86% / 33 | 84% / 31 | **2.5 of 2.5** |
| | 15 | 76% / 64 | 91% / 36 | 91% / 33 | 4.1 of 5.5 |
| | 20 | 96% / 14 | 99% / 7 | 98% / 6 | 3.9 of 5.5 |
| Harpoon | 5 to 20 | 95 to 99% | 97 to 101% | 97 to 100% | at or near the cap |

**What it says:**
- **Frenzy does real work where the game is hardest.** At waves 10 and 15 it lifts the mixed build from 69% to 86% and from 76% to 91% of arrivals killed, and roughly halves the crowd on screen (50 to 33, 64 to 36).
- **Feed is too generous.** The actual game sits on the ceiling: at wave 10 the median flight reaches the cap. The plan's check "the median is neither stuck at 1 nor stuck at the cap" fails at wave 10.
- **The Harpoon build gains nothing,** because its floor is already 95 to 99%.
- **Waves 5 and 20 are easy even at the floor** (88 to 99%). Wave 20 at tier 4 may not reflect a real run.
- **Flight style barely matters:** kills per air second at wave 10 are 4.9 (low), 5.1 (mid) and 5.1 (high), well inside the plan's "no style more than twice another". Skims were not measured; the bot has no skim style in this harness.
- **Close-only builds were not measured here;** at step 0 they had the lowest floor.

**Feed at half and a quarter** (`feedScale` 0.5 and 0.25, everything else the same; mixed build):

| Wave | Floor | Feed ×1 (built) | Feed ×0.5 | Feed ×0.25 | Ceiling |
|---|---|---|---|---|---|
| 5 | 88% | 88%, mult 1.84 | 90%, mult 1.36 | 87%, mult 1.21 | 91% |
| 10 | 69% | 86%, mult 2.5 (cap) | 82%, mult 2.08 | 80%, mult 1.60 | 84% |
| 15 | 76% | 91%, mult 4.1 | 87%, mult 2.68 | 86%, mult 1.78 | 91% |
| 20 | 96% | 99%, mult 3.9 | 98%, mult 2.44 | 99%, mult 1.72 | 98% |

At half Feed the multiplier is earned rather than automatic (median well below the cap from wave 15, a little below at wave 10), and the build still kills most of what arrives.

**Proposed for the designer to confirm (nothing below is changed in the game yet):**
1. Feed per tier halves to 1%, 2%, 2%, 3% per kill. Frenzy stays +0.25, +0.25, +0.75, +0.75.
2. Thresholds [TUNE]: at waves 10 and 15, the floor kills 60 to 80% of arrivals and the actual game 80 to 95%; the median multiplier sits between 30% and 80% of the way from 1 to the cap; no flight style kills more than 1.5 times as fast per air second as another.
3. The Harpoon: as built, six Harpoons win every wave without feed or frenzy (30 m reach against the others' 6 to 16 m, and a second-enemy pierce). Options: bring its reach down to the pool's ranged weapons (16 m), or keep it as a strong start that the shop rarely sells.

**Speed:** with the machine quiet, a 32-run batch took about 25 seconds, so a one-build on/off comparison now takes about a minute. The step 0 "Fast" check passes on a quiet machine.

#### Step 3 decisions and re-measurement (2026-11-15)

**Decided** (designer, 2026-11-15: "Yes, apply all three"): Feed per tier halves to 1%, 2%, 2%, 3%; the thresholds below; the Harpoon's reach drops from 30 m to 16 m. The Harpoon item offered two options; the engineer read "apply" as the reach cut [ASSUMED].

**Thresholds (confirmed):** at waves 10 and 15, the floor kills 60 to 80% of arrivals and the actual game 80 to 95%; the median multiplier sits between 30% and 80% of the way from 1 to the cap; no flight style kills more than 1.5 times as fast per air second as another.

**Re-measured** (raw in `qa/feed/step3b/`; 4 seeds; three builds: mixed = one each of the six non-Harpoon weapons, close = three Tridents and three Tuna Gaffs, Harpoon = six Harpoons):

| Build | Wave | Floor killed | Actual killed | Ceiling killed | Median mult (way to cap) | Verdict |
|---|---|---|---|---|---|---|
| Mixed | 10 | 69% ✓ | 82% ✓ | 84% | 2.08 of 2.5 (72%) ✓ | **Pass** |
| | 15 | 76% ✓ | 87% ✓ | 91% | 2.68 of 5.5 (37%) ✓ | **Pass** |
| Close | 10 | 66% ✓ | **72% ✗** | 74% | 1.96 of 2.5 (64%) ✓ | Fails: actual below 80% |
| | 15 | 74% ✓ | 81% ✓ | 83% | 2.32 of 5.5 (**29% ✗**) | Fails narrowly: multiplier |
| Harpoon | 10 | **94% ✗** | **97% ✗** | 96% | 2.5 of 2.5 (**100% ✗**) | Fails: wins without frenzy |
| | 15 | **94% ✗** | **96% ✗** | 97% | 3.64 of 5.5 (59%) ✓ | Fails: wins without frenzy |

Waves 5 and 20 (not in the thresholds): mixed 90% and 98%, close 77% and 95%, Harpoon 93% and 99% as played.

**Styles: pass.** Kills per air second, low against high arcs: mixed 4.7 against 5.2 at wave 10; close 3.6 against 4.3. At most 1.2 times apart.

**What it says:**
- **The mixed build meets every threshold.** Feed at half makes the multiplier earned, and frenzy lifts the hard waves by 11 to 13 points.
- **The close-only build is a little weak at wave 10** (72% as played, 74% even at the cap). Raising frenzy cannot fix it; its guns lack reach. This is the Close weapons risk in section 9.
- **The Harpoon is still too strong at 16 m:** six of them kill 94% with no frenzy. The reach was not the main cause. Its 30 to 45% critical chance at 2.25 to 3 times damage, its fast cooldown and its pierce were. Six Harpoons beat six of any other weapon.

**Step 3 is not signed:** two of three builds fail a threshold. The thresholds stay as confirmed; the designer decides what changes.

#### Harpoon crits lowered (2026-11-15)

**Decided** (designer: "Lower its crits"): the Harpoon's critical hits now match Pressure Cannon's, 10, 15, 20 and 25% at ×2 (they were 30 to 45% at ×2.25 to ×3).

**Re-measured** (six Harpoons, 4 seeds; raw in `qa/feed/step3c/`):

| Wave | Floor killed: before → after | Actual killed: before → after | Median mult |
|---|---|---|---|
| 10 | 94% → **91%** | 97% → **97%** | 2.5 of 2.5 |
| 15 | 94% → **91%** | 96% → **97%** | 3.4 of 5.5 |

**Still fails.** Six Harpoons kill 91% with no frenzy and 97% as played, above the 60 to 80% and 80 to 95% marks. Lowering crits took 3 points off the floor. What is left is its rate of fire and damage: it shoots every 0.67 s for 14 damage at tier 1, where Pressure Cannon shoots every 1.0 s for 12, so it deals about 1.75 times as much, and each shot also passes through a second enemy.

#### Harpoon fire rate slowed (2026-11-15)

**Decided** (designer: "Slow its fire rate"): the Harpoon's cooldown matches Pressure Cannon's, 60, 55, 50 and 40 frames by tier (it was 40, 36, 32 and 28). With the earlier changes it now differs from Pressure Cannon only in damage (14 against 12 at tier 1), reach (16 m both) and its second-enemy pierce.

**Re-measured** (six Harpoons, 4 seeds; raw in `qa/feed/step3d/`):

| Wave | Floor killed (60 to 80%) | Actual killed (80 to 95%) | Median mult, way to cap (30 to 80%) | Crowd: floor → actual |
|---|---|---|---|---|
| 10 | **82.1% ✗** | 94.6% ✓ | **2.38 of 2.5, 92% ✗** | 31 → 17 |
| 15 | **82.4% ✗** | **95.3% ✗** | 2.86 of 5.5, 41% ✓ | 44 → 24 |

**Now close, but not passing.** Frenzy does real work for the Harpoon build (it adds 12 to 13 points and nearly halves the crowd), and the misses are narrow: the floor by 2 points, wave 15 as played by 0.3 points. The wave 10 multiplier still fills to its cap (the cap there is 2.5, and six Harpoons kill enough on the way up to fill it).

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
| 1 The jump ramp | 2026-11-15 | Passed. Automated checks pass (tag `feed-cp1-auto`); designer played waves 1 to 6 | "Does each wave feel like it builds?": "Yes, it builds". The second question (is the slow first jump of a late wave a problem?) was not answered separately |
| 2 Feed and frenzy | 2026-11-15 | Passed. Automated checks pass (tag `feed-cp2-auto`); designer played | "Can you see the build and the release?": "Yes, it reads". Whether the release feels like a payoff was not answered separately |
| 3 The numbers (baseline signed) | | | |

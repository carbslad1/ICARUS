# ICARUS
## Game Design & Build Specification

**Document type:** Complete design and build specification for an autonomous coding agent.
**Target stack:** TypeScript · Vite · PixiJS v8 · WebGL2 · Node ≥ 20.
**Status:** Greenfield.

> **Revision 2026-10-25: scoring and run structure.** §4 (Reward architecture and scoring) and §10 (Progression) have been rewritten to the chips × mult design developed in the playable demo (`source/`, built to `ICARUS-demo.html`). Several original systems were removed from the design: the altimeter as the score, apex tiers and tier loot, entry-quality grading and perfect-entry streaks, and speed compounding across cycles. Sections that still describe them carry a **Superseded** note pointing to §4. Movement, frame architecture and the binding rules in §13–15 are unchanged by this revision.
>
> **Revision 2026-10-26: the routine.** §4 and §10 were rewritten again. Tricks are now a five-slot routine of abilities placed on the flight; style pays pearls; 0 HP ends the run. The 2026-10-25 slot-machine design, which the S4 demo implements, is kept as Appendix A.
>
> **Revision 2026-10-27: positional play** (now Appendix B). §4 added the positional effect grammar, classes, space and flight rules, example effects and a linear build-and-playtest plan (now B1.16–B1.20). Statuses replace tags, evolutions are earned by feats, and a clean streak across flights replaces the per-flight ×2.
>
> **Revision 2026-10-30: tricks, weapons and items.** §4 and §10 were rewritten again after the designer's playtest:
> - one trick, or a combo, is chosen underwater each dive and boosts its weapon type
> - tricks never deal damage
> - items modify and never attack; levels give item drafts
> - catalysts evolve weapons
> - splashdown pays kills and orbs × clean streak
>
> The routine and positional design (2026-10-26 to 2026-10-30) is kept as Appendix B, and its built code stays in the demo until §4.17 replaces it. Superseded notes dated 2026-10-25 to 2026-10-27 elsewhere in this document describe that design. Where they cite §4 or §10, they mean Appendix B1 or B2.

---

## Reading order

**Sections 1–4** are the design core: what the game is, how it plays, and why it holds someone. Section 4 (Run structure: tricks, weapons and items) is load-bearing — it shapes tuning decisions in every later section.

**Sections 5–10** are systems design.

**Section 11** is the visual language. It is as important as the mechanics and should not be treated as a polish pass.

**Sections 13–15** are **binding architecture**. If a rule there seems wrong, stop and raise it rather than working around it.

**Section 17** is the build sequence. Each phase has a gate; do not advance until it passes.

Decisions marked **[CALL]** resolve genuine ambiguity in the designer's favour and are flagged so they can be overridden cheaply.

---

# 1. Vision

## 1.1 One paragraph

You are a dolphin in a neon ocean. Underwater you are a momentum machine — you dive, carve turns, trade speed for depth and depth for speed, and every metre per second you bank is earned. Then you breach, and the game becomes something else: the sky opens into a combat arena and you fly through it weightless, dodging and chasing and killing like a twin-stick shooter with no inertia at all. How high that arena sits, how long it lasts, and how rich and dangerous it is were all decided by the dive that bought it. Then you pick your moment, commit to a re-entry, and if you nail it you come out of the water faster than you went in — and buy something bigger.

## 1.2 Two games joined at the surface

| | **Water** | **Air** |
|---|---|---|
| **Feel** | Heavy, momentum-conserving, analogue | Weightless, snappy, immediate |
| **Control** | Rotate + thrust; velocity follows heading slowly | Direct 8-way movement, no inertia |
| **Skill** | Carving turns, managing momentum, clean re-entry | Dodging, target priority, positioning |
| **Purpose** | Earn the next flight | Spend it |
| **Threat** | Low — this is the safe phase | This is where the game happens |
| **Tempo** | Quiet, tense, anticipatory | Loud, chaotic, celebratory |
| **Look** | Dark, volumetric, intimate | Additive, saturated, overwhelming |

Neither half is interesting alone. A pure momentum game has no combat; a pure bullet-heaven has no reason to care about physics. Icarus makes the momentum phase *purchase* the combat phase, and that purchase is the whole game.

## 1.3 What the title means mechanically

> **Superseded (2026-10-25).** Launch speed is now set per wave (30 m/s at wave 1, +5 per wave), and there are no apex tiers or speed carried between cycles. The launch now buys a flight's length and shape, which sets where the routine's tricks fire and how long its ascent and descent last (§4.2, §10.2).

Breach speed is the only currency, and it buys three things at once:

- **Altitude** — how high the arena sits, setting its danger and reward tier
- **Airtime** — how long the arena lasts before you are forced down
- **Return speed** — what you carry into the next dive, if you land it

There is no ceiling and no altitude at which the game stops getting harder. Staying low is always available, always survivable, and always a losing strategy across a full run.

## 1.4 The two things that must be true

**The water must be fun with nothing in it.** Before a single enemy exists, diving and breaching should be worth doing for its own sake. This is a hard gate in §17 and it cannot be automated away.

**The air must not feel like the water.** The transition should land as a release — from fighting momentum to having none. If air movement feels even slightly heavy, the contrast collapses and the game becomes a mediocre version of both halves.

---

# 2. The core loop

```
  DIVE          build speed, choose your bet
      ↓
  BREACH        time dilates; the arena you bought is revealed
      ↓
  FLY           free movement, combat, rewards, escalating chaos
      ↓
  COMMIT        choose your moment; align for entry
      ↓
  RE-ENTER      clean entry keeps your speed → bigger next bet
      ↓
  (repeat, compounding)
```

> **Superseded in part (2026-10-25).** There is no entry grading and no speed compounding. The current loop is dive → breach (Breach trick fires) → fly (weapons auto-fire; Ascent, Apex and Descent tricks fire as the arc passes them; a hit costs HP and cancels the trick in progress) → water entry (Entry trick fires; style score paid as pearls) → repeat until the wave's air clock runs out → shop. 0 HP ends the run. See §4. The cycle and run lengths below are also superseded: they follow from the wave air clock and launch speeds in §10.2.

A cycle runs 20–45 seconds. A run is 15–25 minutes, or forty to sixty cycles.

Speed compounds across cycles. A player chaining clean entries is flying dramatically higher than one who is not, and every metre of that difference is visible on the altimeter.

---

# 3. The flight frame

This is the mechanic that makes Icarus structurally different from every other game in its genre. Everything else is scaffolding around it.

## 3.1 The idea

When the dolphin breaches, the game does **not** fly a ballistic body through the air. Instead:

1. A **flight frame** is created at the breach point carrying the exit velocity.
2. The frame flies a pure ballistic arc. Nothing controls it. It is a moving origin.
3. A **combat arena** — a screen-sized region holding enemies, projectiles and pickups — is anchored to that frame and travels with it.
4. The **player's sprite moves freely inside that arena**, with direct, snappy, momentum-free control.
5. The camera tracks the frame, so the arena sits stationary on screen while the sky streams past behind it.

The arc is a **rail**, not a constraint on where the player can be. It determines what the flight is *worth* — how high, how long, how dangerous — not where the dolphin sits within it.

## 3.2 Why it works

The player's world position is `frame.origin + localOffset`, so the dolphin genuinely is hurtling through the sky at 40 m/s. But relative to the enemies, which ride the same rail, the dolphin moves at a comfortable 16 m/s with instant direction changes. You get the *spectacle* of ballistic flight and the *playability* of a stationary arena in the same moment.

This is unusual and it is the best idea in the game. Protect it.

## 3.3 The architecture that keeps it clean

The arena is **one object with one origin**. Entities inside it store **one position, in arena-local space**, for their entire life. There is exactly one coordinate transform in the codebase:

```
worldPosition = arena.origin + entity.localPosition
```

applied in one function, used by the renderer, the camera, and re-entry resolution — and by nothing else. All air-phase gameplay logic runs entirely in arena-local space, where the player's position and every enemy's position are directly comparable with no transform at all.

Do not distribute this transform across entities. Do not give any entity two positions or a mode flag selecting between coordinate spaces. Branded types (§13.2) make both violations compile errors.

## 3.4 Lifecycle

```
  WATER PHASE
    momentum physics, single body, world coordinates
    no arena exists
         │  breach: velocity.y > 0 crosses y = 0
         ▼
  BREACH WINDOW  (~1.2s real time, dilated)
    frame created with exit velocity
    tier computed from projected apex
    arena spawns, populated, ghosted-in during the window
    player placed at arena centre with zero local velocity
         ▼
  AIR PHASE
    frame flies its arc (uncontrolled)
    arena rides the frame
    player moves freely in arena-local space
    combat, rewards, escalation
         │
         ├── player commits to dive (voluntary)
         └── frame arc returns to y = 0 (forced)
         ▼
  RE-ENTRY
    dolphin world position := arena.origin + player.localPosition
    dolphin velocity       := frame.velocity
    entry quality          := angle(dolphin heading, frame.velocity)
    arena dissolves
         ▼
  WATER PHASE (faster, if the entry was clean)
```

**Position comes from the sprite; velocity comes from the frame.** The frame was always virtual — the dolphin was always where the sprite was.

## 3.5 Commitment: the trade that makes the risk dial work

> **Superseded (2026-10-25).** Entry speed retention and entry grading were removed. Risk now comes from exposure during the flight: a hit costs HP, cancels the trick in progress and loses the flight's clean bonus, and 0 HP ends the run (§4.6, §4.7).

The frame's velocity at commitment *is* your entry vector. Early in the arc the frame is still rising or shallow — commit then and you enter slow and flat, shedding most of your speed. Ride the arc to its natural end and the frame has mirrored back to full speed at a steep angle: the best possible entry.

- **Ride it out** → optimal entry, maximum speed retained, maximum time exposed
- **Bail early** → escape a bad fight, pay for it in the next cycle's speed

A player who is winning rides the arc. A player who is losing bails and accepts a slower lap. That is exactly the shape a risk dial should have, and it needs no special-case code — it is the shape of a parabola.

## 3.6 Arena bounds

The arena is a bounded rectangle, roughly one screen at the current zoom, centred on the frame origin. The player's local position is clamped with a soft push-back at the edges.

Bounds are necessary: without them the player could fly straight down to the water and the frame would be meaningless. With them, the arena is a legible play field.

**[CALL]** Bounds are fixed across all tiers. Higher tiers get *denser* arenas, not bigger ones — a bigger arena would dilute exactly the pressure altitude is meant to create.

---

# 4. Run structure: tricks, weapons and items

**Revised 2026-10-30.** This section replaces the five-slot routine and the positional design (2026-10-26 and 2026-10-27), which are kept as Appendix B. The S4 slot-machine design, which the current demo build implements, is Appendix A. **This is the target design; the demo does not implement it yet** (§4.17 is the build order).

Markers:
- **[TUNE]**: a starting number; the structure beside it is the requirement.
- **[OPEN]**: an unresolved question, to be raised with the designer rather than guessed.

**Why the change (designer playtest, 2026-10-30):**
- The game is fun when you kill enemies and collect XP orbs while moving around the arena. Positional rules (above, below, behind) fought that.
- Tricks looked janky when several played across one flight. One chosen trick per flight reads well.

## 4.1 The hook and the pillars

ICARUS has two things no other survivors-like has:
1. **The dive:** every 4–8 seconds, a short, calm decision point.
2. **The splashdown:** a natural moment to pay out.

The structure makes those two moments carry the roguelite. Everything else is deliberately plain and readable.

**Pillars.** Check every feature against them:
1. **Every dive is a decision.**
2. **Every pick shows its numbers.** No hidden maths, and no "chance to" effects except critical chance **[OPEN]**.
3. **A build is named by its trick:** "a Front flip build".
4. **Every flight ends in a payout.**
5. **A run ends in about 25 minutes, with a conclusion.**

**Audience:** players of Brotato, Balatro, Ball x Pit and CloverPit. That means choice-driven upgrades, visible maths, short runs, discoverable combinations and a payoff moment.

## 4.2 The four loops

| Loop | Length | What happens | Model |
|---|---|---|---|
| **In the air** | Seconds | Move, dodge, collect orbs; weapons fire on their own | Brotato |
| **The dive** | About 1 s | Choose the trick(s) and the launch angle, which shape the next flight | Ours |
| **Splashdown** | About 1 s | The flight's payout counts up | Balatro, CloverPit |
| **Between waves** | 30–60 s | Shop: weapons, items, catalysts | Brotato, Ball x Pit |
| **Between runs** | | Characters and alternative trick versions, unlocked by challenges | Brotato, Risk of Rain 2 |

## 4.3 Input

| Where | Input | Effect |
|---|---|---|
| Underwater | Tap **W, A, S or D** (one or several) | Choose the trick(s) for the next flight. **The last choice carries over**: do nothing and you repeat it. |
| Underwater | Hold **Space**, release | Carve, then launch |
| In the air | **WASD** | Move only. The trick runs by itself. Weapons fire on their own. |

- **Tricks can only be chosen underwater.**
- **The selected tricks show as icons during the carve.**
- **Space-to-carve is built** (2026-10-27, `source/controls.js`). The carve turns the nose up toward the side you face.
- **[OPEN]** What W/A/S/D do underwater today, and how tapping them to choose tricks fits with the carve.

## 4.4 The four tricks

| Key | Trick | Boosts weapons of type | Moment | Default ability |
|---|---|---|---|---|
| D | **Front flip** | Melee | Breach | **Charge:** boosted launch; invulnerable for about 1 s; pushes through enemies |
| A | **Backflip** | Ranged | Breach | **Repulse:** pushes enemies away |
| W | **Corkscrew** | Elemental | Apex | **Time slow:** enemies slowed for about 1.5 s |
| S | **Belly flop** | Economy | Water entry | **Shockwave:** knocks enemies back from the landing point. Kills on a Belly flop flight drop extra XP and pearls. |

**The boost:** performing a trick boosts its weapon type for that flight **[TUNE]**.

| Tricks performed | Boost per included type |
|---|---|
| 1 (single) | +30% |
| 2 (pair) | +18% each |
| 3 (triple) | +12% each |

A weapon with two type tags gets both boosts.

**Rules:**
- **Tricks never deal damage.** They move, protect, control and boost. All damage comes from the weapons.
- **The utility has to matter.** It must sometimes beat the boost, or the dive decision collapses into "always my build's trick". That needs real danger (§4.17, step 1). The flight log measures trick choice against HP and nearby enemies.
- **Alternative versions:**
  - Each character can unlock alternatives through challenges and picks one version of each trick before the run. Alternatives also never deal damage.
  - Examples:
    - Front flip: Spear dive, Skim
    - Backflip: Kite flip, Bubble
    - Corkscrew: Vortex, Freeze ring
    - Belly flop: Geyser, Jackpot
  - Full version only.

## 4.5 Combos

- **Legal:** any set of tricks except Front flip with Backflip, which share the breach. That gives 4 singles, 5 pairs (FF+CS, FF+BF, BK+CS, BK+BF, CS+BF) and 2 triples (FF+CS+BF, BK+CS+BF).
- **No two tricks share a moment,** so a combo always plays out in order: breach → apex → entry.
- **Combos are unlocked by your weapons, not available from wave 1:**
  - holding a weapon with two type tags lights up that pair underwater (e.g. the Arc, melee + elemental, unlocks Front flip + Corkscrew)
  - triples come from one rare item, *Triple threat*

  This teaches itself, keeps wave 1 simple, and gives combos to combo builds without cluttering pure builds.

## 4.6 Weapons

- **6 slots, automatic fire.** Merge two copies of the same weapon and tier to go up a tier, T1 → T4 (about +60% damage per tier **[TUNE]**).
- **Each weapon has 1 or 2 type tags:** melee, ranged, elemental, economy. **Melee + Ranged never appears together.**
- **There are no class set bonuses.**
- **Economy weapons** lean on critical hits and drops (e.g. critical kills drop a pearl).

**Demo roster (14):**

| Tags | Weapons |
|---|---|
| Melee | Fin, Sonic, Tail blade (new) |
| Ranged | Minigun, Laser, Rocket |
| Elemental | Frost spray (new), Whirlpool (new) |
| Economy | Pearl sling (new) |
| Melee + Elemental | Arc |
| Ranged + Elemental | Flak |
| Ranged + Economy | Harpoon |
| Elemental + Economy | Depth charge |
| Melee + Economy | Gilded tail (new) |

## 4.7 Stats

- **Stats come only from items.** Levels give item drafts, not stat picks (§4.9).
- **They stack linearly,** and every number is shown on the item and in the stats panel.
- **The stat list:**
  - damage per type (melee, ranged, elemental, economy)
  - attack speed, critical chance **[OPEN]**, area, projectiles, pierce
  - Max HP, Armour, move speed, pickup range

## 4.8 Items

**Items modify; they never attack.** No item spawns its own damage (no torpedoes, spikes or "chance to" extra shots).

| Tier (demo) | Job | Examples |
|---|---|---|
| **Common** | Stats | *Whetted fin* +8% melee damage · *Scope lens* +8% ranged · *Ion coil* +8% elemental · *Lucky scale* +8% economy · *Quick fins* +6% attack speed · *Thick blubber* +10 Max HP · *Shell plate* +2 Armour · *Wide eyes* +15% pickup range |
| **Rare** | Conditions tied to the flight, or a trick upgrade | *Updraft* +10% damage while climbing · *Free fall* +15% attack speed while descending · *High ground* +15% damage above 20 m · *Clean form* +5% damage per clean-streak level · *Full bag* after 20 orbs in a flight, +20% damage until splashdown · *Multishot* ranged +1 projectile · *Spare fin* Charge invulnerability +0.3 s · *Recoil coil* Repulse +20% radius · *Long lungs* Time slow +0.4 s · *Lead belly* Shockwave +25% radius · *Triple threat* unlocks triples |
| **Legendary** | Changes a rule | *Show pod* combos boost each type at the single rate · *Purist* single tricks boost twice as much · *Tidal heart* each clean-streak level adds +10% to the boost · *Whale song* during Time slow, weapons fire 30% faster |
| **Cursed** | Strong with a drawback | *Glass fin* +40% melee damage, −30% Max HP · *Greedy maw* economy drops ×2, clean streak capped at ×2 · *Overextended* triples boost at the single rate, +50% damage taken on triple flights · *Blind spin* Time slow lasts 3 s but slows you too |
| **Catalyst** | Evolves a weapon | See §4.11 |

Every item fits in two lines. Trick items apply whenever their trick is part of the flight, including inside combos.

## 4.9 Getting things

| Source | When | What | Feel |
|---|---|---|---|
| **Level-up** (XP orbs) | In the air | **Draft: pick 1 of 3 items** | Choice |
| **Drops** (elites, crates) | In the air | **One random item** | Surprise |
| **Shop** | Between waves, with pearls | Weapons, items, catalysts. Lock, reroll, sell. | Planning |

## 4.10 Splashdown: score and pearls

```
flight score = (kills + orbs collected) × clean streak
pearls       = diminishing curve(flight score) + wave pay   [TUNE]
```

- **The clean streak** is ×1, ×2, ×3… for clean flights in a row. A hit resets it.
  - It is the only multiplier.
  - As built (step 4 of the old plan, 2026-10-27), it caps at ×5 and survives the shop.
- **What the current build pays:**
  - round(3 × √score) pearls at each splashdown
  - wave pay of 24 + 4 × wave
  - 10% interest on saved pearls, at most 10

  This design adds orbs to the score and drops the routine's mult.
- **The count-up at splashdown,** led by sound, is the payoff moment, Balatro-style.
- **There is no freshness decay:** repeating a trick costs nothing.

## 4.11 Evolutions: catalysts

- **A catalyst converts every copy of its matching weapon** into the evolved form, permanently, **at any tier**, Risk of Rain 2 void-item style.
- **Catalysts can't be sold.** Recipes are shown in the shop and the run log, Ball x Pit style.

| Catalyst | Weapon | Evolves into |
|---|---|---|
| Storm heart | Arc | **Storm lance:** lightning chains to every enemy within 10 m |
| Pearl crown | Harpoon | **Treasure harpoon:** pierces everything; each enemy pierced drops a pearl |
| Glacier core | Frost spray | **Blizzard:** a permanent freezing aura |
| Shark tooth | Fin | **Blood fin:** each kill heals 1 and adds +2% damage for the wave |
| Ember core | Flak | **Firework flak:** every shell splits into 5 |

## 4.12 Characters

- **Each character has:** base stats, a passive, and a loadout with one version of each trick.
- **Alternatives** are unlocked by challenges, with no stat grind.
- **The demo has one character.**

| Character | Passive (full version examples) |
|---|---|
| **Bottlenose** (starter) | +1 free draft reroll each wave |
| Orca | Front flip boost doubled; can't hold ranged weapons |
| Spinner | Starts with all combos unlocked; −20% Max HP |
| Narwhal | Starts with a Harpoon; Repulse radius +50% |
| River dolphin | Belly flop drops ×1.5; elites appear more often |
| Pilot whale | +30 Max HP; Time slow +1 s; −15% attack speed |

## 4.13 The run

- **Length:** 20 waves, about 25 minutes. Bosses at waves 10 and 20. 0 HP ends the run, and clearing wave 20 wins.
- **Air clock:** runs only in flight. When it runs out, enemies keep coming and the wave ends at the next water entry. There is no safe coast.
- **Launch:** 30 m/s at wave 1, +5 m/s per wave (designer rule). The launch angle sets the threat tier: steeper means harder enemies and better loot.
- **The power curve:** the run must have the power-inversion shape. You start cautious and end as the hazard: the enemy that was terrifying early should die on contact late, and the game should make sure you notice. Catalysts are the main late-run power jumps.

## 4.14 How builds form

1. **Weapons decide your types.**
2. **Tricks decide what is boosted each flight:**
   - **Pure builds** dive with one trick.
   - **Combo builds** use the pair or triple their weapons unlock.
3. **Items deepen the build:**
   - type damage for your type
   - trick items for the tricks you use
   - flight conditions for how you fly
4. **Legendary items, cursed items and catalysts** bend it.
5. **The situation still decides each dive:** swarmed with a melee build, you may take Backflip for Repulse and accept a smaller boost.

| Example build | Dives | Weapons | Key items | Catalyst |
|---|---|---|---|---|
| Pure melee | Front flip | Fin ×2, Tail blade ×2, Sonic ×2 | Whetted fin ×6, Spare fin ×2, Purist | Shark tooth → Blood fin |
| Storm chaser | FF+CS | Arc ×3, Frost spray, Whirlpool, Fin | Ion coil ×3, Whetted fin ×3, Long lungs, Whale song | Storm heart → Storm lance |
| Turret ranged | Backflip | Minigun ×2, Laser ×2, Rocket ×2 | Scope lens ×5, Multishot ×2, Recoil coil | none |
| Greed | Belly flop | Pearl sling ×2, Harpoon ×2, Depth charge, Gilded tail | Lucky scale ×5, Lead belly ×2, Greedy maw | Pearl crown → Treasure harpoon |
| Full flight | BK+CS+BF | Harpoon, Flak, Depth charge, Rocket, Whirlpool, Pearl sling | Triple threat, Show pod, Long lungs, Lead belly | Ember core → Firework flak |

## 4.15 Ethical constraints

These are binding design constraints, not aspirations.

- **Session-bounded.** No daily rewards, login streaks, energy systems, timed events, or anything that punishes not playing. The game must never make the player feel they are losing ground by closing it.
- **No monetary stake.** No purchasable advantage, no loot boxes for money, no ads.
- **Randomness affects pace, not access.** Every piece of content is reachable by every player. Variance changes how fast you get there, never whether you can.
- **Honest odds.** Offer rarities and any chance-based effects are visible in-game.
- **Real stopping points.** The run ends. The summary screen is a conclusion, not a queue prompt. No auto-requeue, no countdown to the next run, no interstitial designed to catch someone mid-exit.
- **Playtime is not a metric.** If a change increases session length without increasing how good the session feels, it is a bad change.

## 4.16 Expansion for the full version

| Area | Expansion |
|---|---|
| Characters | 12–20, each with a passive and 2–3 versions of each trick |
| Items | 100–200 across the tiers; boss items from waves 10 and 20; cursed items that replace a trick |
| Weapons | 40–60, with more two-tag combinations; one catalyst per weapon |
| Shop services | Printer (trade items of a rarity for a chosen one), scrapper |
| Run modifiers | Unlockable rule changes and difficulty modes |
| Endgame | Optional loop past wave 20 at higher difficulty |
| Co-op | Worth a feasibility look later |

## 4.17 Build and playtest order

Each step proves one risk. Move on only when its question is answered by a playtest and the flight log.

**Already built on the branch (2026-10-27 to 2026-10-30), reused:**

| Built | Where | Use in this order |
|---|---|---|
| Flight-log metrics and baselines | `qa/flightlog-metrics.cjs`, `qa/flightlog-bot.cjs`, `docs/flow-study/` | Measure every step |
| Marked spawns, flocking, recall at the breach | `source/space.js` | Keep |
| Danger: turret shots that lead the arc; elites that fire slow leading shots; mines (off) | `source/danger.js` | **Step 1 starts here:** playtest it and tune it |
| Space-to-carve | `source/controls.js` | Keep (§4.3) |
| Style score, clean streak, pearls; no quota | `demo.js` (old step 4) | **Step 3** adapts it: add orbs, drop the routine's mult |
| Brotato enemy movement; tiered pierce | `source/movement.js`, `demo.js` | Keep |
| Trick Lab, playtest loadout, jump-style harness, placement harness | `source/lab.js`, `source/loadout.js`, `qa/jumpstyle.cjs`, `qa/placement.cjs`, `docs/TRICK_LAB.md` | **Step 2:** prove each of the four tricks one at a time with the Trick Lab process |
| Five-slot routine, placement and water tricks, statuses, armoured sides, stretch slots; stomp, dive and dash (parked) | `source/routine.js`, `source/statuses.js`, `source/verbs.js` | **Superseded by §4.4.** They stay in the code behind their settings until replaced. Their design is Appendix B. |

| # | Build | The question it answers |
|---|---|---|
| 1 | **Danger pass:** playtest and tune the built danger (`source/danger.js`) until hits are real but fair | Do the trick utilities matter? |
| 2 | **The 4 tricks + moderate boost + carry-over selection** (singles only), replacing the routine in normal play | Is the dive a real decision every time? |
| 3 | **Splashdown payout + clean streak** | Does each flight feel like a hand being paid? |
| 4 | **Level-up drafts + drops + reworked shop** (about 20 items) | Do builds diverge? |
| 5 | **Two-tag weapons and the combos they unlock** | Do combo builds appear naturally? |
| 6 | **2–3 catalysts** | Is there a late-run power spike? |

**Each step's metrics are added to `qa/flightlog-metrics.cjs`:** tricks per dive, combo use, boost uptime, and trick choice against HP and nearby enemies.

## 4.18 Open questions

1. Does critical chance stay, as the one random stat? (§4.7)
2. What do W/A/S/D do underwater today, and how does tapping them to choose tricks fit with the Space carve? (§4.3)
3. Boost numbers, and the size of the trick utilities, after the danger pass. (§4.4)
4. Confirm the built streak rules: cap ×5, survives the shop. (§4.10)
5. Time slow feel: test early, because it changes the pacing of every flight. (§4.4)
6. Brotato's exact weapon count, the long-term roster target. Sources found disagree. (§4.16)

## 4.19 Considered and rejected

| Idea | Date |
|---|---|
| The S4 slot-machine reels, charms and wave quota (Appendix A) | 2026-10-26 |
| The five-slot routine, and the placement and water tricks built on it (Eddy, Gravity anchor, Chum line, Slipstream, Bubble net, Spout…) | 2026-10-30 |
| The positional effect grammar, enemy sides and hard surfaces | 2026-10-30 |
| Proximity scaling | 2026-10-27 |
| Tricks that deal damage; items that spawn attacks | 2026-10-30 |
| Freshness decay | 2026-10-30 |
| Class set bonuses | 2026-10-30 |
| Brotato-style stat picks on level-up | 2026-10-30 |
| Risk of Rain 2 automatic levels and hidden maths (trigger coefficients, diminishing stacking) | 2026-10-30 |
| A skill tree or skill map | 2026-10-30 |
| Mounting weapons on keys, trick pools per key, practice mutations, carried orbs | 2026-10-30 |
| Engineering-style deployables | 2026-10-30 |
| Choosing tricks mid-air | 2026-10-30 |
| A "this jump needs X" readout; airtime gating; entry or landing grades | earlier designer rules |

---

# 5. Water phase

All numbers are tuning starting points. The *behaviour* beside each is the requirement.

## 5.1 Forces

| Constant | Start | Behaviour |
|---|---|---|
| `WATER_GRAVITY` | −1.2 m/s² | You sink slowly if you do nothing. |
| `WATER_DRAG_QUADRATIC` | 0.001 /m | `a = −k·v·\|v\|`. Light water resistance; fast dives must carry useful momentum through their turns. |
| `WATER_THRUST` | 32 m/s² | Along heading, with no steering-dependent throttle penalty. |
| `WATER_TURN_RATE` | 4.8 rad/s | Maximum body rotation rate. |
| `WATER_REDIRECT_RATE` | 14 /s | Velocity bends toward the nose continuously, without snapping. |
| `WATER_STEER_LEAD` | 0.24 rad | Maximum commanded nose lead relative to the flow. Stronger input makes a tighter curve, not free rotation. |
| `WATER_FLOW_MIN_SPEED` | 1 m/s | Below swimming speed, the body can orient to get moving; otherwise heading follows the flow. |
| `WATER_MAX_THRUST_SPEED` | 37 m/s | Thrust stops adding above this. Dive momentum far exceeds it — thrust builds from rest, it does not make you fast. |

## 5.2 The redirect mechanic

**User-approved revision, 2026-09-12:** prioritize fluid momentum. This replaces the original requirement that sharp turns must lose substantially more speed than gentle turns, after two human playtests found that behavior unnatural.

The heart of the water game is redirecting an existing dive into a continuous curve. Steering commands a bounded nose lead relative to velocity, approached at `WATER_TURN_RATE`. Velocity bends toward the nose at `WATER_REDIRECT_RATE`; the rotation preserves its magnitude apart from light resistance. Releasing steering aligns the nose with the carried trajectory. At swimming speed the nose must not lap, face backward against, or repeatedly reverse the flow.

The residual turn resistance is deliberately small:

```
speedLoss = currentSpeed × TURN_COST × |angleRotatedThisStep|
```

with `TURN_COST ≈ 0.02` per radian, plus the light quadratic water drag above. Do not restore a large braking penalty or reduce throttle because the player is steering. These five settings are the user's selected profile, supplied on 2026-09-12 with their instruction to proceed beyond the water trial.

A wide input produces a broad arc; stronger input tightens that arc. Both preserve useful momentum. A quick turn may retain more speed than a long turn because it spends less time in water: this is acceptable. Skill is in shaping the exit vector and aligning entries, not avoiding an artificial turn punishment.

**Verify this before building anything else.** Compare tight and wide turns through the same trajectory angle: their radii must differ, neither should stall, and unpowered quarter turns should retain over 90% of speed at 26 and 60 m/s. Check sustained turns for bounded body/flow separation and no direction reversals. The human feel gate remains mandatory.

## 5.3 Controls

A/D steer the curve underwater and rotate freely in air. W thrusts underwater. That is the entire water control set. The depth is in the momentum, not the buttons.

## 5.4 Re-entry quality

> **Superseded (2026-10-25).** Entry-angle grading, perfect-entry streaks and belly-flops were removed from the design. Water entry now fires the routine's Entry trick and pays the style score (§4.2, §4.6).

Evaluated at the exact surface crossing (§14.3), on the angle between dolphin heading and incoming velocity:

| Band | Condition | Retention |
|---|---|---|
| Perfect | ≤ 0.09 rad (~5°) | 1.0× speed, +`PERFECT_BONUS` (2.25 m/s), streak++ |
| Clean | ≤ 0.26 rad (~15°) | 0.97×, +1 m/s |
| Sloppy | ≤ 0.7 rad (~40°) | linear 0.97 → 0.72 |
| Belly-flop | > 0.7 rad | 0.45×, 0.25 s control lockout, heavy punish |

Consecutive perfect entries escalate `PERFECT_BONUS` by 0.4 m/s up to 5.5 m/s; any non-perfect entry resets the streak. These reward values reflect the user's first playtest request for faster growth from good entries.

**This is the compounding engine of the entire game and the single most important number to tune.** It converts execution directly into altitude, which converts into reward tier. Everything in §4 rides on it.

## 5.5 Surface skip

Entering at a very shallow angle with high speed should skip rather than penetrate: if `|velocity.y| < SKIP_THRESHOLD` (start 4 m/s) on a downward crossing, reflect Y with 0.6 restitution and stay airborne. A high-skill trick that emerges from the physics rather than being scripted, and a way to bail out of a dive commitment at the cost of a low, short next arc.

---

# 6. Breach window

The decision point of every cycle, and the reveal in §4.1's slot-machine mapping.

**Trigger.** Ascending underwater, crossing `BREACH_ARM_DEPTH` (start −3.0 m) with `velocity.y > 0`.

**Behaviour.**

- Dilation scales so the remaining ascent takes ~1.2 s of real time regardless of actual speed, so the window feels identical whether you are doing 15 m/s or 60.
- Clamp the dilation factor to `[0.04, 1.0]`.
- **Input samples at full real-time rate; the world runs slow.** The player feels fast, not sluggish. Essential, and easy to get wrong.
- Ends at the surface crossing or after `BREACH_MAX_REAL_TIME` (1.6 s).
- Cooldown 2.5 s before re-arming, preventing surface-bobbing exploitation.

> **Superseded in part (2026-10-25).** There are no tiers to reveal. The breach fires the routine's Breach trick (§4.2).

**The reveal.** During the window, the arena about to spawn is rendered ghosted at 30% opacity at its computed tier, with rare drops already glowing at full brightness. The player sees exactly what their dive bought, a beat before they have to fight it.

This is the highest-value second in the game. Give it the audio, the dilation, the ghost-in, the tier readout, and the sense that something is about to happen.

---

# 7. Air phase

## 7.1 The frame

```ts
interface FlightFrame {
  position: WorldPos;
  velocity: Vec2<MetresPerSec>;
}
```

Integrated ballistically with `AIR_GRAVITY = −18 m/s²` and negligible drag. Nothing controls it.

> **Superseded in part (2026-10-25).** The demo uses air gravity of −15 m/s² (the user's movement settings), so the apex and airtime examples below are slightly low for it.

Gravity is deliberately heavier than real. Real gravity makes long arcs floaty; this keeps them punchy.

Derived quantities, all pure functions:

- `apex = breachY + v_y² / (2|g|)`
- `airtime = 2·v_y / |g|`
- `tier = tierForApex(apex)`

At 20 m/s vertical exit: ~11 m apex, ~2.2 s airtime. At 35 m/s: ~34 m, ~3.9 s. At 60 m/s: ~100 m, ~6.7 s.

**Airtime scales linearly with exit speed while apex scales quadratically.** Tier therefore rises much faster than the time you get to exploit it. That relationship is what makes high tiers genuinely dangerous rather than merely lucrative, and it must survive tuning.

## 7.2 The arena

```ts
interface Arena {
  origin: WorldPos;          // === frame.position
  bounds: Rect;              // local space, fixed size
  tier: Tier;
  enemies: Enemy[];          // LocalPos
  projectiles: Projectile[]; // LocalPos
  pickups: Pickup[];         // LocalPos
}
```

Created at breach, dissolved at re-entry. Every entity inside stores exactly one position, in local space, for its whole life.

## 7.3 Player control in air

Direct, snappy, momentum-free:

| Constant | Start | Behaviour |
|---|---|---|
| `AIR_MAX_SPEED` | 16 m/s | Local, relative to the arena |
| `AIR_ACCEL_LERP` | 0.75 | Per-step lerp toward target velocity |
| `AIR_DECEL_LERP` | 0.82 | Per-step lerp toward zero on no input |

Near-instant response with just enough easing to avoid feeling robotic. Diagonals normalised. Position clamped to bounds with soft edge push-back.

**This must feel unmistakably different from the water.** If the contrast is not obvious in the first thirty seconds of play, retune before continuing.

## 7.4 Sprite orientation

**[CALL]** The dolphin orients to its *local* movement direction, not the frame's velocity. It should look like it is swimming through the air, because mechanically that is what it is doing. The frame's true trajectory is communicated by the background streaming past and by the motion trail, not by the sprite angle.

At commitment the sprite snaps to player heading control for the re-entry alignment check.

## 7.5 Dash

Short fixed displacement in local space (3.5 m over 0.12 s) with i-frames and a brief cooldown. Limited charges, restored on water entry. Because it is local, it is a pure dodge and does not perturb the arc at all.

## 7.6 Commitment

> **Superseded in part (2026-10-25).** Entry grading no longer exists, so the alignment and grading described below no longer affect play. 0 HP ends the run (§4.7).

**Phase 2 implementation call, pending human playtest (2026-09-12).** The original
text leaves an upward early commitment above the surface undefined. The current
trial uses quick return: at commitment, transfer the actual sprite position through
`toWorld`, bank frame velocity, and mirror an upward Y component downward. Dissolve
the arena and animate that one world-space body to the surface over 0.3 seconds,
with A/D heading control and no extra falling energy. Grade the banked vector at
the end. Forced commitment adds the specified 60% assist. A surface skip retains
the remaining dash charges; only a real water entry replenishes them. This keeps
early escape costly and avoids running underwater physics in midair. The user
was offered quick return versus natural fall; quick return is the stated default
assumption, not a recorded preference. This paragraph clarifies the implementation
of the two descriptions below for this trial.

**Voluntary.** The player holds the dive input. A ~0.3 s commit animation during which control transfers from free movement to heading control — the player rotates to align with the frame's current velocity vector. Then re-entry resolves.

**Forced.** The frame's arc reaches `y = 0`. Same resolution, with an auto-orient assist closing **[CALL]** 60% of the angle error, so an inattentive landing is sloppy but not catastrophic.

The commit window is where the two halves of the game hand off. It is the highest-value thing in the game to polish.

---

# 8. Enemies

## 8.1 Tiers

> **Superseded (2026-10-25).** Apex tiers and tier loot tables were removed. Enemy pressure comes from each wave's spawn schedule and per-wave enemy growth, with bosses at waves 10 and 20 (§10.2).

Tier is set once, at breach, from projected apex, and does not change during the flight. Set-once is more legible than continuous banding: the player chose their fight and is now in it.

| Tier | Apex | Character | Rare drop chance |
|---|---|---|---|
| 1 | < 15 m | Sparse. Learning space. | ~0% |
| 2 | 15–40 m | Baseline combat. | 2% |
| 3 | 40–80 m | Dense. Punishes predictable movement. | 8% |
| 4 | 80–150 m | Aggressive interceptors. Threatening. | 20% |
| 5 | > 150 m | Punishing. Should feel like a mistake you chose. | 45% |

`spawnDensity(tier)`, `rewardMultiplier(tier)` and `lootTable(tier)` are pure functions in the constants module, unit-testable and independently tunable.

## 8.2 Behaviours

Pure functions: `(enemy, arena, player) => Vec2<MetresPerSec2>`, all in arena-local space, independently testable without running the game.

Because the player moves freely rather than ballistically, enemy design targets **free movement**. Ship six:

- **Chaser** — moves at the player. The baseline. Its job is to be the thing that dies on contact by minute eighteen.
- **Interceptor** — leads the player's current local velocity. Punishes straight lines.
- **Swarmer** — spawns in clusters of 5–8, weak individually, loosely flocking. Creates the wall-of-bodies texture that makes high tiers feel thick.
- **Turret** — stationary in local space, fires aimed shots on a telegraphed cadence. Denies regions of the arena and forces movement.
- **Charger** — telegraphs hard, then dashes across the arena in a straight line. Punishes standing still; rewards reading tells.
- **Splitter** — on death becomes two smaller units. Makes clearing order matter and punishes indiscriminate fire at high tiers.

Deferred to §17 Phase 6: healers, buffers, elites, bosses.

## 8.3 Spawning

Spawn in a ring just outside arena bounds, in local space, at a rate set by tier. They are born local and die local. Despawn beyond `1.5 × bounds` or on arena dissolution.

Global cap `MAX_ENEMIES = 400`, defined once, asserted against spatial grid capacity in a test.

## 8.4 Spatial partitioning

Uniform grid in arena-local space, cell ≈ 2× largest entity radius, **rebuilt each step**. Rebuilding is cheaper and far less error-prone than incremental cell migration at these counts.

Benchmark: 400 enemies + 300 projectiles at 120 Hz under 4 ms per step in Node. Assert it.

---

# 9. Combat

## 9.1 Model

**Auto-firing projectiles.** The player's hands are busy with positioning; auto-fire lets combat read off the movement they are already doing.

## 9.2 Weapons

> **Superseded (2026-10-25).** The demo ships nine weapons in a 3 × 3 grid of type (Close, Shot, Blast) × cadence (Rapid, Steady, Heavy), 6 slots, and merging two equal copies into the next tier (max T4). They auto-target the nearest enemy. 2026-10-30: weapons carry one or two type tags that tricks boost (§4.6), and evolve through catalysts (§4.11). Weapons that reward a movement pattern, as described below, remain a valid direction under §4.9.

Up to 6 instances, each on its own cooldown with its own targeting rule. Ship four, each expressing a different relationship to the free-movement layer:

- **Spread** — fan opposite local movement direction. Rewards constant motion.
- **Lance** — single high-damage shot along local movement direction. Rewards committed dashes through the arena.
- **Orbit** — persistent projectiles circling the player. Rewards being surrounded; the only weapon that works while stationary.
- **Nova** — periodic radial burst centred on the player. Rewards diving into clusters.

Four weapons with genuinely different geometry beats twelve that differ only in damage numbers.

## 9.3 Evolutions

> **Superseded (2026-10-30).** Evolutions come from catalysts: a catalyst converts every copy of its matching weapon, at any tier (§4.11).

At weapon level 8, with the matching passive held, a weapon evolves: new name, new visual signature, a qualitative rather than quantitative change. Evolutions are a 2–4 minute beat and they must be **telegraphed** — show the requirement in the HUD as soon as the player holds either half. A goal the player can see coming is worth more than a surprise.

## 9.4 Damage

> **Superseded in part (2026-10-25).** The demo uses Armour, critical multipliers per weapon tier and per-type damage stats. 2026-10-30: Armour also protects the clean streak (§4.10). Tricks never deal damage (§4.4).

`damage = base × (1 + levelScaling) × critRoll`, crit a binary 2× roll. No armour, resistances or penetration in v1 — they multiply the tuning surface without adding decisions.

**Damage numbers are visible**, scaled by magnitude, in the weapon's own colour. Crits are larger and brighter. This is free dopamine and it should not be skipped.

---

# 10. Progression

**Revised 2026-10-30.** This section summarises progression for the structure in §4. The previous versions are in Appendix A (S4) and Appendix B (the routine).

## 10.1 Within a run

| Layer | Decides | Grows through |
|---|---|---|
| **Weapons** (6 slots) | Your damage types | The shop; merging T1→T4; catalysts (§4.6, §4.11) |
| **Tricks** | Which types are boosted each flight | Your choice every dive; trick items; combos unlocked by two-tag weapons (§4.4, §4.5) |
| **Items** | Every stat, every flight condition, every rule change | Level-up drafts, drops and the shop (§4.8, §4.9) |
| **XP orbs** | Levels | Collected in the air. Each level is a 1-of-3 item draft. |
| **Pearls** | Shop spending | The splashdown payout and wave pay (§4.10) |

## 10.2 Run structure

| Element | Target |
|---|---|
| Waves | 20, about 25 minutes; clearing wave 20 wins |
| Loss | 0 HP ends the run |
| Air clock | 20 s at wave 1, +5 s per wave, capped at 60 s; wave 20 is 90 s **[TUNE]** |
| Launch speed | 30 m/s at wave 1, +5 m/s per wave (designer rule; preserve) |
| Threat tier | Set by the launch angle: steeper means harder enemies and better loot |
| Bosses | Waves 10 and 20 |
| Starting build | One character, one weapon, all four tricks as singles |

Escalation steps are **announced**. Boss waves have a distinct sting.

## 10.3 Between runs

- **Unlocks by challenges, never a stat grind:**
  - characters
  - alternative trick versions
  - weapons, items and catalysts
- **Deterministic** and skill-gated. There are no random unlock rolls.

## 10.4 Run summary

This is the closure beat. Show:
- the final weapons, items and evolutions as a row of glowing icons
- which tricks and combos you dove with most
- the biggest splashdown payout and the longest clean streak
- waves cleared, kills and the cause of death
- any unlocks earned

Make it feel like a story with an ending. Then stop: no auto-requeue.

---

# 11. Visual language

The look is not decoration here. It is doing the same job as the mechanics: selling the contrast between two phases, and converting mechanical rewards into sensory ones.

## 11.1 Direction

**Neon-cyberpunk sprite work under a real 2D lighting system.** Chunky, readable, palette-limited sprites — then a full modern lighting and reflection stack on top, so everything that glows actually illuminates the world around it. Water is dark, volumetric and intimate. Air is additive, saturated and overwhelming.

Two references, deliberately assigned to the two phases:

- **Water** takes its cues from atmospheric 2D lighting work: your own glow is the primary light source, the surface overhead is a real reflective plane, light shafts and caustics move through suspended particulate, and the palette is tight and cold. It should feel quiet, deep, and slightly lonely.
- **Air** takes its cues from twin-stick vector shooters: additive blending everywhere, a deformable neon grid, kill explosions that throw hundreds of glowing particles, bloom cranked, chromatic aberration scaling with frame speed. It should feel like the inside of a fireworks display.

**The post-processing stack is phase-differentiated and lerped through the breach.** Different bloom thresholds, different ambient levels, different aberration, different colour grade — crossfaded over the breach window. The player's eyes should register the phase change before their hands do.

## 11.2 Palette

Defined as named tokens in one module. No hex literals at call sites.

| Token | Hex | Use |
|---|---|---|
| `VOID` | `#04050C` | Deepest background, sky at altitude |
| `ABYSS` | `#080B1F` | Deep water |
| `SHALLOW` | `#0E2440` | Water near surface |
| `PLAYER` | `#2BF5FF` | Dolphin glow, player projectiles, UI primary |
| `PLAYER_HOT` | `#B8FEFF` | Player core, dash trail, perfect-entry flash |
| `HOSTILE` | `#FF2D8F` | All enemies. Reserved — nothing else uses this. |
| `HOSTILE_HOT` | `#FF9ECB` | Enemy cores, hit flash |
| `TELEGRAPH` | `#FFB020` | Charge-ups, incoming attacks, danger. Reserved. |
| `XP` | `#9DFF3C` | XP orbs, level-up |
| `PRISMATIC` | animated hue cycle | Rare drops only. Never used elsewhere. |
| `SURFACE` | `#5FFFE0` | The water line itself |

**Colour is semantic and reserved.** `HOSTILE` and `TELEGRAPH` are never used for decoration. In a screen this saturated, colour is the only channel with enough bandwidth to carry threat information, and spending it on aesthetics makes the game unreadable.

## 11.3 Sprites as code

All sprites are generated at build/load time from TypeScript definitions — palette-indexed pixel grids or parametric shape generators — rasterised once into an atlas. Each sprite carries a paired **emissive mask** marking which pixels emit light.

This keeps every visual asset authorable, diffable and reviewable in the same tools as the logic, with no external editor and no binary files. An agent that can write code but cannot open an art package still ships a game that looks finished.

Sprites are small and chunky: the dolphin is ~32×16 px at a base scale of roughly 12 px/metre. Silhouette-first — every entity must be identifiable as a black shape at 20% scale.

## 11.4 Render pipeline

```
1. Scene pass        → albedo buffer + emissive buffer
2. Light accumulation → additive point lights, quadratic falloff, into light buffer
3. Composite         → albedo × (ambient + light) + emissive
4. Reflection pass   → surface plane only (§11.5)
5. Post chain        → bloom (Kawase dual-filter) → chromatic aberration
                       → colour grade (phase-lerped) → vignette → grain
6. UI pass           → unlit, drawn over everything
```

**Every emissive thing is a light.** Projectiles light the enemies they pass. The dolphin lights the particulate around it. Explosions momentarily light the whole arena. This single rule is what separates a real lighting system from a bloom filter, and it is the thing that will make the game look expensive.

Budget: cap simultaneous lights at 64, selected by screen-space proximity and intensity. Batch as instanced quads.

## 11.5 The water surface

The surface is the most important visual object in the game — it is the boundary between the two phases and it should be treated as a character.

- A real **reflection plane**: render the above-surface scene, flip it, distort with a scrolling normal map, blend with a depth-based tint and Fresnel-ish falloff by viewing distance.
- From below, it is a rippling mirror showing the sky and any enemies above.
- From above, it reflects the dolphin and the arena.
- **Breach displacement**: crossing it throws a radial spray of particles and punches a visible hole in the reflection that heals over ~0.8 s.
- **Entry quality is written into it.** A perfect entry produces a thin, clean, near-silent puncture. A belly-flop produces a wide, ugly, violent splash. The player should be able to judge their entry from the water alone, with the numbers turned off.

## 11.6 Water phase visuals

- **Caustics**: animated projected pattern on suspended particulate, intensity falling with depth.
- **Light shafts**: volumetric god rays from the surface, angled, parallaxing with camera motion.
- **Particulate**: drifting motes, density rising with depth, lit by the dolphin's glow — the primary conveyor of both speed and depth.
- **Depth grade**: `SHALLOW` → `ABYSS` → `VOID` as you descend, with saturation falling. Going deep should feel like going somewhere.
- **Speed lines** at high velocity, thin and cyan, converging behind.
- **Flow is visible**: the trail follows the curved velocity path and makes carried momentum legible. Do not imply or restore a mandatory hard-turn speed punishment.

## 11.7 Air phase visuals

- **The grid.** A neon wireframe mesh filling the arena, vertex-displaced by a spring system. It ripples from explosions, bows around the player, snaps on hits. It is the single strongest device for making an empty arena feel physical and reactive, and it belongs to the air phase only.
- **Kill explosions.** Additive particle bursts, count scaling with tier and enemy size. A tier-5 clear should genuinely flood the screen.
- **Streaming background.** Parallax star and light fields moving at the frame's *true* velocity — this is what sells the illusion that you are hurtling through the sky while the arena sits still. Layer count and speed scale with altitude.
- **Altitude grade.** The sky darkens toward `VOID` and stars intensify as you climb. Tier is readable from the background alone.
- **Speed aberration.** Chromatic aberration and a slight barrel distortion scaling with frame velocity.
- **Hit-stop.** 40–70 ms freeze on significant kills. The cheapest impact tool available and it should be used liberally.

## 11.8 Legibility discipline

Maximum saturation without discipline is noise. Three non-negotiable rules:

1. **Reserved colours** (§11.2). Threat information never competes with decoration.
2. **Telegraphs outrank everything.** Any incoming-danger indicator renders at higher luminance than any effect, after bloom, with its own layer. If a player dies to something they could not see through the particles, the effects budget is wrong.
3. **The player is always findable.** The dolphin carries a subtle persistent halo that survives any amount of surrounding chaos. If the screen is full of light, the player's light is still distinct.

Test these by screenshotting a tier-5 arena at peak density and asking whether a stranger can locate the player and the nearest threat in under a second.

## 11.9 Reward visuals

> **Superseded in part (2026-10-25).** The perfect-entry, streak and record-line rows describe removed systems. The current reward signatures are visible trick attacks, cancelled tricks, evolutions and the splashdown style payout (§4.10).

Every reward tier in §4 needs an unmistakable sensory signature:

| Reward | Signature |
|---|---|
| Kill | Flash, small burst, grid ripple |
| XP orb | Trailing spark that curves into the player |
| Combo tier up | Counter pulses, colour steps warmer |
| Level-up | Time stops, world desaturates, draft cards bloom in |
| Perfect entry | Clean puncture, rising chime, streak counter ignites |
| Streak lost | Counter shatters, colour drains, low thud |
| Rare drop | Prismatic hue cycle, visible across the whole arena, audible from spawn |
| Record broken | 150 ms hitch, the altitude line shatters, screen-wide flash |

---

# 12. Audio

Web Audio synthesis. No sample files — same authorability argument as §11.3.

> **Superseded in part (2026-10-25).** The perfect-entry, near-miss and belly-flop sounds describe removed systems. The payout is led by sound (§4.10): pitch climbing with each connected trick at splashdown, and a distinct sound for a cancelled trick.

- **Water**: low-passed, muffled, close. Filter cutoff tracks depth. A low drone that gets lower as you descend.
- **Breach**: filter sweep opening wide. The signature transition in the game and the single most rehearsed sound.
- **Breach window**: pitch-shifted drone detuned by the dilation factor, so the reveal audibly stretches.
- **Perfect entry**: clean tone rising in pitch with the streak counter. **The most important sound in the game** — the feedback channel for the core skill. A ten-streak should sound triumphant purely through pitch.
- **Near-miss**: the perfect-entry chime, detuned and cut short. It must read as *almost*.
- **Belly-flop**: ugly low thud. The punishment must be audible.
- **Air**: the music layer opens up — additional synth layers gate in with tier, so a tier-5 arena is audibly denser than a tier-1.
- **Kills**: short pitched blips, pitch rising with combo, so a good run generates an ascending melodic line out of pure gameplay.

---

# 13. Technology

## 13.1 Stack

**TypeScript · Vite · PixiJS v8 · WebGL2 · Vitest · Playwright · Node ≥ 20.** No game engine. No editor. No binary assets.

## 13.2 Why this stack

**The simulation runs headless in Node.** `sim/` imports no renderer. An agent can run ten thousand simulated seconds in a unit test and assert on results — no window, no human, no eyeballing. This is the decisive property and it is why this beats a conventional engine for an agent-built project.

**Branded types prevent the two dangerous bug classes at compile time.**

```ts
type Metres       = number & { readonly __unit: 'm' };
type MetresPerSec = number & { readonly __unit: 'm/s' };
type Seconds      = number & { readonly __unit: 's' };

type WorldPos = Vec2 & { readonly __space: 'world' };
type LocalPos = Vec2 & { readonly __space: 'arena' };
```

`position += velocity` fails to compile. So does mixing arena-local and world coordinates anywhere except the single transform function. Given that §3.3 is the architectural keystone, having the compiler enforce it is worth more than any amount of review discipline.

**Determinism is testable.** Fixed timestep, seeded PRNG, no wall-clock in the sim. Record an input trace, replay it, diff the state CSV. Behavioural regressions surface as numeric diffs at specific steps, which makes physics refactoring safe.

**Assets are text** (§11.3, §12), so an agent can author the entire visual and audio layer with the same tools it uses for logic.

**Deployment without rewrite.** Browser first — playtesting is a URL, which is enormous for iteration speed. Steam via Tauri, mobile via Capacitor, same codebase.

## 13.3 Dependencies

| Package | Purpose |
|---|---|
| `pixi.js` ^8 | WebGL2 renderer and custom shader pipeline |
| `vitest` | Unit and simulation tests |
| `@playwright/test` | Headless browser tests, screenshot diffs |
| `typescript` ^5.5 | `strict`, `noUncheckedIndexedAccess` |
| `vite` | Dev server, bundler |

No physics library — the physics here is bespoke and a general-purpose 2D engine will fight both the medium transitions and the frame model.

## 13.4 Layout

```
src/
  sim/                      ← pure TS. No pixi import. Lint-enforced.
    constants.ts            ← every tunable, single source of truth
    units.ts                ← branded units + space brands
    rng.ts
    world.ts
    step.ts                 ← the fixed-order update (§14.4)
    water/    physics · steering · entry
    flight/   frame · arena · control · commit
    breach/   window
    enemies/  behaviours/ · spawn · registry
    combat/   weapons · projectiles · damage
    reward/   draft · loot · escalation · streaks
    spatial/  grid
  render/                   ← pixi + shaders. Reads sim. Never mutates.
    pipeline/ lighting · reflection · bloom · grade
    sprites/  definitions · atlas
    palette.ts
  audio/
  input/
  harness/  headless · record · replay
tests/
  sim/ · golden/ · visual/
```

---

# 14. Binding architecture

## 14.1 Coordinates

**World space.** Origin at the water surface at the run's starting X. **Y is up** — positive is air, negative is water, `y === 0` is the surface. Angles in radians, 0 = +X, counter-clockwise, so `atan2(y, x)` works without correction. The renderer applies the Y-flip in exactly one function.

**Arena space.** Origin at the arena centre. Bounds roughly `±24 m` × `±14 m` **[CALL]**. All air-phase gameplay logic runs here.

One conversion function, `toWorld(local, arena)`, used by the renderer, the camera and re-entry resolution. Nowhere else.

## 14.2 Units

Metres, m/s, m/s², seconds, radians — all branded. The dolphin is 2.5 m long; a modest breach reaches ~20 m; an exceptional chained run exceeds 250 m. Pixels exist only in `render/`, via one `PIXELS_PER_METRE` constant.

## 14.3 Time and crossings

Fixed timestep, `SIM_DT = 1/120 s`, accumulator pattern, renderer interpolates:

```ts
accumulator += Math.min(frameTime, MAX_FRAME_TIME) * dilation;
while (accumulator >= SIM_DT) { stepWorld(world, SIM_DT); accumulator -= SIM_DT; }
render(world, accumulator / SIM_DT);
```

No gameplay code reads wall-clock time. Time dilation changes **how many steps run per real second**, never `dt` itself.

**Surface crossings are solved analytically** for the exact fractional step `t ∈ (0,1]`, rewinding to the crossing point before firing the transition. At speed the dolphin can traverse the whole surface layer in one step; solving analytically makes entry-quality evaluation exact and frame-rate independent.

## 14.4 Update order

Fixed. Do not reorder or insert without updating this document.

```
 1. Sample input → PlayerIntent
 2. Resolve dilation factor (breach window state machine)

 — WATER ONLY —
 3. Water: intent → thrust + steering forces
 4. Water: integrate (semi-implicit Euler)
 5. Water: solve surface crossing → BREACH (up) or ENTRY (down)

 — AIR ONLY —
 6. Frame: integrate ballistic arc
 7. Arena: origin := frame.position; check arc termination
 8. Player: intent → local velocity, clamp to bounds
 9. Enemies: spawn (arena-local)
10. Enemies: behaviours → accelerations → integrate
11. Projectiles: integrate
12. Spatial grid rebuild
13. Collisions: projectile↔enemy, enemy↔player, pickup↔player
14. Deaths, drops, XP, level-ups
15. Commitment check → RE-ENTRY if voluntary or forced

 — BOTH —
16. Camera
17. Telemetry frame (if recording)
```

Steps 3–5 and 6–15 are mutually exclusive.

## 14.5 Purity and determinism

Behaviours are pure functions from state to intent; mutation happens in the step function in the documented order. One seeded PRNG on the world. `Math.random`, `Date.now` and `performance.now` are banned in `sim/`. Stable iteration order, integer step counters.

## 14.6 Single source of truth

`sim/constants.ts` exports one deeply-frozen object. No other file declares a tunable. A test walks it and fails CI on any unreferenced leaf.

**User-requested live tuning (2026-09-12):** Phase 1 exposes 18 movement controls
for the human feel gate. Defaults and supported ranges remain in the frozen
constants object. Each run carries a validated, immutable override profile;
drivers latch changes before the next fixed step without changing the timestep
or restarting the body. Browser preferences are persisted locally and can be
copied as versioned JSON. Water traces may record initial and step-boundary
profiles; explicit replay never consumes browser preferences. Air rotation is
independently adjustable. This addition changes no default physics or existing
golden fixture, and does not satisfy or bypass the human playtest gate.

Medium is derived once per step in one function, with a ±0.15 m hysteresis band around `y = 0` to prevent flutter when skimming. No other code compares a Y value to a surface threshold.

## 14.7 No conditional gameplay

`sim/` contains no branches on `headless`, `debug`, or platform. Any driver — human, replay, test — produces a `PlayerIntent` upstream of step 1.

```ts
interface SimHarness {
  reset(seed: number): World;
  step(intent: PlayerIntent): World;
  snapshot(): StateFrame;
}
```

Built in Phase 0, before any game content.

---

# 15. Testing

## 15.1 Levels

> **Superseded in part (2026-10-25).** Tests for entry quality, perfect-entry apex growth, early-commit entries, draft guarantees and tier drops cover systems removed in §4. Their replacements are tests for the §4 rules: slot firing per flight phase, connected-trick mult and the clean bonus, trick cancellation on hit, the pearl payout curve, tag application and evolution unlocks, offer rarity and build weighting.

**Unit.** Entry quality bands. Medium resolution with hysteresis. Tier lookup. Apex and airtime derivation. Arena bounds clamping. `toWorld` round-tripping within float tolerance. Draft weighting distributions. Loot table distributions.

**Simulation.** Scripted intent sequences through the headless harness:

- From rest with no input, the dolphin sinks and reaches terminal velocity within tolerance.
- **Tight steering produces a smaller-radius arc through the same total trajectory angle, while both turns preserve momentum.** Unpowered quarter turns retain over 90% of speed at 26 and 60 m/s. Sustained turns do not separate the nose from the flow or reverse direction.
- Ten consecutive perfect entries produce monotonically increasing apex altitude.
- Breach at a given speed produces the predicted apex and airtime within tolerance.
- **Committing early produces a worse entry than riding the arc out.** This validates the risk dial.
- Over 1000 simulated drafts, no draft is entirely useless to the current build (original §4.3 draft guarantee; now applies to level-up drafts and shop offers, §4.9).
- Over 1000 simulated tier-5 clears, the rare drop rate matches the published number within tolerance.
- 400 enemies for 1000 steps: no NaN, no entity outside bounds plus margin.

**Golden replay.** Recorded traces with expected state CSVs. Any physics change surfaces as a numeric diff at a specific step. Regenerating goldens is a deliberate, reviewed act.

**Visual.** Playwright screenshot comparison at fixed seeds and step counts, including a tier-5 peak-density frame for the legibility check in §11.8.

## 15.2 Static enforcement

CI fails on:

- Any import from `render/`, `input/` or `pixi.js` inside `sim/`
- Any `Math.random`, `Date.now` or `performance.now` inside `sim/`
- Any mixing of `WorldPos` and `LocalPos` outside the single transform
- Any numeric literal in `sim/` outside `constants.ts` that is not 0, 1, or documented
- Any constant in `constants.ts` with no reference elsewhere
- Any colour literal in `render/` outside `palette.ts`

---

# 16. Performance targets

| Target | Budget |
|---|---|
| Simulation step, 400 enemies + 300 projectiles | < 4 ms (Node) |
| Full frame at 1080p, tier-5 peak density | < 12 ms |
| Simultaneous dynamic lights | ≤ 64 |
| Particles | ≤ 4000, pooled, instanced |
| Cold load | < 3 s |

Budgets are asserted in tests where measurable, not merely aspired to.

---

# 17. Build sequence

Each phase has a gate. **Do not begin a phase until the previous gate passes.**

### Phase 0 — Scaffold
Vite, TS, Vitest, Playwright. `sim/` boundary lint rules. Branded units and space brands. Seeded PRNG. `constants.ts` with the dead-constant test. Fixed-timestep loop. Headless harness. Record/replay with CSV output.

**Gate:** record 1000 steps of a stationary world, replay, diff byte-identical.

### Phase 1 — Water
Momentum physics, steering, redirect and turn cost, drag, thrust. Analytic crossings. Entry quality and streaks. Surface skip. A single-line surface, a dolphin shape, a camera, a speed readout. Breaching arcs and falls back under simple ballistics — no air phase yet.

**Gate, two parts:**
1. *Mechanical:* all water simulation tests pass, including momentum preservation, tight-versus-wide curvature, and continuous flow-aligned steering.
2. *Human:* a person dives and breaches for five minutes and wants to keep going. **Not optional, not automatable.** If the empty ocean is not fun, retune §5 before proceeding.

### Phase 2 — The frame
Flight frame, arena, the transform, free air movement, bounds, commitment (voluntary and forced), re-entry resolution, breach window with dilation. The arena is empty.

**Gate, two parts:**
1. *Mechanical:* apex/airtime tests pass; early-commit-versus-ride-it-out passes; `toWorld` round-trips exactly.
2. *Human:* a player can describe, unprompted, what the air phase is and how it differs from the water. **This gate validates the core idea and is the most important one in the document.** If the phases blur together, rework before building content on top.

### Phase 3 — Threat
Spatial grid, enemies, tiers, spawning. Two behaviours: chaser and swarmer. Player damage and death. No weapons — the player can only dodge.

**Gate:** 400-entity benchmark passes. Tier 1–2 survivable by movement alone; tier 5 kills reliably.

### Phase 4 — Combat
Weapon system, all four weapons, projectiles, targeting, collisions, kills, damage numbers.

**Gate:** each weapon's geometry verified by test; a full run playable end to end.

### Phase 5 — Reward

> **Superseded in part (2026-10-25).** The reward phase now targets §4: the five-slot routine, trick upgrades, tags and weapon evolutions, the style payout, the shop and the economy. Tier loot, streaks and the altimeter are out; XP and level-up stat picks stay.
XP, orbs, levels, the draft with weighting and guarantees, loot tables, streaks, combo, escalation, the altimeter and record lines, run summary.

**Gate, two parts:**
1. *Mechanical:* draft and loot distribution tests pass at 1000 samples.
2. *Human:* record a five-minute session and confirm no gap longer than 10 seconds without a reward event.

### Phase 6 — Depth
Remaining four enemy behaviours. Evolutions. Full tuning pass against the §4.13 power curve. Commit-window polish.

**Gate:** a full run follows the §4.13 power-inversion shape.

### Phase 7 — Visual
The full §11 pipeline: lighting, reflections, caustics, the grid, particles, phase-lerped post stack, all sprite definitions. Audio per §12.

**Gate:** the §11.8 legibility test passes on a tier-5 peak-density frame with a stranger as the subject.

### Phase 8 — Platforms
Tauri (Steam), Capacitor (mobile). Touch is a real design problem: water maps well to two screen halves, but free air movement wants a virtual stick.

---

# 18. Non-goals for v1

> **Superseded in part (2026-10-25).** The demo now includes bosses (waves 10 and 20) and Armour, so those two entries no longer hold.

- Multiplayer, leaderboards, networking
- Permanent stat upgrades or grind-based meta-progression
- Procedural level generation — the ocean is uniform; tiers are the level
- Boss encounters
- Story, dialogue, cutscenes
- Localisation
- Armour, resistances, elemental damage systems
- Underwater combat — water is the setup phase; keep it clean
- Any second stored position for any entity, under any name

---

# Appendix A. S4 slot-machine design (superseded 2026-10-26)

This is the 2026-10-25 design that the S4 demo build implements: tricks as random reels with poker combos, chips × mult as the wave quota, bails and busts. It was replaced by the routine design in §4 and §10. It is kept for comparison. Section references inside this appendix (§4.x, §10.x) refer to its own numbering (A1.x, A2.x).

## A1. Reward architecture and scoring

**Revised 2026-10-25.** This section replaces the original §4 (altimeter score, tier jackpots, entry-quality near-misses and the level-up draft as the primary reward). It is the target scoring and build design for the playable demo (`source/`, built to `ICARUS-demo.html`). The demo does not implement all of it yet: draws still grow for free, 0 HP still ends the run, and there are no trick bails, busts or chip bonuses. All numbers marked **[TUNE]** are starting points; the structure beside them is the requirement. Items marked **[OPEN]** are unresolved and must be raised, not guessed.

### A1.1 The thesis

ICARUS is three proven loops joined by the flight:

| Layer | Reference | Role in ICARUS |
|---|---|---|
| Auto-firing combat with weapons, stats and items | Brotato | Kills are **chips**: how much is riding on this jump. |
| Tricks performed in sequence through the flight | Tony Hawk's Pro Skater | The spectacle, and the reels of the slot machine. |
| A scoring machine you upgrade between rounds | CloverPit, Balatro | Tricks, combos and charms are the **mult**. Your build decides how big a jump pays. |

**Every jump is a pull of the lever.** The launch pulls it, the tricks resolve as the reels, the kills decide the stake, getting hit is the danger that can wipe the spin, and the water entry banks the payout.

The slot-machine structure was already the insight of the original §4.1. What has changed is where the randomness and the payout live: the payout is now an explicit score, and the build is a machine the player constructs.

### A1.2 The score

```
bank = chips × mult      (paid at water entry)

chips = kill value earned this jump + chip bonuses + chip effects
mult  = values of landed tricks + combo payouts + charm effects
```

- **Chips** come from kills. They are visible as enemies die; the player never has to calculate them.
- **Chip bonuses: how you kill matters, not only how many.** Without them, chips are roughly a kill count capped by spawns, and every build scores alike. Kills pay extra chips for how they happened. These are score effects and never change weapon damage. **[TUNE]** all values.
  - **Multi-kills:** one attack killing several enemies pays more per victim.
  - **Apex kills:** kills during the apex window pay extra.
  - **Crit kills:** a killing blow that crits pays extra.
- **Mult** is built from the tricks that land (§4.4, §4.6), the combos they form (§4.5) and the player's charms (§4.8).
- **Resolution order at the bank:** tricks → combos → charms, left to right as arranged in the charm row.
- The bank is the payoff moment and must be the loudest, clearest event in the game (§4.12).

### A1.3 Loss condition and the air clock

**There is one way to lose a run: miss a wave's quota.** Health no longer ends a run (§4.6).

- Each wave has a **quota** and an **air clock**. The clock only runs in the air; water is safe and pauses it.
- **The air clock is the number of pulls you have.** A low launch spends little air for a small bank; a high launch spends more for a bigger one.
- When the clock expires, enemies keep spawning, kills and score continue and combat stays dangerous. The wave ends at the next water entry, after that bank and the quota check. There is no early quota exit and no safe coast. (User rule, 2026-10.)
- Clearing a wave pays pearls (§4.10), restores HP and opens the shop.

### A1.4 Tricks: the reels

- Each jump's tricks are drawn from the five identities: **Spout, Front flip, Backflip, Corkscrew, Star pose**, according to the player's draw weights. They are drawn at breach.
- **The tricks are performed automatically, in drawn order, across the flight.** Each completed trick reveals its mult on the scoreboard. They never gate movement or weapon damage.
- **The player is never expected to read the hand during play.** Underwater lasts about a second, and in the air the player is dodging. The reels are watched at a glance, like a slot machine, not planned around. All reading happens in the shop.
- A jump with no kills banks nothing and keeps the same tricks for the next jump.
- **Draw count is bought, not given.** Base 3 draws, maximum 6 **[TUNE]**. More reels come from Routine offers (§4.9), never from a free wave schedule. Free growth made the trick build irrelevant: in the S3 demo the average unupgraded mult rose from 3.6 to 13.1 purely from free draws.

### A1.5 Combos: the paylines

Combos pay when the drawn tricks match a pattern. Names are taken from poker so players arrive already knowing them.

| Combo | Base bonus | Group |
|---|---:|---|
| Pair | 1 | Repeat |
| Two Pair | 2 | Formation |
| Triple | 3 | Repeat |
| Full House | 4 | Formation |
| Full Show (all five identities) | 7 | Variety |
| Four of a Kind | 8 | Repeat |
| Three Pairs | 9 | Formation |
| Double Triple | 13 | Formation |
| Five of a Kind | 14 | Repeat |
| Six of a Kind | 24 | Repeat |

All matching combos pay, including nested repeats. Combo groups can be levelled (§4.9). Odds are displayed in-game, using the player's actual draw weights and draw count (§4.15).

### A1.6 Danger: hits bail tricks, 0 HP busts the jump

Getting hit is the slot machine's danger, and it is Tony Hawk's bail.

- **A hit bails the trick in progress.** That trick turns into a **Bail** symbol on the reels and pays nothing. It does not count towards combos. Tricks already landed keep their value.
  - Damage therefore costs mult in proportion to how good the trick build is, so defence works with a build instead of being a stat every build takes.
  - Bails are also a hook for charms (for example, "Bails pay +2 chips").
- **Every accepted hit also costs HP.** HP decides one thing only: **busts**. It does not feed the score.
- **0 HP busts the jump.**
  - The jump banks nothing.
  - The dolphin falls from where it is to the water, and **the fall spends air clock** for its duration. **[TUNE]** fall speed.
  - **[CALL]** The next jump starts at **50% of max HP** **[TUNE]**. A full refill would make busting a cheap heal (diving in at low HP to come back full).
  - **[CALL]** The busted hand is discarded. The next jump's tricks are drawn when the dolphin reaches the water, as for any jump.
  - **[CALL]** In overtime, the bust's water entry counts as the water entry that ends the wave. It banks nothing, then the quota is checked.
  - **[CALL]** The fall is out of combat: the dolphin cannot be hit or score during it.
- HP otherwise carries between jumps within a wave, with Regen, and is restored at wave end.
- **Optional, through charms only:** an HP-based payout bonus, if wanted, is a charm, based on percentage of max HP and capped, for example "×1.5 mult if above 75% HP". It is never a baseline rule.

Damage shows up on the reels the player is already glancing at, as bailed tricks and, at worst, a zero.

### A1.7 The spending trade-off

Every pearl goes into one of three investments, all priced in score:

| Invest in | Through | Pays off as |
|---|---|---|
| **The stake** | Weapons, offensive gear and stats | More chips per jump |
| **The machine** | Tricks, combos, charms | More mult per jump |
| **Protection** | Max HP, Armour, Regen, defensive gear | Fewer bailed tricks and fewer busts |

A build that ignores any of the three should be possible but costly. Protection's value scales with the machine it protects, so a weak trick build has little to lose and a strong one has a lot. Weapon type also sets risk. Close weapons need proximity and invite hits, and they add Armour. Shot weapons keep distance and are safer. Blast weapons sit between.

### A1.8 Charms: rewriting the machine

Charms are the build-defining layer, equivalent to Balatro's jokers and CloverPit's charms.

- **Effect types:** `+chips`, `+mult`, `×mult` and `pearls`. The code already defines colours for all four.
- **Charms bend the machine's rules**, not only its numbers. Examples of the intended space:
  - a trick that counts as any identity (a wild)
  - retriggers ("Backflip resolves twice")
  - payline rewrites ("Pairs pay ×2")
  - odds shifts ("Lucky chance +10%")
  - Bail interactions ("Bails pay +2 chips")
  - flight-phase hooks ("+3 chips per kill during descent")
- **Charms resolve left to right at the bank.** The player arranges the order in the shop. Order must matter, mainly through `×mult` placement.
- **Each charm is readable in two lines** at most and has at most one condition. No stacked multi-condition text. The same rule applies to every gear item and weapon description.
- **Binding constraint (user rule):** no charm changes weapon damage. Charms change score and pearls only.
- **Scale target:** about 30–40 charms for the demo, with enough `×mult`, retrigger and scaling effects that a strong build is many times stronger than an unbuilt one. In S3 the strongest focused trick build was only about 2.6× an unbuilt one, which is too low.

### A1.9 Upgrading the machine

- **The trick scoreboard is always visible in the shop.** It shows each trick's value, its draw chance and every combo's payout. It is information, not a purchase.
- **Routine offers** (packs and single offers, like Balatro's planet cards) are the steady upgrades. Each offer does one of:
  - raise a trick's value
  - level a combo group
  - shift draw odds
  - add a draw (§4.4)
  - grant a technique
- **Techniques** are Routine offers, not a separate system. Each modifies one trick:
  - **Lucky:** a chance to repeat that trick's value.
  - **Gold:** grows across waves.
  - **Echo:** at the bank, the trick adds one extra copy of itself for combos when that improves the payout. Echo is already implemented and must be offered.
- **One rare offer to commit,** like Balatro's Telescope: "Routine offers favour your most-drawn trick."
- **Increments must be felt.** Moving 5% of draw chance or adding +0.5 mult is too small to notice. **[TUNE]**
- **[CALL]** There is no always-available upgrade menu. Offers are random so that runs diverge and the player steers towards what they find.

### A1.10 Shop and economy

The shop between waves is where all building and all reading happens.

**Four categories:**

| Category | Contains |
|---|---|
| Weapons | 9 automatic weapons in 3 types × 3 cadences, 6 slots, merge two equal copies into the next tier (max T4) |
| Gear | Stat items with trade-offs and combat items, merged into one category. |
| Charms | §4.8 |
| Routine | Trick values, combo levels, draw odds, extra draws and techniques (§4.9) |

**[CALL]** Vouchers are no longer a category. Permanent run rules, such as an extra charm slot, cheaper rerolls, an extra shelf slot or the commit offer, appear as rare offers in the row they affect.

**XP and level-ups stay (user decision, 2026-10-25).** Kills drop XP orbs that are collected in the air, so steering for them is a positioning decision. Each level offers a free pick of three stats (combat, defence, flight/economy) before shopping. Stats therefore come from Gear and level-up picks. **Levels add no Max HP by themselves** (user decision): defence grows only by choice. S4 briefly removed XP; that was reverted.

**Offer rules:**
- **Rarity** sets how often an offer appears, not only its price, and each rarity has a visible colour.
- Charm and gear offers are **weighted towards the held build**. Weapons already are.
- The shop keeps its existing conveniences: lock, separate rerolls per row, sell at 50%, combining weapons and the replace-a-slot flow with its net price.
- **Deferred:** a once-per-run banish. Add it only if playtests show players need more control over offers.

**Pearls:**
- base pay per wave cleared
- interest on saved pearls (10%, capped) **[TUNE]**
- **overscore converted to pearls.** Beating the quota by a wide margin funds the build. This is the loop from score back into power. The current cap of 24 is too low **[TUNE]**.
- `pearls` charms

### A1.11 Flight language

**Every system speaks the flight.** Each new weapon, gear item or charm should answer one question: *which part of the jump does this make you want to own?* That means breach, ascent, apex, descent, water entry, how high you launch, or how many jumps you take.

This is what keeps ICARUS from being a bullet-heaven with a score attached.

### A1.12 Payout presentation

Nobody can read mid-flight, so the payout must be **glanceable**:
- It is led by sound, and climbs in pitch with each charm, as the existing charm notes already do.
- It uses colour and one large number in the bottom scoreboard: **chips × mult = score**.
- Each completed trick and combo pulses as it resolves. A hit turns the trick in progress into a Bail on the reels at that moment, with a distinct sound.
- A bust is unmistakable: the reels go dark and the jump scores zero.

Detail belongs in the shop. The "last flight · see why" breakdown shows every trick (landed or bailed), combo, chip bonus and charm (paid or missed, with the reason).

### A1.13 The power curve

The run must still have the power-inversion shape. You start cautious and end as the hazard. The original rule stands: **the enemy that was terrifying early should die on contact late, and the game should make sure you notice.**

The score has its own escalation. Early banks are in the tens, and late banks should be able to reach numbers that make a viewer laugh. Plan for very large numbers in the display from the start.

### A1.14 Cross-run progression

**[CALL]** Minimal and achievement-based, not grind-based. Milestones unlock content: for example, bank a Six of a Kind, clear wave 20, or bank a set score in one jump. Each unlocks a weapon, a charm, a starting dolphin with a passive that bends a rule, or a starting modifier. **Deterministic, skill-gated, no random unlock rolls and no permanent stat upgrades.**

Starting dolphins are the cheapest large source of run variety, as characters are in Brotato and Isaac.

### A1.15 Ethical constraints

These are binding design constraints, not aspirations. A slot-machine structure is powerful, and the line between "well-paced" and "predatory" is a design decision made deliberately, here.

- **Session-bounded.** No daily rewards, login streaks, energy systems, timed events, or anything that punishes not playing. The game must never make the player feel they are losing ground by closing it.
- **No monetary stake.** No purchasable advantage, no loot boxes for money, no ads.
- **Randomness affects pace, not access.** Every piece of content is reachable by every player. Variance changes how fast you get there, never whether you can.
- **Honest odds.** Draw chances, combo odds, Lucky chances and offer rarities are all visible in-game.
- **Real stopping points.** The run ends. The summary screen is a conclusion, not a queue prompt. No auto-requeue, no countdown to the next run, no interstitial designed to catch someone mid-exit.
- **Playtime is not a metric.** If a change increases session length without increasing how good the session feels, it is a bad change.

### A1.16 Open questions

1. Resolved in build S4: all 17 original charms were rewritten to the two-line standard and 20 new charms added (37 in total); the 10 combat items have two-line text, with stacking details moved to the details panel.

Fall speed and the quota curve are tuning, marked **[TUNE]** where they appear. They are not open design questions.

**Considered and rejected (2026-10-25):**
- Making airtime decide how many tricks complete. Every drawn trick still completes unless a hit bails it.
- A "this jump needs X" readout.
- A pre-launch heat cue (a colour and tone during the dive rating the next tricks). Built in S4 and removed: it added a system while rarely saying more than cold or warm.

## A2. Progression

**Revised 2026-10-25.** This section replaces the original §10 (draft-only progression, endless time-based escalation and an altitude-based summary). Scoring, the shop and the economy are specified in §4.

### A2.1 Within a run

- **Between waves: the shop (§4.10).** This is where the build is made and where the player reads it.
- **XP and levels:** kills drop XP orbs, collected in the air. Each level gives a free stat pick from three before the shop (§4.10). Levels add no Max HP by themselves.
- **The stat pool still spans both phases**, or the build layer ends up orthogonal to the game:
  - **Flight:** Lift, Hang, Air steering
  - **Combat:** type damage, Damage %, Attack speed, Crit, Reach, Area
  - **Defence:** Max HP, Armour, Regen. Under §4.6 they protect landed tricks and prevent busts.
  - **Economy:** Pickup, Luck, XP gain
- **Launch shape is a build axis.** Builds that pay for long apexes and descents favour high launches. Builds that pay for breach and entry favour many short hops. Both must be viable.

### A2.2 Run structure

| Element | Value (rows marked *target* are not yet in the demo) |
|---|---|
| Waves | 20; the run is won by clearing wave 20 |
| Air clock | 20 s at wave 1, +5 s per wave, capped at 60 s; wave 20 is 90 s **[TUNE]** |
| Launch speed | 30 m/s at wave 1, +5 m/s per wave (user rule; preserve) |
| Bosses | Waves 10 and 20 |
| Permanent-rule offers | *Target:* rare offers in the row they affect (§4.10). Demo: a voucher shown in the shops after waves 5, 10 and 15 |
| Trick draws | *Target:* base 3, bought up to 6 (§4.4). Demo: free growth at waves 5/10/15 |
| Quota | Escalates per wave from the expected kill value of that wave's spawn schedule **[TUNE]** after the draw change |
| Loss | *Target:* missing a quota (§4.3); health busts jumps, it does not end runs (§4.6). Demo: 0 HP still ends the run |

Escalation steps are **announced**. Boss waves should have a distinct sting. Visible dread is better pacing than invisible difficulty drift.

### A2.3 Run summary

This is the closure beat. Show:
- the biggest single bank and the jump that made it, as chips × mult with its tricks
- the best combo landed
- busts suffered
- waves cleared and kills
- the final build as a row of glowing icons (weapons, charms, techniques)
- any milestones unlocked

If the run was lost, show where the quota was missed and why, using the recorded run. Make it feel like a story with an ending. Then stop: no auto-requeue.

---

# Appendix B. The routine and positional design (superseded 2026-10-30)

This is the design of 2026-10-26 to 2026-10-30:
- a five-slot trick routine
- setups and payoffs, and the positional effect grammar
- classes
- the step-by-step plan, steps 0–10 of which were built on the branch (B1.20)
- the trick redesign of 2026-10-30, in which air tricks place enemies for the guns and only water tricks damage

It was replaced by §4 and §10 on 2026-10-30. The built code stays in the demo behind its settings until §4.17 replaces it. Section numbers cited inside this appendix (§4.x, §10.x) refer to its own sections, B1.x and B2.x.

## B1. Reward architecture: the routine

**Revised 2026-10-27.** This section replaces the 2026-10-25 slot-machine design, which is preserved as Appendix A and is what the S4 demo build implements. It is the target design for the next build; the demo does not implement it yet.

- The 2026-10-27 revision adds the positional effect grammar (§4.16), classes (§4.17), space and flight rules (§4.18), example effects (§4.19) and the build-and-playtest plan (§4.20).
- It also records three designer decisions: the clean streak carries across flights, evolutions are earned by feats, and tricks count toward class set bonuses.
- It is grounded in the flow study (`docs/flow-study/`, summarised in `docs/GAME_MAP.md`).

Markers:
- **[TUNE]**: a starting number; the structure beside it is the requirement.
- **[CALL]**: a decision made in the designer's favour that can be overridden cheaply.
- **[OPEN]**: an unresolved question, to be raised rather than guessed.
- **[VERIFY]**: a claim that follows from the engine's structure but has not been tested in play.

### B1.1 The thesis

> **Build a five-move routine. Your dolphin performs it through every flight. Where you fly decides what it hits. Style earns the pearls that buy your power.**

| Layer | Reference | Role in ICARUS |
|---|---|---|
| Survive waves; shop between them; auto-firing weapons; classes and stats | Brotato | Combat, survival and build diversity |
| Status reactions and weapon evolutions earned by play | Ball x Pit, Vampire Survivors | Discovery and builds that break the game |
| Tricks performed through the flight | Tony Hawk's Pro Skater | The routine: setups and payoffs placed on the flight, the style score and the clean streak |

What the player should feel: **"I flew that way because of my routine, and that is why those enemies died."**

Two tests apply to every trick, weapon and item:
1. **When the player changes it, do they change how they fly?** If not, it needs work.
2. **Does it name one anchor and one verb (§4.16)?** If not, it's a stat, not an effect.

**Positional play is the priority.** Movement, trajectory, herding enemies and positioning decide outcomes. **Proximity scaling** (power rising with nearby enemy count) was **considered and rejected** (designer decision, 2026-10-27).

### B1.2 The flight and its five slots

Every flight passes through five phases. Each phase is a routine slot.

| Slot | Kind | When it fires |
|---|---|---|
| **Breach** | Moment | Once, as the dolphin leaves the water |
| **Ascent** | Stretch | Repeatedly while climbing, as pulses or an aura **[TUNE]** interval |
| **Apex** | Moment | Once, at the top of the arc |
| **Descent** | Stretch | Repeatedly while falling **[TUNE]** interval |
| **Entry** | Moment | Once, at water contact |

- **Launch shape decides what the routine does.** A high launch gives long ascent and descent stretches. A low hop reaches the moments quickly, allows more flights and keeps the water surface in reach (§4.16).
- **The player controls where the moments happen,** through launch and steering: where the apex peaks and where the dolphin lands. Weapons keep aiming and firing automatically.
- **Each phase asks a positional question:**

  | Phase | Question |
  |---|---|
  | Release | Which route through the formations? |
  | Ascent | Herd the enemies, or avoid them? |
  | Apex | Where do I peak? |
  | Descent | Do I sweep the chasers? |
  | Entry | Do I land in the pool? |

### B1.3 Tricks and the routine

- **A trick is an ability with a visible attack shape** that its animation explains. Tricks fire automatically when their slot's phase arrives.
- **Tricks are setups or payoffs** (§4.16 D):
  - **Setups** move, hold or status enemies and deal little or no damage.
  - **Payoffs** consume setups.
  - A payoff that hits enemies your own setup moved or statused is **linked** (§4.6).
- **Any trick can go in any slot.** There is no base phase restriction. Order matters because setups must fire before the payoffs that consume them.
- **Each trick fills one slot.** A routine cannot hold two copies of the same trick. Buying another copy of an owned trick **levels it up**, like merging weapons.
- **All five slots are open from wave 1**, but the run starts with **one trick**. **[CALL]** It is chosen from three offers at the start of the run, alongside the starting weapon.
- **The routine persists** until the player changes it in the shop. **[CALL]** Rearranging is free.
- **Each trick carries a class tag** (§4.17) and **counts as one item toward class set bonuses** (designer decision, 2026-10-27).
- **Phase bonuses come only through upgrades**, for example "Spout: double damage in the Entry slot". They are never a base rule players must learn.

**Starting trick identities to prototype.** These are roles, not balance values. §4.19 has more.

| Trick | Anchor · shape → verb | Setup or payoff | Class | Natural slot |
|---|---|---|---|---|
| **Corkscrew** | Around · burst → Push | Setup | Sonic | Breach: clears space as the arena opens |
| **Gravity anchor** | Apex point · point → Pull | Setup | Current | Apex, or the stretch before a payoff |
| **Star pose** | Around · burst → Burst | Payoff | Blast | Apex: place the peak inside a cluster |
| **Spout** | Landing point · splash → Splash, applies Soaked | Payoff | Tide | Entry: hits the landing pool; size scales with fall height |
| **Front flip** | Ahead · ram → Ram (invulnerable) | Payoff | Ram | Ascent: line up a path through enemies |
| **Backflip** | Behind · sweep → Sweep | Payoff | Blade | Descent: strike enemies chasing you |

The pool must grow to about 10–15 tricks at first, so that choosing a routine is a real decision. **[OPEN]** The full trick list.

### B1.4 Trick upgrades

- **Levels** come from extra copies. They raise power and style value (§4.6).
- **Transformations** are choices offered as a trick levels. Each keeps the trick's trigger, anchor and identity while changing its shape:
  - Corkscrew: **Fork** (wider fan) or **Drill** (a piercing column).
  - Spout: **Broad splash** (more water covered) or **Lingering wake** (the landing attack stays active for pursuers arriving later).
- **Status upgrades** add or strengthen a status (§4.5). Examples: Corkscrew applies Soaked; Spout's water reaches enemies in the air.
- **The former charms are folded into trick upgrades and gear.** Their flight-phase ideas become trick upgrades or style conditions, for example "Star pose: +2 style if it hits 5 or more enemies". Score-only charms are removed. A few economy effects may survive as gear.
- **Later layer:** named sequences, where specific setup → payoff pairs in adjacent slots carry a bonus. Add these only after linking (§4.6) feels good.

### B1.5 Statuses, reactions and evolutions

**Statuses replace the earlier tags.** That makes it one system, not two.

**Rule:** a status must change where enemies go, or what they become in space. Plain damage over time or slowing adds nothing to positional play.

| Status | Applied by (examples) | What it does in space | Payoff |
|---|---|---|---|
| **Soaked** | Spout, Breach wave, Blowhole | Soaked enemies sink toward the surface, which feeds the landing pool | Conducts Shock; flash-freezes |
| **Shock** | Arc, Storm cell | Jumps between enemies within 5 m **[TUNE]**, so it rewards clusters | Chain length = cluster size |
| **Burn** | Flak, Fire wake | Spreads when enemies touch, so a bunched group ignites | Pull a group together first |
| **Freeze** (stacks of chill, then frozen) | Depth charge, Ice wake, Bubble net | A frozen enemy is a solid block: it blocks other enemies and can be stomped off | A ram or stomp shatters it into an area blast |
| **Bleed** | Fin, Harpoon critical hits | Other enemies are drawn to bleeding ones, so enemies herd themselves | A burst where they gather |

**Reactions (three at most):**
- **Conduct:** Soaked plus Shock chains through every soaked enemy.
- **Flash-freeze:** Soaked plus chill freezes instantly.
- **Steam:** Burn plus Soaked makes a cloud that blinds turrets. It's a defensive positioning tool.

**Caps and colour:** at most 5 statuses and 3 reactions, each with its own colour. The screen is small and flights are short. Slow folds into Freeze; Pierce is a projectile property, not a status; Marked folds into Sonar effects.

**Evolutions are earned by feats** (designer decision, 2026-10-27):
- **Rule:** a **T4 weapon** plus **its feat performed N times** **[TUNE]** offers that weapon's evolution in the shop. Each feat is written in the grammar of §4.16, so mastering positioning unlocks power.
- **Telegraph:** the shop shows feat progress as soon as the player holds the weapon, and shows what the evolution does.
- **Limit:** at most one evolution per weapon. Each one changes the weapon's shape or role, not just its numbers.

| Weapon | Feat | Evolution |
|---|---|---|
| Arc | Conduct through 50 soaked enemies | **Storm:** chains are unlimited through Soaked |
| Harpoon | Pierce 3 or more enemies lined up, 20 times | **Tether harpoon:** pulls hit enemies onto your path, turning a payoff weapon into a setup |
| Depth charge | Shatter 30 frozen enemies | **Glacier:** the blast area freezes into stompable blocks |
| Flak | Ignite 40 enemies through spread | **Fire wake:** your path burns |
| Fin | Bleed 30 lured enemies | **Blood fin:** every hit lures nearby enemies |

**[OPEN]** The evolution list for every weapon as the roster grows (§4.17).

### B1.6 Style score and payout

The style score is Tony Hawk's: **kills are the base, the routine is the multiplier, and a clean streak raises the stakes.** It is paid at splashdown and converted to pearls. It never decides survival.

```
chips  = enemies killed during this flight
mult   = sum of the style values of connected tricks
         (style value = the trick's level, so 1 at level 1)
         + 1 for each linked payoff [TUNE]
streak = clean flights in a row, counting this one (1 if this flight took a hit) [TUNE cap]
score  = chips × mult × streak
pearls = payout curve(score)
```

- **A trick connects** if it performed without being interrupted **and** hit at least one enemy. A trick that fires into empty air adds nothing. **[CALL]**
- **A payoff is linked** when it hits enemies that your own setup moved or statused during the same flight.
- **The clean streak carries across flights** (designer decision, 2026-10-27). It replaces the per-flight ×2. A hit resets it to 1. The longer it lives, the more each flight risks, so the last flights of a wave carry the stakes. **[OPEN]** Whether the streak survives the shop between waves.
- **A hit cancels the trick in progress** and resets the streak.
- **Payout curve [TUNE]:** diminishing returns, either tiers or a square-root curve. Great style earns more pearls without running away with the economy.
- **The splashdown cascade** stays as the presentation: each connected trick, linked bonuses, the streak, then the payout in pearls.

### B1.7 Danger and the loss condition

- **0 HP ends the run**, as in Brotato. There is no quota and no bust.
- **A wave is survived, not scored.** Each wave has an air clock that runs only in flight. When it runs out, enemies keep coming and the wave ends at the next water entry. There is no safe coast (user rule, 2026-10).
- **Getting hit** costs HP, cancels the trick in progress and resets the clean streak. Defence protects both your run and your income.
- **Danger is positional:**
  - Enemy shots lead your predicted arc.
  - Hazards sit on your path.
  - Enemies have exposed sides.
  - Closing nets force a route (§4.18).

  The flow study measured 0.2 hits per flight for a cautious bot, too few for the cancel and the streak to bite. **[TUNE]** Target about 1 hit per flight for an average player.
- Clearing a wave restores HP and opens the shop.

### B1.8 Shop and economy

**Shop categories:**

| Category | Contains |
|---|---|
| Weapons | Automatic weapons, each with a delivery (Close, Shot, Blast) and one or two classes (§4.17); 6 slots; merge equal copies to tier up (max T4); evolutions when their feat is met (§4.5). **Target roster: Brotato's weapon count.** **[OPEN]** The exact number: the sources found on 2026-10-27 disagree (45 and 51, both older guides). The class structure scales to 60–80. |
| Tricks | New tricks and extra copies (which level owned tricks), with transformation choices on level-up |
| Gear | Stat items with trade-offs and combat items, now also carrying the useful parts of the former charms |

- **Run rules** (cheaper rerolls, an extra shelf slot) appear as rare offers.
- **Routine editing** happens in the shop: drag tricks between the five slots.
- **XP and level-ups stay:** kills drop orbs collected in the air, and each level gives a free stat pick from three before the shop. Levels add no Max HP by themselves (user decision, 2026-10-25).
- **Offer rules:**
  - Rarity sets frequency as well as price and has a visible colour.
  - Offers lean toward the held build: classes you're collecting, and statuses your weapons pay off.
  - Lock, separate rerolls, sell at 50% and the weapon-replacement flow stay.
- **Pearls:** wave pay, the style payout (§4.6), and interest on saved pearls (capped) **[TUNE]**.

### B1.9 Flight language

**Every system speaks the flight.** Each new weapon, trick, gear item or evolution should answer: *which part of the jump does this make you want to own?* That means breach, ascent, apex, descent, entry, how high you launch, how many jumps you take, or where enemies are relative to you. Every effect names **one anchor and one verb** (§4.16).

### B1.10 Presentation

- **Tricks are seen, not read.** Each trick's attack is visible where it happens, so the player learns the routine by watching it work.
- **A cancelled trick is unmistakable:** a clear break in the animation and a distinct sound.
- **Statuses read by colour and motion:** soaked enemies drip and sink, frozen ones are solid blocks, and bleeding ones trail red.
- **The splashdown cascade** shows connected tricks, linked bonuses, the streak and the pearl payout, led by sound with pitch climbing per trick.
- **The shop shows the routine** as five slots along a drawn flight arc, with each trick's anchor, class and status, plus feat progress toward evolutions.
- **Effects without readouts:**
  - Hitstop on multi-kills and stomps.
  - A glowing screen rim in the direction of enemies coming from off-screen.
  - A ghost of the landing zone during the descent, showing the pool as it grows.

### B1.11 The power curve

The run must have the power-inversion shape: you start cautious and end as the hazard. **The enemy that was terrifying early should die on contact late, and the game should make sure you notice.** Evolutions are the main late-run power jumps.

### B1.12 Cross-run progression

**[CALL]** Minimal and achievement-based, not grind-based. Milestones unlock content: tricks, weapons, evolutions, and **starting dolphins with a passive that bends a rule**. These are the cheapest large source of run variety, as characters are in Brotato and Ball x Pit. **Deterministic, skill-gated, no random unlock rolls and no permanent stat upgrades.**

Starting dolphins to prototype:

| Dolphin | Passive |
|---|---|
| Orca | No guns; ram and stomp only; damage = speed |
| Spinner | Tricks fire twice; weapons −40% |
| River dolphin | A longer water phase; the Mud ring trick is free |
| Hector's | Tiny hitbox, high steering, 60% HP |

### B1.13 Ethical constraints

These are binding design constraints, not aspirations.

- **Session-bounded.** No daily rewards, login streaks, energy systems, timed events, or anything that punishes not playing. The game must never make the player feel they are losing ground by closing it.
- **No monetary stake.** No purchasable advantage, no loot boxes for money, no ads.
- **Randomness affects pace, not access.** Every piece of content is reachable by every player. Variance changes how fast you get there, never whether you can.
- **Honest odds.** Offer rarities and any chance-based effects are visible in-game.
- **Real stopping points.** The run ends. The summary screen is a conclusion, not a queue prompt. No auto-requeue, no countdown to the next run, no interstitial designed to catch someone mid-exit.
- **Playtime is not a metric.** If a change increases session length without increasing how good the session feels, it is a bad change.

### B1.14 Open questions

1. The full trick list (about 10–15 at first) and each trick's anchor, shape and verb. (§4.3, §4.19)
2. How stretch slots fire: pulse interval or continuous aura. (§4.2)
3. The pearl payout curve and wave difficulty without a quota. (§4.6, §4.7)
4. The evolution list as the roster grows. (§4.5)
5. Which former charms become trick upgrades, which become gear, and which are removed. (§4.4)
6. Whether trick attacks aim relative to the dolphin's facing or at the nearest enemy.
7. Brotato's exact weapon count, which is the roster target. (§4.8)
8. Whether the clean streak survives the shop between waves. (§4.6)
9. Kill-lift versus stomp-bounce, if both extend air time. (§4.18)
10. Which codebase prototypes the routine: the demo or `src/`. (§4.20, step 0)

### B1.15 Considered and rejected

- **Tricks as random slot-machine reels with poker combos** (Appendix A, built in S4). Tricks were drawn at random and couldn't be watched mid-flight, and repeating one trick was the best strategy.
- **Making airtime decide how many tricks complete.** The routine's slots replace it: launch shape sets how long ascent and descent last, and every slot fires.
- **A "this jump needs X" readout.**
- **A pre-launch heat cue** rating the next tricks. Built in S4 and removed: it added a system while rarely saying more than cold or warm.
- **A wave quota as the loss condition.** Replaced by survival (§4.7). Score is now an economy tool.
- **Proximity scaling** (Pressure, Point-blank, Graze): rejected by the designer, 2026-10-27. Positional play comes from anchors, sides and hard surfaces instead.
- **Tags as a separate system from statuses**, **Slow** and **Pierce as a status**: folded together (§4.5).
- **Shop-level evolutions** (a T4 weapon plus a level-3 tagged trick): replaced by feats (§4.5).
- **A per-flight clean ×2:** replaced by the clean streak (§4.6).

### B1.16 Positional effect grammar

#### A. Two layers **[VERIFY]**

The engine keeps enemies in arena-local coordinates, and the arena rides the ballistic arc (§3, and `AGENTS.md`).

| Layer | What's in it | How it moves on screen |
|---|---|---|
| **Arena layer** | The dolphin, enemies, most effects | Rides with you |
| **World layer** | The water surface, altitude bands, landmarks, placed world objects | Sweeps through the arena at flight speed, opposite to your travel |

**Consequences:**
- **"On trajectory" effects are world objects you fly through.** As they pass, they sweep across everything trailing you.
- **The surface is only in reach near breach and entry**, and stays near for low hops. Surface effects suit low hops; Apex and Above effects suit high launches.
- **Ahead changes meaning by phase:** it is Above on the way up and Below on the way down.

Prototype one world-layer object before relying on any of this (§4.20, step 6).

#### B. Anchors (where)

| Family | Anchors | Definition |
|---|---|---|
| **Body** | Ahead, Behind | Along your direction of travel |
| | Above, Below | World vertical |
| | Around | A radius around the dolphin |
| **Path** | Trajectory | Points ahead on your predicted arc (world layer) |
| | Wake | A trail streaming behind you (arena layer) |
| | Arc | The whole remaining predicted path |
| **Landmark** | Breach point, Apex point, Landing point | Phase-locked points |
| | Surface | The water line, which is a hard surface (E) |
| | Underwater | Passive effects only; the water phase is about 1 s |
| **Target** | Nearest, Densest cluster, Elite | Chosen by the game |
| | Statused | For example, all Soaked enemies |
| | Between | A link between two enemies |
| | Placed | An object you left behind |

#### C. Triggers, shapes and verbs

- **Triggers:**
  - Routine tricks fire on phase slots: Breach, Ascent, Apex, Descent, Entry.
  - Weapons and items fire on events: on kill, stomp, dash, status applied, reaction, or hit taken.
- **Shapes:** point, burst, cone, line, ring, wall, field (it persists), chain, projectile.

#### D. Verbs

| Setup (moves or holds enemies; little damage) | Payoff (consumes the setup) |
|---|---|
| Pull, Push, Hold, Line-up, Lift, Sink, Lure, Decoy, Tether, Status | Burst, Sweep, Ram, Stomp, Splash, Detonate, Chain, Pierce, Shatter, Drown |

#### E. Enemy sides and hard surfaces

Enemies need sides, or Above, Below and Behind don't matter:

| Enemy | Exposed from | Positional ask |
|---|---|---|
| Shielder | Behind | Pass it, or turn round |
| Turtle | Below | Hit it from underneath; it's best fought in the ascent |
| Spiker | Above only | Stomp it; it's best fought in the descent |
| Diver (from water) | Its exposed side faces the surface | Surface effects |
| Flock | Any side, but scatters from Ahead | Pull it before you hit it |

Push verbs need something to push enemies into. There are three hard surfaces:
1. **Enemies:** bowling, with impact damage to both.
2. **Frozen blocks:** a wall that shatters on impact.
3. **The water surface:** air enemies knocked into it **drown** (heavy damage). Water-type enemies are immune. The surface is a ring-out edge, like Into the Breach.

#### F. Design rules

1. Every effect is **anchor + trigger + shape + verb (+ status)** and fits in two lines.
2. Setups deal little or no damage; payoffs consume setups; a linked payoff scores (§4.6).
3. Each class owns its anchors (§4.17), so set bonuses push a positional playstyle, not just bigger numbers.
4. Enemies have exposed sides.
5. There are three hard surfaces.

### B1.17 Classes

**Structure:**
- Each weapon has one **delivery** (Close, Shot or Blast; Brotato's melee and ranged split) and one or two **classes**.
- **Set bonuses** apply at 2, 4 and 6 items of a class **[TUNE]**. Weapons count, and **tricks count as one item each** (§4.3).
- Each class owns a set of anchors and a verb. **[TUNE]** The working list is 12 classes × 5–7 weapons, about 60–80 weapons, pending the roster target (§4.8).

| Class | Owns (anchor → verb) | Status | Set bonus scales | Launch affinity |
|---|---|---|---|---|
| **Blade** | Ahead and Around → Sweep | Bleed | Bleed lure radius | Any |
| **Sonic** | Ahead cone → Push | — | Impact damage | Any |
| **Precise** | Ahead line → Pierce | — | Pierce count | Any |
| **Storm** | Between → Chain | Shock | Chain jumps | Any |
| **Tide** | Surface, Below and Landing → Splash or Drown | Soaked | Drown damage | Low hops |
| **Frost** | Wake and Field → Hold | Freeze | Shatter damage | Any |
| **Flare** | Wake and Trajectory → Field | Burn | Spread range | Any |
| **Blast** | Cluster → Detonate | — | Blast size | Any |
| **Sky** | Above and Apex → falling strikes or Stomp | — | Altitude | High launches |
| **Current** | Point → Pull or Tether | — | Pull radius | Any |
| **Pod** | Placed → Decoy or Lure | — | Number of decoys | Any |
| **Ram** | Body → Ram or Stomp (damage from speed) | — | Dash charges | Any |

**Mapping the current 9 weapons:**

| Weapon | Delivery | Class(es) |
|---|---|---|
| Fin | Close | Blade |
| Sonic | Close | Sonic |
| Arc | Close | Storm |
| Minigun | Shot | Precise |
| Harpoon | Shot | Precise, Current |
| Laser | Shot | Precise, Sky |
| Flak | Blast | Blast, Flare |
| Rocket | Blast | Blast |
| Depth charge | Blast | Blast, Tide |

**Movement stats** join the Brotato-style stat pool:
- Lift: arc height.
- Hang: how long the apex holds.
- Air steering.
- Mass: fall speed and ram damage, at the cost of steering.
- Drag: slower, tighter arcs.

Trade-off items follow Brotato, for example "+Mass, −Lift".

### B1.18 Space, enemies and flight

These are grounded in the flow study:
- Enemies sat at the screen edges: a median 31 m from the centre of a ±38.4 m view, with 18% off-screen while entering.
- Kills followed time evenly across phases.
- A cautious bot took 0.2 hits per flight.
- Agency ended at release.

**Enemy placement:**
- **Spawn on the predicted arc.** Formations sit ahead, above and at the landing zone, so the launch angle is a choice of route.
- **Telegraph formations underwater** as silhouettes above the surface. The read is visual, not text.
- **The whole arena is already in view:** a letterboxed 16:9 frame, 76.8 m wide. The problem is that enemies spawn just outside the side edges and stay near them. Spawning inside the view, ahead on the arc, fixes it.
- **Flocking chasers** bunch up and trail your path, so the descent can sweep back through them.
- **Formation shape by altitude band** (the threat tiers stay):
  - Low: surface packs.
  - Mid: flocks crossing the arc.
  - High: sparse elites guarding the apex.
- **The landing pool:** pursuers gather visibly at the predicted landing point, so landing in it is a choice.
  - **Built and switched off after the first playtest (2026-10-27):** spawns holding at the water line felt unfair.
  - **[OPEN]** Whether the pool returns in another form, for example existing enemies gathering, never new spawns.
- **Step 1 playtest rules (2026-10-27):**
  - No spawn closer than 10 m to the water.
  - About one spawn in five still enters from the screen edge (a slider in Settings › Score).
  - Flockers keep about 6 m apart; 3.5 m felt crowded.
  - Enemies returning at the breach from beyond the screen (left behind when the dolphin turned underwater) re-enter at the screen edge instead of being lost.
- **Aimed threats:** enemy shots lead your predicted arc.

**Spawn profile and items:**
- Spawning is driven by a per-run profile, so later items can change how and where enemies appear (designer request, 2026-10-27).
- The profile holds:
  - marker time
  - distance ahead and sideways scatter
  - minimum distance from the dolphin
  - the pool window, size and height
  - flocking weights
- Items that change it should serve positional play. Examples to consider:
  - longer markers
  - spawns leaning toward a placed lure
  - a larger or earlier pool
  - flocks that keep tighter formation
- **[OPEN]** Which spawn-altering items to build.

**Clutch moments:**

| Event | How it works |
|---|---|
| Closing nets | Scripted rings, walls or pincers close in with one gap. Find it, or break the net with a payoff. |
| Treasure runner | A loot enemy crosses the arc for about 2 s **[TUNE]**. Catching it is a choice, not a must. |
| Shielded elites | Only hurt from behind or above. |
| Arc hazards | Telegraphed mines or beams on your predicted path. |
| Landing standoff | The pool, and the wave's final convergence after the clock runs out, sit at the landing zone. |

**Flight verbs:**
- **Stomp-bounce:** landing on an enemy from above gives a small hop and a kill.
- **Dive (S in the air):** fast-fall to choose your landing spot.
- **Dash:** charges pass through enemies with ram damage; stomps refill them **[TUNE]**.
- **Hang:** holds the apex.
- **Turning round at launch** carries you back through the group following you.
- **[OPEN]** Kill-lift (close-range kills give a small upward impulse) as an alternative to stomp-bounce. Neither one gates tricks by airtime.

### B1.19 Example effects and combos

These are mixed trick, weapon and item examples, shown as anchor · shape → verb.

#### Body

| Effect | Class | Anchor · shape → verb | Text |
|---|---|---|---|
| Bow wave | Sonic | Ahead · cone → Push | Pushes enemies Ahead to the sides. Opens a lane. |
| Narwhal lance | Precise | Ahead · line → Pierce | +1 pierce for each enemy lined up Ahead. |
| Slipstream | Current | Behind · field → Line-up | Enemies Behind you fall into single file. |
| Tail slap | Sonic | Behind · burst → Push | Knocks enemies Behind into whatever is beyond them. |
| Blowhole | Tide | Above · spray → Soaked | Soaks enemies Above you. |
| Belly flop | Ram | Below · stomp → Push + Sink | Drives enemies Below you downward, toward the surface. |
| Star pose | Blast | Around · burst → Burst | Bursts all enemies Around you. |

#### Path

| Effect | Class | Anchor · shape → verb | Text |
|---|---|---|---|
| Minefield | Blast | Trajectory · 3 mines → Detonate | Places mines on your arc. They sweep through everything chasing you. |
| Chum line | Pod | Trajectory · bait → Lure | Bait ahead on your arc pulls enemies into your path. |
| Fire wake | Flare | Wake · field → Burn | Your trail ignites whatever follows you. |
| Ice wake | Frost | Wake · field → Freeze | Your trail freezes chasers into a wall behind you. |
| Rainbow | Sky | Arc · beam → Payoff | At apex, a beam lights your whole descent path. |

#### Landmarks

| Effect | Class | Anchor · shape → verb | Text |
|---|---|---|---|
| Breach wave | Tide | Breach · ring → Lift + Soaked | Throws surface enemies up into your climb, soaked. |
| Echo | Pod | Breach · decoy → Decoy | A decoy holds the pursuers at the surface. It detonates when you land near it. |
| Gravity anchor | Current | Apex · point → Pull | Pulls everything Around you to the apex point for 1.5 s. |
| Hang strike | Sky | Apex · falling strikes → Payoff | Strikes fall on enemies Below your apex. |
| Target zone | Tide | Landing · field → Soaked | Soaks enemies near your landing point during the descent. |
| Spout | Tide | Landing · splash → Splash | Splash size scales with fall height. |
| Riptide | Tide | Surface · field → Sink | Drags enemies near the surface under. They drown. |
| Mud ring | Tide | Underwater · carve → Lift | Carving a circle drives water enemies up into your breach. |

#### Targets

| Effect | Class | Anchor · shape → verb | Text |
|---|---|---|---|
| Kelp line | Current | Between · tether → Tether | Links two enemies; fly between them and they slam together. |
| Storm cell | Storm | Cluster · chain → Chain | Shock jumps through the densest cluster. |
| Harpoon tether | Precise, Current | Elite · line → Tether | Pulls the elite onto your path. |
| Conductor | Storm | Statused · chain → Chain | Every Soaked enemy conducts when you Spout. |

#### Combos

| Name | Chain | Best launch |
|---|---|---|
| **Drown** | Bow wave at ascent clears a lane → Belly flop in descent drives enemies Below into the surface | Low hop |
| **Bowling** | Gravity anchor groups enemies at apex → Tail slap fires them into each other | Mid |
| **Minefield run** | Minefield at breach → the chasing pack follows you through it | Any |
| **Conductor** | Breach wave soaks the surface pack → Storm cell at apex chains through every soaked enemy | Low or mid |
| **Glacier steps** | Ice wake freezes chasers → stomp-bounce across the blocks in descent → shatter | High |
| **Bait and splash** | Echo at breach holds the pursuers → Spout lands on the decoy (detonate plus splash) | Any |
| **Single file** | Slipstream lines chasers up Behind → Backflip and Narwhal lance pierce the line | Mid |

### B1.20 Build and playtest plan

> **Trick redesign (2026-10-30, designer):** in the air the guns do all the damage; tricks are effects (move, hold, line up, status) that place enemies for them, and only water tricks damage (drowning, splashes). Star pose, Standoff, Bounty, Corkscrew, Closing net and Minefield were replaced by Gravity anchor (a well ahead), Chum line, Slipstream, Bubble net, Bow wave, Breach wave, Frost wake, Snare buoys (the step 6 world object, now freezing instead of exploding), Spout, Riptide, Belly flop and Undertow. A trick links when a gun or water kill takes an enemy it affected. Impacts were removed. The step rows below record what was built before this change.

**Linear:** one change per step. Each step has a build, an automated check and a human playtest, and moves on only when its gate passes.

- **The flight log measures every step:** kills per phase, distance to the nearest enemy, enemies' distance from the screen centre, off-screen enemy share, hits per flight, launch-angle spread and trick connect rates.
- **The 2026-10-26 bot baseline:**
  - Apex kill share: 17% (the apex window is 20% of flight time).
  - Median nearest enemy: 11–31 m.
  - Enemies' median distance from the screen centre: 31 m in a ±38.4 m view (18% off-screen).
  - Human baseline, 1 run, 24 flights (`docs/flow-study/human-baseline-2026-10-27.json`): 0 hits, apex kill share 17.7% (19% of time), nearest enemy 25.5 m, enemies 32 m from the centre, median launch 74°.
  - Hits per flight: 0.2.
- **All gate numbers are [TUNE].**

| # | Step | Build | Automated check | Playtest asks | Gate |
|---|---|---|---|---|---|
| 0 | Decide and baseline | Choose the prototype codebase **[OPEN]**. Add a flight-log analyser that prints the metrics above. | The analyser reproduces the bot baseline | Play 3 runs of the current demo and save the logs | Baseline recorded from human play |
| 1 | Space | Spawn inside the view, ahead on your arc, with a short telegraph; flocking chasers; the visible landing pool. **Built 2026-10-27** (`source/space.js`, toggle in Settings › Score). **Revised after playtest 1:** pool off, 10 m spawn floor, 20% edge entries, looser flocks, enemies recalled at breach | Enemies' median distance from the screen centre below 20 m; nearest enemy below 15 m (bot). **Bot after revision: 15.3 m and 12 m, passed** | Does the action happen where you are looking? | Both metrics met; you confirm. **Playtest 1: flocking good but crowded, water-line spawns unfair, wanted edge entries and no lost enemies (all addressed). Playtest 2 pending** |
| 2 | Danger | Aimed shots that lead the arc; arc hazards. **Built 2026-10-27** (`source/danger.js`, toggle in Settings › Score): turret shots lead halfway to your predicted place in the frame (slider, 0.5); non-turret elites fire a slow leading shot (14 m/s, every 2 s); mines (**off since the designer's first try, 2026-10-27**; the slider still places 1–4 a flight) placed 0.8–2.5 s ahead on your predicted world path, inside the view, behind a 0.8 s marker, one hit each | Bot hits per flight 0.6–1.2. **Bot (this Mac, 4 styles, seed 7): 0.97, about half from mines; step 1 alone measured 0.41.** Leading shots alone did not raise the bot's hits (0.33–0.37) | Do hits feel fair and avoidable? | You can say why each hit happened. **Playtest pending** |
| 3 | Flight verbs | Stomp-bounce, dive, dash refilled by stomps. **Built 2026-10-27** (`source/verbs.js`, toggle and sliders in Settings › Score): a stomp (coming down onto an enemy in the frame) kills it with no HP lost and adds 6 m/s to the arc's upward speed (elites and bosses take 3× contact damage instead); holding S on the way down doubles fall gravity; Space dashes in the air only (3.5 m in 0.12 s, untouchable, 3× contact ram damage), 2 charges, refilled at water entry and +1 per stomp | Stomps per flight above 0; launch-angle spread wider than baseline. **Bot: 0.12 stomps per flight (it never aims for them); launch IQR 46.2° vs 42.9° with step 3 off, but the bot's launches ignore the verbs, so that difference is noise** | Do you steer to stomp and choose landings? | You change your route on purpose. **Parked 2026-10-27:** off by default as an experimental setting; the designer wants stomp, dive and dash to become tricks instead of standalone verbs |
| 4 | Rules reset | Remove the quota, reels and charms; 0 HP ends the run; style score with the clean streak and the pearl curve. **Built 2026-10-27** (`demo.js` behind Settings › Score "Style score rules", on): score = kills × mult (1 until step 5) × clean streak (cap ×5, a hit resets it to ×1, survives the shop); paid at each splashdown as round(3√score) pearls (slider); pearls are the one shop currency; a wave pays 24 + 4×wave plus 10% interest (at most 10); the shop's charm and routine places go to weapons and gear | Score suites rewritten and passing. **New `qa/rules.cjs` (9 checks) passes; the S4 suites still pass, pinned to S4 by `qa/load.cjs`.** Bot: all four styles reach wave 16 (the bot's cap) without dying, so HP is now the only pressure and it never ran out | Does the streak create tension on later flights? | You protect the streak by changing how you fly |
| 5 | First routine | Breach, Apex and Entry slots; Corkscrew (setup), Gravity anchor (setup), Star pose (payoff), Spout (payoff, Soaked); linking. **Built 2026-10-27** (`source/routine.js`): mult = 1 + connected trick levels + 1 per linked payoff; Corkscrew pushes enemies within 8 m; Gravity anchor is a gravity well for 1.5 s: enemies within 20 m keep chasing but are accelerated toward it (60 m/s², slider), and the well rides with the arena and camera (designer, 2026-10-30; a hit cancels it); Star pose bursts within 7 m; Spout splashes 4 m + 0.2 per metre of peak height (cap 12) and soaks; payoffs deal 30 × level, Damage % and wave scaling, setups 0; the run starts with 1 of 3 tricks picked on the title screen; the shop always has one trick place (from 25 pearls) and a routine panel to move tricks | Apex kill share above 30% with Star pose at apex. **Bot: 31.6% with Star pose at Apex, 21.4% without (`node qa/routine.cjs --gate`)** | Do you place the apex and the landing to connect tricks? | Yes, and the trick order matters to you |
| 6 | World layer | One trajectory object (Minefield). **Built 2026-10-30** as a trick (`source/routine.js`, natural slot Breach): 3 mines fixed in the world 0.35, 0.7 and 1.05 s ahead on the predicted arc; an enemy within 1.6 m sets one off for a 4.5 m payoff blast | It sweeps through the arena as predicted. **`qa/routine.cjs`: each mine reaches the dolphin within 0.02 s of its predicted time, then trails behind and blows up a trailing chaser. Bot with Minefield at Breach: connects on 61% of flights, 1.8 hits per flight** | Do you lead chasers through it? | The two-layer model holds (§4.16 A) |
| 7 | Statuses | Soaked and Shock, then Conduct; then Freeze and shatter. **Built 2026-10-30** (`source/statuses.js`): Spout soaks (6 s; the enemy sinks and can drown); Arc shocks, jumping enemy to enemy within 5 m (30% each); Depth charge chills (3 stacks = frozen solid for 2 s, a block with no contact damage); Conduct (Shock on soaked runs through every soaked enemy, 50%), Flash-freeze (chill on soaked), Shatter (a payoff, ram, mine or impact on a frozen enemy: 4 m blast) | Reaction counts per flight above 0. **Bot with Spout in Descent, Arc and Depth charge: 0.08 per flight (`node qa/statuses.cjs --gate`)** | Do you herd enemies to set up reactions? | You chase reactions deliberately |
| 8 | Sides and surfaces | Shielder, Spiker, Turtle; drowning at the surface; frozen walls. **Built 2026-10-30**: from wave 3, 10% Shielders (exposed behind), 8% Turtles (below), 7% Spikers (above; touching one otherwise hurts double), armoured sides take 20%; soaked or pushed enemies driven into the water drown (4× a payoff); pushed enemies faster than 14 m/s into another enemy or a frozen block hit both (half a payoff), shattering the block | Kills by side and by surface logged. **Each kill records side, surface, armour and weapon; reactions are counted per flight** | Do Above, Below and Behind change your path? | Yes for at least two of the three |
| 9 | Clutch events | Closing nets, treasure runner, landing standoff. **Built 2026-10-30 as tricks, not scripted events (designer):** Closing net (setup: a 14 m ring closes to 3 m in 0.8 s, dragging enemies in), Bounty (payoff: marks the toughest enemy within 25 m; killing it this flight pays 10 pearls a level), Standoff (payoff: landing shockwave within 16 m, +15% per enemy caught) | Events fire at the designed rate. **Replaced by trick checks in `qa/statuses.cjs`** | Which moments felt like close calls? | At least one clutch moment per wave |
| 10 | Stretch slots | Ascent and Descent slots (pulse or aura **[OPEN]**). **Built 2026-10-30 as pulses (designer):** the trick re-fires every 0.6 s while climbing or falling at a third of its power; it connects once, if any pulse hit | Kills per phase stay uneven, tracking the routine. **Bot kill shares with Star pose in Ascent: 47 / 22 / 31% (ascent/apex/descent); in Descent: 38 / 17 / 45%** | Do long arcs feel worth taking? | High and low launches are both viable |
| 11 | Classes | Class tags on the 9 weapons and on tricks; set bonuses | Bot class builds each clear wave 10 | Does collecting a class change how you fly? | At least 3 classes play differently |
| 12 | Evolutions | Feats and 2 evolutions (Arc → Storm, Depth charge → Glacier) | Feats reachable by about wave 12 | Was the evolution a goal you worked toward? | You plan your play around the feat |
| 13 | Starting dolphins | Orca and Spinner | Both clear wave 10 with the bot | Does each one change how you play from wave 1? | Yes for both |
| 14 | Content scale-up | Grow the roster toward the target, class by class, 10–15 tricks, more statuses only within the caps | Content lint: every effect has one anchor and one verb, and fits in two lines | Full runs | The power curve (§4.11) shows in a full run |
| 15 | Port | Move the validated rules into `src/` through its phase gates (§17, `AGENTS.md`) | `npm run verify` | The `src/` Phase 2 playtest, then onward | Per `AGENTS.md` |

## B2. Progression

**Revised 2026-10-26.** This section describes progression for the routine design in §4. The S4 build's progression is described in Appendix A.

### B2.1 Within a run

- **Between waves: the shop (§4.8).** This is where the build and the routine are made, and where the player reads them.
- **XP and levels:** kills drop XP orbs, collected in the air. Each level gives a free stat pick from three before the shop. Levels add no Max HP by themselves.
- **Three build layers:**
  - **Weapons:** tiers by merging, then evolutions (§4.5).
  - **Tricks:** the routine's five slots, trick levels and transformations (§4.3, §4.4).
  - **Stats:** gear and level-up picks.
- **The stat pool still spans both phases**, or the build layer ends up orthogonal to the game:
  - **Flight:** Lift, Hang, Air steering
  - **Combat:** type damage, Damage %, Attack speed, Crit, Reach, Area
  - **Defence:** Max HP, Armour, Regen
  - **Economy:** Pickup, Luck, XP gain
- **Launch shape is a build axis.** Stretch-slot tricks favour high launches with long ascents and descents. Moment-slot tricks favour short hops that reach breach, apex and entry often. Both must be viable.

### B2.2 Run structure

| Element | Target |
|---|---|
| Waves | 20; the run is won by clearing wave 20 |
| Loss | 0 HP ends the run (§4.7) |
| Air clock | 20 s at wave 1, +5 s per wave, capped at 60 s; wave 20 is 90 s **[TUNE]** |
| Launch speed | 30 m/s at wave 1, +5 m/s per wave (user rule; preserve) |
| Bosses | Waves 10 and 20 |
| Starting build | One weapon and one trick (§4.3) |
| Run rules | Rare shop offers (§4.8) |

Escalation steps are **announced**. Boss waves have a distinct sting. Visible dread is better pacing than invisible difficulty drift.

### B2.3 Run summary

This is the closure beat. Show:
- the final routine, drawn on a flight arc
- the biggest style payout and the flight that earned it
- evolutions reached
- waves cleared, kills and the cause of death
- the final build as a row of glowing icons
- any milestones unlocked

Make it feel like a story with an ending. Then stop: no auto-requeue.

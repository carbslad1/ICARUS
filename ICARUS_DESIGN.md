# ICARUS
## Game Design & Build Specification

**Document type:** Complete design and build specification for an autonomous coding agent.
**Target stack:** TypeScript · Vite · PixiJS v8 · WebGL2 · Node ≥ 20.
**Status:** Greenfield.

> **Revision 2026-10-25: scoring and run structure.** §4 (Reward architecture and scoring) and §10 (Progression) have been rewritten to the chips × mult design developed in the playable demo (`source/`, built to `ICARUS-demo.html`). Several original systems were removed from the design: the altimeter as the score, apex tiers and tier loot, entry-quality grading and perfect-entry streaks, and speed compounding across cycles. Sections that still describe them carry a **Superseded** note pointing to §4. Movement, frame architecture and the binding rules in §13–15 are unchanged by this revision.

---

## Reading order

**Sections 1–4** are the design core: what the game is, how it plays, and why it holds someone. Section 4 (Reward Architecture) is load-bearing — it shapes tuning decisions in every later section.

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

> **Superseded (2026-10-25).** Launch speed is now set per wave (30 m/s at wave 1, +5 per wave), and there are no apex tiers or speed carried between cycles. The launch now buys a flight's length and shape, which sets how long the reels run and how much can be earned and lost (§4.3, §10.2).

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

> **Superseded in part (2026-10-25).** There is no entry grading and no speed compounding. The current loop is dive → breach (tricks drawn, the lever pulled) → fly (kills are chips, tricks resolve as reels, hits cost HP) → water entry (bank chips × mult, or bust at 0 HP) → repeat until the wave's air clock runs out → shop. See §4.

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

> **Superseded (2026-10-25).** Entry speed retention and entry grading were removed. Risk now comes from exposure during the flight: HP lost lowers the payout, and 0 HP busts the jump (§4.6).

The frame's velocity at commitment *is* your entry vector. Early in the arc the frame is still rising or shallow — commit then and you enter slow and flat, shedding most of your speed. Ride the arc to its natural end and the frame has mirrored back to full speed at a steep angle: the best possible entry.

- **Ride it out** → optimal entry, maximum speed retained, maximum time exposed
- **Bail early** → escape a bad fight, pay for it in the next cycle's speed

A player who is winning rides the arc. A player who is losing bails and accepts a slower lap. That is exactly the shape a risk dial should have, and it needs no special-case code — it is the shape of a parabola.

## 3.6 Arena bounds

The arena is a bounded rectangle, roughly one screen at the current zoom, centred on the frame origin. The player's local position is clamped with a soft push-back at the edges.

Bounds are necessary: without them the player could fly straight down to the water and the frame would be meaningless. With them, the arena is a legible play field.

**[CALL]** Bounds are fixed across all tiers. Higher tiers get *denser* arenas, not bigger ones — a bigger arena would dilute exactly the pressure altitude is meant to create.

---

# 4. Reward architecture and scoring

**Revised 2026-10-25.** This section replaces the original §4 (altimeter score, tier jackpots, entry-quality near-misses and the level-up draft as the primary reward). It is the target scoring and build design for the playable demo (`source/`, built to `ICARUS-demo.html`). The demo does not implement all of it yet: draws still grow for free, 0 HP still ends the run, and there is no HP bonus or bust. All numbers marked **[TUNE]** are starting points; the structure beside them is the requirement. Items marked **[OPEN]** are unresolved and must be raised, not guessed.

## 4.1 The thesis

ICARUS is three proven loops joined by the flight:

| Layer | Reference | Role in ICARUS |
|---|---|---|
| Auto-firing combat with weapons, stats and items | Brotato | Kills are **chips**: how much is riding on this jump. |
| Tricks performed in sequence through the flight | Tony Hawk's Pro Skater | The spectacle, and the reels of the slot machine. |
| A scoring machine you upgrade between rounds | CloverPit, Balatro | Tricks, combos and charms are the **mult**. Your build decides how big a jump pays. |

**Every jump is a pull of the lever.** The launch pulls it, the tricks resolve as the reels, the kills decide the stake, getting hit is the danger that can wipe the spin, and the water entry banks the payout.

The slot-machine structure was already the insight of the original §4.1. What has changed is where the randomness and the payout live: the payout is now an explicit score, and the build is a machine the player constructs.

## 4.2 The score

```
bank = chips × mult      (paid at water entry)

chips = kill value earned this jump (plus +chips effects)
mult  = trick values + combo payouts + charm effects + HP bonus
```

- **Chips** come from kills. They are visible as enemies die; the player never has to calculate them.
- **Mult** is built from the jump's tricks (§4.4), the combos they form (§4.5), the player's charms (§4.8) and the **HP bonus** (§4.6).
- **Resolution order at the bank:** tricks → combos → charms, left to right as arranged in the charm row → HP bonus. **[CALL]** HP bonus resolves last so that it acts on the finished hand. **[TUNE]** whether it is additive or multiplicative.
- The bank is the payoff moment and must be the loudest, clearest event in the game (§4.12).

## 4.3 Loss condition and the air clock

**There is one way to lose a run: miss a wave's quota.** Health no longer ends a run (§4.6).

- Each wave has a **quota** and an **air clock**. The clock only runs in the air; water is safe and pauses it.
- **The air clock is the number of pulls you have.** A low launch spends little air for a small bank; a high launch spends more for a bigger one.
- When the clock expires, enemies keep spawning, kills and score continue and combat stays dangerous. The wave ends at the next water entry, after that bank and the quota check. There is no early quota exit and no safe coast. (User rule, 2026-10.)
- Clearing a wave pays pearls (§4.10), restores HP and opens the shop.

## 4.4 Tricks: the reels

- At breach, the jump draws its tricks from the five identities: **Spout, Front flip, Backflip, Corkscrew, Star pose**, according to the player's draw weights.
- **The tricks are performed automatically, in drawn order, across the flight.** Each completed trick reveals its mult on the scoreboard. They never gate movement or weapon damage.
- **The player is never expected to read the hand during play.** Underwater lasts about a second, and in the air the player is dodging. The reels are watched at a glance, like a slot machine, not planned around. All reading happens in the shop.
- A jump with no kills banks nothing and keeps the same tricks for the next jump.
- **Draw count is bought, not given.** Base 3 draws, maximum 6 **[TUNE]**. More reels come from Routine offers or vouchers (§4.9), never from a free wave schedule. Free growth made the trick build irrelevant: in the S3 demo the average unupgraded mult rose from 3.6 to 13.1 purely from free draws.

## 4.5 Combos: the paylines

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

## 4.6 Danger: health is part of the score

Getting hit is the slot machine's bust.

- **Every accepted hit costs HP** and places a **Bail** symbol on the reels. A Bail is visual feedback in the slot's own language and a hook for charms (for example, "Bails pay +2 chips"). A Bail does not bust the jump by itself.
- **HP bonus.** At the bank, the player's **raw** remaining HP adds to the payout as a bonus multiplier. **[CALL]** Raw HP, not a percentage of max: stacking Max HP is a deliberate build route that grows the multiplier. **[TUNE]** the conversion rate and cap. Watch that defence does not become the dominant build because it now serves both survival and score.
- **0 HP busts the jump.** The jump banks nothing. The dolphin falls from where it is to the water, and **the fall spends air clock**. The next jump starts at **full HP**. The cost of a bust is the lost jump plus the air time.
- HP otherwise carries between jumps within a wave, with Regen, and is restored at wave end.
- **[OPEN]** Whether the player can be hit or score during the fall, and how fast the fall is.

The result is that **health is not a separate number to watch**. Damage shows up as a smaller payout, and a bust shows up as a zero, on the scoreboard the player is already glancing at.

## 4.7 The spending trade-off

Every pearl goes into one of three investments, all priced in score:

| Invest in | Through | Pays off as |
|---|---|---|
| **The stake** | Weapons, offensive gear and stats | More chips per jump |
| **The machine** | Tricks, combos, charms | More mult per jump |
| **Protection** | Max HP, Armour, Regen, defensive gear | A bigger HP bonus and fewer busts |

A build that ignores any of the three should be possible but costly. Weapon type also sets risk. Close weapons need proximity and invite hits, and they add Armour. Shot weapons keep distance and are safer. Blast weapons sit between.

## 4.8 Charms: rewriting the machine

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
- **Each charm reads in one line** and fits on one condition. No stacked multi-condition text.
- **Binding constraint (user rule):** no charm changes weapon damage. Charms change score and pearls only.
- **Scale target:** about 30–40 charms for the demo, with enough `×mult`, retrigger and scaling effects that a strong build is many times stronger than an unbuilt one. In S3 the strongest focused trick build was only about 2.6× an unbuilt one, which is too low.

## 4.9 Upgrading the machine

- **The trick scoreboard is always visible in the shop.** It shows each trick's value, its draw chance and every combo's payout. It is information, not a purchase.
- **Routine offers** (packs and single offers, like Balatro's planet cards) are the steady upgrades. Each offer does one of:
  - raise a trick's value
  - level a combo group
  - shift draw odds
  - add a draw (§4.4)
  - grant a technique
- **Techniques** modify one trick:
  - **Lucky:** a chance to repeat that trick's value.
  - **Gold:** grows across waves.
  - **Echo:** at the bank, the trick adds one extra copy of itself for combos when that improves the payout. Echo is already implemented and must be offered.
- **One voucher to commit,** like Balatro's Telescope: "Routine offers favour your most-drawn trick."
- **Increments must be felt.** Moving 5% of draw chance or adding +0.5 mult is too small to notice. **[TUNE]**
- **[CALL]** There is no always-available upgrade menu. Offers are random so that runs diverge and the player steers towards what they find.

## 4.10 Shop and economy

The shop between waves is where all building and all reading happens.

**Categories (consolidated):**

| Category | Contains |
|---|---|
| Weapons | 9 automatic weapons in 3 types × 3 cadences, 6 slots, merge two equal copies into the next tier (max T4) |
| Gear | Stat items with trade-offs and combat items, merged into one category |
| Charms | §4.8 |
| Routine | Packs and single offers, §4.9 |
| Vouchers | Permanent run rules (charm slot, reroll discount, extra shelf, the commit voucher) |

**Offer rules:**
- **Rarity** sets how often an offer appears, not only its price, and each rarity has a visible colour.
- Charm and gear offers are **weighted towards the held build**. Weapons already are.
- **Banish:** once per run, the player removes one offer from the pool for the rest of the run.
- The shop keeps its existing conveniences: lock, separate rerolls per row, sell at 50%, combining weapons and the replace-a-slot flow with its net price.
- **Level-ups** (from XP) stay a free stat choice of three before shopping.

**Pearls:**
- base pay per wave cleared
- interest on saved pearls (10%, capped) **[TUNE]**
- **overscore converted to pearls.** Beating the quota by a wide margin funds the build. This is the loop from score back into power. The current cap of 24 is too low **[TUNE]**.
- `pearls` charms

## 4.11 Flight language

**Every system speaks the flight.** Each new weapon, gear item or charm should answer one question: *which part of the jump does this make you want to own?* That means breach, ascent, apex, descent, water entry, how high you launch, or how many jumps you take.

This is what keeps ICARUS from being a bullet-heaven with a score attached.

## 4.12 Payout presentation

Nobody can read mid-flight, so the payout must be **glanceable**:
- It is led by sound, and climbs in pitch with each charm, as the existing charm notes already do.
- It uses colour and one large number in the bottom scoreboard: **chips × mult = score**.
- Each completed trick and combo pulses as it resolves. Bail symbols appear on the reels the moment you are hit.
- A bust is unmistakable: the reels go dark and the jump scores zero.

Detail belongs in the shop. The "last flight · see why" breakdown shows every trick, combo, charm (paid or missed, with the reason), Bail and the HP bonus.

## 4.13 The power curve

The run must still have the power-inversion shape. You start cautious and end as the hazard. The original rule stands: **the enemy that was terrifying early should die on contact late, and the game should make sure you notice.**

The score has its own escalation. Early banks are in the tens, and late banks should be able to reach numbers that make a viewer laugh. Plan for very large numbers in the display from the start.

## 4.14 Cross-run progression

**[CALL]** Minimal and achievement-based, not grind-based. Milestones unlock content: for example, bank a Six of a Kind, clear wave 20, or bank a set score in one jump. Each unlocks a weapon, a charm, a starting dolphin with a passive that bends a rule, or a starting modifier. **Deterministic, skill-gated, no random unlock rolls and no permanent stat upgrades.**

Starting dolphins are the cheapest large source of run variety, as characters are in Brotato and Isaac.

## 4.15 Ethical constraints

These are binding design constraints, not aspirations. A slot-machine structure is powerful, and the line between "well-paced" and "predatory" is a design decision made deliberately, here.

- **Session-bounded.** No daily rewards, login streaks, energy systems, timed events, or anything that punishes not playing. The game must never make the player feel they are losing ground by closing it.
- **No monetary stake.** No purchasable advantage, no loot boxes for money, no ads.
- **Randomness affects pace, not access.** Every piece of content is reachable by every player. Variance changes how fast you get there, never whether you can.
- **Honest odds.** Draw chances, combo odds, Lucky chances and offer rarities are all visible in-game.
- **Real stopping points.** The run ends. The summary screen is a conclusion, not a queue prompt. No auto-requeue, no countdown to the next run, no interstitial designed to catch someone mid-exit.
- **Playtime is not a metric.** If a change increases session length without increasing how good the session feels, it is a bad change.

## 4.16 Open questions

1. HP bonus: the conversion rate, whether it is additive or multiplicative, and any cap. (§4.6)
2. The fall after a bust: its speed, and whether hits or kills count during it. (§4.6)
3. Quota curve once extra draws are bought rather than free. (§4.3, §4.4)
4. Whether to show a "this jump needs X" readout at breach. This was proposed and not decided.
5. How much of the existing 17-charm list survives the one-line, rule-bending standard in §4.8.

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

> **Superseded (2026-10-25).** Entry-angle grading, perfect-entry streaks and belly-flops were removed from the design. Water entry now only banks the jump (§4.2).

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

> **Superseded in part (2026-10-25).** There are no tiers to reveal. The breach is the lever pull: the jump's tricks are drawn here (§4.4).

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

> **Superseded in part (2026-10-25).** Entry grading no longer exists, so the alignment and grading described below no longer affect play. A 0 HP bust ends the flight early: the dolphin falls from its position to the water, spending air clock (§4.6).

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

> **Superseded (2026-10-25).** The demo ships nine weapons in a 3 × 3 grid of type (Close, Shot, Blast) × cadence (Rapid, Steady, Heavy), 6 slots, and merging two equal copies into the next tier (max T4). They auto-target the nearest enemy. Weapons that reward a movement pattern, as described below, remain a valid direction under §4.11.

Up to 6 instances, each on its own cooldown with its own targeting rule. Ship four, each expressing a different relationship to the free-movement layer:

- **Spread** — fan opposite local movement direction. Rewards constant motion.
- **Lance** — single high-damage shot along local movement direction. Rewards committed dashes through the arena.
- **Orbit** — persistent projectiles circling the player. Rewards being surrounded; the only weapon that works while stationary.
- **Nova** — periodic radial burst centred on the player. Rewards diving into clusters.

Four weapons with genuinely different geometry beats twelve that differ only in damage numbers.

## 9.3 Evolutions

At weapon level 8, with the matching passive held, a weapon evolves: new name, new visual signature, a qualitative rather than quantitative change. Evolutions are a 2–4 minute beat and they must be **telegraphed** — show the requirement in the HUD as soon as the player holds either half. A goal the player can see coming is worth more than a surprise.

## 9.4 Damage

> **Superseded in part (2026-10-25).** The demo uses Armour, critical multipliers per weapon tier and per-type damage stats. Armour now also protects the score (§4.6).

`damage = base × (1 + levelScaling) × critRoll`, crit a binary 2× roll. No armour, resistances or penetration in v1 — they multiply the tuning surface without adding decisions.

**Damage numbers are visible**, scaled by magnitude, in the weapon's own colour. Crits are larger and brighter. This is free dopamine and it should not be skipped.

---

# 10. Progression

**Revised 2026-10-25.** This section replaces the original §10 (draft-only progression, endless time-based escalation and an altitude-based summary). Scoring, the shop and the economy are specified in §4.

## 10.1 Within a run

- **Between waves: the shop (§4.10).** This is where the build is made and where the player reads it.
- **XP and levels:** kills drop XP. Each level grants one free stat choice from three options, drawn from the combat, defence and flight/economy groups, and is chosen before shopping.
- **The upgrade pool still spans both phases**, or the build layer ends up orthogonal to the game:
  - **Flight:** Lift, Hang, Air steering
  - **Combat:** type damage, Damage %, Attack speed, Crit, Reach, Area
  - **Defence:** Max HP, Armour, Regen. Under §4.6 these are also score stats.
  - **Economy:** Pickup, Luck, XP gain
- **Launch shape is a build axis.** Builds that pay for long apexes and descents favour high launches. Builds that pay for breach and entry favour many short hops. Both must be viable.

## 10.2 Run structure

| Element | Value (rows marked *target* are not yet in the demo) |
|---|---|
| Waves | 20; the run is won by clearing wave 20 |
| Air clock | 20 s at wave 1, +5 s per wave, capped at 60 s; wave 20 is 90 s **[TUNE]** |
| Launch speed | 30 m/s at wave 1, +5 m/s per wave (user rule; preserve) |
| Bosses | Waves 10 and 20 |
| Vouchers | Offered in the shops after waves 5, 10 and 15 |
| Trick draws | *Target:* base 3, bought up to 6 (§4.4). Demo: free growth at waves 5/10/15 |
| Quota | Escalates per wave from the expected kill value of that wave's spawn schedule **[TUNE]** after the draw change |
| Loss | *Target:* missing a quota (§4.3); health busts jumps, it does not end runs (§4.6). Demo: 0 HP still ends the run |

Escalation steps are **announced**. Boss waves and the voucher shops should each have a distinct sting. Visible dread is better pacing than invisible difficulty drift.

## 10.3 Run summary

This is the closure beat. Show:
- the biggest single bank and the jump that made it, as chips × mult with its tricks
- the best combo landed
- busts suffered
- waves cleared and kills
- the final build as a row of glowing icons (weapons, charms, techniques)
- any milestones unlocked

If the run was lost, show where the quota was missed and why, using the recorded run. Make it feel like a story with an ending. Then stop: no auto-requeue.

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

> **Superseded in part (2026-10-25).** The perfect-entry, streak and record-line rows describe removed systems. The current reward signatures are the bank, combos, charm resolution, Bails and busts (§4.12).

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

> **Superseded in part (2026-10-25).** The perfect-entry, near-miss and belly-flop sounds describe removed systems. The payout is led by sound (§4.12): charm notes climbing a scale at the bank, and a distinct bust sound.

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

> **Superseded in part (2026-10-25).** Tests for entry quality, perfect-entry apex growth, early-commit entries, draft guarantees and tier drops cover systems removed in §4. Their replacements are tests for the §4 rules: bank resolution order, HP bonus and busts, the Echo and Lucky techniques, offer rarity and build weighting.

**Unit.** Entry quality bands. Medium resolution with hysteresis. Tier lookup. Apex and airtime derivation. Arena bounds clamping. `toWorld` round-tripping within float tolerance. Draft weighting distributions. Loot table distributions.

**Simulation.** Scripted intent sequences through the headless harness:

- From rest with no input, the dolphin sinks and reaches terminal velocity within tolerance.
- **Tight steering produces a smaller-radius arc through the same total trajectory angle, while both turns preserve momentum.** Unpowered quarter turns retain over 90% of speed at 26 and 60 m/s. Sustained turns do not separate the nose from the flow or reverse direction.
- Ten consecutive perfect entries produce monotonically increasing apex altitude.
- Breach at a given speed produces the predicted apex and airtime within tolerance.
- **Committing early produces a worse entry than riding the arc out.** This validates the risk dial.
- Over 1000 simulated drafts, the guarantee in §4.3 holds: no draft is entirely useless to the current build.
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

> **Superseded in part (2026-10-25).** The reward phase now targets §4: chips × mult, tricks, combos, charms, HP bonus and busts, the shop and the economy. Tier loot, streaks and the altimeter are out.
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

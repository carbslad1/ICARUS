# ICARUS
## Game Design & Build Specification

**Document type:** Complete design and build specification for an autonomous coding agent.
**Target stack:** TypeScript · Vite · PixiJS v8 · WebGL2 · Node ≥ 20.
**Status:** Greenfield.

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

The frame's velocity at commitment *is* your entry vector. Early in the arc the frame is still rising or shallow — commit then and you enter slow and flat, shedding most of your speed. Ride the arc to its natural end and the frame has mirrored back to full speed at a steep angle: the best possible entry.

- **Ride it out** → optimal entry, maximum speed retained, maximum time exposed
- **Bail early** → escape a bad fight, pay for it in the next cycle's speed

A player who is winning rides the arc. A player who is losing bails and accepts a slower lap. That is exactly the shape a risk dial should have, and it needs no special-case code — it is the shape of a parabola.

## 3.6 Arena bounds

The arena is a bounded rectangle, roughly one screen at the current zoom, centred on the frame origin. The player's local position is clamped with a soft push-back at the edges.

Bounds are necessary: without them the player could fly straight down to the water and the frame would be meaningless. With them, the arena is a legible play field.

**[CALL]** Bounds are fixed across all tiers. Higher tiers get *denser* arenas, not bigger ones — a bigger arena would dilute exactly the pressure altitude is meant to create.

---

# 4. Reward architecture

This section is as important as the physics. A game with a perfect core loop and a badly-shaped reward curve is a tech demo.

## 4.1 The structural advantage

Most survivor-likes are one long monotonic ramp. They manufacture punctuation artificially — chest drops, boss waves, timed events — because the underlying loop has no natural rhythm.

Icarus has one built in. The dive is quiet and tense; the flight is loud and celebratory. **That is an anticipation phase followed by a payout phase, which is the structure of a slot machine, arriving for free from the mechanics.**

Map it deliberately:

| Slot machine | Icarus |
|---|---|
| Choosing a bet size | How much speed you bank before breaching |
| Pulling the lever | The breach |
| The reels spinning | The breach window — dilated, arena ghosting in |
| The reveal | Arena tier, composition, visible loot |
| The payout | The flight itself |
| The next pull | Re-entry quality determining your next bet |

The crucial difference from an actual slot machine — and the thing that makes this design defensible rather than exploitative — is that **the bet size is skill-determined**. You do not choose a wager from a menu. You earn it by diving well. The randomness sits in the *composition* of what you get, not in whether you get anything.

## 4.2 The nested timer stack

The single most important rule in this section:

> **The player is never more than ~10 seconds from a reward event, and never more than ~60 seconds from a surprising one.**

Every timescale needs an occupant. Design to this table:

| Interval | Event | Certainty | Function |
|---|---|---|---|
| 0.1 s | Kill: flash, particle burst, sound | Certain | Moment-to-moment texture |
| 1–3 s | XP orb collected, combo tick | Certain | Continuous trickle |
| 5–10 s | Combo tier crossed, streak increment | Skill-gated | Rewards competence |
| 8–20 s | Level-up draft (3 of N) | Certain event, **random content** | The primary variable-ratio hit |
| 20–45 s | Cycle payout at re-entry | Certain event, **variable magnitude** | The slot machine resolution |
| 30–90 s | Tier-gated rare drop | **Variable ratio** | The jackpot |
| 2–4 min | Weapon evolution threshold | Certain, telegraphed | Long-horizon goal |
| 5 min | Escalation step, visible on HUD | Certain | Dread and pacing |
| Run end | Summary, records, unlocks | Certain | Closure |

Certainty and randomness are deliberately interleaved. A reward schedule that is entirely random feels arbitrary; one that is entirely predictable feels like work. The mix is what holds attention.

## 4.3 The primary variable-ratio hit: the level-up draft

On level-up the game pauses and offers **3 options drawn from a weighted pool**. This is the workhorse and it needs to be right.

- **Weighted, not uniform.** Weights shift with build state: options that synergise with what you already hold are upweighted. This engineers the "the game knows what I'm doing" feeling, which is a large part of why drafts feel good.
- **Never all three bad.** Guarantee at least one option that is useful to the current build. A draft where nothing appeals is a punishment disguised as a choice.
- **Occasional impossible choice.** Roughly one draft in six should offer two options the player genuinely wants. Regret is a stronger memory than satisfaction.
- **Rarity tiers with visible colour.** Common / rare / prismatic, each with an unmistakable visual signature. The player should know a prismatic dropped before they read the text.
- **Limited slots.** 6 weapon slots, 6 passive slots. Once full, drafts offer upgrades to held items, making each early pick feel consequential. Scarcity converts a shopping list into a decision.
- **Banish, once per run.** One free removal of an option from the pool for the rest of the run. A small amount of agency over the randomness dramatically increases perceived fairness.

## 4.4 The jackpot: tier drops

Each tier has a loot table. Clearing a tier-5 arena has a meaningful chance of a prismatic drop; a tier-1 arena effectively never does.

Design the distribution so that:

- **Expected value favours higher tiers for a skilled player and penalises an unskilled one.** This is the whole risk dial. If tier 5 is strictly better for everyone, altitude stops being a choice.
- **Variance scales with tier.** Tier 1 pays a flat, boring, certain amount. Tier 5 sometimes pays enormously and sometimes kills you before it pays anything.
- **The drop is visible in the arena before you earn it.** A prismatic sitting on the far side of a tier-5 arena, glowing, unreachable without fighting through — that is the single most motivating object you can put on screen.

**Odds are displayed in-game.** Honest rates cost nothing and are the difference between a slot machine and a game with randomness in it.

## 4.5 The power inversion arc

The emotional shape of a run. Tune the whole game against this table.

| Minutes | Weapons | Typical tier | Typical apex | Player experience |
|---|---|---|---|---|
| 0–3 | 1–2 | 1–2 | 15 m | Cautious. You dodge. 15 m feels high. |
| 3–8 | 3–4 | 3 | 50 m | Competent. You clear. Chains start landing. |
| 8–15 | 5–6, first evolution | 4 | 120 m | Powerful. Screen is filling with light. |
| 15–22 | 6 + evolutions | 5 | 250 m+ | Ascendant. You are the hazard. |
| 22+ | — | 5 | — | Escalation outruns you. You die climbing. |

The enemy that was terrifying at minute two should die on contact at minute eighteen, **and the game should make sure you notice.** Keep early enemy types in the late-game spawn pool specifically so the player can measure their own growth against them. This is the most reliable power-fantasy device available and it costs nothing.

## 4.6 The altimeter is the score

Always visible, large, and climbing. It is the ratchet that makes the whole thing legible.

Two lines are drawn in the sky and the player flies past them:

- **Session best** — this run's highest apex, a thin cyan line with a number
- **Lifetime best** — a brighter line, further up, drawn as a permanent goal

Crossing either is a full-screen event: time hitches for 150 ms, the line shatters, the number reseats higher. This is the ghost-lap mechanic from racing games and it fits this game perfectly — it converts an abstract stat into a physical object you can see above you.

## 4.7 Near-miss design

The near-miss is the most potent single device in reward psychology and Icarus has a natural home for it: **the perfect-entry threshold**.

When the player misses perfect by a small margin, show the number. Threshold is 5°; they came in at 7°; render **7°** in warning amber at the entry point with a sound that is almost, but not quite, the perfect-entry chime. It has to read as *nearly*.

Same principle at the streak counter: losing a streak of nine should be visually and audibly worse than losing a streak of two. The counter shatters. The player will immediately try again.

Use this honestly: the near-miss must correspond to an actual near-miss. Never manufacture one by fudging the angle. The device works because it is true.

## 4.8 Free interim rewards

Not everything should be a choice. Between the big beats, keep a constant trickle of small unambiguous goods: XP orbs, temporary speed pickups, brief damage surges, combo multipliers. These have no decision cost and exist purely to keep the floor of the dopamine curve off zero during the quiet stretches.

The dive is the one deliberate quiet stretch. Do not fill it with rewards — its silence is what makes the breach land.

## 4.9 Cross-run progression

**[CALL]** Minimal and achievement-based, not grind-based.

Milestones unlock content: reach 200 m, chain ten perfect entries, clear a tier-5 arena. Each unlocks a weapon, a dolphin variant, or a starting modifier. **Deterministic, skill-gated, no random unlock rolls, and no permanent stat upgrades.** A failed run still paid something, but nobody is ever grinding numbers to make the game easier.

This preserves the property that skill, not time invested, is what moves you forward.

## 4.10 Ethical constraints

These are binding design constraints, not aspirations. The techniques in this section are powerful and the line between "well-paced" and "predatory" is a design decision made deliberately, here.

- **Session-bounded.** No daily rewards, login streaks, energy systems, timed events, or anything that punishes not playing. The game must never make the player feel they are losing ground by closing it.
- **No monetary stake.** No purchasable advantage, no loot boxes for money, no ads.
- **Randomness affects pace, not access.** Every piece of content is reachable by every player. Variance changes how fast you get there, never whether you can.
- **Honest odds.** All drop rates visible in-game.
- **Real stopping points.** The run ends. The summary screen is a conclusion, not a queue prompt. No auto-requeue, no countdown to the next run, no interstitial designed to catch someone mid-exit.
- **Playtime is not a metric.** If a change increases session length without increasing how good the session feels, it is a bad change.

---

# 5. Water phase

All numbers are tuning starting points. The *behaviour* beside each is the requirement.

## 5.1 Forces

| Constant | Start | Behaviour |
|---|---|---|
| `WATER_GRAVITY` | −3.5 m/s² | You sink slowly if you do nothing. |
| `WATER_DRAG_QUADRATIC` | 0.012 /m | `a = −k·v·\|v\|`. Quadratic, so fast movement bleeds far more than slow. This makes deep fast dives costly and makes turn radius matter. |
| `WATER_THRUST` | 22 m/s² | Along heading. |
| `WATER_TURN_RATE` | 2.8 rad/s | Body rotation speed. |
| `WATER_REDIRECT_RATE` | 0.55 /s | Fraction per second the velocity vector rotates toward heading. |
| `WATER_MAX_THRUST_SPEED` | 26 m/s | Thrust stops adding above this. Dive momentum far exceeds it — thrust builds from rest, it does not make you fast. |

## 5.2 The redirect mechanic

The heart of the water game. Turning the body does not turn the velocity. Velocity rotates toward heading at `WATER_REDIRECT_RATE`, and the rotation applied costs speed:

```
speedLoss = currentSpeed × TURN_COST × |angleRotatedThisStep|
```

with `TURN_COST ≈ 0.35` per radian.

A wide gentle arc from dive to ascent preserves momentum; a hard turn kills it. The player learns to plan the turn early, well before they need it.

**Verify this before building anything else.** If a hard turn and a gentle turn through the same total angle produce the same exit speed, the water half of the game has no depth and nothing built on top will fix it.

## 5.3 Controls

A/D rotate. W thrusts. That is the entire water control set. The depth is in the momentum, not the buttons.

## 5.4 Re-entry quality

Evaluated at the exact surface crossing (§14.3), on the angle between dolphin heading and incoming velocity:

| Band | Condition | Retention |
|---|---|---|
| Perfect | ≤ 0.09 rad (~5°) | 1.0× speed, +`PERFECT_BONUS` (start 1.5 m/s), streak++ |
| Clean | ≤ 0.26 rad (~15°) | 0.97× |
| Sloppy | ≤ 0.7 rad (~40°) | linear 0.97 → 0.72 |
| Belly-flop | > 0.7 rad | 0.45×, 0.25 s control lockout, heavy punish |

Consecutive perfect entries escalate `PERFECT_BONUS` up to a cap; any non-perfect entry resets the streak.

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

**Voluntary.** The player holds the dive input. A ~0.3 s commit animation during which control transfers from free movement to heading control — the player rotates to align with the frame's current velocity vector. Then re-entry resolves.

**Forced.** The frame's arc reaches `y = 0`. Same resolution, with an auto-orient assist closing **[CALL]** 60% of the angle error, so an inattentive landing is sloppy but not catastrophic.

The commit window is where the two halves of the game hand off. It is the highest-value thing in the game to polish.

---

# 8. Enemies

## 8.1 Tiers

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

Up to 6 instances, each on its own cooldown with its own targeting rule. Ship four, each expressing a different relationship to the free-movement layer:

- **Spread** — fan opposite local movement direction. Rewards constant motion.
- **Lance** — single high-damage shot along local movement direction. Rewards committed dashes through the arena.
- **Orbit** — persistent projectiles circling the player. Rewards being surrounded; the only weapon that works while stationary.
- **Nova** — periodic radial burst centred on the player. Rewards diving into clusters.

Four weapons with genuinely different geometry beats twelve that differ only in damage numbers.

## 9.3 Evolutions

At weapon level 8, with the matching passive held, a weapon evolves: new name, new visual signature, a qualitative rather than quantitative change. Evolutions are the 2–4 minute beat in §4.2's timer stack and they must be **telegraphed** — show the requirement in the HUD as soon as the player holds either half. A goal the player can see coming is worth more than a surprise.

## 9.4 Damage

`damage = base × (1 + levelScaling) × critRoll`, crit a binary 2× roll. No armour, resistances or penetration in v1 — they multiply the tuning surface without adding decisions.

**Damage numbers are visible**, scaled by magnitude, in the weapon's own colour. Crits are larger and brighter. This is free dopamine and it should not be skipped.

---

# 10. Progression

## 10.1 Within a run

XP orbs drop on kill (25% base, magnetised within `PICKUP_RADIUS`), collected in arena-local space. Level-up pauses and runs the draft per §4.3.

**The upgrade pool spans both phases**, or the build layer ends up orthogonal to the game:

- **Water:** turn cost reduction · perfect-entry tolerance widening · thrust ceiling · drag reduction
- **Air:** local max speed · dash charges · arena bounds expansion · airtime extension
- **Combat:** damage, fire rate, projectile count, pickup radius, crit
- **Economy:** XP multiplier, rare-drop weight, orb magnetism

A water-focused build gets fewer, higher, richer flights. An air-focused build gets more out of each flight. Both must be viable, and the tension between them is the build layer.

## 10.2 Run structure

Time-based escalation, run ends on death, no wave cap. Escalation applies to tier tables regardless of player behaviour, so stalling underwater means facing a harder arena with no more speed than you had. That is sufficient pressure — no oxygen meter or water hazard is needed.

Escalation steps are **announced**: a HUD marker at 5, 10, 15, 20 minutes with a distinct sting. Visible dread is better pacing than invisible difficulty drift.

## 10.3 Run summary

The closure beat. Show: peak altitude with lifetime-best comparison, longest perfect-entry streak, cycles completed, kills, final build as a row of glowing icons, and any milestones unlocked. Make it feel like a story with an ending. Then stop — no auto-requeue.

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
- **Turn cost is visible**: hard turns shed a visible cavitation trail. The player should be able to see that a turn cost them speed.

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

**Unit.** Entry quality bands. Medium resolution with hysteresis. Tier lookup. Apex and airtime derivation. Arena bounds clamping. `toWorld` round-tripping within float tolerance. Draft weighting distributions. Loot table distributions.

**Simulation.** Scripted intent sequences through the headless harness:

- From rest with no input, the dolphin sinks and reaches terminal velocity within tolerance.
- **A hard turn produces measurably lower exit speed than a gentle turn through the same total angle.** This single test validates the water game.
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
1. *Mechanical:* all water simulation tests pass, including hard-turn-versus-gentle-turn.
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
XP, orbs, levels, the draft with weighting and guarantees, loot tables, streaks, combo, escalation, the altimeter and record lines, run summary.

**Gate, two parts:**
1. *Mechanical:* draft and loot distribution tests pass at 1000 samples.
2. *Human:* the §4.2 timer stack is verifiable by observation — record a five-minute session and confirm no gap longer than 10 seconds without a reward event.

### Phase 6 — Depth
Remaining four enemy behaviours. Evolutions. Full tier tuning pass against the §4.5 power curve. Commit-window polish.

**Gate:** a full run traces the §4.5 arc within tolerance.

### Phase 7 — Visual
The full §11 pipeline: lighting, reflections, caustics, the grid, particles, phase-lerped post stack, all sprite definitions. Audio per §12.

**Gate:** the §11.8 legibility test passes on a tier-5 peak-density frame with a stranger as the subject.

### Phase 8 — Platforms
Tauri (Steam), Capacitor (mobile). Touch is a real design problem: water maps well to two screen halves, but free air movement wants a virtual stick.

---

# 18. Non-goals for v1

- Multiplayer, leaderboards, networking
- Permanent stat upgrades or grind-based meta-progression
- Procedural level generation — the ocean is uniform; tiers are the level
- Boss encounters
- Story, dialogue, cutscenes
- Localisation
- Armour, resistances, elemental damage systems
- Underwater combat — water is the setup phase; keep it clean
- Any second stored position for any entity, under any name

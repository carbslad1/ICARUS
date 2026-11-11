> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# ICARUS condition items: draft 4, 3 Nov 2026

Brotato's diversity comes from one shared stat pool plus items and characters that reweight it. Its most memorable builds hang on conditions on the player's own state, and on conversions that make an unwanted stat useful. This draft does the same with the states of the jump, and replaces the stat screen with item picks.

**Built on** [ICARUS-flight-model.md](ICARUS-flight-model.md), a model of every launch angle, speed and wave on the game's own code, checked by a subagent. The foundation items are balanced with `icarus-flight-model/items.cjs`.

**Status:** a proposal. Every number is **[TUNE]**, and nothing is built. Tricks are left out until they're settled as a utility tool.

### What changed from draft 3 (review feedback)

1. **No more mandatory opposite pairs.** Pairs made players pick a side and keep buying it. Opposites still exist where they're natural, but the draft now adds **bridges**: items that make two apparently incompatible choices work together (§4).
2. **Costs are a few shared currencies, not bookkeeping.** "−10% Max HP" on many cards was just bookkeeping. Costs now come in three kinds, and each kind has an item that **reinterprets** it, so a cost can become a reason to buy (§3).
3. **Deep dive and Quick turn are removed.** One rewarded waiting under water, and the other a sub-half-second turnaround. Neither supports the aim.
4. **Level-ups lean less on how you already flew.** One card in three is a **turn card**, offering a reason to change the build (§6).
5. **A separate interaction test** checks whether buying one item makes others newly interesting. The average-damage model can't measure that (§7).

**Short-hop spam:** flights under 1 s are left out of the balance until the limiter is chosen (a locked re-entry or a breath meter). No item relies on spam.

## 1. Rules every item follows

1. **No height in metres.** For "how high", use the launch angle's tier, which means the same at every wave.
2. **A condition is a share of air time** (a phase, a window of the flight, "while the water is on screen") **or a state the player sees** (HP, the streak, a hit, kills, orbs). Never a burst per breach or per flight: breaches per wave range from 5 to 160.
3. **One condition, one effect, at most two lines.** Effects change stats or how other items read; never an attack, never a "chance to".
4. **Every item connects to at least two others,** by sharing a condition, sharing a cost currency, or bridging them. The interaction test (§7) checks this.
5. **Felt, not read.** It's either chosen in the dive, visible on screen, or the dolphin glows in the item's colour while it's active.
6. **Nothing is relative to enemies, and nothing judges an entry.**
7. **Foundation items are sized to a rarity budget,** measured as the average bonus per air second at the launch angle that suits them best:

| Kind | Budget |
|---|---|
| Pure (the level-up's safe card) | +5% always |
| Neutral (the same for every way of flying) | +5% |
| Common | +8% |
| Uncommon | +12% |
| Rare | +16% |

## 2. Foundation items

### Jump states, balanced on the model

"Value" is the item's average bonus per air second at its best angle, for flights of 1 s or more.

| Item | Rarity | Condition | Effect | Cost | Value, wave 1 → 20 |
|---|---|---|---|---|---|
| **Shallows** | U | The water is on screen | +12% Damage | −15% Damage while it isn't | 12 at every wave (flat) |
| **Open sky** | U | The water is off screen | +15% Damage | −10% Damage while it's on screen | 4 → 12 (w5) → 15 (scaling) |
| **Spray** | Neutral | First and last 20% of each flight | +15% Damage | −2% Damage otherwise | 4.8 |
| **Thin air** | Neutral | The apex (the middle 20%) | +30% Damage | −1% Damage otherwise | 5.2 |
| **Updraft** | Neutral | Climbing | +12% Attack speed | — | 4.8 |
| **Free fall** | Neutral | Falling | +12% Attack speed | — | 4.8 |
| **Low road** | U | Launch below 42° (tiers 1–2) | +8% Damage, +4% Attack speed for the flight | −2 Armour | 12 |
| **High stakes** | U | Launch at 56° or more (tiers 4–5) | +14% Damage for the flight | −3 Armour | 14 (+2 for the harder tier) |
| **Quick draw** | U | The first 1.5 s of each flight | +12% Attack speed | — | 10–12 (flat) |
| **Long breath** | U | Each second in the air, until splashdown | +2% Damage per second, max +24% | −4% Attack speed | 0 → 3 (w5) → 11 (scaling) |

### Player states (sized by budget; re-check once enemies are settled)

| Item | Rarity | Condition | Effect | Cost |
|---|---|---|---|---|
| **Full belly** | U | At full HP | +15% Damage | −15% Damage while not at full HP |
| **Bleeding fin** | U | Below half HP | +25% Attack speed | −3 Armour |
| **Clean lines** | R | Clean streak (×1–×5) | +4% Damage per streak level | — (the streak already resets on a hit) |
| **Scar tissue** | U | After taking a hit, until splashdown | +20% Damage | −2 Armour |
| **Feeding frenzy** | R | Each kill this flight, until splashdown | +1% Attack speed per kill, max +25% | −2 Armour |
| **First blood** | C | Until your first kill of each flight | +40% Damage | −10% Damage after it |
| **Fresh catch** | C | Each orb collected this flight, until splashdown | +0.5% Damage per orb, max +15% | — |
| **Pearl hoard** | U | Pearls held at the start of the wave | +1% Damage per 10 pearls, max +20% | −10% XP gain |

**The pure items for the level-up's safe card:** *Whetted edge* +5% Damage, and *Thick blubber* +10 Max HP.

## 3. Cost currencies and the items that reinterpret them

Every cost is one of three kinds, and each kind can be turned into a reason to buy:

| Currency | Items that pay it | Reinterpreted by |
|---|---|---|
| **Armour** (it can go negative) | Low road, High stakes, Bleeding fin, Scar tissue, Feeding frenzy | **Bare fin** (U): +2% Attack speed for each point of Armour below 0 |
| **"Otherwise" penalties** (damage lost while a condition is off) | Shallows, Open sky, Spray, Thin air, Full belly, First blood | **Calm water** (R): penalties from your items don't apply while you're climbing |
| **Attack speed or XP** | Long breath, Pearl hoard | None on purpose: these stay plain costs |

The Brotato pattern: Retromation's Hoodie turns Dodge into attack speed, and Stone Skin turns Armour into Max HP. Here a player who stacked Armour costs finds Bare fin and suddenly wants *more* of them.

## 4. Bridges: items that join apparently incompatible choices

| Bridge | Rarity | Effect | Joins |
|---|---|---|---|
| **Horizon** | R | During the apex, the water counts as both on and off screen | Shallows with Open sky: a hop item works at the top of a high flight |
| **Unbroken** | R | Long breath no longer resets at splashdown, only when you're hit | Long breath with short flights and Clean lines: a hopper can now scale |
| **Riptide** | U | Quick draw also opens for 1.5 s at the apex | Quick draw with high launches |
| **Second skin** | U | Full belly counts above half HP | Full belly with Bleeding fin: together they cover the whole HP range |
| **Chum** | U | Fresh catch counts kills as orbs | Fresh catch with Feeding frenzy and First blood |

## 5. Characters (no tricks)

Each has a gain multiplier, a drawback, and a starting item, as in Brotato. The bans that locked a side in draft 3 are replaced with drawbacks, so characters lean but don't wall off.

| Character | Gain multiplier | Drawback | Kit |
|---|---|---|---|
| **Skimmer** | Shallows, Low road and Quick draw count ×1.5 | −10% Max HP | Starts with Shallows |
| **Highflyer** | Open sky, High stakes and Long breath count ×1.5 | Weak early: −10% Damage in waves 1–4 | Starts with Open sky |
| **Glass** | Clean lines, Full belly and First blood count ×2 | Armour gains −50% | Starts with Clean lines |
| **Scavenger** | Fresh catch and Pearl hoard count ×1.5; +25% pickup range | −10% Damage | Starts with Fresh catch |

## 6. Level-ups without a stat screen

1. **Level-ups queue during the wave** and open at the start of the shop, never in flight.
2. **Each is a pick of 3 item cards:**
   - **Pure:** a safe stat card, always there.
   - **Fit:** a conditional item, drawn with a mild lean toward how you flew (weight 1 + 1 × the share of last wave's air time its condition held).
   - **Turn:** a bridge or a reinterpreter that touches an item you own, or else a condition you used least last wave. It's the card that gives a reason to change the build.
3. **The shop's own offers don't lean at all,** so discovery has a second source.

## 7. The interaction test

The average-damage model checks that each foundation item is worth its rarity. It can't tell whether buying one item makes five others newly interesting. That needs its own test.

### A. The interest graph (computed)

1. For every item X, and for each way of flying (each launch angle, at waves 5, 10 and 15), compute how each other item Y's value changes once X is owned.
2. Y is **opened** by X when its value rises by 4 points or more, or when it turns from negative to positive.

**Targets** **[TUNE]**:
- every non-pure item opens at least 2 others;
- every bridge and reinterpreter opens at least 1 item that was negative for that way of flying (a real change of direction);
- no item opens only items its own way of flying already wanted.

**What it needs:** each item written as a rule on the flight samples (on screen, phase, time since the breach) rather than as a share. `flightmodel.cjs` must save the samples per flight, so that joint conditions (for example the apex *and* the water on screen) can be computed. Items 11–18 need assumed uptimes until the enemies are settled.

### B. The pick test (with people)

1. Show a player a build of 4–6 items and three level-up cards.
2. Ask which card they'd take and why.

**Pass:**
- the turn card is taken in a meaningful share of hands (say a quarter or more);
- the player can say what it changes in how they'd fly.

**Fail:** they always take the card that matches their build.

### C. Runs

From flight logs, once enemies are settled:
- Do players change launch angle after taking a bridge?
- How many distinct item sets end runs?

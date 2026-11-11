> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# ICARUS slot items: the arrangement simulator

**4 Nov 2026.** This tests the five-slot item system (breach → ascent → apex → descent → entry, with Charge × Mult) on the flight model, the movement of every launch angle and wave on the demo's own code.

For each item set it tries every arrangement of the items in the slots and flies a whole wave. The wave is flown at one launch angle, or as a repeating plan such as three hops then a leap. It reports the best arrangement at each angle.

**Status:** a design tool. Every number is **[TUNE]**, and nothing is built in the game.

## How to run

In `icarus-flight-model/`:
- `node slots.cjs --wave=10` prints the archetype table and the bank-and-strike plans.
- `--engine=proposal` uses the pasted rules instead.
- `--kill=0.5 --orb=0.3` set the assumed kill and orb rates.
- `--min=1` drops flights shorter than 1 s.

`node slots-size.cjs` sizes the basic items to rarity budgets and writes `sized.json` (about 20 s). `--rares` sizes the rares and writes `sized-rares.json`.

`node slots-check.cjs` runs 40 hand-worked flights against closed-form values. They include water-on-screen time, Mirror, Undertow, the run records, and the proposal's Discharge at three wave/angle cases, which match the earlier numbers (517, 210, 222).

## The engine

The pasted proposal's base Charge of 10 at each breach paid per flight, so flat launches won (the starter, wave 10: 20% at 10° vs 7% at 89°). Removing the base flips the bias the other way, to steep launches. The neutral engine below gives the starter **7.5% at every angle and every wave**.

- **Charge:** starts at 0 (plus anything stored) and gains 1 per air second. **Mult:** starts at 1. Both end at entry.
- **Discharge:** spend all Charge, and weapons deal **+100% × Mult damage for Charge ÷ 10 seconds**. Overlapping Discharges add, and every bonus ends at entry.
  - **Mult sets how hard and Charge sets how long.** Only Charge can be wasted, when there's more of it than flight left. Mult is never wasted, so the power fantasy has no ceiling.
  - The cost of releasing late is real but never absolute.
- **Slots:** breach, halfway up, apex, halfway down, entry.
- **[ASSUMED] rates:** kills arrive at 0.5 per air second and orbs at 0.3. Kills double while you're boosted, so early damage earns kills that later items read.

**Damage** is reported as % more damage per air second, the same unit as `items.cjs`. Flights under 1 s are left out until the short-hop limiter is decided.

## Results

### Each set leans to its own launch angle, the same way at every wave

% more damage per air second at wave 10, best arrangement at each angle:

| Set | 10° | 20° | 30° | 45° | 60° | 75° | 89° | Best order loss with one fixed arrangement |
|---|---|---|---|---|---|---|---|---|
| **Starter** (Discharge) | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 0% |
| **Hunter** (Predator, Lens, Discharge) | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 0% |
| **Skimmer** (Tailwind, Shallows, Discharge) | **100** | 63 | 47 | 35 | 27 | 19 | 15 | 33% |
| **Reactor** (Battery, Feedback, Discharge) | **100** | 69 | 50 | 43 | 38 | 36 | 35 | 14% |
| **Climber** (Altimeter, Lens, Discharge) | 15 | 27 | 31 | 38 | 47 | **50** | **50** | 0% |
| **Patient** (Patience, Discharge) | 7.5 | 7.5 | 15 | 15 | **22.5** | **22.5** | **22.5** | 0% |
| **Metres** (the proposal's Altimeter, Lens, Discharge) | 27 | 38 | 50 | 50 | 58 | 64 | **66** | 24% |

The magnitudes aren't balanced yet (Skimmer 100 vs Starter 7.5). That's a later sizing pass to rarity budgets, like `items.cjs`.

### Order changes with the launch angle where items lean

- Skimmer and Reactor want **Discharge at the apex on flat launches and at the descent on steep ones.** On a short flight the extra Charge needs time left to be spent; on a long flight, later reads more.
- Using one fixed arrangement at every angle loses 14–33% for these sets.
- Neutral sets lose 0%. Their order is "adds first, release late", and that's accepted, as in Balatro.

### The hunting beat comes from shared values, not named partners

Plans at wave 20 (`20/20/20/75` means three hops at 20°, then a leap at 75°):

| Set | Leap every time | 20/75 | 20/20/75 | 20/20/20/75 |
|---|---|---|---|---|
| Discharge + Lens | 15 | 15 | 15 | 15 |
| Bank + Strike + Lens | 15 | 15 | 15 | 18 |
| Bank + Strike + Lens + Tailwind | 18 | 25 | 26 | 33 |
| Bank + Strike + **Stalk** | 29 | 36 | 43 | **67** |

- **Bank:** if you launched below 42°, store all Charge for the next flight.
- **Strike:** if you launched at 56° or more, Discharge.
- **Stalk:** +1 Mult per complete 4 air seconds since your last Discharge, across flights.

**Banking alone does nothing,** because Discharge is linear: moving Charge to a later flight doesn't grow it. Banking pays only when something builds while you wait, either Charge per flight (Tailwind) or Mult over time (Stalk). The angle you launch at picks which plan the arrangement runs, so it's built in the shop and chosen in the dive, with no precise execution.

## Rules the data gives

1. **No base Charge per breach.** Charge per air second keeps the engine neutral. Anything per flight is an item that leans flat, on purpose.
2. **Charge adds lean flat; Mult from time leans steep.** A flat amount of Charge per flight is worth most on short flights, and there are more of them. Mult multiplies Charge that grows with airtime.
3. **Steep items should give Mult, not Charge.** The relative Altimeter (Charge) fades over a run (89°: 52 → 50 → 37 at waves 5, 10, 20), and the metres version grows with the wave (50 → 66 → 100). Mult from a wave-relative height would hold steady. [TO TEST]
4. **"Per complete 10" rounds hops to nothing.** Cash Out gives 0 pearls at every angle under 45° at wave 10, because no single flight reaches 10 Charge. Carry the remainder: fractional pearls, or leave it as stored Charge.
5. **Every build needs one converter,** or Charge does nothing. Start with Discharge.

## Sized basics

**Value** is what the item adds to Discharge + Lens (15%) at its best launch angle or plan, averaged over waves 5, 10, 15 and 20. Feedback is measured with Battery added, because it needs Charge to read.

**Budgets [TUNE]:**
- Common +7.5, which is one Lens.
- Uncommon +11.
- Rare +15.

| Item | Rarity | Rule | Value | Waves 5 / 10 / 15 / 20 | Leans |
|---|---|---|---|---|---|
| Lens | C | +1 Mult | 7.5 | flat | — |
| Battery | C | +1 Charge | 11 | 17 / 12 / 9 / 7 | flat launches; early waves |
| Predator | C | +1.5 Charge per kill this flight | 7.5 | flat | — (kill rate assumed) |
| Magpie | C | +2.5 Charge per orb this flight | 7.5 | flat | — (orb rate assumed) |
| Shallows | C | +1 Mult per second the water has been on screen this flight | 7.5 | flat | long hops (20–30°); 0 at 10° and at 75° |
| Capacitor | U | ×2 Charge | 10 | flat | — |
| Summit | U | +0.5 Mult per launch tier above the second | 11.3 | flat | 42° and up; 0 below |
| Skipping Stone | U | ×1.75 Mult if you launched below 27° | 11.3 | flat | below 27°; 0 above |
| Feedback | U | +1 Mult per 4 Charge held | 10.8 | 9 / 9 / 9 / 16 | steep |
| Momentum | U | +1 Mult per 3 kills last flight | 12.4 | 6 / 12 / 13 / 19 | steep; grows |
| Prism | R | ×2 Mult | 15 | flat | — |
| Stalk | R | +1 Mult per 3 air seconds since you last Discharged | 17.5 | 8 / 14 / 21 / 28 | steep; grows |
| Trophy Tooth | R | +1 Mult per 150 kills this run | 14.6 | 0 / 8 / 21 / 30 | — ; grows over the run |
| Bank | C | If you launched below 42°: store all Charge for the next flight | with Strike + Stalk: +31 | | hops, then a leap |
| Strike | C | If you launched at 56° or more: Discharge | (as above) | | |
| Mirror | R | Copies the item in the slot before it | +7.5 after Lens; +30 after Prism | | |
| Cash Out | C | Spend all Charge: 1 pearl per 10 Charge, remainder carries | 6–7 pearls per wave 10 at every angle | | — |

### What sizing found

1. **Per-flight Charge is held hostage by the short-hop limit.** Battery at +1, best angle, wave 10, by the shortest flight allowed:

   | Shortest flight allowed | 0.5 s | 1 s | 1.5 s | 2 s |
   |---|---|---|---|---|
   | Battery +1 | 23 | 11.5 | 11.5 | 7.7 |

   The short-hop limiter has to be decided before any flat per-flight item can be balanced. Battery also fades over a run (17 → 7) as flights lengthen, like an early-game Balatro joker.
2. **Nothing in the basic set wastes Charge on flights of 1 s or more.** Charge ÷ 10 s always fits in the rest of the flight unless items pile on Charge. So **Burst, Undertow and Thunderhead are dormant** among the basics: Undertow adds 0, and Burst below Charge ÷ 20 is just a stronger Discharge. They're sized later with the rares, against a high-Charge build. The conversion rate decides how often release timing matters: a shorter rate makes waste, and so timing, more common.
3. **Thunderhead had to read Charge wasted, not cuts counted.** Counting cuts paid per flight, so hops farmed it (404% at +0.05 Mult a cut). Wasted Charge is still mostly a hop resource: over a run with Discharge at the descent it was 3,318 at 10°, 922 at 20°, 98 at 45° and 22 at 75°.
4. **Mult items size cleanly; Charge items depend on assumptions.** Predator and Magpie hit budget only because kill and orb rates are assumed. Re-size them once enemies settle.
5. **Run- and time-scaling Rares grow:** Stalk 8 → 28, Trophy 0 → 30, Momentum 6 → 19. That's the Balatro scaling-joker shape, and averaging over waves keeps them on budget.
6. **Mirror is a Blueprint:** cheap after Lens (+7.5), strong after Prism (+30, because ×2 becomes ×4). Fine for a Rare if the shop rarity holds.

## Sized rares

**Measurement:** each rare is measured in Discharge + Lens if it works there, or else in its **home**, the partner build it exists for. The Rare budget is +15.

**Charge cut short at entry is rare.** Only 6 of 840 basic builds waste any Charge at their best arrangement, and nearly all the waste comes from one build: Battery + Capacitor + Mirror + Discharge on flat launches (up to 94 Charge a wave). The waste items live there, which makes them **flat-launch items**.

| Item | Rule | Value | Home | Leans |
|---|---|---|---|---|
| Hollow Bones | +×0.5 Mult per empty slot | 15 | Discharge + Lens | — |
| Counterweight | ×4 Mult if this is the only item before your Discharge | 15 (in place of Lens) | Discharge alone | — |
| Spendthrift | Cash Out also Discharges | 15 | Cash Out + Lens | — (and the pearls) |
| Tidal Lock | Discharges add half of your last Discharge's Mult | 14 | Discharge + Lens | — |
| Echolocation | +0.02 Mult per kill made during a Discharge this run | 14 (3 → 29) | Discharge + Lens | grows over the run |
| Migration | +0.2 Mult for each wave this run you launched in 3 or more tiers | 17 (6 → 29) | Discharge + Lens | mixed plans only (0 at one angle) |
| Spring Tide | Stored Charge ×3 at each breach | 15 | Bank + Strike + Lens | hops, then a leap |
| Keystone | The next slot activates twice | 7.5 / **30** | after Prism | — |
| Mirror | Copies the item in the slot before it | 7.5 / **30** | after Prism | — |
| Inversion | Swap your Charge and Mult | 14 / 15 | Battery + Capacitor | — |
| Riptide | Discharges cut short at entry continue from your next breach | 22 | Battery + Capacitor + Mirror | flat |
| Thunderhead | +1 Mult per 100 Charge cut short at entry this run | 19 | Battery + Capacitor + Mirror | flat (0 at 75°) |
| Undertow | Charge cut short at entry carries to the next flight | 0 / **33** | Capacitor + Mirror + Feedback | — |
| Burst (U) | Spend all Charge: +200% × Mult damage for Charge ÷ 20 s | 14 (23 → 6) | Battery + Capacitor + Mirror | flat; early waves |

**Bold** home values are four-item combos. They pay about double the budget for spending four of the five slots, the way a Balatro combo does.

### What sizing the rares found

1. **Stored Charge needs a cap.** Undertow + Capacitor + Mirror reached 10²¹ stored Charge in one wave: waste is carried, multiplied by 4, wasted again. Damage hid it, because a Discharge can't outlast its flight, but Thunderhead reads wasted Charge, so Mult would have had no limit. **Rule: stored Charge is capped at 3× the next flight's airtime** (Bank, Savings, Undertow and Spring Tide alike). Basic values are unchanged by it.
2. **Mult carried between flights must not be multiplied again.** "Keep 75% of your Mult" with Prism reached Mult 7,878 in a wave; with Prism and Mirror, 10⁹. **Rule: carried Mult is added at the Discharge, after multipliers.** Tidal Lock now converges to ×2 however many multipliers you stack. Any future cross-flight Mult item must follow this rule.
3. **Burst below Charge ÷ 20 is a stronger Discharge.** It's only a trade-off from ÷ 20 up (same total, half the duration).
4. **Waste items are flat-launch items, and they fade.** Burst 23 → 6 over a run. If waste and timing play should reach more builds, Discharge's rate (Charge ÷ 10 s) is the lever: a smaller divisor makes waste common. That's a decision for the whole system, not one item.
5. **Echolocation feeds itself** (more Mult → more kills during a Discharge → more Mult): 17% → 41% over a run, 168% with Prism. It's bounded, but only because the kill rate is assumed. Re-check it once enemies settle.

**Not sized:**
- Glass Fin, Hollow Hunt, Pearl Diver and Bounty read hits, kill gaps and pearls held, none of which the model has.
- Monoculture (×Mult while you keep one tier) would be a Prism with a drawback, so it's dominated.
- Ouroboros and Brainstorm copy the entry item, and entry holds only storage and economy items, so there's little worth copying.

## Limits

- **No enemies:** kills and orbs arrive at a steady assumed rate, so Hunter's neutrality is an assumption, not a result.
- **No hops under 1 s,** and no holding up or down in the air.
- **Weapons are one damage multiplier,** with no ranges or targets.
- **Each slot holds one item,** and the same item may sit in several slots.

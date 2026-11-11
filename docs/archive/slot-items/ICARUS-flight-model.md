> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# ICARUS flight model: every angle, speed and wave

**3 Nov 2026.** This models the repo demo's movement on its own code, headless, with no enemies, no damage, no stats and no bot. Step by step it goes from the physics to the rules that stats and items must follow. Enemies are left out because they aren't settled.

**Method:** for each wave (1–20), launch angle (2°–89°) and air input (hold nothing, hold down, hold up), the dolphin:
1. swims to the surface;
2. is launched at exactly that angle, at the speed the game gives it;
3. flies;
4. enters, and swims back out at the same angle.

The second cycle is recorded: 1,140 cases on the shipped settings, with free swimming.

**Checked by a subagent,** which read the code and built its own harness. Its grid matches this one exactly in all 1,140 cases. Its corrections are applied here:
- damage is blocked (a lethal hit used to cut 19 late flights short);
- each flight's phase prediction is redone for the forced angle;
- flights per wave are rounded up (the last flight runs past the clock).

**Scripts:** `icarus-flight-model/` next to this file.
- `node flightmodel.cjs /Users/johncarbone/Projects/icarus/ICARUS-demo.html model.json` (about 45 s);
- `node derive.cjs` prints the per-wave tables;
- `verify/` has the subagent's checks.

## Step 1: two numbers decide the jump

- **Launch speed v is set by the wave:** 30 m/s at wave 1, +5 per wave, 125 m/s at wave 20. Boosting under water doesn't change it, because the breach rescales to the wave speed. Only the Lift and Drive stats do.
- **The launch angle θ is the player's choice.**
- **In the air the arena's centre follows a plain ballistic arc** at gravity 15 m/s². One quantity decides it, the vertical launch speed vy = v·sinθ:
  - **airtime = 2·vy / 15**
  - **peak = vy² / 30**

  Height and airtime are one variable.
- **The dolphin moves ±20 m inside the arena,** at 34 m/s (24 m/s vertically on a diagonal). The flight ends when the dolphin, not the arena, reaches the water.

### Airtime in seconds (holding nothing)

| Wave (speed) | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 (30) | 0.17 | 0.37 | 0.70 | 1.38 | 2.01 | 2.83 | 3.47 | 3.87 | 4.00 |
| 5 (50) | 0.24 | 0.59 | 1.17 | 2.28 | 3.34 | 4.72 | 5.78 | 6.44 | 6.67 |
| 10 (75) | 0.37 | 0.88 | 1.74 | 3.42 | 5.01 | 7.08 | 8.67 | 9.66 | 9.99 |
| 15 (100) | 0.47 | 1.18 | 2.33 | 4.57 | 6.67 | 9.43 | 11.55 | 12.88 | 13.33 |
| 20 (125) | 0.59 | 1.48 | 2.91 | 5.71 | 8.34 | 11.79 | 14.44 | 16.10 | 16.66 |

### Peak height in metres (holding nothing)

| Wave | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.1 | 0.3 | 0.9 | 3.5 | 7.6 | 15 | 23 | 28 | 30 |
| 5 | 0.1 | 0.7 | 2.6 | 9.8 | 21 | 42 | 63 | 78 | 83 |
| 10 | 0.3 | 1.5 | 5.7 | 22 | 47 | 94 | 141 | 175 | 187 |
| 15 | 0.4 | 2.5 | 10 | 39 | 83 | 167 | 250 | 311 | 333 |
| 20 | 0.7 | 4.1 | 16 | 61 | 130 | 261 | 391 | 486 | 521 |

**At one angle, height grows 17× over a run** (speed squared). **Height relative to the wave is the angle itself:** the peak divided by the wave's highest possible peak equals sin²θ.

## Step 2: two ways to fly, split at vy ≈ 34.5 m/s

The dolphin's own vertical speed in the arena is 34.2 m/s. While the climb is slower than that, the dolphin can outrun the arc, so a sharp edge falls out of the physics.

| | **Hop** (vy below ~34.5 m/s, peak below ~40 m) | **Flight** (vy above ~34.5 m/s) |
|---|---|---|
| **Flight length** | **The player's:** holding down ends it in 0.35–0.67 s; holding up adds up to 1.5 s | **The launch's:** input changes it by −0.7 to +1.5 s |
| **The water** | On screen all or most of the time | Leaves the screen soon after the breach (the camera follows the arena's centre, and the view is 43.2 m tall) |
| **Angles that qualify** | Any at wave 1; under 44° at wave 5, 27° at wave 10, 16° at wave 20 | Everything steeper |

**Hops exist at every wave.** The band narrows in angle as the wave speed rises, so later waves ask for flatter hops.

**Under water:**
- The game won't breach before **0.22 s** under water (the skim floor).
- The harness's swim takes **0.23–1.13 s**: shorter at higher waves and at shallow angles.
- That's one strategy, not a game constant. A player can stay under as long as they like.
- Breaches at 1–3° are possible by hand, but hard to repeat.

## Step 3: what a wave holds

**The air clock** is 20 s at wave 1, +5 s per wave up to 60 s, and 90 s at wave 20. It runs only in the air (`demo.js:74, 479`). The last flight always finishes past the clock.

### Flights per wave (holding nothing; rounded up)

| Wave | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 118 | 55 | 29 | 15 | 10 | 8 | 6 | 6 | 5 |
| 5 | 167 | 68 | 35 | 18 | 12 | 9 | 7 | 7 | 6 |
| 10 | 163 | 69 | 35 | 18 | 12 | 9 | 7 | 7 | 7 |
| 20 | 153 | 61 | 31 | 16 | 11 | 8 | 7 | 6 | 6 |

### Flights per wave holding up for the whole flight

| Wave | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 12 | 11 | 10 | 9 | 7 | 6 | 5 | 5 | 5 |
| 5 | 23 | 21 | 18 | 13 | 10 | 8 | 7 | 6 | 6 |
| 10 | 33 | 29 | 22 | 15 | 11 | 9 | 7 | 7 | 6 |
| 20 | 46 | 36 | 25 | 15 | 11 | 8 | 7 | 6 | 6 |

### Wave length in real seconds (air clock + time under water, holding nothing)

| Wave | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 87 | 50 | 36 | 27 | 26 | 26 | 25 | 26 | 26 |
| 10 | 109 | 80 | 70 | 65 | 65 | 65 | 65 | 66 | 67 |
| 20 | 125 | 104 | 97 | 94 | 94 | 94 | 94 | 95 | 96 |

### Air seconds per wave with the dolphin within 20 m of the water

| Wave | 2° | 5° | 10° | 20° | 30° | 45° | 60° | 75° | 89° |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 20 | 20 | 20 | 20 | 20 | 13 | 9 | 8 |
| 10 | 60 | 60 | 60 | 42 | 15 | 7 | 5 | 4 | 3 |
| 20 | 90 | 90 | 90 | 16 | 7 | 4 | 2 | 2 | 2 |

**Phases (ascent / apex / descent) are 40% / 20% / 40% of every flight,** by construction (`demo.js:86, 134`).

## Step 4: the rules that follow

1. **Never condition on height in metres.** At one angle, height grows 17× over a run, so any metre threshold changes meaning every wave.

2. **Wave-relative height is the launch angle.** A condition about "how high" uses the threat tiers the angle already sets (27° / 42° / 56° / 70°). It means the same at every wave, and it's chosen in the dive.

3. **The one height that's visible is "the water is on screen".** It is what the player sees, so it needs no reading. It holds for 100% of a hop and for a few seconds of a high flight. It's the natural hop-versus-flight pair.

4. **The budget unit is the air second.** Every style gets the same air seconds per wave, because the clock is the budget. So a condition that's a share of air time is fair to all styles by itself:
   - a phase;
   - the first or last part of a flight;
   - "while the water is on screen".

5. **Per-event effects aren't fair by default.** Breaches per wave vary from 5 to 160. An effect per breach, splash or flight must either:
   - be sized by that flight's airtime, which the game knows at the breach (2·vy/15), so totals per wave come out equal; or
   - be capped per wave; or
   - be a deliberately style-favouring item, paired with an equally strong opposite.

6. **Sizing by vy gives growth for free.** vy rises with the wave speed, so an effect sized by airtime grows about 4× over the run at the same angle. The beat gets bigger every wave, and the per-wave total stays fair between styles.

7. **Flight-length conditions are skill only in the hop band.** There the player decides mid-air when to come down. Above it, the launch decides. The hop band narrows from every angle at wave 1 to under 16° at wave 20, so hop items naturally push toward flatter launches later. That's a wave-dependent balance the physics already provides.

8. **Skimming costs real time:** waves take up to 3.5× longer in real seconds. If enemies keep spawning while you swim (the setting is on), that's a hidden tax on skimming. Settle it once the enemies are.

## Limits

- **No enemies:** nothing here says where kills happen.
- **No stats:** Lift, Hang, Drive and Air steering would change step 1.
- **Water times are one swim strategy.**
- **Skim airtimes are 1–3 steps of 1/120 s off** the formula.

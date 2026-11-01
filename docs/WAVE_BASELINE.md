# Wave baseline: ICARUS against Brotato, waves 1–5

Measured 2026-11-01, for setting a baseline target. The designer asked for kills per wave and enemies on screen with the basic character, the basic weapon and the scaling rules.

## How each side was measured

**Brotato** (zone 1, danger 0): from the wave table in `brotato-reference/` (reference only).
- **Spawns** are the expected counts from the wave groups:
  - groups are checked once a second from their start time
  - they repeat on their interval while the wave runs
  - each spawn uses the mean of its min and max count
- **Kills and enemies alive** are modelled, because they depend on the player:
  - Well-Rounded with a tier-1 Pistol (12 damage, 1 shot a second), with no purchases
  - the Pistol one-shots every zone-1 enemy in waves 1–5, so kills are capped at about 1 a second
  - range and travel are ignored, so the kill numbers are an upper bound
  - "alive" is spawned so far minus killed; Brotato caps it at 100
- A real player buys weapons between waves. So the realistic Brotato kill target is close to the spawn count, and the Pistol figures are the floor.

**ICARUS**: `node qa/wavebaseline.cjs`.
- Starting Harpoon, with no shop purchases and no level-up picks.
- The demo's defaults: free swimming, Brotato enemy scaling and movement.
- A free-swimming bot (`qa/bot.cjs` swimmer) flying low, mid and high launches, 4 seeds each.
- The dolphin cannot die; its hits are counted.
- "On screen" means enemies inside the camera's view: the arena in the air, and the enemies held above the water while swimming.

## Results

| Wave | Brotato spawns | Brotato kills (bare Pistol) | Brotato alive, mean / most | ICARUS spawns | ICARUS kills | ICARUS on screen, mean / most | ICARUS hits | ICARUS air s / real s |
|---|---|---|---|---|---|---|---|---|
| 1 | 31.5 | 19 | 6 / 13 | 70 | 53 (76%) | 12 / 22 | 5 | 21 / 44 |
| 2 | 41.5 | 24 | 9 / 21 | 96 | 70 (72%) | 15 / 31 | 5 | 27 / 48 |
| 3 | 69 | 29 | 19 / 41 | 134 | 77 (57%) | 25 / 57 | 13 | 32 / 50 |
| 4 | 89.5 | 33 | 25 / 57 | 148 | 81 (54%) | 30 / 64 | 16 | 37 / 53 |
| 5 | 140.5 | 39 | 47 / 100 (cap) | 207 | 106 (51%) | 47 / 91 | 26 | 43 / 58 |

Brotato wave lengths: 20, 25, 30, 35 and 40 s. The ICARUS air clock uses the same lengths. A wave ends at the next water entry, so it runs slightly over.

**Spawns per second of wave clock:**

| | Wave 1 | Wave 2 | Wave 3 | Wave 4 | Wave 5 |
|---|---|---|---|---|---|
| Brotato | 1.6 | 1.7 | 2.3 | 2.6 | 3.5 |
| ICARUS (spawning while swimming, the default) | 3.4 | 3.6 | 4.2 | 4.0 | 4.8 |
| ICARUS (spawning while swimming off) | 1.7 | 1.9 | 2.5 | 2.8 | 3.9 |

ICARUS with spawning while swimming off (`--tune=wetspawn:0`):

| Wave | Spawns | Kills | On screen, mean / most | Hits |
|---|---|---|---|---|
| 1 | 36 | 34 (95%) | 2 / 6 | 3 |
| 2 | 51 | 45 (88%) | 3 / 9 | 3 |
| 3 | 81 | 64 (80%) | 9 / 20 | 9 |
| 4 | 103 | 71 (69%) | 14 / 31 | 13 |
| 5 | 164 | 97 (59%) | 28 / 62 | 20 |

## What it shows

- **ICARUS spawns about twice Brotato's enemies per wave.** The wave's schedule is Brotato's zone 1 groups, and it keeps running while you swim ("Enemies keep spawning while you swim", 2026-10-27). But the clock counts only air time, and a wave is about half water. With that setting off, spawns are 14–23% above Brotato's: the 1.1 spawn count, plus the wave running past its clock.
- **The starting Harpoon kills faster than Brotato's bare Pistol:** 2.2–2.6 kills per air-second against 0.95. It still clears only 51–76% of what spawns. With swimming spawns off it clears 59–95%.
- **On screen, ICARUS opens busier than Brotato and meets it by wave 5:** 12 against 6 alive on average in wave 1, 47 against 47 in wave 5. With swimming spawns off, ICARUS opens much quieter (2 in wave 1) and reaches 28 by wave 5.

## Choosing a target

The open decision is what "Brotato pressure" should mean here: per second of air, or per second of play.
- **Per second of air:** spawns per air-second match Brotato's, and the water is a breather. That's spawning while swimming off, give or take the 1.1 count.
- **Per second of play:** keep spawning while swimming, but scale the counts by about half. Then the total per wave matches Brotato's, and the pressure is spread over the water stays too.

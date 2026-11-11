# The armory (branch `prototype/brotato-port-2026-11`, 2026-11-08)

Designer's brief: Brotato's weapons, items, scaling, stats and shop, mathematically and functionally identical, with
original assets. Characters are left out. The old weapons, gear and shop are replaced.

**What crosses over:** rules, formulas and numbers. **What does not:** names, descriptions, art, icons and code. Every name
in `source/armory-data.js` is ICARUS's own.

The setting **"Brotato weapons, stats and shop"** (`DEMO.tune.port`, on by default) switches between this and the old game.
Change it, then reload the page.

## Coverage (2026-11-08)

| | Done, exact | Total | Not sold yet |
|---|---|---|---|
| Weapons | 48 | 62 | 14 |
| Items | 105 | 209 | 104 |
| Classes (set bonuses) | 17 | 17 | |
| Level-up stats | 16 | 16 | |
| Shop rules | all | | |

**A weapon or item is only sold once it behaves exactly.** Nothing is half-working in the shop.

**Waiting on a mechanic ICARUS does not have yet:**
- Fruit, crates and consumable effects.
- Turrets, landmines, gardens, trees, pets and other deployed helpers.
- Enemy-count, enemy-speed and enemy-health modifiers, and next-wave modifiers.
- Fog of war.

**Waiting on engine work only:** "while not moving", gain-a-stat-per-stat conversions, per-interval and on-hit temporary stats,
slow effects, no-hit boosts, health-loss items, pick-up triggers, and level-up triggers.

## Rules implemented

**Damage:** trunc(base + Σ scaling × stat), at least 1, then round(× (1 + Damage % + Explosion damage if exploding)), at least 1;
a crit multiplies that and rounds; each hit rolls its own crit.

**Cooldown:** cooldown ÷ (1 + attack speed), truncated, at least 2 frames; negative attack speed multiplies it. Each shot waits a
random time within ± min(n × cooldown ÷ 5, n × 5) frames, n = guns held, up to 6. "Every X shots" reloads multiply the cooldown.
Melee adds swing time, which depends on distance to the target and attack speed.

**Shots:** projectile count and spread, accuracy, per-shot piercing with damage loss, bounces that retarget a random enemy with
damage loss, range from range stat. Bounces resolve before piercing.

**On-hit effects:** burn (ticks every 0.5 s, strongest burn wins, spreads), explosions (replace the direct hit; 5.9 m radius ×
scale × Explosion size), extra shots on hit, per-kill stat gains, money on crit kills, pierce or bounce on crit.

**Stats:** all sixteen level-up stats, plus Knockback, Explosion damage and size, Piercing, Pierce damage, Bounce, Item price,
Pickup range, XP gain and Harvest growth. Dodge caps at 60%. Hit protection, free rerolls and end-of-wave items.

**Shop:** four offers; weapon guarantees in waves 1–5, then 35%; leaning to owned weapons and classes; tier odds with Luck; no
repeats in one shop; item purchase limits; lock; reroll formula; level-up rerolls; 25% resale; combining. Money comes from orbs
and Harvesting; 30 at the start.

## Translated to ICARUS's arena

These cannot be literal because the arena is different. Each is one choice to review:

| Rule | In ICARUS |
|---|---|
| Distance | 25 source pixels = 1 m |
| Damage and health units | Player ×10; weapons and enemies by the existing health factor, so ratios match |
| Melee reach shape | Thrust: a 0.8 m line. Sweep: a half circle in front |
| Knockback | Source value ÷ 4, as metres per second |
| Speed | Air steering |
| Burn spread distance | 3 m (the source uses a particle overlap) |

## Still from the old game

The chips × mult display, streak and tricks still run on screen. A trick's weapon-type damage boost does not apply to armory weapons, although its label still shows.

## Art and names

Weapon art reuses ICARUS's own 20 weapon drawings by role. Item icons are a plain symbol. Names are generated placeholders from
ocean word lists. All of these can be replaced without touching the rules.

## Checks

- `node qa/port.cjs`: behaviour checks, including every weapon firing and dealing damage. `--runs` adds bot runs.
- A local script outside the repo compares the built game with the source tables number by number.
- `qa/load.cjs`, `qa/rules.cjs`, `qa/routine.cjs`, `qa/tricks.cjs`, `qa/statuses.cjs` and `qa/flightlog-bot.cjs` run the old game, because they test the old shop.

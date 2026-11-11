> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# Slot items: the branch and what it has taught us

**Branch:** `prototype/slot-items-2026-11`, from `2b35031` (enemies on the stage). Worktree: `~/Projects/icarus-slots`. Status: prototype, to be judged by playing it.

The design record is in `docs/slot-items/`: the flight model, the simulator results and the sizing scripts. Read `ICARUS-slot-sim.md` there before changing the engine.

## What it is

Five slots fire once per flight, in order: Breach, Ascent (halfway up), Apex, Descent (halfway down), Entry. Items change two values, Charge and Mult. A converter turns them into damage or pearls. The player arranges items in the shop only; the launch angle picks which conditional items run.

- **Engine:** Charge starts at 0 and gains 1 per air second. Mult starts at 1. Discharge gives +100% × Mult for Charge ÷ 10 s, ending at entry, and makes every gun fire at once.
- **Base character:** any starter weapon, with Discharge in the Descent slot.
- **Left out for now:** the shop's stat gear, combat gear and charms. Their code stays, behind `DEMO.tune.slots`.
- **Kept:** weapons, level-up stat picks (the guns scale from them and they are the only defence left), the four tricks, pearls and the streak.

## Where it is

| File | What |
|---|---|
| `source/slots.js` | The engine, 31 items, forecast, HUD, effects |
| `source/slots.css` | HUD and shop panel |
| `source/demo.js` | Hooks: breach, tick, entry, kills, the boost in `fire`, the `slot` shop row, `slotMove` and `slotSell` |
| `source/shop.js` | `slotPanel`: the sequence, bench, forecast, last wave's numbers |
| `source/loadout.js` | Playtest loadout: "Start with every item on the bench" |
| `qa/slots.cjs` | Rule and shop checks; `--combat` and `--rate` are the combat studies |

Settings › Score has three switches: slot items, the volley, and the fire-rate experiment.

## Rules that must stay

1. No Charge paid per breach. A lone Discharge must stay the same at every launch angle.
2. Stored Charge is capped at 3× the next flight's airtime. Without it Undertow + Capacitor + Mirror stored 10²¹ in a wave.
3. Mult carried between flights is added at the Discharge, after multipliers. It reached 10⁹ otherwise.
4. Nothing reads metres. Use angle tiers, shares of the flight, or time.
5. Items change values and never attack. No "chance to", no freezes or slow motion.
6. Arranging happens in the shop, never in flight.

## What real combat showed (6 Nov)

`node qa/slots.cjs --combat` and `--rate`: real guns and enemies at fixed angles, waves 5, 10 and 15, one seed, the dolphin unable to die, gun tier guessed from the wave (T2, T3, T4). The swing between runs is about ±5 points.

1. **The model is right about damage fired.** A lone Discharge fired 6–10% extra (modelled 7.5%). Mult 4 fired 20–40% extra (modelled 30%).
2. **Most of that is lost to overkill.** Mult 4 landed only 7–14% extra. Enemies mostly die in a shot or two, so extra damage on the killing shot does nothing.
3. **Kills are often limited by spawns, not damage.** With six guns kills sit near 3–7 a second and neither form of Discharge changes them (0–2%). Fin and Depth behave the same alone.
4. **Heavy guns miss short Discharges.** A 1 s cooldown can miss a 0.5 s window the same way every flight. The volley fixes this: Heavy went from 6% to 15% fired with a lone Discharge.
5. **Fire rate beats damage where it can matter** (landed damage, damage vs rate): Harpoon +7% / +21%, Laser +8% / +20%, Minigun +16% / +25%. Fin, Depth and six guns: about 0 either way.
6. **Real rates are about 3.8 kills and 3 orbs per air second,** not the 0.5 and 0.3 assumed. Predator, Magpie, Momentum, Trophy Tooth and Echolocation were rescaled by that ratio. These rates come from an unkillable dolphin, so they may run high.
7. **A Discharge is short.** At wave 3 a Mult 4 Discharge showed as +400% for 0.3 s.

## Open questions

- **What should a Discharge be?** Damage, fire rate, or something that can't be lost to overkill.
- **Is the game short of damage at all?** If guns outpace spawns, no damage item can show. Enemy health and spawn pressure decide this, and enemies are still changing on the main branch.
- **Battery** can't be balanced until the short-hop limiter is chosen.
- **Characters** come after this: each one a slot-rule change, tested for a different best angle.

# ICARUS standing design rules

**Collected 2026-11-12** from the designer's rulings in earlier sessions, so they live in the repo instead of in an agent's memory. Each rule has the date it was recorded. A new ruling goes in `docs/DECISIONS.md` first and is then added or changed here with its date. If a proposal breaks one of these, say so in one line and let the designer decide.

## How the game plays

1. **Damage comes only from weapons.** Guns and melee weapons. Tricks, the wake, the breach and splashes never deal damage. (2026-11-08)
2. **No freezes on the player.** No hit-stops, no freezes and no slow motion applied to the player. (2026-09-19)
3. **Nothing to read in flight or under water.** Flight is too fast to read and a dive lasts about a second. Decisions and text belong in the shop. (2026-10-24)
4. **Entries are never judged.** The dolphin auto-aligns on entry. No clean or perfect entries, no entry grading. (2026-10-13)
5. **Dodging is never something you buy.** (2026-11-10)
6. **Feedback lives on the dolphin and the guns,** never in a corner panel. (2026-11-10)
7. **The camera keeps up.** Tight follow. Never ease or smooth the camera for a nicer picture; it felt mushy and was rejected. (2026-11-03)
8. **Movement and enemy behaviour stay as shipped.** New behaviour goes behind its own setting. (2026-09-27)
9. **Front flip is not invulnerable.** It has a small shove only. (2026-11-10; confirmed by the designer 2026-11-12)

## How things are designed

10. **Good randomness comes before a calm decision** (a shop, a per-wave draw). Randomness after the player has committed, which takes something away, is bad. (2026-10-10)
11. **A weapon scales with something the player builds:** a level, an item, a tree. Not a raw fact of one flight such as its height or its spins. (2026-11-09)
12. **Enemy changes start from a written rule set** the designer has agreed (`docs/ENEMY_RULES.md`), and the movement is written to it. No stacking patches or constants. (2026-11-04)
13. **Facts before design.** Start from a sourced fact sheet: code, measurements, the designer's rules. Mark everything else [ASSUMED]. (2026-11-03)
14. **Open design asks get bold pitches led by the fantasy,** not formula tweaks. Facts stay accurate; a bent rule gets one line. (2026-11-08)

## How things are checked

15. **Test gameplay headlessly** on the game's own built code in Node. Use the browser only for what must be seen. (2026-10-08)
16. **Judge by outcomes per wave** (damage landed, kills, time to kill, crowd, hits taken), not by matching another game's inputs and not by damage fired. (2026-11-07)
17. **Bots are not the judge of feel.** They measure; the designer decides. (2026-11-03)
18. **Measure fast.** Long background runs are disliked. Make the harness quicker before running more of them. (2026-11-12)
19. **Comparisons to other games are not requirements,** apart from Brotato's spawn schedule and the ported weapon and shop rules on this branch. (2026-11-08)

## Look

20. **"Like Animal Well" means outlines, line detail and stepped gradients, in HD.** Not pixel art and not copies of its rooms. (2026-10-10)

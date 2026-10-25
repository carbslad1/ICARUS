# ICARUS — tricks as reels (S4)

Open **ICARUS-demo.html** in a browser. This build implements the scoring and run design in `ICARUS_DESIGN.md` §4 and §10 (revised 2026-10-25).

Hold **W / Up** underwater to carve, then release to launch. **Space** boosts. **W A S D / arrows** steer in the air; weapons fire automatically. **Esc** pauses.

## How a run works

- **Every jump banks chips × mult** at water entry. Kills are chips, plus bonus chips for multi-kills, apex kills and crit kills. Tricks, combos and charms are mult.
- **Tricks are the reels.** Each jump draws 3 tricks (buy more, up to 6; Loaded reels makes 7). They play automatically in order across the flight.
- **A hit bails the trick in progress.** It shows as a red ✕ on the reels and pays nothing; landed tricks keep their value.
- **0 HP busts the jump.** The dolphin falls out of combat to the water, spending air clock. The jump banks nothing (half with Second wind), and you come back at 50% HP.
- **Heat cue.** The next jump's tricks are drawn when you hit the water. During the dive, a colour wash, a tone and a one-word label (cold, warm, hot, jackpot) say how good they are.
- **The only way to lose is missing a wave's quota.** After the air clock runs out, the wave ends at the next water entry.
- **Shop:** Weapons, Gear (stat and combat items; the only source of stats, with no XP or level-ups), Charms and Routine (trick values, combo levels, draw odds, extra draws, Lucky/Gold/Echo techniques). Run rules (charm slot, reroll discount, extra shelf) appear as rare shelf offers. Rarity sets how often an offer appears and is shown in colour. The trick scoreboard with real combo odds is always visible in the shop.
- **37 charms**, each readable in two lines with at most one condition: +chips, +mult, ×mult, pearls and rule changes (wildcard, payline doubling, Second wind, Safety net, Loaded reels). They resolve left to right at the bank. No charm changes weapon damage.

## Source and checks

`node source/build.cjs` rebuilds the self-contained HTML.

Headless suites (all pass on this build):

| Script | Covers |
|---|---|
| `qa/five-score.cjs` | Scoring rules, every charm, bails, busts, techniques, monotonic draws (16 groups, 18,821 assertions) |
| `qa/five-combat.cjs` | Combat items |
| `qa/scoreboard.cjs` | Score cues match the bank, including bails and busts |
| `qa/shop.cjs`, `qa/shop-ui.cjs`, `qa/weapon-shop.cjs` | Shop transactions, offer rules, rarity, previews |
| `qa/scoring-mechanics.cjs`, `qa/combat-integration.cjs`, `qa/score-stress.cjs` | Overtime, bosses, busts freezing combat, item hooks, CPU stress |

Browser suites need Playwright: `qa/scoreboard-browser.cjs` (4 of 4 pass) and `qa/product-review.cjs --browser --round=S4` (8 of 8 runtime, 10 of 11 browser). The failing browser check is the 15-second rendered stress test, which reaches about 4.5 s of simulated air in this container's software-GL Chromium. The previous build measures the same once its renderer crash is fixed, so this is the environment, not a regression.

Bot trials (`qa/scoring-progression.cjs`, `--focused`, `qa/scoring-styles.cjs`) write `reviews/S4-*.json`. They are scripted policies, not players.

## Known balance state (to tune)

- Waves 1–4 are close (1.1–4× quota for bots); waves 5–12 are too easy for a strong machine (5–40×).
- Wave 17 is a wall: bots bust repeatedly and miss quota. Bots in the previous build also died around wave 17.
- The Sonic starter and close-range low launches remain weak, and the ascent charm package underperforms.
- Quota curve, bust fall speed, revive HP and heat bands are tuning values (`[TUNE]` in the design doc).

Device performance, human learning time and enjoyment are not established by these checks.

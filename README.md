# ICARUS — tricks as reels (S4)

> **Design direction changed (2026-10-30).** `ICARUS_DESIGN.md` §4 and §10 now describe the target design. Each dive, you choose a trick or combo underwater, and it boosts its weapon type for the flight. Tricks never deal damage; items only modify; levels give item drafts; catalysts evolve weapons; splashdown pays kills and orbs × clean streak. The build order is §4.17. This build still contains the earlier systems: the S4 slot machine (Appendix A) and the routine and positional design built on this branch (Appendix B).

Open **ICARUS-demo.html** in a browser. This build implements the scoring and run design in `ICARUS_DESIGN.md` §4 and §10 (revised 2026-10-25).

Hold **W / Up** underwater to carve, then release to launch. **Space** boosts. **W A S D / arrows** steer in the air; weapons fire automatically. **Esc** pauses.

## How a run works

- **Every jump banks chips × mult** at water entry. Kills are chips, plus bonus chips for multi-kills, apex kills and crit kills. Tricks, combos and charms are mult.
- **Tricks are the reels.** Each jump draws 3 tricks (buy more, up to 6; Loaded reels makes 7). They play automatically in order across the flight.
- **A hit bails the trick in progress.** It shows as a red ✕ on the reels and pays nothing; landed tricks keep their value.
- **0 HP busts the jump.** The dolphin falls out of combat to the water, spending air clock. The jump banks nothing (half with Second wind), and you come back at 50% HP.
- **The only way to lose is missing a wave's quota.** After the air clock runs out, the wave ends at the next water entry.
- **XP:** kills drop XP orbs that you steer through to collect. Each level gives a free pick of three stats before the shop. Levels add no Max HP on their own.
- **Shop:** Weapons, Gear (stat and combat items), Charms and Routine (trick values, combo levels, draw odds, extra draws, Lucky/Gold/Echo techniques). Run rules (charm slot, reroll discount, extra shelf) appear as rare shelf offers. Rarity sets how often an offer appears and is shown in colour. The trick scoreboard with real combo odds is always visible in the shop.
- **37 charms**, each readable in two lines with at most one condition: +chips, +mult, ×mult, pearls and rule changes (wildcard, payline doubling, Second wind, Safety net, Loaded reels). They resolve left to right at the bank. No charm changes weapon damage.

## Step 1: space (2026-10-27)

- **Spawns:** most enemies now appear behind a red marker inside the view, ahead on your path and at least 10 m above the water. About one in five still enters from the screen edge; Settings › Score has a slider for this.
- **Flocking:** chasers flock about 6 m apart and follow your recent track.
- **Turning round:** enemies left beyond the screen after you turn underwater re-enter at the screen edge at the breach.
- **The landing pool** is built but off: spawns at the water line felt unfair in playtest 1.
- **Settings › Score** switches step 1 off to compare with the old edge spawns.

The code is in `source/space.js`. Its design is in `ICARUS_DESIGN.md` Appendix B (B1.18, B1.20); it stays in the demo under the 2026-10-30 design.

## Flight log

**SAVE FLIGHT LOG** in the pause menu (Esc) and on the end-of-run screen downloads a JSON record of the run so far: each flight's launch, dive and air samples (10 per second in the air, 20 underwater) with inputs, positions, every enemy and pursuer, plus kills, hits, banks, wave results and shop actions. It only observes and does not change the game (`source/flightlog.js`).

## Source and checks

`node source/build.cjs` rebuilds the self-contained HTML.

Headless suites (all pass on this build):

| Script | Covers |
|---|---|
| `qa/five-score.cjs` | Scoring rules, every charm, bails, busts, techniques, monotonic draws (16 groups, 18,821 assertions) |
| `qa/five-combat.cjs` | Combat items |
| `qa/scoreboard.cjs` | Score cues match the bank, including bails and busts |
| `qa/shop.cjs`, `qa/shop-ui.cjs`, `qa/weapon-shop.cjs` | Shop transactions, offer rules, rarity, previews |
| `qa/flightlog-metrics.cjs` | Reads saved flight logs and prints the playtest metrics (kills and time by phase, nearest enemy, off-screen share, hits, launch spread, tricks landed) |
| `qa/flightlog-bot.cjs` | Plays the flow-study bot runs, saves their flight logs and checks the metrics reproduce the study's baseline |
| `qa/scoring-mechanics.cjs`, `qa/combat-integration.cjs`, `qa/score-stress.cjs` | Overtime, bosses, busts freezing combat, item hooks, CPU stress |

Browser suites need Playwright: `qa/scoreboard-browser.cjs` (4 of 4 pass) and `qa/product-review.cjs --browser --round=S4` (8 of 8 runtime, 10 of 11 browser). The failing browser check is the 15-second rendered stress test, which reaches about 4.5 s of simulated air in this container's software-GL Chromium. The previous build measures the same once its renderer crash is fixed, so this is the environment, not a regression.

Bot trials (`qa/scoring-progression.cjs`, `--focused`, `qa/scoring-styles.cjs`) write `reviews/S4-*.json`. They are scripted policies, not players.

## Known balance state (to tune)

- Waves 1–4 are close (1.1–4× quota for bots); waves 5–12 are too easy for a strong machine (5–40×).
- Wave 17 is a wall: bots bust repeatedly and miss quota. Bots in the previous build also died around wave 17.
- The Sonic starter and close-range low launches remain weak, and the ascent charm package underperforms.
- Quota curve, bust fall speed and revive HP are tuning values (`[TUNE]` in the design doc).

Device performance, human learning time and enjoyment are not established by these checks.

# ICARUS — animated chips × mult scoreboard

Open **ICARUS-demo.html** in a browser. This is a separate presentation test based on the five-trick score-attack demo. It uses that version's kills × mult scoring, score quotas, weapons, shops and movement.

Hold **W / Up** underwater to carve, then release to launch. **Space** boosts. **W A S D / arrows** steer in the air; weapons fire automatically. **Esc** pauses.

## What to test

- The top-centre scoreboard is the main visual focal point: blue chips, pink mult, gold flight score.
- Real kills send a blue addition toward chips; the number counts up, enlarges and shakes locally.
- Completed trick segments reveal their mult additions. New matching combinations receive a stronger pulse and named cue.
- At water entry, remaining guaranteed tricks, Lucky effects and active charms count through in order. A larger gold animation banks the exact final payout and fills the wave target bar.
- Short flights still receive every drawn trick. The animation does not add scoring requirements.
- Repeated rapid kills are visually grouped without losing chip value. Floating additions are capped at16 and sound ticks are rate-limited.
- The scoreboard has a compact landscape-phone layout. Reduced-motion preference removes vibration/flying additions; mute remains available through the game.

The airborne score is a progressively revealed presentation of the hand; the authoritative payout still resolves through the original bank calculation. This test changes how scoring is shown, not weapon damage or scoring odds. Whether it feels satisfying needs your playtest.

## Source and checks

`node source/build.cjs` rebuilds the self-contained HTML.

`node qa/scoreboard.cjs` checks exact cue totals, short-flight completion, Lucky/charms/Gold,1000 draw/upgrade cases, and original-versus-edited first-wave parity for three movement/weapon policies.

`node qa/five-score.cjs` runs the original14-group/18,083-assertion scoring reference suite.

`node qa/scoreboard-browser.cjs` checks actual keyboard launch, real automatic kill feedback, landing bank animation, landscape layout and reduced motion. It currently names the bundled Playwright dependency on this machine. Chromium needs permission to launch outside the macOS sandbox here.

Current reports and actual rendered screenshots are in **reviews/**. Earlier browser failures are preserved: an initial fixture timeout/navigation timeout, then the discovered phone timer overlap. The final version moves the timer clear of the board and keeps it inside the playfield. It also places floating additions outside the board's transformed coordinate system and clears stale labels between runs.

The source demo, prior score-attack output and combat fork remain unchanged; **release.json** records their hashes. Device performance, full-run balance and human satisfaction are not established by these presentation checks.

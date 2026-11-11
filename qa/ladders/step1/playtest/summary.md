# ICARUS playtest — flight — PASS

- **Ran:** `node scripts/playtest.mjs --mode flight --seconds 14 --keys d:9000 --shots 2,5,8,11 --out qa/ladders/step1/playtest`
- **Build:** `ICARUS-demo.html` (automation version scoreboard-S3)
- **When:** 2026-11-10T06:39:13.798Z (84.9 s wall time)
- **Screenshots:** `qa/ladders/step1/playtest`

## What happened, in plain English

A real flight happened. The run started in the water, the dolphin carved up and broke the surface about 27.1 s after the run began. It climbed to roughly 29.24 m above the water (the top of the arc was captured at 29.18 m) and came back down into the water about 19.0 s after the breach.

## The flight, in numbers

- Launch: yes, about 27.1 s after the run started
- Highest point of the arc: 29.24 m above the surface
- Apex seen: 29.18 m at about 10.3 s into the air
- Back in the water: yes, about 19.0 s after the breach

## State snapshots (bounded)

- First: game time 0.35s, water, wave 1, score 0, HP 100, 0 enemies, level 0
- Last: game time 9.25s, air, wave 1, score 0, HP 100, 4 enemies, level 0

## Screenshots

- `qa/ladders/step1/playtest/01-breach.png` — the moment the dolphin breaks the surface (brightness 23.9/255, 265 colours)
- `qa/ladders/step1/playtest/02-ascent.png` — the dolphin climbing through the air (brightness 25.9/255, 227 colours)
- `qa/ladders/step1/playtest/03-apex.png` — the top of the flight arc (brightness 27.1/255, 247 colours)
- `qa/ladders/step1/playtest/04-landing.png` — the dolphin back in the water after the flight (brightness 22.5/255, 307 colours)
- `qa/ladders/step1/playtest/05-t2s.png` — the screen at 2s (brightness 22.5/255, 273 colours)
- `qa/ladders/step1/playtest/06-t5s.png` — the screen at 5s (brightness 22.7/255, 281 colours)
- `qa/ladders/step1/playtest/07-t8s.png` — the screen at 8s (brightness 23/255, 258 colours)
- `qa/ladders/step1/playtest/08-t11s.png` — the screen at 11s (brightness 23.4/255, 275 colours)

## Checks

- PASS: the build opened over file:// — ICARUS-demo.html, automation version scoreboard-S3
- PASS: game canvas is present and sized — 1440x810
- PASS: the game started — mode playing, wave 1, weapon tuna_gaff
- PASS: in-game HUD is visible — #score-hero shown
- PASS: screenshot breach shows content — qa/ladders/step1/playtest/01-breach.png: mean brightness 23.9/255, 265 colours
- PASS: screenshot ascent shows content — qa/ladders/step1/playtest/02-ascent.png: mean brightness 25.9/255, 227 colours
- PASS: screenshot apex shows content — qa/ladders/step1/playtest/03-apex.png: mean brightness 27.1/255, 247 colours
- PASS: screenshot landing shows content — qa/ladders/step1/playtest/04-landing.png: mean brightness 22.5/255, 307 colours
- PASS: a launch happened — left the water at about 27.1 s
- PASS: the dolphin reached an apex — about 29.18 m above the surface
- PASS: the dolphin returned to the water — landed at about 19.0 s after the breach
- PASS: screenshot t2s shows content — qa/ladders/step1/playtest/05-t2s.png: mean brightness 22.5/255, 273 colours
- PASS: screenshot t5s shows content — qa/ladders/step1/playtest/06-t5s.png: mean brightness 22.7/255, 281 colours
- PASS: screenshot t8s shows content — qa/ladders/step1/playtest/07-t8s.png: mean brightness 23/255, 258 colours
- PASS: screenshot t11s shows content — qa/ladders/step1/playtest/08-t11s.png: mean brightness 23.4/255, 275 colours
- PASS: no page errors — the page threw nothing while it ran

## Errors

- None seen.

## What this cannot tell you

A screenshot can show that the game renders, that a run starts, that a flight happens and that the shop is drawn. It cannot tell you whether the game is **fun**, whether the difficulty is **fair**, or whether the controls **feel** right. Those need the human playtest gate — the owner holding the controls and judging it himself.

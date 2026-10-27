# Flow study (2026-10-26)

**[icarus-flow-study.html](icarus-flow-study.html)** is a self-contained visual report of how a flight actually unfolds in the demo. It covers the dive/air timings per launch style, where enemies and the dolphin sit in the arena, filmstrips of real rendered flights, per-flight maps, and when kills happen. Its findings are summarised in [`../GAME_MAP.md`](../GAME_MAP.md).

- **Data:** 291 flights by the test bot (`qa/bot.cjs`) on the S4 demo, with four launch styles and seed 7. The bot is not a player; the report's first section lists the limits.
- **Not committed:** the raw flight data (`flights.json`, about 4 MB) and the screenshots. The screenshots are embedded in the report, and both can be regenerated as below.

## Regenerate

Run from an empty work directory outside the repo. The scripts find the repo from their own location and use the built `ICARUS-demo.html`. You need Node, Playwright with Chromium, and Python 3 with Pillow.

```sh
S=<repo>/docs/flow-study/scripts
node $S/telemetry.cjs flights.json     # headless bot runs, flights logged at 10 Hz (~25 s)
python3 $S/agg.py                      # medians per style and wave band -> agg.json
python3 $S/maps.py                     # SVG flight maps -> maps.json
python3 $S/prepare.py                  # study.html (demo + input hook) and bot-browser.js
mkdir -p shots && node $S/capture.cjs shots   # browser filmstrips (~12 min with software GL)
python3 $S/report.py                   # -> icarus-flow-study.html
```

On 2026-10-26, rerunning `telemetry.cjs` on the current build reproduced the original flight data exactly, and `report.py` reproduced the committed report byte for byte from the same screenshots.

**Corrected 2026-10-27:** the first report assumed a 57 m view and said 58% of enemies were off-screen. The view is really 76.8 m wide, because the game locks the view to the arena and letterboxes 16:9, so 18% are off-screen. The report and its scripts were corrected and regenerated.

`bot-baseline-metrics.json` is the same baseline measured from real flight logs by `qa/flightlog-metrics.cjs`; `qa/flightlog-bot.cjs` regenerates it and checks it against the study.

For real play data, use **SAVE FLIGHT LOG** in the demo (pause menu or end-of-run screen); see `source/flightlog.js`.

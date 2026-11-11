# Legacy suites

Moved here on 2026-11-12. These test earlier prototypes (the October "S4" hands, quota, charms and shop, and the old weapon classes). `qa/load.cjs` pins most of them to old settings, so a pass says nothing about how the game plays by default today.

They gate nothing. `node qa/gate.cjs` is the gate. Run one of these only when you are deliberately checking that an old mode still works, from the repo root: `node qa/legacy/<name>.cjs`.

`placement.cjs` already failed to start before the move (it names weapon classes the armoury replaced). `scoreboard-browser.cjs` and `product-review.cjs` need Playwright's Chromium.

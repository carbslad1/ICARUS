> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# KILL LAYER LAB — build spec (v1, 8 Nov 2026)

A standalone, self-contained HTML **design toy** that proves one thesis: in a bullet heaven, a
player-arranged rack of modifiers can resolve on **every kill**, visibly, and the order you set in
the shop is felt every second of combat. This is not a game build and touches no ICARUS source.

Deliverable path: `docs/kill-layer/kill-layer-lab.html` (single file, no dependencies, opens from
`file://`). Plus `docs/kill-layer/LAB_NOTES.md` and screenshots in `docs/kill-layer/shots/`.
Nothing outside `docs/kill-layer/` may be created or edited.

---

## 1. The one idea

A kill is a **hand you play automatically**. The rack is the joker row. The kill produces a number —
the **CHAIN** — and the rack either grows it (sources) or spends it (sinks). **Order = routing**:
whichever sink comes first gets fed, and whatever is left at the end of the row becomes the wave's
bank.

- Sources **build** chain from what the kill is made of (overkill, big HP, family, kill pace, HP state).
- Sinks **spend** chain on the three things a run needs: **killing more (echo), surviving (barrier),
  and growing (pearls)**.
- The survival curve changes what kills are made of: early enemies die in one shot (overkill-rich),
  late enemies are tanky (HP-rich) and arrive in crowds (pace-rich). **So the fuel changes, and the
  order that was right stops being right.** That is the build decision.

The authored payoff: your order is a machine that runs ~4 times a second, and every wave the report
tells you what it made, where the chain went, and what a different order would have made instead.

## 2. Resolution rules (exact)

Every kill opens a packet:

```
packet = { chain: 1, maxHP, over: overkill (damage beyond hp), family, dtGap: seconds since last kill,
           hp: player HP fraction, depth: 0, source: 'gun'|'echo' }
```

Then slots resolve **strictly left to right, exactly once** (unless a retrigger/copy item says
otherwise). A slot is a **source** (mutates chain) or a **sink** (spends chain) or an **order** item.

```
for i in 0..5:
  slot = rack[i]
  if slot is empty: continue
  if slot is source:  chain = source.apply(chain, packet, state)
  if slot is sink:    take = min(chain, sink.max); do = floor(take / sink.per)
                      effect(do); chain -= do * sink.per      // remainder stays in chain
after the row: well += chain * 0.25                          // default bank tax: chain → pearls, 4:1
```

- Chain is a float internally, displayed as a whole number.
- Echoes: sink spends chain and emits **echo hits** (see §4). An echo that kills opens a **new
  packet** at `depth+1` and the rack resolves it again. Cascade cap: depth 8, and 40 echo events
  per second globally.
- Keystone: "the next slot resolves twice." Mirror: "copy the value the previous slot produced"
  (i.e. resolve the previous slot's rule again, immediately). Prism: ×2 chain.
- A sink with nothing to spend flashes **hollow** — the visible stall.

## 3. Items (17; exact numbers are the builder's to tune ±30%, structure is fixed)

Sources (kind S):

| # | Name | Glyph | Rule |
|---|---|---|---|
| 1 | Sonar | ◉ | +1 chain |
| 2 | Undertow | ⇊ | ×2 chain |
| 3 | Prism | ◆ | ×2 chain (Rare, expensive) |
| 4 | Harpoon's Gift | ⚔ | Overkill → chain: `+ min(3, floor(over / (maxHP*0.5)))` |
| 5 | Big Game | ⛰ | Tanky kills → chain: `+ min(3, floor(maxHP / (10 + wave)))` |
| 6 | Fruit Bloom | ❋ | Fruit kills: +1 chain |
| 7 | Bell Bloom | ♪ | Bell kills: +2 chain |
| 8 | Follow-Through | » | If `dtGap ≤ 0.6`: +2 chain (crowd pace) |
| 9 | Overflow | △ | If chain ≥ 4 at this point: +2 chain |
| 10 | Safe Water | ♥ | While HP ≥ 75%: +1 chain |
| 11 | Keystone | ⌂ | Order: the next slot resolves twice |
| 12 | Mirror | ◫ | Order: resolve the previous slot again |

Sinks (kind K):

| # | Name | Glyph | Rule |
|---|---|---|---|
| 13 | Cleave | ✦ | 2 chain → 1 echo |
| 14 | Gale | ≋ | 1 chain → 1 weak echo (25% damage) + pushes the target 60 px away |
| 15 | Kelp | ❦ | 3 chain → 1 barrier point (max 5) |
| 16 | Ballast | ◈ | 1 chain → 1 pearl now |
| 17 | Vault | ⬓ | 2 chain → 1 pearl **banked at wave end** (deferred, better rate) |

Rarity loosely: Common (Sonar, Harpoon's Gift, Fruit Bloom, Follow-Through, Safe Water, Ballast,
Cleave), Uncommon (Undertow, Big Game, Bell Bloom, Overflow, Kelp, Gale, Keystone), Rare (Prism,
Mirror, Vault). Shop price 8/14/22. Sell at half.

## 4. Combat shell (keep it simple, make the layer the star)

- Side-on 1280×720 canvas, letterboxed; dark teal; vector shapes only (dolphin triangle-ish, enemy
  circles with family colours). No images, no fonts to load.
- Player: WASD/arrows, 220 px/s. 100 HP. Contact from an enemy costs 7 HP, 0.6 s invulnerability.
  Barrier absorbs 6 HP per point before HP.
- Two auto-guns: damage 5, 0.45 s cooldown, 600 px range, target nearest; shots are lines.
  Shop upgrade: +1 damage for 12 pearls (+2 cost each time).
- Enemies spawn at the edges and chase. Families: **Fruit** (weight 60, ×1 HP), **Bell** (20, ×1.3),
  **Chest** (16, ×2, slower), **Seven** (4, ×1.5). Colours distinct; family glyph on the body.
- Survival curve: 20 waves; length `20 + 2*(wave-1)` s (cap 48); HP `6 * 1.19^(wave-1)`;
  spawn rate `1.2 + 0.55*(wave-1)` per s (cap 10). Wave clear pays `5 + wave` pearls.
- Echo: 40% of the killed enemy's **max HP** as damage to the nearest enemy; ×0.8 per cascade depth.
- Shop between waves: rack (6 slots, drag to reorder, always free), bench (6), 3 offers + reroll (5),
  heal 30 HP for 15, gun upgrade. Owned items can be sold.
- Death = 0 HP → run over card. Clear wave 20 = win.

## 5. The feel contract (this is the point of the toy — do not cut)

1. **Every kill resolves visibly.** A receipt: the 6 slot glyphs appear at the kill point as a
   horizontal row, staged ~35 ms apart, rise and fade over ~0.4 s. Each glyph pulses in proportion
   to what it did; a sink glyph shows what it took. The chain total appears once, at the row's end.
   Cap concurrent receipts (~24) so 60 fps holds.
2. **The chain travels.** An echo draws the row of glyphs moving from the dying enemy to its target
   over ~0.12 s, then the impact. A cascade is a visible chain of rows crossing the horde.
3. **The rack is always on screen** (bottom-left, 6 slots). During every receipt the slots light in
   their order; slots that skipped (condition failed, empty, no chain to spend) stay hollow. That
   row *is* the attribution — you read it in rhythm, not as text.
4. **Audio carries the order.** One pentatonic note per slot index, played left to right per receipt,
   rate-limited to ~8 receipts/s; sinks get a different timbre. Mute button, on by default, audio
   starts on the first click (browser policy). If audio threatens the schedule, ship it silent and
   say so in LAB_NOTES.md.
5. **Numbers are aggregated, not per-step.** Only the chain total per receipt, plus HUD counters.
   Never a text log in combat.

## 6. The evidence screens (the toy must be able to settle design arguments)

**Wave report (in the shop, after every wave).**
- Per slot: fires, chain added, chain spent, output produced (echoes/barrier/pearls), and a one-line
  "what it did" — this is the attribution table.
- **The fuel mix:** share of chain that came from overkill / big HP / family / pace / HP state. This
  is how the designer sees the curve changing the engine.
- **Order comparison.** Re-run the *same wave* (same seed, same scripted dodging pilot, same rack,
  same upgrades) for many permutations of the rack and report: your order's percentile, best order,
  worst order, and the **spread** (best − worst, %). 720 permutations is ideal; if too slow, do 120
  random + greedy local search, chunked with a progress bar so the page never freezes. The sim must
  be a pure function so this is honest.
- A **REPLAY** button: watch "your order" and "best order" side by side for a wave (optional if
  time is short; it is the most convincing single artifact if you can fit it).

**Run-over card.** Total kills, echoes, pearls, per-slot all-run contribution, the wave you died on,
and the best order found for that wave.

**Expose `window.KILLLAB`** for automated checks:
```
KILLLAB.simulate({wave, rack, seed, upgrades, maxSeconds}) -> {kills, echoes, pearls, barrierUsed,
  hpLeft, waveEnded, perSlot:[...], fuel:{overkill, bigHP, family, pace, safe}, chainAvg}
KILLLAB.permutations({wave, rack, ...}) -> {tested, spreadPct, best:[...], worst:[...], yoursPct}
KILLLAB.state() -> snapshot
```
The pilot used by `simulate` must be deterministic (simple: keep ~180 px from the nearest enemy,
circle-strafe, always within the arena). `simulate` must run with no rendering at 20–30 Hz steps.

## 7. Acceptance checks (the builder must run these and report real output)

1. Page loads from `file://` with no console errors; title → BEGIN.
2. Play wave 1 with an empty rack, then with 3 sources + Cleave; kills/s rises and receipts appear.
3. Reorder the same 6 items two ways in the shop; the order comparison reports a spread > 10% for at
   least one wave and shows your percentile. **If ordering never changes the outcome, the toy has
   failed its thesis — report that honestly rather than tuning the report.**
4. Cascade: with Cleave early, a single kill can kill ≥ 3 enemies through echoes at wave 3.
5. 60 fps at wave 15 with ≥ 30 enemies (measure with the debug panel).
6. Screenshots saved: title, combat with receipts + rack row lit, shop wave report, run-over card.
   Use the repo's Playwright (`require('/Users/johncarbone/Projects/icarus-slots/node_modules/playwright')`)
   from a small script inside `docs/kill-layer/`; do not install anything.

## 8. Honesty notes for LAB_NOTES.md

State plainly: this is a toy with invented numbers; the guns, HP curve and spawn rates approximate
Brotato, not ICARUS; what it proves is the *mechanism and legibility*, not the balance. List what was
simulated vs faked, the measured spread numbers, and every check that did not pass.

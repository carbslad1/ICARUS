> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# Code notes: how a kill resolves today, and where a kill layer hooks in

**Scope:** `~/Projects/icarus-slots` worktree (uncommitted work; `source/` and `qa/` read-only for this study).
Build: `build.json` says built **2026-11-07T06:38Z**; `docs/kill-layer/LAB_SPEC.md` (8 Nov) is the standalone
toy spec and explicitly "touches no ICARUS source", so every point below is archaeology for a **later demo branch**,
not a change to the toy.

**How to read:** `[M]` = measured now or from a saved run in this repo; `[A]` = assumed / quoted from docs.
Trust order is the repo's own (`docs/GAME_MAP.md:13`): code beats docs, docs beat memory.
Paths are relative to the repo root.

---

## 1. The kill path (exact, with ordering)

The only weapon-kill path is `damage()` in `source/demo.js:169-179`; the only other kill source is
stomp/touch (`source/demo.js:447`, verb code gated off by default). `grep 'r\\.kills++' source/*.js` returns
exactly those two sites.

Sequence inside `damage()`:

| # | Line | What runs |
|---|---|---|
| 1 | `demo.js:170` | guard: `mode==='playing'`, `medium.kind==='air'`, not `r.armed` (clock out), `!hand.busted`, `r.enemies.includes(e)`, `e.hp>0` |
| 2 | `demo.js:171` | `ctx` = caller ctx or `r.demo.currentAttack` or a bare `{primary:false,weapon,base:amount}`, plus `beforeHP:e.hp, amount` |
| 3 | `demo.js:172` | `amount = FiveCombat.beforeDamage(...)` (**no-op today**, `five-combat.js:50`) → `e.hp -= amount` → `ctx.amount`, `ctx.killed`, `applied = min(beforeHP, amount)` → `Slots.dealt(r, applied, ctx)` → wave telemetry `primaryApplied`/`secondaryApplied` → push `{kind:'damage', ...}` event |
| 4 | `demo.js:173` | if `e.hp > 0`: knockback, `FiveCombat.afterDamage(...)`, **return** |
| 5 | `demo.js:174` | **kill**: remove enemy from `r.enemies`; `r.kills++`, `r.flightKills++`, `r.wkill += e.kv`, `r.waveKills++` |
| 6 | `demo.js:176` | splitter breaks into two swarmers **before any hook** (so a kill layer already sees the children) |
| 7 | `demo.js:177` | boss flag; **`Slots.kill(r,e)`** → **`recordKill(r,e,ctx)`** → **`FiveCombat.afterDamage(r,e,ctx)`** |
| 8 | `demo.js:178` | `Oxedrop(...)` (XP orb drop) → push the `{kind:'kill', pos, enemy:e.kind, weapon, value:e.kv}` event — **last** |

Consequences that matter for a hook:

- At step 7 the enemy is already **dead and out of `r.enemies`**; counters are already incremented.
- `FiveCombat.afterDamage` can itself deal **secondary damage** which re-enters `damage()` and runs the whole
  kill branch nested (`five-combat.js:51-68`; configured at `demo.js:439`). Those nested kills call
  `recordKill`/`afterDamage` **before** the parent's `Oxedrop` and parent `kill` event at line 178. A kill layer
  that adds echo damage must track `depth` explicitly or it will recurse.
- `damage()` early-returns while `r.armed` (clock expired) and while `hand.busted`, so the kill layer inherits
  the "clock out = no kills" rule for free.
- `recordKill` is also where the **only current per-kill record** is built (`demo.js:101-110`):
  - `t = h.activeAir`, `ph = phase(r)` (`demo.js:86`, apex ±10% of `pred.air`)
  - step-4 branch (`tune.rules`): `h.K++`, `h.phaseChips[ph]++`, `ScoreCues.chips(r,1,...)`, push
    `{t,phase,kv:1,bonus:0,weaponType,primary,attackId,crit}` — **one chip per kill, no bonuses** (`demo.js:104`).
  - S4 branch: multi-kill/apex/crit bonus chips (`FiveScore.chipBonus`, `five-score.js:28`), then the same
    `h.kills` record plus `above`, `opening`, `late`, `entry` (`demo.js:109`).
- **This record has no overkill, no maxHP, no family and no time-since-last-kill.** Those four packet fields do
  not exist anywhere at kill time today (see §3).

Other kill-adjacent hooks already wired: `Slots.kill(r,e)` (`slots.js:168-172`, charges from `e.fam` value and
counts kills), `ScoreCues.chips` (`score-cues.js:17-19`, emits a `scorecue` event), and `Oxedrop` (engine own).
There is **no generic event bus**; `r.events` is cleared at the top of every sim tick (`demo.js:499`) and
consumed by renderer wrappers (`demo.js:621-628`).

## 2. State available at kill time

**Enemy `e`** (fields set by the v3 engine and the demo):

- `id`, `kind` (18-name roster, bundle `Obnm`: `baby_alien, chaser, charger, spitter, fly, helmet_alien,
  fin_alien, bruiser, horned_bruiser, horned_charger, pursuer, healer, buffer, spawner, junkie, slasher_egg,
  tentacle, looter`), `role` (`'boss'`), `hp` (≤0 here), **`maxHp`** (set by `Ospw`, equal to `hp` at spawn;
  boss at `demo.js:203`), **`kv`** (kill value; engine wrapper sets `Obt[kind][2] * Oq.kv`; boss `kv:25`,
  `demo.js:203`; observed values in the bundle are `1`, `10`, `25`), `radius`, `pos` (**arena-local**), `px/py`
  world, `velocity`, `dmg`, `tint`, `age`, `seed`.
- **`e.fam` does NOT exist in the shipped demo.** It is assigned only by the Core Loop lab
  (`source/core.js:45-48`, weights Fruit/Bell/Chest/Seven). A "family" source therefore needs either a mapping
  from `e.kind` or a `fam` added at spawn (Core lab already shows the pattern; it also forces `kind:'chaser'`).
  **This is the single biggest packet gap.** `[M]` for absence, `[A]` for the mapping choice.

**Attack `ctx`** (`demo.js:171,224,241`): `primary` (true for gun attacks; false for FiveCombat secondary damage),
`attackId` (`++r.demo.attackSeq`, monotonic per gun attack), `weapon` (weapon id or `item-I0x` for secondaries),
`slot` (weapon index), `base` (uncritted weapon damage), `crit`, `boost` (`Slots.damageFactor`, 1 when slots off),
`beforeHP`, `amount`, `killed`, and `item` for FiveCombat secondaries. Shots copy the ctx at fire time
(`demo.js:241`), so `ctx` survives travel.

Derived at kill time: **overkill = `max(0, ctx.amount - ctx.beforeHP)`** — the exact formula `FiveCombat`
already uses for its reservoir item (`five-combat.js:55`); `applied = min(ctx.beforeHP, ctx.amount)`
(`demo.js:172`).

**Player / flight `r`:** `mode`, `wave`, `hp`, `stats.maxHp`, `stats.damage/fireRate/…`, `time`, `budget`
(air clock left), `armed` (clock out), `medium.kind/local/origin`, `kills`, `flightKills`, `waveKills`, `wkill`,
`metrics.peakEnemies`; lab: `r.demo.air` (air seconds this wave), `r.demo.streak`, `r.demo.bossDefeated`,
`r.demo.waveTelemetry.{primaryApplied,secondaryApplied,damageTaken,hits,lastHits}` (created in `wave()`,
`demo.js:127-133`).

**Flight/hand:** `r.hand` (`demo.js:138-139`): `n`, `open`, `K`, `M/mult`, `drawn`, `slots`, `pred.{air,apex,…}`,
`launch.angle/speed`, `air`, `activeAir`, `peak`, `dist`, `hits`, `hpLost`, `phaseChips`, `bonus`, `bails`,
`busted`, `attackKills`, `maxMulti`, `kills[]` (the per-kill records above), `itemStart`.
`phase(r)` = `ascent | apex | descent`.

**Timing:** `h.activeAir` is advanced at `demo.js:277` before firing/combat each tick, so a kill's `t` is exact
to the tick. There is **no `dtGap` today**; add e.g. `r.demo.kill.lastT` (per run or per wave) in the hook.
**Depth** only exists on a call stack; add it as an argument.

**Kill values in the wild:** ordinary `e.kv` (1 or 10 per kind), boss 25, Core lab forces 1 (`core.js:48`).
`r.wkill` sums `e.kv`, so wave kill counters disagree with `h.K` (`h.K` is +1 per kill under `tune.rules`).

---

## 3. Current scoring: what the layer would replace

Two live scoring modes behind `DEMO.tune.rules` (`demo.js:18`):

**A. Step-4 style score (default, `tune.rules=1`)** — `style()` `demo.js:150-157`:
`score = kills × h.mult × streak`, one bank at splashdown, pearls `round(tune.payK=3 × √score)`;
`h.mult` is 1 until a trick layer feeds it and there is no per-kill score beyond "one chip each" (`demo.js:104`).
Streak caps at `tune.streakCap` (5 default), resets on a hit, survives the shop.

**B. S4 trick/charms score (`tune.rules=0`)** — `bank()` `demo.js:158-168` calls
`FiveScore.evaluate(state, hand, ledger, charmRow, rng)`:
- tricks are drawn reels (`FiveScore.draw`, `five-score.js:86-94`), combos pay (+mult), charms run
  **in array order, once, left to right** (`five-score.js:170-213`; each step `mult=(mult+add)*factor` at
  `five-score.js:211`); techniques (gold/lucky/echo), memoised previews and bank keys (`five-score.js:142-143,
  221-228`); final `score = round(chips × mult)` (`five-score.js:219`), bust pays half only with N14.
- The player arranges the **charm row** in the shop (`charmLeft` `demo.js:427`, UI `shop.js:79,108`), and the
  trick/odds/routine upgrades are shop purchases; charms are added from the shelf (charm row is separate from
  the 5-slot phase engine).

**C. Phase-slot engine (`source/slots.js`, behind `tune.slots && tune.rules`, `slots.js:18`)** — the closest
precedent for a kill layer, and the thing most likely to be deleted:
- 5 slots fire once per flight in order: `breach, ascent (½ up), apex, descent (½ down), entry`
  (`slots.js:15,121`), active from `breach()` (`slots.js:133-141`) at `open()` (`demo.js:142`), ticked each air
  step (`slots.js:150-155`, called `demo.js:277`), closed by `entry()` (`slots.js:157-167`, called `demo.js:488`).
- Each item's `run(f)` mutates `f.C` (Charge) and/or `f.M` (Mult) or carries state (`slots.js:37-79`).
  Charge starts at 0 and gains **+1/air-second** (`slots.js:152`); Discharge spends all Charge for
  `+100% × Mult` damage for `Charge ÷ 10 s` (`slots.js:21-29`); the weapon damage multiplier is `1 + boost`
  (`slots.js:142-148`) applied at `fire` (`demo.js:223`).
- **Ordering semantics:** strictly left to right, each slot once. Keystone retriggers the *next* slot
  (`slots.js:61,124-125`); Mirror re-runs the previous slot's rule immediately (`slots.js:60`); Inversion swaps
  C/M. The launch angle gates conditional items (`slots.js:40,50,51,54`). "Later slots read more of the flight,
  so gain charms want to be late, Mult wants to be early" (`docs/CORE_LOOP.md:20`, `[M]` for the engine,
  `[A]` for the design claim).
- The player arranges in the **shop only**: `Slots.move` (`slots.js:96-102`), bench 4 (`slots.js:14`),
  `add/sell` (`slots.js:91-107`), reached via `DEMO.command('slotMove'|'slotSell')` (`demo.js:403-404`, guarded
  to `mode==='shop'` at `demo.js:395`), UI `shop.js:90-94` + click handlers `shop.js:111-113`.
- `Slots.kill(r,e)` (`slots.js:168-172`) is called at `demo.js:177`: the existing per-kill hook. It only sees
  `(r, e)` — no ctx, no amount, no overkill.
- Bookkeeping: `state(r)` lazily creates `r.demo.sl` (`slots.js:83-87`); `wave()` resets per-wave values
  (`slots.js:111-118`); telemetry `freshTele()` tracks air/kills/orbs/boosted/damage/bonus/fired/wasted
  (`slots.js:82`) and `dealt()` splits the boosted share of applied damage (`slots.js:174-177`), which is how
  the overkill numbers in §4 were produced.

**FiveCombat items (legacy combat layer)** are the one existing "items do something in combat" precedent and
they *do* deal secondary damage (`five-combat.js:51-68`: reservoir overkill→burst, apex lens, pair echo), i.e.
they violate the "items never attack" rule; the demo hides them whenever the slots layer is on — the shelf offers
`slot` when `Slots.on` else `gear` (`demo.js:350`). A new kill layer should not use that pattern; echoes should be
implemented as chain sinks that call `damage()` with a tag (fresh `attackId`, `primary:false`-style context).

---

## 4. The measured numbers the design must respect

**Rule checks (run now on this worktree) `[M]`:**

- `node qa/core.cjs` → `all passed`, 14/14, 0.50 s (Surge/arrangement/fire-rate/hoard/pounce/reset + a flown
  wave; `qa/core.cjs:27-41`).
- `node qa/slots.cjs` (rules + shop, not `--combat`) → `all passed`, 26/26, a few seconds
  (`qa/slots.cjs:41-64`); this includes the exact "lone Discharge = 7.5% of the flight at every angle" and
  "move it to the apex / swap / bench / sell half" checks.

**Combat rates — saved run of `node qa/slots.cjs --combat`, 6 Nov (`reviews/slots-combat.json`, 81 rows =
9 weapons × waves 5/10/15 × angles 20/45/75; tier guessed from wave; dolphin unkillable) `[M]`:**

| Metric (no items baseline, `none`) | Overall mean | Range |
|---|---|---|
| kills / air-second | **3.78** | 1.12 – 6.15 |
| orbs / air-second | **3.03** | 0.12 – 5.59 |
| **overkill share** (`1 − applied/fired`) | **36.8%** | 9.8% – 77.6% |

By weapon (baseline overkill / kills per air-s; landed "+Mult 4 & volley" gain):
flak 14.7% / 4.57 / +11%; sonic 19.5% / 3.28 / +14%; minigun 23.5% / 1.72 / +11%; arc 29.9% / 3.90 / +10%;
fin 33.3% / 4.70 / +14%; rocket 34.2% / 4.68 / +14%; laser 56.6% / 2.85 / +9%; harpoon 59.3% / 3.37 / +11%;
depth 60.0% / 4.93 / +7%. By wave: wave 5 → 2.57 kills/s, **48.1%** overkill; wave 10 → 4.16, 30.3%;
wave 15 → 4.60, 31.9%. **So early kills are overkill-rich and late kills are HP-rich, exactly the LAB_SPEC
fuel-shift thesis** — but note the confound that wave also sets gun tier here `[A]`.

These agree with the design doc's measured claims `[M in docs, re-derived above]`:
`docs/SLOT_ITEMS.md:40-48` — lone Discharge fired +6-10% damage (modelled 7.5%), Mult 4 fired +20-40%, but only
+7-14% landed because "most of that is lost to overkill"; kills limited by spawns (3-7/s with six guns, ±0-2%);
"real rates are about 3.8 kills and 3 orbs per air second, not 0.5 and 0.3" (items were rescaled by that ratio);
a Mult 4 Discharge at wave 3 is +400% for only 0.3 s.

**Crowd (enemies on screen) `[M from saved grid runs + docs]`:** `reviews/core-surge-0.5-60.json` (75 cells,
50% spawns, 2 seeds): mean peak **12.4**, max peak **29**, mean end crowd 4.6, mean crowd by quarter
3.2 / 5.6 / 4.7 / 4.9, peak at 53% of the wave. At 100% spawns (`core-surge-1-60.json`) mean peak **42.4**,
max **100**. `docs/CORE_LOOP.md:65-92` (measured, 2 seeds): wave 10 peak 55 no charms / 15 with; wave 15 65/18;
wave 20 27/17; 46 of 75 cells pass the arc bands; bands are peak ≤ 25 (target 20, not yet set), middle 25-80%,
broke end ≤ max(4, peak/3), each phase ≥ 10% kills (`CORE_LOOP.md:54-59`).

**HP / damage curves `[M in docs]`:** enemy HP is Brotato's health curve × `OwB.hp`; per-zone growth in
`BRO` (`demo.js:30-34`, wave 1 unchanged); player HP 100 + Max HP stat (`demo.js:115-117`); one hit takes
~64 HP at wave 10 and ~94 at wave 15 under Brotato hits (`CORE_LOOP.md:111-125` — that table is the playtest
measurement that led to the 5 HP lab default). Player kill counts are spawn-capped, not damage-capped
(`SLOT_ITEMS.md:44`), so any chain that scales with damage will grow faster than the crowd it is paid for
unless sinks are rate-limited.

**Known-failing suites on the 2026-11-08 worktree:** `qa/enemy-sandbox.cjs --gate` and `qa/flightlog-bot.cjs`
fail on this build — **reported by the balance-pass skill, NOT re-run here** `[A]` (both are multi-second/whole-
run suites; `qa/flightlog-bot.cjs:1-9` replays four flow-study runs and compares to the 2026-10-26 baseline).
`build.json` was built 2026-11-07T06:38Z and `git status` shows `source/demo.js`, `source/shop.js`,
`source/loadout.js`, `qa/load.cjs` and others modified, so "the 2026-11-08 build" is this uncommitted worktree,
not `build.json`'s output. Do not read a green `qa/core.cjs` as a green tree.

---

## 5. Integration plan for a `KillLayer.resolve(r, e, ctx)`

### Where it hooks (smallest viable diff)

1. **One call site.** At `demo.js:177`, after the splitter spawn and in the position of `Slots.kill`:
   `if (KillLayer.on(r)) KillLayer.resolve(r, e, ctx);` — before `recordKill` so the existing per-kill record and
   `ScoreCues` can be reused or bypassed, and before `FiveCombat.afterDamage` so legacy secondaries still run
   last (or after it if chain should include item kills — pick one and note it).
2. **Packet build in the hook** (all fields exist except three):
   ```js
   const over = Math.max(0, (ctx.amount||0) - (ctx.beforeHP||0));
   const L = r.demo.kill;                 // new state
   const gap = L.lastT ? r.time - L.lastT : 0;
   L.lastT = r.time;
   // packet = { chain:1, maxHP:e.maxHp, over, family:(e.fam ?? e.kind), dtGap:gap,
   //            hpFrac:r.hp/Math.max(1,r.stats.maxHp), depth, source:ctx.primary?'gun':'echo' }
   ```
   `maxHP` exists (`Ospw` sets it); `over` and `hpFrac` are immediate; `dtGap` needs `L.lastT`; `depth` is the
   recursion argument; `family` needs §2's mapping/`fam`-at-spawn decision.
3. **Rack state in `r.demo`** (do **not** touch `r.slots` — that is the 6 weapon slots, `demo.js:121,215`):
   ```js
   // init(r), demo.js:119-125
   kill: { rack:[null,null,null,null,null,null], bench:[], paid:{}, well:0, lastT:0,
           tele:{kills:0, chain:0, sourced:{over:0,maxHP:0,fam:0,pace:0,hp:0}, sinks:{echo:0,barrier:0,pearls:0, vault:0}} }
   // wave(r), demo.js:127-133: reset well/lastT/tele (rack and paid survive)
   ```
   Mirror `Slots`' shapes (`state/add/move/sell/wave/giveAll`, `slots.js:83-118`) so the shop, QA harness and
   loadout code patterns transfer directly. 6 slots (LAB_SPEC `:32-58`) rather than the 5 phase slots.
4. **Resolution** (pure, no DOM/timers/RNG — see §6): copy the spec exactly (`LAB_SPEC.md:44-50`):
   for i in 0..5, skip empty; source mutates chain; sink takes `min(chain,max)`, does `floor(take/per)` effects,
   `chain -= do*per` (remainder stays); after the row `well += chain * 0.25`. Echoes open a new packet at
   `depth+1` and re-resolve, capped at depth 8 and 40 echo events/s (spec `:53-55`).
5. **Scoring consumption.** Replace the step-4 bank (`style()`, `demo.js:150-157`) when the layer is on:
   `pearls = round(well)` (well resets per wave at `wave()`), `h.mult/streak` no longer needed; keep the
   `r.events.push({kind:'bank',...})` shape (`demo.js:156`) so the summary/shop header still works, and
   `d.history.push` (`demo.js:155`) so the run-review screens have a record.
6. **Shop.** Clone `slotPanel` (`shop.js:90-94`) into a rack panel with 6 slots + bench; wire click handlers in
   the `shop.js:108-113` block; add `DEMO.command` actions `killMove`/`killSell` mirroring `demo.js:403-404`
   (`Slots.move/sell`). Offer items from a shelf row: extend `shelfOffer` (`demo.js:350`) with `'kill'` and add
   a `KillLayer.ITEMS` pool + `offerInfo` branch like the `'slot'` branch (`shop.js:61`); price by rarity
   (`demo.js:339`). Reorder stays free and shop-only (`demo.js:395`).
7. **Events / HUD / receipt.** One event per kill: `r.events.push({kind:'killpacket', pos:Mr(r.medium.origin,
   e.pos), chain, parts:[{id, took, gave}...]})` — pushed after combat in the same tick (events are cleared at
   `demo.js:499`). Receipt/renderer follows the existing wrapper pattern (`Ul.prototype.events`,
   `demo.js:621-628`; slots' receipt at `slots.js:222-228`): rings + `DemoFx.label(R,text,pos,fill,size,life)`
   (`demo.js:615-616`, world-position, **60-label cap**) staged ~35 ms apart, aggregate number only. Persistent
   rack HUD: clone `Slots.draw` (`slots.js:202-215`, DOM, guarded by `typeof document==='undefined'`) and call
   it from the `of` wrapper (`slots.js:220`).
8. **Flightlog.** Today `flightlog.js:54-58` reconstructs kills from the `r.kills` counter delta and stores only
   `{t,x,y,ph}` per kill; `flightlog.js:29-45` samples enemies/crowd. Add a bounded
   `r.demo.kill.packets` ring (e.g. 256) written in `resolve`, and copy it into `flight.kills` (or a new
   `flight.killPackets`) in `step()` — the recorder stays observation-only ("only reads state",
   `flightlog.js:2-3`). Without that, a kill-layer balance pass has no per-kill fuel data.

### What must be deleted / replaced (if this replaces scoring)

- `source/slots.js` phase engine call sites: `demo.js:142` (`Slots.breach`), `demo.js:172` (`Slots.dealt`),
  `demo.js:177` (`Slots.kill`), `demo.js:215/223` (`Slots.rateFactor`, `Slots.damageFactor`, `Slots.pierce`),
  `demo.js:277` (`Slots.tick`), `demo.js:488` (`Slots.entry`), `demo.js:132` (`Slots.wave`), plus HUD
  `slots.js:220`, shop `shop.js:90-94`, `source/loadout.js` "every item on the bench", and the `tune`
  switches `slots/slotVolley/slotRate` (`demo.js:18` + `DemoTuneDefs`).
- Bank-time charms: if the five-trick score goes too, remove `bank()` (`demo.js:158-168`), `ledger()`
  (`demo.js:88`), `charmpanel` (`shop.js:79`), `charmLeft`/`charmSell` (`demo.js:427-428`), charm offers
  (`demo.js:340,346`), `ScoreCues.finish`, `charmSlots`, `d.charms`, and the S4 QA suites that pin it.
- `FiveScore` itself is bigger: `evaluate` is used by **previews** in the shop (`shop.js:33,37`), by
  `ScoreCues` for trick reveals (`score-cues.js:9-46`), and by `qa/five-score.cjs`, `qa/scoring-*.cjs`,
  `qa/shop.cjs`, `qa/shop-ui.cjs`. If the kill layer replaces the score, those suites need replacing too;
  if it only replaces the phase engine, keep FiveScore for `tune.rules=0`.
- `r.hand.kills` is consumed by FiveScore's ledger (`ledgerFacts`, `five-score.js:129-138`), the bank history
  (`demo.js:164`) and `DemoBankBreakdown` (`demo.js:524`). Keep the record shape even if unused, or update all
  three.
- **Keep** the `r.hand` shape (`open`, `pred`, `activeAir`, `kills`, `mult`, `busted`) and the `r.events`
  `kill` event; every QA suite and the renderer assume them (`qa/slots.cjs:15-33`, `qa/core.cjs:15-25`,
  `flightlog.js`).

### What breaks in QA

`qa/load.cjs` extracts the built bundle and exposes `H.Slots`/`H.Core` (`qa/load.cjs:8,41`); `qa/core.cjs:8` and
all of `qa/slots.cjs` dereference `H.Slots` — deleting the engine breaks them by construction. `qa/flightlog-bot.cjs`
will keep running but its baseline metrics compare kill counts/phases, so a scoring change moves them. The
already-failing `enemy-sandbox --gate` and `flightlog-bot` (§4) mean a green local run must be scoped to
`core.cjs`, `slots.cjs`, `five-combat.cjs`, `rules.cjs`.

---

## 6. Hard constraints the code enforces (and the layer must respect)

1. **Items never attack, and no chance.** `slots.js:3-4` ("Items never attack: Discharge multiplies what the guns
   fire"), `slots.js:35` ("No 'chance to', no freezes or slow motion"), `docs/SLOT_ITEMS.md:35`,
   `docs/GAME_MAP.md:204`. Code evidence: `slots.js` has **zero RNG** — every effect is a pure function of
   flight state; all sim randomness goes through the seeded `ce(r)` (`function ce(r){let t=r.rng|0 ...}` in the
   bundle; `Math.random` appears in `source/` only in the title trick-pool shuffle `demo.js:539` and renderer
   shake `demo.js:649`, neither in the sim). A kill-layer echo that deals damage should reuse `damage()` with a
   fresh `attackId` and `primary:false` context (exactly how FiveCombat secondaries already do it), not spawn
   weapons or add `Math.random` rolls.
2. **Deterministic sim / render-free.** Every scoring helper runs headless in `qa/load.cjs`'s VM with DOM stubs;
   `Slots.draw` refuses to run without a document (`slots.js:203-205`). Keep `KillLayer.resolve` pure, with no
   DOM, timers, audio or `performance.now`; put effects in the renderer wrappers (`slots.js:222-231` pattern).
   FiveScore's `evaluate` falls back to `Math.random` (`five-score.js:87,141-142`) — callers must pass
   `()=>ce(r)` (the demo does, `demo.js:159`); the kill layer should take no rng at all.
3. **Readable two-line items.** `five-score.js:30` ("Every charm reads in two lines and has at most one
   condition"), `shop.js:10`, `docs/GAME_MAP.md:198`. Slot items are one line (`slots.js:37-79`), rendered at
   `shop.js:61`; keep the same `{name, glyph, kind, rarity, text, run}` shape.
4. **Arrangement is shop-only; nothing reads metres; no class-set/positional rules.**
   `docs/SLOT_ITEMS.md:36`, `slots.js:11` ("nothing reads metres"), `docs/GAME_MAP.md:202` (positional rules
   rejected). Use angle tiers, airtime shares and kill pace/time, as `slots.js:121` does.
5. **The player cannot time kills or read in flight** (`docs/GAME_MAP.md:210-213`), which is why the LAB_SPEC
   contract is a *visible receipt per kill* and aggregated numbers, never a text log. Events must be cheap:
   `r.events` is rebuilt every tick and the renderer caps labels at 60 (`demo.js:616`) and rings at 32
   (`slots.js:224`).
6. **Capital-B Boss rule:** `damage()` refuses while `r.armed` (`demo.js:170`), and the boss never despawns
   (`demo.js:89-99,449`); echo sinks must not kill through `r.enemies` removal assumptions or they will skip the
   boss return path.

---

## 7. Assumptions made (stated, not asked)

- **The integration target is the demo**, even though `LAB_SPEC.md` says the toy touches no ICARUS source; the
  notes are for the branch after the toy proves the mechanism.
- **"Family" is not in the shipped sim.** Default plan: derive `family` from `e.kind`, or add `fam` at spawn as
  `source/core.js:47-48` does. The four-family names (Fruit/Bell/Chest/Seven) come from the Core lab pool.
- **The 6-slot rack is new state** (`r.demo.kill.rack`), not the weapon slots and not `r.demo.sl`.
- **Ordering means strict left-to-right, once**, with Keystone/Mirror/depth as in `LAB_SPEC.md:44-55`; this is
  the same semantics as the existing phase engine (`slots.js:122-127`), which is why the shop/QA patterns transfer.
- **The overkill share** is `1 − applied/fired` from `Slots.dealt` telemetry (`slots.js:174-177`), measured on
  the 6 Nov build; I did not re-run `--combat` (timebox) but re-aggregated its saved `reviews/slots-combat.json`.
- **Known-failing suites** are taken from the balance-pass skill report, not reproduced here.
- A small latent bug worth knowing: `slots.js:170` reads `f.st.value[e.fam]` but `st.value` is only ever set by
  the Core Loop lab (`core.js:40` sets `s.value0`/`s.value`; `slots.js:116` restores it), so in normal demo runs
  the family-charge rule is inert — and in the lab `f.fam[e.fam]` counts, so the per-kill family hook exists only
  under `Core` (`[M]` by code inspection; `slots.cjs` rule tests don't cover it).

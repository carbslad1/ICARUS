> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# The kill layer: a proposal

**8 November 2026 · branch `prototype/slot-items-2026-11` · for the designer.** No game code was
changed. Three things come with this: an interactive toy to play
(`docs/kill-layer/kill-layer-lab.html`), the research behind the claims (`docs/kill-layer/RESEARCH.md`),
and the ground truth about how a kill resolves today (`docs/kill-layer/CODE_NOTES.md`). Everything here
is a proposal; every number is **[TUNE]** unless it is marked measured.

---

## The short version

1. **The issue is not that the two systems don't fit. It is that their currencies never meet.** Balatro's
   payoff is a number resolved after a hand; Brotato's payoff is survival, measured continuously. ICARUS
   has been resolving its maths *after* the fighting — at the splashdown, or in five moments across a
   flight nobody can read — so the fighting cannot feel it.
2. **Make the kill itself the table.** Every kill is a hand played automatically. It produces a number,
   the **CHAIN**, and your rack either builds it (**sources**) or spends it (**sinks**). The rack
   resolves strictly left to right on every kill — about four times a second — and **whichever sink comes
   first gets fed**.
3. **Order stops being a sort and becomes a routing policy.** The chain can become killing more (echo),
   surviving longer (barrier), firing faster (Surge) or growing the run (pearls). You cannot fund all
   four. The order you set in the shop *is* your answer for a whole wave.
4. **The survival curve is what keeps the answer from being solved.** Early enemies die in one shot, so
   kills are rich in overkill (measured: **48%** of fired damage at wave 5). Late enemies are tanky, so
   kills are rich in raw health (**~31%** overkill by wave 15). Crowded waves are rich in pace; family
   waves are rich in family. **The fuel changes under you, so the order that was right stops being
   right** — and the shop shows the next wave's mix, so re-authoring is a prediction you make.
5. **It is legible because the rack is a machine you can see and hear run.** Every kill lights the six
   slots in order at the kill point; a slot whose condition fails stays hollow; the row travels with the
   echoes; and one note per slot turns the order into a melody. The wave report then attributes every
   pearl, echo and barrier to a slot, and tells you what your order cost you. That report is the
   authorship receipt.

One line: **in Balatro the score is the goal; here the score is ammunition.**

---

## 1. The issue, stated properly

Three of this project's own measurements say why a Balatro-shaped layer has not landed.

**1. The maths resolves after the fight.** FiveScore resolves charms at the bank, left to right
(`source/five-score.js`); the slot prototype resolves five moments across a flight (`source/slots.js`).
Both are correct and both are invisible while dodging. The designer's correction stands: the water phase
is about a second and nothing can be read underwater, *and nothing can be read in the air either while
dodging* (`docs/GAME_MAP.md` §11). Resolution you cannot watch is not a feel; it is a spreadsheet with a
splashdown.

**2. The slot prototype measured order and found it mostly did not matter.** Its own simulator reports
best-order loss of **0%** for every neutral set, and the Core Loop results say plainly that where a stack
lands in a flight makes no measurable difference (`docs/CORE_LOOP.md`, rule 5). Order changed outcomes
for the sets that leaned on launch angle — 14–33% — but that is a shopping decision, not a combat one.
**The issue in its purest form: the player arranges, and nothing happens.**

**3. Damage-style payoffs evaporate.** A saved combat study (`qa/slots.cjs --combat`, 6 Nov, 81 rows)
measured **3.78 kills and 3.03 orbs per air second**, and **36.8% of all fired damage lost to overkill**
(9.8–77.6% by weapon; the save guesses gun tier from the wave, so read the trend, not the digits). A ×4
Mult Discharge *fired* +20–40% damage but only *landed* +7–14% kills, because enemies die in a shot or
two. Kills sat at their spawn limit (3–7 a second) and moved ±0–2% whatever the damage multiplier did.
**A modifier that multiplies damage is mostly spent on corpses.**

So the merge cannot be "Balatro's maths, but per kill". Per kill it must be **a resource that cannot be
wasted** — and the game already produces a large one it throws away: **overkill**, 37% of everything the
guns fire. The move is to make overkill, health, pace, family and safety the fuel of one per-kill
currency, and let the player's ordering decide what that currency becomes.

## 2. What the prior art actually says

Read in full in `docs/kill-layer/RESEARCH.md`; four findings shape the design.

**Balatro's order is a distribution law, and it collapses into a ranking.** The wiki teaches it in one
line: put +Mult left of ×Mult — `40 × ((4+4) × 2) = 640` versus `40 × ((4×2) + 4) = 480`. The failure is
documented in the same place: because every joker triggers left to right, *Blueprint* (copies the joker to
its right) **permanently outranks** *Brainstorm* (copies the leftmost) — "always in Blueprint's shadow —
by a small amount". Order produced a dominance hierarchy, not an open decision, and the wiki's own
optimal-play note is to reshuffle the rack *while the hand scores*, which is an APM tax rather than a
build decision. **Lesson: an ordered rack collapses unless position is contested and the objective
rotates.** (Sources in RESEARCH.md §1.)

**Brotato's curve is health inflation, not more enemies.** Twenty waves, per-archetype `+HP/wave`, a hard
100-enemies-on-screen cap (excess despawn, and despawns "count as dying", firing on-death items), and
Danger as one multiplicative knob (+12/26/40/60%). Its real agency is the paused shop: four offers,
escalating rerolls, free locks, tier gates, and a published price-inflation formula. **Lesson: the curve
is cheap to author and the decisions live in the shop — the seam we are cutting is exactly that
separation.** (RESEARCH.md §2.)

**The genre's named failure mode is the one to design against.** A horde-survival design codex lists
"linear tide, exponential build" as the #1 failure and states the goal as "choosing a build, not solving
for the one correct build"; CloverPit's designer says the same from the slot side: "make sure there isn't
just one 'correct' way to win." **Lesson: the acceptance criteria must test for one dominant build, not
for more order.**

**Nothing quite like this has shipped.** No bullet heaven with a player-ordered modifier rack resolving
per kill was found. Balatro has the ordered rack but resolves per hand, paused and watchable. Brotato has
real per-kill triggers but no ordering. Slay the Spire's order is a code-defined queue, not an authored
sequence. **This is an integration novelty — moving ordered resolution from a paused phase into a live
kill stream — and the presentation layer has to be invented, not polished.** Confidence: medium
(absence of evidence; the 12 search terms are recorded in RESEARCH.md §4 so it can be re-run). Say
"we think this is new", not "this is new".

**And the legibility budget is the real risk.** Balatro is readable at 10–30 activations because they are
spatially anchored and paused. A bullet heaven has neither. The working estimate (judgement, to be
validated in playtest) is that a player can attribute roughly **1–3 named sequential events per second**;
beyond that they read the aggregate, not the sequence. A 2025 thesis argues readability should be
designed for **attributable failure** — the player can say why they died
([Minenko, Theseus](https://www.theseus.fi/items/b21149d7-e3ba-4e68-9f02-e7eb5c788455); abstract only,
PDF blocked, so treat as a pointer). That is exactly what this proposal must deliver: a player who can
say *"the engine stalled because I put the tanky-wave converter after the sink."*

## 3. The three inversions

| Balatro | ICARUS kill layer |
|---|---|
| The hand is played, then the jokers resolve, then you bank a score. | Every kill is a hand, played automatically about four times a second; the rack resolves it immediately. |
| The score is the goal. | **The score is ammunition.** The chain is spent on killing, surviving, firing faster or growing; only what is left is banked. |
| Order is a static optimum once you own the jokers. | **The fuel changes with the survival curve**, so the order is re-authored each wave. |

The last row is the whole design. It is also the part the toy exists to test.

## 4. The mechanism

### 4.1 A kill opens a packet

```
packet = the kill:  chain 1 · the enemy's max health · its overkill · its family ·
                    the gap since the last kill · your health · the cascade depth
```

Two of those fields do not exist in the demo today and are cheap to add: overkill is derivable at the
kill hook (`amount − beforeHP`), and the gap is one timestamp. Family needs a mapping from the 18 enemy
kinds, or a `fam` set at spawn as the Core Loop lab already does — it is the one real packet gap.

### 4.2 The rack resolves left to right, once

Six slots. A slot is a **source**, a **sink** or an **order** item.

- **Source — builds chain** from what the kill is made of. *Sonar* +1; *Undertow* ×2; *Harpoon's Gift*:
  overkill adds chain (rich when enemies are weak); *Big Game*: max health adds chain (rich when enemies
  are tanky); *Fruit/Bell Bloom*: family adds chain (rich when the wave is that family); *Follow-Through*:
  two kills within 0.6 s adds chain (rich when the crowd is dense); *Safe Water*: above 75% HP adds chain.
- **Sink — spends chain** on one output. *Cleave* (2 chain → 1 echo), *Kelp* (3 → 1 barrier), *Ballast*
  (1 → 1 pearl), *Vault* (deferred pearls at a better rate), *Inverter* (chain → Surge).
- **Order — changes how the row resolves.** *Keystone*: the next slot resolves twice. *Mirror*: resolve
  the previous slot again. *Prism*: ×2 chain. These are Balatro's copy/retrigger jokers, and they are why
  a sixth slot can be worth more than a better item.

```
resolve(packet):
  chain = 1
  for slot in rack, left to right:
      if source:  chain = source(chain, packet)
      if sink:    spend = min(chain, sink.cap);  do = floor(spend / sink.per)
                  sink.effect(do);  chain -= do * sink.per
  well += chain * bank rate          // whatever you did not spend
```

That is the entire system. Everything else is content and tuning.

### 4.3 One rack, two orders (illustrative numbers)

The same six items, a Fruit kill with max health 10 and overkill 6:

| Order | Chain as it moves | What the wave gets |
|---|---|---|
| **Sonar → Harpoon's Gift → Undertow → Cleave → Kelp → Ballast** | 1 → 2 → 3 → 6 → 0 → 0 → 0 | **3 echoes** (a kill that kills), nothing banked |
| **Cleave → Sonar → Harpoon's Gift → Undertow → Ballast → Kelp** | 1 (stalls) → 2 → 3 → 6 → 3 → 0 | **3 pearls and 1 barrier**, no echoes |

Same items. One order clears the screen, the other survives the hits and grows the run. **That is the
decision.**

### 4.4 The four outputs, and why they are the right four

| Output | What it buys | The survival need it answers |
|---|---|---|
| **Echo** | Damage to *another* enemy — 40% of the killed enemy's max health, ×0.8 per hop, depth-capped. A kill can kill. | The crowd on screen, the pressure the playtests actually measured. |
| **Barrier** | Points that absorb hits before HP. | The hit-size problem: 64 of 100 HP at wave 10. |
| **Surge** | Fire rate that builds through the wave and resets at the end — the live Core Loop system, kept as a sink rather than a parallel system. | The DPS check the curve applies when health outgrows the guns. |
| **Pearls** | The build itself: items, guns, rerolls, healing. | The run's power curve — and the reason a route can be greedy. |

Echo is the only new damage, and it is deliberately **not** a damage multiplier: it hits a fresh target at
full health, so it cannot be wasted on a corpse. That is the direct answer to the overkill finding — and
it is why the measured 37% stops being a leak and becomes the engine's fuel.

> **One rule needs your call.** The target design says *items modify; they never attack*
> (`ICARUS_DESIGN.md` §4.8). An echo is damage produced by an item. My reading: it is not an item attack,
> because no item ever fires on its own — an echo only exists when a gun kill happens, and it is the
> shot's leftover carrying on, exactly like the tiered pierce already in the game. If you read the rule
> strictly, echoes become non-damage (barrier, Surge, pearls only) and the layer keeps its economy but
> loses most of its survival teeth. I recommend the kill-triggered-pierce reading, and I would write the
> rule down as **"items never originate damage; a kill may redirect it."**

## 5. Why the order is a decision and not a sort

Balatro's order problem is a sort, and the research shows exactly how that ends. Four properties stop it
happening here.

**First, the chain is not a combo counter.** A combo counter measures how well you played and ends in one
number. The chain is a budget with four ways to spend it; the number is only interesting because you have
to route it. That is the difference between "my score went up" and "I chose to survive this wave instead
of growing".

1. **A sink is a toll booth, not a multiplier.** Sinks consume chain, so position is priority. Put echo
   before pearls and the crowd dies while the bank starves; reverse it and you get rich as the screen
   fills. There is no free order, only a choice about which need is fed first.
2. **Sources compete for the same fuel.** *Harpoon's Gift* (overkill) and *Big Game* (max health) want the
   same slot job — the early converter — and the curve makes them swap. You cannot have both at the front,
   and the wave tells you which one it is.
3. **Threshold sources read the chain mid-row.** *Overflow* pays if the chain is already ≥ 4 when it
   fires. That number is what the slots before it produced — and sinks take it away. So a build that
   wants Overflow wants *source → threshold → sink*; a build that farms wants *sink → sink → bank*.
   Ordering becomes the shape of a small machine, not a sort.
4. **The fuel changes every wave.** Early: overkill. Mid: pace and family. Late: raw health (overkill
   dries up) and barrier (hits hurt). Boss: single target — echoes are worthless and the order inverts
   toward big-health sources and non-echo sinks.

**Four anti-collapse rules, taken from the research's failure cases.** No slot may be strictly better in
every position (the Blueprint/Brainstorm trap); the objective must rotate between the four outputs; the
fuel must rotate with the curve; and reordering must never be optimal mid-fight (the APM trap), so the
rack is set in the shop and locked for the wave.

**The contract, and how it fails.** Ordering matters when the same rack in different orders produces
meaningfully different waves; it is broken when one order is always right. Proposed gate: **for most
waves at least two orders land within 10% of each other, and the best order differs across at least three
of the five wave archetypes** (weak / crowd / family / tanky / boss). The toy measures exactly this. If the
spread is small, or one order wins everywhere, the layer is decoration and we should know before writing
demo code.

## 6. Constant, visible, attributable

Nothing can be read in flight, so the layer's legibility is **perceptual, not textual**, and it is built
in three tiers with three different information budgets.

**Tier 1 — the machine (always on, read in rhythm).** The six-slot rack sits on screen all run. Every
kill lights the slots **in order**; slots that skipped — empty, condition failed, nothing to spend — stay
hollow. A chain meter beside the rack rises with the row and drains at each sink. This is the only tier
that is always visible, and it carries exactly one message: *is the machine running, and where is it
stalling?* That hollow slot is the attribution.

**Tier 2 — the fireworks (per kill, allowed to be spectacular).** A **receipt**: the six glyphs appear at
the kill point as a short row, staged ~35 ms apart, each pulsing in proportion to what it did, the chain
total once at the end. An echo draws the row **moving** from the dying enemy to its target. A cascade is
rows of glyphs crossing the horde — the bullet-heaven spectacle *is* the resolution. This tier is capped
and expendable: if playtesters cannot tell whether the rack stalled, cut receipts to one per kill-cluster
and keep Tier 1. The research is blunt that per-kill numbers are soup; per-cluster or aggregate is the way
out.

**Tier 3 — the report (in the shop, where reading is possible).** Per slot: fires, chain added, chain
spent, output produced. Plus the **fuel mix** — what share of the wave's chain came from overkill, big
health, family, pace, safety — so you can watch the curve change under your build. Plus the shop's
forecast of the next wave, and your order's projected result against it.

**Audio is the fourth channel and the cheapest one.** One note per slot index, left to right, rate
limited; a sink has a different timbre. The order becomes a melody you hear every second. CloverPit's
designer credits "countless hours perfecting the sound design and animations for each spin" as the reason
its resolution reads — one event, one tick, timbre = identity. This is the same trick, and it scales where
text does not.

**The oracle problem.** The report can measure what your order cost only by knowing what another order
would have paid — and if the shop always shows the best arrangement, the game plays itself. So in the
**shipping game**: show your attribution, your percentile and the *cost* of your order; hide the solved
arrangement until the post-run summary, where it is a lesson, not a solution. (The **toy** shows the
answer, because its job is to prove the mechanism, not to preserve the fantasy.)

## 7. The payoff has an author

The bank is not the score; it is **what your routing did not spend**. At splashdown the wave's chain
prints, the sinks are summarised, and the pearls paid are the bank's — the existing count-up becomes a
receipt for your policy, not a verdict on your reflexes. A farming wave ends with a huge bank and a screen
that nearly killed you; a survival wave ends with an empty bank, a clear screen and full health. **Same
game, same rack, two different statements — and the game can tell you which one you made and what the
other would have paid.**

Two details that make it bite:
- **The bank rate is the tension valve.** Unspent chain banks at a mediocre rate (say 4:1) unless a
  *Vault* catches it at 2:1. Holding is possible but taxed — the shape of Brotato's economy. The pearl
  payout keeps the existing square-root curve (`round(3 × √score)`), so the bank is a natural diminishing
  return rather than a runaway.
- **The clean streak multiplies the bank, not the chain.** It keeps the existing rule (a hit resets it)
  and now means "I brought the build home intact", which is a better story than a score multiplier.

## 8. What it makes you decide

| Decision | When | Why it is interesting |
|---|---|---|
| **What to buy** | Shop | Sources and sinks are different jobs. Pure sources do nothing; pure sinks starve. |
| **Where to put it** | Shop, free to move | Routing policy: which need is fed first. This is the new decision. |
| **Which fuel to bet on** | Shop, with the forecast | Overkill, health, family, pace or safety. The curve says which is rich. |
| **Which output to lean on** | Shop | Echo / barrier / Surge / pearls: clear, survive, fire faster, grow. Not all four. |
| **Whether to rewire** | Shop | Reordering is free but the rack is locked for the wave. The cost is the wave you live with. |
| **Six slots, not nine** | Every wave | Keystone and Mirror make a slot's *position* worth more than a better item. |
| **Which trick to dive with** | The dive | The trick's weapon-type boost changes what dies how fast — and that changes the rack's fuel. |

That last row matters: the four tricks boost a weapon type, the type changes the overkill profile, and
the overkill profile is the layer's richest fuel. **The dive chooses the fuel; the rack chooses the use.**
The two existing pillars — "every dive is a decision" and "a build is named by its trick" — survive, and
the rack is what makes them pay every second.

**What a shop visit feels like.** Wave 6 is forecast as Bells, tanky: overkill fuel will be thin, family
fuel is not. You move *Big Game* to slot 1 (max health is the fuel this wave), leave *Bell Bloom* after
it, and put *Kelp* before the pearls because the hit size is about to hurt. Two clicks, no maths. Wave 9
is forecast as a crowd: *Follow-Through* goes to the front, *Cleave* ahead of everything, *Vault* last
because you expect to be ahead. Same six items, a different machine each wave — and the report will tell
you whether your read was right.

## 9. How it fits what is built

`docs/kill-layer/CODE_NOTES.md` has the exact call sites; this is the short version.

**The ingredients are already on this branch.** The per-kill hook exists and has the data for a packet.
The slot prototype already proved the ordering semantics, the shop-only arrangement and the UI pattern.
Surge is already a working power curve. The flight log already measures runs. The layer is a
recombination of these, not a new system bolted on — which is why the integration diff is small and the
risk is design, not engineering.

| Existing | Fate |
|---|---|
| FiveScore charms resolving at the bank | Become rack items, resolved on kills. The bank keeps the pearl curve, the streak and the count-up. |
| Slot prototype's five phase slots, Charge/Mult | Retired as the primary resolution. Charge → chain; "when it fires" becomes "where it sits". Its measured lessons carry over: no free per-flight value, carried value added after multipliers, stored value capped. |
| Surge (Core Loop lab) | Kept, as one of the four sinks: same definition, same milestone beat. |
| Guns, auto-fire, merging, the dive, the four tricks | Untouched. The dive is now coupled to the layer through overkill. |
| Pearls, streak, splashdown count-up | Kept. The count-up pays the routing's result. |
| Flight log | Gains a per-kill packet ring (today it stores only `{t,x,y,phase}`), so the layer can be measured from real runs exactly like the flow study. |

**The integration is genuinely small.** One call site at the kill branch (`source/demo.js:177`), a
6-slot rack in `r.demo`, and the packet can be built from fields that already exist — enemy `maxHp`, and
`ctx.amount − ctx.beforeHP` for overkill. Three things need care, not redesign:

- **Family** is not on enemies in the shipped demo (only in the Core lab): map from the 18 kinds or set
  `fam` at spawn.
- **Echoes must not recurse blindly.** `FiveCombat.afterDamage` already nests secondary kills, and a
  splitter's children spawn *before* the kill hook; the layer needs an explicit depth argument and a
  per-second echo cap.
- **The stomp path bypasses the kill hook** (`touchKill`). Either feed it in or leave stomp parked, but
  decide.

**What breaks:** the phase-slot engine's call sites, the bank-time charm resolution, and the two QA
suites that dereference `H.Slots` by construction (`qa/core.cjs`, `qa/slots.cjs`). FiveScore is also used
by shop previews and ScoreCues, so it is replaced or kept behind the S4 flag. The kill event, the
`r.hand` shape and the deterministic, render-free sim must be preserved. Code constraints the layer must
respect: items never originate damage, no "chance to", two-line items, shop-only arrangement, no
`Math.random` in the sim.

## 10. Sizing, verification, and the toy

**Budget unit: chain per air second.** Using the measured rates (3.78 kills/s, 3.03 orbs/s), a full
routing should give roughly **+30% kill rate** (echo), **+5 HP/s equivalent** (barrier), **+25% fire rate
by mid-wave** (Surge), or **1.5–2 pearls/s** (pearls) — and a real rack can fund about one and a half of
those, not four. Those are the [TUNE] numbers the toy is built to hunt.

**Verification, in the project's style:**
1. **Permutation sim over real kills.** The toy proves the mechanism; the real test replays saved flight
   logs' kill streams through rack permutations. Small spread ⇒ decoration; say so before building it.
2. **The order-matters contract** (§5), tested across archetypes.
3. **The legibility contract:** under ~8 receipts a second, no readable text required in flight, and a
   hollow-slot stall spot-able in playtest ("could you tell which gear stalled?").
4. **The attribution contract:** the report's per-slot numbers sum to the bank — every pearl traceable.
   No hidden maths (pillar 2).
5. **The one-correct-build contract:** a community-style check after 2 weeks of playtest data — do runs
   converge on one order? If yes, the fuel is not rotating enough.
6. **Playtest gates:** the designer can describe what their order did without the report; changes the
   order between waves unprompted at least once; and can explain a wrong order afterwards.

**Onboarding, in three beats.** (1) The first wave starts with a fixed two-item rack — a source and a
sink — and the first kill shows one receipt with two glyphs, so "a kill runs the row" is taught by
looking. (2) The first shop offers the third item already in place and names one action:
"put the sink before or after the source?" The report's stall line teaches the rest. (3) The first
forecast is free; from wave 3 the forecast is what you buy information with. No tutorial text beyond two
two-line items — the same discipline as the charms.

**The first content pool** should be about 24 items: 8 sources (overkill, big health, family, pace,
safety, two multiplies, two order), 8 sinks (three echo/space, two barrier, three economy), and 8
order/condition items (Keystone, Mirror, Prism, thresholds). That is enough for the shop to offer real
choices without a content pass; §4.17 step 4 then becomes "the rack".

**The toy** (`docs/kill-layer/kill-layer-lab.html`) is standalone, no install, opens from `file://`. It
runs 20 Brotato-shaped waves with a six-slot drag-reorderable rack, receipts, the rack row, audio, the
forecast and the every-order comparison. It is a mechanism test, not a balance test; its numbers are
invented and `LAB_NOTES.md` says exactly which. **If its order comparison shows no spread, the mechanism
is wrong and this proposal should be re-thought — that is why it exists.**

## 11. Risks, and what would make me drop it

| Risk | Mitigation / kill criterion |
|---|---|
| **Noise.** Four kills a second × six slots is 24 flashes. | Three tiers (§6): the rack row is the readout, receipts are fireworks, the report is the text. Kill criterion: if the stall cannot be spot-able, cut receipts to one per cluster and keep Tier 1. |
| **Solved ordering.** A wiki order emerges; the decision dies. | Contested positions, four rotating outputs, fuel that changes with the curve, forecast, and the one-correct-build contract. Kill criterion: one order best on every archetype. |
| **Overkill dries up late** — exactly where the run should accelerate. | Big Game, family and pace sources take over; barrier takes over as the sink; the report's fuel mix shows it. If it still stalls, the late sources need re-sizing. |
| **Combinatorial blow-up** (Keystone × Mirror × echoes). | Depth caps, per-second echo caps, and the existing rule that carried value is added after multipliers, never multiplied again. |
| **It becomes a second game beside the guns.** | It never fires on its own; echoes only exist on a gun kill; and it is tuned to about a third of the wave's killing. If it grows past that, the layer is the game and the guns are the add-on. |
| **Spectatorship: the machine runs itself, and the player only arranges.** | The moment-to-moment agency stays where it is — movement, dodging and the dive — and the dive chooses the fuel. The rack is not meant to carry the game; it is meant to make the build the player already has pay off. Kill criterion: if a run with the "right" rack and no dodging plays as well as a dodging run, the layer has replaced the game instead of serving it. |
| **It breaks "one clear place the maths happens."** | The old bank-time resolution is retired, not kept alongside. One resolution, one currency, one payment. |

## 12. Alternatives I considered

- **B. Per-flight resolution with kill triggers** (the slot prototype, made louder). Fails the designer's
  own constraint: the moments still land in a flight nobody can read, and order measured as near-
  irrelevant without angle lean. A smaller change, and not enough.
- **C. A reel order instead of a rack** (Luck-be-a-Landlord style: symbols in a fixed row, spin order is
  the resolution). Constant and legible, but the order becomes a spin rather than an authored sequence,
  and it collides with "every pick shows its numbers".
- **D. Keep score at the bank, add a per-wave combo counter.** Cheapest, and it fails the goal: ordering
  still resolves after the fight, so it cannot be felt every second.

## 13. What I would do next

1. **Play the toy, then a week of paper work on it** with you reordering racks by feel — the question is
   whether the ordering is felt and whether the four outputs are the right four. Cheap, no demo code.
2. **Wire it into the demo behind a setting:** rack in `r.demo`, `KillLayer.resolve()` at the kill hook,
   receipt events, rack HUD. Keep the bank, streak and pearls; retire charm resolution and the phase
   slots from normal play.
3. **Add the per-kill packet stream to the flight log**, then the permutation report, so the design
   contract can be measured on real runs before any content pass. Only then size the item pool — §4.17's
   step 4 becomes "the rack", and the level-up draft becomes source/sink/order drafting.

## 14. Open questions for you

1. **The rule call:** are echoes acceptable as "a kill redirecting the gun's damage" (my recommendation),
   or does "items never attack" mean no new damage at all?
2. **Four outputs is a lot of vocabulary for a game whose items must be two lines.** All four
   (echo/barrier/Surge/pearls), or a leaner three?
3. **Should reordering be free?** Free keeps the per-wave prediction honest; a small cost makes wiring an
   investment. My default: free in the shop, locked for the wave.
4. **Is the six-slot rack the right home, or does it want to be the weapon grid** — a slot per gun type,
   so the order also fixes which weapon's kills feed which output? More novel, much harder to read.
5. **Does the bank keep the clean streak?** I would, but a hit then costs the routing's payoff as well as
   the streak.
6. **The name.** Chain? Wake? Tally? You name builds; this needs a word a player will say.

---

*Evidence: `docs/kill-layer/CODE_NOTES.md` (how a kill resolves today, with call sites and measured
rates), `RESEARCH.md` (Balatro's ordering and its failure, Brotato's curve, prior art, legibility
sources), `LAB_SPEC.md`, `LAB_NOTES.md` and the lab itself.*

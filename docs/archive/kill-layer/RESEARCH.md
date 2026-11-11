> **Archived 2026-11-08: not the plan.** Old design work, mostly AI-written. The roguelite structure, progression, shop and design direction are open. See `AGENTS.md`.

# Kill-Layer Research: ordered-modifier resolution × bullet heaven × survival curve

**Author:** mechanics-researcher (teammate) · **Date:** 2026-11-08 · **Timebox:** ~30 min
**Question:** can ICARUS merge Balatro's ordered joker resolution with Brotato's horde-against-a-curve, resolved **on the kill layer** (i.e. effects resolve per enemy killed, in player-chosen order)?

**Evidence legend used throughout**
- **[PRIMARY]** — developer-authored or first-party documentation.
- **[OFFICIAL WIKI]** — game's own wiki (brotato.wiki.spellsandguns.com), community-maintained, high numeric reliability.
- **[WIKI]** — community wiki, mechanics reliable, numbers may lag patches.
- **[SECONDARY]** — press/analysis summarising a primary interview; used only where the primary URL is cited alongside.
- **[UNVERIFIED]** — I could not read the source this session. Do **not** cite in the design doc without checking.
- **[JUDGEMENT]** — my engineering/design estimate, not a cited fact.

---

## 0. TL;DR — three sharpest findings

1. **Balatro's order system is small, legible and arithmetically trivially explainable ("+Mult left of ×Mult"), and the community still reduces it to a memorised ranking.** The Balatro Wiki's own guide states the rule as a distribution law: `40 × ((4+4)×2) = 640` vs `40 × ((4×2)+4) = 480` ([balatrowiki.org, Activation Sequence](https://balatrowiki.org/w/Guide:_Activation_Sequence)). The failure mode is visible in the same wiki's copy-joker pages: Blueprint (copies the joker to its **right**) is described as strictly outperforming Brainstorm (copies the **leftmost** joker) *because* "the nature of Jokers triggering left to right" makes Brainstorm "always in Blueprint's shadow — by a small amount" ([Blueprint](https://balatrowiki.org/w/Blueprint), [Brainstorm](https://balatrowiki.org/w/Brainstorm)). Order created a **dominance hierarchy**, not an open decision. Design implication: ordering is only interesting if position is contested (different situations want different orders), never if one permutation dominates.
2. **Brotato's curve is cheap to author and carries the whole run: ~20 waves, +HP/wave per enemy archetype, a hard 100-enemy on-screen cap, and Danger as a flat multiplicative knob (+12/26/40% HP & damage at D3/D4/D5).** Because the cap despawns enemies (which "actually count as dying"), the survival curve is not "more enemies" but **enemy HP inflation vs. your DPS growth**, with per-enemy `+hp/wave` values doing the work ([Brotato Wiki, Enemies](https://brotato.wiki.spellsandsandguns.com/Enemies), [Danger Levels](https://brotato.wiki.spellsandsandguns.com/Danger_Levels)). Brotato's build decisions live in the shop, not in the field: 4 offers/shop, 65/35 item/weapon split, weapon-class-weighted pools, tier gates at waves 2/4/8, and an explicit inflation formula `(Base + Wave + Base×0.1×Wave) × Shop_Price` ([Brotato Wiki, Shop](https://brotato.wiki.spellsandsandguns.com/Shop)).
3. **The bullet-heaven genre's own failure mode is precisely "solving for the one correct build," not "too little order."** A horde-survival design codex names the fixed-optimal-build as the failure state to design against ("the fun is choosing a build, not solving for the one correct build") and lists the genre's #1 failure as "linear tide, exponential build" ([hayao.dev codex](https://hayao.dev/docs/codex/genre-horde-survival)) [SECONDARY]. CloverPit's designer makes the same commitment from the slot-machine side: "Our goal was simple: to make sure there isn't just one 'correct' way to win" ([Xbox Wire, dev-authored](https://news.xbox.com/en-us/2025/11/20/clover-pit-xbox-partner-preview/)) **[PRIMARY]**.

**Novelty verdict (evidence below in §4):** I found **no shipped bullet-heaven with a player-ordered modifier rack resolving per kill.** Balatro ships the ordered rack but resolves per *hand*. Brotato ships per-*kill* triggers but exposes no ordering. The novelty is real but narrow — it is an **integration** novelty (ordered resolution moved from a discrete, paused scoring event to a continuous, non-paused kill stream), and the integration is exactly where the legibility risk lives (§5).

---

## 1. Balatro: what the ordering actually is, and what it costs

### 1.1 The resolution order (documented)

**[OFFICIAL WIKI]** quote structure from [Guide: Activation Sequence](https://balatrowiki.org/w/Guide:_Activation_Sequence):

1. Boss blind effects.
2. "On played" jokers.
3. Played cards score **left to right**; for each card: base chips → card modifiers (enhancements → seals → editions) → "on scored" jokers ("When multiple Jokers are triggered by the same card, they activate **from left to right**").
4. Retriggers — "Each retrigger repeats the previous activation sequence (from base effects to scored card dependent Jokers) one more time. **Multiple retriggers stack additively.**" Red Seal first, then retriggering jokers left to right.
5. Held-in-hand abilities (again left to right; Mime and copies of it act left to right).
6. Joker editions + "independent" jokers, checked left to right.
7. Consumables (Observatory planet ×1.5 from left to right).
8. Plasma Deck balances chips ↔ mult.

The important structural property: **order is scoped per activation type.** A "+Mult" joker only competes with an "×Mult" joker if they share a trigger window. That's what makes ordering learnable rather than chaotic.

### 1.2 The arithmetic (why the order matters)

**[OFFICIAL WIKI]**, verbatim example: scoring 40 × 4 with a +4 Mult joker and an ×2 Mult joker:

- Joker left of Ramen → `40 × ((4+4)×2) = 640`
- reversed → `40 × ((4×2)+4) = 480`

General rule given: "Put Jokers with additive Mult to the **left** of multiplicative Mult of the same Activation Type." The same page notes an intentional inversion: "In case the player wanted a **lower** score for purposes like scaling Jokers, they may put +Mult to the right of xMult." So the order is a *dial*, not just a maximiser — that is the good version of the mechanic.

### 1.3 Copy jokers: the strongest ordering lever, and the clearest failure

- **[OFFICIAL WIKI]** [Blueprint](https://balatrowiki.org/w/Blueprint): "**copies the effect of the Joker to its immediate right**." Blueprint + Brainstorm interplay: "Blueprint can be placed to the left of Brainstorm or to the left of the leftmost Joker (to be copied), **depending on the desired order of Joker activation**." And on optimality: "The optimal placement for maximum score can be **difficult to determine**, so consider all possible options."
- **[OFFICIAL WIKI]** [Brainstorm](https://balatrowiki.org/w/Brainstorm): "copies the effect of the player's **leftmost** Joker… moving Brainstorm around will not change what it copies, only when it does so."
- Failure evidence, same page: "Due to the difference in the way it copies a card, **and the nature of Jokers triggering left to right**, Brainstorm will **always be in Blueprint's shadow** — by a small amount." Worked example given: `Supernova + Blueprint + The Trio` scores more than `The Trio + Supernova + Brainstorm` — because an ×Mult joker must sit leftmost to be copied, so it can't also be multiplied.

**Read:** this is the exact shape of a solved order. Two copies with identical text end up strictly ranked by a positional asymmetry; the "decision" collapses to "you want Blueprint, Brainstorm is a worse Blueprint." The wiki's *usage note* is worse still: it documents a real-time micro-optimisation — move all Blueprint/Brainstorm copies onto Mime **while the hand is scoring** — i.e. the optimal play is APM on the rack, not a build decision.

### 1.4 What order decisions this creates for players

**[JUDGEMENT, derived from 1.1–1.3]**
- **Placement under a known objective** (put additive left of multiplicative) — a one-time lesson, then automatic.
- **Placement under a *conflicting* objective** (score vs. scaling vs. money) — the genuinely interesting one, because the objective changes per blind/ante.
- **Copy routing** (which neighbour a copier eats) — the combinatorial part, and the part most prone to a solved answer.
- **Retrigger stacking** — order-sensitive and multiplicative-in-feeling; this is the part that produces "build came online" moments.

### 1.5 Developer intent (with a caveat)

LocalThunk's documented design philosophy, via interviews: "It's my modern indie take on solitaire with a poker coat of paint… the game has almost no mechanical similarities to actual poker apart from the hand rankings"; "The intention was never to make a game for poker players"; on balance: "you don't want it to be perfectly level, you want it to *look* level" — quoted and linked to primary interviews (Rogueliker, TouchArcade) by [saschb2b, Balatro design tensions](https://saschb2b.github.io/game-mechanics/games/balatro/design-tensions) **[SECONDARY aggregator]**; primaries: [rogueliker.com/balatro-interview](https://rogueliker.com/balatro-interview/), [TouchArcade interview](https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/).

> **Gap I could not close in the timebox:** I found **no direct LocalThunk quote about joker ordering itself** (whether left-to-right was a deliberate ordering mechanic or an implementation artefact kept for depth). Both primaries above returned truncated bodies from this environment. Treat "the dev intended ordering as a mechanic" as **unverified**; the mechanic is documented, the intent is not.

---

## 2. Brotato: the survival curve, precisely

### 2.1 The curve is HP inflation, not spawn count

**[OFFICIAL WIKI] [Enemies](https://brotato.wiki.spellsandsandguns.com/Enemies):**
- "Waves have a maximum of **100 enemies** that can be on screen at once. If this Number is exceeded when an enemy spawns in, a random non-Elite/Boss enemy on the map **dies without dropping loot**."
- On-kill hooks are real and load-bearing: "Despawned enemies **actually count as dying** and can trigger items such as Baby with a Beard, Cyberball, and Rip and Tear." (⇒ the cap is an *economy* pressure, not just a rendering one.)
- Scaling is per-archetype additive: "All enemies start with their base health, and then gain the **+hp/wave** for each wave after the first… (It is **40% higher for Danger 5** in both cases.) Damage works the same way, while their **Speed doesn't change** with Wave or Danger level."
- Worked example from the wiki: Pursuer, first appears wave 11, `10 HP + 10×24 HP = 250 HP`; Tree `10 HP` wave 1, `+5/wave`.
- Waves: 20 total; durations `20, 25, 30, 35, 40, 45, 50, 55, 60 …` then a 90s wave 20 boss [OFFICIAL WIKI, same page]. Wave 20 boss HP `29,250` (`30,712` on D5).
- Sample archetypes show the intended difficulty *shape*: Chaser `1 HP, +1/wave` (swarm), Horned Bruiser `30 HP, +22/wave` (tank), Pursuer `+24/wave` (speed-based threat), Slasher Egg (spawns a Slasher unless killed → priority targeting).

### 2.2 Danger is a flat multiplicative knob (community-known, first-party-visible)

**[OFFICIAL WIKI] [Danger Levels](https://brotato.wiki.spellsandsandguns.com/Danger_Levels):** D1 new enemies; D2 "Elites and hordes appear"; D3 "+12% HP & damage"; D4 "+26%"; D5 "+40%"; D5 also "two bosses spawn instead of one (bosses have −25% HP)". Nightmare: `+60% HP, +60% damage, +10% speed`, plus fog/environmental projectiles. Important arithmetic note: "The Health and Damage increases are the **total** for that danger level. So at danger 5, enemies have +40%, not 12%+26%+40%." Elites: `75% health when spawning on Wave 12 or earlier`. Accessibility sliders multiply on top (25%–200% dmg/HP, 150% speed), difficulty = geometric mean.

### 2.3 How a run is lost, and what "unique build decisions" means

**[OFFICIAL WIKI] [Shop](https://brotato.wiki.spellsandsandguns.com/Shop)** — the run is lost when the player's DPS/defence curve falls behind HP inflation; the shop is where you buy the slope:
- **4 random offers per shop**, after every wave. Item/weapon split **65%/35%**, with guarantees: waves 1–2 exactly 2 weapons + 2 items; waves 3–5 at least 1 weapon; wave 6+ no guarantees.
- **Reroll costs escalate**: `first reroll = floor(Wave×0.75) + floor(0.40×Wave)`, each further reroll `+floor(0.40×Wave)` (wave 5 → 5 for first, +2 each after; wave 20 → 23 first, +8 after). Note the patch history: reroll increase was reduced from `0.5×Wave` to `0.33×Wave` (wiki formula reflects a later tuning), i.e. **Brotato tuned reroll affordability as a build-agency lever**.
- **Locking** freezes an item *and its price* across waves, immune to inflation.
- **Tier gates** (Min Wave): T2 wave 2, T3 wave 4, T4 wave 8, with base/`+chance per wave`/max caps (T2 6%/wave→60%, T3 2%/wave→25%, T4 0.23%/wave→8%), multiplied by `(100% + Luck)`.
- **Inflation formula:** `Final Price = (Base_Price + Wave + (Base_Price × 0.1 × Wave)) × Shop_Price`. Because the formula adds `+ Wave` flat, "cheaper items will be hit harder by inflation, and will be slightly less cost effective late game."
- **Weapon identity is preserved in the pool**: on a weapon roll, `Same Weapon Pool 20% / Same Class Pool 15% / All Weapons 65%`, plus early-wave class bonuses (15%→3% at shops 1–5) so the first shops can seed a class build. Weapons **combine** (two identical type+tier → one tier up, max T4), and combining happens **automatically when your weapon slots are full**.
- Characters rewrite shop rules wholesale (Arms Dealer −95% weapon prices but weapons are destroyed on entering the shop; Gangster can't lock but can steal; Demon pays with Max HP; Bull gets no weapons). This is how Brotato authors "unique build decisions": **the shop's rule-set is a per-character constraint**, so the same 4 offers mean different things.

**Read [JUDGEMENT]:** Brotato's "unique build decisions" are **draft/economy decisions made between waves** (what to lock, when to reroll, whether to combine now or hold tier), not moment-to-moment field decisions. The field is a *test* of the build. That is exactly the seam ICARUS is proposing to cut — moving a decision that Balatro/Brotato both make in a paused/separated phase into the live kill stream.

**On-kill resolution already exists in the genre, unordered.** Brotato's on-death items (Baby with a Beard, Cyberball, Rip and Tear) fire per kill; the wiki documents the **despawn** edge case as a bug-surface ("despawned enemies actually count as dying"). No player-facing ordering of those item effects is documented on the pages I read (Enemies, Shop).

---

## 3. Adjacent sequenced / positional systems

What is ordered → what decision results → what is bad. Evidence status marked per row.

| System | What is ordered | Decision it creates | What is bad / lesson | Evidence |
|---|---|---|---|---|
| **Balatro** | Joker rack + scored cards, left→right, scoped by activation type; retriggers re-run the sequence | +Mult left of ×Mult; copy-routing (Blueprint/Brainstorm); score-vs-scaling inversion | Solved dominance (Blueprint > Brainstorm by construction); optimal play becomes live rack-shuffling during scoring | [OFFICIAL WIKI] §1.1–1.3 |
| **Brotato** | Nothing positional; 6 weapon slots are unordered; per-kill triggers exist but aren't ordered | Which 4 of N shop offers; lock/reroll/combine timing; class commitment | Curve is HP-inflation only; decisions are all in the paused shop phase | [OFFICIAL WIKI] §2 |
| **Slay the Spire** | A **code-defined action queue**: "Anything that happens adds actions to the queue, which will take place in order… When a relic triggers, it adds actions to the queue." Ordering is addToTop vs addToBottom | Player orders *play* (card order matters), not resolution; relic order is fixed by acquisition | Interleaving is a rule, not an agency: "each hit of thorns is added to top, which causes it to take place **before** the next hit of the attack happens" — legible because it's consistent, not because the player chose it | [BasicMod wiki, Action Queue](https://github-wiki-see.page/m/Alchyr/BasicMod/wiki/Action-Queue) [WIKI, modding docs] |
| **CloverPit** (slot-machine roguelite) | Charm loadout between spins; the *machine* resolves the spin | Which charms; how much to push before cashing out | Designer's stated goal: avoid one "correct" way to win; 150 charms at launch with many cut in testing; celebrated a tester's **>1-minute jackpot chain** as rare spectacle | [Xbox Wire, dev-authored](https://news.xbox.com/en-us/2025/11/20/clover-pit-xbox-partner-preview/) **[PRIMARY]** |
| **Luck be a Landlord** | A **20-slot reel** the player populates; symbol order fixes the resolution sequence; items can reposition symbols (e.g. Swapping Device) | Which symbols, and where in the reel | Not verified this session — Fandom returned layout only (no body text). Also note the genre's core tension: the reel *auto*resolves, so ordering is a between-spins decision | **[UNVERIFIED]** [wiki page exists](https://luck-be-a-landlord.fandom.com/wiki/Swapping_Device) |
| **Backpack Hero** | Item grid layout / adjacency ("adjacent items") | Packing puzzle: fit + adjacencies | **Not verified this session.** Do not cite until read | **[UNVERIFIED]** (pointer: [review](https://www.escapistmagazine.com/backpack-hero-is-novel-addictive-and-just-a-little-repetitive-review/)) |
| **Loop Hero** | Tile placement adjacency around a closed loop | Which tiles next to which; risk vs. reward density | **Not verified this session** | **[UNVERIFIED]** |
| **Hades** (boons) | Boon *acquisition* order / prerequisites; duo boons | Which god to invest in; duo-boon eligibility | **Not verified this session** (relevant shape: gated combinations rather than positional order) | **[UNVERIFIED]** |
| **Ball × Pit** | Ball **fusions/evolutions** (combination lookup) | Which balls to pair | Community data is recipe-list based ("all ball combinations"), i.e. a lookup table, not an ordered per-hit sequence | **[UNVERIFIED]**, community guides only ([Stevivor](https://stevivor.com/guides/ball-x-pit-ball-evolutions-guide-all-ball-combinations/)) |
| **ARPG on-hit proc design** | Fixed, code-defined internal order of damage/trigger steps; players reverse-engineer it | Gear/gem ordering is a build expression, but the *engine* order is opaque | **Not verified this session**; general lesson from StS row applies: opaque fixed order ⇒ wiki-dependency | **[UNVERIFIED]** |
| **Bullet heavens generally** | Upgrades are **draft picks**, not positions | Which of 3–4 offered upgrades | Design-codex names the failure mode: "solving for the one correct build"; "linear tide, exponential build" is "#1 failure" | [hayao.dev codex](https://hayao.dev/docs/codex/genre-horde-survival) [SECONDARY] |

---

## 4. The novelty question, answered with evidence

**Question:** has a bullet heaven shipped a **player-ordered modifier rack** whose effects resolve **per kill**?

**Verdict: I found no such shipped game. Confidence: medium.** This is absence-of-evidence, and my search tooling in this environment returned thin result sets — so the honest claim is *"I could not find one"*, not *"it doesn't exist."*

**Search terms actually used** (so the Lead can re-run / extend):
`Balatro joker order left to right resolution xmult +mult developer LocalThunk` · `Balatro Blueprint copies joker to the right Brainstorm leftmost order` · `Balatro retrigger Mime Hack joker order matters design` · `Balatro joker order critique solved optimal arrangement design problem` · `"survivors-like" upgrade "order matters" modifier slot rack` · `auto-shooter survivor roguelite "left to right" upgrade resolution` · `bullet heaven "per kill" trigger build ordering design` · `survivors-like weapon order synergy resolution per enemy killed design` · `Vampire Survivors order of upgrade resolution design` · `Deep Rock Galactic Survivor upgrade order build` · `Ball x Pit ball fusion order design` · `CloverPit slot machine roguelike design order`.

**What is the nearest shipped thing, and why each is not the mechanic:**

| Candidate | Has ordered rack? | Resolves per kill? | Why it isn't the mechanic |
|---|---|---|---|
| Balatro | **Yes** (jokers, cards, both) | No — per played hand / per round | Resolution is a discrete, paused, watchable scoring event |
| Brotato | No positional order (slots unordered) | **Partially** — on-death items exist (Baby with a Beard, Cyberball, Rip and Tear) | Triggers fire but the player has no ordering agency; and the despawn interaction shows how fragile on-kill hooks are |
| Slay the Spire | Fixed internal queue; player orders card play | No | Ordering is code-defined, players can't author the resolution sequence |
| Luck be a Landlord | **Yes** (reel order) — unverified detail | No (per spin) | Between-spins decision, auto-resolved |
| CloverPit | Charm loadout, not positional | No (per spin) | Dev explicitly designed *against* a single correct configuration |
| Ball × Pit | No (fusion lookup) | No | Combination table, not sequence |

**Why the integration is genuinely new [JUDGEMENT]:** every ordered-resolution game found hides the resolution inside a **paused or discrete phase** (hand scoring, spin, turn). Every horde game found puts the player's decisions in a **draft/shop between waves**. ICARUS inverts both: ordering is authored *before/during* the run, and resolution is emitted *continuously* against a rising tide. The novelty is not "ordered modifiers" (1990s) nor "per-kill triggers" (Brotato/bullet heavens) but **ordered resolution as a live, per-event sequence**. That is also exactly the novelty that collides with readability (§5).

**Design consequence:** because there is no shipped precedent to copy readability affordances from, ICARUS has to *invent* the presentation layer for ordered per-kill resolution. Budget design time for that explicitly; it is not a polish task.

---

## 5. Legibility and attribution at speed

### 5.1 What the sources actually establish

- **Feedback exists to communicate, and juice is a delivery mechanism.** Vlambeer's *The Art of Screenshake* (Jan Willem Nijman) is the canonical talk on stacking hit-feedback (screenshake, hitstop, sound) to make actions readable and satisfying — [Internet Archive copy](https://archive.org/details/the-art-of-screenshake) **[PRIMARY talk]** [content not re-read this session; cited as the canonical source, do not quote it directly without watching].
- **Audio is a legitimate sequencing channel, not decoration.** CloverPit's developer: "We spent countless hours perfecting the **sound design and animations for each spin, click, and jackpot**"; and on the anticipation loop: players "keep **anticipating** outcomes at the slot machine, which is what makes them fun" ([Xbox Wire](https://news.xbox.com/en-us/2025/11/20/clover-pit-xbox-partner-preview/)) **[PRIMARY]**. The transferable idea: **one event = one audible tick**, and the *pitch/character* of the tick can encode *which* modifier fired. That gives a per-event attribution channel that survives a screen full of numbers.
- **Even a designed spectacle has a budget.** CloverPit's designer calls a **>1-minute** jackpot chain *rare* ("It's rare, but when it happens, it's pure chaos in the best way") — i.e. the genre treats long resolution sequences as an occasional payoff, not the baseline. [PRIMARY]
- **Balatro makes resolution watchable by scoping and ordering it.** The activation sequence is a *list a human can follow*: boss → on-played → cards left-to-right → on-scored → retriggers → held → independent ([OFFICIAL WIKI](https://balatrowiki.org/w/Guide:_Activation_Sequence)). The legibility comes from **chunking + left-to-right spatial mapping**, not from speed.
- **On the "solved" hazard specifically:** the horde-genre codex lists "Flat upgrade pool. All-stat-sticks, no synergies → every run is the same build" and "solving for the one correct build" as the thing to design *against* ([hayao.dev](https://hayao.dev/docs/codex/genre-horde-survival)) [SECONDARY]; CloverPit's dev states the same as an explicit shipped goal [PRIMARY].
- **Readability has been formalised as "attributable failure" in action-roguelites** — a 2025 Theseus thesis frames readability as designing so players can attribute *why* they died: *Readability and Designing for Attributable Failure: A Heuristic Framework and its application to Commercial Action-Roguelites* (Minenko). **[UNVERIFIED — PDF blocked by Cloudflare (HTTP 403) this session; worth one retry from a browser, this is likely the single best citation for §5.]** URL: `https://www.theseus.fi/bitstream/handle/10024/900621/Thesis_Minenko_Egor.pdf?sequence=2`

### 5.2 The readability budget — a stated estimate, not a citation

**[JUDGEMENT — treat as a hypothesis to playtest, not a fact]**
- A player can consciously attribute *named* sequential events at roughly **1–3 per second** when each event has a distinct sensory tag; beyond that they perceive **aggregate** ("things are dying") rather than **causal sequence** ("the burn resolved, then the chain, then the ×mult").
- Balatro is legible at ~10–30 joker activates per hand because they are **spatially anchored** (one slot = one location) and **paused**. A bullet heaven has neither anchor: kills are distributed across the screen and simultaneous.
- Therefore in a per-kill system, **avoid N per-kill; resolve N per *cluster*** — or accept that the player will only ever read the *aggregate* and design the aggregate to be the feedback.

### 5.3 Three-to-five concrete pitfalls of per-kill resolution, with mitigations

1. **Attribution collapse (number soup).** At 20+ kills/sec a per-kill damage number for each modifier is unreadable, and the player cannot tell which link in their chain is carrying the build. *Mitigation:* show **one aggregate number per kill**; put the *sequence* in a side-channel (a persistent vertical "rack ticker" that lights each slot in order, staying readable at any fire rate), and reserve floating numbers for outliers/crits only. Precedent: Balatro's left-to-right spatial mapping; CloverPit's sound design per event.
2. **The order becomes a solved lookup table** (Balatro's Blueprint > Brainstorm problem, §1.3). *Mitigation:* make position **contested** — position-dependent tradeoffs (range/arc/cooldown per slot, "slot 1 fires first but gains less"), and rotate the objective (damage vs. scaling vs. economy vs. survival) so no single permutation dominates. Test: does the community converge on one canonical rack within a week of playtesting?
3. **Feedback latency / DPS lying.** Per-kill resolution fans out into per-kill multipliers; if the *visible* kill doesn't match the *math* kill (despawn drops, overkill, simultaneous deaths), players lose trust. Brotato documents its version of this: capped enemies "die without dropping loot," yet "actually count as dying" and trigger on-death items ([Enemies](https://brotato.wiki.spellsandsandguns.com/Enemies)). *Mitigation:* define and **display** the resolution contract explicitly (does overkill carry? do simultaneous kills order by distance? by spawn time?), make it deterministic, and expose it in the rack UI.
4. **Order churn during a live run (APM tax).** If reordering mid-fight is optimal, you have built a rack-shuffling minigame on the wrong screen — Balatro's wiki *documents exactly this exploit* ("move your Blueprint/Brainstorm onto Mime while your final hand is scoring"), which is a symptom, not a feature. *Mitigation:* make reordering cost something (a slot "locks in" for N kills, or a cooldown), so ordering stays a *build* decision.
5. **Chain length runs away.** Ordered per-kill resolution plus a horde means any "on kill → spawn another resolve" effect risks a cascade. CloverPit celebrates a >1-minute chain as *rare spectacle*; making it the default is a frame-rate and readability disaster. *Mitigation:* hard cap chain depth per kill, and treat depth as a stat the player can see and build toward.

---

## 6. Steal / Avoid

### Steal
- **Scope ordering by activation type** (Balatro §1.1). Order only binds *within* a trigger window, so the player learns `on-kill → on-kill-modifier → on-death-explosion` windows separately instead of one flat 12-slot puzzle.
- **The "+mult left of ×mult" lesson is a *distribution law*** — teach it once, with a worked example (`40×((4+4)×2)` vs `40×((4×2)+4)`), and it is instantly graspable. This is the cheapest possible teachable ordering rule.
- **Position as a dial, not a maximiser** (Balatro's "lower score on purpose for scaling" inversion). Give at least one effect that rewards *deliberately* mis-ordering.
- **Brotato's curve bookkeeping**: per-archetype `+HP/wave` + a hard alive-cap is enough to author a rising tide without spawning more entities, and the cap creates economy pressure if despawns eat drops. Cheap, tunable, shippable.
- **Brotato's Danger knob as a single multiplicative constant** (+12/26/40/60%) and accessibility sliders that multiply — one vector for difficulty, tested by the community as "%Runs".
- **Shop-phase agency**: 4 offers, escalating rerolls, free locking, tier gates on a wave schedule, class-weighted pools. Published formulas mean you can reason about the economy before shipping it.
- **Sound as the sequencing channel** (CloverPit §5.1): one event = one tick, timbre = identity. This is the most scalable attribution channel available to a bullet heaven.
- **Design *against* the one correct build** — both CloverPit's dev and the horde-design codex name this as the goal (cited). Put it in the acceptance criteria, not the vibes doc.

### Avoid
- **Copy-joker asymmetry that produces a strict dominance** (Blueprint > Brainstorm). Any positional rule that makes one slot strictly better than another collapses the decision.
- **Making the optimal play be live rack-shuffling during resolution.** If it's optimal, players will do it, and it fights the bullet-heaven's hands-off fantasy.
- **Per-kill × per-modifier = per-event floating numbers.** Number soup; unreadable at horde density.
- **A fixed, opaque internal order** (Slay the Spire's queue, ARPG proc order). Legible but not authored by the player; if ICARUS ships an opaque order it just adds wiki homework.
- **Flat / all-stat-stick modifier pools** — the genre codex's named #1 build-diversity killer.
- **Unbounded on-kill chains** — CloverPit's minute-long jackpot is a *rare* spectacle; treat chain depth as a capped, visible stat.
- **Undocumented edge cases in the kill layer** (despawn / overkill / simultaneous death). Brotato's on-kill-items-triggered-by-despawn is a worked example of the bug class.

---

## 7. Open questions / what I could not verify

1. **No direct LocalThunk statement on joker ordering** (only the wiki's documentation of it). Primaries: [Rogueliker](https://rogueliker.com/balatro-interview/), [TouchArcade](https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/) — both truncated in this environment.
2. **Luck be a Landlord reel mechanics** — Fandom body didn't render; treat as unverified.
3. **Backpack Hero adjacency, Loop Hero placement, Hades duo-boon gating, ARPG proc order** — pointers only, not read this session. These four need a real pass before any of them appear in the design doc as precedent.
4. **The Theseus readability/attributable-failure thesis** (HTTP 403 via this environment) — likely the best single source for §5. Retry from a browser.
5. **Novelty claim is absence-of-evidence.** Search results were thin; the negative should be re-run with different tooling (Steam tag browsing, itch.io, r/survivorslike, r/roguelites) before we state "nobody has shipped this" in any external-facing document. Recommend phrasing internally as *"we found no precedent"*, and externally as *"we think this is new."*
6. **No playtest or telemetry data** on per-kill ordered resolution — all of §5.2 is judgement. It must be validated with a greybox before it is load-bearing.

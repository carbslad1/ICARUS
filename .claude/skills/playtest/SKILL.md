---
name: playtest
description: Load before or after any change to ICARUS's look, feel, controls, scoring, shop or HUD, and whenever you are about to tell the owner a build "works" or "is fixed". Runs the real ICARUS-demo.html headlessly, looks at actual screenshots of it, and reports in plain English what rendered, what happened, and what could not be proven.
whenToUse: Use when you need visual or behavioural evidence from the playable ICARUS build — after changing gameplay, visuals, balance or UI, before claiming a fix, when a build looks blank/broken, or when asked "does it work / what does it look like / did the flight happen". Not needed for pure code-only refactors that cannot touch runtime output.
---

# Playtesting ICARUS (the visual gate)

The owner cannot read code. He judges ICARUS by **playing it and looking at it**.
So every claim about how the game looks or behaves must come with a real run of
the real build and real screenshots. This skill is that gate.

## The rule

**Never claim a visual or behavioural change is good without before-and-after
screenshots.** "It should work now" is not evidence. "I ran it and here is what
I saw, in plain English" is.

A passing automated playtest proves the build **renders, starts, plays a flight,
and throws no page errors**. It does **not** prove the game is **fun, fair, or
feels good** — only the owner playing it can say that. Screenshots for the
facts; the owner for the judgement.

## Commands (copy these exactly)

```bash
# Quick health check: does the build open, start, render, and not freeze? (~20 s)
node scripts/playtest.mjs --mode play --seconds 8

# Prove the core loop: carve up, breach, apex, land back in the water
node scripts/playtest.mjs --mode flight --seconds 20

# Title screen / shop screen appearance
node scripts/playtest.mjs --mode title --seconds 3
node scripts/playtest.mjs --mode shop --seconds 3

# Hold your own keys and grab frames at chosen second marks
node scripts/playtest.mjs --mode play --keys "w:2500" --shots 1,3,6
```

After any change: run the relevant mode, then open the PNGs with the Read tool.
Before and after a change: run the same command both times, keep both folders,
compare the screenshots, and show the owner the pair.

Exit codes: 0 = passed, 1 = the playtest failed (blank frame, page error, no
launch, frozen clock — or, on `--mode flight`: no launch happened), 2 = setup
problem (run `npm ci` if it says `playwright` is missing). A setup exit does not
prove anything about the game — fix the setup first.

## Reading a run

The tool prints the screenshot folder and writes `report.json` + `summary.md`
into it. Then:

1. Open every key screenshot with the Read tool. Do not trust the brightness number as
   proof of quality — it only proves the frame is not blank.
2. Narrate what a human would see: title wordmark, dolphin, waterline, HUD
   numbers (wave, air remaining, integrity, pearls), shop offer cards.
3. If a shot is black, an error page, or a frozen canvas, call it a **failure**
   even if the exit code says 0. Human eyes outrank the automated check.
4. For flight mode, check the report's flight section: launch happened, apex
   altitude, landing happened. Every screenshot records its actual game time —
   "apex" is the frame nearest the detected apex, not an exact frame.

## Playing it yourself when asked

The tool supports a real interaction path. If the owner's question is about
*feel*, you still cannot answer it — but you can gather more evidence:

```bash
node scripts/playtest.mjs --mode play --seconds 12 --keys "w:1500,a:1200,w:2500"
node scripts/playtest.mjs --mode flight --seconds 20 --out qa/playtest/try1
```

Discovery notes for this build (verify, don't assume):

- The game opens in **free swimming**: A / D **turn**, W / Space **boost**.
  W alone does **not** launch — it drives the dolphin into the seabed.
- To launch: boost with **W** and pull the nose up with **A**. Hold A while
  `medium.heading` is below ~1.0 rad and release it at ~1.35 rad (re-press if
  the nose falls back). Two real traps: holding A forever rotates the nose past
  vertical and loops underwater; releasing A at ~0.45 rad launches only a tiny
  1–6 m hop. With the steep gate, launch comes ~2–4 s in and the verified arc
  reached ~29 m. `medium.kind` flips to `'air'` at the breach.
- The game clock can run ~5× slower than wall time under SwiftShader load.
  The tool budgets flight attempts in **game seconds**; do not replace it with
  a tight wall-clock timeout.
- Hooks: `window.icarusDemo.state`, `.version`, `.start('harpoon', 1)`,
  `.render()`, `.catalog`, `.scoreboard.state`. Read state, never guess.
- `--mode shop` opens the shop through the game's own shop hook: it is a
  **fixture for visual inspection**, not proof a player earns those offers.

## The report to the owner (plain English, no code words)

Write like this, using the real numbers from the run:

> **What I ran:** `node scripts/playtest.mjs --mode flight --seconds 20`
> (the real playable build, headless).
>
> **What I saw:** The game opened to the title screen. I started a run.
> The dolphin carved up and broke the surface about 2 seconds in, climbed to
> about 6 m above the water, and came back down in the water. The screenshot
> shows the dolphin in the air with the HUD reading wave 1, 18 s of air left
> and 100 integrity.
>
> **What this proves:** it renders, it starts, a real flight happens, and there
> were no page errors.
>
> **What I could not check:** whether it feels good or is fair. That needs you
> to play it.
>
> **Screenshots:** `qa/playtest/<stamp>/01-breach.png`,
> `02-ascent.png`, `03-apex.png`, `04-landing.png`.

Keep it jargon-free. "The game clock advanced 6.2 s" is fine; "state.wscore
incremented" is not. Lead with what the owner would see, then the numbers.

## Hard constraints

- Only `scripts/playtest.mjs` (via `npm run playtest`) may be used to look at
  the game; do not hand-write Playwright one-offs and forget them.
- Headless Chromium with `--enable-webgl --use-gl=angle --use-angle=swiftshader`
  is what the tool uses; a blank shot through those flags is a real rendering
  result, not a harness quirk.
- Never edit `ICARUS-demo.html` by hand — it is built from `source/` with
  `node source/build.cjs`. Fix the source, rebuild, then playtest.
- Do not claim a change is verified from a screenshot you did not open with
  the Read tool.

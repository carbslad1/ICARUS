# The harness, set up for ICARUS

This page explains what was changed in DeepSeek Harness so it works like a game
studio for one non-coding designer, and how to use it. You do not need to read
anything technical to use it — the short version is at the top.

## The short version

1. Start a new session.
2. Pick the preset **ICARUS Studio** (in the preset picker next to the model).
3. Set the workspace to `~/Projects/icarus-slots` if it is not already.
4. Ask for what you want in plain English, then play what it builds and say how
   it felt. That is the whole loop.

## What was added

**A preset called ICARUS Studio.** A preset is the agent's starting
configuration. This one gives the agent a different personality and a different
set of habits from the default:

- it speaks plain English and never asks you to run code or read logs;
- it reads the project's own truth files before it starts working;
- it builds one small, playable step at a time and shows you screenshots before
  claiming anything works;
- it asks at most one question at a time, and only about feel, fun, risk or
  direction — the decisions that are actually yours;
- it can run the game and look at it headlessly (`scripts/playtest.mjs`);
- it cannot accidentally change the Harness itself (the plugin tools are off in
  this preset).

It does **not** change your default preset or any other preset. If you never
pick it, nothing changes.

**Project truth files.** The repo now has a short, dated `AGENTS.md`, a
`docs/CURRENT_STATE.md` ("where we are today"), a `docs/DECISIONS.md` (every
designer decision with its date and what it replaced), and a `docs/INDEX.md`
(what every document is, and how much to trust it). A fresh session reads these
instead of guessing — and instead of being misled by the old phase notes or the
superseded parts of the big design doc.

**Four project skills.** Skills are short procedures the agent loads when a task
matches them:

| Skill | When it is used |
|---|---|
| `playtest` | before and after any visible change — runs the build, screenshots it, reports plainly |
| `design-truth` | before any design work or when documents disagree — what is locked, what is open, and how to treat the archive |
| `build-and-verify` | before saying "done" — rebuild, run the checks, restore the review files, report what was and was not proven |
| `balance-pass` | before changing a number — measure with the game's own tools, one change at a time, before/after |

They live in `icarus-slots/.dsh/skills/` and are picked up automatically; edits
take effect without restarting the Harness.

**A way to see the game.** `scripts/playtest.mjs` opens the built
`ICARUS-demo.html` in a headless browser, drives it, takes screenshots, reads the
game state and writes a plain-English summary. The agent looks at the
screenshots itself, so it can catch a black screen, a broken title, or a missing
HUD before telling you the change works. It does not replace you: it cannot judge
whether the game is *fun*.

**The project's own tools, installed.** `npm ci` was run in the game folder, so
the checks and the browser playtest can run immediately. `node_modules` is
git-ignored; nothing was added to the dependency list.

## What this does not do

- It does not make design decisions for you. The agent will bring you a
  recommendation and the trade-off, but feel, fun and direction are yours.
- It does not prove the game is fun. Only you can do that, by playing and rating
  in the Core Loop Lab.
- It does not publish or commit anything by itself. Commits stay small and
  explicit; publishing is a separate, deliberate step.

## The working loop you should expect

1. You say what you want, in whatever words are natural.
2. The agent reads the current state, then either asks you one sharp question or
   makes a small plan.
3. It makes the change small enough to judge, rebuilds, playtests, and looks at
   the screenshots.
4. It tells you: what changed, what it proved, what it could not prove, and the
   one decision worth making next.
5. You play it and say how it felt. That becomes the next step, and the decision
   is recorded in `docs/DECISIONS.md`.

## What you say to get good results

- "Show me" is a complete instruction. It means: build it, playtest it, show
  screenshots, and tell me what I am looking at.
- "Make it feel snappier" is useful. The agent will translate feel into numbers
  and then prove the change with measurements and frame-by-frame evidence.
- "I don't like it" is useful. Say what you saw or felt; the agent turns it into
  a measurable question.
- "What are my options?" gets you 2–3 concrete choices with the trade-off of each.
- If you are unsure, ask "what would you do, and why?" — then decide.

## Where everything lives

| Thing | Path |
|---|---|
| The preset definition (persona, tools, skill path) | `~/Documents/deepseek-harness/icarus-studio/cordis.patch.yml` |
| How to reinstall or remove the preset | `~/Documents/deepseek-harness/icarus-studio/README.md` |
| Project truth files | `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/INDEX.md` |
| Skills | `.dsh/skills/` |
| Visual playtest | `scripts/playtest.mjs`, `docs/PLAYTEST.md` |
| What is locked and what is open | `AGENTS.md` |

The preset definition deliberately lives **outside the game repo**, in the Harness
folder. Git worktrees come and go, and the desktop profile links directly to that
file; keeping it in a stable folder means deleting or moving the game worktree
cannot break the Harness. If you ever move that folder, reinstall the bundle.

## Maintaining it

- **Change the agent's personality or tools:** edit
  `~/Documents/deepseek-harness/icarus-studio/cordis.patch.yml`, then ask the agent
  to reinstall the bundle at that folder. New sessions pick it up; open sessions keep their old
  setup until restarted.
- **Change a skill:** edit the `SKILL.md` under `.dsh/skills/`. No reinstall is
  needed; skills are watched live.
- **Change what is true about the project:** edit `docs/CURRENT_STATE.md` (and
  record decisions in `docs/DECISIONS.md`). This is the single most valuable
  habit: every session starts from it.
- **If the game folder moves:** update the one absolute path in
  `~/Documents/deepseek-harness/icarus-studio/cordis.patch.yml` and reinstall.

## If something feels wrong

- **The preset is missing from the picker:** the Harness page may need a reload.
  If it is still missing, the bundle install did not apply; the install result
  must say `application: applied`.
- **A new session will not start:** the profile default is untouched, so switch
  that session's preset back to Standard, fix the preset, and reinstall.
- **The agent asks you technical questions:** tell it "explain that in game
  terms". That is a preset miss worth fixing in the persona text.
- **The agent claims something works without showing you:** ask "show me". The
  playtest skill exists exactly for this.

# ICARUS

A neon dolphin game. Build speed under water, breach, and fight in the air on a ballistic arc with guns that fire on their own.

**Play it:** open `ICARUS-demo.html` in a browser. It is one self-contained file.

**Work on it:** read `CLAUDE.md` first. It is the rule file for people and AI agents alike.

| Need | File |
|---|---|
| Where we are today | `docs/CURRENT_STATE.md` |
| The step plan and its checkpoint log | `docs/TRICK_LADDERS_PLAN.md` |
| The standing design rules | `docs/DESIGN_RULES.md` |
| What the designer decided, newest first | `docs/DECISIONS.md` |
| Every other document and how far to trust it | `docs/INDEX.md` |

```
node source/build.cjs      # rebuild ICARUS-demo.html from source/
node qa/gate.cjs           # quick gate, seconds
node qa/gate.cjs --full    # adds the camera and enemy rule gates, about 2 minutes
node scripts/playtest.mjs --mode flight --seconds 20   # screenshots of a real flight (needs npm ci and Playwright's Chromium)
```

`qa/legacy/` holds suites for earlier prototypes; they gate nothing. The old TypeScript build is on branch `archive/typescript-build`. The README for the October "S4" demo is in git history (commit `9f2c1d9`).

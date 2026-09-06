# Devoid — where the work stands

*Written 2026-09-06 09:08 EDT. Supersedes `2026-09-05-handoff.superseded.md`, which describes the state before the design review and is now history — if anything in your context says the app was last audited on 2026-09-04, or quotes 34 commits, that is the stale one.*

⚠️ **When this goes stale, rename it `<date>-handoff.superseded.md` and write a new one. Do not edit it in place.**

## §0 — READ THIS FIRST, IT IS A CORRECTION

**Three claims this project made about itself are false, and two of them are in files you are about to read.**

1. **The UI gate proves things EXIST, never that they are CONNECTED.** Fourteen subsystems have shipped built, tested, exported and wired to nothing. Nine green captures were taken of a seam that could not be dragged. **A green gate here is not evidence a feature works.**
2. **The design detector ran DEGRADED with no banner** on CSS-only invocations until 2026-09-06. Any detector result quoted before then is unverified. Filed in `devoid-deferred-list.md`.
3. **`DEVLOG.md`'s "~490px artwork" and its "the starfield is generated, never tiled"** are both retracted in place, with evidence. The tiled SVG still ships on every `.chk-s` surface.

## The first action

**Open `docs/superpowers/plans/2026-09-06-devoid-remediation.md` and continue at the first unchecked task.** It argues from `docs/superpowers/specs/2026-09-06-devoid-remediation-design.md`, which is the evidence register — every finding marked VERIFIED, REPORTED or RETRACTED, with the arbitration rules and the list of what must not change. **Read both. This file is a pointer, not a summary of them.**

## Where the state actually is — derive it, do not trust a number here

```sh
git branch --show-current && git rev-list --count main..HEAD && git status --porcelain | wc -l
rg -n '^### Task ' docs/superpowers/plans/2026-09-06-devoid-remediation.md   # 23 tasks, 4 stages
.venv/bin/python -m pytest -q && npm run test:coords && npm run test:wipe && npm run test:versions
npx electron scripts/capture-window.mjs                                      # the only truthful visual surface
```

⚠️ **Any commit count, test count or green suite written into prose is a claim about a tree that no longer exists.** The commands above are the answer; a number here would not be.

## How to run it

```sh
npm start            # the dev loop
npm run gate:ui      # the real-window gate — hidden window, never steals focus
npm run dist         # Devoid-1.0.0-arm64.dmg
```

## ⚠️ The traps, in the order they bite

`docs/DEVLOG.md`'s Traps section is the full account. The four that matter most:

- **Never open a browser pane.** It reports `visibilityState: hidden`, fires zero `requestAnimationFrame` callbacks, and has produced two false defect claims here.
- **Falsify the instrument before trusting a red.** `sendInputEvent({type:'mouseMove', buttons:1})` does not set `PointerEvent.buttons` — use `modifiers:['leftButtonDown']`. The first version of the seam-drag assertion reported a defect that was its own.
- **`element.focus()` does not trigger `:focus-visible`.** Press a real Tab.
- **Wait ~1s after a state change before measuring.** Transitions run 300–420ms.

## What is open

`devoid-deferred-list.md` is the tracked list and the plan is the sequenced one. **Do not reconstruct either from this file.** Every item there carries a priority, an effort, and a concrete next action; items that closed are in `devoid-resolved-list.md` with their original wording and their outcome.

## Standing orders

- **Every question goes in an `AskUserQuestion` popup, never in prose.** **Ask before dispatching any subagent** — a skill that forks counts.
- Push and merge are each asked, every time. Nothing has been pushed.
- Do not touch: the strip-is-the-app architecture, the palette, the corpus assets, the alpha checkerboard, the empty state.

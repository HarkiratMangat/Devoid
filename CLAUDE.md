# Devoid — project instructions

A local desktop app for removing backgrounds from animated images. It is a front end for the `gif-background-remover` skill at `/Applications/Claude Code/Gif-Background-Remover`, which stays the engine and the source of truth for every algorithm. Devoid reimplements no image processing.

**Read `docs/HANDOFF.md` first** — it says where the work stands and what was already rejected. Then `docs/PLAN.md` for the build order, `docs/PRODUCT.md` for the brief, `docs/DESIGN.md` for the visual system. They carry the constraints, the measurements behind them, and the visual system. This file is only what a session needs to work here.

## Conventions — inherited from Dior's Builds, unchanged

Do not invent separate conventions for this repo.

- **Working agreement:** `~/.claude/projects/-Applications-Claude-Code-Diors-Builds/memory/user_working_agreement.md`. Read it first.
- **Git lifecycle:** branch → commit → test → push → PR → merge. `main` only ever advances through a PR. **Branch commits are free. Push and merge are each asked, every time; approval never carries over.**
- **Conventional Commits v1.0.0**, only the 11 standard types, `<type>(<scope>): <description>` — colon and one space, imperative, lowercase, no trailing period. Branches are `<type>/<kebab-description>`.
- **Commit trailers:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` and `Co-Authored-By: diorswrld <310361322+diorswrld@users.noreply.github.com>`.
- **Timestamps** in docs and comments are `YYYY-MM-DD HH:MM TZ`, never a bare date.
- **Markdown is soft-wrapped** — one physical line per paragraph or list item. Check with `node "/Applications/Claude Code/Diors-Builds/scripts/reflow-prose.mjs" --check <files>`.

## The rules that are specific to this project

**Never add a control that maps 1:1 onto one of the skill's 63 flags.** The point is that the person using it does not learn them. New surface belongs in a preset (a goal) or in a question the app asks — never as a passthrough.

**Every control is tri-state.** `--auto` applies its recommendation **only where an option was left at its default**. A UI that sends all 63 flags makes `--auto` a no-op and the tool stops thinking. Controls read `auto · <value>` until deliberately taken over.

**Never infer a size target, and never report a verification the run did not earn.** Both are measured failure modes with history; `docs/PRODUCT.md` carries the evidence. "Not checked" is a first-class state with the same visual weight as done and failed.

**Every number in a preset is cited from the skill repo's own measurements.** If you cannot cite it, it does not go in. A plausible-sounding default is exactly what this design exists to prevent.

**Advice always ships with an undo** of exactly what it changed. A suggestion without one does not ship.

## Testing

**Design:** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>` must return **exactly one finding, `repeating-stripes-gradient`** — the alpha checkerboard and the hatch, both accepted (see `DESIGN.md`). Anything else is a real defect. ⚠️ It runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils`, and a degraded run returns `[]` while saying so on the line above. An empty result only counts when the header does not say DEGRADED.

**Prototype:** `cd prototype && python3 -m http.server 8731`, then open `http://localhost:8731`. ⚠️ This procedure dies at `PLAN.md` stage 0.1, which moves these files to `web/` — update this line when it does. It uses **real processed assets from the skill's corpus**, deliberately — putting real art in is what found the rubylith-over-red bug that drawn icons had hidden. Do not replace them with synthetic icons.

**Anything measured belongs in the docs with its numbers.** This project's history is that unmeasured design claims are wrong about a third of the time.

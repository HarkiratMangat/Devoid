# Devoid — project instructions

A local desktop app for removing backgrounds from animated images. It is a front end for the `gif-background-remover` skill at `/Applications/Claude Code/Gif-Background-Remover`, which stays the engine and the source of truth for every algorithm. Devoid reimplements no image processing.

**Read `docs/HANDOFF.md` first** — it says where the work stands and what was already rejected. Then `docs/PLAN.md` for the build order, `docs/PRODUCT.md` for the brief, `docs/DESIGN.md` for the visual system. They carry the constraints, the measurements behind them, and the visual system. This file is only what a session needs to work here.

**Where things are written down.** ⚠️ `docs/HANDOFF.md` is **ephemeral by design** — it gets renamed `<date>-handoff.superseded.md` and rewritten. Nothing durable may live only there. Four files are appended to rather than replaced, and they are where work belongs:

| file | holds |
|---|---|
| `devoid-deferred-list.md` | open work, tagged `[Priority · Effort · Model-effort]`. Closed items move to `devoid-resolved-list.md` — **one out here equals one in there, never a deletion** |
| `docs/DEVLOG.md` | the traps, the decisions and what was tried and walked back. **Read its Traps section before verifying anything visual** |
| `docs/CHANGELOG.md` | what shipped, `vMAJOR.MODERATE.MINOR`, one version per merged PR |
| `devoid-resolved-list.md` | the archive, with each item's original wording plus its outcome |


## Conventions — inherited from Dior's Builds, unchanged

Do not invent separate conventions for this repo.

- **Working agreement:** `~/.claude/projects/-Applications-Claude-Code-Diors-Builds/memory/user_working_agreement.md`. Read it first.
- **Git lifecycle:** branch → commit → test → push → PR → merge. `main` only ever advances through a PR. **Branch commits are free. Push and merge are each asked, every time; approval never carries over.**
- **Conventional Commits v1.0.0**, only the 11 standard types, `<type>(<scope>): <description>` — colon and one space, imperative, lowercase, no trailing period. Branches are `<type>/<kebab-description>`.
- **Commit trailers:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` and `Co-Authored-By: diorswrld <310361322+diorswrld@users.noreply.github.com>`.
- **Timestamps** in docs and comments are `YYYY-MM-DD HH:MM TZ`, never a bare date.
- **Markdown is soft-wrapped** — one physical line per paragraph or list item. Check with `node "/Applications/Claude Code/Diors-Builds/scripts/reflow-prose.mjs" --check <files>`.

## Asking

**Every question goes in a popup — `AskUserQuestion` — never in prose.** Including "want me to also…". A question set in a paragraph under a report gets read as commentary and answered by silence.

This is a standing preference, stated at the top of the first session here (*"Ask questions as popups, not in prose"*), restated as a correction (*"Any questions for me should always be askuserquesuton popups, you always know that…"*), and written into the silent output style. **It is recorded here because it kept being broken while living only in session instructions** — three times, most recently by putting four open design decisions in a prose list at the end of a long report.

**Ask before dispatching any subagent**, every time. Approval for one dispatch never carries to the next. ⚠️ A skill that forks — `/code-review`, `impeccable critique` — is a subagent dispatch; flag it before invoking, not after.

## The rules that are specific to this project

**Never add a control that maps 1:1 onto one of the skill's 63 flags.** The point is that the person using it does not learn them. New surface belongs in a preset (a goal) or in a question the app asks — never as a passthrough.

**Every control is tri-state.** `--auto` applies its recommendation **only where an option was left at its default**. A UI that sends all 63 flags makes `--auto` a no-op and the tool stops thinking. Controls read `auto · <value>` until deliberately taken over.

**Never infer a size target, and never report a verification the run did not earn.** Both are measured failure modes with history; `docs/PRODUCT.md` carries the evidence. "Not checked" is a first-class state with the same visual weight as done and failed.

**Every number in a preset is cited from the skill repo's own measurements.** If you cannot cite it, it does not go in. A plausible-sounding default is exactly what this design exists to prevent.

**Advice always ships with an undo** of exactly what it changed. A suggestion without one does not ship.

**Two append-only logs, two schemas, one writer each.** `labels/protection.jsonl` records the engine's hardest decision and may be analysed on its own; `jobs.jsonl` records your work. They look alike and must not be merged. No database until a lookup is measurably slow, and if one arrives it is a SQLite index **rebuilt from the log**, so the log stays the truth and a schema change never needs a migration.

⚠️ **`labels/protection.jsonl` is pointed at from the skill repo** (`scripts/harness/labels/README.md`) because nothing there would otherwise surface it. **If this path moves, fix that pointer.**

## Testing

**Design:** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>` must return **exactly one finding, `repeating-stripes-gradient`** — the alpha checkerboard and the hatch, both accepted (see `DESIGN.md`). Anything else is a real defect. ⚠️ It runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils`, and a degraded run returns `[]` while saying so on the line above. An empty result only counts when the header does not say DEGRADED.

✅ **AND THE THREE RULES THAT WERE INERT ARE NOW LIVE (2026-09-06 20:54 EDT).** `design-system-font`, `design-system-color` and `design-system-radius` fire only when `DESIGN.md` declares a palette and a type stack in the format the parser reads. It did not until `/impeccable document` merged a frontmatter and canonical `## Colors` / `## Typography` sections into `docs/DESIGN.md`. **Before:** a file with `#FF00FF`, `#7C3AED`, `border-radius:17px` and Comic Sans returned **0 findings**. **After:** it returns **4**, one per rule. Turning them on immediately found **15 real violations** in the shipped surface — undocumented literals inside three gradients, four radius values across a 9px range, and a `#04212A` hardcoded four times beside the `--go-ink` token that existed for it. All fixed; the count is one again, and now it means what it says.

**Front end:** `cd "/Applications/Claude Code/Devoid" && npm start` launches the real app (Electron main spawns the server and opens the window). It uses **real processed assets from the skill's corpus**, deliberately — putting real art in is what found the rubylith-over-red bug that drawn icons had hidden. Do not replace them with synthetic icons.

**Anything measured belongs in the docs with its numbers.** This project's history is that unmeasured design claims are wrong about a third of the time.

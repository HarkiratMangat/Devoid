# Handoff

*Rewritten 2026-09-06 22:44 EDT. ⚠️ This file is EPHEMERAL by design — it gets renamed `<date>-handoff.superseded.md`. Nothing durable may live only here. The four tracked carriers are named in `CLAUDE.md`.*

## §0 — Correction, before anything else

**If your context says the app's design was verified, or quotes "exactly one detector finding" as a full check — that is stale.**

Three of the detector's rules — `design-system-font`, `design-system-color`, `design-system-radius` — were **structurally inert** until 2026-09-06, because `docs/DESIGN.md` declared its palette and type stack in prose rather than in the format the parser reads. **Falsified:** a file containing `#FF00FF`, `#7C3AED`, `border-radius:17px` and Comic Sans returned **0 findings**, run twice. Every "exactly one finding" recorded before today is true about the rules that ran and silent about three that did not. Turning them on found **15** real violations in the shipped surface.

**And the interface has now been reviewed by something other than its author, for the first time.** `/impeccable critique`, dual-agent, scored it **25/40 — "Acceptable, significant improvements needed"** with one P0 and five P1s. They are filed in `devoid-deferred-list.md`, not here.

## State

Branch `feat/devoid-v1`, never pushed. ⚠️ **Derive it, do not trust a number written here** — a count in prose is a claim about a tree that no longer exists:

```bash
git rev-list --count main..HEAD && git status --porcelain | wc -l
.venv/bin/python -m pytest -q && npm run test:coords && npm run test:wipe && npm run test:versions && npm run test:hooks
npm run check:contrast && npm run check:greyscale && npx electron scripts/capture-window.mjs
node ~/.claude/skills/impeccable/scripts/detect.mjs --json web/index.html web/app.css web/app.js
linksee-memory map status          # the product map's own verdict on the code
npm run refresh:index              # both indexes + the graph are SNAPSHOTS
```

The 27-task remediation plan is **complete**. What is open is what the critique found, plus the tracker's standing items.

## Next

1. **The P0 first** — `devoid-deferred-list.md`, top item. `map explain seam` already encodes both halves of it as failing checks, so the verify condition is written and runnable before you start.
2. Then the five P1s in the same file, in order.
3. `.impeccable/critique/2026-09-07T01-08-32Z__web-index-html.md` is the full critique — the tracker carries the actions, that file carries the reasoning and the persona findings.

## What NOT to carry

⚠️ **Do NOT carry "the `/linksee:*` slash commands do not route".** That claim is in `~/.claude/TOOLING.md:159` and it is FALSE — Harkirat produced a screenshot of the `/` menu listing all five, labelled `(MCP)`. Worse, the note was written at 18:28 on 2026-09-06, **two minutes after** `~/.claude.json`'s linksee entry was changed from `npx -y linksee-memory` to `/opt/homebrew/bin/linksee-memory` at 18:26:24 — so a possible regression was recorded as a pre-existing limitation. Verified 2026-09-06 23:02 EDT: ONE registration, not two (the "double registration" theory is dead), and both spellings serve the same five prompts to a stdio probe. The Diors-Builds session "Portal step 3 completion handoff" is diagnosing it; the note prepared for it is `linksee-routing-note.md` in this session's scratchpad.

Do not reproduce the critique, the plan, or the tracker into a new document. Point at them. `docs/superpowers/plans/2026-09-06-devoid-remediation.md` and its spec remain the record of how the 27 tasks were decided, including four places the plan was **wrong** and running it proved so.

## Unilateral decisions — mine, unreviewed, and named as such

These shipped on my judgement and nobody has looked at them. They are neither approved nor unbuilt.

- **The contact sheet dims every non-demanding tile** (`brightness(.55) saturate(.65)`) so state wins the squint test. It dims real artwork on a navigation surface; nothing dims on the stage. Margin went 0.4 → **73.0**/255.
- **The `Answer` button was kept** while the critique argues it should be deleted. I filed the argument rather than acting on it.
- **`--t-figure` (34px) on the ledger's removed-pixel count.** A large jump, chosen because it is the first number worth looking at.
- **The North Star holds two metaphors** ("The Void and the Bench — lit by an accretion disk") because both were confirmed true. The spec wants one.

## Traps this session paid for — the full list is `docs/DEVLOG.md`

⚠️ **A gate that proves EXISTENCE is not a gate.** It happened again inside the tool brought in to catch it: the `seam` map node was declared `suspect`, its check asked only whether `wipe.js`'s functions exist, and the reconciler **refuted the suspect status and returned convergence** — laundering a P0 into a green tick.

⚠️ **Never read `$?` after a pipe** — it reports the last command's status. `VERIFY_EXIT=0` printed over output that said `file added:`.

⚠️ **`ctx_execute` CAPTURES, `ctx_search` FILTERS.** Narrowing inside a capture discards the rest from the index permanently, for zero context saving.

⚠️ **The linksee SKILL.md teaches four tools that do not exist** — upstream bug at 0.11.5, patched locally with a header a `--force` reinstall will remove.

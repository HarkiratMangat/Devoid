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

## Tool routing — the three memory and search layers

*Written 2026-09-06 21:03 EDT, after reading each skill's own instructions and verifying each one live in this repo. The rule that produced this section: **verify by QUERY, never by the tool's success line** — `ctx_index` cheerfully reports "Indexed 29 files" for a badly-labelled index, and `list_projects` returns `{"projects":[]}` for a corrupt one with a friendly hint that is indistinguishable from never-indexed.*

**Look up the situation, not the tool.** The right-hand column is the fallback, not an equal option.

| situation | reach for | not |
|---|---|---|
| "Where is X defined? What calls it? What breaks if I change it?" | `search_graph` → `trace_path(direction:"both")` → `get_code_snippet` | `rg` and hand-tracing |
| **Any read of a file you will not `Edit`** — the first one included | `mcp__linksee__read_smart` | `Read` |
| A question about this repo's own prose (docs, rules, plans) | `ctx_search({source:"project:devoid-docs", queries:[…]})` | `rg` — measured elsewhere at **0 files for 3 of 4** natural-language questions |
| Read a file to analyse rather than edit it | `ctx_execute_file(path, language, code)` | `Read` — the bytes never need to enter context |
| Run anything whose output could exceed ~20 lines | `ctx_batch_execute(commands, queries)` | `Bash` |
| Before starting a task, or before touching a file with history | `mcp__linksee__recall({query})` / `recall({path})` | starting cold |
| After a compact, "what were we doing?" | `ctx_search({queries:["summary"], source:"compaction", sort:"timeline"})` | asking the user |
| Fetch a URL | `ctx_fetch_and_index(url, source)` | `curl` / `WebFetch` — **both are intercepted and blocked** |

⚠️ **`Read` and `Edit` stay correct for the file you are about to change.** `Edit` needs the exact bytes in context to match against. The routing above is for *analysis*, not for editing.

### context-mode

**Source labels are the only discriminator.** `source_category` exists in the FTS5 schema and is NULL on every row, so an unlabelled index is indistinguishable from this repo's own code. The convention is **`project:devoid-<area>`** for this repo's files and **`vendor:<name>`** for third-party documentation. Measured elsewhere: 310 of 596 sources labelled by raw path, 110 files indexed twice, **3,404 duplicate chunks** returning the same text to every query.

⚠️ **`ctx_execute` CAPTURES; `ctx_search` FILTERS. Never narrow inside the capture.** A `head`, `sed -n` or `awk` filter inside `ctx_execute` permanently discards the rest from the index **for zero context saving**, because large stdout is auto-indexed rather than returned inline. Run the command in full; do every narrowing step downstream. A `ctx_execute` that greps is a grep wearing a costume, and no gate sees it.

- **Batch, and set `concurrency`.** `ctx_batch_execute(commands, queries)` runs everything and returns matching sections in one round trip. Use `concurrency: 4-8` for network work, **1** for anything CPU-bound or sharing state (a build, a test run, two writes to one repo).
- **Re-indexing the same `source` REPLACES; it does not append.** Re-indexing is safe and cheap.
- ⚠️ **`ctx_index` is a snapshot with no change detection.** There is no `detect_changes` equivalent, and this repo has no re-index hook — so a stale index serves last month's text under a real heading. Re-index before trusting a query about anything that moves.
- **`ctx_purge` is scoped**: `{confirm:true, sessionId:"…"}` wipes one session; `{confirm:true, scope:"project"}` wipes this project's whole knowledge base. It is **not** cross-project. There is no undo.
- **`ctx_stats` is a per-session savings report, not a source list.** Nothing enumerates labels; discover one by running a search and reading the labels that come back. When it is run on purpose, its entire output is pasted verbatim — summarising it violates its own skill.

**Verified 2026-09-06 21:03 EDT:** `ctx_doctor` returns `[OK]` on every check — v1.0.169, FTS5 native module PASS, all six hooks configured.

### codebase-memory

**This repo is indexed as `Applications-Claude-Code-Devoid` — 1,384 nodes, 4,089 edges.** Verified by query, not by the indexer's own line: `search_graph(query:"render question regions")` returns `renderQuestionRegions` at `web/app.js:461`.

⚠️ **`index_repository` DOES NOT WORK through the MCP tool.** It reports `"Indexing worker crashed on a file"`, which is false: the MCP tool takes `project_path` and the worker requires `repo_path`, which it never receives. Re-index with the CLI:

```bash
~/.local/bin/codebase-memory-mcp cli index_repository --repo_path "/Applications/Claude Code/Devoid"
```

⚠️ **Three spellings for one argument** — `--repo_path` (CLI) · `project_path` (MCP `index_repository`) · `project`, which is a NAME not a path (`search_graph`, `trace_path`, `detect_changes`). When it fails, the real error is in `~/.cache/codebase-memory-mcp/logs/.worker-<pid>.log`, never in the returned hint.

- `search_graph` before `trace_path` — tracing needs the exact name, and `search_graph(query:…)` does BM25 with camelCase splitting.
- `direction:"both"` — `"outbound"` misses cross-service callers.
- Results page at 10 by default; check `has_more` and use `offset`. `query_graph` caps at 200 rows.
- **Re-index after a branch's worth of work.** The graph is a snapshot; it does not follow edits.

### linksee

**This repo is entity `Devoid` (`project`), momentum 4.85, 46 memories** — the Stop hook writes automatically; **reads require you to pull.**

⚠️ **THE SKILL FILE TEACHES FOUR TOOLS THAT DO NOT EXIST, AND REINSTALLING DOES NOT FIX IT.** `~/.claude/skills/linksee-memory/SKILL.md` names `list_entities` (its "Task Start" step), `recall_file` (its "File Edit" step), `update_memory` (its update step) and `consolidate` (its tidy-up step) — 16 mentions in all. All four were merged away in v0.7.0–v0.11.x.

**This is an UPSTREAM doc bug at 0.11.5, not a stale install.** Verified 2026-09-06 21:05 EDT: the package is `linksee-memory@0.11.5`, the server reports `v0.11.5`, and the skill file was already force-reinstalled on 2026-09-06 18:27 — it still teaches all four. ⚠️ Separately worth knowing for the next package update: **`install-skill` SKIPS rather than upgrades**, so `--force` is required or the file silently stays a month old.

**The server answers a removed tool with a migration hint rather than silence** — `{"ok":false,"error":"Tool \"list_entities\" was merged in v0.7.0. Migration: recall() with no params"}`, `isError: true`. So calling one is a wasted round trip that self-documents, not a silent failure. The live equivalents:

| the skill file says | actually call |
|---|---|
| `list_entities({kind})` | `recall({})` — no params is entity overview |
| `recall_file({path_substring})` | `recall({path:"app.js"})` |
| `update_memory({memory_id, content})` | `remember({memory_id, content})` |
| `consolidate({scope, min_age_days})` | nothing — it runs automatically |

- **Recall by `query`, not by `entity_name`.** Entity attribution is path-derived, so memories scatter across entities named after folders and entity-scoped recall **under-returns silently**. On write, always pass `entity_name` explicitly.
- **Queries are keywords, not sentences.** `recall({query:"seam drag caveat", layer:"caveat"})` works; `recall({query:"what happened last time"})` matches everything.
- **`content` is a JSON string carrying three axes** — `altitude` (mission/strategy/architecture/implementation), `type` (question/comparison/decision/work/outcome/learning/note), `state` (open/decided/in_progress/done/stalled/parked/superseded) — plus `title`, `what`, `why`, and `affects`. A decision also needs `agent_proposal` and `user_approval_scope`: what was proposed, and **what exactly** was approved.
- **`caveat` is auto-protected and can never be deleted or demoted.** Record one the moment something fails, not at the end. `importance >= 0.9` pins a memory in any layer.
- ⚠️ **Never store raw chat.** "yeah do it all" is not a memory; the extracted scope is.
- **Auto-captured memories arrive undistilled.** The Stop hook has no LLM, so it stores raw utterances with `needs_distill: true`. `dream()` returns them as a `distill_queue`; rewriting one **requires `"distilled": true` in the JSON**, or the next session's re-import silently resurrects the raw text.
- **`read_smart` on the FIRST read too.** That read builds the AST chunk map every later one is ~50 tokens against, so routing it costs nothing. ⚠️ The "only for re-reads" framing is measured elsewhere as the reason it went unused for a whole session — it is wrong, and it was in the first draft of this section.
- **Read the `memory://caveats` RESOURCE before significant work.** It is a resource, not a tool, and it is the docs' own advice.
- **A `caveat` is ONE SENTENCE, verb-first.** It is protected forever, so a paragraph is the wrong shape for something that will be read a hundred times.
- ⚠️ **`where_am_i` and `drift_status` need a `map.yaml` at the repo root, and this repo has none** — so they return nothing here. That is unconfigured, not broken.

### Keeping the two snapshots fresh

**Neither layer has change detection**, so both serve last week's text under a real heading with a real path. `npm run refresh:index` re-indexes all three sources; run it after a branch's worth of work and before trusting any query about something that moved. Measured: the graph went **1,384 → 1,406 nodes** inside one session.

⚠️ **Three defects the script found in itself, each of which reported success:**

| symptom | cause |
|---|---|
| Two content DBs, and a `ctx_search` scoped to one could not see the other | `--project` defaults to the **indexed directory**, not the repo. Pass `--project "$ROOT"` on every call |
| `cap reached at 20 files`, then `at 40`, still printing "Indexed" | the CLI's default extension allowlist includes **source files**, so the prose index was pulling in `server/*.py` |
| — | fixed with `--ext .md`. Code belongs in the graph, which answers structural questions properly |

**The ADR is written** (`manage_adr`, 8 sections) from `get_architecture` plus the repo's own decisions. One finding in it is worth repeating here: Leiden clustering identifies `web/advice.js` as a **6-member cluster at cohesion 1.0** — perfectly isolated — which is why a stale palette shipped in it while three nightly detector runs scanned only `index.html`, `app.css` and `app.js`. **Scope a detector run by the graph's clusters, not by the files you happened to edit.**

### The product map — `map.yaml`, and it is a gate

Built 2026-09-06 21:44 EDT. `map.yaml` at the root declares how value reaches the person: **6 stages, 17 nodes, 18 typed edges**, each node carrying a `reality` block the reconciler runs against the code. **The verdict overrides the hand-declared status**, so a node cannot claim to work while the code says otherwise.

```bash
linksee-memory map status              # health, and what needs attention
linksee-memory map where web/wipe.js   # which node owns this file + blast radius
linksee-memory map explain seam        # declared vs reality, with file:line evidence
linksee-memory map reconcile           # re-run every check
```

⚠️ **A node is reachable by file ONLY through `reality.path`.** ⚠️ **`where_am_i` needs `project: "devoid"`** — two maps are imported on this machine and the no-arg form cannot yet tell which repo you mean.

⚠️ **A check is only as honest as its signal, and the first two drafts proved it both ways.** `question`'s `signal_absent` named the prose *"The place outlined in"* and fired on the **comment** that records what the string used to be — a true positive for the checker, a false one for the product; it now names the template expression, which only live code can contain. And `seam` was declared `suspect` while its check asked only whether `wipe.js`'s functions exist — so the reconciler **refuted the suspect status and returned convergence**, laundering a P0 into a green tick. Existence was never the question. Its checks now assert that `.qregion` is clipped by the seam and that the seam does not open at a constant, and it reports **divergence** with the evidence.

**The North Star is anchor #10** (`declare_anchor`, `node_type: north_star`), and the `question` and `tri-state` nodes link to it by id. ⚠️ Anchors **8** and **9** are superseded: a malformed parameter tag in the calling syntax was absorbed into the statement text, twice. Read back what an anchor actually stored before trusting it.

### The hooks that make the routing above actually happen

*Added 2026-09-06 22:41 EDT. Prose does not change behaviour — measured on this machine: `grep` **788x** against `rg` **4x** on a rule written down for months, and this file's own author broke two written context-mode rules while both were loaded.*

| hook | fires on | does |
|---|---|---|
| `ctx-index-refresh.sh` | PreToolUse, `ctx_search` | re-indexes both prose corpora, content-hash gated, **before the read**. Freshness only matters at the instant of a read |
| `ctx-search-nudge.sh` | PreToolUse, Bash | a multi-word `rg` at `docs/` — the one case measured as `ctx_search` winning |
| `codebase-memory-nudge.sh` | PreToolUse, Bash | a symbol-shaped `rg` at `web/`, `server/`, `scripts/`. ⚠️ **UNMEASURED**, and its own message says so |

**All three carry the conventions in their message text**, so the correction arrives at the moment of the mistake rather than in a file that gets skimmed. **None blocks.** `npm run test:hooks` asserts both directions — a nudge that cannot stay silent is noise; one that cannot fire is decoration.

⚠️ **A hook that emits `hookSpecificOutput` WITHOUT `hookEventName` is silently discarded** — it runs, exits 0, prints valid JSON, and reaches nobody. The tests assert the field.

### What this repo still does NOT have

- **No index-refresh HOOK.** `npm run refresh:index` exists and must be run deliberately; Diors-Builds fires the equivalent on `PreToolUse`. Registering one here edits `.claude/settings.json`.

*Setup completed 2026-09-06 21:18 EDT: prose indexed as `project:devoid-docs` and `project:devoid-rules`, code graph at 1,406 nodes, ADR written, `memory://caveats` read (143 protected), Devoid's four items drained from linksee's distill queue.*

## Testing

**Design:** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>` must return **exactly one finding, `repeating-stripes-gradient`** — the alpha checkerboard and the hatch, both accepted (see `DESIGN.md`). Anything else is a real defect. ⚠️ It runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils`, and a degraded run returns `[]` while saying so on the line above. An empty result only counts when the header does not say DEGRADED.

✅ **AND THE THREE RULES THAT WERE INERT ARE NOW LIVE (2026-09-06 20:54 EDT).** `design-system-font`, `design-system-color` and `design-system-radius` fire only when `DESIGN.md` declares a palette and a type stack in the format the parser reads. It did not until `/impeccable document` merged a frontmatter and canonical `## Colors` / `## Typography` sections into `docs/DESIGN.md`. **Before:** a file with `#FF00FF`, `#7C3AED`, `border-radius:17px` and Comic Sans returned **0 findings**. **After:** it returns **4**, one per rule. Turning them on immediately found **15 real violations** in the shipped surface — undocumented literals inside three gradients, four radius values across a 9px range, and a `#04212A` hardcoded four times beside the `--go-ink` token that existed for it. All fixed; the count is one again, and now it means what it says.

**Front end:** `cd "/Applications/Claude Code/Devoid" && npm start` launches the real app (Electron main spawns the server and opens the window). It uses **real processed assets from the skill's corpus**, deliberately — putting real art in is what found the rubylith-over-red bug that drawn icons had hidden. Do not replace them with synthetic icons.

**Anything measured belongs in the docs with its numbers.** This project's history is that unmeasured design claims are wrong about a third of the time.

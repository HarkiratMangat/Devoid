# Devoid — deferred list

The project-local tracker for open work, real TODOs, and reminders specific to this repo. Created 2026-09-05 00:07 EDT, following the conventions of `/Applications/Claude Code/Gif-Background-Remover/gif-deferred-list.md` — same tags, same conservation rule, same "open work only" split. `/Applications/Claude Code/meta-deferred-list.md` stays the canonical home for things with no single-project home; this one is for anything a session working *only* in Devoid would need.

**Why it exists.** Every item below spent this repo's first build session as prose in a session transcript or in `docs/HANDOFF.md`, which is a file that gets **superseded and renamed** by design. A tracker that survives its own handoff is the difference between deferred work and forgotten work.

**This file holds OPEN work only.** Closed items move to `devoid-resolved-list.md`.

**The conservation rule — one item removed here MUST equal one item added to `devoid-resolved-list.md`.** Never delete an item; move it, keeping its original wording and adding the outcome. ⚠️ **Unenforced here.** The gif repo gates this with `python3 scripts/audit_docs.py --diff <base>`, because "tidying" and "deleting" look identical in a diff. Devoid has no equivalent yet — that is item 14 below, and until it lands the rule is honour-system.

**Priority & effort tags** (canonical legend at `meta-deferred-list.md`): every open item carries `[Priority · Effort · Model-effort]`.
- **Priority:** P0 now (broken/blocking) · P1 soon · P2 eventually (real, not pressing) · P3 someday.
- **Effort:** XS minutes · S part of a session · M a session · L its own multi-session job (must carry a named first slice).
- **Model+effort:** from the priority-tier grid in the meta file, not from the effort tier.

**Related trackers.** The engine is a separate repo with its own list: `/Applications/Claude Code/Gif-Background-Remover/gif-deferred-list.md`. **No item about image processing belongs here** — Devoid reimplements none of it (`CLAUDE.md`). Items where Devoid is the *consumer* of an engine gap are filed in both, with a pointer each way.

---

## 🐞 Open — real TODOs with an available fix, not yet done

*Ordered by priority, P1 first.*

### `[P1 · M · Opus5-High]` The wipe has nothing to compare on the common path, and the blocker is a route that does not exist *(filed 2026-09-05, from the design audit)*

The seam is the product's thesis — two answers on one clock, so you judge an edge instead of trusting a claim. On the common path it currently shows **one image and says "not cut yet"**, which is honest and is not the thesis.

It refuses to lie deliberately: `web/app.js` gates the cut side on `j.output_path.includes('/web/assets/')`, so an output written anywhere else is not claimed as cut. **That gate is correct and must not be widened.** The real gap is underneath it: **`docs/API-CONTRACT.md` has no thumbnail or output-file route at all**, so a render written outside `web/` cannot be served to the browser under any circumstances.

**Two candidate fixes, and they are not equivalent.** (a) Add a served-output route to the contract — the smaller change, and it makes every rendered asset comparable, not just the wipe. (b) Wire the answer-pair preview (`POST /api/assets/{id}/preview`, which already returns `a_url`/`b_url` and works) into the default view rather than only into the question flow. **(b) is closer to the thesis** — answer-A against answer-B is what `server/preview.py`'s own header says a before/after cannot do — but it only applies to assets that *asked* a question. Most do not. The honest answer is probably both, (a) first.

⚠️ **Do not "fix" this by comparing source against output and calling it the seam.** `server/preview.py:1-20` records why that pair cannot discriminate, and `docs/PLAN.md` 3.3 records that the prototype's version of exactly that mistake looked finished.

### `[P1 · M · Opus5-High]` No automated test covers the UI — at all *(filed 2026-09-05)*

**93 pytest pass and not one of them touches a line of `web/`.** They are Python: server routes, the validation boundary, the two logs, a real render through the subprocess. The only frontend tests are two pure-maths suites with no DOM — the coordinate round-trip (267 assertions) and the wipe frame clock (14). Every visual and behavioural claim about the surface rests on inspection.

This is the single largest hole in the project's evidence, and it is what made a related failure possible: **"93 pytest passed" was reported on commits that changed only CSS** — true, and evidence for a claim nobody made.

**Concrete first slice, and it is small:** `scripts/capture-window.mjs` already drives the real Electron window and captures six states through `webContents.capturePage`. Turning it from a screenshot tool into a **gate** — assert the diagnostics it already prints (region canvas non-zero, starfield sized, no console errors), then compare each PNG against a committed baseline — is most of a real UI test for the cost of an exit code. ⚠️ Pixel baselines are brittle; start with the assertions, which cannot be flaky, and add image comparison only where a stable region justifies it.

### `[P1 · S · Opus5-Med]` `content_type` is permanently `"unknown"` in every label row *(filed 2026-09-05)*

`labels/protection.jsonl` is framed in `docs/PRODUCT.md` as a training dataset for the engine's hardest decision, and its schema allows `icon|sticker|emoji|unknown`. Nothing in the flow ever classifies one: `server/labels.py:158` defaults `content_type="unknown"` and no caller overrides it. **A corpus where one column is always the same value is measurably weaker than its schema implies.**

Not a bug — the value is legal, and the log's other columns are real. **It is a product decision, not a code fix:** is content type asked of the person (one more question in a flow whose whole design is asking fewer), inferred from the source path or a corpus manifest, or dropped from the schema because nothing can honestly fill it? ⚠️ Dropping a column from an **append-only** log is not free; existing rows keep it.

⚠️ **This path is pointed at from the engine repo** (`scripts/harness/labels/README.md`), per `CLAUDE.md`. If the schema moves, fix that pointer.

### `[P1 · S · Sonnet5-High]` Every render pays for a second full analysis the app already ran *(filed 2026-09-05)*

`server/render.py:143` builds every render argv through `cli.build_argv(..., auto=True)`, which always emits `--auto`. `--auto`'s pass 1 is `recommend()`, which is the same analysis `POST /api/assets/{id}/analyze` already ran and stored on the asset. **So the engine recomputes, per render, an answer Devoid is holding in memory** — measured in the engine repo at 39–47% of a run's cost, ~18s on a corpus asset here.

⛔ **Do not fix this by dropping `--auto`.** `--auto` is what makes the tri-state controls mean anything — `CLAUDE.md`'s rule is that a UI which sends all 63 flags turns `--auto` into a no-op and the tool stops thinking. The saving has to come from the engine accepting a precomputed analysis, not from the app declining to ask for one.

**Cross-repo:** the engine-side item is `[P1 · S · Opus5-High]` "`--auto` recomputes pass 1's analysis in pass 3" in `gif-deferred-list.md`, with a ready-to-build plan (`docs/plans/2026-09-01-analysis-cost-and-observability.md` Task 1). That fix is internal to one process; **this item is the cross-process version of it and needs its own surface** — most likely `--auto --analysis-json <path>`, symmetrical with the `--verify-json` already filed there.

### `[P1 · M · Opus5-High]` The `.app` is not standalone — it carries no Python *(filed 2026-09-05, `PLAN.md` 6.3)*

`npm run dist:dir` produces `dist/mac-arm64/Devoid.app`, it launches, and **it only runs from this repo**: `main.js` spawns `.venv/bin/python` relative to its own directory. On any other machine it opens a window and fails at the spawn.

**The work:** bundle an interpreter (`pyinstaller` over `server/app.py`, or a vendored embeddable Python dropped in via `extraResources`), and give it the environment check from `docs/PLAN.md` 0.3 as its failure path — a missing engine must say so in the window, not die in a spawn. ⚠️ **This now also owns where the logs live.** `server/jobs.py:25` and the labels writer both resolve their paths from `REPO_ROOT`, which stops meaning anything the moment the app leaves this repo. A standalone build has to write to `~/Library/Application Support/Devoid/` — decided when `jobs.jsonl` was untracked on 2026-09-05, where ignoring it was the right small fix and relocating it was correctly judged too big for a docs session.

⚠️ **Do not describe the current build as standalone anywhere**; `README.md`'s Packaging section is written to prevent exactly that and should stay that way until this closes.

### `[P1 · S · Sonnet5-Med]` Two windows, one log — there is no single-instance lock *(filed 2026-09-05, `PLAN.md`'s own edge-case table, still unowned)*

`main.js` never calls `app.requestSingleInstanceLock()`. Two Devoid windows means two servers, two ports (the probe handles that fine) and **two writers to `jobs.jsonl` and `labels/protection.jsonl`** — "two append-only logs, one writer each" is a schema rule in `CLAUDE.md`, not an enforced one. `server/journal.py` takes an `flock` for the crash journal's whole-file rewrite; the two append-only logs have no such guard.

**Two acceptable answers:** a single-instance lock in `main.js` (second launch focuses the existing window), or line-atomic `O_APPEND` writes so concurrent appends interleave safely. ⚠️ **The second is not automatic** — a POSIX append is atomic only below `PIPE_BUF`, and a label row with a bbox and a long path can exceed it. Prefer the lock, which is four lines.

### `[P2 · M · Opus5-High]` Emitting mode is the weaker of the two states *(filed 2026-09-05, from the interface-design squint test)*

The void (dark) state is the designed one. Emitting (light) passes every measurement — contrast, focus-ring, hit targets — and still **loses tile separation under a squint** in the places the shadow fix did not reach: the edge rail and the film strip. Two depth strategies coexist by design here (borders on dark, shadows on light, recorded in `.interface-design/system.md`), which is a deliberate exception to "choose one and commit"; this item is that exception not being carried all the way through.

**Concrete next action:** run the squint test on the real window, both states, and extend the light-mode shadow scale to the two components that were missed rather than adding borders back — borders on light is the thing the strategy split exists to avoid.

### `[P2 · S · Sonnet5-High]` `prefers-reduced-motion` is written and has never been exercised *(filed 2026-09-05)*

Five `@media (prefers-reduced-motion:reduce)` blocks exist in `web/app.css`, covering the global transition kill, the horizon ring, and three more. **Neither surface available during the build could emulate the preference**, so every one of them is unverified code. ⚠️ A reduced-motion rule that is wrong is worse than one that is absent — it is the one path a motion-sensitive user cannot work around.

**Concrete next action:** Electron's `webContents.debugger` can set `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`; add it as a seventh state to `scripts/capture-window.mjs`.

### `[P2 · S · Sonnet5-High]` Signing and notarisation are configured and have never run *(filed 2026-09-05, `PLAN.md` 6.2)*

Five environment variables drive both paths and **all five are deliberately unset** — the user's own choice; there is no certificate and no Apple ID. Unsigned local builds work. ⚠️ **`build/entitlements.mac.plist` is the thing most likely to bite on a first signed build**: without the right entitlements a signed build launches and then fails at the Python spawn, which looks exactly like a server bug. The file is written for that case and has never been tested against it.

⛔ **Never fabricate signing credentials to make this testable.** The variables stay unset until real ones exist.

### `[P2 · S · Opus5-Med]` The contact sheet has never been seen with a real batch *(filed 2026-09-05)*

`docs/PRODUCT.md`'s claim is that "one, twelve and two hundred are the same layout". Cards grew to 228px during the redesign, which looks right against the corpus's eight assets and **may be waste at twenty**. Nobody has made that judgement with a real batch, and the void ground makes a sparse sheet read as atmosphere rather than as emptiness — which is flattering in exactly the wrong direction.

**Concrete next action:** capture the sheet at 8, 20 and 60 real assets through `scripts/capture-window.mjs` and look. This is a judgement call that needs an image, not a measurement.

### `[P2 · S · Sonnet5-High]` No screen reader has ever run against this app *(filed 2026-09-05)*

Every accessibility finding — six were fixed — came from **markup and computed accessible names**, never from an actual AT run. Roles, names and states are present and correct as written; whether VoiceOver announces the eleven states, the roving-tabindex region tools and the seam usefully is unknown.

**Concrete next action:** a VoiceOver pass on the three flows that matter — open an asset, answer a question, save — and record what it says, not whether it "works".

### `[P2 · M · Opus5-High]` 200 assets decoding at once, and the loading state does not mean anything yet *(filed 2026-09-05, `PLAN.md`'s edge-case table, owner 2.2)*

The contact sheet renders every asset as a looping `<img>` at full source resolution. At corpus size that is fine; the layout claim above was written about **layout** and has been read as a **performance** claim. Two hundred concurrent decoders at source resolution is a different question and has never been measured.

**Concrete next action:** measure first — 200 real assets, real window, memory and first-paint — before building anything. The fix if one is needed is a `loading` state that does something (`loading="lazy"`, a decode queue, or thumbnails, which is the same missing route as item 1).

### `[P2 · S · Sonnet5-Med]` The film strip counts frames and cannot scrub to one *(filed 2026-09-05, `PLAN.md` 3.3)*

The strip highlights and reports `n frames`, and the artwork beside it is a looping `<img>` that **never seeks**. Clicking a frame does not go to it. Frame-accurate seeking needs the canvas decoder that `PLAN.md` 3.3 describes and that the wipe already has half of — `web/wipe.js` decodes shared frame timing to keep two canvases synced, which is the harder part.

⚠️ This is also the blocker under the motion-sensitivity edge case: an animated `<img>` cannot be paused by CSS, so "stop the animation" is unreachable until frames decode to canvas.

### `[P3 · S · Sonnet5-Med]` This file's conservation rule is unenforced *(filed 2026-09-05)*

The gif repo gates its tracker with `python3 scripts/audit_docs.py --diff <base>`, which fails if the deferred list loses a substantive line that cannot be traced into the archive by content. **That gate exists because that repo shipped a tracker that lied about its own contents.** Devoid has the rule and not the gate.

**Concrete next action:** port the tracker half of `audit_docs.py` — it is content-matching against the archive, not a diff heuristic — and wire it into whatever gate `docs/PLAN.md` names for docs. Small, and worth doing before this file has enough closed items for the drift to be invisible.

### `[P3 · XS · Sonnet5-Low]` Two engine versions can both validate, and nothing compares them *(filed 2026-09-05, `PLAN.md`'s edge-case table)*

`engine.engine_version()` is recorded on the asset and written into every `jobs.jsonl` row — that half of the edge case is done. What is missing is any **comparison**: the validation boundary checks JSON *shape*, not engine *semantics*, so two installs whose `--recommend` differ meaningfully both pass. `docs/PLAN.md` 0.2 notes the resolver may find the synced claude.ai bundle, which is a different version of the skill.

**Concrete next action:** warn when a history line's recorded `engine_version` differs from the live one before offering a rerun — the rerun route (`POST /api/history/{line_id}/rerun`) is where a stale-engine replay actually costs something.

---

## ✅ Considered and NOT fixed — a real decision, not an oversight

*Anything here has been looked at and deliberately left. Reopening one needs a reason the entry does not already answer.*

### `server/preview.py`'s `SEAM_THRESHOLD` is superseded and stays exposed

`web/wipe.js` does not read `seam_useful` at all — it computes its own client-side gate (a conspicuity score: differing-pixel fraction × mean |Δalpha|/255, threshold 0.003, plus a 0.02 region-fraction floor), derived by measuring the three real ambiguous-protection regions in this corpus. The server's cruder single-number version is **kept deliberately**, documented as superseded in its own docstring, as a second opinion for a consumer with no decoded frames to measure from — a server-side batch view, say. ⛔ Deleting it because "nothing uses it" would remove the only server-side answer to a question the server may be asked later.

### The preview ledger reports `art: None` rather than a number it could compute

`server/preview.py:_ledger` deliberately refuses to derive `art` from a re-encoded single frame, because `scripts/measure_ledger.py` derives it from the **source's** non-background pixels. Quoting a number measured against a different image is exactly the "verification the run did not earn" `PRODUCT.md` forbids. The seam compares `bg`/`total` between the two answers, which is what the question is actually about.

### In-flight jobs from a crashed run are surfaced, never auto-resumed

`server/app.py`'s lifespan calls `journal.recover_orphans()` and **logs** them. Auto-resuming would restart a subprocess render the person did not ask for, possibly against a source that has since moved. Surfacing without resuming is the honest state; `not-checked` is a first-class state in this product for the same reason.

### `/api/engine/concurrency` is outside the frozen contract, on purpose

`docs/API-CONTRACT.md` is frozen and this route is not in it. It exists so a run's log can say **why** it chose a worker count (the harness's own `default_jobs()`) instead of leaving a reader to guess. Adding it to the contract would imply a stability promise the number does not have.

### The corpus assets in `web/assets/` are real skill outputs and stay that way

`CLAUDE.md` states this and it has already paid: putting real art in is what found the rubylith-over-red bug that drawn icons had hidden. ⛔ Do not replace them with synthetic icons to make a layout look tidier.

---

## 🔔 Reminders / watch-for

### Cross-repo: the engine's `build_parser()` is merged, and the gif tracker still lists it as open

`server/flags.py` depends on `build_parser()` in the skill repo. It **shipped** — `refactor(cli): extract build_parser(), fix the labels-log pointer` (PR #20, `cc02a40`), merged 2026-09-05. `gif-deferred-list.md` still carries it as an open `[P1 · XS · Sonnet5-Med]` item; under that repo's own conservation rule it belongs in `gif-resolved-list.md` with its outcome. **Flagged, not fixed from here** — moving it is that repo's session's job.

### If `labels/protection.jsonl` ever moves, fix the pointer in the engine repo

`scripts/harness/labels/README.md` there points at this path, because nothing on that side would otherwise surface it. `CLAUDE.md` carries the same warning; it is repeated here because a path move is the kind of change that happens for an unrelated reason.

### `docs/HANDOFF.md` is written to be superseded — do not file durable work in it

The convention is to rename it `<date>-handoff.superseded.md` and write a new one. **Anything that must outlive one session belongs here, in `docs/DEVLOG.md`, or in `docs/CHANGELOG.md`** — three files that are appended to, not replaced. This whole tracker exists because the first build session's open items were sitting in a file designed to be thrown away.

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

### `[P2 · S · Opus5-Med]` The impeccable skill has never been set up here, only its detector *(filed 2026-09-06)*

`.impeccable/` does not exist: no config, no `design.json`, **no surface briefs**. The detector CLI works without them, which is why three sessions did not notice. `doctor.mjs`'s other finding is that `docs/PRODUCT.md` has no schema stamp and none of the sections the current record adds — Positioning, Operating Context, Evidence on Hand, Product Principles — so it predates this version and `init` is the named fix. ⚠️ `init` is an **interview**; it needs Harkirat, and it preserves confirmed answers rather than rewriting from inference.

**The briefs are the expensive half.** Every command reads `.impeccable/surfaces/<name>.md` for the surface's **mode**, the single judgement that changes the output most; without one each command re-infers it, which the skill's docs name as the source of generic advice. Three surfaces — the contact sheet, the open view, the empty table — and all three are **Operate**. ⚠️ Writing a brief records a chosen direction, so it is design work with the user's fingerprints on it: offered, never done unasked.

### `[P3 · XS · Sonnet5-Low]` An exact-key-set assertion made a contract addition a test failure *(filed 2026-09-06)*

`tests/test_api.py::test_end_to_end_register_then_analyze` asserted `set(created[0]) == {"id","path","ext","state"}`. Publishing `url` from `Asset.public()` — a deliberate, documented contract addition — turned that into a red suite. The assertion was widened in the same change.

**Worth keeping because the shape recurs:** an exact-key-set assertion on a public payload converts every additive change into a failure, which trains people to edit the test rather than read it. **Assert the keys you depend on, not the absence of keys you do not.** Sweep `tests/` for other exact-shape assertions before the next contract change.

### `[P1 · S · Opus5-Med]` `content_type` is permanently `"unknown"` in every label row *(filed 2026-09-05)*

`labels/protection.jsonl` is framed in `docs/PRODUCT.md` as a training dataset for the engine's hardest decision, and its schema allows `icon|sticker|emoji|unknown`. Nothing in the flow ever classifies one: `server/labels.py:158` defaults `content_type="unknown"` and no caller overrides it. **A corpus where one column is always the same value is measurably weaker than its schema implies.**

Not a bug — the value is legal, and the log's other columns are real. **It is a product decision, not a code fix:** is content type asked of the person (one more question in a flow whose whole design is asking fewer), inferred from the source path or a corpus manifest, or dropped from the schema because nothing can honestly fill it? ⚠️ Dropping a column from an **append-only** log is not free; existing rows keep it.

⚠️ **This path is pointed at from the engine repo** (`scripts/harness/labels/README.md`), per `CLAUDE.md`. If the schema moves, fix that pointer.

### `[P1 · S · Sonnet5-High]` Every render pays for a second full analysis the app already ran *(filed 2026-09-05)*

`server/render.py:143` builds every render argv through `cli.build_argv(..., auto=True)`, which always emits `--auto`. `--auto`'s pass 1 is `recommend()`, which is the same analysis `POST /api/assets/{id}/analyze` already ran and stored on the asset. **So the engine recomputes, per render, an answer Devoid is holding in memory** — measured in the engine repo at 39–47% of a run's cost, ~18s on a corpus asset here.

⛔ **Do not fix this by dropping `--auto`.** `--auto` is what makes the tri-state controls mean anything — `CLAUDE.md`'s rule is that a UI which sends all 63 flags turns `--auto` into a no-op and the tool stops thinking. The saving has to come from the engine accepting a precomputed analysis, not from the app declining to ask for one.

**Cross-repo:** the engine-side item is `[P1 · S · Opus5-High]` "`--auto` recomputes pass 1's analysis in pass 3" in `gif-deferred-list.md`, with a ready-to-build plan (`docs/plans/2026-09-01-analysis-cost-and-observability.md` Task 1). That fix is internal to one process; **this item is the cross-process version of it and needs its own surface** — most likely `--auto --analysis-json <path>`, symmetrical with the `--verify-json` already filed there.

### `[P2 · M · Opus5-High]` The `.app` runs anywhere on THIS Mac, not on another one *(filed 2026-09-05, successor to "The `.app` is not standalone")*

The bundle now carries its own Python, `server/` and `web/`, and launches from any directory. **Two dependencies remain, and both are named in a dialog rather than being a silent failure.**

1. **`pyvenv` is a virtualenv**, so it needs its base interpreter: Python 3.11 at `/Library/Frameworks/Python.framework/Versions/3.11`. A truly portable build needs a relocatable interpreter (`python-build-standalone`, or PyInstaller over `server/app.py`) instead of a copied venv. ⚠️ Measure the size first — the bundle is already **411 MB** and numpy/scipy/Pillow are most of it.
2. **The engine is resolved, never bundled** — and that is deliberate, not an oversight. `CLAUDE.md`'s first rule is that the skill stays the source of truth for every algorithm; a copy inside the app would drift silently and there would be no way to tell which one produced a given output. If this ever ships to someone else, the answer is a first-run check that *asks where the skill is*, not a fork of it.

### `[P2 · S · Opus5-Med]` A packaged run writes its labels somewhere the tracked log cannot see *(filed 2026-09-05)*

`labels/protection.jsonl` is **tracked evidence**, pointed at from the engine repo, and the whole reason `PLAN.md` 5.1 says to design it in early. A packaged app now writes to `~/Library/Application Support/Devoid/labels/protection.jsonl`, so those rows never reach the checkout.

Writing inside the bundle instead is strictly worse — it breaks under signing and the next install deletes it — so this is the better of two bad options, not a good one. **What it needs is a way to bring the rows back**: an "export labels" menu item, or a configured `$DEVOID_DATA_DIR` pointing into the repo for anyone doing labelling work. ⚠️ Whichever is chosen, it must **append**, never overwrite — this is an append-only log with one writer, and a merge that rewrites it breaks that guarantee.

### `[P2 · M · Opus5-High]` Devoid cannot install its own updates, and the blocker is signing *(filed 2026-09-05)*

**Check for Updates… tells you a release exists and opens its page. That is the whole feature, and it is deliberately not more.** `electron-updater` on macOS delegates to Squirrel.Mac, which **validates the code signature of the downloaded update** — an unsigned build cannot install one. Wiring it today would ship a code path guaranteed to fail at runtime, which this repo treats as worse than not shipping it.

⚠️ **A self-signed certificate does not change this** (2026-09-06). The app is now signed and `codesign --verify --deep --strict` passes, and the updater is still blocked: Squirrel.Mac validates the downloaded update against a signature the *destination* machine trusts, which a self-signed certificate is not.

**Blocked on, in order:** a Developer ID Application certificate and an Apple ID (`[P2 · S · Sonnet5-High]` "Signing and notarisation are configured and have never run"), then a published GitHub Release carrying the `.dmg`, the `.zip` and `latest-mac.yml`, which `electron-builder` emits on a signed build.

⚠️ **A second blocker nobody would find until it failed: the repository is PRIVATE.** GitHub's releases API answers 404 to an anonymous caller for a private repo, exactly as it does when nothing is published — so even a signed auto-updater would find nothing until the repo is public or the app carries a token. **Do not ship a token in the app** to work around that; make the repo public, or the release feed public, instead.

### `[P2 · M · Opus5-High]` Emitting mode is the weaker of the two states *(filed 2026-09-05, from the interface-design squint test)*

The void (dark) state is the designed one. Emitting (light) passes every measurement — contrast, focus-ring, hit targets — and still **loses tile separation under a squint** in the places the shadow fix did not reach: the edge rail and the film strip. Two depth strategies coexist by design here (borders on dark, shadows on light, recorded in `.interface-design/system.md`), which is a deliberate exception to "choose one and commit"; this item is that exception not being carried all the way through.

**Concrete next action:** run the squint test on the real window, both states, and extend the light-mode shadow scale to the two components that were missed rather than adding borders back — borders on light is the thing the strategy split exists to avoid.

⚠️ **MEASURED AND HALF-FIXED 2026-09-07 02:10 EDT, and the half that remains is the item.** The gate now captures `11-sheet-emitting` and `check_greyscale.py` squints both lighting states. Emitting was **inverted**: the needs-you tile read 219.1 against a field at 227.4, losing by **8.4**, because the field recedes with `brightness(.55)` and on a light ground darker is louder. It washes toward the ground now and separates positively — but at **10.7 to 25.8 across runs against a floor of 8.0, where the void reads 72.8 every time**. The inversion is gone; the weakness is exactly what was filed. ⚠️ The squint also had a dark-mode assumption in its arithmetic (`mine - theirs`, signed), so a real inversion and no separation failed the same way; it measures `abs()` now. **Next: the edge rail and the film strip, which this pair still does not cover.**

### `[P2 · S · Sonnet5-High]` Notarisation is configured and has never run *(filed 2026-09-06, successor to "Signing and notarisation are configured and have never run")*

**Signing now runs and the entitlements are proven** — a self-signed `DEVOID` identity, `mac.identity` in `electron-builder.yml`, verified 2026-09-06 17:29 EDT. What remains is the half a self-signed certificate cannot reach. `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` stay unset and `notarize: false` stays, because notarisation requires an Apple Developer account and a Developer ID Application certificate, neither of which exists.

⚠️ **The self-signed build does NOT satisfy Gatekeeper anywhere but this Mac.** The `.dmg` and `.zip` in `dist/` carry a valid seal and a Designated Requirement, and a copy downloaded onto another machine will still be refused — it is not Apple-issued and it can never be notarised. Treat the artifacts as local builds, not as something to hand to anyone.

⛔ **Never fabricate signing credentials to make this testable.** The three notarisation variables stay unset until real ones exist.

### `[P2 · S · Opus5-Med]` The contact sheet has never been seen with a real batch *(filed 2026-09-05)*

`docs/PRODUCT.md`'s claim is that "one, twelve and two hundred are the same layout". Cards grew to 228px during the redesign, which looks right against the corpus's eight assets and **may be waste at twenty**. Nobody has made that judgement with a real batch, and the void ground makes a sparse sheet read as atmosphere rather than as emptiness — which is flattering in exactly the wrong direction.

**Concrete next action:** capture the sheet at 8, 20 and 60 real assets through `scripts/capture-window.mjs` and look. This is a judgement call that needs an image, not a measurement.

⚠️ **THE IMAGES NOW EXIST, 2026-09-07 02:10 EDT — the judgement does not.** `npx electron scripts/measure_scale.mjs <n>` writes `local/scale-shots/sheet-{008,020,060,200}.png` from the real window with real files. **The tile is 262px at every size**, so "one, twelve and two hundred are the same layout" holds as a layout claim. Whether 262px is waste at twenty is the part that needs an eye, and all four captures were sent to Harkirat on 2026-09-07. This stays open until he says.

### `[P2 · S · Sonnet5-High]` No screen reader has ever run against this app *(filed 2026-09-05)*

Every accessibility finding — six were fixed — came from **markup and computed accessible names**, never from an actual AT run. Roles, names and states are present and correct as written; whether VoiceOver announces the eleven states, the roving-tabindex region tools and the seam usefully is unknown.

**Concrete next action:** a VoiceOver pass on the three flows that matter — open an asset, answer a question, save — and record what it says, not whether it "works".

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

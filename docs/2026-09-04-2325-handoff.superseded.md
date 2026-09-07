# Devoid — where the work stands

*Written 2026-09-04 19:55 EDT, at the end of the session that built PLAN.md Stages 0–6 as six parallel subagents in isolated worktrees, then merged and audited them. Supersedes `2026-09-04-handoff.superseded.md`, which said "nothing is built" — true when it was written, false within the same session.*

⚠️ **When this goes stale, rename it `<date>-handoff.superseded.md` and write a new one. Do not edit it in place.** This file exists because that rule was violated once already this session: the previous HANDOFF sat unedited through an entire six-stage build, telling every reader "nothing is built" while the app got built. Read the "What this session got wrong" section below before assuming any doc in this repo is current.

## In one line

**All six PLAN.md stages are built, merged, and pass their tests — including a real end-to-end render through the actual engine subprocess.** What's genuinely unverified: signing (no credentials exist to test with), a real interactive browser session (nobody has clicked through the merged app in a window and watched it), and a few product-shape gaps named below that are honest scope, not defects.

## What actually happened this session

Six agents, one per PLAN.md stage, ran in **isolated git worktrees** in parallel (Stage 1 engine/server, 2 surface/app.js, 3 wipe.js, 4 canvas.js, 5 memory/labels+jobs, 6 Electron shipping), against a **frozen API contract** (`docs/API-CONTRACT.md`) written before dispatch specifically so independently-built pieces would integrate. They did. Mostly.

**Merging them surfaced a class of bug worth naming precisely, because it will recur if this pattern is reused: `git merge` finds textual conflicts. It does not find "two files that don't conflict because nobody told them about each other."** Two agents can each build a real, tested, correct deliverable and the seam between them can still not exist. A first merge pass (resolve conflicts, run each stage's own tests) missed four instances of exactly this:

- `web/advice.js` (Stage 5) was never `<script>`-tagged into `index.html` — a fully built, working file nothing ever loaded.
- `POST /api/history/{line_id}/rerun` was never wired into `server/app.py` — `server/jobs.py`'s `rerun_settings()`/`rerun_row()` existed with no route calling them.
- `journal.recover_orphans()` (the crash-recovery mechanism, PLAN 1.4) was never called outside its own test file.
- `server/engine.py`'s `status()` didn't report `skill_path`, so `main.js`'s own "which engine build is running" diagnostic — the exact thing Stage 6 was assigned to close — silently printed "unreported" every launch.

All four are now fixed and proven live (not just re-tested — a live server was booted and each route/behaviour hit directly). **The lesson, for any future multi-agent build in this repo: after merging, do a deliberate reachability pass — for every deliverable each agent's report claims, trace whether it is actually invoked from the running app (`main.js` → `index.html` → `app.js` → `server/app.py`'s route table). A green test suite proves each piece works; it does not prove each piece is plugged in.**

Two smaller integration bugs also surfaced only once real usage crossed both agents' work: `server/jobs.py`'s settings schema was frozen at `{overrides, regions, goal}`, but `server/render.py` (a different agent) builds a render's argv from a fourth key, `settings["answers"]`, and had nowhere valid to put it. Widened the schema; both agents had independently and reasonably designed the same shape without seeing each other's code, which is the same root cause as the reachability gaps above — parallel isolation buys speed and costs an integration pass that has to be done deliberately, not assumed.

## Everything decided (unchanged from before the build — still true)

See `2026-09-03-handoff.superseded.md` for the full decided-and-rejected list (name, structure, engine boundary, Electron-from-the-start, etc.) — none of it changed. What changed is that it's now built.

## The "Open, and genuinely open" list from before the build — resolved or still open

1. **Per-colour vs per-region.** ✅ Resolved. `server/assets.py` groups by colour and `POST /api/assets/{id}/answers` rejects a submit that would answer two same-colour regions differently (`400 conflicting_colour`); `web/app.js` groups the question UI the same way so the rejection is never the first time anyone hears about it.
2. **The seam's "cannot help" threshold.** ✅ Resolved, and NOT the number PLAN.md suggested. `web/wipe.js` measured the three real ambiguous-protection regions in the corpus and found PLAN's suggested metric (differing px / region's own area) is degenerate for this question — it's always ~0.55–0.76 by construction, since flipping protect→remove changes the whole region. The real gate is a conspicuity score (differing-px-fraction × mean |Δalpha|/255, threshold 0.003) plus a 0.02 region-fraction floor for the sub-half-opacity-fade case. **`server/preview.py` still exposes its own cruder `seam_useful` field (threshold 0.02, single metric) — `web/wipe.js` does not read it at all.** Left in place deliberately as a second opinion for a hypothetical consumer with no decoded frames of its own; documented in `preview.py` as superseded so it doesn't look like an oversight.
3. **Fade answer colliding with a stated format.** ✅ Resolved as an inline warning in `web/app.js` (answering "it is artwork" while the goal says GIF surfaces a warning rather than silently overriding or blocking).
4. **The `conflict` policy.** ✅ Decided: escalate-then-report. The server always writes the next free `_v2`/`_v3`; the UI names the final escalated path in the `conflict` banner rather than blocking with a confirmation dialog. Reasoning in `web/app.js`'s `settle()`: a prompt on every write would fire on every re-cut, the commonest action, training the user to dismiss it.
5. **Whether `--auto`'s `--recommend` re-run is worth eliminating.** ❌ Still open, untouched this session. `server/engine.py` calls `recommend()` once per analyze and `render.py` shells out to the CLI (which re-runs its own `--recommend` internally under `--auto`) — the one `--recommend` PLAN.md 1.2 said in-process analysis would save is not yet actually eliminated from the render path, only from the *analyze* path. Real but small (~18s on a 144-frame asset); not chased this session.

## What exists now, stage by stage

**Stage 0 — launch path.** `web/`, `server/app.py` (static mount), `.venv`, `package.json`, `main.js`. Unchanged from the prior session's work, still correct.

**Stage 1 — engine layer.** `server/{validate,engine,concurrency,flags,cli,preview,render,assets}.py`. `build_parser()` was added to the **skill repo** (`/Applications/Claude Code/Gif-Background-Remover`) via PR [#20](https://github.com/HarkiratMangat/gif-background-remover/pull/20), squash-merged to `main` and tagged `v6.3.3` — `server/flags.py` now depends only on that repo's `main`, not a feature branch. Re-verified: Devoid's full pytest suite (93/93) still passes with the skill repo on `main`.

**Stage 2 — surface.** `web/app.js` fully rewritten: all 11 states real (not just the five the prototype had), selection (click/shift/cmd, acts on a set), drag-and-drop + native Open… via `web/preload.js`, tri-state controls live from `GET /api/flags`, grouped-by-colour questions, presets limited to what's citable (no invented discord preset — see PRODUCT.md's own rejection of that).

**Stage 3 — the wipe.** `web/wipe.js`: real answer-A/answer-B pairs (not source-vs-cut), canvas-decoded frames on one shared clock (fixes the measured `growth`/`paper-plane` desync — see below), the question-card fallback with its own measured threshold. `web/vendor/gifuct.js` is a **built, committed** esbuild bundle (not just a buildable script nobody ran) — confirmed present and tracked.

⚠️ **The paper-plane WebP "carries no frame durations" claim in the pre-build HANDOFF was wrong**, and Stage 3 corrected it in code: `webpmux -info` shows real per-frame durations totalling 2,400ms on both source and cut. The apparent bug was Pillow's WebP plugin not exposing per-frame `duration` — the browser's native `ImageDecoder` reads the container correctly. Verified live in a browser harness. Do not re-cite the old claim.

**Stage 4 — canvas.** `web/canvas.js`: draw/move/resize rect+circle, coordinate round-trip (267 assertions, exact to the source pixel, including a real letterbox case), six region flags, eyedropper (cross-checked against PIL ground truth), `tracked` field handed to the engine's own tracking rather than reimplemented client-side.

**Stage 5 — memory.** `server/{labels,jobs,journal,appendlog}.py`, `web/advice.js` (now actually loaded — see the merge-bug list above). Concurrency proven both ways: 8 threads × 50 appends (same process) and 4 spawned processes × 50 appends each, both give exactly the expected line count with zero interleaved/corrupted JSON. The label-log pointer in the skill repo (`scripts/harness/labels/README.md`) was stale ("that file does not exist yet") and was corrected — landed in the same PR #20 / `v6.3.3` as `build_parser()`.

**Stage 6 — ship.** Native menus, About panel, port-collision handling (probed with a real bound socket, not assumed), local fonts (`web/fonts.css`, five real woff2 files fetched and committed), `electron-builder.yml` with signing wired to five env vars, all deliberately unset. `npm run dist:dir` **re-run against the fully merged tree** (Stage 6's own verification was against its pre-merge worktree and would not have caught a file added later going unpackaged) — confirmed via `asar list` that everything added by Stages 2–5 after Stage 6 wrote its config actually made it into the bundle.

## What's genuinely NOT done, stated plainly

- **Nobody has opened the merged app in a window and interacted with it.** Every check this session was either an automated test, a raw HTTP call, or a static code read. The `npm start` checks confirmed the server boots, the window loads, and every script/asset fetches 200 — they did not confirm the seam drags correctly, the region canvas draws correctly on top of it, or that six independently-written frontend modules feel like one interface. `web/canvas.js`'s own report said its pointer-events/z-index stacking with the *real* wipe.js (not the old static prototype wipe it was built against) is unverified — that is still true.
- **Signing and notarization are wired, never exercised.** No Apple Developer identity exists on this machine to test with.
- **`content_type` in every `labels/protection.jsonl` row is permanently `"unknown"`.** Nothing in the current flow ever classifies an asset as icon/sticker/emoji — the `record_verdict` shim (the glue between Stage 1's route and Stage 5's writer) defaults it and nothing overrides that default. Not a bug (the schema allows `"unknown"`), but a real gap against PRODUCT.md's framing of this log as a training dataset: a corpus where one column is always the same value is measurably weaker than the schema implies. Deciding how content_type gets classified (asked of the user? inferred from file path or corpus manifest?) is a real product decision, not a code fix.
- **No standalone `.dmg`.** The packaged app still expects `.venv/` to exist beside it; bundling a Python runtime is out of scope, per Stage 6's own README section.
- **`--auto`'s internal `--recommend` re-run is not eliminated from the render path** (open item 5, above) — small, known, not chased.

## What this session got wrong (added to, not replacing, the prior list)

- **Assumed a passing test suite meant the pieces were wired together.** It meant each piece was correct in isolation. Four real components sat unreachable from the running app until a deliberately adversarial re-read of every agent's own "what I deliberately did not do" list caught it.
- **Called a real gap "cosmetic" under time pressure and almost let it stand.** `skill_path` being unreported was dismissed once as cosmetic before a second look connected it to the specific edge case Stage 6 was assigned to close. When a finding is dismissed as minor, check it against what it was actually supposed to close before moving on.
- **Let a stage's own verification go stale after merging more work on top of it.** Stage 6 proved `npm run dist:dir` worked against its own worktree; the merge added four more files after that; nobody re-ran the packaging check until asked to specifically re-examine everything. A stage's "done" is only true against the tree it was checked against — re-verify anything that tree changed under.
- **Under-communicated relative to the active output style**, twice, until corrected directly by the user mid-session. Silent mode means terse, verified, structured updates — not narrating tool calls, and not going quiet on genuinely load-bearing findings either.

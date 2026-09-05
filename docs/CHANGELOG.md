# Devoid — changelog

What shipped, when, and why. Newest first.

## Versioning

**Three-part `vMAJOR.MODERATE.MINOR`**, the same scheme as Dior's Builds (`docs/CHANGELOG.md` there) and the engine repo — deliberately, so a session moving between them does not have to switch models.

- **MAJOR** — a major overhaul or major new functionality. Bumped **only deliberately, with the user's confirmation**.
- **MODERATE** — a significant merged PR: a new feature, a real design change, several large bug fixes, or a bundle of adjustments. Bumping it resets MINOR to 0. It climbs past 9 indefinitely (v1.10.x, v1.11.x); double digits is **not** a reason to bump MAJOR.
- **MINOR** — a small adjustment, fix or correction.

**The unit that earns a version number is a merged PR**, not a push and not a raw commit. `main` only ever advances through a PR (`CLAUDE.md`), each merge squashes to one commit, and that commit gets one version number and one git tag.

**Entry shape:** `## vX.Y.Z — YYYY-MM-DD HH:MM TZ (#PR · `sha`) — <title>`. A commit cannot contain its own hash, so the **hash is backfilled one release later** — the newest entry lacking a hash is correct, not drift. The backfill is additive (insert `` · `sha` ``, touch nothing else, never edit the timestamp) and is an ordinary commit, **never an `--amend` and never a force-push**.

**Open work is not here.** `devoid-deferred-list.md` is the tracker; this file records only what merged. `docs/DEVLOG.md` carries the reasoning and the dead ends.

---

## Unreleased — on `feat/devoid-v1`, 28 commits, not pushed

**This becomes `v1.0.0` when the branch merges**, per the user's call 2026-09-05 00:07 EDT. `package.json` already reads `1.0.0`. There is no v0.x: the first release is the first working version, matching the engine repo's and Dior's Builds' convention.

### Stages 0–6 — the whole app

- **Stage 0 — the launch path.** Electron main process spawns a Starlette/uvicorn server and opens the window. Port 8732, probing upward to 8740 when taken, by real TCP connect; a dialog when all nine are busy.
- **Stage 1 — the engine layer.** A validation boundary over the skill's JSON, in-process analyse, subprocess render with a real cancel, concurrency taken from the harness's own `default_jobs()`. Flag **metadata** is introspected from the engine's `build_parser()` — never a control per flag, which is the 63-control passthrough form the product exists to avoid.
- **Stage 2 — the surface.** Eleven states, selection, drag-and-drop through a `FileSource` boundary, tri-state controls read live from `/api/flags`.
- **Stage 3 — the wipe.** Two answers on one clock, decoding shared frame timing rather than looping two `<img>`s that drift — the real `growth.gif` timings used to drift 1,220ms. The question card is the honest fallback below the seam's visible-difference threshold.
- **Stage 4 — the plotter.** Region drawing on the artwork in source pixels, with a coordinate round-trip exact to the source pixel.
- **Stage 5 — memory.** Two append-only logs with two schemas and one writer each, a crash journal that surfaces orphans without resuming them, history with rerun, and advice that ships with an undo of exactly what it changed.
- **Stage 6 — ship it.** Menus, the port probe, engine logging, self-hosted fonts, and `electron-builder` packaging. ⚠️ The `.app` is **not standalone** — see `devoid-deferred-list.md`.

### The visual world was replaced

The "lamp over the bench" metaphor became **the void**: the ground is deep space, the tools on it stay the matte world. The palette did not change — the app's two load-bearing colours turned out to already be an accretion disk's two colours, so the new world explains them. The lighting toggle is a **miniature of the wipe's own seam**. The starfield is generated to fit, never tiled. `docs/DESIGN.md` was rewritten; measured values are in `.interface-design/system.md`.

### Accessibility, after an audit that found real failures

| check | outcome |
|---|---|
| Contrast, both lighting states, every text-on-surface pair | zero failures, worst **5.12:1** |
| Focus ring, SC 1.4.11 | worst **9.53:1** — found failing at **1.00:1** on the primary button |
| Hit targets, SC 2.5.8 | matte swatches ~~23.6px~~ → **28px**; every other element already passing |
| Design detector | exactly one accepted finding, `repeating-stripes-gradient` |

### First real use, and what it found

The app was run on a 2.87 MB file from outside the corpus and completed — `verdict: done`, output written. It is one asset and nobody has judged the output's edges, but the whole path ran end to end for the first time.

It also dirtied the git tree, because `jobs.jsonl` — a per-machine work history carrying local absolute paths — was tracked. It is now ignored. `labels/protection.jsonl` stays tracked: that log is shared evidence, pointed at from the engine repo, and the two must not be treated alike.

### Verified

93 pytest (including a real render of a corpus asset through the subprocess) · 267 coordinate assertions · 14 wipe-clock tests · the port probe · every state captured through the real Electron window.

⚠️ **Not verified, and stated as such:** no automated test covers the UI, `prefers-reduced-motion` was never emulated, no screen reader has run, and signing has never been exercised. All four are filed in `devoid-deferred-list.md`.

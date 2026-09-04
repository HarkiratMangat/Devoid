# Devoid — where the work stands

*Written 2026-09-03 23:30 EDT, at the end of the design session. **Read this before PRODUCT.md or DESIGN.md** — those describe the thing; this describes the state of the work.*

⚠️ **Handoffs go stale. If a later session supersedes this, rename it `.superseded.md` and write a new one** — the sibling repo learned that the hard way and its `docs/handoffs/` is now a graveyard of files that all read as current.

## In one paragraph

The design is settled and measured. There is a working prototype that is genuinely interactive, built on real animated corpus assets. **The implementation plan is written (`docs/PLAN.md`) and is the next thing to execute.** Nothing has been pushed; there is no remote. The prototype is a prototype — its component code is meant to become the front end, but it has no engine behind it and none of the eleven states in `DESIGN.md` except the happy path.

## What is decided, and will not be re-litigated without new evidence

| | |
|---|---|
| **Name** | Devoid |
| **What it is** | a front end for the `gif-background-remover` skill; the skill stays the engine and reimplements nothing |
| **Structure** | no modes — the strip is the app, selection is the only state, panels are summoned drawers |
| **Core interaction** | the **wipe**: two renders, one draggable seam, "which is right?" rather than "is this region design or background?" |
| **Engine boundary** | hybrid — subprocess to render, in-process import to analyse |
| **One change asked of the skill** | a `build_parser()` factory so the flag UI is generated from argparse and cannot drift |
| **Shell** | local HTTP server + web UI inside **Electron from the start** (revised 2026-09-04 — see below) |
| **Audience** | built for Harkirat, but nothing that *requires* him |
| **Errors** | advise, always with an undo of exactly what changed |
| **Lighting** | two designed states, toggled; not a theme and its inversion |

## What was rejected, and why — read this before re-proposing any of it

**A future session will re-propose at least one of these.** Rejected options with reasons are the most valuable thing a handoff carries.

- **Browser-only (Pyodide/WASM).** Not hard — *impossible*. scipy exists in Pyodide; `gifsicle`, `webpmux` and `pillow-avif-plugin` do not, and AVIF is what the Discord-emoji path depends on.
- **Hosted on a small box (Railway/Fly).** Rejected on measured grounds: on claude.ai's single-CPU sandbox `--target-kb` could not finish inside a tool call and `--verify` exceeded two minutes. It would work and be miserable, which is the worst outcome.
- **Tauri.** Better engineering and a tenth the bundle, but the canvas — the hardest thing in the build — would run on WKWebView instead of Chromium, and it puts a Rust toolchain between Harkirat and every backend change.
- **SwiftUI.** No Safari problem, genuinely the best Mac feel, and rejected anyway: the canvas needs simultaneous drag/magnify/hit-test gestures where SwiftUI is fiddly, native controls resist a strong custom identity, and it discards the entire CSS design system. It is the one door the current choice does not leave open.
- **Board / Bench as two lanes.** Approved, built, then discarded. The coin-flip refusal fires on 12.8% of assets — about 1.5 per batch — so a dedicated lane served almost nothing, while review, which every asset needs every time, had no home.
- **A `discord-sticker` preset.** The repo records the 256 KB cap but no pixel dimension for stickers. Inventing one to complete a name is exactly the guess the whole design exists to prevent.
- **Names:** `kerf` (colonised by CNC software — KerfSuite, Kerfio, KerfCAD), `notan` (a Rust game framework plus an app that does Notan analysis on images), `knockout` (Knockout.js), `void` (a reserved word in every C-family language), `matte`/`kisscut`/`weeder`/`counter`/`pegbar`/`offcut`/`holdout`/`frisket` (all considered, all passed over).

## Open, and worth deciding early

1. ✅ **CLOSED 2026-09-04 — Electron from the start.** The `.app` shim sequence was presented as costless and was not: a browser cannot hand the server a filesystem *path*, only bytes or a typed string, so the shim stage would have uploaded files into a staging directory (making the skill's "beside the source" convention meaningless) or asked for a pasted path. Electron's main process owns real paths, native dialogs and Finder drag-drop. `PLAN.md` stages 0.5, 2.5 and 6 revised.
2. **Whether the wipe fully replaces the question band**, or the band remains a fallback for before a render exists.
3. **Search.** With no labelled grid, finding one named file among two hundred needs it.
4. **Where history lives** — a real store with thumbnails, or a log of paths and settings.

## What exists, and what it is not

`prototype/` is **real component code with real state**, meant to become the front end. It has: the contact sheet, the open state, the wipe, the ledger, the film strip, summoned drawers, grease-pencil state marks, the lamp, label capture. It does **not** have: any engine, ten of the eleven states in `DESIGN.md`, selection, search, history, drag-and-drop, or a region canvas.

Its assets are **real outputs from the skill's corpus, and they animate.** Do not replace them with drawn icons — that substitution is what hid three bugs through four rounds of review.

## Measurements, and how to re-run them

Both scripts are in `scripts/`. **A quoted number with no re-runnable check is a claim, and claims rot.**

- `measure_preview_fidelity.py` — a 1-frame preview is pixel-exact to an 8-bit-alpha format and differs slightly for GIF; under `--auto` the erosion calibration measured a different curve from one frame than from the whole asset and landed on the same level by luck. **That is why the preview inherits the calibration instead of re-deriving it.**
- `measure_overlay_collision.py` — a third of one corpus asset's artwork sits inside the overlay colour's neighbourhood. **Re-run before changing `--ruby`.**

## Cross-repo dependencies

- **`Gif-Background-Remover`** — Devoid wants a `build_parser()` factory added. Branch `docs/gif-cli-bridge-findings` is open there with one tracker entry.
- **`~/.config/dior`** — branch `feat/gif-bridge` holds a complete, tested `dior gif` CLI, **paused rather than abandoned.** Its `gif_wizard.py` is the direct ancestor of Devoid's engine layer and its 51-falsifier suite is worth porting.

⚠️ **Carry forward from that CLI: it has four remaining places that assume the shape of the skill's JSON without verifying it** (`recommend()`'s list/dict sniffing, a bbox fallback that silently becomes a degenerate rectangle, direct subscripts on the fade dict, an `index()+1` on a flag list). The lesson was learned once and fixed in one function only. **Devoid should import that JSON through a single validation boundary from day one**, and test the boundary rather than every consumer.

## What the previous session got wrong, so this one does not repeat it

- **Designed with art drawn to flatter the design.** Real assets found three bugs in minutes.
- **Ran a thinking pass that produced zero reversals and reported it as complete.** A run with no reversal is a failed run.
- **Invoked skills without running their processes** — a mandated pre-code checkpoint was skipped and the work suffered for it.
- **Trusted an empty result from a tool that had said it was degraded.**
- **Wrote a doc restating numbers the code owns**, which was stale inside the same commit. This document and `DESIGN.md` now state rules and point at tokens.
- **Never argued the cost** of replacing working software before designing its replacement. There is a working CLI. The app's genuinely non-substitutable case is the region canvas.

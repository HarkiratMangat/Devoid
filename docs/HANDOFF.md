# Devoid — where the work stands

*Written 2026-09-04 12:05 EDT. **Read this before anything else.** The other docs describe the thing; this describes the state of the work.*

*Supersedes `2026-09-03-handoff.superseded.md`, which was written at the end of the design session and then carried a day of in-place edits under a stale header — the exact drift its own rule warns about.*

⚠️ **When this goes stale, rename it `<date>-handoff.superseded.md` and write a new one.** Do not edit it in place. The sibling repo's `docs/handoffs/` is a graveyard of files that all read as current.

## In one line

**Design is finished, measured and audited. Nothing is built. Start at `PLAN.md` Stage 0.1.**

## Read in this order

⚠️ **Read `DESIGN.md`'s first two sections before this file's "What exists".** This document is written in vocabulary that document defines — *the strip, the contact sheet, drawers, the ledger, grease-pencil marks, the lamp, rubylith, the wipe, the seam, the film strip* — and an audit found a reader backtracking twice.

1. **`DESIGN.md`, sections "The world" and "Structure"** — the vocabulary, five minutes
2. **this file** — state, decisions, what was rejected
3. **`PLAN.md`** — the build order; it opens with a literal ten-step sequence
4. `PRODUCT.md` — the brief and the non-negotiable constraints
5. the rest of `DESIGN.md` — the visual system and the checks it must keep passing

**Glossary for the two terms that appear nowhere else.** The **wipe** is one asset shown twice with a draggable seam between the two versions. The **question card** is its fallback: the disputed region boxed and hatched on a still frame, with two buttons — used only when two renders look identical.

## Model and effort for the build session

**`Sonnet5-High`.** Premise risk is low — the design is settled and every number is measured and re-runnable. Deliberation load is high but bounded: Stage 0–1 is scaffolding plus one engine boundary across many files.

Session title: `Sonnet5-High · Devoid stage 0 — launch path and engine boundary · <date>`

**Escalate to `Opus5-High` on an event, not pre-emptively:** if the hybrid engine boundary turns out not to work (the skill's module resists in-process import under a server), or if two hypotheses about it are wrong. Those are premise failures, which is what the model axis buys.

## Everything decided

| | |
|---|---|
| **Name** | Devoid |
| **What it is** | a front end for the `gif-background-remover` skill; the skill stays the engine and reimplements nothing |
| **Structure** | no modes — the strip is the app, selection is the only state, panels are summoned drawers |
| **Core interaction** | the **wipe**: two renders, one draggable seam, "which is right?" |
| **Question card** | survives **only when the seam cannot help** — when the two renders differ by less than a visible threshold (a sub-half-opacity fade, a 3px sliver). Seam by default. |
| **Engine boundary** | hybrid — subprocess to render, in-process import to analyse |
| **Asked of the skill** | a `build_parser()` factory. **Filed** in that repo's tracker as `[P1 · XS]` |
| **Shell** | local HTTP server + web UI inside **Electron from the start** |
| **Search** | **deferred.** Cut from Stage 2. Add it the first time scrolling actually annoys you |
| **History** | append-only `jobs.jsonl` in Devoid, **separate file and schema from the labels** |
| **Labels** | `labels/protection.jsonl` in Devoid, **tracked** |
| **Audience** | built for Harkirat, but nothing that *requires* him |
| **Errors** | advise, always with an undo of exactly what changed |
| **Lighting** | two designed states, toggled; not a theme and its inversion |

⚠️ **The labels live here, and that costs discoverability by design.** The people who would use them are working on the skill's autonomy, in *that* repo, and nothing there would surface a file in this one. A tracked pointer at `Gif-Background-Remover/scripts/harness/labels/README.md` closes the gap; keep it accurate if this path ever moves.

## What was rejected, and why — read before re-proposing any of it

**A future session will re-propose at least one of these.**

- **Browser-only (Pyodide/WASM).** Not hard — *impossible*. scipy exists in Pyodide; `gifsicle`, `webpmux` and AVIF do not.
- **Hosted on a small box.** Measured: on claude.ai's single-CPU sandbox `--target-kb` could not finish inside a tool call and `--verify` exceeded two minutes.
- **Tauri.** A tenth the bundle, but the canvas — the hardest thing in the build — would run on WKWebView, and it puts a Rust toolchain between you and every backend change.
- **SwiftUI.** Genuinely the best Mac feel, rejected anyway: the canvas needs simultaneous drag/magnify/hit-test gestures where SwiftUI is fiddly, native controls resist a strong custom identity, and it discards the CSS design system. The one door this choice does not leave open.
- **A `.app` shim before Electron.** Presented as a costless sequence and was not — a browser cannot hand the server a filesystem *path*, only bytes.
- **Board / Bench as two lanes.** Approved, built, discarded. The coin-flip refusal fires on 10.2% of assets (12.8% pooled with the fade question), so a dedicated lane served ~1 item per batch while review, which every asset needs every time, had no home.
- **A `discord-sticker` preset.** The repo records the 256 KB cap but no pixel dimension. Inventing one is the guess this design exists to prevent.
- **Names:** `kerf` (CNC software), `notan` (a Rust game framework), `knockout` (Knockout.js), `void` (a reserved word), plus `matte`/`kisscut`/`weeder`/`counter`/`pegbar`/`offcut`/`holdout`/`frisket`.

## Open, and genuinely open

1. **Per-colour vs per-region answers.** The engine's assume-flags take outline *colours*; the UI asks per *region*, and two regions can share a colour. Group into one question, or refuse a colliding submit. `PLAN.md` 3.0a. **This one may need a skill change** — nothing is filed yet.
2. **The seam's "cannot help" threshold.** The card survives only below it, and nobody has picked a number. Suggest: differing alpha px below some fraction of the region's own area, measured on the preview pair. **Decide it with a render in front of you, not in advance.**
3. **What happens when a fade answer collides with a stated format.** Answering "it is artwork" forces `.webp`/`.avif`/`.apng`. If the goal says GIF, the app must override, block, or ask — undecided.
4. **The `conflict` policy.** `PRODUCT.md` promises both "never overwrite" and "follows the `_v2` escalation". Whether the app asks first or escalates and reports are different products.
5. **Whether `--auto`'s re-run of `--recommend` is worth eliminating.** In-process analysis saves one `--recommend` (~18s); the `--verify` duplication is filed separately in the skill repo.

## What exists

`prototype/` is **real component code with real state**, meant to become the front end.

**Has:** contact sheet · open state · draggable seam · ledger · summoned drawers · grease-pencil marks · the lamp · label capture · **five of eleven states** (`empty`, `needs you`, `running`, `done`, `not checked`).

**Does not have:** any engine · six states (`loading`, `refused`, `cancelled`, `failed`, `conflict`, `blocked`) · selection · history · drag-and-drop · the region canvas · **the matte toggle** (which `DESIGN.md` calls a verification requirement) · **the rubylith hatch** (which `DESIGN.md` mandates) · **frame scrubbing** — the strip highlights and counts, but the artwork is a looping `<img>` that never seeks · **any test runner**.

⚠️ **Two of eight wipe pairs desynchronise.** `growth` drifts 1,220 ms per loop (123f/2,920 ms source against 85f/1,700 ms cut). `paper-plane` drifts 2,400 ms — and for a **different reason**: its cut WebP carries **no frame durations at all**, so decoding to canvas cannot recover timing the file does not contain. Its frame counts also differ by one (96 source, 97 cut) and nothing explains why. The wipe's premise is comparing the same moment.

⚠️ **The prototype's seam compares source-vs-output, not answer-A-vs-answer-B.** It looks finished and is the wrong pair. `PLAN.md` 3.3.

⚠️ **`app.js`'s only answer path hardcodes `'cut'`** regardless of the seam, and it is the only caller of `logLabel()`. Ported unchanged, the labelling instrument produces a corpus of one constant value. Marked as a stub in the file.

⚠️ **The drawer taxonomy in `app.js` is a guess, not a spec.** Five groups in the person's vocabulary, mapping to no verified subset of the 63 flags. Marked provisional in the file. Revisit at Stage 2.7.

## Measurements — all re-runnable, all re-measured 2026-09-04

`scripts/`. **A quoted number with no re-runnable check is a claim, and claims rot.**

| script | what it says |
|---|---|
| `measure_preview_fidelity.py` | defaults to a named asset; takes an optional path and frame. A 1-frame preview is **visually** identical to an 8-bit-alpha full render (11 px of 409,600, **max delta 3**) and **not literally** identical. GIF flips 8 whole pixels (max delta 255) via palette and dither. Under `--auto` the calibration measures a different curve from one frame and lands on the same level *by luck* |
| `measure_overlay_collision.py` | no arguments; defaults to the shipped outputs. hurricane 30.9%, paper-plane 20.6%, growth 5.0%, megaphone 2.0% of artwork sits inside the overlay colour's neighbourhood |
| `measure_ledger.py` | derives the prototype's ledger numbers. `--check` fails if `app.js` drifts, proven red-green. ⚠️ Its `art` column is a **ceiling** — it includes the antialiasing ramp the keyer is meant to remove. Comparable between settings on one asset; never absolute damage |

⚠️ **An earlier version of these docs claimed the preview was "pixel-exact — 0 differing pixels".** It was wrong *and* unverifiable, because the script named no asset. That is the failure mode every number here is now structured against.

## Cross-repo

- **`Gif-Background-Remover`** — branch `docs/gif-cli-bridge-findings`, pushed. Carries `build_parser()` `[P1 · XS]`, the `--auto`/`--verify` duplication `[P2 · S]`, and a stale corpus count `[P3 · XS]` (its docs say 714 `edge_hardness` labels; the files hold **981 classified** of 1,038 entries).
- **`~/.config/dior`** — branch `feat/gif-bridge`, pushed and **parked**. A complete, tested `dior gif` CLI. Its `gif_wizard.py` is the direct ancestor of Devoid's engine layer and its **52**-falsifier suite is worth porting.

⚠️ **Carry forward from that CLI: four places assume the shape of the skill's JSON without verifying it** — `recommend()`'s list/dict sniffing, a bbox fallback that silently becomes a degenerate rectangle, direct subscripts on the fade dict, an `index()+1` on a flag list. The lesson was learned once and fixed in one function only. **Devoid imports that JSON through a single validation boundary from day one** (`PLAN.md` 1.1), and tests the boundary rather than every consumer.

## What earlier sessions got wrong

- **Designed with art drawn to flatter the design.** Real assets found three bugs in minutes.
- **Ran thinking passes that produced zero reversals** and reported them as complete. A run with no reversal is a failed run.
- **Invoked skills without running their processes.**
- **Trusted an empty result from a tool that said it was degraded.**
- **Wrote docs restating numbers the code owns** — stale inside the same commit. These docs state rules and point at tokens.
- **Never argued the cost** of replacing working software before designing its replacement.
- **Reported a "clean boundary" with the plan unwritten**, when most of it was not blocked.
- **Hand-rolled the same verification twice and got it wrong both times** — one regex spanned neighbouring entries, the next rejected optional whitespace. The check now lives in `measure_ledger.py --check`. **Use the script; do not re-derive the check.**

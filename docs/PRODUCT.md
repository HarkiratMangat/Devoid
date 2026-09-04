# Devoid — product context

*Written 2026-09-03 21:15 EDT. The durable brief. What this is, who it serves, and the constraints that are not negotiable. Visual decisions live in `DESIGN.md`; the build order lives in `specs/`.*

## What it is

A desktop app for removing the background from animated images — GIF, WebP, AVIF, APNG, and static PNG/JPEG — and fitting the result to a size or format target.

It is a front end for the `gif-background-remover` skill, which lives in its own repo at `/Applications/Claude Code/Gif-Background-Remover` and is separately uploaded to claude.ai. Devoid does not reimplement any image processing. The skill remains the engine and the source of truth for every algorithm.

## Who it is for

Harkirat, primarily and by design. The working assumption is **built for him, but nothing that requires him** — no hardcoded paths, no assumptions about folder layout, a first run that finds or offers to install what is missing. The copy assumes competence and does not teach; a stranger could run it, but the project is not shaped around that stranger.

The assets are icon, sticker and emoji art: antialiased vector work and hard-edged pixel art, usually destined for Discord.

## The problem it solves, stated precisely

The skill exposes **63 command-line options**. That count is not the friction it appears to be — `--auto` already runs the skill's own `--recommend`, applies its flags, renders, re-measures the written file, and re-renders once, so the ordinary path never touches the other 62.

The friction is three questions:

1. **A coin-flip protection decision.** When a candidate region's outline encloses it on *some* frames but not all, whether that enclosed interior is design or background is a statement about intent, and the pixels do not answer it. Measured across 304 real assets: **12.8% refuse this way.** The refusal names a hex colour and a bounding box.
2. **A nameable fade** the detector can identify but not classify, for a measured reason — across the 91 assets in that branch, the ramp statistics interleave with assets that render as a translucent ghost of the whole frame, so no threshold separates them.
3. **The size and format goal**, which the tool deliberately never guesses.

The first two are visual questions delivered as text. Nobody can answer *"is the region at bbox [230,135,406,359] outlined in 002864 design or background?"* by reading it. **They have to see it.** That is the product.

## The finding the whole design rests on

`--recommend` already returns all three questions as **structured JSON**, before anything is rendered:

| field | carries |
|---|---|
| `ambiguous_protection` | list of `{region_id, outline_color, bbox_xyxy, frames_enclosed, frames_checked, enclosure_ratio}` |
| `nameable_fade` | `{color, faint_px, frame_index}` |
| `recommended_format` | one of `gif-ok`, `webp-or-apng`, `webp-or-avif` |
| `not_applicable_reason` / `alternative_command` | why it refuses outright, and what to run instead |
| `evidence` | human-readable justification, one string per finding |

`--auto` derives its refusals from exactly those fields. So Devoid reads the questions **first**, answers them with `--assume-protect` / `--assume-remove` / `--fade-color` / `--assume-no-fade`, and `--auto` never refuses.

The skill's JSON is already a machine-readable question API. This is why the app is a front end and not a rewrite.

## Non-negotiable constraints

These are not preferences. Each was measured, and each has already cost something when violated.

**Never infer a size target.** A guessed target produces a real file at a real size, and nothing downstream says the number was invented. The 2026-08-19 trial measured the consequence: variant sprawl was inversely proportional to how much the user had constrained the goal — the session that knew least produced the most files. The default applies no compression flags at all. A size cap arrives only because someone chose one. When a result is large, the app names the size and offers. **Offering is not acting.**

**Never report a verification it did not earn.** `--verify` skips every pixel check when the output was cropped or resized, and says so only in a `checks_skipped` field. Quick mode skips verification entirely. In both cases the app says **not checked**, as a first-class state with the same visual weight as done and failed. A green tick that was not earned is worse than no tick.

**Never overwrite a delivered file.** The skill's convention escalates `<stem>_transparent.<ext>` → `_v2` → `_v3`. Devoid follows it, and additionally writes to a temporary path and moves on success — so a crashed or cancelled job leaves nothing behind. Without that, a partial file survives and the *next* run skips past it by writing `_v2`, silently accumulating garbage.

**Every control is tri-state.** `--auto` applies its recommendation **only where an option was left at its default**. If the UI sends all 63 flags on every run, `--auto` silently becomes a no-op and the tool stops thinking. Every control therefore reads `auto · <value>` until it is deliberately taken over. This is forced by the engine, and it doubles as the best affordance in the app: the inspector is a live readout of the tool's own reasoning.

**Advice always ships with an undo.** The app may suggest ("the erosion ate a thin stroke — try 1?"), because a suggestion with a one-click revert of exactly what it changed costs nothing when wrong. A suggestion without one does not ship.

## The two lanes

**Board** — drop a pile. Everything analyses in parallel; most come back clean; the ones with questions say so on the card and are answered in place. A modal would serialise what should be parallel.

**Bench** — one asset, as long as it takes. The canvas is the point: regions are *drawn*, not typed as coordinates.

**The Bench is reachable, never required.** It must remain possible to drop files, answer the questions, and export without opening a single panel. If that stops being true, the progressive disclosure has failed and the app has become a 63-control form.

## Measured facts that shape the build

- On an M1 Pro, a 144-frame 640×640 asset: `--recommend` ≈ 18s, `--auto` ≈ 60s, `--verify` ≈ 30s.
- `analyze()` is single-threaded and CPU-bound, peaking at **488 MB RSS**. Concurrency must come from `machine.default_jobs()` in the skill's harness — measured at **6** on this machine (6 performance cores; memory would allow 8) — not from `os.cpu_count()`, which reports 8 and includes efficiency cores.
- **A 1-frame preview is pixel-exact when it renders to an 8-bit-alpha format.** Measured on frame 62 of a 144-frame asset with identical explicit flags: **0 differing alpha pixels of 409,600** for WebP; 104 (0.025%) for GIF, caused by the shared palette and Bayer dithering, neither of which one frame can reproduce.
- Under `--auto`, erosion calibration measured a **different curve** from one frame than from the whole asset. Both landed on the same level in the one case tested; that is luck, not a guarantee. The preview must inherit the calibration from the full-asset analysis rather than re-deriving it.
- Runtime dependencies: Python with Pillow, numpy and scipy; the external binaries `gifsicle`, `pngquant` and `webpmux`; and `pillow-avif-plugin` for AVIF. AVIF is what the Discord-emoji path depends on.
- Browser-only execution (Pyodide/WASM) is impossible, not merely hard — scipy exists there, but gifsicle, webpmux and pillow-avif do not.
- Hosted execution on a small box was rejected on measured grounds: on claude.ai's single-CPU sandbox, `--target-kb` (a 120-rung grid re-encoding every frame) could not finish inside a tool call and `--verify` exceeded two minutes.

## Architecture, decided

**A local HTTP server plus a web UI.** All filesystem access lives on the server side — no File System Access API, no browser-only storage for anything that matters. This is what keeps the shell a sequence rather than a fork: Chrome under a `.app` shim now, Electron later, pointing at the same server and rendering the same UI with no changes to it.

**Hybrid engine boundary.** Rendering runs as a **subprocess**, because the work is long and a crash in scipy should cost one job rather than the app. Analysis runs **in-process**, because the reuse win is largest there — the result is computed once and passed forward instead of `--recommend`, `--auto` and `--verify` each re-deriving it.

**The flag surface is generated, not transcribed.** A `build_parser()` factory added to the skill lets Devoid introspect argparse for every option's type, choices, default and help text. This is the one change to the skill the project asks for, and it converts a 63-item hand-maintained UI into one that cannot drift when a flag is added or renamed.

## What this is not

Not a general background remover. The engine is chroma-key removal against a flat, keyable background — a photograph is out of scope, and static-image support means a one-frame *design*, not subject segmentation.

Not a replacement for the skill. If the two ever disagree, the skill is right.

Not a shared or hosted service. It runs on this machine, against local files, with the Mac awake.

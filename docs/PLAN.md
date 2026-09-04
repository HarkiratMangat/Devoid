# Devoid — implementation plan

*Written 2026-09-03 23:35 EDT. Read `HANDOFF.md` first for where the work stands and what was rejected.*

**Ordering principle:** the launch path and the engine boundary come first, then everything is built out fully. That is not slicing the deliverable — it is that the packaging is the part with no design interest and unbounded fiddliness, and it blocks everything if left late. Every other stage can then be built out in one pass and tweaked at the end.

**Definition of done for every task:** it works against a real corpus asset, it has the states listed in `DESIGN.md` that apply to it, and any number it quotes has a script that reproduces it.

---

## Stage 0 — the launch path *(do this before anything interesting)*

**0.1 Repo skeleton and dev loop.** `server/` (Python), `web/` (the prototype's files, moved), a single `devoid` entry point that starts the server and opens a window. No framework yet.

**0.2 Find the engine, or fail loudly.** Resolve the skill script — env var, then a configured path, then the synced claude.ai bundle — and **say which one was used**. A silent fallback lets the app and the live skill disagree invisibly.

**0.3 The environment check.** Python, Pillow, numpy, scipy, `gifsicle`, `pngquant`, `webpmux`, `pillow-avif-plugin`. Report what is missing and what it costs — **AVIF absent means the Discord-emoji path is dead**, which is a first-class failure state, not a warning. This is the `failed` state's first customer.

**0.4 One asset, end to end, ugly.** Server renders a real corpus GIF via subprocess and the browser shows the result. No design. This proves the whole spine and is the point of Stage 0.

**0.5 The `.app` shim.** Double-clickable, starts the server, opens a chromeless window. Ships the `failed` state from 0.3 as its first real screen.

---

## Stage 1 — the engine layer

**1.1 The validation boundary.** ⚠️ **One function takes the skill's raw JSON, asserts what it needs, and returns a typed object. Nothing downstream touches raw JSON.** The CLI ancestor learned this the expensive way and fixed it in exactly one function while four other call sites still assume shape. Test the boundary; do not test every consumer.

**1.2 In-process analysis.** Import the skill module and call `analyze()` directly. Compute once, pass forward — the CLI re-derives the same analysis three times and pays ~50% overhead for it.

**1.3 Subprocess rendering, with cancel.** Long work in its own process so a crash in scipy costs one job, not the app. **Cancel is part of this task, not a later polish** — a two-minute render with no way out is the single most hostile thing this app could ship.

**1.4 The job journal and atomic writes.** Write to a temp path, move on success. Journal what is in flight so a quit mid-batch is recoverable. Without this, a crashed job leaves a partial file that the *next* run silently skips past by escalating to `_v2`, quietly accumulating garbage.

**1.5 Concurrency from `machine.default_jobs()`.** Reuse the harness's own function — performance cores bounded by memory, not `os.cpu_count()`. One `analyze` peaks near half a gigabyte; naive eight-way parallelism on this machine is a mistake that file already prevents.

**1.6 `build_parser()` in the skill, and the generated flag surface.** The one change asked of the skill repo. Introspect argparse for every option's type, choices, default and help, and generate the drawer controls from it — so adding a flag cannot leave the UI stale. Its own PR, in that repo, under its conventions.

---

## Stage 2 — the surface

**2.1 Move the prototype in and wire it to the server.** Its component code is the starting point, not a reference.

**2.2 The eleven states.** One task each: `empty`, `loading`, `needs you`, `refused`, `running`, `cancelled`, `done`, `not checked`, `failed`, `conflict`, `blocked`. ⚠️ **The prototype has one of these.** Missing states are the fastest tell of an unfinished interface, and for this app they are where the honesty rules live.

**2.3 Selection.** Click, shift-click, select-all. The drawers act on the selection; today they claim to and cannot.

**2.4 Search.** With no labelled grid, finding one file among two hundred needs it.

**2.5 Drag-and-drop, through the `FileSource` interface.** ⚠️ `UploadedBytes` for the shim, `NativePath` for Electron — see `HANDOFF.md`'s open item 1. Building this without the interface is what makes the Electron migration expensive.

**2.6 The tri-state control.** `auto · value` until taken over. **Forced by the engine**: `--auto` applies its recommendation only where an option was left at its default, so a UI that sends every flag makes `--auto` a no-op and the tool stops thinking.

**2.7 Presets as goals.** Every number cited from the skill repo's measurements. No preset whose numbers cannot be cited.

---

## Stage 3 — the wipe, and what it unlocks

**3.1 Two-render machinery.** Render a variant pair for one flag at a time, cached. **Previews render to an 8-bit-alpha format even when the output is GIF** — measured pixel-exact there, and GIF differs by the shared palette and dither. When the target is GIF, say so on the preview.

**3.2 The preview inherits the calibration.** ⚠️ Do not let a single-frame render re-derive erosion from itself; pass the whole-asset calibration in. Measured: the curves differ and landed on the same level by luck.

**3.3 The seam.** Drag, keyboard, and the labels. Prototype has a working version.

**3.4 Generalise it.** Erosion, feather band, fade recovery, dither mode — every flag with a visible consequence becomes a seam rather than a number. **This is what dissolves "intuitive" versus "many more options".**

**3.5 The ledger.** Surface `opaque_survival_*`, `leftover_background_opaque_px`, `small_region_inflation` live under each control. **A blank ledger is the `not checked` state.**

---

## Stage 4 — the canvas *(the app's non-substitutable reason to exist)*

**4.1 Coordinate round-trip, with a test first.** Draw at display scale → store in source pixels → re-render → land on the same pixels. ⚠️ **Write the falsifier before the feature**: the skill's docs warn nothing can detect a mis-measured region, and a half-pixel error is invisible to the eye and permanent in the output.

**4.2 Draw, move, resize** rectangles and circles, with handles and hit-testing.

**4.3 The six region flags** — protect, remove, remove-track, unprotect, translucent, fade-protect — drawn rather than typed. **This is the capability no CLI and no static page can offer.**

**4.4 The eyedropper** for `--bg-color` and `--protect-outline-color`.

**4.5 Track a region across frames**, so a moving target is visible as it moves.

---

## Stage 5 — memory

**5.1 The label log.** ⚠️ **Design it in now; retrofitting discards every answer given before it existed.** One JSON line per decision: outline colour, enclosure ratio, frame counts, bbox, content type, verdict. The repo holds 714 hand-written labels for `edge_hardness` and **zero** for the protection decision, while the project's stated goal is autonomy. This makes Devoid a labelling instrument for its own engine's hardest unsolved problem, which is a far stronger reason to build it than drag-and-drop.

**5.2 History.** Past jobs, their settings, their verdicts, re-runnable with a tweak.

**5.3 Advice with undo.** Every suggestion paired with a one-click revert of exactly what it changed. **A suggestion without one does not ship.**

---

## Stage 6 — Electron

**6.1 Main process** spawning the server, owning the window. The UI does not change.
**6.2 `NativePath`** replaces `UploadedBytes`; native dialogs and Finder drag-drop.
**6.3 Menus, signing, notarisation, packaging.**

---

## Gates before calling any stage done

1. `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <changed>` — zero findings, and **not degraded** (an empty result from a degraded run means nothing).
2. **Greyscale render** — every state still distinguishable.
3. **Real corpus assets**, animating. Never art drawn for the occasion.
4. **Every quoted number has a script in `scripts/` that reproduces it.**
5. The panel-optional path still works: drop, answer, save, without opening a drawer.

---

## Deliberately not in this plan

**A cheaper product exists and was never costed against this one:** a self-contained HTML review page the *skill itself* emits — one file, no packaging, and it works inside claude.ai sessions, which is where this skill actually gets used. It cannot draw regions. If Devoid stalls, that is the thing to build instead, and Stage 3 is most of it.

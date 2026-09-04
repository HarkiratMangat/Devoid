# Devoid — implementation plan

*Written 2026-09-03 23:35 EDT. Read `HANDOFF.md` first for where the work stands and what was rejected.*

**Ordering principle:** the launch path and the engine boundary come first, then everything is built out fully. That is not slicing the deliverable — it is that the packaging is the part with no design interest and unbounded fiddliness, and it blocks everything if left late. Every other stage can then be built out in one pass and tweaked at the end.

**Definition of done for every task:** it works against a real corpus asset, it has the states listed in `DESIGN.md` that apply to it, and any number it quotes has a script that reproduces it.

---

## Stage 0 — the launch path *(do this before anything interesting)*

**0.1 Repo skeleton and dev loop.** Concretely, because the first version of this task left eleven decisions to invent:

- `git mv prototype/{index.html,app.css,app.js,assets} web/` — and **update `README.md` and `CLAUDE.md`, which both document `cd prototype && python3 -m http.server 8731` as the standing test procedure.** The move breaks it. `prototype/` does not survive; 2.1 does not repeat this move.
- `server/` — Python. **`http.server` is not adequate**: it is single-threaded and blocking, which breaks 1.3's cancel and 1.5's concurrency. Use a small ASGI server (`uvicorn` + `starlette`, or `aiohttp`); pick one here and record it, do not defer.
- **`pyproject.toml` with a pinned floor of Python 3.11** and a `.venv` the entry point creates on first run. No global installs.
- **`package.json`** at the repo root for Electron. `npm i -D electron`.
- **`devoid`** is `npm start` → Electron main → spawns the Python server → opens the window. There is no browser-tab stage: ⚠️ **opening a browser tab here reproduces exactly the shim the 2026-09-04 decision exists to prevent**, because a browser cannot hand the server a filesystem path.
- **Port 8732**, not 8731 — 8731 is the prototype's static-file port and reusing it collides with anyone still running it.
- ⚠️ **Stage 0 is exempt from gates 3 and 5** below. It cannot render a real asset or complete a drop-answer-save round trip; requiring it to would make 0.1 unpassable by its own definition.

**0.2 Find the engine, or fail loudly.** Resolve the skill script — env var, then a configured path, then the synced claude.ai bundle — and **say which one was used**. A silent fallback lets the app and the live skill disagree invisibly.

⚠️ **The synced-bundle path breaks 1.5.** `scripts/harness/` is tracked but NOT packaged, so `machine.default_jobs()` does not exist in the synced bundle. Resolve the harness **separately** from the script, and if it is absent, vendor the twenty lines rather than falling back to `os.cpu_count()` — that constant is wrong in both directions on this machine.

**0.3 The environment check.** Python, Pillow, numpy, scipy, `gifsicle`, `pngquant`, `webpmux`, `pillow-avif-plugin`. Report what is missing and what it costs — **AVIF absent means the Discord-emoji path is dead**, which is a first-class failure state, not a warning. This is the `failed` state's first customer.

**0.4 One asset, end to end, ugly.** Server renders a real corpus GIF via subprocess and the browser shows the result. No design. This proves the whole spine and is the point of Stage 0.

**0.5 Electron shell.** ⚠️ **Decided 2026-09-04: Electron from the start, not a `.app` shim first.** The shim sequence was presented as costless and is not — a browser cannot hand the server a filesystem *path*, only bytes or a typed string, so the shim stage would either upload multi-megabyte files into a staging directory (making the skill's "beside the source" output convention meaningless) or ask you to paste a path, which is the CLI experience this exists to escape. Electron's main process owns real paths, native dialogs and Finder drag-drop. Main process spawns the server, owns the window, ships the `failed` state from 0.3 as its first real screen.

---

## Stage 1 — the engine layer

**1.1 The validation boundary.** ⚠️ **One function takes the skill's raw JSON, asserts what it needs, and returns a typed object. Nothing downstream touches raw JSON.** The CLI ancestor learned this the expensive way and fixed it in exactly one function while four other call sites still assume shape. Test the boundary; do not test every consumer.

**1.2 In-process analysis.** Import the skill module and call `analyze()` directly — verified importable in ~0.3s with no side effects, entry point `analyze(input_path, max_samples=40, tolerance=15)`. Compute once and pass it forward.

⚠️ **Do not budget "~50% back".** The measured 50% is one duplicated `--verify` pass (~30s on top of `--auto`'s ~60s), not three re-derivations of `analyze()`. The real saving from in-process analysis is one `--recommend` (~18s on a 144-frame asset); the verify duplication is a separate fix.

**1.3 Subprocess rendering, with cancel.** Long work in its own process so a crash in scipy costs one job, not the app. **Cancel is part of this task, not a later polish** — a two-minute render with no way out is the single most hostile thing this app could ship.

**1.4 The job journal and atomic writes.** Write to a temp path, move on success. Journal what is in flight so a quit mid-batch is recoverable. Without this, a crashed job leaves a partial file that the *next* run silently skips past by escalating to `_v2`, quietly accumulating garbage.

**1.5 Concurrency from `machine.default_jobs()`.** Reuse the harness's own function — performance cores bounded by memory, not `os.cpu_count()`. One `analyze` peaks near half a gigabyte; naive eight-way parallelism on this machine is a mistake that file already prevents.

**1.6 `build_parser()` in the skill, and generated flag METADATA.** The one change asked of the skill repo. Its own PR, in that repo, under its conventions.

⚠️ **Generate the metadata, never the controls.** Introspecting argparse gives each option's type, choices, default and help text, so a hand-authored control can never drift from the flag it drives and a *new* flag surfaces as a warning that a drawer is missing one. **Generating a control per flag would produce the 63-control passthrough form `CLAUDE.md` forbids and `PRODUCT.md` calls a failure of the whole design.** The drawers stay hand-authored, in the person's vocabulary, and expose a deliberate subset.

---

## Stage 2 — the surface

**2.1 Move the prototype in and wire it to the server.** Its component code is the starting point, not a reference.

**2.2 The eleven states.** ⚠️ **Five already exist in the prototype — read them before designing anything, or you will rebuild them differently and the state set stops being one system.**

| already designed | to build |
|---|---|
| `empty` *(written but unreachable — `ASSETS.length === 0` is never true)*, `needs you`, `running`, `done`, `not checked` | `loading`, `refused`, `cancelled`, `failed`, `conflict`, `blocked` |

Six to build, not ten. Missing states are the fastest tell of an unfinished interface, and for this app they are where the honesty rules live.

**2.3 Selection.** Click, shift-click, select-all. The drawers act on the selection; today they claim to and cannot.

**2.4 Search.** With no labelled grid, finding one file among two hundred needs it.

**2.5 Drag-and-drop with real paths.** Electron's main process hands the server a `NativePath`; the renderer never touches the filesystem. ⚠️ **Keep it behind a one-method `FileSource` boundary anyway** — it is the seam a future web build would need, and it costs nothing now.

**2.6 The tri-state control.** `auto · value` until taken over. **Forced by the engine**: `--auto` applies its recommendation only where an option was left at its default, so a UI that sends every flag makes `--auto` a no-op and the tool stops thinking.

**2.7 Presets as goals.** Every number cited from the skill repo's measurements. No preset whose numbers cannot be cited.

---

## Stage 3 — the wipe, and what it unlocks

**3.1 Two-render machinery.** Render a variant pair for one flag at a time, cached. **Previews render to an 8-bit-alpha format even when the output is GIF** — measured pixel-exact there, and GIF differs by the shared palette and dither. When the target is GIF, say so on the preview.

**3.2 The preview inherits the calibration.** ⚠️ Do not let a single-frame render re-derive erosion from itself; pass the whole-asset calibration in. Measured: the curves differ and landed on the same level by luck.

**3.3 The seam.** Drag, keyboard, and the labels. Prototype has a working version.

⚠️ **Two things the prototype's version does NOT do, and neither is a polish item.** **(a) The two sides desynchronise.** They are two independently-looping `<img>` elements. Measured: megaphone and hurricane stay in sync (identical frame counts and durations), but `growth` drifts 1,220 ms per loop (123f/2,920 ms source against 85f/1,700 ms cut) and `paper-plane` drifts a full 2,400 ms. **The wipe's entire premise is comparing the same moment**, so on those assets it silently compares two different ones. **(b) The film strip does not scrub.** Clicking a frame updates `aria-current` and the counter and nothing else — the artwork is a looping GIF that never seeks.

Both have the same fix and it is **not small: decode frames to a canvas.** That is a real task and it belongs here, in Stage 3, not assumed done.

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

**5.1 The label log.** ⚠️ **Design it in now; retrofitting discards every answer given before it existed.** One JSON line per decision: outline colour, enclosure ratio, frame counts, bbox, content type, verdict. The repo holds **981 classified labels** for `edge_hardness` (1,038 entries, 57 of them prose notes rather than classifications) and **zero** for the protection decision, while the project's stated goal is autonomy. ⚠️ The skill repo's own docs still say 714 — stale by 267; do not copy that figure forward. This makes Devoid a labelling instrument for its own engine's hardest unsolved problem, which is a far stronger reason to build it than drag-and-drop.

**5.2 History.** Past jobs, their settings, their verdicts, re-runnable with a tweak.

**5.3 Advice with undo.** Every suggestion paired with a one-click revert of exactly what it changed. **A suggestion without one does not ship.**

---

## Stage 6 — ship it

**6.1 Menus** — native app menus, keyboard shortcuts, the About panel. **6.2 Signing and notarisation.** **6.3 Packaging** — a `.dmg` or a `.app` that runs on a machine that is not this one, with the environment check from 0.3 as the failure path.

---

## Gates before calling any stage done

1. `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <changed>` — **exactly one finding, `repeating-stripes-gradient`, which is known and accepted** (see `DESIGN.md`'s checks: it is the alpha checkerboard and the hatch, both of which are the domain's own notation). Anything else is a real defect. And **not degraded** — an empty result from a degraded run means nothing.
2. **Greyscale render** — every state still distinguishable.
3. **Real corpus assets**, animating. Never art drawn for the occasion.
4. **Every quoted number has a script in `scripts/` that reproduces it**, and `python3 scripts/measure_ledger.py --check` exits 0. ⚠️ Two hand-rolled versions of that comparison were written during the audit and **both were wrong** — one regex spanned neighbouring entries, the next rejected optional whitespace, each reporting a mismatch that did not exist. Use the script; do not re-derive the check.
5. The panel-optional path still works: drop, answer, save, without opening a drawer.

---

## Deliberately not in this plan

**A cheaper product exists and was never costed against this one:** a self-contained HTML review page the *skill itself* emits — one file, no packaging, and it works inside claude.ai sessions, which is where this skill actually gets used. It cannot draw regions. If Devoid stalls, that is the thing to build instead, and Stage 3 is most of it.

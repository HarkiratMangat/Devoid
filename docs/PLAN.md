# Devoid — implementation plan

*Written 2026-09-03 23:35 EDT. Read `HANDOFF.md` first for where the work stands and what was rejected.*

**Ordering principle:** the launch path and the engine boundary come first, then everything is built out fully. That is not slicing the deliverable — it is that the packaging is the part with no design interest and unbounded fiddliness, and it blocks everything if left late. Every other stage can then be built out in one pass and tweaked at the end.

**Definition of done for every task:** it works against a real corpus asset, it has the states listed in `DESIGN.md` that apply to it, and any number it quotes has a script that reproduces it.

---

## The opening sequence — the first ten things to type

Tick these in order. Each has a visible success condition, so a stall is obvious rather than silent.

| # | command | success looks like |
|---|---|---|
| 1 | `cd "/Applications/Claude Code/Devoid" && git checkout -b feat/stage-0` | on a branch, not `main` |
| 2 | `python3 scripts/measure_ledger.py --check` | `ledger matches the measurement (8 assets checked)` — proves the repo is in the state this plan assumes |
| 3 | *(moved — see 7b. Checking a capability before the interpreter that needs it exists checks nothing)* | — |
| 4 | `node ~/.claude/skills/impeccable/scripts/detect.mjs --json prototype/index.html prototype/app.css` | exactly one finding, `repeating-stripes-gradient`, and **no DEGRADED line**. ⚠️ **Judge the output, never the exit code** — the correct result exits **2**, and a run against files that do not exist prints `Warning: cannot access` and exits **0** with `[]`. The documented "no DEGRADED line" guard does not catch that. After step 5 this command's paths are stale and it will "pass" |
| 5 | `mkdir -p server web tests && git mv prototype/index.html prototype/app.css prototype/app.js prototype/assets web/` then **re-run step 2** | `web/` holds four entries **and `measure_ledger.py --check` still exits 0** |
| 6 | `npm init -y && npm pkg set main=main.js scripts.start="electron ." && npm pkg delete scripts.test && npm i -D electron` | `package.json` has `start`. ⚠️ **`npm init -y` alone writes `"main": "index.js"` and no `start` script**, so step 10's `npm start` fails with *Missing script: start* |
| 7 | write `pyproject.toml` — see below for its **exact contents**, which are not obvious — then `python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"` | `.venv/bin/python -c "import starlette, PIL, numpy, scipy"` is silent |
| 7b | `.venv/bin/python -c "from PIL import features; print(features.check('avif'))"` | `True`. ⚠️ **On `.venv/bin/python`, not `python3`** — measured, the system interpreter has the whole imaging stack and a fresh venv has none of it, so testing `python3` passes while the app's real interpreter cannot import PIL at all |
| 8 | `.venv/bin/pytest tests/ -q` against one placeholder test | `1 passed` — **a test runner before there is code to test** |
| 9 | write `server/app.py` serving `web/` on **8732**, then `.venv/bin/uvicorn server.app:app --port 8732 &` | `curl -s -o /dev/null -w "%{http_code}" localhost:8732` → `200`. ⚠️ **Background it** — uvicorn runs in the foreground and a literal reading of this table blocks here forever. Step 10's Electron spawns it properly; this is a one-off check, so kill it after |
| 10 | write `main.js`, then `npm start` | a native window opens on the contact sheet, animating |

⚠️ **At step 5, run `rg -l "prototype/" -- . --hidden -g '!.git'` and fix every hit** — do not work from a list, which goes stale. `README.md` and `CLAUDE.md` document the old test procedure, `DESIGN.md` points at `prototype/app.css`, and both measurement scripts used to hardcode the path. **The scripts now resolve `web/` or `prototype/` themselves**, so gate 4 survives the move — but nothing else does automatically.

### `pyproject.toml` — the exact contents, because a literal reading of step 7 fails

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "devoid"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "starlette", "uvicorn",
  # ⚠️ THE ENGINE'S OWN STACK. Omitting these produces a server that cannot
  # import the skill — measured: ModuleNotFoundError: No module named 'PIL'
  # from the server's first request. Stage 1.2 is unreachable without them.
  # Pinned to the versions the skill's 981-label corpus was measured against;
  # a different numpy is a silent engine-behaviour change with no gate.
  "pillow==12.3.0", "numpy==2.4.6", "scipy==1.17.1",
]

[project.optional-dependencies]
dev = ["pytest"]      # not a runtime dependency; `pip install -e ".[dev]"`

[tool.setuptools]
packages = ["server"]   # flat-layout autodiscovery fails on this tree

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Also create `server/__init__.py`, or step 9's `server.app:app` will not import.

⚠️ **Nothing in this sequence renders an asset.** That is 0.4, and it is the point of Stage 0 — steps 1–10 only prove the spine holds.

---

## Stage 0 — the launch path *(do this before anything interesting)*

**0.1 Repo skeleton and dev loop.** Concretely, because the first version of this task left eleven decisions to invent:

- `git mv prototype/{index.html,app.css,app.js,assets} web/` — and **update `README.md` and `CLAUDE.md`, which both document `cd prototype && python3 -m http.server 8731` as the standing test procedure.** The move breaks it. `prototype/` does not survive; 2.1 does not repeat this move.
- `server/` — Python, **`uvicorn` + `starlette`** (recorded here so the table and the prose agree). `http.server` is single-threaded and blocking.

  ⚠️ **ASGI alone does NOT fix that, and the plan previously implied it did.** Measured on this exact stack with `analyze()` called from an `async def` route: a static request took **0.0016 s** idle and **2.1128 s** during an analysis — a **1,290×** stall, exactly what `http.server` would do. The event loop blocks on any synchronous call.

  **So decide the strategy here, at 0.1, not at 1.3:** every call into the engine goes through `run_in_threadpool` (or a plain `def` route, which Starlette threadpools for you), and rendering goes to a subprocess. **Add a falsifier at step 9½: a static request issued during an `analyze()` must return in under 50 ms.** Without it, 1.5's concurrency has nowhere to land and 1.3's cancel cannot work.
- **`pyproject.toml` with a pinned floor of Python 3.11** and a `.venv` the entry point creates on first run. No global installs.
- **`package.json`** at the repo root for Electron. `npm i -D electron`.
- **`devoid`** is `npm start` → Electron main → spawns the Python server → opens the window. There is no browser-tab stage: ⚠️ **opening a browser tab here reproduces exactly the shim the 2026-09-04 decision exists to prevent**, because a browser cannot hand the server a filesystem path.
- **Port 8732**, not 8731 — 8731 is the prototype's static-file port and reusing it collides with anyone still running it.
- **`tests/`** with a runner wired at step 8. ⚠️ **Nothing tests the prototype today** — the CLI ancestor carried 52 falsifiers and Devoid carries one script's `--check`. Standing the runner up before there is code to test is the only time it is free.
- ⚠️ **Stage 0 is exempt from gates 3 and 5** below. It cannot render a real asset or complete a drop-answer-save round trip; requiring it to would make 0.1 unpassable by its own definition.

**0.2 Find the engine, or fail loudly.** Resolve the skill script — env var, then a configured path, then the synced claude.ai bundle — and **say which one was used**. A silent fallback lets the app and the live skill disagree invisibly.

⚠️ **The synced-bundle path breaks 1.5.** `scripts/harness/` is tracked but NOT packaged, so `machine.default_jobs()` does not exist in the synced bundle. Resolve the harness **separately** from the script, and if it is absent, vendor the twenty lines rather than falling back to `os.cpu_count()` — that constant is wrong in both directions on this machine.

**0.3 The environment check.** Python, Pillow, numpy, scipy, `gifsicle`, `pngquant`, `webpmux`, and AVIF. Report what is missing and what it costs — **AVIF absent means the Discord-emoji path is dead**, which is a first-class failure state, not a warning. This is the `failed` state's first customer.

⚠️ **Test AVIF as a CAPABILITY, never as a package.** `import pillow_avif` fails on this machine and AVIF works perfectly — Pillow 12.3 ships `PIL.AvifImagePlugin` natively and the third-party plugin is obsolete. `'AVIF' in Image.SAVE` is also False until `Image.init()` runs, because Pillow registers plugins lazily. The correct check is `PIL.features.check('avif')`, which is exactly what the skill's own `_avif_available()` does — mirror it rather than inventing one.

**0.4 One asset, end to end, ugly.** Server renders a real corpus GIF via subprocess and the browser shows the result. No design. This proves the whole spine and is the point of Stage 0.

**0.5 Electron shell.** ⚠️ **Decided 2026-09-04: Electron from the start, not a `.app` shim first.** The shim sequence was presented as costless and is not — a browser cannot hand the server a filesystem *path*, only bytes or a typed string, so the shim stage would either upload multi-megabyte files into a staging directory (making the skill's "beside the source" output convention meaningless) or ask you to paste a path, which is the CLI experience this exists to escape. Electron's main process owns real paths, native dialogs and Finder drag-drop. Main process spawns the server, owns the window, ships the `failed` state from 0.3 as its first real screen.

---

## Stage 1 — the engine layer

**1.1 The validation boundary.** ⚠️ **One function takes the skill's raw JSON, asserts what it needs, and returns a typed object. Nothing downstream touches raw JSON.** The CLI ancestor learned this the expensive way and fixed it in exactly one function while four other call sites still assume shape. Test the boundary; do not test every consumer.

**1.2 In-process analysis.** Import the skill module and call `analyze()` directly. **Verified end to end under a running server**, not just standalone: silent on stdout and stderr, no `sys.exit` (it has a proper `__main__` guard), no mutation of the skill module's own globals, and byte-identical results across separate server processes.

⚠️ **Import cost is `0.20 s` warm and `3.82 s` cold.** The cold number is the one Electron pays on first launch after an install, and the one a packaged `.dmg` pays for every new user — budget it in 0.5 and 6.3, and show the `loading` state during it.

⚠️ Importing does mutate the *process*: `sys.modules` +292, `warnings.filters` +5, and `PIL.Image.OPEN/SAVE` populate lazily on first use. Harmless, but it means an import-time capability probe can read False before anything has run. Compute once and pass it forward.

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

~~**2.4 Search.**~~ **Cut.** Speculative until scrolling actually annoys you. If it comes back, state filters (`needs you`, `not checked`, `failed`) beat a text box — you hunt a problem, not a filename you did not choose.

**2.5 Drag-and-drop with real paths.** Electron's main process hands the server a `NativePath`; the renderer never touches the filesystem. ⚠️ **Keep it behind a one-method `FileSource` boundary anyway** — it is the seam a future web build would need, and it costs nothing now.

**2.6 The tri-state control.** `auto · value` until taken over. **Forced by the engine**: `--auto` applies its recommendation only where an option was left at its default, so a UI that sends every flag makes `--auto` a no-op and the tool stops thinking.

**2.6b The `conflict` policy — decide, do not inherit.** `PRODUCT.md` promises both "never overwrite" and "follows the `_v2` escalation". Asking before writing and escalating-then-reporting are different products. Pick one.

**2.7 Presets as goals. Every number cited from the skill repo's measurements. No preset whose numbers cannot be cited.

---

## Stage 3 — the wipe, and what it unlocks

**3.0a ⚠️ THE ANSWER FLAGS ARE KEYED PER OUTLINE COLOUR; THE UI ASKS PER REGION.** `--assume-protect` / `--assume-remove` take hex colours, and the engine filters pending refusals by `outline_color`. But `ambiguous_protection` returns one entry per **region**, each with its own `bbox_xyxy` — and the prototype asks, shows and logs per region.

**Two regions sharing an outline colour cannot be answered differently.** Answering them differently emits `--assume-protect X` and `--assume-remove X` at once, which is incoherent. This is not a corner case: `--recommend` on the 640px megaphone derives **two** colours, `f0c850,002864`.

**Decide before building the interview:** group regions by colour into one question (honest, and the engine's actual granularity), or ask per region and refuse to submit when two answers collide. **Do not discover this at the flag-assembly step.**

**3.0b Decide when the seam CANNOT help.** The question card survives only below a visible-difference threshold — a sub-half-opacity fade, a three-pixel sliver, anything where two renders look identical. ⚠️ **Pick the number with a render in front of you, not in advance.** Suggested shape: differing alpha px as a fraction of the disputed region's own area, measured on the preview pair. Below it, fall back to the boxed-and-hatched card; above it, the seam.

**3.1 Two-render machinery.** Render a variant pair for one flag at a time, cached. **Previews render to an 8-bit-alpha format even when the output is GIF** — measured *visually* identical there (11 px of 409,600, max delta 3), while GIF flips 8 whole pixels via the shared palette and dither. When the target is GIF, say so on the preview.

**3.2 The preview inherits the calibration.** ⚠️ Do not let a single-frame render re-derive erosion from itself; pass the whole-asset calibration in. Measured: the curves differ and landed on the same level by luck.

**3.3 The seam.** Drag, keyboard, and the labels.

⚠️ **The prototype's seam compares the WRONG PAIR and looks finished.** It puts the untouched source on the left and the cut output on the right — a before/after. The product needs **the two answers**: an `--assume-protect` render against an `--assume-remove` render. Before/after cannot discriminate, because both candidate answers look identical on the source side. The drag, keyboard and labels are reusable; the pair is not.

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

**5.1 The label log — BUILT, THEN REMOVED. Do not build it again.** ⚠️ **Retired 2026-09-07 12:02 EDT**, on Harkirat's call: *"drop the labels from the app. it's just adding friction and the repo has its own corpus that i supply it anyway."* The reasoning that follows was the reasoning at the time and is kept because it is a good argument that turned out to be answering the wrong question — Devoid never READ the log; the engine repo did, and supplies its labelled data deliberately. `docs/PRODUCT.md` carries the retirement; `labels/README.md` explains the kept file; `devoid-resolved-list.md` carries the closure. **The original text, struck through in effect:**

⚠️ **Living here costs discoverability, deliberately.** The people who would use these labels are working on the skill's autonomy, in *that* repo, and nothing there surfaces a file in this one. A tracked pointer at `Gif-Background-Remover/scripts/harness/labels/README.md` closes the gap — **keep it accurate if this path moves.** One JSON line per decision: outline colour, enclosure ratio, frame counts, bbox, content type, verdict. The repo holds **981 classified labels** for `edge_hardness` (1,038 entries, 57 of them prose notes rather than classifications) and **zero** for the protection decision, while the project's stated goal is autonomy. ⚠️ The skill repo's own docs still say 714 — stale by 267; do not copy that figure forward. This makes Devoid a labelling instrument for its own engine's hardest unsolved problem, which is a far stronger reason to build it than drag-and-drop.

**5.2 History — `jobs.jsonl`, a separate file and schema from the labels.** Append-only: input path, settings, output path, verdict, timestamp. Re-run with a tweak by loading a line.

⚠️ **There is ONE log with one writer now (2026-09-07 12:02 EDT):** `jobs.jsonl`. The separation rule survives in the only form still meaningful — `jobs.jsonl` must never start appending into `labels/protection.jsonl`, which is kept but no longer written. `tests/test_jobs.py` asserts both the separation and that the kept file still exists.

**No stored thumbnails** — point at the output files on disk. A missing file is information: it says that output was deleted.

**No database until a lookup is actually slow.** A linear scan over a few hundred lines is nothing. If it ever stops being nothing, add a SQLite index **rebuilt from the log on startup**, so the log stays the truth, a corrupt index is `rm` and restart, and a schema change never needs a migration.

**5.3 Advice with undo.** Every suggestion paired with a one-click revert of exactly what it changed. **A suggestion without one does not ship.**

---

## Stage 6 — ship it

**6.1 Menus** — native app menus, keyboard shortcuts, the About panel. **6.2 Signing and notarisation.** **6.3 Packaging** — a `.dmg` or a `.app` that runs on a machine that is not this one, with the environment check from 0.3 as the failure path.

---

## Edge cases no stage owns yet — assign each one before it bites

Found by an audit, not by use. Each is a situation that *will* occur and that nothing currently handles.

| situation | what happens today | owner |
|---|---|---|
| **Offline.** `index.html` loads Archivo and Spline Sans Mono from Google Fonts, in an app whose whole premise is local | silent fallback to Helvetica — and the width axis and `tabular-nums` are load-bearing in `DESIGN.md` | 6.3 — self-host the two faces |
| **Motion sensitivity.** An animated `<img>` cannot be paused by CSS | 200 looping images with no off switch, for a user who asked for none | 3.3, once frames decode to canvas |
| **200 assets decoding at once.** "one, twelve and two hundred are the same layout" is a *layout* claim used as a *performance* one | 200 concurrent decoders at full source resolution | 2.2 — a `loading` state that means something |
| **Port 8732 already bound** — a second window, a crashed run | uvicorn exits, Electron shows a blank window | 0.5 — probe, then fail loudly or pick the next free port |
| **Two windows, one log.** "one writer each" is a schema rule, not an enforced one | interleaved partial JSON lines in `jobs.jsonl` — and `PLAN`'s "a corrupt index is `rm` and restart" assumes the *log* cannot corrupt | 5.1 — single-instance lock, or `O_APPEND` line-atomic writes |
| **The source file moved, renamed, or is on a sleeping disk** | `PLAN` says a missing output "says that output was deleted". It says no such thing | 5.2 — distinguish absent from deleted |
| **Non-square or very large assets.** `.wipe` and the contact-sheet tile are both `aspect-ratio:1`; the corpus is eight 260×260 squares | a 1920×480 banner letterboxes into a square, and the seam's useful range collapses — while 4.1's coordinate round-trip has to land on source pixels through it | 4.1 |
| **Filenames with spaces or quotes.** `--auto` builds its flags by `shlex.split`ing `suggested_command`, a shell *string* | undefined — the corpus has no such filename; a Finder drag will | 1.1, at the validation boundary |
| **Nested concurrency.** 1.5 runs `default_jobs()` = 6 jobs, and the skill's own `--target-kb` fit probes its own pool (~6 workers) | 6 × 6 workers at ~488 MB per analyse, on a 16 GB machine. Cancel may also orphan the inner pool | 1.3 and 1.5 together |
| **Two engine versions.** 0.2 may resolve the synced claude.ai bundle, which is a *different version* of the skill | the validation boundary checks JSON *shape*, not engine *version*; two installs whose `--recommend` differ semantically both validate | 1.1 — record the engine's version alongside every result |

## Gates before calling any stage done

1. `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <changed>` — **exactly one finding, `repeating-stripes-gradient`, which is known and accepted** (see `DESIGN.md`'s checks: it is the alpha checkerboard and the hatch, both of which are the domain's own notation). Anything else is a real defect. And **not degraded** — an empty result from a degraded run means nothing.
2. **Greyscale render** — every state still distinguishable.
3. **Real corpus assets**, animating. Never art drawn for the occasion.
4. **Every quoted number has a script in `scripts/` that reproduces it**, and `python3 scripts/measure_ledger.py --check` exits 0. ⚠️ Two hand-rolled versions of that comparison were written during the audit and **both were wrong** — one regex spanned neighbouring entries, the next rejected optional whitespace, each reporting a mismatch that did not exist. Use the script; do not re-derive the check.
5. The panel-optional path still works: drop, answer, save, without opening a drawer.

---

## Deliberately not in this plan

**A cheaper product exists and was never costed against this one:** a self-contained HTML review page the *skill itself* emits — one file, no packaging, and it works inside claude.ai sessions, which is where this skill actually gets used. It cannot draw regions. If Devoid stalls, that is the thing to build instead, and Stage 3 is most of it.

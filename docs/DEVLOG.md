# DEVLOG — Devoid

The **story** behind the app: the traps, the reasoning behind decisions, the things that were tried and walked back, and the mistakes worth not repeating. Started 2026-09-05 00:07 EDT, at the end of the session that built Stages 0–6 and then audited them.

**How this differs from the other records:**

| file | holds |
|---|---|
| `docs/CHANGELOG.md` | *what shipped*, versioned |
| `docs/PLAN.md` | the build order and its gates |
| `docs/PRODUCT.md` | the brief, and the measurements behind its constraints |
| `docs/DESIGN.md` | the visual system |
| `CLAUDE.md` | *how to work here* — terse standing rules, reference-style |
| `devoid-deferred-list.md` | *what is still open* |
| **`DEVLOG.md` (this)** | *the journey and the lessons* — narrative, dead ends left in, because the dead ends are half the value |
| `docs/HANDOFF.md` | ⚠️ **ephemeral by design** — superseded and renamed. Nothing durable lives there |

**Why this file and not `CLAUDE.md`.** `CLAUDE.md` says of itself: *"This file is only what a session needs to work here."* It is a rules file — short, imperative, read every session. A trap needs its **evidence** attached or the next session re-derives it or, worse, disbelieves it. Those two shapes fight each other in one file: the rule gets long, or the evidence gets cut. So the one-line rule stays in `CLAUDE.md` and the account lives here.

---

## ⚠️ Traps — each of these cost real time, and none is obvious

### A browser pane is not the app, and it lies quietly

The pane used for most of the first build session reports `document.visibilityState === 'hidden'` **permanently** and fires **zero** `requestAnimationFrame` callbacks. Nothing errors. Nothing warns. Anything built on a rAF loop simply does not run, and anything mid-transition samples at whatever value it happened to be at.

It produced **two confident, wrong defect claims**, both retracted:

| claimed | true |
|---|---|
| the region canvas is `0×0` and unusable | `689×689` in a real window, exactly as `web/canvas.js`'s own comment predicted |
| two controls fail contrast at 1.13:1 and 1.36:1 | both were **unfinished CSS transitions** in a pane that never composites |

**The fix is a script, not a habit:** `npx electron scripts/capture-window.mjs` drives the real Electron window and captures every state through `webContents.capturePage`. It is the only surface that tells the truth about this app.

⚠️ **The deeper mistake was not the pane — it was never opening the window.** Electron was chosen at `PLAN.md`'s Stage 0 *so that a real window would exist*, and it was not opened until the very end. The first real capture immediately showed the artwork rendering at **~290px inside a ~1900px stage** — the focal element was the smallest thing on screen, invisible to every pane screenshot taken before it. It is ~490px now.

### `element.focus()` does not trigger `:focus-visible`

A programmatic focus call will report a **missing focus ring that is present**. Only real keyboard interaction sets `:focus-visible`. Press an actual Tab, or assert on the rule rather than on the rendered outline.

### Wait ~1s after any state change before measuring or screenshotting

Transitions here run **300–420ms**. A mid-flight sample looks exactly like a bug, and produced one of the two false contrast failures above. `scripts/capture-window.mjs` settles 1400ms by default for this reason.

### The reachability bug class — what `git merge` structurally cannot catch

Six worktree-isolated agents built Stages 1–6 in parallel against a frozen `docs/API-CONTRACT.md`, and the merge was clean. **Clean is the problem.** Two files do not conflict when *nothing references either of them* — a merge resolves overlapping text, and has no opinion about whether the surface ever calls the module that was just merged in.

Real instance: `#regiontools` and `#regioncanvas` shipped with the `hidden` attribute set (added during the Stage-4 merge), so **the plotter — the app's non-substitutable reason to exist, per `PLAN.md` Stage 4 — was unreachable in the running app while every test passed.**

**After any multi-agent merge, audit reachability explicitly:** for each merged module, find the call site in the running surface. "It merged cleanly" is not evidence that it runs.

### `str.replace` without a count matches inside a longer selector

A scripted edit meant for `.table` matched inside `.emitting .table`, turning a light-mode rule into an unconditional one — a **full-screen white wash in dark mode**. Pass a count, or anchor the match on enough surrounding bytes to be unique. This is the same class as the "assert before every replacement" rule in the global working agreement, one level finer: the assert passed, because the anchor *was* present — just in more places than intended.

### A `const` referenced before its declaration kills module init silently

A `ResizeObserver` was wired to a `wipe` const declared later in the file. Temporal dead zone: the module throws at load, the page renders half an app, and **the console error scrolls past** while the visible symptom is "some things just don't work". Using `$('#wipe')` at the call site fixed it. Suspect module-init order whenever several unrelated features stop working at once.

### Starlette 1.6 removed `on_startup`

Startup work goes in a `lifespan` async context manager now (`server/app.py`). The old kwarg is not deprecated — it is gone.

### A subagent reported a commit that did not exist

The Stage 2 agent reported its work committed. It was not; the worktree was dirty. **Check the VCS diff, never the agent's own success report** — this is the `verification-before-completion` rule in its most expensive form, because the failure is silent and the report is confident.

### Conflict markers survived into a committed file

`tests/conftest.py` was committed carrying `<<<<<<<` markers, caught only by a pytest `SyntaxError`. After any hand merge, grep the whole tree for markers — class-level, not just the files you remember touching.

### "93 pytest passed" is not evidence for a CSS change

That claim was attached to commits that changed only `web/app.css`. The tests are Python; they touch no line of `web/`. **A true statement in the wrong place is still a false claim**, because it borrows credibility for something unverified. See `devoid-deferred-list.md` item 2 — the UI has no automated coverage at all.

---

### The camera was lying: `capturePage()` returned stale frames for four states

`scripts/capture-window.mjs` called `app.disableHardwareAcceleration()` for *"deterministic pixels in CI and here"*. It made the compositor stop producing frames, so `webContents.capturePage()` handed back **the last committed one**. Measured 2026-09-05: eight captures, **three distinct images** — states 01 through 04 were byte-identical while the DOM was changing correctly at every step (`emitting` flipping, `open` and `empty` toggling, the sheet going 6 cards to 0).

**So every visual claim made through that script after the first state or two was read off an earlier state's picture** — including, possibly, the previous session's "artwork ~290px → ~490px, verified by re-capture".

The fix is three things together: leave hardware acceleration **on**, set `backgroundThrottling: false`, and call `webContents.invalidate()` before each `capturePage()`. And the gate now **hashes every capture and fails if two states produce identical bytes**, which is the check that would have caught it on day one. ⚠️ *Deterministic and wrong is worse than variable and true.*

### Electron caches `web/` hard enough to certify code that is no longer on disk

An edit to `app.js` was invisible across three consecutive runs of a **freshly spawned** Electron process, and the gate passed on the old file. `win.webContents.reloadIgnoringCache()` before asserting is now mandatory in `capture-window.mjs`. Same shape as verifying against a stale dev server: the process being new is not the same as the bytes being new.

### A dispatch branch that had never once executed

`renderTabs()` destructured every drawer spec as `[label, ref]`. A report row is a **one-element** spec (`['report:refusal']`), so `ref` was `undefined`, the `if (!ref)` branch above caught it, and the `kind === 'report'` dispatch below was **unreachable from the day it was written**. It surfaced only when a second report — the history drawer — needed the dispatch to work, and printed "Nothing refused" over a log holding a real row.

### `Promise.all` made a fast panel wait on a slow one

The history drawer fetched `/api/history` and `/api/engine/status` together. The second imports the whole engine module on its first call, so the drawer sat on "Reading the log…" for seconds while the log itself had answered in milliseconds. **Nothing asserted could see it** — every check passed, because by the time the probe ran the fetch had landed. It was found by looking at the screenshot.

---

### "Not standalone" was three bugs wearing one label

The packaged app was documented as *"carries no Python runtime and still spawns `.venv/bin/python` beside itself, so it runs from this repo"*. Believable, specific, and it hid two more failures nobody had looked for — because **nobody had ever launched the packaged app**, only built it.

`server/**/*.py` and `web/**/*` were listed in electron-builder's `files:`, which puts them **inside `app.asar`**. Node can read an asar; Python cannot. So the server could not have been imported, and `StaticFiles(directory=WEB_DIR)` could not have served a single byte of the interface. And `waitForServer` retried forever with no deadline, so all of that would have presented as **a bouncing icon and nothing else**.

The lesson is the same one this project keeps relearning in new costumes: *building* an artifact is not *running* it. A `dist:dir` that exits 0 says the files were copied, and says nothing about whether the thing works.

---

### Reachability, instance six — and the pattern is now the project's signature failure

Six subsystems in this app have been finished, tested and connected to nothing: the plotter (hidden by an attribute), the history routes (no caller), `devoid:regions-changed` (dispatched on `window`, heard on `document`), `devoid:asset-opened` (heard, never dispatched), the crash journal's writers (never called), and `loadPair` — the whole answer-pair seam, which is the product's thesis.

**What they have in common is that every one of them passes its own tests.** A route test proves a route answers. A pure-function test proves a function computes. Neither can see whether anything reaches them, and a `git merge` cannot either — two files do not conflict when nothing references either of them.

**The check that finds this class is not a test, it is a question: where is the call site?** Grep for the export, not for the definition. If the only references are the definition and the export, it is dead — however green the suite is.

### `--auto` is not optional on the flags that answer it, and the failure is invisible

`--assume-protect` and `--assume-remove` answer `--auto`'s interview. Passed to a plain render they are accepted, parsed, and **do nothing**, because nothing asked the question. Measured on `megaphone.src.gif` at `002864`: without `--auto`, **0** differing alpha px between the two answers — on the sampled frame, on frames 0/30/72/110/143, and on the full 144-frame asset. With `--auto`, **875-2,076 px per frame**.

⚠️ **The failure mode is what makes it dangerous.** Two identical renders drive the conspicuity gate to zero, the seam correctly decides it cannot help, and the question card appears — which is the designed fallback and looks completely healthy. The app was choosing the right behaviour from a measurement that was silently meaningless.

**The tell was available and was not read:** the ordinary-flag branch of `_answer_argv` went through `build_argv(auto=True)` and the answer branch did not. Two branches of one function disagreeing about a flag that changes everything.

---

## Decisions, and what was tried first

### The world: the ground is the void, the tools stay the matte world

The original metaphor was a lamp over a workbench. It was replaced because the app is called **Devoid** and its job is to make pixels into **nothing** — deep space is nothing, rendered. The replacement was not a repaint: the app's two existing load-bearing colours turned out to already be **the two colours of an accretion disk**, so the new world *explained* the palette rather than replacing it. Lighting states are `collapsed` (dark) and `emitting` (light); lensing is banned from the stage, because the stage is where you judge an edge.

Measured values live in `.interface-design/system.md`; the world itself is `docs/DESIGN.md`.

### The dark/light toggle: three defaults before asking the right question

Rejected in order — **a colour-only dot** (nothing about it says "lighting"), **an iOS rocker** (a borrowed idiom that means "on/off", not "which world"), **a circle with a ring** (still a dot, now with a halo). Each was reached for reflexively.

The question that ended it: *what object in **this** app already has two states?* The answer is **the seam** — the wipe's own divider, which is the product's thesis. The toggle is now a miniature of it: a 56×28 rounded rect with a light rim that sweeps between 10% and 72%. It is not a circle, it is not borrowed, and it teaches the seam before you have opened an asset.

**The lesson is the sequence, not the answer.** Three defaults were tried before the product itself was consulted.

### The starfield is generated, never tiled — ⚠️ RETRACTED 2026-09-06

The first version tiled an SVG. It was called out immediately and correctly: **a repeating star pattern is the one thing a sky never does**, and the eye catches a repeated constellation instantly. It is now drawn once to fit, into a canvas:

```
n     = round(w * h / 3300)          // density
m     = pow(random(), 2.4)           // magnitude curve — many faint, few bright
r     = 0.42 + m * 1.18              // radius
alpha = (emitting ? 0.34 : 0.92) * (0.30 + m * 0.7)
```

The `2.4` exponent is what makes it read as a sky rather than as noise: a uniform distribution gives an even field of same-sized dots, which is exactly what a tile looks like.

⚠️ **RETRACTED 2026-09-06 — the heading and the sentences above are wrong, and are kept because the correction is the useful part.** Only the *full-screen* field was rebuilt as a canvas. The tiles kept the repeating SVG. `--stars-a` is still **referenced**, not merely defined, at `web/app.css:106` — applied to every `.chk-s` surface, which is the contact-sheet tile (`web/app.js:229`), the matte swatch (`web/index.html:63`) and the wipe's cut side (`#aftbg`, `web/index.html:73`) — and a second time at `web/app.css:464` for `.lamp .sg-void`. `--stars-b` is defined in both lighting blocks and referenced **zero** times: a dead token. `web/app.js:233` randomises `background-position` per tile off a hash of the asset id, which hides the repeat rather than removing it — a mitigation, not a removal.

So Harkirat's own rejection — *"your star pattern is literally a copy paste. Stars are never a copy paste pattern."* — is still shipping on every tile, while this entry claimed it had been fixed. Removing `--stars-a` from `.chk-s` and deleting `--stars-b` is **Task 16 of `docs/superpowers/plans/2026-09-06-devoid-remediation.md`**; the finding is F24 in the matching design spec.

### Skills were run as background reading, and then as procedures

The design skills were first read for direction and then not *executed*. Run properly as procedures at the end, `interface-design`'s four checks (swap · squint · signature · token) immediately found **a variable-font width axis doing nothing** — 92/96/108% is invisible; the tiers are now 80/88/116% — and **a light mode that dissolved under blur**, which is `devoid-deferred-list.md` item 7. Neither was findable by reading the skill.

⚠️ **RETRACTED 2026-09-06 — the width-axis fix was values-deep only, and the sentence above overstates it.** The tiers did move from 92/96/108% to 80/88/116%, but nobody checked whether the elements named in the rule can render a width axis at all. `web/app.css:589` applies `font-stretch:80%` to ten selectors — `.st, .crumb, .bword, .rt-lab, .qhint, .nm, .ledger, .filmhead, .tabs button, .ctl .lab` — and **eight of them are `"Spline Sans Mono"`**: `.st`, `.crumb`, `.bword`, `.qhint`, `.nm`, `.ledger`, `.filmhead` (all in `web/app.css`) and `.rt-lab` (`web/canvas.css:43`). Its two self-hosted `.woff2` files carry a `wght` axis and **no `wdth` axis** (fontTools `fvar`, both files). Browsers do not synthesise width, so the declaration is **inert on eight of ten**. Only `.tabs button` and `.ctl .lab` inherit Archivo — the one family that has `wdth` — and so only those two ever render the instrument tier.

**The same bug class, one level deeper.** The first pass corrected the *values* and never asked whether the named elements could render them, which is the identical mistake as shipping three tiers 8% apart: a declaration that looks deliberate and changes nothing. Filed as F20 in `docs/superpowers/specs/2026-09-06-devoid-remediation-design.md`. ⚠️ That spec's evidence line swaps two selectors — it lists `.ctl .lab` as mono and `.rt-lab` as renderable; the code has it the other way round. The count of eight is right.

### The wipe refuses to claim an uncut source is cut

`web/app.js` gates the cut side on the output actually being servable from `web/assets/`. When it is not, the wipe shows one image and says "not cut yet". **That is a deliberate refusal, and the honest state of the common path today** — the fix is a missing route, not a widened gate. Filed as item 1.

### Two depth strategies, deliberately

`interface-design` says choose one depth strategy and commit. This app runs **borders on dark, shadows on light**, because shadows are near-invisible on a void ground and borders on a light ground read as a wireframe. It is a stated exception with a reason, recorded in `.interface-design/system.md` — not an inconsistency, and not a licence to mix them per-component.

---

## The first real use, 2026-09-05 09:18 EDT

The app was launched on the user's own Mac and run against a file that is **not in the corpus** — `~/Downloads/Diors-builds Emojis/best-value.gif`, 2.87 MB, 2,939,953 bytes. It completed: `jobs.jsonl` recorded `verdict: done` at `2026-09-05T04:13:48Z`, `state: done`, `engine_version: sha256:a5b6256defda`, and `best-value_transparent.gif` exists beside the source at 2.44 MB.

**This is the first end-to-end evidence the app works on real input**, as opposed to on the eight corpus assets every test and screenshot has used. It is one asset and it is not a measurement of quality — nobody has looked at the output's edges — but the whole path ran: register, analyse, render through the subprocess, write both logs, report done.

It also surfaced a defect nobody had a way to see before: **the run dirtied the git tree**, because `jobs.jsonl` was tracked. Fixed the same day — it is git-ignored now, while `labels/protection.jsonl` stays tracked, because one is your work and the other is shared evidence. Using the thing found it in one run; no amount of reading would have.

---

### "That doesn't look transparent" — and the file was fine

The supplied `devoid_wordmark_transparent.png` renders on a dark navy ground in every preview, which reads as a baked-in background. It is not: **65.9% of its pixels are alpha 0 and all four corners are 0.** Preview surfaces composite an alpha PNG onto their own dark ground, and the file's own dark palette makes that composite look deliberate.

**The check that settles it in one step is a checkerboard, not a preview** — composite the image onto alternating light squares and see whether they show through. Measuring the alpha channel directly is the same answer with numbers.

---

## Process notes worth keeping

- **The frozen contract is what made six parallel agents possible.** `docs/API-CONTRACT.md` was written and frozen *before* any of them started; the only integration failures were a settings-schema field (`answers`, which `render.py` needed and `jobs.py` did not know about) and the reachability class above. Both were cheap. An unfrozen contract would have made the merge the whole job.
- **Two audits found things the build could not.** A build session is committed to its own approach; an audit session is not. The `--auto` re-run, the width axis, the artwork's size and the focus ring at 1.00:1 all came from auditing, not from building.
- **Every retraction in this file came from checking a measurement against a surface that could actually produce it.** Two of them were confident, specific and wrong. The tell in both was that nothing was ever verified in the surface the claim was about.

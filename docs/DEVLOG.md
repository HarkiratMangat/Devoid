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

## Decisions, and what was tried first

### The world: the ground is the void, the tools stay the matte world

The original metaphor was a lamp over a workbench. It was replaced because the app is called **Devoid** and its job is to make pixels into **nothing** — deep space is nothing, rendered. The replacement was not a repaint: the app's two existing load-bearing colours turned out to already be **the two colours of an accretion disk**, so the new world *explained* the palette rather than replacing it. Lighting states are `collapsed` (dark) and `emitting` (light); lensing is banned from the stage, because the stage is where you judge an edge.

Measured values live in `.interface-design/system.md`; the world itself is `docs/DESIGN.md`.

### The dark/light toggle: three defaults before asking the right question

Rejected in order — **a colour-only dot** (nothing about it says "lighting"), **an iOS rocker** (a borrowed idiom that means "on/off", not "which world"), **a circle with a ring** (still a dot, now with a halo). Each was reached for reflexively.

The question that ended it: *what object in **this** app already has two states?* The answer is **the seam** — the wipe's own divider, which is the product's thesis. The toggle is now a miniature of it: a 56×28 rounded rect with a light rim that sweeps between 10% and 72%. It is not a circle, it is not borrowed, and it teaches the seam before you have opened an asset.

**The lesson is the sequence, not the answer.** Three defaults were tried before the product itself was consulted.

### The starfield is generated, never tiled

The first version tiled an SVG. It was called out immediately and correctly: **a repeating star pattern is the one thing a sky never does**, and the eye catches a repeated constellation instantly. It is now drawn once to fit, into a canvas:

```
n     = round(w * h / 3300)          // density
m     = pow(random(), 2.4)           // magnitude curve — many faint, few bright
r     = 0.42 + m * 1.18              // radius
alpha = (emitting ? 0.34 : 0.92) * (0.30 + m * 0.7)
```

The `2.4` exponent is what makes it read as a sky rather than as noise: a uniform distribution gives an even field of same-sized dots, which is exactly what a tile looks like.

### Skills were run as background reading, and then as procedures

The design skills were first read for direction and then not *executed*. Run properly as procedures at the end, `interface-design`'s four checks (swap · squint · signature · token) immediately found **a variable-font width axis doing nothing** — 92/96/108% is invisible; the tiers are now 80/88/116% — and **a light mode that dissolved under blur**, which is `devoid-deferred-list.md` item 7. Neither was findable by reading the skill.

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

## Process notes worth keeping

- **The frozen contract is what made six parallel agents possible.** `docs/API-CONTRACT.md` was written and frozen *before* any of them started; the only integration failures were a settings-schema field (`answers`, which `render.py` needed and `jobs.py` did not know about) and the reachability class above. Both were cheap. An unfrozen contract would have made the merge the whole job.
- **Two audits found things the build could not.** A build session is committed to its own approach; an audit session is not. The `--auto` re-run, the width axis, the artwork's size and the focus ring at 1.00:1 all came from auditing, not from building.
- **Every retraction in this file came from checking a measurement against a surface that could actually produce it.** Two of them were confident, specific and wrong. The tell in both was that nothing was ever verified in the surface the claim was about.

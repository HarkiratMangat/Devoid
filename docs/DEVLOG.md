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

### Code signing follows symlinks OUT of the bundle, and re-signs what it finds

`.venv` ships as `extraResources`, and a venv's `bin/python3.11` is an **absolute symlink** to its base interpreter. On the first signed build (2026-09-06 17:29 EDT) `electron-builder`'s signing walk followed it and re-signed `/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11` in place — replacing the CPython installer's `Developer ID Application: Ned Deily` signature with this project's self-signed one. **A build modified a file outside the project, and nothing in the build output said so.** It was found only because the build then failed anyway, on `invalid destination for symbolic link in bundle`.

`build/afterPack.js` now dereferences every absolute symlink in `pyvenv/bin` before signing and throws if one survives — which is the layout `python -m venv --copies` produces. Proven by hashing the system binary either side of a build: identical sha256, identical mtime. ⚠️ **The general lesson is bigger than Python.** Anything shipped as `extraResources` that contains an absolute symlink gives the signer a path out of the sandbox you think you are in. Check with `fd -H -I -t l` and read every target before the first signed build, not after.

### The packaged app broke its own signature by running

`main.js` already carried "⚠️ The app must never write inside its own bundle: that breaks under signing" — and it guarded the **logs**, which is not what writes there. Python byte-compiles `site-packages` on first import, so one launch of the signed build wrote **340 `.pyc` files** into `Contents/Resources/pyvenv`, and `codesign --verify --deep --strict` went from exit 0 to `a sealed resource is missing or invalid`. Fixed with `env.PYTHONDONTWRITEBYTECODE = '1'` on the packaged spawn; red-green verified by launching either side of the fix — 340 files and exit 1 before, 0 files and exit 0 after.

⚠️ **This one also nearly escaped as a false green.** The check was first run as `codesign --verify … | tail -2` and `$?` read **`tail`'s** status, not `codesign`'s — a pipeline reports its last command. It printed `VERIFY_EXIT=0` over output that literally said `file added:`. **Never read `$?` after a pipe**; redirect to a file, or use `PIPESTATUS`.

### The design reference's two headline moves are both things this project's detector calls slop

Harkirat supplied a void/black-hole reference file and asked for its ideas rather than its markup. Two of the five pieces adopted from it were rejected before they were written — a tiled 1px grid is the exact shape of `repeating-stripes-gradient`, and `bg-clip-text` on the wordmark is unmeasurable by the contrast audit. Two more were rejected **by the detector, the moment they landed** (2026-09-06 19:24 EDT): `cubic-bezier(.34,1.56,.64,1)` tripped `bounce-easing`, and `box-shadow:0 0 10px var(--cyan)` tripped `dark-glow` twice. The contract is exactly one finding; the run came back with four.

**Both are the canonical generated-UI tells, and both were the "wow" parts.** What survived is the part underneath: the *shape* of the change — a squircle collapsing to a circle — and the fact that the **ground** moves rather than only the knob. The curve became an expo-out that decelerates hard and never travels past its target, which reads as weight without reading as a bounce; the glow became a crisp 1.5px ring.

⚠️ **The lesson generalises to Stage 5.** An accretion loader wants a `drop-shadow` glow and a spinning disc wants a bouncy start. Neither is available here, and the detector will say so the same day. Design the motion so the *geometry* carries it.

### WCAG contrast ratio is the wrong instrument for two dark surfaces

F21 asked for ≥1.35:1 between adjacent surface planes. The formula is `(L1+0.05)/(L2+0.05)`, and at the dark end the `+0.05` flare term dominates: from the void's own luminance (Y≈0.0005) a single 1.35:1 step lands at Y≈0.018 — a mid-grey near `#252525` — and five steps end near `#5E5E5E`. **Meeting F21 literally means deleting the void**, which is the one thing "Do not touch: the palette" protects.

The defect F21 found is real; the metric was wrong. Adjacent planes are now measured in **ΔL\*** (CIELAB), where ~3 units is a step you can see. The shipped ladder ran **0.85, 2.09, 0.37 and 4.26** — two of four steps invisible — and is re-derived at ~4 ΔL\* per step. `scripts/check_contrast.py` carries the arithmetic and the check.

⚠️ **The same script's first draft reported "all pairs meet their target" over an empty table** — its CSS parser matched nothing and it counted zero failures as success. It now refuses to run on zero tokens. A checker that passes because it read nothing is worse than no checker.

### A green detector run was checking fewer rules than it looked like

`CLAUDE.md` has said "exactly one finding" since the first session, and that number was measured all night against Stage 3's token work. It is true. It is also narrower than it reads: `design-system-font`, `design-system-color` and `design-system-radius` unlock only when `DESIGN.md` declares a palette and a type stack **in the section format the parser reads**, and `docs/DESIGN.md` declares both in prose under headings of its own choosing (`## Type`, `## The colour rule`). `doctor.mjs` says so plainly — *"docs/DESIGN.md has no colors, typography section"* — and nothing was reading `doctor`.

**Falsified rather than reasoned about (2026-09-06 20:32 EDT):** a file containing `#FF00FF`, `#7C3AED`, `border-radius:17px` and `font-family:"Comic Sans MS"` returns **0 findings**. Run twice, once outside the project and once inside it with `DESIGN.md` discoverable. Both zero.

⚠️ **The shape is this project's own signature failure, one level out.** A gate proved something EXISTS — a finding count — and the count was real; what nobody checked was whether the rules that would have caught a palette violation were CONNECTED to anything. `/impeccable document` fills the sections from the CSS and unlocks all three, which is why it is the first command to run rather than `critique`.

### The impeccable skill has never been set up here, only its detector

`.impeccable/` does not exist: no config, no `design.json`, and no surface briefs. `PRODUCT.md` and `DESIGN.md` live in `docs/` and `context.mjs` finds them, so the detector CLI has always worked — which is exactly why the absence went unnoticed for three sessions. `doctor.mjs` reports two findings: the product record predates the schema (`init`), and `DESIGN.md` has no readable colors or typography section (`document`).

⚠️ **The missing surface briefs are the expensive half.** Every command reads `.impeccable/surfaces/<name>.md` to learn the surface's **mode**, and mode is the single judgement that changes the output most. Without one, each command re-infers it from code — which the skill's own docs name as where generic advice comes from. Devoid has three surfaces (the contact sheet, the open view, the empty table) and all three are **Operate**.

⚠️ **Two commands are ruled out by their own documentation, not by taste.** `bolder`: *"Do not use it on dashboards people stare at for hours… Not in operator tools."* `overdrive`: *"Do not use it on operator tools, dashboards, or anything where reliability beats spectacle."* The two that sound most like "wow factor" are the two an Operate surface may not have.

### `send_message` is refused here, and the cause is this session's provenance — 2026-09-06 23:02 EDT

`mcp__ccd_session_mgmt__send_message` returns *"This tool is unavailable in unattended sessions (scheduled-task runs and remote-dispatched trees)."* It is not a bug, not a setting, and not something a session can clear for itself.

The desktop app runs a `PreToolUse` deny whose predicate is `isUnattendedSession(e){return!!(e.scheduledTaskId||e.dispatchParentId||e.dispatchParentOrigin||e.remoteControlEnabled||e.bridgeSessionId||t.Pp(e))}`, and it logs `reason:"unattended_send_message"`. Two of the six fields are set on this repo's long-running session — `dispatchParentId: "local_ditto_7e228f03-…_g1"` and `dispatchParentOrigin: "local"` — because it was spawned as a dispatch child of a local agent-mode tree. Everything else is null, which is why `get_session` reports `isRemote: false` while the tool still refuses.

⚠️ **The same predicate gates more than messaging** — `preview_start`, the Chrome MCP tools, computer-use takeover and the iOS-simulator tools all deny on it, each with its own wording. A refusal that says *"requires an attended session"* is this, not a missing capability, and retrying never helps.

**The fix is not in this repo.** The fields are fixed at spawn and the app rewrites its own session JSON, so editing `~/Library/Application Support/Claude/claude-code-sessions/…/local_<id>.json` while the app runs is overwritten. To message another session, use one you opened yourself.

---

### A `signal_present` map check is ANY, not ALL — so more signals means less assurance — 2026-09-07 00:37 EDT

`map-reconcile.js:171` reads `const found = hit != null` over the first match in the list. So `signal: [a, b, c]` on a `signal_present` check passes when **any one** of the three is found, and every string added makes the check weaker. `signal_absent` is the reverse: each extra string forbids one more thing. The two kinds read identically in the YAML and mean opposite things about list length.

⚠️ **And signals match comments.** Closing the P0, a check for `seamToGroup` passed against prose on `web/app.js:74` while the function itself was at `1579`. `question`'s check had already been burned by this once, and the lesson did not generalise because it was recorded as a fact about one node rather than about the mechanism.

**Write one signal per `signal_present`, and make it something only live code can contain** — `function foo`, a full selector, a template expression. Never a bare identifier that a comment can say.

---

### The comment trap caught the person who had just written it down — 2026-09-07 01:00 EDT

An hour after `DEVLOG.md` gained the note that **map signals match comments**, the design detector flagged `design-system-radius` in `web/advice.js` — on the COMMENT that explained why a `border-radius` literal had been removed. The prose named the value, the rule read the prose, and the finding the comment described came back.

**A scanner that reads a file does not know which lines are code.** This applies to every text-matching gate here: the map's signals, `detect.mjs`, `check_contrast.py`'s parser (which strips comments FIRST, deliberately, and says so). When writing a comment about a defect, describe it — do not spell it.

---

## Decisions, and what was tried first

### The world: the ground is the void, the tools stay the matte world

The original metaphor was a lamp over a workbench. It was replaced because the app is called **Devoid** and its job is to make pixels into **nothing** — deep space is nothing, rendered. The replacement was not a repaint: the app's two existing load-bearing colours turned out to already be **the two colours of an accretion disk**, so the new world *explained* the palette rather than replacing it. Lighting states are `collapsed` (dark) and `emitting` (light); lensing is banned from the stage, because the stage is where you judge an edge.

Measured values live in `.interface-design/system.md`; the world itself is `docs/DESIGN.md`.

### The dark/light toggle: three defaults before asking the right question

Rejected in order — **a colour-only dot** (nothing about it says "lighting"), **an iOS rocker** (a borrowed idiom that means "on/off", not "which world"), **a circle with a ring** (still a dot, now with a halo). Each was reached for reflexively.

The question that ended it: *what object in **this** app already has two states?* The answer is **the seam** — the wipe's own divider, which is the product's thesis. The toggle is now a miniature of it: a 56×28 rounded rect with a light rim that sweeps between 10% and 72%. It is not a circle, it is not borrowed, and it teaches the seam before you have opened an asset.

**The lesson is the sequence, not the answer.** Three defaults were tried before the product itself was consulted.

### The starfield is generated, never tiled — ⚠️ RETRACTED 2026-09-06, ✅ RESOLVED 2026-09-06 19:24 EDT

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

✅ **DONE 2026-09-06 19:24 EDT.** `.chk-s` paints only the checkerboard now, `--stars-b` is deleted from both lighting blocks, and `web/app.js`'s per-tile `background-position` hash went with it — a workaround for a repeat that no longer exists. `.lamp .sg-void` keeps its layer: at 64×32 exactly one 470px tile is visible, so nothing repeats. **The entry above stands as written**, because the two-month gap between "recorded as fixed" and "actually fixed" is the whole lesson.

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

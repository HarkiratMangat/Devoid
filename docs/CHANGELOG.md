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

### The tooling layer became enforceable, and a critique found what it had been hiding

`/impeccable init` + `document` completed the product record and merged a token frontmatter into `DESIGN.md`, which **turned on three detector rules that had never fired** — they immediately found 15 real violations. `/impeccable critique` then ran dual-agent and scored the interface **25/40**, with one P0: `.qregion` has no `clip-path`, so the seam's two halves cannot differ inside the rectangle the seam exists to reveal.

The three MCP layers are set up and, for the first time, **enforced rather than described**: prose indexed as `project:devoid-docs` / `project:devoid-rules`, the code graph at 1,406 nodes with an ADR, linksee carrying a North Star anchor and a 17-node `map.yaml` whose reconciler already reports the P0 as divergence. Three PreToolUse hooks carry the conventions into the moment of the mistake; `npm run test:hooks` asserts both directions.

⚠️ **Prose was measurably not enough** — `grep` 788× against `rg` 4× on a standing rule, and this session's own author broke two written context-mode rules while both were loaded.

### The remediation plan is executed — 27 tasks, five stages

`docs/superpowers/plans/2026-09-06-devoid-remediation.md`, finished 2026-09-06 19:46 EDT. Four systems that were built, tested, exported and wired to nothing are connected; the interface stopped making claims that are false; the token, type and surface systems are derived and checked by script; the layout puts the artwork first; and three signature components were added.

| what changed | measured |
|---|---|
| The artwork in the open view | ~~289x289~~ → **1037x1037** with a question open |
| The film strip | scrubs **144** frames; it could move nothing in any state before |
| Adjacent surface planes | ~~0.85, 2.09, 0.37, 4.26~~ → **~4 ΔL\*** per step |
| The needs-you tile under a desaturated blur | ~~loses by 1.7~~ → **wins by 73.0** |
| Type | ~~37 raw sizes, 31 in a 1.5px band~~ → **nine tokens** |
| Gate assertions | ~~8~~ → **~30**, testing connection rather than presence |

⚠️ **The plan was wrong four times and running it proved so** — each corrected in place with the falsification recorded, never quietly dropped. F3 was specced as "closed by F2"; the hatch drew and the hex string stayed. Task 7's "click frame 12, the artwork changes" was false in every state. Task 8's call site would have switched `--auto` off for the flag it suggested. Task 8's gate assertion named selectors that do not exist and could not fail.

⚠️ **Two of the design reference's five headline moves are things this project's own detector calls slop**, and it said so the day they landed: an overshoot curve is `bounce-easing` and a cyan glow is `dark-glow`. What survived is the geometry underneath.

### The app is code-signed, and signing it found two defects nothing else could

A self-signed `DEVOID` certificate (`mac.identity` in `electron-builder.yml`) produces a bundle that passes `codesign --verify --deep --strict` — `valid on disk`, `satisfies its Designated Requirement`. Identifier `Electron` → **`com.harkirat.devoid`**, hardened runtime on, `Sealed Resources version=2 rules=13 files=2451`, all five entitlements sealed in. **`build/entitlements.mac.plist` passed its first real test**: the signed app spawns Python and serves in 6s. ⚠️ Not Apple-issued, so no Gatekeeper anywhere else and no notarisation — and it does **not** unblock Check for Updates.

| defect found | how it showed |
|---|---|
| The venv's absolute symlink let the signer walk out of the bundle and re-sign the **system** Python | build failed on `invalid destination for symbolic link in bundle`; fixed by `build/afterPack.js` |
| The packaged app byte-compiled `site-packages` into its own bundle | **340** `.pyc` files, seal went to `a sealed resource is missing or invalid`; fixed by `PYTHONDONTWRITEBYTECODE` |

### The visual world was replaced

The "lamp over the bench" metaphor became **the void**: the ground is deep space, the tools on it stay the matte world. The palette did not change — the app's two load-bearing colours turned out to already be an accretion disk's two colours, so the new world explains them. The lighting toggle is a **miniature of the wipe's own seam**. The starfield is generated to fit, never tiled. `docs/DESIGN.md` was rewritten; measured values are in `.interface-design/system.md`.

### Accessibility, after an audit that found real failures

| check | outcome |
|---|---|
| Contrast, both lighting states, every text-on-surface pair | zero failures, worst **5.12:1** |
| Focus ring, SC 1.4.11 | worst **9.53:1** — found failing at **1.00:1** on the primary button |
| Hit targets, SC 2.5.8 | matte swatches ~~23.6px~~ → **28px**; every other element already passing |
| Design detector | exactly one accepted finding, `repeating-stripes-gradient` |

### A code review found 12 things; fixing them found 2 more

**The seam works for the first time.** `loadPair` — the answer-pair fetch, the two synced canvases, the conspicuity gate, the question-card fallback — was built, tested, exported and **called by nothing**, so the shipped wipe was still the source-vs-output pair `server/preview.py`'s own header says cannot discriminate. Wiring it exposed two more failures that no test could see:

- **`--assume-protect` / `--assume-remove` were sent without `--auto`,** which is the flag they answer. A plain render never poses the question, so the assumption was inert and **both sides rendered identically**. Measured on the corpus's one real ambiguous case: ~~0 differing alpha px~~ → **2,047**, on one frame and on the full 144-frame asset alike.
- **`data-single` was never cleared,** so CSS kept `.seam`, `.wipetag.r` and the second canvas hidden. The pair mounted and displayed as one picture with one label.

Both failed *silently and plausibly* — the card fallback showed instead, which looks exactly like the design working.

**Four more subsystems were wired to nothing**, the same class as the plotter and the history routes:

| was | is |
|---|---|
| `devoid:regions-changed` dispatched on `window`, heard on `document` | Heard where it is dispatched. Drawing a region updates the UI |
| `devoid:asset-opened` heard by canvas.js, dispatched by nobody | `openAsset` dispatches it. **Regions no longer leak onto the next asset's render** |
| `journal.open_job`/`close_job` never called | Called at the spawn and at every settle, so crash recovery has something to recover |
| `Devoid.submitAnswer` called by the question card, never defined | Defined, and routed through the colour group so it cannot create the conflict the server rejects |

**And six defects of judgement:**

- A **cancel arriving before the spawn** killed nothing, then deleted the temp directory under a live subprocess and wrote a second `jobs.jsonl` row. The spawn now happens under the same lock as the cancel check, and a job journals at most once.
- `stateOf()` never tested `a.state` for **`blocked` or `failed`** — a missing source file and a crashed analyze both read as **ready to cut**.
- The ledger printed **"at most 0 artwork px lost"** for a figure `preview.py` deliberately leaves unmeasured. It says it was not measured.
- **`conflict` was never assigned by anything**, so an escalated `_v2` write settled as an ordinary `done` and nobody was told where their file went. The UI's mark, word and banner for it all existed already.
- **⌘W killed the server and left a dead Dock icon** with no `activate` handler.
- The preview cache key omitted `target_format`, and a `load` listener accumulated once per render.

**The gate grew a ninth state and three assertions**, including one that fails when the two answers do not differ — the check that would have caught the `--auto` bug on day one.

### Check for Updates…

A menu item under **Devoid**, and only a menu item: it runs when clicked and at no other time, because an app whose premise is that it talks to nothing should not ping a server on launch.

It cannot install anything, deliberately. macOS auto-update goes through Squirrel.Mac, which validates the code signature of the download, so an unsigned build **cannot** install its own update — wiring `electron-updater` now would ship a path guaranteed to fail. It reports what exists and opens the release page.

`compareVersions` lives in `lib/versions.js` rather than in `main.js`, for one reason: `main.js` cannot be required without booting Electron, and this is the only piece of the check that can be wrong **silently**. A string compare calls `1.9.0` newer than `1.10.0` and the app then never offers an update again. **Five tests, red-green verified** — the naive version fails four of them. `npm run test:versions`.

⚠️ **A GitHub 404 is ambiguous and is not reported as one thing.** It means both "no releases published" and "private repository, anonymous caller" — and this repository is private, so the app says it cannot tell which rather than claiming the first.

Verified against the live API: the 404 path on this repo, and the 200 path on a public one, where the tag parses, compares, and carries the release URL.

### The wordmark is the artwork now

DEVOID with the **O drawn as the accretion disk itself** — supplied by the user, and it is the same object the empty table's horizon and the lighting toggle already are, in the same cyan and ruby the palette was built from. It replaces the CSS letterform whose O was a knocked-out counter with a rubylith fill.

**Two files, not one, because the letterforms are white.** `wordmark.png` on the void; `wordmark-emitting.png` re-inked for `--bench #FFFFFF`. `scripts/make_wordmark.py` builds both from the master and splits the recolour **by measurement**, because three different things in that image are near-grey and only two may move:

| pixels | measured | treatment |
|---|---|---|
| letterforms | 976,508 px, **100% opaque** | re-inked dark |
| drop shadow | dark, **semi-transparent** | lifted, so the relief survives on white |
| event horizon | dark, **opaque** | untouched |
| accretion spiral | saturated | untouched |

⚠️ **The first version inverted luminance for every neutral pixel and turned the event horizon white** — the one thing in this mark that must never be light. The alpha split is what separates the shadow from the core; nothing about the colour does.

Letterform contrast: **18.25:1** on the void, **17.85:1** emitting.

### A `.app` you can actually drag into Applications

`npm run dist` produces `Devoid-1.0.0-arm64.dmg` (171 MB) and a 411 MB bundle that **runs from anywhere on this Mac**. Verified by copying it to `/tmp` and launching it there.

The previous build was described as "not standalone — it spawns `.venv/bin/python` beside itself". That undersold it: **three separate things meant it almost certainly never ran at all.**

- `server/` and `web/` were inside `app.asar`. Python cannot read an asar, and Python is what imports the server *and* serves `web/` as static files. They now ship as extraResources.
- There was no interpreter. `.venv` now ships as `pyvenv` in Resources, and the interpreter is resolved in a stated order — `$DEVOID_PYTHON`, the bundled copy, then this repo's `.venv`.
- `waitForServer` retried **forever**, so any of that failing showed the person nothing at all: no window, no error, a bouncing icon. Both failure paths are dialogs now, and the server-start one carries Python's own stderr.

The app also stopped writing inside its own bundle: `$DEVOID_DATA_DIR` sends the two logs and the crash journal to `~/Library/Application Support/Devoid` when packaged. Writing into a bundle breaks under signing and is wiped by the next install.

**The icon is the one you supplied**, 1024×1024, at `build/icon.icns`.

⚠️ **Still not portable to a different Mac**, and both reasons are now dialogs rather than mysteries: `pyvenv` is a virtualenv and needs Python 3.11 from the python.org framework, and the engine is resolved at runtime rather than bundled — deliberately, because the skill is the source of truth and a bundled fork would drift.

### The tracker's first pass — what got fixed once it was written down

Writing the open work down made it fixable, and four of the items closed the same day.

| was | is |
|---|---|
| Two copies of the app could run, with **two writers** to the label log | `app.requestSingleInstanceLock()`. Verified red-green: ~~2 uvicorn processes~~ → **1**, and the second copy hands its files to the first and exits |
| Stage 5's history had a server, pytest coverage, and **no caller** — `GET /api/history` and the rerun route were reachable from nothing | A **"what you did"** drawer: every past run with its verdict, its age, and a *load these settings* button. It says what it could not restore rather than restoring silently |
| `prefers-reduced-motion` was five `@media` blocks nothing could reach | Emulated through the DevTools protocol and **asserted** on every gate run |
| **No automated test touched `web/` at all** | `npm run gate:ui` — eight assertions against the real Electron window, red-green verified |

### Three defects the new gate found while it was being built

None of these were visible to anything that existed before it.

- **`capturePage()` was returning stale frames.** `app.disableHardwareAcceleration()`, set for "deterministic pixels", stopped the compositor: eight captures produced **three distinct images** while the DOM changed correctly at every step. Every visual claim made through that script after the first state or two was read off an earlier state. Fixed, and the gate now hashes each capture and **fails if two states match**.
- **Electron served a cached `app.js`** across three consecutive runs of a freshly spawned process, so the gate certified code that was no longer on disk. It now reloads ignoring the cache before asserting anything.
- **A dispatch branch that had never executed.** Report rows are one-element specs, so `[label, ref]` left `ref` undefined and the `kind === 'report'` branch below was unreachable from the day it was written.

⚠️ **The gate does not steal focus.** It runs with a hidden window — an app that pops to the front on every run is one nobody runs.

### First real use, and what it found

The app was run on a 2.87 MB file from outside the corpus and completed — `verdict: done`, output written. It is one asset and nobody has judged the output's edges, but the whole path ran end to end for the first time.

It also dirtied the git tree, because `jobs.jsonl` — a per-machine work history carrying local absolute paths — was tracked. It is now ignored. `labels/protection.jsonl` stays tracked: that log is shared evidence, pointed at from the engine repo, and the two must not be treated alike.

### Verified

93 pytest (including a real render of a corpus asset through the subprocess) · 267 coordinate assertions · 14 wipe-clock tests · the port probe · every state captured through the real Electron window.

⚠️ **Not verified, and stated as such:** no automated test covers the UI, `prefers-reduced-motion` was never emulated, no screen reader has run, and signing has never been exercised. All four are filed in `devoid-deferred-list.md`.

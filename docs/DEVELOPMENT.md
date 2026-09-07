# Developing Devoid

Everything a contributor needs that a user does not. For what the app is and how to use it, see the [README](../README.md).

[Layout](#layout) · [Running from source](#running-from-source) · [The server](#the-server) · [Fonts](#fonts) · [Packaging](#packaging) · [Signing](#signing) · [Tests](#tests) · [Where things are written down](#where-things-are-written-down)

## Layout

| | |
|---|---|
| `main.js`, `lib/` | the Electron main process: spawns the server, resolves Python, owns the menu and the dialogs |
| `server/` | the Starlette app. `app.py` holds the routes, `engine.py` resolves and calls the skill, `cli.py` builds argv, `render.py` runs jobs, `preview.py` builds the seam pair |
| `web/` | the front end. No framework, no build step for the app itself: `index.html`, `app.css`, `app.js`, plus `wipe.js` and `advice.js` |
| `scripts/` | the gates and the measurement tools, one file per question |
| `tests/` | pytest for the server, `node --test` for the browser-side maths |
| `docs/` | the brief, the visual system, the API contract, the changelog and the devlog |

## Running from source

```sh
git clone https://github.com/HarkiratMangat/Devoid.git
cd Devoid
npm install
python3.11 -m venv .venv
.venv/bin/pip install -e ".[dev]"
npm start
```

`npm start` launches Electron, which spawns the Python server and opens the window. Dependencies are declared in `pyproject.toml`; there is no `requirements.txt`.

⚠️ **To check anything visual, use the real window.** `npm run gate:ui` captures every state through Electron itself. A browser pane reports `visibilityState: hidden` and fires no `requestAnimationFrame`, which makes rAF-driven UI look broken when it is not.

The assets in `web/assets/` are **real output from the engine's own corpus**, not icons drawn to flatter the layout. That is how the rubylith-over-red overlay bug recorded in [`DESIGN.md`](DESIGN.md) was found. Do not replace them with synthetic art.

## The server

Devoid serves on `127.0.0.1:8732`. If that port is taken — a second window, a crashed run — the main process probes upward to `8740` and takes the first free one, passing it to both uvicorn and the window. Only when all nine are busy does it stop, with a dialog saying so.

The probe is a real TCP connect: something that accepts is listening, `ECONNREFUSED` is free, and a socket that neither accepts nor refuses is treated as busy.

The `/api/*` surface is frozen and documented in [`API-CONTRACT.md`](API-CONTRACT.md). Changing it means changing that file in the same commit.

## Fonts

Archivo and Spline Sans Mono are self-hosted under `web/fonts/` and declared in `web/fonts.css`, so an app whose whole premise is local does not fall back to Helvetica when the network is gone. The width axis and `tabular-nums` are load-bearing in [`DESIGN.md`](DESIGN.md). Regenerate them with `python3 scripts/fetch-fonts.py`, and `python3 scripts/check_font_axes.py --check` asserts that every declared range matches the range the shipped file actually carries.

## Packaging

```sh
npm run dist       # dmg + zip into dist/
npm run dist:dir   # just assemble the .app, skip the installer step
```

Configuration lives in `electron-builder.yml` rather than `package.json`, because electron-builder refuses to load from `package.json` while a root-level `directories` key is present, and that key is npm metadata this project needs.

**The bundle runs outside this repository.** Verified by copying `Devoid.app` to `/tmp` and launching it there: it served its own `index.html`, `app.css`, `app.js` and assets, resolved the engine, and wrote its journal to `~/Library/Application Support/Devoid/` rather than inside itself.

Three things make that work, and each was a real failure first:

| piece | why |
|---|---|
| `server/` and `web/` ship as **extraResources**, not inside `app.asar` | Python cannot read an asar, and Python is what imports the server *and* serves `web/` as static files. Inside the asar they are invisible to it |
| `.venv` ships as **`pyvenv`** in Resources | The old build spawned `.venv/bin/python` relative to its own directory, which exists only in this checkout |
| The log and the crash journal follow `$DEVOID_DATA_DIR` | `main.js` points it at `~/Library/Application Support/Devoid` when packaged. Writing inside the bundle breaks under signing and is wiped by the next install |

⚠️ **The bundle is not portable to an arbitrary Mac**, for two reasons worth knowing. `pyvenv` is a *virtualenv*, so it still needs its base interpreter — Python 3.11 from the python.org framework. And the engine is resolved at runtime rather than bundled, because the skill is the source of truth for every algorithm and a bundled fork would drift silently. Both failures are dialogs that name the fix, not a window that never opens.

The venv is pruned in `electron-builder.yml`: scipy (99 MB), numpy (36) and Pillow (14) ship; roughly 36 MB of build and test machinery the app never imports at runtime does not. **Pruning does not make the app portable** — it only makes the image smaller. Portability is the first-run check in `main.js`.

## Signing

`electron-builder.yml` sets `mac.identity: DEVOID`, a **self-signed Code Signing certificate** created in Keychain Access. It produces a real, verifiable seal on the machine that holds it, and its actual purpose is that it is the only way to exercise `hardenedRuntime` and `build/entitlements.mac.plist` without an Apple Developer account.

Those entitlements matter. A signed app cannot spawn the unsigned Python interpreter without them, and a build missing them launches and then dies at the spawn, which looks like a server bug and is not one.

⛔ **It is not Apple-issued.** It does not satisfy Gatekeeper on any other Mac, it can never be notarised, and it does not unblock **Check for Updates…** — Squirrel.Mac needs a signature the destination machine trusts, and the repository being private is a second, independent blocker.

To sign for distribution instead, set `CSC_LINK` and `CSC_KEY_PASSWORD`; they override `identity`. To notarise as well, set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` and flip `mac.notarize` to `true`.

⚠️ **Neither path has been exercised.** No certificate and no Apple ID were available, so the signed and notarised builds are configured but unverified. **Never set those three variables to placeholder values to make the path look testable.**

`build/afterPack.js` dereferences the venv's escaping absolute symlink before signing. Without it the signer walks out of the bundle and re-signs whatever it finds.

## Tests

```sh
npm test
```

Eleven gates, in dependency order. **The order is load-bearing and cannot be alphabetised:** `gate:ui` writes the captures and the `.boxes.json` sidecars that `check:greyscale` then measures, and `check:tracker` runs last because it is about the branch rather than the code.

| gate | asks |
|---|---|
| `pytest` | the server, the API contract, the flag builder, the render path |
| `test:wipe`, `test:coords` | the seam's synchronisation and its coordinate maths |
| `test:versions` | version comparison for the update check |
| `test:hooks` | that each routing hook can both fire and stay silent |
| `check:contrast` | text and UI contrast ratios |
| `check_font_axes` | every declared font axis range matches the shipped file |
| `check:detector` | the design detector reports **presence** against a deliberately defective fixture, so an empty result means something |
| `check:design` | asks git what changed, then runs the detector over it; fails on drift or on a degraded run |
| `gate:ui` | every UI state, captured through the real Electron window, with assertions on each |
| `check:greyscale` | every state stays legible with colour removed, in both lighting states |
| `check:tracker` | the tracker's conservation rule, in two scopes: the branch against its merge base, and the working tree |

🔴 **A check is not finished when it passes. It is finished when it has been run against the defect it exists to catch, and failed.** Eight mistakes in one session were the same shape: the artifact was verified and the thing it connects to was not. Where the falsifier was run — the density rule, the tracker gate, `check:design`, the greyscale control pair — the check held. Where it was skipped, the code was broken.

Two worked examples of what that catches, both from this repository's own gates: `gate:ui` set `state: 'needs-you'` on a cloned asset for a day while `stateOf()` derived that verdict from somewhere else entirely, and passed anyway because the corpus happened to contain a demanding asset. And two tests in `tests/test_analysis_handoff.py` passed against their own injected defects on the first draft — one compared a function with itself, one short-circuited before the branch it was named for.

## Where things are written down

`docs/HANDOFF.md` is **ephemeral by design** — it is renamed `<date>-handoff.superseded.md` and rewritten. Nothing durable may live only there. Four files are appended to rather than replaced, and they are where work belongs:

| file | holds |
|---|---|
| [`../devoid-deferred-list.md`](../devoid-deferred-list.md) | open work, tagged `[Priority · Effort · Model-effort]`, plus the standing decisions not to do something |
| [`../devoid-resolved-list.md`](../devoid-resolved-list.md) | the archive, with each item's original wording and its outcome. One item out of the tracker equals one item in here, never a deletion, and `npm run check:tracker` gates it |
| [`DEVLOG.md`](DEVLOG.md) | the traps, the decisions, and what was tried and walked back. **Read its Traps section before verifying anything visual** |
| [`CHANGELOG.md`](CHANGELOG.md) | what shipped, `vMAJOR.MODERATE.MINOR`, one version per merged PR |

Conventions — Conventional Commits, the branch and PR flow, the versioning bars and how to decide a tier — are in [`../CLAUDE.md`](../CLAUDE.md).

**Anything measured belongs in the docs with its numbers.** This project's history is that unmeasured design claims are wrong about a third of the time.

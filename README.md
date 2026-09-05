# Devoid

A local desktop app for removing the background from animated images — GIF, WebP, AVIF, APNG, and static PNG/JPEG — and fitting the result to a size or format target.

It is a front end for the [gif-background-remover](../Gif-Background-Remover) skill, which stays the engine. Devoid reimplements no image processing.

## Why a front end

The skill exposes **63 command-line options**, but that is not the friction it looks like — its own `--auto` already picks them. The friction is three questions: a coin-flip protection decision that fires on **10.2% of assets** (measured across 304; 12.8% pooled with the fade question), a fade it can name but not classify, and the size/format goal it deliberately never guesses.

The first two are visual questions delivered as prose naming a hex colour and a bounding box. Nobody can answer them by reading. **They have to see it.** That is the product.

`--recommend` already returns all three as structured JSON before anything renders, so Devoid reads the questions first, answers them, and `--auto` never refuses.

## The shape

**There is no mode — the strip is the app.** Nothing selected and it fills the space as a contact sheet; select one and it opens while the rest stay along the edge; panels are drawers summoned at the edge. Selection is the only state, so one asset and two hundred are the same layout.

**The core interaction is a seam you drag.** Two renders of the same asset, one dashed cut line between them, both playing. Instead of *"is this region design or background?"* — an analyst's question — you see both answers and pick. It generalises to every flag with a visible consequence.

## Layout

| | |
|---|---|
| `docs/HANDOFF.md` | **read first** — state of the work, decisions, rejected options, and the model to run the build session on |
| `docs/PLAN.md` | the implementation plan — opens with a literal ten-step sequence |
| `docs/PRODUCT.md` | what it is, who for, the non-negotiable constraints and the measurements behind them |
| `docs/DESIGN.md` | the visual system — tokens, type, layout, motion, and the checks it has to keep passing |
| `web/` | the front end: real state, real interactions, real corpus assets |
| `server/` | the local HTTP server that fronts the skill |

## Running the app

```sh
npm start
```

Electron's main process spawns the Python server and opens the window. Clicking a frame opens it, the seam drags, the drawers summon, and the lighting toggle in the header — a miniature of the wipe — sweeps between the two states of the room.

For a real `.app`: `npm run dist:dir && open dist/mac-arm64/Devoid.app`. ⚠️ It is not standalone; it spawns `.venv/bin/python` beside itself, so it runs from this repo. See Packaging.

⚠️ **To check anything visual, use the real window** — `npx electron scripts/capture-window.mjs` captures every state through Electron itself. A browser pane reports `visibilityState: hidden` and fires no `requestAnimationFrame`, which makes rAF-driven UI look broken when it is not. ⚠️ **The film strip does not scrub yet** — it highlights and counts, but the artwork is a looping `<img>` that never seeks. Frame-accurate seeking needs a canvas decoder; it is `PLAN.md` 3.3.

The assets in it are **real outputs from the skill's own corpus**, not icons drawn to flatter the layout — which is how the overlay bug in `docs/DESIGN.md` was found.

**Port.** Devoid serves on `127.0.0.1:8732`. If that port is already taken — a second window, a crashed run — the main process probes upward to `8740` and takes the first free one, passing it to both uvicorn and the window. Only when all nine are busy does it stop, with a dialog saying so. The probe is a real TCP connect: something that accepts is listening, `ECONNREFUSED` is free, and a socket that neither accepts nor refuses is treated as busy.

**Fonts are local.** Archivo and Spline Sans Mono are self-hosted under `web/fonts/`, declared in `web/fonts.css`, so an app whose whole premise is local does not fall back to Helvetica when the network is gone — the width axis and `tabular-nums` are load-bearing in `docs/DESIGN.md`. Regenerate them with `python3 scripts/fetch-fonts.py`.

## Packaging

```sh
npm run dist       # dmg + zip
npm run dist:dir   # just assemble the .app, skip the installer step
```

⚠️ **This does not yet produce a standalone app, and it should not be described as one.** The packaged bundle carries `main.js`, `web/` and `server/` but **no Python runtime** — `main.js` still spawns `.venv/bin/python` relative to its own directory, so the build only runs on a machine that already has the venv beside it. Shipping something a stranger can double-click needs a bundled interpreter (`pyinstaller` over `server/app.py`, or a vendored embeddable Python, dropped in via `extraResources`) plus the environment check from `docs/PLAN.md` 0.3 as its failure path. That is out of scope for this session and is the remaining work in 6.3.

### Signing and notarisation (6.2)

Both are driven entirely by environment variables, and **all of them are deliberately unset in `package.json`**. With none set, `npm run dist` produces an unsigned, un-notarised build — which is fine for local use, and is what will happen if you run it today.

| variable | what it is for |
|---|---|
| `CSC_LINK` | path or base64 of the `.p12` Developer ID Application certificate |
| `CSC_KEY_PASSWORD` | that certificate's password |
| `APPLE_ID` | the Apple ID used for notarisation |
| `APPLE_APP_SPECIFIC_PASSWORD` | an app-specific password for that Apple ID, not the account password |
| `APPLE_TEAM_ID` | the Developer Program team ID |

To sign, set the first two. To notarise as well, set all five and flip `build.mac.notarize` to `true` in `package.json`. `build/entitlements.mac.plist` already carries what the hardened runtime needs to spawn the Python interpreter — without those entitlements a signed build launches and then fails at the spawn, which looks like a server bug and is not one.

**Neither path has been exercised here.** No certificate and no Apple ID were available, so the signed and notarised builds are configured but unverified.

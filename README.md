<p align="center">
  <img src="docs/banner.png" alt="Devoid" width="820">
</p>

<p align="center">
  <b>Remove the background from an animated image, and answer the two questions the pixels don't.</b><br>
  macOS · your files stay on your machine · <code>v1.0.0</code>
</p>

---

Devoid handles GIF, WebP, AVIF and APNG, plus static PNG and JPEG, and can fit the result to a size or format target. It is a front end for [`gif-background-remover`](https://github.com/HarkiratMangat/gif-background-remover), a **skill**: a self-contained command-line tool that lives in its own repository. That tool does all the image processing, and Devoid reimplements none of it.

Your images never leave the machine. The app reaches the network in exactly two situations, both of which you start: **Check for Updates…** in the menu, and a one-time offer to install missing Python packages the first time it runs.

[Why it exists](#why-it-exists) · [Screenshots](#screenshots) · [Install](#install) · [Using it](#using-it) · [Features](#features) · [Settings](#settings) · [Troubleshooting](#troubleshooting) · [What it does not do](#what-it-does-not-do) · [Development guide](docs/DEVELOPMENT.md) · [Changelog](docs/CHANGELOG.md)

## Why it exists

The engine has 63 command-line options. Its own `--auto` already picks them, so the option count is not the friction. The friction is a question it refuses to guess at.

When a patch of background colour sits enclosed by the artwork on some frames but not all, whether that interior is design to protect or background showing through is a statement about intent. Across the engine's measured corpus of 304 assets it refuses 10.2% of them (31) on that question, and 12.8% (39) once a second one is counted: a region that fades toward the background colour, which the engine can find but cannot classify.

The refusal arrives as prose naming a hex colour and a bounding box. Nobody can answer that by reading it. You have to see it.

Devoid draws the region on the artwork and takes your answer as a click. With both questions answered the engine has what it needs and proceeds, and every option you did not touch stays at its default so `--auto` keeps deciding it.

## Screenshots

<p align="center">
  <img src="docs/shots/01-contact-sheet.png" alt="The contact sheet: a grid of dropped assets, the one needing an answer marked and sorted first" width="820">
</p>

Everything you drop lands on a **contact sheet**. The asset that needs an answer sorts to the front, carries a mark, and in a crowd gets a wider tile, so you can find it by shape without reading.

<p align="center">
  <img src="docs/shots/02-open-question.png" alt="An open question: the region outlined on the artwork, with Keep it and Cut it" width="820">
</p>

Open it and the question is drawn on the art: the region the engine could not classify, outlined in place, with **Keep it** and **Cut it**.

<p align="center">
  <img src="docs/shots/09-seam.png" alt="The seam: a wipe divider across two renders of the same asset" width="820">
</p>

The **seam** is a wipe divider you drag across two renders of the same asset, one for each answer, both playing. You look at both and pick.

<p align="center">
  <img src="docs/shots/03-emitting.png" alt="A render in flight, with the rest of the sheet washed back" width="820">
</p>

While a render is in flight the rest of the sheet washes back, leaving the work in progress at full strength.

## Install

### Build it (the path that works on any Mac)

```sh
brew install gifsicle pngquant webp        # the engine needs these three
git clone https://github.com/HarkiratMangat/gif-background-remover.git
git clone https://github.com/HarkiratMangat/Devoid.git
cd Devoid
echo "{\"skill_path\": \"$(cd ../gif-background-remover && pwd)/scripts/remove_gif_background.py\"}" > devoid.config.json
npm install
python3.11 -m venv .venv
.venv/bin/pip install -e ".[dev]"
npm start
```

`npm run dist` builds your own `.dmg` from the same checkout.

### Or download the disk image

**[`Devoid-1.0.0-arm64.dmg`](https://github.com/HarkiratMangat/Devoid/releases/tag/v1.0.0)**, 170 MB.

⚠️ **It is signed with a self-signed certificate, not an Apple Developer ID.** Gatekeeper blocks a double-click on any Mac other than the one that built it; **right-click → Open** and confirming still works, on any Mac, and is the only way in. There is no paid Apple Developer account behind this project, so notarisation is not planned for the published build.

The disk image also cannot be pointed at an engine of your choosing — see the note in [Settings](#settings).

### What you need either way

| requirement | detail |
|---|---|
| **macOS on Apple silicon** | The published build is `arm64` and an Intel build is not produced. A source build on Intel is untried. The floor is macOS 11, inherited from Electron 44; nothing declares one explicitly. |
| **Python 3.11 from [python.org](https://www.python.org/downloads/)** | Specifically the framework build at `/Library/Frameworks/Python.framework/Versions/3.11`. **Homebrew's Python does not satisfy this** — the app ships a virtual environment, and a virtualenv needs the exact interpreter it was built against. |
| **`gifsicle`, `pngquant`, `webpmux`** | `brew install gifsicle pngquant webp`. The engine shells out to all three; without them it reports itself degraded. |
| **The engine, on disk** | [`gif-background-remover`](https://github.com/HarkiratMangat/gif-background-remover) at **v6.3.3 or later** — below that Devoid cannot read the engine's option list. **v6.4.0** additionally gets you the speed-up in [Features](#features). |

## Using it

1. **Add files.** Drop them on the window, or press **Add files**.
2. **Wait for the read.** Each asset is analysed once. Most come back ready; roughly one in eight comes back with a question.
3. **Answer it.** The region in doubt is outlined on the artwork. **Keep it** protects that interior; **Cut it** removes it. Your answer applies to every region sharing that outline colour, because the engine's options take colours rather than region ids. A fade question looks the same and asks whether the fading region is artwork.
4. **Compare first, if you want to.** Drag the seam to see both answers on the same asset, both playing.
5. **Set a goal, or set none.** A goal is a size cap, a format, or neither. Left alone, the engine renders at full resolution and infers nothing.
6. **Press the primary button to render it.** Devoid writes `<name>_transparent.<ext>` **next to your source file**, escalating to `_v2` and `_v3` rather than overwriting anything.
7. **Read the verdict.** Leftover background pixels, how much of each protected region survived, edge fringe, and frame timing. **Not checked** carries the same visual weight as done and failed.
8. **Reuse it.** History replays a previous run's settings onto a new file, and says so if the engine has changed underneath the line it is replaying.

## Features

**Every control has three states, where a checkbox has two.** A row reads `auto · <what the tool would do>` until you take it over, and only taken-over rows are sent — so a switch can be *on*, *off*, or *left to the engine*. That third state is the point: `--auto` applies its recommendation only where an option was left at its default, so an interface that sends all 63 options turns `--auto` into a no-op and the engine stops thinking. Taking a row over always ships its undo.

**The question is visual and the answer is a drag.** Two renders, one seam, both animating. The same shape works for any option with a visible consequence.

**Verification is reported rather than assumed.** The app never infers a size target, and never claims a check the run did not perform.

**Nothing is legible by colour alone.** Every state carries a mark or a word as well. The reason is measured: across eight real corpus assets, 31% of one asset's artwork and 21% of another's fall inside the same red the app uses to mean *this goes*, so on that art colour alone would have been invisible. `prefers-reduced-motion` is honoured throughout.

**The sheet responds to how much is on it.** Tiles shrink as the batch grows, and past forty assets the one that needs you keeps a double-width tile so it stays findable by shape — while such tiles are in the minority, since a mark most tiles carry stops reading as a mark. A size change waits for a drop to finish arriving rather than resizing everything under your cursor.

**One analysis per render instead of two.** Devoid hands the engine the analysis it already computed when it read the questions. Measured on one asset on one machine (`galaxy.gif`, 743 KB, 8 frames): `analyze()` runs 0 times instead of 2, and a render takes 4.3s instead of 9.8s, with byte-identical output. Needs the engine at v6.4.0; against an older one the app detects the missing option and pays the old cost.

**Advice ships with an undo** of exactly what it changed, and every preset number cites a measurement in the engine's repository.

## Settings

**Where the engine is.** Devoid checks these in order and takes the first hit:

1. `$DEVOID_SKILL` — full path to `remove_gif_background.py`
2. a `skill_path` key in `devoid.config.json`
3. `/Applications/Claude Code/Gif-Background-Remover/scripts/remove_gif_background.py`

⚠️ **Neither override reaches the packaged app**, and that is a known defect rather than a design choice. An app launched from Finder inherits no shell environment, so `$DEVOID_SKILL` is invisible to it; and `devoid.config.json` is read relative to the app's own `Resources` directory, where writing breaks the signature and the next install erases it. Until that is fixed, a packaged Devoid finds the engine at path 3 or not at all. The workaround for the environment variable is `launchctl setenv DEVOID_SKILL /path/to/remove_gif_background.py`, then reopening the app. Running from a checkout has neither problem.

**Other variables.** `$DEVOID_PYTHON` points at a Python 3.11 that already has the packages, and `$DEVOID_DATA_DIR` moves `jobs.jsonl` and the crash journal.

**Updates.** **Devoid → Check for Updates…** asks GitHub for the newest published release and offers to open its page in your browser. It never checks on launch, only when you click it: a version ping at startup would quietly break the premise that this app talks to nothing.

## Troubleshooting

**Nothing happens when I add a file, or I see an engine error.** The engine is missing or below v6.3.3. Devoid names the three paths it looked at, but only in its console output — a launch-time dialog for this is filed and not built. Run from a checkout with `npm start` to see it, or check that path 3 above exists.

**It says it needs Python packages.** Approve the offer, or set `$DEVOID_PYTHON` to an interpreter that already has them. It installs nothing without being asked, and it refuses rather than guessing if the interpreter it found has no working `pip`.

**macOS refuses to open the app.** Right-click the app → **Open** → confirm. See [Install](#install).

**Where the logs are.** `~/Library/Application Support/Devoid/` holds `jobs.jsonl` and the crash journal. Launching from a terminal (`/Applications/Devoid.app/Contents/MacOS/Devoid`) shows the engine and port diagnostics that the window does not.

**Uninstalling.** Drag the app to the Trash and delete `~/Library/Application Support/Devoid/`.

**Reporting a problem.** [Issues](https://github.com/HarkiratMangat/Devoid/issues), with the console output from a terminal launch if the engine is involved.

## What it does not do

| not built | why |
|---|---|
| Notarised builds | No paid Apple Developer account. The variables that would drive it stay unset, and no placeholder credential is supplied to make the path look testable. |
| Installing its own updates | Squirrel.Mac, the updater Electron apps use on macOS, only accepts a signature the destination machine already trusts, and the repository being private is a second, independent blocker. **Check for Updates…** opens the release page and stops there. |
| A screen-reader pass | Not attempted at this stage. The states are legible without colour and the app is keyboard-operable, but no assistive-technology testing has been done and the app does not claim otherwise. |
| Multi-select | Only one asset can be open at a time, and that is what keeps the layout identical whether you dropped one file or two hundred. |
| Frame-accurate scrubbing | The film strip highlights and counts; the artwork is a looping `<img>` that never seeks. Seeking needs a canvas decoder. |
| Controls that map onto engine options | New surface belongs in a goal the app asks about. The point is that you never learn the 63 options. |

Open work, and the decisions behind each of these, are in [`devoid-deferred-list.md`](devoid-deferred-list.md).

## Licence

Copyright © 2026 Harkirat Mangat. **GPL-3.0-or-later** — see [LICENSE](LICENSE). Clone it, change it, ship it; a version you distribute stays under the same licence with its source available. The engine is **LGPL-3.0-or-later** in [its own repository](https://github.com/HarkiratMangat/gif-background-remover), from v6.4.1 — anything may use it, including something closed, and only an improvement to the engine itself comes back.

To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

The fonts under `web/fonts/` are SIL Open Font License 1.1 and carry their own [licence and attribution](web/fonts/README.md).

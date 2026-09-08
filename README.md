<div align="center">

<img src="docs/banner.webp" alt="Devoid — the wordmark, its O drawn as an accretion disk" width="820">

<p><b>Cut the background out of an animated image.<br>Answer the one question the pixels can't.</b></p>

<img src="https://img.shields.io/badge/macOS-Apple%20silicon-3D4451?style=for-the-badge" alt="macOS, Apple silicon">
<a href="docs/CHANGELOG.md"><img src="https://img.shields.io/badge/v1.1.0-2F5D7C?style=for-the-badge" alt="version 1.1.0"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/GPL--3.0--or--later-3D4451?style=for-the-badge" alt="GPL-3.0-or-later"></a>

<p><a href="#install">Install</a> &nbsp;·&nbsp; <a href="#the-question-devoid-asks-you">The question</a> &nbsp;·&nbsp; <a href="#how-it-goes">How it goes</a> &nbsp;·&nbsp; <a href="#troubleshooting">Troubleshooting</a></p>

</div>

**Devoid removes the background from animated images on your Mac** — GIF, WebP, AVIF, APNG, and static PNG and JPEG. Drop files on the window, get transparent ones back beside them. Nothing is uploaded.

Most files come back done. **About one in eight stops and asks you something first** — a question about the artist's intent that no amount of looking at pixels can settle, which every other background remover either guesses at or hands you as a hex code. [Devoid draws it on the artwork instead.](#the-question-devoid-asks-you)

<br>

## Install

<div align="center">

**[⬇︎ Download Devoid](https://github.com/HarkiratMangat/Devoid/releases/latest)** &nbsp;·&nbsp; Apple silicon &nbsp;·&nbsp; ~170 MB

</div>

macOS will refuse to open it the first time, because the app is signed with a self-signed certificate rather than a paid Apple one. **Right-click the app → Open → Open.** You only do this once.

> [!IMPORTANT] **Devoid needs the engine, and cannot fetch it for you.** [`gif-background-remover`](https://github.com/HarkiratMangat/gif-background-remover) does all the image processing and lives in its own repository. **v6.3.3 or newer**; the [newest release](https://github.com/HarkiratMangat/gif-background-remover/releases/latest) is v6.4.1. Cloning also works and is often ahead — that repository tags every merge but publishes releases only sometimes.
>
> ```sh
> git clone https://github.com/HarkiratMangat/gif-background-remover.git
> ```
>
> Then tell Devoid where it is. From a `.dmg` install the only way that works is:
>
> ```sh
> launchctl setenv DEVOID_SKILL /full/path/to/gif-background-remover/scripts/remove_gif_background.py
> ```
>
> …or put the repository at the path Devoid falls back to, exactly: `/Applications/Claude Code/Gif-Background-Remover/`. Reopen Devoid afterwards. It says at launch if it still cannot find it, and names every path it tried.

**This is a gap, not a design choice.** The engine is one 636 KB Python file and Devoid already ships every library it needs; bundling it is the right answer and is [filed](devoid-deferred-list.md). Until then it is a step you have to do.

**On first launch Devoid checks the rest of what it needs and offers to fetch it.** Three command-line tools (`gifsicle`, `pngquant`, `webpmux`) come from Homebrew, and a handful of Python packages come from pip. It asks before installing either, and installs nothing you decline.

<details>
<summary><b>Or build it from source</b> — works on any Mac, including Intel</summary>

<br>

You need **Python 3.11 or newer**, plus **Node**, **npm**, **git** and the Xcode command line tools (`xcode-select --install`).

```sh
git clone https://github.com/HarkiratMangat/gif-background-remover.git
git clone https://github.com/HarkiratMangat/Devoid.git && cd Devoid
echo "{\"skill_path\":\"$(cd ../gif-background-remover \
  && pwd)/scripts/remove_gif_background.py\"}" > devoid.config.json
npm install && python3 -m venv .venv && .venv/bin/pip install -e .
npm start
```

Any Python 3.11 or later does — Homebrew's, python.org's, pyenv's. `pyproject.toml` declares `requires-python = ">=3.11"`, and an older one is refused at launch with a dialog that says why.

More in the [development guide](docs/DEVELOPMENT.md).

</details>

<br>

## The question Devoid asks you

Sometimes a patch of background colour sits **enclosed by the artwork** — inside a letter, a loop, a gap between limbs — and only on some frames. Is it a hole you can see through, or is it part of the drawing?

Nothing in the pixels answers that. It is a question about what the artist meant, so a background remover either guesses or gives up. **The engine gives up on purpose**, and hands the question over as a hex colour and a bounding box.

Devoid draws it on the artwork instead.

<div align="center">

<img src="docs/shots/the-question.webp" width="860" alt="The disputed region outlined in red on the artwork, tagged “is this yours?”, with a panel reading “The marked place on the artwork · held on 102 of 144 frames” and two buttons, Keep it and Cut it">

</div>

<table>
<tr>
<td width="50%" valign="top">

**◆ Keep it**

Part of the drawing. It gets protected, by colour, everywhere it appears.

</td>
<td width="50%" valign="top">

**✕ Cut it**

Background showing through. It goes, along with everything else that colour.

</td>
</tr>
</table>

Not sure? **Drag the seam** — a divider you pull across two renders of the same file, one for each answer, both playing — and watch both before you pick.

<details>
<summary><b>How often does it interrupt, and is there more than one question?</b></summary>

<br>

**12.8%** of the 304 files the engine was measured against stop and ask something — about one in eight. That splits two ways:

| rate | which question |
|---|---|
| **10.2%** (31 files) | the enclosed-region question above |
| **2.6%** (8 files) | **the fade question** — a region that fades toward the background colour, which the engine can find but cannot classify. It looks the same on screen and asks whether the fading part is artwork |

⚠️ **10.2% is not the interrupt rate**, and quoting it as one understates how often the app stops you. Both numbers are real measurements of different things — see [`docs/PRODUCT.md`](docs/PRODUCT.md), which records the conflation as a documented trap.

</details>

<br>

## How it goes

**1 · Drop files in.** Whichever one needs you sorts to the front, carries a mark, and takes a wider tile — you spot it by shape, without reading.

<div align="center">

<img src="docs/shots/needs-you.webp" width="700" alt="Two tiles side by side: the left one outlined in red over a hatched backdrop and labelled “needs you”, the right one plain and labelled “reading it”">

</div>

**2 · Answer it.** Or drag **the seam** first — a divider you pull across two renders of the same file, one for each answer, both playing — and watch both before you pick.

**3 · Set a size or format target, or don't.** Left alone, Devoid renders at full resolution and invents nothing. Guessing at a size you didn't ask for is a mistake this app is built to avoid.

**4 · Cut.** The file lands beside your original as `<name>_transparent.<ext>`, going to `_v2` rather than overwriting anything.

**5 · Read the verdict.** How much background went, how much of what you protected survived, and the edge quality:

<div align="center">

<img src="docs/shots/verdict.webp" width="470" alt="The verdict: 268,431 background px removed, at most 14,822 artwork px lost, 141,169 px of artwork survive">

</div>

⚠️ **Until a check has actually run, the header says so** — in the same weight as done and failed:

<div align="center">

<img src="docs/shots/not-checked.webp" width="700" alt="The title bar reading “megaphone.src · gif · 144 frames · ✕ not checked”">

</div>

<br>

## What makes it different

<table>
<tr><th width="30%" align="left">the idea</th><th width="34%" align="left">what it means</th><th width="36%" align="left">why it holds</th></tr>
<tr>
<td><b>Three states, not two</b></td>
<td>A control reads <code>auto · what the tool would do</code> until you take it over. A switch can be on, off, <b>or left to the engine</b></td>
<td>the engine only fills in options left at their default — send it every option and it stops thinking</td>
</tr>
<tr>
<td><b>The answer is a drag</b></td>
<td>Two renders, one seam, both animating</td>
<td>you are choosing between two pictures, which is the form the question actually has</td>
</tr>
<tr>
<td><b>Never claims a check it didn't run</b></td>
<td>No inferred size targets, no unearned verdicts</td>
<td><i>not checked</i> renders at the same weight as done and failed, rather than as an absence</td>
</tr>
<tr>
<td><b>Colour is never the only signal</b></td>
<td>Every state carries a mark or a word too</td>
<td>on two real files, <b>31%</b> and <b>21%</b> of the artwork sits inside the same red the app uses for <i>this goes</i></td>
</tr>
<tr>
<td><b>Half the render time</b></td>
<td>The analysis behind your questions is handed straight to the render instead of recomputed</td>
<td><b>4.3s</b> instead of <b>9.8s</b> on one measured file, byte-identical output — needs engine v6.4.0</td>
</tr>
<tr>
<td><b>Advice ships with its undo</b></td>
<td>Every suggestion reverses exactly what it changed</td>
<td>an undo is written at the same time as the change, so a suggestion that cannot be reversed cannot ship</td>
</tr>
</table>

<br>

## Your files

Your images never leave the machine, and nothing about them is ever sent anywhere.

Devoid contacts the network twice, both about versions rather than about your work:

| when | what |
|---|---|
| **once a day, at launch** | asks GitHub what the newest Devoid and the newest engine are. Silent unless something is newer, downloads nothing, and opens a release page only if you click. Turn it off with **Check for Updates on Launch** in the menu, or from the dialog itself |
| **the first launch** | offers to install the Homebrew tools and Python packages it needs. It asks first, and installs nothing you decline |

Finished renders land beside their sources. Your job history goes in `jobs.jsonl` under `~/Library/Application Support/Devoid/`, which is also where the logs and preferences are.

<br>

## Settings

Devoid finds the engine by taking the first of these that resolves:

| where Devoid looks | notes |
|---|---|
| `$DEVOID_SKILL` | full path to `remove_gif_background.py`. ⚠️ **Checkout only** — an app launched from Finder inherits no shell environment. Use `launchctl setenv` for a `.dmg` install |
| `skill_path` in `devoid.config.json` | ⚠️ **Checkout only** — in a `.dmg` install this file resolves inside the bundle, where writing breaks the signature |
| the fallback path | `/Applications/Claude Code/Gif-Background-Remover/scripts/remove_gif_background.py` |

`$DEVOID_PYTHON` points at an interpreter that already has the packages. `$DEVOID_DATA_DIR` moves `jobs.jsonl` and the crash journal. **Check for Updates on Launch** is in the menu, on by default, stored in `prefs.json` beside `jobs.jsonl`.

<br>

## Troubleshooting

**Nothing happens when I add a file.** Devoid cannot find the engine, or it is older than v6.3.3. It says which at launch and names every path it tried — see [Settings](#settings) for the three places it looks.

**It asks to install things.** That is the first-launch check. Approve it, or set `$DEVOID_PYTHON` to an interpreter that already has the packages. It installs nothing you decline.

**macOS won't open the app.** Right-click it → **Open** → **Open**.

**I set `$DEVOID_SKILL` and Devoid ignored it.**

| | what is going on |
|---|---|
| what happens | A `.dmg` install only ever finds the engine at the fallback path, whatever you set |
| why | An app launched from Finder inherits no shell environment, so it never sees your variable — and `devoid.config.json` is read from inside the bundle, where writing would break the signature |
| what to do | `launchctl setenv DEVOID_SKILL <path>`, then reopen. Running from a checkout has neither problem |

**Getting the logs.** Launch from a terminal to see the engine and port diagnostics the window doesn't show:

```sh
/Applications/Devoid.app/Contents/MacOS/Devoid
```

**Uninstalling.** Drag to the Trash, then delete `~/Library/Application Support/Devoid/`.

**Still stuck?** [Open an issue](https://github.com/HarkiratMangat/Devoid/issues), with that console output if the engine is involved.

<br>

## What it doesn't do

⚠️ **Three different things get written down here, and a table with one "why" column cannot tell them apart** — so the middle column says which. *Outside our control* is a fact nobody here can change. *Decided* is a choice with a reason. **Not built** is not built, and no reason is offered for it, because there isn't one beyond nobody having done it yet.

| | kind | |
|---|---|---|
| Notarised builds | outside our control | No paid Apple Developer account. The variables stay unset, and no placeholder credential is supplied to make the path look testable |
| Install its own updates | **not built** | Squirrel.Mac, the usual mechanism, needs a signature the destination already trusts and this build is self-signed. Other mechanisms exist — Sparkle carries its own key — and none is wired up. **Check for Updates…** opens the release page and stops |
| Ship the engine inside the app | **not built** | The engine is one 636 KB file and Devoid already ships every library it needs. This is a gap; it is [filed](devoid-deferred-list.md) |
| Write to the engine for you | decided | It tells you when a newer one is published. `git pull` in that repository is yours to run |
| A screen-reader pass | **not built** | The states are legible without colour and the app is keyboard-operable, but no assistive-technology testing has been done and it does not claim otherwise |
| Opening two files at once | **not built** | You can *select* many — click, shift-click a range, or **Select all** — and act on them together. Only one opens at a time |
| Frame-accurate scrubbing | **not built** | The film strip highlights and counts; the artwork is a looping `<img>` that never seeks. Frame decoding exists for GIF in the seam ([`web/vendor/gifuct.js`](web/vendor/)); wiring it to the film strip, and finding a decoder for WebP, AVIF and APNG, is the unbuilt part |
| Controls that mirror engine options | decided | A control may offer an engine capability; it may never show you a flag. *"Keep the fade"* is a control, `--recover-fade-alpha` is a passthrough, and you only ever meet the first |
| Photographs | decided | This separates a flat background from artwork drawn against it. It is not subject segmentation, and a photo of a person against a wall is not what it is for |

Open work and the reasoning behind each: [`devoid-deferred-list.md`](devoid-deferred-list.md).

<br>

## More

- [**Development guide**](docs/DEVELOPMENT.md) — building, packaging, signing, the test gates
- [**Contributing**](CONTRIBUTING.md) and the [**code of conduct**](CODE_OF_CONDUCT.md)
- [**Changelog**](docs/CHANGELOG.md) — what shipped, and when
- [**The brief**](docs/PRODUCT.md) — the measurement behind every constraint

<br>

## Licence

**GPL-3.0-or-later** — see [LICENSE](LICENSE). Clone it, change it, ship it; a version you distribute stays open.

The engine is **LGPL-3.0-or-later** from v6.4.1, so anything may use it — including something closed — while improvements to the engine itself come back. Fonts under `web/fonts/` are [SIL OFL 1.1](web/fonts/README.md).

<sub>Copyright © 2026 Harkirat Mangat.</sub>

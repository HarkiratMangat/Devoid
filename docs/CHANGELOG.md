# Devoid — changelog

What shipped, when, and why. Newest first.

## Versioning

**Three-part `vMAJOR.MODERATE.MINOR`**, the same scheme as Dior's Builds (`docs/CHANGELOG.md` there) and the engine repo — deliberately, so a session moving between them does not have to switch models.

- **MAJOR** — a major overhaul or major new functionality. Bumped **only deliberately, with the user's confirmation**.
- **MODERATE** — a significant merged PR: a new feature, a real design change, several large bug fixes, or a bundle of adjustments. Bumping it resets MINOR to 0. It climbs past 9 indefinitely (v1.10.x, v1.11.x); double digits is **not** a reason to bump MAJOR.
- **MINOR** — a small adjustment, fix or correction. ⚠️ **SHARPENED 2026-09-07 15:31 EDT**, against the engine repo's own bars now copied into `CLAUDE.md`: minor is defined by the **ABSENCE of a behaviour change**, not by being small. A one-line fix that changes what the app DOES is moderate; a change that touches code and alters nothing a person can observe is minor.

**How to decide which tier a merge is, is in `CLAUDE.md`** — three bars and three tie-breaks, derived from the engine repo's 17 shipped tags rather than asserted. This section keeps the mechanics; that one keeps the judgement.

**The unit that earns a version number is a merged PR**, not a push and not a raw commit. `main` only ever advances through a PR (`CLAUDE.md`), each merge squashes to one commit, and that commit gets one version number and one git tag.

**Entry shape:** `## vX.Y.Z — YYYY-MM-DD HH:MM TZ (#PR · `sha`) — <title>`. A commit cannot contain its own hash, so the **hash is backfilled one release later** — the newest entry lacking a hash is correct, not drift. The backfill is additive (insert `` · `sha` ``, touch nothing else, never edit the timestamp) and is an ordinary commit, **never an `--amend` and never a force-push**.

**Open work is not here.** `devoid-deferred-list.md` is the tracker; this file records only what merged. `docs/DEVLOG.md` carries the reasoning and the dead ends.

---

## v1.1.0 — 2026-09-07 21:03 EDT (#3) — Devoid fetches what it needs, and stops overstating what it found

⚠️ **This was going to be `v1.0.1`.** The branch began as documentation and then grew a behaviour change, and the bars in `CLAUDE.md` are explicit: minor is defined by the **absence** of a behaviour change. New dialogs, a new first-launch install offer and a corrected `PATH` are all "the product behaves differently inside capabilities it already had" — the moderate bar, verbatim. One branch, one version, one tag; the documentation work below is a section of it, not an entry of its own.

### 🔴 The packaged app could not see Homebrew, and blamed the machine

`startServer` handed the Python server `{ ...process.env }`. **An app launched from Finder inherits `/usr/bin:/bin:/usr/sbin:/sbin`** — your shell's `PATH` is set by your shell, and Finder never runs one. Homebrew installs into `/opt/homebrew/bin`, which is on neither list. So `shutil.which("gifsicle")` in `server/engine.py` answered `None` **in the packaged app on a Mac where gifsicle was installed and working**, and Devoid reported itself degraded for a reason that was not true.

Invisible from a checkout, because `npm start` runs under a shell that already fixed `PATH`. ⚠️ It is this session's named class — *true of one machine at one moment, written as a property of the software* — and the tell was the usual one: the tool names appear in `REQUIRED_BINARIES` and in three documents, and in no code that says where they live.

`lib/deps.js` now owns `toolPath()`, and `tests/test_deps.test.js` asserts the Finder `PATH` case, the no-duplicate case and the missing-prefix case.

### Devoid asks for what it needs, once, at launch

Three states that reached **stdout and nothing else** now reach the person:

| state | before | now |
|---|---|---|
| **No engine** | a normal-looking window, then a 503 on the first render | a dialog naming every path that was tried — the message already existed, only the surface was missing. Closes `[P1 · S]` |
| **Engine older than v6.3.3** | the option list silently fails to load | a dialog saying which version is on disk and which is needed |
| **`gifsicle` / `pngquant` / `webpmux` missing** | nothing at all — a missing binary does not set `available: false`, so even the console line never fired | an offer to run `brew install`, with the formulae mapped correctly (`webpmux` is the binary; **`webp`** is the formula) |

**Nothing installs without being asked**, and the app does not quit on a missing engine — the window opens and every other surface still works.

⚠️ **The install is verified by the remedy, not by `brew`'s exit code.** `brew install` exits 0 for "already installed" and for a formula that installed nothing usable; the check is whether the binary is now where the server will look.

### The engine has a published release again, and Devoid's floor is reachable

**Released 2026-09-07 20:05 EDT, on Harkirat's explicit authorization:** [`gif-background-remover` v6.4.1](https://github.com/HarkiratMangat/gif-background-remover/releases/tag/v6.4.1), with the 484 KB `.skill` attached.

⚠️ **It closes a trap this README was walking readers into.** Devoid's floor is **v6.3.3**, and the newest *published* engine release was **v6.3.0** — below it. Anyone who followed the README's engine link and took the latest release got an engine Devoid refuses, with no way to know why from either document. Verified after publishing, anonymously: the latest release now satisfies the floor, and an installed v6.4.1 reads as **current** rather than ahead.

### Devoid goes public, and the documents stop hedging

**Decided 2026-09-07 19:44 EDT.** The repository was private, which made most of the README fiction for anyone but its author: the download button, the clone, the issue link and the changelog badge all resolved to 404, and the v1.0.0 release carrying a 170 MB disk image was invisible. The `⚠️ this repository is private` warnings are gone.

⚠️ **The split was also backwards from what the licences say.** The engine is public under **LGPL** — the permissive one, chosen so closed software could use it — while the app was private under **GPL**, the copyleft one that exists to keep distributed code open. Nothing was being distributed.

### One update check, for both things, running on its own

**Check for Updates…** now answers for **Devoid and the engine together**, in one dialog — and it runs by itself, once a day, when you open the app.

⚠️ **THE APP'S OWN PREMISE WAS AMENDED TO DO THIS.** `main.js` carried a comment arguing the opposite: *"USER-INITIATED ONLY, NEVER ON LAUNCH … a version ping fired at startup would quietly break that promise for a feature nobody asked for at that moment."* Sound reasoning, answering the wrong question. Harkirat: *"what if a user never clicks it themself?"* **An update mechanism that only works for the person who remembers it exists serves nobody**, and the people running a stale engine are exactly the ones not reading the menu bar.

**The promise is kept differently rather than dropped:** throttled to once a day, **silent when there is nothing to say**, and one checkbox from off — **Check for Updates on Launch** in the same menu, and in the dialog itself the moment it interrupts you. `docs/PRODUCT.md` records what the network claim became; the README no longer says *"you start every one"*, because that would now be false.

⚠️ **AND IT IS ONE MENU ITEM, NOT TWO.** The first version of this shipped a separate **Check for Engine Updates…**, which asked the person to know that Devoid and its engine are different things versioned separately — precisely the knowledge this app exists to spare them. Merged before it left the branch.

`lib/prefs.js` holds the preference and the throttle; `tests/test_prefs.test.js` falsifies both. The two that matter: **reopening a window must not re-ping GitHub** (`activate` reopens without restarting, so "on launch" happens all afternoon), and **a clock that has moved backwards must not wedge the check off forever** — a `lastCheck` in the future reads as due, not as recent.

🔴 **THE ONLY REASON THIS IS WORTH WRITING DOWN IS THAT IT WAS REFUSED FIRST, ON A CLAIM NOBODY CHECKED.** Hours earlier this same branch recorded: *"that repository publishes no releases and is private, so the check could only ever answer nothing to show."* **Both halves were false.** `gh repo view` reports `isPrivate: false`; `gh release list` returns **nine**. The claim came from a handoff note saying the v6.4.0 merge shipped no release — true of **one merge**, carried forward as a property of **the repository** — with "and it is private" asserted on top and never tested. One command would have settled it.

⚠️ **It is the session's own named class, and `check:claims` is structurally blind to it.** That gate reads the documents against the **code**; this claim was about a **remote**. A claim about something outside the repository has no gate, and saying so is the only honest mitigation available.

**The case a naive version check gets wrong, and it is the live one:** the engine's newest *release* is **v6.3.0** while its newest *tag* is **v6.4.1**, because that repo tags every merge and publishes a release only sometimes. `installed !== latest` would have told a v6.4.1 user to downgrade. `updateVerdict()` returns **`ahead`** as a first-class answer, and `tests/test_deps.test.js` asserts it against exactly those two numbers.

### The verdict is measured now, or it says it isn't

**The big number was a yardstick presented as a measurement.** `_ledger` guessed the background from the source's **top-left pixel**, split artwork from it at a hardcoded **20**, and called a pixel survived at **alpha > 200** — while `web/app.js` printed the result in 44px type with no qualification, inside the one feature whose whole claim is that the app never reports a check it did not earn. The function's own docstring admitted the thresholds were *"INVENTED"* and the figure *"never an absolute damage figure"*.

**All three guesses had a real answer already in hand**, because Devoid computes the analysis for its own questions and hands it to the render:

| was | is |
|---|---|
| the corner pixel | the engine's measured **`detected_bg_color`** |
| a hardcoded `20` | the engine's own tolerance, from the handoff document |
| `alpha > 200` | **`alpha == 0`** — removed needs no threshold, so there is none to invent |

When no analysis is available the old estimate still runs and the row carries **`measured: false`**, which the panel now says out loud. `tests/test_ledger_honesty.py` — 6 cases — builds a file whose **artwork touches the corner**: measured reports **0 artwork lost**, the estimate reports **1,456**, the entire background misread as damage. That was shipping as a headline figure.

### Rules, briefs and reasons that had stopped being true

| the claim | what was true |
|---|---|
| **the 1:1 controls rule** | `CLAUDE.md` forbade controls mapping onto engine flags. **Six shipped** (`web/canvas.js:89-94`). The drawer is right and the rule was wrong: it named a mechanism where the design cares about an experience. Now: *a control may offer a capability, never a flag* — the test is the label |
| **`docs/PRODUCT.md`'s audience** | *"the project is not shaped around that stranger"* — written when the repo was private. It went public this evening with a front door, a contributing guide and an issue tracker. The document every decision is justified against was stale about who the work is for |
| **"needs a canvas decoder"** | `web/vendor/gifuct.js` is in the repo, vendored by an npm script, already decoding frames in the seam. GIF-only and unwired — a scope, not a blocker |
| **"an unsigned build"** | the build is signed, self-signed; the same file says so 230 lines earlier. And Squirrel is one mechanism, not the category |
| **"keeps the layout identical"** | the contact sheet deliberately varies with count, documented as a feature two sections above |
| **`appendlog.py`** | still described `labels/protection.jsonl` as a live second writer, removed on 2026-09-07 |
| **`4000` and `DAY_MS`** | mine, three hours old. A `setTimeout` does not "never block the window" at any delay; both now say they are judgements |

🔴 **The generator behind all of it: this project rewards stating reasons, so a structure that demands a reason receives one — including where the truth is "nobody built it".** Four of eight non-goal rows were unbuilt work wearing a justification; the three with real external causes were clean. **The table now has a `kind` column with `outside our control` / `decided` / **not built**, so the honest answer is writeable.** Fixing the sentences would have produced better-sounding reasons and the same defect — which is exactly what happened three hours earlier, when the differentiator column was renamed from *"the evidence"* to *"why it holds"* and its three empty cells were filled in rather than emptied.

### The engine's absence stops being described as a virtue

*"It is deliberately not bundled: a copy inside the app would drift from the original in silence."* **The engine is one 636 KB Python file, and Devoid already ships `numpy`, `PIL` and `scipy` — its only dependencies — at 149 MB of a 170 MB disk image.**

⚠️ **The argument was also backwards.** Not bundling guarantees drift rather than preventing it, which is how a floor of v6.3.3 came to sit above a newest release of v6.3.0. The README now says the absence is a gap, points at the tracker, and gives the step; bundling is filed `[P1 · M]` with the resolution order and the LGPL obligation that comes with a shipped copy.

### Four screenshots, three of them the same screen

**Nobody had opened them.** They were described from alt text and filenames through a rebuild, a critique agent, a four-pass external review and several rounds of edits — and every one of those passes reasoned about `01-contact-sheet`, `02-open-question`, `09-seam` and `10-ledger` without looking at the pixels.

Opening them: **02, 09 and 10 are the same screen** — the megaphone open view, differing only in what the right rail holds. At the sizes they shipped at, a reader could not tell them apart, and the thing each caption pointed to was a fraction of a 1640px window:

| | was | now |
|---|---|---|
| the question | a whole app window; the outlined region and the two buttons that answer it sat 400px apart | **`the-question.webp`**, 1090×505 at ~1:1 — the tag, the region, the panel and both buttons |
| the contact sheet | six tiles at a 2.3× downscale; the `needs you` marker rendered about 5px tall | **`needs-you.webp`** — two tiles, one marked, one not |
| the verdict | the numbers were a small block in the corner of another megaphone screen | **`verdict.webp`**, 470×180, and **`not-checked.webp`** for the claim about the unearned tick |
| the seam | **removed.** Both sides of the divider look identical, so the shot does not show the one thing a seam is for | filed `[P1 · S]` with the capture change |

⚠️ **Cropping was in the external review's recommendations and I sized the images instead** — `width=` only makes an unreadable picture bigger, which that report said in as many words. Three unreferenced captures went with them; `docs/` is now **632 KB**, from 1,333 KB before this branch.

### A second review of the README, and the eight facts it was still wrong about

A worktree session ran four passes over the rendered page — UX copy, AI-writing detection, clarity and onboarding, layout and visual — and fact-checked every claim against the code and GitHub's API. **Its md5 matched the live file exactly**, so nothing in it was stale. Eight findings were factual rather than aesthetic:

| the claim | what was true |
|---|---|
| **`offline only` badge** | the app now asks GitHub daily on launch. The page contradicted itself 150 lines apart, and **the edit that made it false was made the same evening** |
| **`10.2%`, quoted alone** | `docs/PRODUCT.md` says verbatim *"Never quote 10.2% on its own as the refusal rate"* and flags it **STALE IN THE UNSAFE DIRECTION**. The interrupt rate is **12.8%**, which appeared nowhere |
| **the fade question** | deleted from the README, still live in `server/validate.py`. A user would meet a question the docs said did not exist |
| **"3.11 exactly"** | quoting `requires-python = ">=3.11"` as its evidence — a floor, disproving the claim it was cited for |
| **"Download Devoid 1.1.0"** | linked to a releases page whose only release is v1.0.0 |
| **the fallback engine path** | promised in a cross-reference to Troubleshooting, printed nowhere in the file. The **only** internal anchor, and it pointed at the section containing it |
| **the engine floor** | Devoid needs v6.3.3; the newest published engine release was v6.3.0. Following the README's link got you an engine Devoid refuses |
| **badge `#E2402A`** | **4.20:1** against shields' white text — fails WCAG AA — and it doubled as the app's *this goes* red, so the badge strip contradicted the page's own "colour is never the only signal" claim |

**And two measured layout defects:** the only two screenshots without a `width` attribute rendered **445×288** on desktop and **107×70** at 400px — a 15.3× downscale of images whose alt text promised detail invisible at either size — and two tables shipped an empty `| | |` header row, which GFM renders as a blank bordered band and a screen reader announces as blank column headers.

🔴 **`check:claims` had a badge-contrast check and it passed this.** Its threshold read `< 3`, which is WCAG's **large-text** bar; shields sets its label in ~11px bold, so the bar is **4.5:1**. `#E2402A` at 4.20 sat between the two numbers. **A threshold copied from the wrong row of the spec is indistinguishable from no threshold at all for everything in between.**

Three checks added and falsified: the AA threshold corrected, a `docs/` screenshot with no `width=`, and an empty table header row. The last one immediately found **five more** empty headers in files the report never looked at — `CONTRIBUTING.md`, `docs/PRODUCT.md`, `docs/DEVELOPMENT.md` and `docs/CHANGELOG.md` twice.

### The gate for stale counts had been passing while eleven of them shipped

`check:claims` was built earlier the same evening *specifically* to catch a hardcoded count of the engine's options drifting. It passed. Meanwhile the number was wrong in **eleven live places** — `CLAUDE.md` twice, `docs/PRODUCT.md` three times, `map.yaml`, `web/app.js`, `server/cli.py`, a test's own docstring, an API fixture note. Eight said **63**, three said **64**. The parser reports **64**.

**Two reasons, and they are the same mistake twice:**

| the reason | what it cost |
|---|---|
| the pattern matched `options` and never `flags` | **every occurrence in this repository says flags.** The falsifier that proved the check worked injected `"63 options"` — a string shaped like the **check** rather than like the **defect** |
| it read three files | the claim lived in eleven, including two source files and a test |

🔴 **A gate falsified against a synthetic instance is falsified against nothing.** This repo's own rule is that a check is finished when it has been run against the defect and failed — and this one was, against a defect written to match it. **Falsify against an instance you did not author**, or against the real one if it is still there.

All eleven now read *"every flag"*, which cannot go stale. The check reads **fifteen files** and matches both words, and it distinguishes a **claim** from a **citation** by quote parity — so `CLAUDE.md` and `DEVLOG.md` can keep quoting *"the 63 options"* as the defect they record without the gate firing on their own history. Falsified three ways: a real unquoted claim fails it, a citation does not, and the correct count does not.

### `check:design`'s scope depended on what was lying in the directory

`git status --porcelain` lists **untracked** files, and `check:design` fed all of them to the detector. Two scratch renders of the README left at the repo root — `.readme-render.html` and its light twin — entered the design contract and failed it with **17 findings**, every one a correct reading of **GitHub's own stylesheet** rather than of this app.

⚠️ **The defect is not the failure, it is the scope.** A saved article, an editor backup or a downloaded page could turn the design gate red, and a clean checkout and a working one scanned different file sets — so the gate measured the directory as much as the product. An untracked file ships nowhere.

Untracked paths are now dropped **unless they are under `web/`**, because new shipped surface is untracked until it is added and excluding it would open the opposite hole. Falsified both ways: the same deliberately defective page is **ignored at the root** and **fails under `web/`**.

### The README is a front door again

Rebuilt against eight pieces of direct feedback. The philosophy section is gone; the install block leads; the requirement list shrank to the one thing Devoid genuinely cannot fetch for you. Screenshots pair two-up at half width instead of stacking full-bleed, and every image is **WebP** — `docs/` went from **1333 KB to 857 KB**, the banner alone from 342 KB to 69 KB.

### The conventions this repo runs on, written down

The banner is [DEVOID Banner V2_Warp](DEVOID%20Logo%20Assets/), resized to 1640px for its 820px display width. The rest is `CLAUDE.md`: the full lifecycle, the final pre-merge checkpoint, merge-vs-release, and commit/branch/PR naming — verified line by line against Dior's Builds and the engine repo rather than summarised from memory.

⚠️ **This entry exists because the version it names was mis-tagged first.** `v1.0.1` was originally cut on `4d5199d`, a commit whose manifests both read `1.0.0` and which has no entry here. That tag was deleted, the bump and this entry moved onto the branch where they belong, and the tag re-cut. **The merge of PR #2 therefore carries no version of its own; it is absorbed here** — a recorded exception to "every merge gets a version", not a precedent.

## v1.0.0 — 2026-09-07 15:55 EDT (#1 · `958d32f`) — the first working version

**82 commits**, derived with `git rev-list --count main..HEAD` rather than typed. There is no v0.x: the first release is the first working version, matching the engine repo's and Dior's Builds' convention.

The app shows the question the engine cannot answer. `--auto` refuses **12.8%** of assets (39 of 304) on questions that are visual — the enclosure question alone is **10.2%** (31 of 304), the fade question 2.6% — and delivering one of those as a hex string and a bounding box is the failure this exists to end. Answering them visually is also what keeps every other flag absent, because `--auto` applies its recommendation only where an option was left at its default.

⚠️ **Requires the engine at v6.4.0 or later** for the analysis handoff below. Against an older engine the capability check returns false, no flag is sent, and every render costs a second analysis. It degrades; it does not break.

**Sections below are the work that landed after 11:13 EDT on 2026-09-07.** Everything above that time is in the entries that follow.

### Four audits of the launch documents, and what they found in the code — 2026-09-07 16:28 EDT

Two fresh readers and two auditors were run over the README, `docs/DEVELOPMENT.md` and the release note with no context beyond the files themselves. They found real defects, most of them in the code rather than the prose.

**Fixed in this release:**

| the defect | the fix |
|---|---|
| `main.js` accepted a **system Python 3.10** while `pyproject.toml` declares `>=3.11` and the failure dialog says 3.11 | floor raised to 3.11, so the three sources agree |
| The update dialog told the user the app **"is not code-signed"** | it is signed, just not by an authority another Mac trusts. Message corrected |
| `gifsicle`, `pngquant` and `webpmux` are in `engine.py`'s `REQUIRED_BINARIES` and were **documented nowhere** | `brew install gifsicle pngquant webp` is now in both install paths |
| `$DEVOID_PYTHON` is named in the app's own dialog and was undocumented | in the README's Settings |
| `pyproject.toml` read `0.1.0` | `1.0.0` |
| The fonts shipped inside the disk image with **no licence anywhere in the repository** — OFL 1.1 requires it to travel with them | `web/fonts/OFL.txt` and `web/fonts/README.md` |
| Both documents claimed a missing engine raises a **dialog naming the three paths it looked at**. No such dialog exists | both corrected to describe the 503 that actually happens; the dialog is filed `[P1 · S]` |

**Filed rather than fixed:** a packaged app cannot be pointed at a different engine (`$DEVOID_SKILL` does not reach a Finder-launched app and `devoid.config.json` resolves inside the bundle), and `tests/port-probe.test.js` is wired to nothing.

⚠️ **The README was also telling every reader to do something it had just said would not work** — download the disk image, under a note explaining that Gatekeeper refuses it everywhere but the build machine. Building from source is now the primary path, and the Gatekeeper claim is corrected: it blocks the double-click, and right-click → Open still works.

### Licensed — 2026-09-07 16:28 EDT

**GPL-3.0-or-later**, Harkirat's call. Anyone may clone, change and ship it; a distributed version stays under the same licence with its source available. The engine is **LGPL-3.0-or-later** from v6.4.1 (2026-09-07 16:45 EDT) so it can be used by anything, including something closed, while improvements to it come back. Both `COPYING` and `COPYING.LESSER` ship inside its `.skill` package.

### The analysis is handed to the render instead of recomputed — 2026-09-07 15:55 EDT

A render called the engine's `analyze()` **twice** — `--auto`'s pass 1 and its pass-3 verify — on top of the analysis `/analyze` had already paid for. Measured on `galaxy.gif` (743 KB, 8 frames) by wrapping the real function and counting: **2.80s + 2.93s of a 10.15s run**.

The engine now takes an analysis as an input (`--analysis-json`, and `verify(input_analysis=)`, both v6.4.0). Devoid writes the one it already holds after `/analyze` and passes the path at render time.

| | `analyze()` calls | wall |
|---|---|---|
| before | 2 | 9.84s |
| engine parameter only | 1 | 7.93s |
| with Devoid's handoff | **0** | **4.28s** |

Output bytes identical (`354fcb04b142`). `server/engine.py` asks the engine's own parser whether the flag exists rather than assuming it. The document lives in a per-process temp directory, and the tolerance it records is read off the engine's parser default so the two cannot drift.

### The density rule's three unseen edges — 2026-09-07 15:55 EDT

The rule shipped asserted only where one tile needs you. Three edges were undecided:

| edge | decision | measured |
|---|---|---|
| a crowd where nothing needs you | no landmark, and `data-demand="none"` says so | 60 tiles, one width, 154px |
| a crowd where everything does | the span is dropped rather than doubling the scroll. Derived, not picked: a spanning tile holds 2 cells and a settled one 1, so spans hold under half the grid exactly while `2 x demanding < settled` | 19 demanding → 325/154px · 20 → 154/154px |
| the 40/41 flip mid-drop | the bucket waits for the drop to stop; a trickle of ≤4 restarts a 700ms window, a bulk arrival re-buckets at once | 40 → `many`, +1 → `many` held, then `crowd` |

⚠️ **The gate meant to prove this was itself broken.** Its `pad()` set `state: 'needs-you'` on a cloned asset, and `stateOf()` derives that verdict from `outstanding(a)`, never from `a.state`. The existing assertion passed anyway because the clones cycle a corpus containing a genuinely demanding asset. Both probes now build from real templates.

### The versioning bars are written down — 2026-09-07 15:55 EDT

`CLAUDE.md` gained the engine repo's three bars and three tie-breaks, derived there from 17 shipped tags. It also settled a contradiction: this changelog defined MINOR as "a small adjustment, fix or correction", which reads a behaviour-changing one-line fix as minor. Minor is the **absence** of a behaviour change, not smallness.

### The contact sheet knows how much is on it — 2026-09-07 11:13 EDT

Three density buckets instead of two: **365px** at six or fewer, **282px** to forty, **154px** beyond. And in a crowd the tile that needs you keeps two columns — **325px against 154px** — so it is findable by shape rather than by reading. Asserted at three counts and falsified. ⚠️ **This entry read 147px until 2026-09-07 15:55 EDT**, when the gate re-measured it at 154. The rule did not change; the number was wrong.

### The label log stops being written, and the app checks its own Python — 2026-09-07 11:00 EDT

Answering no longer appends to `labels/protection.jsonl`: the engine repo's harness is where labelled data lives and is supplied deliberately. The file and its history stay. And the bundle drops ~36 MB of build machinery while `main.js` now probes for its five runtime imports before starting the server, naming what is missing and asking permission before installing anything.

### The three P3s — 2026-09-07 10:34 EDT

The tracker's conservation rule is a gate (`npm run check:tracker`) rather than an honour system, and it took two corrections before its own falsifier would fire. A rerun now says when the engine moved under the line it is replaying. And the exact-key-set sweep found the rule has two sides: relaxed in flow tests, kept and labelled in the two tests whose job is the frozen contract.

### The light state can be looked at again — 2026-09-07 10:26 EDT

The edge rail and the film strip lost their current element entirely in emitting: **2.6/255** and **1.5** against a floor of 8.0, where the void reads 114.3 and 45.0. Both now read **14.5** and **16.2**, on the light state's own shadow scale rather than a border. Three surface briefs and a label bring-back path landed with them.

### Three P2s answered with numbers, and the light state's squint fixed — 2026-09-07 01:59 EDT

`measure_scale.mjs` puts the contact sheet through 8, 20, 60 and 200 real assets: first paint and settle are flat, the tile is 262px at every size, RSS grows about 1.06 MB per asset. `/api/history` stays under 16ms against six concurrent analyses, so the drawer's two-second stall is not the route. And the emitting sheet lost the squint by **8.4** where the void leads by 72.8 — the field was receding by darkening on a light ground, which makes it louder; it washes out now and separates by **25.8**.

### The gate stops seeding the corpus, and the design contract became a command — 2026-09-07 01:32 EDT

`gate:ui` runs against a scratch data dir and asserts the tracked label log is byte-identical across the run; 24 synthetic rows it had already committed are removed. `/impeccable hooks on` is wired and verified live — and `npm run check:design` covers what its `Edit|Write` matcher cannot see, which is most of how this repo is edited.

### Answering is one act now, and Keep no longer looks like Cut — 2026-09-07 01:22 EDT

The `Answer` button is gone: picking a side sends the answer, and the undo that only ⌘Z reached is a visible control. The ledger moved to the top of the decision column, under the question it prices. The eight region tools are two labelled groups divided by a rule, each verdict carrying a mark as well as a colour — **Δ 19.3 in greyscale against a floor of 12.0 that a falsifier chose**, in the first control `check_greyscale.py` has ever covered.

### Six P1s in one pass — 2026-09-07 01:00 EDT

The disabled primary went from **1.82:1** to **6.78:1** and is measured in both lighting states instead of being invisible to the gate. `web/advice.js` lost a whole generation of `var()` fallbacks and now returns zero detector findings. `scripts/fetch-fonts.py` stopped regenerating the clamped font axes it was fixed to remove. The captures stopped photographing the same empty table four times. `npm run check:detector` proves the detector can report presence before any absence it gives is believed. And every `signal_present` in `map.yaml` was narrowed to one live-code string, then falsified by renaming a function and watching the node go red.

### The seam can finally show a difference — 2026-09-07 00:37 EDT

The disputed region's fill was painted over the rectangle identically on both halves, so the comparison the product exists for could not differ in the one place it was about. The fill is now clipped at the seam, in each region's own coordinate basis, and the seam opens on the disputed bbox instead of at 50%. Two assertions in `npm run gate:ui` cover it and were shown to fail on the old code.

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

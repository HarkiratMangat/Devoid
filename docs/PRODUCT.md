# Devoid — product context

*Written 2026-09-03 21:15 EDT, revised 2026-09-04. The durable brief. What this is, who it serves, and the constraints that are not negotiable. **Read `HANDOFF.md` first** for where the work stands; visual decisions live in `DESIGN.md`; the build order is `PLAN.md`.*

<!-- impeccable:product-schema 1 -->

## Platform

web

⚠️ **Electron is a desktop shell over web technologies, so the design language is `web`.** `init`'s own rule: a native wrapper around a website does not make it native. `live` and the bundled `detect.mjs` both apply here; the `ios`/`android` references do not.


### The network promise, as it actually stands (2026-09-07 19:33 EDT)

**Amended, deliberately.** The app shipped saying it *"talks to nothing"* and that **you start every network call** — `main.js` carried that as a comment arguing the update check must never run at launch. Harkirat: *"what if a user never clicks it themself?"*

**An update mechanism that only works for the person who remembers it exists serves nobody**, and the people running a stale engine are exactly the ones not reading the menu bar. The constraint the promise was protecting — *your images and your work never leave this machine* — was never the same claim, and it is untouched.

What is true now, and what the README says:

| the promise | where it stands |
|---|---|
| **your files** | never sent anywhere, in any circumstance. Unchanged, and not negotiable |
| **a version check** | once a day at launch, silent unless something is newer, one checkbox from off, and off is remembered |
| **first-launch installs** | Homebrew tools and Python packages, each asked for, each declinable |

⚠️ **A promise that has been amended must be amended in the copy too.** The README said *"you start every one"*; it no longer does, because that would now be false.

## What it is

A desktop app for removing the background from animated images — GIF, WebP, AVIF, APNG, and static PNG/JPEG — and fitting the result to a size or format target.

It is a front end for the `gif-background-remover` skill, which lives in its own repo at `/Applications/Claude Code/Gif-Background-Remover` and is separately uploaded to claude.ai. Devoid does not reimplement any image processing. The skill remains the engine and the source of truth for every algorithm.

## Who it is for

⚠️ **AMENDED 2026-09-07 20:56 EDT, BECAUSE THIS DOCUMENT EXPIRED WHILE THE REST OF THE PROJECT MOVED.** It said *"a stranger could run it, but the project is not shaped around that stranger"* — written when the repository was private. The repository is **public** as of this evening, the README was rebuilt as a front door for exactly that stranger, and `CONTRIBUTING.md`, a code of conduct and an issue tracker link went with it. **This is the document every other decision is justified against, so it being stale about who the work is for makes every downstream justification unfalsifiable.**

**Now: Harkirat first, strangers second and genuinely.** The working assumption is **built for him, but nothing that requires him** — no hardcoded paths, no assumptions about folder layout, a first run that finds or offers to install what is missing. The copy assumes competence and does not teach; a stranger could run it, but the project is not shaped around that stranger.

The assets are icon, sticker and emoji art: antialiased vector work and hard-edged pixel art, usually destined for Discord.

## The problem it solves, stated precisely

The skill exposes **63 command-line options**. That count is not the friction it appears to be — `--auto` already runs the skill's own `--recommend`, applies its flags, renders, re-measures the written file, and re-renders once, so the ordinary path never touches the other 62.

The friction is three questions:

1. **A coin-flip protection decision.** When a candidate region's outline encloses it on *some* frames but not all, whether that enclosed interior is design or background is a statement about intent, and the pixels do not answer it. Measured across 304 real assets: **10.2% refuse this way.** The refusal names a hex colour and a bounding box.
2. **A nameable fade** the detector can identify but not classify, for a measured reason — across the 91 assets in that branch, the ramp statistics interleave with assets that render as a translucent ghost of the whole frame, so no threshold separates them.
3. **The size and format goal**, which the tool deliberately never guesses.

⚠️ **Two rates, and conflating them is a documented trap.** `--auto` stops and asks **something** on **12.8%** of assets (39 of 304: 29 enclosure-only, 8 fade-only, 2 both). The **coin-flip protection question alone** is **10.2%** (31 of 304); the fade question alone is 2.6%. Use 12.8% for "how often does the app interrupt you" and 10.2% for "how often is it *this* question".

⚠️ **Never quote 10.2% on its own as the refusal rate.** `references/lessons.md` records it as the *original pooled* figure, taken before the fade gate existed, and flags it **"STALE IN THE UNSAFE DIRECTION"** — it understated how often `--auto` stops and had already reached three packaged files. Both numbers are real measurements of different things, which is why both are given here.

The first two are visual questions delivered as text. Nobody can answer *"is the region at bbox [230,135,406,359] outlined in 002864 design or background?"* by reading it. **They have to see it.** That is the product.

## The finding the whole design rests on

`--recommend` already returns all three questions as **structured JSON**, before anything is rendered:

| field | carries |
|---|---|
| `ambiguous_protection` | list of `{region_id, outline_color, bbox_xyxy, frames_enclosed, frames_checked, enclosure_ratio}` |
| `nameable_fade` | `{color, faint_px, frame_index}` |
| `recommended_format` | one of `gif-ok`, `webp-or-apng`, `webp-or-avif` |
| `not_applicable_reason` / `alternative_command` | why it refuses outright, and what to run instead |
| `evidence` | human-readable justification, one string per finding |
| `suggested_command` | ⚠️ **the field `--auto` actually builds its flag list from** — it `shlex.split`s this string and drops the first four tokens. The most important field for the engine boundary, and it is a shell string, not structured argv |

`--auto` derives its refusals from exactly those fields. So Devoid reads the questions **first** and answers them before running:

| question | answer flags |
|---|---|
| coin-flip protection | `--assume-protect <hex[,hex]>` or `--assume-remove <hex[,hex]>` |
| nameable fade — it IS artwork | ⚠️ **`--recover-fade-alpha --fade-color <hex>`, both flags**, and an 8-bit-alpha output |
| nameable fade — it is not | `--assume-no-fade` |

⚠️ **`--fade-color` on its own is a HARD ERROR, not a warning.** The engine reads it only inside the `--recover-fade-alpha` branch and refuses outright when it is passed alone. **And answering "it is artwork" forces the output container** to `.webp`/`.avif`/`.apng`, which collides with a stated GIF goal — the app resolves that, it does not discover it.

⚠️ **"`--auto` never refuses" is too strong.** Answering both questions removes both *refusals*, but `--recommend` can still return `not_applicable_reason` — a background that changes colour partway through, for instance — for which no assume-flag exists. The engine boundary must handle a refusal that has no answer.

The skill's JSON is already a machine-readable question API. This is why the app is a front end and not a rewrite.

## Non-negotiable constraints

These are not preferences. Each was measured, and each has already cost something when violated.

**Never infer a size target.** A guessed target produces a real file at a real size, and nothing downstream says the number was invented. The 2026-08-19 trial measured the consequence: variant sprawl was inversely proportional to how much the user had constrained the goal — the session that knew least produced the most files. The default applies no compression flags at all. A size cap arrives only because someone chose one. When a result is large, the app names the size and offers. **Offering is not acting.**

**Never report a verification it did not earn.** `--verify` skips every pixel check when the output was cropped or resized, and says so only in a `checks_skipped` field. Quick mode skips verification entirely. In both cases the app says **not checked**, as a first-class state with the same visual weight as done and failed. A green tick that was not earned is worse than no tick.

**Never overwrite a delivered file.** The skill's convention escalates `<stem>_transparent.<ext>` → `_v2` → `_v3`. Devoid follows it, and additionally writes to a temporary path and moves on success — so a crashed or cancelled job leaves nothing behind. Without that, a partial file survives and the *next* run skips past it by writing `_v2`, silently accumulating garbage.

**Every control is tri-state.** `--auto` applies its recommendation **only where an option was left at its default**. If the UI sends every flag on every run, `--auto` silently becomes a no-op and the tool stops thinking. Every control therefore reads `auto · <value>` until it is deliberately taken over. This is forced by the engine, and it doubles as the best affordance in the app: the inspector is a live readout of the tool's own reasoning.

**Advice always ships with an undo.** The app may suggest ("the erosion ate a thin stroke — try 1?"), because a suggestion with a one-click revert of exactly what it changed costs nothing when wrong. A suggestion without one does not ship.

## The shape: there is no mode

**The strip is the app.** Nothing selected and it fills the space as a contact sheet; select one and it opens while the rest stay along the edge; panels are drawers summoned at the edge and opened beside what they affect. **Selection is the only state**, which is what makes density need no *structural* policy — one asset, twelve and two hundred are the same LAYOUT. ⚠️ **SIZE is a separate question with its own policy**, and it now has two axes (2026-09-07 14:25 EDT): three tile buckets by count (**365 / 282 / 154px** measured), and, in a crowd, whether the demanding tiles span two columns at all — they do only while they are a minority (`2 × demanding < settled`), because a landmark every tile carries is not a landmark and doubles the scroll.

⚠️ **It does need a SIZING policy, and this sentence used to deny it (2026-09-07 12:02 EDT).** Measured: the tile was **262px at 8, 20, 60 and 200 assets**. Harkirat's reframe was the correction — *"the question isn't 'does it look right', the question is 'how can it be improved to work in all situations regardless of sheet size?'"* Three buckets now (365 / 282 / 147px) and, past forty, the demanding states keep two columns so the one that needs you is findable by shape. The structure is unchanged; only the scale responds.

This replaced a two-lane Board/Bench design that had already been approved. It failed a simple test: the coin-flip refusal fires on 10.2% of assets and the fade on 2.6%, so a dedicated lane served about one item per batch, while review — which every asset needs, every time — had no home of its own.

**The drawers are reachable, never required.** It must stay possible to drop files, answer, and save without opening one. If that stops being true, the disclosure has failed and the app has become a 63-control form.

## The core interaction: show both answers, ask which is right

The engine asks *"is this enclosed interior design, or background showing through?"* — an analyst's question about authorial intent. **The app should ask an owner's question instead.**

The two answers differ by one flag, and a 1-frame preview is measured visually identical to an 8-bit-alpha render — 11 differing pixels of 409,600 at a max delta of 3. So render both and let the person **drag a seam between them**. That is a strictly easier judgement, and a measurably more accurate one: the skill's own history records a dog-tag icon where the region "looked plausible", `suggested_command` protected two chain-holes the user wanted removed, and **nobody looking at the two renders would have picked the wrong one.**

It generalises to every flag with a visible consequence — erosion, feather band, fade recovery, dither mode. **That is what dissolves the tension between "usable by someone unacquainted" and "expose many more options": options presented as outcomes to choose between need no learning at all.** Most of the engine's flags do not need hiding or progressive disclosure. They need rendering.

## Everything animates, and that is functional

These are animated images. The defect classes this project actually records — dither crawl on every edge, flicker localised to specific rotation phases — are **only visible in motion**. An interface for animated images built out of still frames cannot show its own subject's bugs. Contact-sheet frames play, the open asset plays, both sides of the seam play.

## It was also a labelling instrument, and that idea is retired

⚠️ **Removed 2026-09-07 10:56 EDT, on Harkirat's call:** *"drop the labels from the app. it's just adding friction and the repo has its own corpus that i supply it anyway."*

The argument was that every answer is a labelled data point for the question the engine refuses, captured for the cost of one appended line, and that the engine repo holds **981** classified labels for `edge_hardness` and **zero** for the protection decision.

**What the argument missed is whose problem it was.** Devoid never read the log; the engine repo did. Labelled data there is supplied deliberately, and a corpus accumulated as a byproduct of a flow designed to be quick is friction charged to the wrong person. The file and its history stay in the repo — `labels/README.md` — and the engine repo's pointer to it needs correcting.

## Measured facts that shape the build

- On an M1 Pro, a 144-frame 640×640 asset: `--recommend` ≈ 18s, `--auto` ≈ 60s, `--verify` ≈ 30s.
- `analyze()` is single-threaded and CPU-bound, peaking at **488 MB RSS**. Concurrency must come from `machine.default_jobs()` in the skill's harness — measured at **6** on this machine (6 performance cores; memory would allow 8) — not from `os.cpu_count()`, which reports 8 and includes efficiency cores.
- **A 1-frame preview is visually identical to the full render for an 8-bit-alpha format, but not literally identical.** Reproduce with `scripts/measure_preview_fidelity.py` (no arguments — the asset is named in the script). On frame 62 of a 144-frame 640×640 asset:

| render | differing alpha px | max delta | what it is |
|---|---|---|---|
| explicit flags → WebP | 11 / 409,600 (0.003%) | **3** of 255 | eleven pixels ~1% off in opacity — invisible |
| explicit flags → GIF | 8 / 409,600 (0.002%) | **255** | eight pixels fully flipped, by the shared palette and Bayer dither |
| `--auto` → GIF | 154 / 409,600 (0.038%) | 255 | the above, plus the calibration below |

⚠️ **An earlier version of this document claimed "0 differing pixels — pixel-exact". That was wrong**, and it was unfalsifiable because the script did not name the asset it had been run on. The corrected claim still supports the design — a max delta of 3 on the WebP path is not visible — but the GIF path's max delta of 255 means whole pixels flip, so **a GIF preview must say that dithering will differ.**
- Under `--auto`, erosion calibration measures a **different curve** from one frame than from the whole asset — 0:0.5571, 1:0.0303 against 0:0.6151, 1:0.0382 — and both land on level 1. That is luck, not a guarantee. **The preview inherits the calibration rather than re-deriving it.**
- Runtime dependencies: Python with Pillow, numpy and scipy; the external binaries `gifsicle`, `pngquant` and `webpmux`; and AVIF support. ⚠️ **AVIF is a capability, not a package** — Pillow 12.3 ships it natively and `pillow-avif-plugin` is obsolete here. Test `PIL.features.check('avif')`, **on the interpreter the server actually runs**, not on `python3`.
- Browser-only execution (Pyodide/WASM) is impossible, not merely hard — scipy exists there, but gifsicle, webpmux and pillow-avif do not.
- Hosted execution on a small box was rejected on measured grounds: on claude.ai's single-CPU sandbox, `--target-kb` (a 120-rung grid re-encoding every frame) could not finish inside a tool call and `--verify` exceeded two minutes.

## Architecture, decided

**A local HTTP server plus a web UI, inside Electron from the start** *(revised 2026-09-04; the earlier plan was a `.app` shim first)*. All filesystem access lives on the server side — no File System Access API, no browser-only storage for anything that matters.

⚠️ **The shim-then-Electron sequence was presented as costless and was not.** A browser cannot hand the server a filesystem *path*, only bytes or a typed string, so a shim stage would have uploaded multi-megabyte files into a staging directory — making the skill's "beside the source" output convention meaningless — or asked for a pasted path, which is the CLI experience this exists to escape. Electron's main process owns real paths, native dialogs and Finder drag-drop.

**Hybrid engine boundary.** Rendering runs as a **subprocess**, because the work is long and a crash in scipy should cost one job rather than the app. Analysis runs **in-process**, because the reuse win is largest there — the result is computed once and passed forward instead of `--recommend`, `--auto` and `--verify` each re-deriving it.

**The flag surface is generated, not transcribed.** A `build_parser()` factory added to the skill lets Devoid introspect argparse for every option's type, choices, default and help text. This is the one change to the skill the project asks for, and it converts a 63-item hand-maintained UI into one that cannot drift when a flag is added or renamed.

## Operating Context

*Captured by `impeccable init` 2026-09-06 20:42 EDT. Three real scenes, confirmed; a fourth was offered and declined.*

**One asset, mid-task.** Something else is the actual work — a server, a bot, a page — and an asset needs its background gone. Devoid is an interruption to be ended quickly, not a place to sit. ⚠️ This is the scene that makes the open view's time-to-answer the metric, and it is the one a batch-oriented design would quietly punish.

**A deliberate batch, in one sitting.** Assets are collected and processed together as their own task. The contact sheet is the primary surface here and throughput outranks any single decision.

**Testing the engine's own changes.** The seam and the ledger are a diff viewer for `gif-background-remover`: change the skill, run an asset through, see what moved. Devoid is a development instrument, not only a utility — which is why the ledger's two-sided figures and the answer-pair preview are load-bearing rather than decorative.

⚠️ **Labelling is NOT an ongoing workflow.** It was offered as a fourth scene and declined. `labels/protection.jsonl` remains real evidence and the autonomy goal below still stands, but the log is a **byproduct of answering**, not a task anyone sits down to do. Nothing may be designed around a labelling session that does not happen.

## Brand Commitments

*Captured 2026-09-06 20:42 EDT.*

**Binding — no later command may replace these:** the name **DEVOID**; the supplied wordmark artwork (`web/assets/wordmark.png` and `wordmark-emitting.png`, the O drawn as an accretion disk, built by `scripts/make_wordmark.py`); and the **void world** `docs/DESIGN.md` records. Refinement inside that world is welcome; replacement is not.

⚠️ **Everything else is explicitly open to challenge.** Asked what was binding, the answer selected the three above *and* "argue with all of it". The two are recorded as given rather than reconciled into one: the world is fenced, and the two-colour rule, the copy stance and every other convention are fair game for the evaluation tier to attack — with the ordinary requirement that a proposal is approved before it lands. ⚠️ **`CLAUDE.md`'s project rules still bind the CODE** regardless; this section governs what a design command may *propose*, not what may be merged without review.

## Evidence on Hand

Real, and measured — every number here has a script or a corpus behind it.

| evidence | where |
|---|---|
| 304 real assets behind the refusal rates (12.8% interrupt, 10.2% protection-only, 2.6% fade-only) | the engine repo's harness |
| 8 real processed corpus assets, deliberately not synthetic icons | `web/assets/` |
| 981 classified `edge_hardness` labels; **zero** protection labels | the engine repo; `labels/protection.jsonl` here |
| Contrast, greyscale, coordinate, frame-timing and preview-fidelity measurements | `scripts/check_contrast.py`, `check_greyscale.py`, `measure_ledger.py`, `measure_preview_fidelity.py`, `dump_frame_timing.py` |
| Ten captured states of the real window | `local/window-shots/`, written by `scripts/capture-window.mjs` |

⚠️ **Absences future work must not fabricate.** There are **no users other than Harkirat**, no testimonials, no customers, no pricing, no benchmarks against competing tools, and no telemetry. The app has never been run by anyone else. Any claim of adoption, satisfaction or comparative performance would be invented.

## Product Principles

1. **The question is visual; delivering it as text is the failure.** A hex string and a bbox array is precisely what this product exists to abolish.
2. **Never report a verification the run did not earn.** `not-checked` is a first-class state with the same visual weight as done and failed.
3. **Every control is tri-state, so `--auto` keeps thinking.** A UI that sends every flag turns the engine's own reasoning off; absent means auto, and only a deliberate takeover is sent.
4. **Every number is cited from a measurement, or it does not ship.** A plausible-sounding default is the exact failure this project was built against.
5. **Advice ships with an undo of exactly what it changed** — including the answer itself, which is the most consequential decision in the app.

## Accessibility & Inclusion

**No external requirement, and none claimed.** Contrast in both lighting states, visible focus, 24px+ hit targets, a greyscale rule that no state may break, keyboard reach on every control and a `prefers-reduced-motion` path are **self-imposed rigour** — a quality commitment, recorded here so a later command knows it is a standard that was chosen and may not be quietly dropped, not a need it may claim to serve.

⚠️ Two of these are runnable and wired: `npm run check:contrast` and `npm run check:greyscale`.

## What this is not

Not a general background remover. The engine is chroma-key removal against a flat, keyable background — a photograph is out of scope, and static-image support means a one-frame *design*, not subject segmentation.

Not a replacement for the skill. If the two ever disagree, the skill is right.

Not a shared or hosted service. It runs on this machine, against local files, with the Mac awake.

⚠️ **And a cheaper product exists that was never costed against this one.** A self-contained HTML review page emitted by the *skill itself* — one file, no packaging, opens anywhere, and works inside claude.ai sessions, which is where this skill actually gets used most. It captures most of the verification value for a fraction of the effort. **It cannot draw regions**, and the region canvas is the one thing no CLI and no static page can offer. That is Devoid's genuinely non-substitutable reason to exist, and it is narrower than "a nicer front end".

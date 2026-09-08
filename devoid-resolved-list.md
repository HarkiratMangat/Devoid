# ✅ Devoid — resolved list

The archive for `devoid-deferred-list.md`. Created 2026-09-05 00:07 EDT alongside it, so the conservation rule has a destination from day one rather than being invented the first time an item closes.

## The rules

1. **One item removed from `devoid-deferred-list.md` MUST equal one item added here.** Never delete an item; move it.
2. **Keep the original wording.** Add the outcome above or below it — do not rewrite the filing to match what turned out to be true. The gap between the two is the most useful thing in this file.
3. **Record what was falsified**, not only what was fixed. An item closed because its premise was wrong is worth more than one closed because the code changed.
4. **Cite where it closed** — branch, commit, and version — so the changelog entry and this entry point at each other.

Heading shape, matching the engine repo's archive:

```
## ✅ <the item's original title> — CLOSED YYYY-MM-DD (branch `x`, commit `sha`, vX.Y.Z)
```

---

### ✅ `[P1 · M · Opus5-High]` The region mark was a BOUNDING BOX where it should be the disputed pixels — CLOSED 2026-09-08 (branch `fix/honest-question-and-engine-path`, v1.2.0)

### `[P1 · M · Opus5-High]` The region mark is a BOUNDING BOX where it should be the disputed pixels *(filed 2026-09-07 23:39 EDT)*

`web/app.js:578-586` reads `r.bbox_xyxy` and sets `left/top/width/height` — an axis-aligned rectangle. The disputed region in the corpus's megaphone is a **diagonal white band** inside the cone, so the rectangle covers the band, the yellow bar beside it, the navy outlines and a corner of background, **and still clips the band's ends**.

Harkirat, looking at the shipped capture: *"what is it even highlighting and asking? the white band inside the megaphone? then why is it a vertical rectangle? why is it also highlighting parts of the background and the yellow and the outlines? why doesn't it fully shade/cover the entire white band?"* Every one of those has the same answer — it is a bbox, not a shape.

🔴 **THIS IS THE PRODUCT'S CENTRAL CLAIM, HALF-DELIVERED.** `docs/PRODUCT.md`: *"the question is visual; delivering it as text is the failure."* Devoid moved the bounding box out of prose and onto the artwork, which is real progress, and then stopped — a rectangle over the wrong pixels is a third state: visual, and still not the question.

**Concrete next action, and the data is already there.** The dispute is defined **by colour** (`outline_color`), and the app already answers per colour and never per region — so the correct mark is *the pixels inside that bbox that match the colour*. `web/wipe.js` already decodes frames to canvas and composes them; a per-pixel colour test on one decoded frame is the whole feature. Draw it as a mask (a canvas overlay, or an SVG path from a marching-squares trace) instead of a `div`.

⚠️ **THE README SCREENSHOT MUST BE RE-CAPTURED AND SWAPPED WHEN THIS LANDS.** `docs/shots/the-question.webp` is the hero of the README and it shows the bbox. Shipping it now is deliberate — Harkirat: *"ship the screenshot as is. document it in deferred list that the screenshot needs recapturing/swap after the feature is correctly built."* The capture is `scripts/capture-window.mjs`'s `02-open-question`, cropped to 1930x800 at +420+230. ⚠️ The claim *"instead of a hex code **and a bounding box**"* was removed from the README in the same pass, because that half was contradicted by its own picture; it goes back when the mark is real.

**Outcome.** `web/regionmask.js` (new) tests every pixel inside the bbox against the group's `outline_color` (max-channel distance ≤ 20 — the same unmeasured default `server/render.py`'s `_ledger` already uses for the same kind of comparison) and paints an alpha-only PNG used as a CSS `mask-image` on the existing `.qregion:before` hatch. **The seam-clip mechanism is untouched** — `clip-path` still does the seam split, `mask-image` now additionally shapes the fill to the actual disputed pixels, so the P0 regression this app already carries ("the fill's clip must MOVE when the seam moves") could not regress by construction.

🔴 **THE FIRST IMPLEMENTATION SHIPPED SILENTLY BROKEN, AND ONLY A NEW FALSIFIER CAUGHT IT.** `web/app.js:2188` did a plain `window.Devoid = { ... }` — an unguarded object-literal reassignment, one script tag *after* `regionmask.js` had attached `window.Devoid.regionMask`. Every existing gate assertion still passed (the `.qregion` node existed, its border-box geometry was correct, the clip-path still moved with the seam) because none of them checked whether the MASK itself was real. Six diagnostic probes — fetch status, content-type, byte-for-byte content, manual eval of the fetched source, `performance` resource-timing, and finally `Object.keys(window.Devoid)` — were needed before `rg -n "Devoid =" web/*.js` found the one-line clobber directly. Fixed to `Object.assign(window.Devoid || {}, {...})`, matching the "extend, never clobber" convention `web/wipe.js`'s own export comment already states. `scripts/capture-window.mjs` now asserts `getComputedStyle(m, ':before').maskImage` resolves to a real `url(...)`, not `none` — the falsifier this defect needed and did not have.

The README screenshot swap and the restored "hex code and a bounding box" claim both landed in this branch too.

### ✅ `[P2 · S · Sonnet5-High]` The seam was offered on a provisional threshold, and nothing said so — CLOSED 2026-09-08 (branch `fix/honest-question-and-engine-path`, v1.2.0)

### `[P2 · S · Sonnet5-High]` The seam is offered on a provisional threshold, and nothing says so *(filed 2026-09-07 20:58 EDT)*

`server/preview.py:57` sets `SEAM_THRESHOLD = 0.02` under a comment reading **"⚠️ Provisional threshold"**. It decides `seam_useful`, which decides whether the person is offered the app's headline interaction or the question card instead. **A provisional constant silently choosing the interaction is the same defect as a provisional number silently choosing a verdict** — and this repo's founding rule is about the second.

⚠️ **Its failure mode has already been observed in this repo.** When it wrongly returns true you get a seam whose two sides look identical — which is exactly what `09-seam.webp` showed, and why that screenshot was removed from the README tonight.

**Concrete next action:** derive it against the corpus the way `preview.py:49-51` derived the 0.003 companion, or surface it — if the app is unsure the two answers differ, say so rather than presenting a seam as though it does.

**Outcome.** Verified rather than re-derived: traced `loadPair` → `fetchPair` in the code graph and confirmed `web/wipe.js` never reads the `seam_useful` field the fetched payload carries — it computes its own client-side conspicuity gate entirely independently. The filing's worry (a provisional constant silently choosing what the person sees) does not hold today; there is no live consumer for it to mislead. `server/preview.py`'s docstring is tightened to say this was checked, not just asserted, and to ask that this be re-verified before `seam_useful` is ever wired into something new.

### ✅ `[P1 · S · Sonnet5-High]` `09-seam.webp` did not show a seam doing anything — CLOSED 2026-09-08 (branch `fix/honest-question-and-engine-path`, v1.2.0)

### `[P1 · S · Sonnet5-High]` `09-seam.webp` does not show a seam doing anything *(filed 2026-09-07 20:28 EDT)*

The capture is of the seam view, and **both sides of the divider look identical** — the one thing a seam exists to show, two different renders of the same file, is not visible in the shot of the seam. The dashed divider is a 1px line on a dark ground. It was in the README for a day captioned *"a draggable wipe divider between two renders of the same asset"*, which the picture did not support.

**Found by looking at it.** Four README screenshots had been described from their alt text and filenames through several passes; opening them showed that **three of the four were the same screen** — the megaphone open view with a different right rail — and a reader could not tell them apart. Harkirat: *"wtf do those screenshots even show? I'm SOO confused looking at them, AND IM LITERALLY THE MAIN USER."*

**Removed from the README** rather than left with a caption it cannot support. **Concrete next action:** in `scripts/capture-window.mjs`, drag the seam to roughly 40% before `shot('09-seam')` and pick an asset whose two answers differ visibly, then crop to the divider. The other three are now crops (`the-question`, `needs-you`, `verdict`, `not-checked`) and read at a glance.

**Outcome.** Recaptured as part of the same `gate:ui` run that verified the pixel-mask fix above — the megaphone's `protection` question already gives the two sides of the seam a real, measured pixel difference (12,502 differing alpha px across the sampled frames, per `server/preview.py`'s own derivation), so no new asset or gate change was needed, only the mask fix that made the disputed region itself legible in the shot.

### ✅ `[P1 · S · Opus5-High]` A packaged app could not be pointed at a different engine — CLOSED 2026-09-08 (branch `fix/honest-question-and-engine-path`, v1.2.0)

### `[P1 · S · Opus5-High]` A packaged app cannot be pointed at a different engine *(filed 2026-09-07 16:26 EDT)*

Both documented overrides fail once the app is a `.app` rather than a checkout. **`$DEVOID_SKILL` never reaches an app launched from Finder or the Dock** — a GUI process does not inherit a shell environment. And `devoid.config.json` is looked up at `REPO_ROOT`, which `main.js:21` points at `process.resourcesPath` when packaged: **inside the bundle**, where writing breaks the signature and the next install wipes it.

So a packaged Devoid can only ever find the engine at the hardcoded fallback. The README documents `launchctl setenv DEVOID_SKILL <path>` as the workaround, which works, and is not something a user should have to know.

**Concrete next action:** look for `devoid.config.json` in `~/Library/Application Support/Devoid/` before the bundle-relative path — the directory the app already owns and already writes to. One `or` in `resolve_skill()`, plus the same lookup in the dialog's detail text so the message names a path the user can actually create.

**Outcome.** `server/engine.py`'s `resolve_skill()` now checks `devoid.config.json` under `$DEVOID_DATA_DIR` — `~/Library/Application Support/Devoid` when packaged, set by `main.js` already — before the `REPO_ROOT`-relative copy. That is the one directory a packaged, signed app is already allowed to write to; the bundle-relative config stays checked next, for a from-source run. The final "no engine anywhere" error message now names both paths it tried. `tests/test_engine_config_path.py` (new) covers a config found, a config with no `skill_path`, unreadable JSON, a `skill_path` pointing at nothing, and the unset-env case being a true no-op.

---

### ✅ `[P1 · M]` Bundle the engine — and the update-check bug it uncovered *(resolved 2026-09-07 21:33 EDT)*

Every document said the engine is *"deliberately not bundled: a copy inside the app would drift from the original in silence."* Harkirat: *"is so stupid for an app that literally uses the engine as its CORE. Apps and tools ship with drifted engines and libraries ALL the time, that's literally what the update system is for."*

**He is right, and the numbers make it worse than a weak argument.**

| the piece | the number |
|---|---|
| the engine | **one 636 KB Python file**, imported with `importlib.util.spec_from_file_location` |
| its third-party imports | `numpy`, `PIL`, `scipy` — **all three already ship inside Devoid's bundle**, at 36 + 14 + 99 MB |
| the disk image | **~170 MB**, of which 149 MB is the engine's own dependencies |
| `references/lessons.md` mentions in the engine | all **comments**. Nothing is read from its repository at runtime |

**So the app already ships 149 MB of the engine's dependencies and refuses to ship the 636 KB engine.**

⚠️ **And the stated reason is backwards.** Not bundling does not prevent drift, it *guarantees* it: the user has whatever they happened to clone, which is how the v6.3.3-floor-versus-v6.3.0-release trap existed. A bundled copy has a known version, and `checkForUpdates` — built the same evening — is the mechanism for telling them a newer one exists. **The argument against bundling was an argument for the feature the app already h

**Outcome.** `scripts/prepack-engine.mjs` copies the engine and **both** LGPL texts into `build/engine/` before every `dist`, and **fails the build** if the engine or either licence is missing — a build that silently ships no engine produces a `.dmg` that cannot do the one thing it is for. `electron-builder.yml` ships it to `Resources/engine`; `server/engine.py` takes it as the **last** candidate, after `$DEVOID_SKILL`, `devoid.config.json` and the documented path, so a developer testing an engine change never rebuilds Devoid.

🔴 **AND IT FOUND A LIVE BUG IN THE UPDATE CHECK SHIPPED THE SAME EVENING.** `engine_version()` returns a **content hash** — `sha256:0ffc8a71b8b5` — and `checkForUpdates` was handing that to `compareVersions`, which parses it as **0.0.0**. Every check therefore reported the engine **behind** and offered an update that was already installed, once a day, forever.

⚠️ **The live check that was supposed to prove that path worked passed a hand-typed `'6.4.1'`** instead of reading what the app reports. **A test given a fabricated input tests the fabrication.** `engine_semver()` now derives a real version from `git describe --tags` in the resolved script's repository, falling back to the `VERSION` file written beside the bundled copy, and returns **None** rather than junk — junk is exactly how a hash became 0.0.0. `tests/test_engine_bundle.py` has seven cases; the one that matters asserts the hash does **not** parse as a number.


### ✅ `tests/port-probe.test.js` was wired to nothing *(resolved 2026-09-07 21:03 EDT)*

Five cases, 3.2 KB, referenced by no npm script and by no other file. `npm test` chains twelve commands and this is not one of them, so the port probe's own tests have never run in the suite that certifies a release. ⚠️ **A test nobody runs is worse than no test** — it reads as coverage in a directory listing.

**Concrete next action:** add it to `test:coords`'s neighbours as its own script and into the `test` chain, then confirm it actually passes before assuming it does; it may have rotted.

**Outcome.** Wired as `npm run test:ports`, between `test:deps` and `test:prefs`. It passes as written and it is a better test than its filing suggested: it does not copy the probe, it **reads `main.js` and evaluates `isPortFree` and `findFreePort` out of it verbatim**, so a change to the shipped code changes what is tested. It also asserts the slice stays under 60 lines, which is a guard against the probe growing into something the test silently stops covering.


### ✅ `[P2 · S · Sonnet5-High]` An engine updater has nowhere to read from *(filed and closed 2026-09-07 19:18 EDT — THE PREMISE WAS FALSE)*

Harkirat asked for *"the option to update the engine based on the gif repo's release page"*. **Not built, deliberately.** `HarkiratMangat/gif-background-remover` is private and publishes **no GitHub releases** — that is a standing decision in that repo, not a temporary state — so an anonymous check gets a 404 that GitHub returns identically for *private* and *nothing published*. The menu item could only ever say "nothing to show". Same test that keeps Squirrel.Mac out of this app: never ship a path that fails at runtime.

**What shipped instead:** `reviewEngine()` compares the engine on disk against `ENGINE_FLOOR` (v6.3.3) at launch, offline, and says so when it is older.

**What would unblock this:** the engine repo publishing releases, or Devoid reading its `version-history.md` / git tags from a local checkout — which it already has a path to, since the engine is resolved from disk. The local-checkout route needs no network and is probably the better feature.

**Outcome — the item should never have been filed.** Harkirat asked one question — *"huh? no?"* with the releases URL — and both premises failed on the first command. `gh repo view` reports `isPrivate: false`. `gh release list` returns **nine** releases. The false belief came from a handoff note recording that the **v6.4.0 merge** shipped no release: true of one merge, carried forward as a property of the repository, with "private" asserted on top and never checked.

**Built instead of filed:** `checkEngineUpdate()` in `main.js`, `updateVerdict()` in `lib/deps.js`, four falsifiers. The verdict that matters is **`ahead`** — the engine's newest release is v6.3.0 while its newest tag is v6.4.1, so a boolean check would have offered a downgrade to every current user.

⚠️ **Keep this row.** The lesson is not the missing feature, it is that the refusal was argued from this repo's own correct principle (*never ship a path that fails at runtime*) applied to a fact nobody had verified — which reads as rigour and is not.


### ✅ `[P1 · S · Sonnet5-High]` A missing engine is a 503 on the first render *(resolved 2026-09-07 18:59 EDT)*

`README.md` and `docs/DEVELOPMENT.md` both said a missing engine surfaces as a launch dialog naming the three places Devoid looked. **No such dialog exists.** Every `dialog.*` call in `main.js` is the Python path, Check for Updates, port exhaustion or a server restart; none mentions the engine.

What actually happens: `server/engine.py:86` raises `EngineUnavailable` with a message that does name all three paths, `main.js:347` prints it to **stdout**, and `web/app.js:1320` reads `/api/engine/status` for `engine_version` alone and never renders the `missing` array. The user gets a normal-looking window and a 503 banner the first time they add a file.

Both documents were corrected to describe what happens rather than what was intended. **Concrete next action:** probe `/api/engine/status` at startup and show the same dialog shape the Python check already uses, with the three paths in the detail. The message text exists; only the surface is missing.

**Outcome.** `reviewEngine()` in `main.js` reads `/api/engine/status` after the server answers and shows a dialog carrying `EngineUnavailable`'s own message, which already named all three paths. The same pass added a dialog for an engine below the v6.3.3 floor and an install offer for the three missing binaries — none of which had any surface at all. `lib/deps.js` holds the verdict logic and `tests/test_deps.test.js` falsifies it: the test that matters asserts **absent and degraded are different sentences**, because collapsing them to a boolean is what made the console line useless.


## Closed items

## ✅ The engine repo needs its LGPLv3 licence — CLOSED 2026-09-07 16:45 EDT (engine branch `docs/lgpl-licence`, merged `75a1b11`, tagged **v6.4.1**)

**What happened.** Both texts, because LGPLv3 is a set of additional permissions on top of GPLv3 and the FSF's own instructions call for `COPYING` and `COPYING.LESSER` together. **Both are packaged into the `.skill`**, which is the part that was not obvious: the package is what gets distributed, and a distribution without its licence text is exactly the defect fixed on this side the same day, where five `.woff2` files were shipping inside the disk image with no OFL 1.1 anywhere in the repository. The archive went from 6 members to 8, diffed against v6.4.0 to prove it added exactly those two and lost nothing, and `gate_package.py` passes.

⚠️ **One claim in that branch was false and was corrected in place.** The comment on `audit_docs.py`'s `packaged` set said the entry is what lets `SKILL.md` point at `COPYING`. Reverting the set and re-running showed the pointer check passes anyway — it matches names **with an extension**, so `gif-deferred-list.md` is caught and an extensionless `COPYING` is invisible to it. The set stays corrected because it should be true; the gap is filed there as `[P2 · XS]`.

**Original entry, struck through:**

> ~~### `[P2 · S · Sonnet5-Med]` The engine repo needs its LGPLv3 licence *(filed 2026-09-07 16:26 EDT)*~~
>
> ~~Harkirat's call, 2026-09-07 16:26 EDT: **the app is GPLv3 and the engine is LGPLv3**, so the engine can be used by anything while improvements to the engine itself come back. Devoid's `LICENSE` is in place. The engine repo has none, and adding one there is a change in that repository with its own branch, PR and version — a *minor* bump by its own bars, since nothing about what the tool does changes.~~
>
> ~~⚠️ **The engine is already tagged v6.4.0 without a licence**, so the licence lands on a later tag rather than retroactively.~~
>
> ~~**Concrete next action:** branch in `/Applications/Claude Code/Gif-Background-Remover`, add `LICENSE` (LGPL-3.0-or-later needs BOTH `COPYING` and `COPYING.LESSER` by the FSF's own instructions, since LGPLv3 is a set of additional permissions on top of GPLv3), and say so in `SKILL.md` and `README.md`. Push and merge are asked separately, there as here.~~
>
>
> ~~**Empty as of 2026-09-07 14:21 EDT.** The last three closed together on `feat/devoid-v1`: the second full analysis per render (measured at **2** engine `analyze()` calls, not one, and now **0**), the density rule's three unseen edges, and the engine repo's stale pointer at this repo's label log. All three are in `devoid-resolved-list.md` with their outcomes. ⚠️ **An empty section is not a finished project** — the ✅ and 🔔 sections below carry standing decisions and cross-repo watches that are still live.~~


## ✅ Every render pays for a second full analysis the app already ran — CLOSED 2026-09-07 14:21 EDT (branch `feat/devoid-v1`; engine branch `feat/analysis-reuse-across-processes`, commit `63447a4`)

**What happened, and the filing understated it.** The item said the engine recomputes ONE analysis per render. Measured on `galaxy.gif` (743 KB, 8 frames) by wrapping the engine's own `analyze()` and counting real calls under Devoid's exact render argv: **two**. Pass 1's `recommend()` and pass 3's `verify()`, 2.80s and 2.93s of a 10.15s run — **56%**, not the 39–47% filed.

| run | `analyze()` | wall |
|---|---|---|
| before | **2** | 9.84s |
| engine parameter only | **1** | 7.93s |
| parameter + Devoid's handoff | **0** | 4.28s |

Output sha `354fcb04b142` identical across all three.

**The fix Harkirat approved, after the one I proposed was falsified.** I recommended wiring the engine's existing `scripts/harness/analysis_cache.py` into the product — it already implements the fingerprint-and-fall-back mechanism. He asked whether the repo had already considered caching. It had: `references/lessons.md` §24 forbids disk-cache behaviour in the shipped skill (the deployment sandbox is ephemeral and 1-core), `scripts/audit_docs.py` **rejects** a packaged file that even points at `scripts/harness/`, and a module-level memo sits on that repo's "Rejected, with evidence — do not re-derive" table. ⚠️ **The recommendation would have shipped a change the target repo forbids in two independent places, and the check that caught it was one question.**

**What landed instead:** the engine gained `--analysis-json <path>` — Task 1's parameter carried across a process boundary, writing nothing the caller did not name — plus the engine's own filed Task 1 (`verify(input_analysis=)`). Devoid writes the analysis it already holds after `/analyze` and passes the path at render time. `server/engine.py` asks the ENGINE'S PARSER whether the flag exists rather than assuming, so an older engine simply gets no flag. `tests/test_analysis_handoff.py`, 11 tests. ⚠️ **Two of them were vacuous on the first pass and are recorded in `docs/DEVLOG.md`**: one compared a function with itself, and one never reached the branch it named.

**Original entry, struck through:**

> ~~### `[P1 · S · Sonnet5-High]` Every render pays for a second full analysis the app already ran *(filed 2026-09-05)*~~
>
> ~~`server/render.py:143` builds every render argv through `cli.build_argv(..., auto=True)`, which always emits `--auto`. `--auto`'s pass 1 is `recommend()`, which is the same analysis `POST /api/assets/{id}/analyze` already ran and stored on the asset. **So the engine recomputes, per render, an answer Devoid is holding in memory** — measured in the engine repo at 39–47% of a run's cost, ~18s on a corpus asset here.~~
>
> ~~⛔ **Do not fix this by dropping `--auto`.** `--auto` is what makes the tri-state controls mean anything — `CLAUDE.md`'s rule is that a UI which sends all 63 flags turns `--auto` into a no-op and the tool stops thinking. The saving has to come from the engine accepting a precomputed analysis, not from the app declining to ask for one.~~
>
> ~~**Cross-repo:** the engine-side item is `[P1 · S · Opus5-High]` "`--auto` recomputes pass 1's analysis in pass 3" in `gif-deferred-list.md`, with a ready-to-build plan (`docs/plans/2026-09-01-analysis-cost-and-observability.md` Task 1). That fix is internal to one process; **this item is the cross-process version of it and needs its own surface** — most likely `--auto --analysis-json <path>`, symmetrical with the `--verify-json` already filed there.~~
>
> ~~## ✅ Considered and NOT fixed — a real decision, not an oversight~~

## ✅ The density rule has three edges nobody has seen — CLOSED 2026-09-07 14:21 EDT (branch `feat/devoid-v1`)

**What happened.** All three decided, built and asserted; `npm run gate:ui` carries four new checks.

| edge | decision | measured |
|---|---|---|
| a crowd where NOTHING needs you | no landmark, and `data-demand="none"` says so — the commonest end state has nothing to find, and a focal point there would point at nothing | 60 tiles, **one** width, 154px |
| a crowd where EVERYTHING needs you | the span is dropped and every tile shrinks equally. The threshold is DERIVED, not picked: a spanning tile holds 2 cells and a settled one holds 1, so spanning tiles hold under half the grid exactly while `2 × demanding < settled` | 19 demanding → **325/154px**; 20 → **154/154px** |
| the 40/41 flip mid-drop | the bucket is a property of the finished batch, so it waits for one. A growth of ≤4 restarts a 700ms settle window; a bulk arrival re-buckets at once, because one change is not a flicker | 40 → `many`, +1 → `many` (held), after the window → `crowd` |

⚠️ **And the gate that was going to prove it was itself broken.** Its `pad()` set `state: 'needs-you'` on a cloned asset — and `stateOf()` never reads `a.state` for that verdict; it derives it from `outstanding(a)`. The existing crowd assertion passed anyway, because the clones cycle the real corpus and one real asset genuinely has unanswered colour groups. **A check that has been green for a day was passing by accident of the corpus.** Both probes now build from two real templates, and a new check fails if the corpus stops supplying one.

**Original entry, struck through:**

> ~~### `[P2 · S · Opus5-Med]` The density rule has three edges nobody has seen *(filed 2026-09-07, from the deep pass that followed building it)*~~
>
> ~~The rule ships and is asserted at 4, 20 and 60 assets with **exactly one** `needs-you` tile. All three assertions test its happy path. ⚠️ **Falsifying the CHECK is not testing the RULE's edges** — breaking the CSS makes the gate go red, which proves the gate works and says nothing about these:~~
>
> ~~1. **A crowd where NOTHING needs you.** Two hundred settled assets: every tile 147px, no span, no landmark. The rule's whole justification is findability and in the commonest end state it provides none. That may be correct — nothing needs finding — but it is undecided rather than decided.~~ ~~2. **A crowd where EVERYTHING needs you.** Two hundred `needs-you` tiles all spanning two columns degenerates to a uniform grid at double size, which is *worse* than uniform 147px because it doubles the scroll. Nothing caps the span.~~ ~~3. **The 40/41 boundary, mid-drop.** One arriving asset flips every tile from 282px to 147px — a 48% jump while the person is watching. Assets arrive one at a time from a drop, and `07-arrival` captures 12, nowhere near it.~~
>
> ~~**Concrete next action:** decide each one before writing CSS — a floor on the span count, a different landmark when the crowd is uniform, and whether the bucket change should be animated or deferred until the drop settles. Then extend the gate: it currently seeds one demanding tile, so give it a zero-demanding and an all-demanding case.~~

## ✅ The engine repo's pointer to this one is wrong, and only Devoid knows — CLOSED 2026-09-07 14:21 EDT (engine branch `feat/analysis-reuse-across-processes`, commit `63447a4`)

**What happened.** Corrected in the engine repo, on a branch there, with the gap filed in that repo's own tracker so it is visible from inside it. `scripts/harness/labels/README.md` now says plainly that nothing collects protection labels, why (the writer was removed at Harkirat's instruction on 2026-09-07), and what the honest count is — zero, against 981 `edge_hardness` judgements. The follow-on decision — whether that corpus is worth collecting at all — is filed there as `[P2 · S]`, because that repo is what would consume it. Push and merge there are asked separately, as here.

**Original entry, struck through:**

> ~~### `[P2 · XS · Sonnet5-Med]` The engine repo's pointer to this one is wrong, and only Devoid knows *(filed 2026-09-07)*~~
>
> ~~`scripts/harness/labels/README.md` in `/Applications/Claude Code/Gif-Background-Remover` says Devoid *"records every answer as a labelled row"* at `labels/protection.jsonl`. **That stopped being true 2026-09-07 12:03 EDT** when the writer was removed.~~
>
> ~~⚠️ **The correction is flagged in this repo's `CLAUDE.md` and filed NOWHERE in that repo** — so a session working on the engine's autonomy reads a confident sentence and believes it. That repo has already had to clean up exactly this shape once: `gif-deferred-list.md:185` reads *"This was previously described in Devoid's HANDOFF.md as already filed here. It was not."* **Filing it there is the fix; flagging it here is what caused that entry.**~~
>
> ~~**Concrete next action:** branch in the engine repo, correct the README's claim, and file the item in `gif-deferred-list.md` so the correction is visible from inside that repo. Push and merge are asked separately, there as here.~~


## ✅ The contact sheet is one fixed tile size for every batch — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: the sheet has a density rule, and it is asserted at three counts.** The old rule had two buckets — six or fewer, everything else — so the tile measured **262px at 8, 20, 60 and 200**.

| bucket | count | tile | why that threshold |
|---|---|---|---|
| `few` | ≤6 | **365px** | a batch you take in at once. Pre-existing (F37), unchanged |
| `many` | 7–40 | **282px** | at 228px min in a 1280px window that is ~5 columns and 8 rows — about two screens, still something you scroll rather than search |
| `crowd` | >40 | **147px** | past two screens the sheet stops being a glance |

**And size became a state channel, which is the part that answers "how do I find the one that needs me".** Shrinking every tile equally would make 200 assets scannable and still leave no landmark. In a crowd the demanding states keep **two columns — 325px against a settled 147px** — so the tile that needs you is findable by SHAPE: at any zoom, in greyscale, without reading a word. That is this surface's own rule (state sets the hierarchy, never the artwork's colours) extended from appearance to geometry.

**Falsified.** Making `crowd` identical to `many` and removing the span produces `FAILED (2)` naming both numbers — *"saw few 365px > many 282px > crowd 282px"* and *"needs-you 282px against a settled 282px"*. `gate:ui` prints the four numbers on every run, because `check()` is silent on success and a PASS that says nothing about what it measured is not evidence.

⚠️ **A cost, measured rather than glossed:** at 200 assets first paint went **326 → 401ms** and settle **1100 → 1221ms**, with RSS **656 → 731 MB**. The span-2 layout is not free. It is still flat enough that the numbers do not move between 60 and 200.

⚠️ **8 assets still land in `many`, not `few`.** The reframed item said eight in a wide window "reads as atmosphere"; at 262px in a 1280px window it is 4 columns by 2 rows, which is not sparse. That half of the complaint did not survive being looked at, and the threshold was left where a previous decision put it rather than moved to fit a claim.

### `[P2 · M · Opus5-High]` The contact sheet is one fixed tile size for every batch *(reframed 2026-09-07; filed 2026-09-05 as "never been seen with a real batch")*

⚠️ **The original question was wrong and Harkirat replaced it.** It asked whether 262px *"looks right"* at twenty. His reframe: *"the question isn't 'does it look right', the question is 'how can it be improved to work in all situations/scenarios, regardless of sheet size? How can it be user friendly? How can it be intuitive and useful?'"*

**The measurements are done and they are not the problem.** `npx electron scripts/measure_scale.mjs <n>` at 8, 20, 60 and 200 real assets: first paint flat at ~330ms, settle ~1.09s, RSS growing about 1.06 MB per asset — and **the tile is 262px at every single size**. Captures in `local/scale-shots/`. Nothing performs badly; the sheet simply does not respond to how much is on it.

**What "works at any size" would mean, as questions rather than answers:** eight assets on a 1280px window leaves the sheet mostly empty and reads as atmosphere rather than as a small batch; two hundred at 262px is a scroll with no landmarks and no way to find the one that needs you except by scrolling past 199 that do not. Neither is a contrast or a performance failure — both are the same missing idea, which is that the sheet has no notion of density.

**Concrete next action:** decide the density rule before writing any CSS — does the tile scale with count, with viewport, or with state (the needs-you tile staying large while settled ones shrink)? Then make `gate:ui` assert it at two counts, because a rule that holds at one size is the thing being replaced.


## ✅ `content_type` is permanently "unknown" in every label row — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by removing the log's writer, which is a bigger answer than the column.** Harkirat, 2026-09-07: *"drop the labels from the app. it's just adding friction and the repo has its own corpus that i supply it anyway."*

**The evidence that made it the right call:** Devoid never READ the log. The engine repo did, and its harness — where labelled data is supplied deliberately — holds **981** labels for `edge_hardness` and zero for the protection decision. A corpus accumulated as a byproduct of a flow designed to be quick is friction charged to the wrong person.

**What went:** `server/labels.py`, `tests/test_labels.py`, the write loop in `submit_answers`, `labels_written` from the answers response, the schema from `docs/API-CONTRACT.md`, and the two-logs rule in `CLAUDE.md`. ⚠️ **Also `scripts/import_labels.py` and its six tests, written hours earlier the same day** to bring a packaged run's labels back — superseded by the decision that removed the thing that produced them.

**What stayed:** `labels/protection.jsonl` with its history and 0 rows, plus a `labels/README.md` saying why. An append-only log is not deleted; it stops being appended to. `tests/test_jobs.py` still asserts `jobs.jsonl` is not that file **and** that the file still exists.

🔴 **NOT DONE, and it is in another repo:** `scripts/harness/labels/README.md` in the engine repo still says Devoid *"records every answer as a labelled row"* at this path. That is now false. Flagged in `CLAUDE.md` in red rather than corrected silently.

### `[P1 · S · Opus5-Med]` `content_type` is permanently `"unknown"` in every label row *(filed 2026-09-05)*

`labels/protection.jsonl` is framed in `docs/PRODUCT.md` as a training dataset for the engine's hardest decision, and its schema allows `icon|sticker|emoji|unknown`. Nothing in the flow ever classifies one: `server/labels.py:158` defaults `content_type="unknown"` and no caller overrides it. **A corpus where one column is always the same value is measurably weaker than its schema implies.**

Not a bug — the value is legal, and the log's other columns are real. **It is a product decision, not a code fix:** is content type asked of the person (one more question in a flow whose whole design is asking fewer), inferred from the source path or a corpus manifest, or dropped from the schema because nothing can honestly fill it? ⚠️ Dropping a column from an **append-only** log is not free; existing rows keep it.

⚠️ **This path is pointed at from the engine repo** (`scripts/harness/labels/README.md`), per `CLAUDE.md`. If the schema moves, fix that pointer.

## ✅ The `.app` runs anywhere on THIS Mac, not on another one — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: answered the way Harkirat chose, which is neither of the two options the filing offered.** His call: prune what is not needed, skip the relocatable interpreter, and *"implement a method where the app checks if python exists on the running machine … and if its missing packages, it then installs them once by asking the user for permission and stating that it needs them to run the engine."*

**The prune, measured.** The venv is **199 MB**: scipy **99**, numpy **36**, Pillow **14** — 149 MB that ships. `_pytest`, `pytest`, `pygments`, `pkg_resources`, `iniconfig` and `pluggy` are **~36 MB** the app never imports at runtime, now excluded in `electron-builder.yml` alongside pip and setuptools. ⚠️ **Pruning does not make the app portable.** It makes the bundle smaller. Saying otherwise would be the same category error the filing warned about.

**The check.** `main.js` probes each of `starlette`, `uvicorn`, `numpy`, `scipy` and `PIL` in the resolved interpreter **before** starting the server — one probe each, so the message can NAME what is missing rather than say an import failed. Missing ones produce a dialog that states exactly what would be run (`python -m pip install --user …`), why, and that scipy and numpy are large. ⛔ **Two buttons: Install them, or Quit.** Nothing is installed unless the person says so, and `--user` keeps it out of any system directory.

**Before the server, deliberately:** a missing package otherwise surfaces as a server that never answers, and `waitForServer` blames the port after 40 seconds of nothing.

**Verified:** the probe reports `ok` for all five real modules and `MISSING` for a bogus one, on a real interpreter. ⚠️ **The DIALOG itself is not covered by any gate** — it needs a Mac without those packages, which is the situation the whole item is about. The detection half is falsified; the install half is not.

### `[P2 · M · Opus5-High]` The `.app` runs anywhere on THIS Mac, not on another one *(filed 2026-09-05, successor to "The `.app` is not standalone")*

The bundle now carries its own Python, `server/` and `web/`, and launches from any directory. **Two dependencies remain, and both are named in a dialog rather than being a silent failure.**

1. **`pyvenv` is a virtualenv**, so it needs its base interpreter: Python 3.11 at `/Library/Frameworks/Python.framework/Versions/3.11`. A truly portable build needs a relocatable interpreter (`python-build-standalone`, or PyInstaller over `server/app.py`) instead of a copied venv. ⚠️ Measure the size first — the bundle is already **411 MB** and numpy/scipy/Pillow are most of it.
2. **The engine is resolved, never bundled** — and that is deliberate, not an oversight. `CLAUDE.md`'s first rule is that the skill stays the source of truth for every algorithm; a copy inside the app would drift silently and there would be no way to tell which one produced a given output. If this ever ships to someone else, the answer is a first-run check that *asks where the skill is*, not a fork of it.


## ✅ An exact-key-set assertion made a contract addition a test failure — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: swept, and the sweep found the rule has two sides.** Thirteen exact-shape assertions were reviewed and they split cleanly.

**Relaxed to supersets** — the ones inside `test_end_to_end_register_then_analyze` and the preview-pair flow. The shape is incidental to a flow test, and as equality it turned `url`, a deliberate documented addition, into a red suite.

**Kept exact, and now say why** — `test_engine_status_shape` and `test_questions_matches_the_contract_shape`. Their job IS the frozen shape in `docs/API-CONTRACT.md`, so a key appearing or vanishing SHOULD turn them red. Each carries a docstring saying so and pointing at the other kind, because the next person sweeping this pattern will otherwise "fix" them too.

⚠️ **`tests/test_journal.py`'s job-id set comparison was left alone** — that is a CONTENT assertion about which jobs are in flight, not a shape assertion, and it reads similar to the pattern being swept.

**The rule, as the filing wrote it, holds with one clause added:** assert the keys you depend on, not the absence of keys you do not — *unless the absence is the assertion*, in which case say so in the test.

### `[P3 · XS · Sonnet5-Low]` An exact-key-set assertion made a contract addition a test failure *(filed 2026-09-06)*

`tests/test_api.py::test_end_to_end_register_then_analyze` asserted `set(created[0]) == {"id","path","ext","state"}`. Publishing `url` from `Asset.public()` — a deliberate, documented contract addition — turned that into a red suite. The assertion was widened in the same change.

**Worth keeping because the shape recurs:** an exact-key-set assertion on a public payload converts every additive change into a failure, which trains people to edit the test rather than read it. **Assert the keys you depend on, not the absence of keys you do not.** Sweep `tests/` for other exact-shape assertions before the next contract change.

## ✅ This file's conservation rule is unenforced — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: gated, and the port needed a correction the source repo never needed.** `scripts/audit_tracker.py` (`npm run check:tracker`) ports the conservation half of the gif repo's `audit_docs.py`, keeping its three hard-won false-positive corrections: a unified diff renders an EDIT as a removal plus an addition, a markdown heading is structure and not an item, and both the fingerprint window and the haystack must be normalised the same way.

🔴 **THE PORT'S OWN FALSIFIER WOULD NOT FIRE, AND THAT IS WHY THE DEFECT WAS FOUND.** Deleting a whole item and running the gate reported *"conservation holds"*. Two causes, in order: the first version diffed COMMITS (`main...HEAD`), so an uncommitted deletion was invisible; and then, even against the working tree, **an item filed and closed on the SAME BRANCH never existed at the merge base**, so the addition and the deletion cancel and the diff shows nothing. That is exactly this branch's pattern — several items were filed and closed within it.

**It runs two scopes now.** `branch` asks whether the branch as a whole dropped something it never archived; `working` asks whether the change about to be committed does. **Falsified against the second:** deleting one item exits **1** naming the first removed line; restoring it exits **0**.

⚠️ **Not wired into a pre-commit hook.** It is `npm run check:tracker`, and the standing preference in this repo is against Stop-time sweeps that fire while work is in progress.

### `[P3 · S · Sonnet5-Med]` This file's conservation rule is unenforced *(filed 2026-09-05)*

The gif repo gates its tracker with `python3 scripts/audit_docs.py --diff <base>`, which fails if the deferred list loses a substantive line that cannot be traced into the archive by content. **That gate exists because that repo shipped a tracker that lied about its own contents.** Devoid has the rule and not the gate.

**Concrete next action:** port the tracker half of `audit_docs.py` — it is content-matching against the archive, not a diff heuristic — and wire it into whatever gate `docs/PLAN.md` names for docs. Small, and worth doing before this file has enough closed items for the drift to be invisible.

## ✅ Two engine versions can both validate, and nothing compares them — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: compared at the one place a stale replay costs something.** The rerun route now returns `engine_version` (what the row recorded), `engine_version_now` (what resolves today) and `engine_changed: bool` — an **additive** contract change, recorded in `docs/API-CONTRACT.md`. `loadHistoryLine` puts it in the banner: *"That run used a different engine (…), this one is (…) — the result may not match"*.

**It reports; it does not refuse.** The settings still load. Whether an older result is worth reproducing is a judgement, and `PLAN.md` 0.2's note that the resolver may find the synced claude.ai bundle rather than the checkout is precisely a case where the person, not the app, should decide.

**Two tests, both directions** — a row with a bogus version must set the flag, and a row with the live version must not, so the flag cannot be simply always true. ⚠️ Both use the `isolated_logs` fixture: a test must never append to the tracked `jobs.jsonl` or the label corpus.

### `[P3 · XS · Sonnet5-Low]` Two engine versions can both validate, and nothing compares them *(filed 2026-09-05, `PLAN.md`'s edge-case table)*

`engine.engine_version()` is recorded on the asset and written into every `jobs.jsonl` row — that half of the edge case is done. What is missing is any **comparison**: the validation boundary checks JSON *shape*, not engine *semantics*, so two installs whose `--recommend` differ meaningfully both pass. `docs/PLAN.md` 0.2 notes the resolver may find the synced claude.ai bundle, which is a different version of the skill.

**Concrete next action:** warn when a history line's recorded `engine_version` differs from the live one before offering a rerun — the rerun route (`POST /api/history/{line_id}/rerun`) is where a stale-engine replay actually costs something.

---


## ✅ The impeccable skill has never been set up here, only its detector — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: set up, and the expensive half was the briefs.** `.impeccable/` now holds `config.json`, `config.local.json`, a critique snapshot and — the part the filing called expensive — **three surface briefs**: `contact-sheet`, `open-view`, `empty-table`. `surface-brief.mjs list` reads all three. Every impeccable command reads a brief for the surface's MODE before anything else, and without one each command re-infers it, which the skill's docs name as the source of generic advice. All three are **Operate**, which `PRODUCT.md` already settled.

Each brief points at the document that owns a decision rather than restating it, and carries the constraint easiest to break: the sheet's hierarchy is set by STATE and its field recedes in **opposite directions** in the two lighting states; the open view's artwork has a **550px floor** the gate asserts; the empty table's geometry is **off limits** under D2.

`doctor.mjs` reported `product-schema-legacy` and `design-md-coverage` when this was filed; both are gone — `init` stamped `PRODUCT.md` and `document` gave `DESIGN.md` the sections the parser reads, which is what turned on three detector rules that had never fired.

⚠️ **One doctor finding remains and it is a question, not a defect:** `config-build-path-unset` — whether new surfaces are built comp-first or code-first. The skill says to offer that choice once and only where image generation exists. Put to Harkirat 2026-09-07.

### `[P2 · S · Opus5-Med]` The impeccable skill has never been set up here, only its detector *(filed 2026-09-06)*

`.impeccable/` does not exist: no config, no `design.json`, **no surface briefs**. The detector CLI works without them, which is why three sessions did not notice. `doctor.mjs`'s other finding is that `docs/PRODUCT.md` has no schema stamp and none of the sections the current record adds — Positioning, Operating Context, Evidence on Hand, Product Principles — so it predates this version and `init` is the named fix. ⚠️ `init` is an **interview**; it needs Harkirat, and it preserves confirmed answers rather than rewriting from inference.

**The briefs are the expensive half.** Every command reads `.impeccable/surfaces/<name>.md` for the surface's **mode**, the single judgement that changes the output most; without one each command re-infers it, which the skill's docs name as the source of generic advice. Three surfaces — the contact sheet, the open view, the empty table — and all three are **Operate**. ⚠️ Writing a brief records a chosen direction, so it is design work with the user's fingerprints on it: offered, never done unasked.

## ✅ A packaged run writes its labels somewhere the tracked log cannot see — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: there is a way back, and it is append-only by construction rather than by care.** `python3 scripts/import_labels.py` reads `$DEVOID_DATA_DIR` (or `~/Library/Application Support/Devoid`) and appends rows the tracked log does not already hold, matched by exact line, so a second run adds nothing. `--check` reports and exits 1 without writing.

**The append-only guarantee is asserted, not asserted-in-prose.** `tests/test_import_labels.py` (6 tests) covers each failure separately, including one that no diff would catch: **the pre-existing bytes must be a PREFIX of the file afterwards**, so a merge that rewrote history while getting longer still fails.

⚠️ **A torn FINAL line is dropped** — that is what a crash mid-append looks like against an `O_APPEND` line-atomic writer. A torn line **anywhere else refuses to touch the tracked log at all**, because that is not a shape the writer can produce and the file is the only corpus in existence for this decision.

**Not built:** the "export labels" menu item the filing offered as an alternative. A script is testable and a menu item is not, and this is a labelling-session tool — a scene `PRODUCT.md` records as explicitly declined.

### `[P2 · S · Opus5-Med]` A packaged run writes its labels somewhere the tracked log cannot see *(filed 2026-09-05)*

`labels/protection.jsonl` is **tracked evidence**, pointed at from the engine repo, and the whole reason `PLAN.md` 5.1 says to design it in early. A packaged app now writes to `~/Library/Application Support/Devoid/labels/protection.jsonl`, so those rows never reach the checkout.

Writing inside the bundle instead is strictly worse — it breaks under signing and the next install deletes it — so this is the better of two bad options, not a good one. **What it needs is a way to bring the rows back**: an "export labels" menu item, or a configured `$DEVOID_DATA_DIR` pointing into the repo for anyone doing labelling work. ⚠️ Whichever is chosen, it must **append**, never overwrite — this is an append-only log with one writer, and a merge that rewrites it breaks that guarantee.

## ✅ Emitting mode is the weaker of the two states — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed, and the filing understated it — the two components were not weaker, they were absent.** Measured under a desaturated blur, current element against its own surroundings, floor 8.0/255:

| | void | emitting, before | emitting, after |
|---|---|---|---|
| the open asset in the edge rail | **114.3** | **2.6** | **14.5** |
| the current frame in the film strip | **45.0** | **1.5** | **16.2** |

**The tokens were never the problem** — the surface ladder passes at 3 ΔL* in both states. But 3 ΔL* was set for adjacent PLANES, and a rail button's neighbours are other buttons, so on a light ground the whole strip read as one block.

**Shadow, not a border,** as the filing insisted: two depth strategies coexist here on purpose and adding a border back on light is what that split exists to avoid. The rail also needed its field to recede — its neighbours wash toward the ground, the same treatment the contact sheet's field gets in this state and for the same reason.

⚠️ **The first attempt changed the measurement by NOTHING, to a tenth of a unit.** A stronger rule was added earlier in the file and lost at equal specificity to one that already existed at line 930 — which was the original light-mode shadow fix, too quiet at `0 1px 3px` and 10%. The filing said that fix "did not reach" these components; it reached the rail and was simply inaudible. **Strengthen the rule that wins; never add a second one and assume.**

### `[P2 · M · Opus5-High]` Emitting mode is the weaker of the two states *(filed 2026-09-05, from the interface-design squint test)*

The void (dark) state is the designed one. Emitting (light) passes every measurement — contrast, focus-ring, hit targets — and still **loses tile separation under a squint** in the places the shadow fix did not reach: the edge rail and the film strip. Two depth strategies coexist by design here (borders on dark, shadows on light, recorded in `.interface-design/system.md`), which is a deliberate exception to "choose one and commit"; this item is that exception not being carried all the way through.

**Concrete next action:** run the squint test on the real window, both states, and extend the light-mode shadow scale to the two components that were missed rather than adding borders back — borders on light is the thing the strategy split exists to avoid.

⚠️ **MEASURED AND HALF-FIXED 2026-09-07 02:10 EDT, and the half that remains is the item.** The gate now captures `11-sheet-emitting` and `check_greyscale.py` squints both lighting states. Emitting was **inverted**: the needs-you tile read 219.1 against a field at 227.4, losing by **8.4**, because the field recedes with `brightness(.55)` and on a light ground darker is louder. It washes toward the ground now and separates positively — but at **10.7 to 25.8 across runs against a floor of 8.0, where the void reads 72.8 every time**. The inversion is gone; the weakness is exactly what was filed. ⚠️ The squint also had a dark-mode assumption in its arithmetic (`mine - theirs`, signed), so a real inversion and no separation failed the same way; it measures `abs()` now. **Next: the edge rail and the film strip, which this pair still does not cover.**


## ✅ The history drawer can sit on "Reading the log…" while analyses run — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed — it is NOT the route, and the filing was right to refuse to name a cause.** `/api/history` was timed against six analyses that were **asserted** to be running, not assumed: all six returned HTTP 200 and the slowest took **7,360ms**, so the load was real. The route read **1/3/5ms idle**, **4/5/16ms with the six in flight**, and **0/2/2ms after**. It never left single-digit milliseconds under the load that was supposed to starve it, so threadpool contention and the GIL are both off the list.

⚠️ **The first version of the measurement was worthless and would have looked identical.** It fired the six and timed 600ms later without checking they were still running; a latency measured against no load is a number with a caption. The script prints the slowest analysis beside the latency now, and says out loud that a small number there invalidates the row below it.

**What is left is not this item.** If the drawer stalls again the next place to look is the client — `S.history=null` then `render()` — and it needs its own filing with its own observation, not this one's.

### `[P2 · S · Sonnet5-Med]` The history drawer can sit on "Reading the log…" while analyses run *(filed 2026-09-05)*

Observed in a real window: with six ~18s analyses in flight, the drawer stayed on its loading text for over two seconds, while `/api/history` on an idle server answers in milliseconds. Every route that touches the engine is a plain `def` and runs in Starlette's threadpool by design (`server/app.py`'s header, and the 1,290x stall it exists to prevent) — but the *log reader*, which touches no engine at all, queues behind them.

⚠️ **Not yet diagnosed, and do not assume the cause.** It could be threadpool contention, the GIL, or something on the client. **Measure `/api/history` latency against concurrent analyses before changing anything** — this repo's own history is that plausible attributions are wrong about a third of the time.

## ✅ 200 assets decoding at once, and the loading state does not mean anything yet — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by measurement — the panic does not survive contact with the numbers, and the real finding is a different one.** `scripts/measure_scale.mjs`, one size per process:

| n | first paint | settle | tile | decoded | JS heap | RSS |
|---|---|---|---|---|---|---|
| 8 | 340ms | 1096ms | 262px | 0.5 MPx | 1.7 MB | 452 MB |
| 20 | 339ms | 1093ms | 262px | 1.4 MPx | 1.7 MB | 486 MB |
| 60 | 315ms | 1070ms | 262px | 4.1 MPx | 1.7 MB | 533 MB |
| 200 | 326ms | 1100ms | 262px | 13.5 MPx | 1.8 MB | 656 MB |

**First paint and settle are flat across a 25x change in count.** RSS grows about **1.06 MB per asset**.

⚠️ **And the number that hides the limit of this test.** 13.5 MPx over 200 tiles is **0.0675 MPx each — about 260x260** — because the corpus assets are already tile-sized, so "full source resolution" IS the tile here. A batch of 1024px sources would decode at **16x** this and has still never been tried. The measurement retires the fear for this corpus and says nothing about that one.

⚠️ **`loading="lazy"` is absent on every tile at every size** — 0 of 200. That is real, it is cheap, and it is the honest successor to this item rather than a decode queue or a thumbnail route.

### `[P2 · M · Opus5-High]` 200 assets decoding at once, and the loading state does not mean anything yet *(filed 2026-09-05, `PLAN.md`'s edge-case table, owner 2.2)*

The contact sheet renders every asset as a looping `<img>` at full source resolution. At corpus size that is fine; the layout claim above was written about **layout** and has been read as a **performance** claim. Two hundred concurrent decoders at source resolution is a different question and has never been measured.

**Concrete next action:** measure first — 200 real assets, real window, memory and first-paint — before building anything. The fix if one is needed is a `loading` state that does something (`loading="lazy"`, a decode queue, or thumbnails, which is the same missing route as item 1).


## ✅ The decision is scattered across four zones and its evidence is exiled — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: the `Answer` button is deleted and the reading path is fixed — but NOT the way the filing asked, because the filing's own action was measured and rejected.**

**What shipped.** Picking a side IS the answer: all three pick sites go through one `pickAnswer()`, which sends the moment nothing is outstanding. The loudest control in the column — the only `btn go` there, and a second commit step behind a decision already made — is gone, replaced by a visible **Undo that**, which is the affordance ⌘Z had without anyone being told it existed.

⚠️ **The ledger did NOT move under the answer pair, and the numbers say why.** `gate:ui` asserts the artwork is ≥550px with a question open. Moving the ledger into the stage column took it from **1037 → 455px**; compacting it to 92px then 56px only reached **517** and **531**. Buying the evidence with the focal element is exactly the trade the artwork item was closed to prevent. The ledger now sits at the TOP of the decision column, directly under the question it prices, which addresses the actual complaint — *"~600px below the heading"* — and a stashed A/B measured it at **840px either way**, so it costs the artwork nothing.

### `[P1 · M · Opus5-High]` The decision is scattered across four zones and its evidence is exiled *(filed 2026-09-06, from `/impeccable critique`)*

Measured off `09-seam.png`: question heading top-right, "answer it under the seam", buttons bottom-left, submit back top-right, and the two numbers that price both answers **~600px below the heading**. Eye travel for one binary: right → left → right → down. The `Answer` button is the only `btn go` in the column, so it is the loudest control there — and it is not the decision, it is a second commit step behind it.

**Concrete next action:** move the ledger directly under the answer pair, and delete the `Answer` button — `noteAnswer` commits on pick and ⌘Z already undoes (`app.js:800`, `:1946`). Surface the undo as a visible affordance instead.

## ✅ Eight region tools, with keep and cut separated by colour alone — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed, and the check that was blind to it now fails when it should.** Each verdict button carries a mark as well as an edge — a solid block for material that stays, the diagonal hatch for material that goes, which is the app's own notation. The eight tools are two labelled groups, `keeping` and `cutting`, divided by a rule. `Cut it after all` — which named no action anyone could guess — is now **`Cut anyway`**.

**`check_greyscale.py` covers controls for the first time**, measuring the two marks against each other in `10-ledger`: **Δ 19.3 against a 12.0 floor**.

⚠️ **That floor came from a falsifier, not from taste, and the first version of the check was worthless.** Making both marks the same glyph in the same colour still measured **Δ 6.0 — exactly the default `PAIR_MARGIN`** — so at the default this check PASSED on two identical controls and would not have failed on the defect it was written for. 6.0 is the pair's noise floor: the boxes average over three buttons a side. `PAIRS` entries now take an optional per-pair margin; with 12.0 the falsifier goes red (exit 1) and the real marks pass.

⚠️ **A measured cost, recorded rather than hidden:** stacking the two groups as separate rows took the artwork from **1037 → 840px** on ready. Putting them on one row with a divider recovered it to **959**. The grouping is not free, and 959 is the honest number.

### `[P1 · S · Sonnet5-Med]` Eight region tools, with keep and cut separated by colour alone *(filed 2026-09-06, from `/impeccable critique`)*

`web/canvas.js` — one row, identical geometry and weight, distinguished by a tinted left border. **In greyscale Keep and Cut are indistinguishable**, which `DESIGN.md` declares impossible; `check:greyscale` misses it because it covers states, not controls. "Cut it after all" also names no action a user can guess.

**Concrete next action:** two labelled groups with a divider, each button carrying its grease-pencil mark. Extend `check_greyscale.py` to controls.


## ✅ Six map nodes assert LESS than they appear to, because `signal_present` is ANY — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed for all sixteen lists, and the fix was falsified before it was believed.** Every `signal_present` in `map.yaml` now carries exactly ONE string, in a form live code can contain — `function foo`, `def foo`, `const foo`, a full selector. The `ANY not ALL` mechanism and the comment-matching trap are recorded at the top of `map.yaml` and in `CLAUDE.md`. **Proof it is a check at all:** renaming `function resolvePython` in `main.js` turns `launch` red (`✗ code implements: function resolvePython`, verdict `drift`) and restoring it turns it green; `main.js` was compared byte-for-byte after restore. `map status` reports **17/17 verified** on one signal each, where before it reported the same on the easiest term of each list.

### `[P1 · S · Sonnet5-High]` Six map nodes assert LESS than they appear to, because `signal_present` is ANY *(filed 2026-09-07, found while closing the P0)*

`map-reconcile.js:171` is `const found = hit != null` over the FIRST match in the signal list, so a `signal_present` check with N strings passes when **any one** of them is present. Every extra string makes such a check WEAKER, not stronger — the exact opposite of the natural reading, and the opposite of `signal_absent`, where more strings forbid more.

Nodes whose `signal_present` lists more than one string are therefore asserting only their easiest term: `launch` (3), `contact-sheet` (2), `region-mark` (2), `seam`'s first check (4), `question`'s first check (2), and any single-kind shorthand with a list. **`answer-bar`, `ledger` and the rest need auditing the same way.**

⚠️ **And a signal matches COMMENTS.** `seamToGroup` passed by matching prose on `web/app.js:74` while the function sat at `1579`. This is the same false-positive class that made `question`'s check fire on a comment recording the string it was forbidding.

**Concrete next action:** for every `signal_present` in `map.yaml`, keep exactly ONE string, and make it something only live code can contain (`function foo`, a full selector, a template expression) rather than a bare identifier. **Verify:** delete the implementation of one node's subject and confirm its check goes red — a check that cannot fail is not a check.

## ✅ The disabled primary is unreadable and `check_contrast.py` is blind to it — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed, and the numbers moved from 1.82:1 to 6.78:1.** `.btn:disabled` no longer fades the element with `opacity:.45` — a composited pair has no tokens to name, which is precisely why the gate could not see it. It now sets `--bench` / `--score` / `--graphite-2` explicitly, and `PAIRS` carries the pair: **6.78:1 collapsed** (`#A6A6BC` on `#221D37`) and **8.31:1 emitting** (`#4E4C60` on `#FFFFFF`), both against a 4.5 target, both measured by `npm run check:contrast` rather than asserted here.

### `[P1 · S · Sonnet5-High]` The disabled primary is unreadable and `check_contrast.py` is blind to it *(filed 2026-09-06, from `/impeccable critique`)*

Measured from the captured window: emitting `#FFFFFF` on `#A6C5CF` = **1.82:1**; collapsed `#181E30` on `#406E87` = **3.00:1**. `scripts/check_contrast.py:76` tests only `btn.go ink on cyan` — the **enabled** pair — so `npm run check:contrast` passes green over the shipped pixel, and the button is disabled for the entire time the question is open.

⚠️ Disabled controls are exempt from SC 1.4.3, but `PRODUCT.md` commits to contrast in both states as chosen rigour and presents the gate as proof. **Concrete next action:** an explicit disabled token pair, measured in both states, added to the script's `PAIRS`.

## ✅ `web/advice.js` carries a whole stale palette generation — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed — every fallback deleted, and the file now returns ZERO findings.** All ten `var(--token, fallback)` fallbacks are gone (`#E7EDEB`, `#9DAEAA`, `#12332A`, three rgba pairs, the easing curve), and the three raw radii are tokens. The four-file detector run went from **6 findings to 1**, and that one is the accepted checkerboard in `index.html`. ⚠️ **A detail worth keeping: the first fix left a finding behind, and it was in the COMMENT explaining the fix** — writing *border-radius:5px* in prose re-created `design-system-radius`, one hour after the comment-matching trap was written into `DEVLOG.md`. The literal is deliberately not repeated in that comment now.

### `[P1 · S · Sonnet5-Med]` `web/advice.js` carries a whole stale palette generation *(filed 2026-09-06, from Assessment B)*

Six detector findings — `#E7EDEB` ×3 and `#9DAEAA` are a previous generation of `--graphite`/`--graphite-2`; `#12332A` matches `--ok-bg` which `DESIGN.md` does not document; `border-radius:5px` is off the scale and **unconditional**. Plus three rgba fallbacks the rule cannot see: `--score-2` `.19` vs `.42`, `--mark` `.34` vs `.62`, `--score` `.09` vs `.16`.

⚠️ **Every flagged colour is the fallback half of `var(--token, …)` and every token is defined**, so none paints — except the radius. **Concrete next action:** delete the fallbacks; a `var()` fallback for a token that always exists is a second palette nobody maintains.

## ✅ Four of ten captures are the same empty table, and the drawers have never been seen — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed by ordering, which is the cheapest half; the drawer sweep is not done.** `06-history` now runs BEFORE `04-empty-emitting` empties the table, so it photographs the drawer over a populated sheet instead of a state `renderTabs` force-hides; `08-reduced-motion` keeps the arrival shot's assets instead of clearing them, so the five `@media` blocks are finally exercised on a screen that has a wash, a stagger and a seam. Two captures of the empty table remain and that is deliberate — it is a real surface. All ten digests are distinct and `gate:ui` PASSES. ⚠️ **Still open elsewhere:** the six-drawer surface carrying all 63 flags has still never been visually reviewed; that half belongs to the impeccable-setup item.

### `[P1 · S · Opus5-Med]` Four of ten captures are the same empty table, and the drawers have never been seen *(filed 2026-09-06)*

`04-empty-emitting`, `05-empty-void`, `06-history` and `08-reduced-motion` all render the empty table. `06-history` runs `S.drawer='what you did'` **after** `04` set `S.assets=[]`, and `renderTabs` force-hides the rail and drawer on an empty table (`app.js:1336`). All four `.boxes.json` sidecars are `{}` — confirmed.

**So the six-drawer surface carrying all 63 flags has never been visually reviewed**, and `08-reduced-motion` verifies the motion rules on the one screen with no wash, no arrival stagger and no seam. ⚠️ `PRODUCT.md`'s Evidence table cites these ten as evidence of the real window. **Concrete next action:** populate the table before the history and reduced-motion shots, and assert the drawer's own bounding box is non-zero.


*Ordered by priority, P1 first.*

## ✅ The design detector ran DEGRADED with no banner, and its deps live in `/tmp` — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed, and the durable half was already true.** All four parsers — `htmlparser2`, `css-select`, `css-tree`, `domutils` — are present AND listed in `~/.claude/skills/impeccable/package.json`, and `node_modules` there is a real directory, not the `/tmp` symlink the filing feared. The remaining risk was the one the filing named as the real defect: a bare `[]` on a CSS-only invocation with no banner. `npm run check:detector` now runs the three design-system rules against `scripts/fixtures/detector-canary.css` — a repeating gradient, `#FF00FF`, `border-radius:17px` and Comic Sans — and **exits 1 on an empty result or on DEGRADED**. It reports 4 findings across all three rules. ⚠️ **And it produced a finding of its own:** `repeating-stripes-gradient` does NOT fire on that CSS fixture while the other three do, so that rule appears to read HTML only — which retires a standing prediction in `DESIGN.md`.

### `[P1 · S · Sonnet5-High]` The design detector ran DEGRADED with no banner, and its deps live in `/tmp` *(filed 2026-09-06)*

`CLAUDE.md` makes the detector a gate: *exactly one finding, `repeating-stripes-gradient`, and an empty result only counts when the header does not say DEGRADED.* Found 2026-09-06: `htmlparser2`, `css-select`, `css-tree` and `domutils` were **missing** from `~/.claude/skills/impeccable/node_modules`, and on a **CSS-only** invocation the tool printed a bare `[]` with **no DEGRADED banner at all** — the banner appears only once HTML is in the argument list. So the documented safeguard does not cover the most common invocation shape.

⚠️ **Every detector result quoted before that install is unverified**, including several in this session's own reports. Deps were installed into the skill directory (outside this repo), which is not durable: the skill has no `package.json` listing them, and `node_modules` there has been observed as a symlink into `/tmp`.

**Concrete next action:** do not trust a bare `[]`. Either pin the four packages in the skill's own `package.json`, or add a wrapper in `scripts/` that runs the detector over a file **known** to contain a finding and fails loudly if that returns empty. This project's own rule — prove the instrument can report presence before trusting an absence.

## ✅ `scripts/fetch-fonts.py` silently reverts the font fix — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed at the source rather than left to the gate.** The query is now `Archivo:wdth,wght@62..125,100..900` and `Spline+Sans+Mono:wght@300..700`, matching what the `.woff2` files carry; the header comment says why the ranges are the fix rather than a detail. `python3 scripts/check_font_axes.py --check` reports *OK — every declared range is exactly the range its file carries*. ⚠️ It also still warns that Spline Sans Mono has **no `wdth` axis**, so every `font-stretch` aimed at it anywhere in the app is inert — that is a separate, pre-existing observation, not part of this item.

### `[P1 · XS · Sonnet5-Med]` `scripts/fetch-fonts.py` silently reverts the font fix *(filed 2026-09-06)*

`web/fonts.css` was corrected so the declared axes match what the `.woff2` files carry (Archivo `wght 100 900`, Spline Sans Mono one variable face at `300 700`). `scripts/fetch-fonts.py` regenerates that file wholesale from a Google Fonts query still pinned to `wdth,wght@62..125,400..700` and `wght@400;500` — **exactly the clamped ranges that were removed.** Running it undoes the fix without a word.

**Concrete next action:** widen the query string in the script. `scripts/check_font_axes.py` catches the regression today, so this is a footgun rather than a silent loss — but a gate that catches a self-inflicted revert is worse than a script that does not cause one.


## ✅ Three detector rules have never fired, and the contract does not say so — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by `/impeccable document`, and now protected by a canary.** `docs/DESIGN.md` gained the frontmatter and the canonical `## Colors` / `## Typography` sections the parser reads, which unlocked `design-system-font`, `design-system-color` and `design-system-radius`; turning them on immediately found 15 real violations in the shipped surface. `npm run check:detector` runs the three rules against `scripts/fixtures/detector-canary.css` and **fails loudly on an empty result**, so "the rules are live" is now asserted rather than remembered — it reports 4 findings across all three rules.

⚠️ **A finding the closure produced: `repeating-stripes-gradient` does not fire on a CSS-only argument list.** The canary carries a `repeating-linear-gradient` and that rule stayed silent, while the other three fired. This retires `DESIGN.md`'s standing prediction — *"expect one finding, and a second when the hatch lands"* — which could never have come true: the hatch is in `app.css` and the rule appears to read HTML.

 Closed items
## ✅ The hatch is painted over the exact rectangle the seam exists to reveal — CLOSED 2026-09-07 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: fixed, and proved by a red-green cycle rather than by a string search.** The fill moved from `.qregion`'s own background to a `.qregion:before` clipped at `--qseam`, a per-element conversion of the seam's position into that region's own basis; `syncRegionSeams()` rewrites it on every drag and `seamToGroup()` opens the seam on the mean centre of the disputed bbox instead of a constant. `setSeam(50)` is gone from `openAsset`; `SEAM_NEUTRAL` is used only when nothing is disputed.

⚠️ **The naive fix is wrong and was caught before it was built.** `clip-path:inset(0 0 0 var(--seam))` on the region does NOT cut where the seam is — a percentage in `clip-path` resolves against the clipped element's own box, so `--seam` would cut every region at its own midpoint and travel the wrong way as you drag.

**Two new assertions in `scripts/capture-window.mjs`, and they were shown to fail.** Reverting only `web/app.css` and `web/app.js` with the gate in place gives `FAILED (2)` — *"clip-path on ::before = null"* — and restoring gives PASS. Counting `.qregion` nodes, which is what the gate did before, passed throughout the defect's whole life. `map explain seam` moved from **drift** to **verified**, and its checks were rewritten at the same time because the old signal encoded an implementation that could not be built (see the P1 filed the same day).


## ✅ With a question open, the artwork is 321px in a 1750px stage — CLOSED 2026-09-06 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by Task 21, measured.** The decision moved into a 340px column beside the artwork and the film strip lost its excess padding. `npm run gate:ui` reports **1037x1037** with a question open, and asserts `>= 550` so it cannot regress quietly. Below 1080px the column returns underneath, where a column would squeeze the artwork rather than free it.

### `[P2 · S · Opus5-Med]` With a question open, the artwork is 321px in a 1750px stage *(filed 2026-09-05)*

Measured in the real window at 1280x860 with `megaphone.src.gif` open: `#wipe` is **321x321**, centred in a work area about 1750px wide. `.wipe` is `height:100%` with `aspect-ratio:1`, so it is height-constrained — and the questions panel, the ledger and the film strip take the height, while the width beside it goes unused.

This is the focal-element problem again, in the one state where the artwork matters most: you are being asked to judge an edge. ⚠️ **Do not just make it bigger** — the panels below it are the question being asked. The real options are a side-by-side layout when the stage is wide, or collapsing the film strip while a question is outstanding. Both are layout decisions that need looking at, not a number to change.


## ✅ The film strip counts frames and cannot scrub to one — CLOSED 2026-09-06 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by Tasks 7 and 27, and it was two bugs wearing one label.** `seekToFrame` had zero callers — that was F6, and wiring it was necessary and not sufficient: `sides().a` held **one frame**, because the answer-pair preview is single-frame by design. With the seam down there were no canvases at all. Task 27 extracted `mountPair` out of `loadPair` so the plain source-vs-output comparison decodes into the same canvases; the strip now scrubs **144** frames, asserted in the gate by hashing the canvas either side of a click. ⚠️ The strip still refuses to scrub while the seam is up, and **says so** — that preview is one frame on purpose.

### `[P2 · S · Sonnet5-Med]` The film strip counts frames and cannot scrub to one *(filed 2026-09-05, `PLAN.md` 3.3)*

The strip highlights and reports `n frames`, and the artwork beside it is a looping `<img>` that **never seeks**. Clicking a frame does not go to it. Frame-accurate seeking needs the canvas decoder that `PLAN.md` 3.3 describes and that the wipe already has half of — `web/wipe.js` decodes shared frame timing to keep two canvases synced, which is the harder part.

⚠️ This is also the blocker under the motion-sensitivity edge case: an animated `<img>` cannot be paused by CSS, so "stop the animation" is unreachable until frames decode to canvas.


## ✅ The UI gate asserts eight things; the surface has far more than eight — CLOSED 2026-09-06 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed.** The gate now runs roughly thirty assertions across ten captured states, and the ones that matter test CONNECTION rather than presence: a real pointer drag, a canvas hash either side of a frame click, an apply/undo cycle on a suggestion, the drawer's computed `position`, the artwork's measured width, and the pip's state before and after work. Two new scripts run beside it — `check:contrast` (every pair, both lighting states, alpha composited) and `check:greyscale` (`DESIGN.md`'s runnable check, which had never been run).

### `[P1 · M · Opus5-High]` The UI gate asserts eight things; the surface has far more than eight *(filed 2026-09-05, successor to "No automated test covers the UI — at all")*

`npm run gate:ui` now drives the real Electron window and **fails** on: rAF never firing, a zero-size region canvas, a hidden plotter, an unsized starfield, a drawer that disagrees with the log, a history row without its load button, `prefers-reduced-motion` not emulating, a dirty console, and **any two states producing byte-identical pixels**. That last one is what caught the camera lying.

**What it still does not cover:** the wipe's seam drag, selection and shift-range, drag-and-drop through the `FileSource` boundary, the tri-state controls' auto/override/undo cycle, answering a question end to end, the region tools' roving tabindex, and every one of the eleven states as a *state* rather than as a screenshot.

⛔ **Do not close this with pixel baselines.** A screenshot diff over a generated starfield fails for reasons that are not defects, and a gate that cries wolf gets switched off — which is how the surface ended up with no coverage in the first place. The pattern that works here is the one the eight use: drive the real window, then assert something that **can** be false.


## ✅ The system Python interpreter carries this project's signature, not its own — CLOSED 2026-09-06 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: restored by the user, verified 2026-09-06 18:37 EDT.** `codesign -dv` on `/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11` now reports `Authority=Developer ID Application: Ned Deily (DJ3H93M7VJ)`, the full Apple chain, and `TeamIdentifier=DJ3H93M7VJ`; `codesign --verify --strict` exits **0**. The project venv still imports `starlette` on 3.11.3, so reinstalling the framework in place cost nothing. `build/afterPack.js` is what stops it recurring, and its guard throws rather than warns.

### `[P1 · XS · Sonnet5-Low]` The system Python interpreter carries this project's signature, not its own *(filed 2026-09-06)*

`/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11` was re-signed in place by the first signed build, replacing `Developer ID Application: Ned Deily (DJ3H93M7VJ)` with `DEVOID`. Cause and permanent fix are in `docs/DEVLOG.md`; the file still runs and the framework's notarised `Python` dylib and `Python.app` are untouched, so nothing is broken — but the binary no longer matches the notarised original it claims to be.

**Concrete next action:** run `~/Downloads/python-3.11.3-macos11.pkg`, already downloaded and verified 2026-09-06 17:29 EDT as *signed by Developer ID Installer: Ned Deily (DJ3H93M7VJ), notarised, trusted timestamp 2023-04-05*. It replaces the framework in place; `.venv` points at the framework path rather than a copy, so it keeps working. ⚠️ **This is a local-machine state, not a repo defect** — a fresh clone on another Mac has nothing to fix.


## ✅ Signing and notarisation are configured and have never run — CLOSED 2026-09-06 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: half closed, and the half that closed answered the question the item was actually about.** A self-signed `DEVOID` Code Signing certificate made in Keychain Access is enough to exercise `hardenedRuntime` and `build/entitlements.mac.plist` without an Apple Developer account. The signed build launches, spawns Python and serves on port 8732 in 6s — **the entitlements are correct**, which had never been tested. `codesign --verify --deep --strict` returns exit 0, `valid on disk`, `satisfies its Designated Requirement`. Notarisation is genuinely untouched and is refiled as its own item; the ⛔ never-fabricate rule was not bent — the certificate is real, it is just not Apple-issued.

⚠️ **Getting there cost two defects that only a signed build could expose**, both now fixed and both recorded in `docs/DEVLOG.md`: the venv's escaping absolute symlink, which made the signer walk out of the bundle and re-sign the system Python; and the packaged app byte-compiling `site-packages` into its own bundle, which broke its own seal on first launch.

### `[P2 · S · Sonnet5-High]` Signing and notarisation are configured and have never run *(filed 2026-09-05, `PLAN.md` 6.2)*

Five environment variables drive both paths and **all five are deliberately unset** — the user's own choice; there is no certificate and no Apple ID. Unsigned local builds work. ⚠️ **`build/entitlements.mac.plist` is the thing most likely to bite on a first signed build**: without the right entitlements a signed build launches and then fails at the Python spawn, which looks exactly like a server bug. The file is written for that case and has never been tested against it.

⛔ **Never fabricate signing credentials to make this testable.** The variables stay unset until real ones exist.


⚠️ **The fixes made during the build session are not here.** They were never filed as deferred items in the first place, so they do not belong in an archive of filed items — they are in `docs/CHANGELOG.md` (what shipped) and `docs/DEVLOG.md` (why, and what was tried and walked back).

## ✅ `jobs.jsonl` is tracked in git, so every real use dirties the working tree — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by untracking, in the same session it was filed.** `jobs.jsonl` is now in `.gitignore` and `git rm --cached`-ed; `labels/protection.jsonl` stays tracked, which is the whole distinction. No `.gitkeep` was needed — verified live that an absent log reads as empty (`server/appendlog.py:read_lines` returns `[]` for a missing file, by design, per `PLAN.md` 5.2's "distinguish absent from deleted"), so nothing has to hold the path open.

⚠️ **Half of it did not close and was moved, not dropped.** `server/jobs.py:25` still hardcodes `REPO_ROOT / "jobs.jsonl"`, which stops meaning anything once the app ships as a standalone bundle. That half now lives inside the packaging item (`[P1 · M · Opus5-High]` "The `.app` is not standalone") rather than as its own entry, because the fix is the same fix.

**The original filing, unedited:**

### `[P1 · XS · Sonnet5-Med]` `jobs.jsonl` is tracked in git, so every real use dirties the working tree *(filed 2026-09-05, found the first time the app was used for real)*

`jobs.jsonl` is a **per-machine work history** — "`jobs.jsonl` records your work" (`CLAUDE.md`) — and it is committed to the repo as a tracked, empty file. The first genuine render on this machine appended a row and left the tree dirty on a branch about to be pushed, carrying a local `~/Downloads` path with it. Every real use will do that again, and two branches that both saw use will conflict on a file whose merge has no meaning.

⚠️ **`labels/protection.jsonl` is the opposite case and must stay tracked.** That log is *evidence* — a dataset meant to accumulate across machines, pointed at from the engine repo. The two logs "look alike and must not be merged" (`CLAUDE.md`); this is the same distinction one level down, in git rather than in the schema.

**Three options, and they are not equivalent:** gitignore `jobs.jsonl` outright (loses nothing — nothing reads it across machines); keep the path tracked via a `.gitkeep` and ignore the file; or move it out of the repo entirely, to `~/Library/Application Support/Devoid/`, which is where a shipped `.app` will have to write anyway and therefore folds into the standalone-packaging item. ⚠️ **`server/jobs.py:25` hardcodes `REPO_ROOT / "jobs.jsonl"`**, so the third option is the only one that survives the app leaving this repo.


## ✅ Two windows, one log — there is no single-instance lock — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed with `app.requestSingleInstanceLock()`, and verified red-green.** Without it: a second `npm start` gave **2 uvicorn processes** and a second live window. With it: **1**, and the second copy exits after handing its file arguments to the first. The second launch also focuses and restores the existing window, so "Devoid is probably already running" is now something the app acts on rather than only says in a dialog.

The `O_APPEND` single-`os.write()` primitive in `server/appendlog.py` stays as the second layer — the lock stops two writers existing, the primitive stops a torn line if one ever does.

**The original filing, unedited:**

### `[P1 · S · Sonnet5-Med]` Two windows, one log — there is no single-instance lock *(filed 2026-09-05, `PLAN.md`'s own edge-case table, still unowned)*

`main.js` never calls `app.requestSingleInstanceLock()`. Two Devoid windows means two servers, two ports (the probe handles that fine) and **two writers to `jobs.jsonl` and `labels/protection.jsonl`** — "two append-only logs, one writer each" is a schema rule in `CLAUDE.md`, not an enforced one. `server/journal.py` takes an `flock` for the crash journal's whole-file rewrite; the two append-only logs have no such guard.

**Two acceptable answers:** a single-instance lock in `main.js` (second launch focuses the existing window), or line-atomic `O_APPEND` writes so concurrent appends interleave safely. ⚠️ **The second is not automatic** — a POSIX append is atomic only below `PIPE_BUF`, and a label row with a bbox and a long path can exceed it. Prefer the lock, which is four lines.

## ✅ `prefers-reduced-motion` is written and has never been exercised — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: the preference is now emulated and asserted.** `scripts/capture-window.mjs` attaches the DevTools debugger and sends `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`, captures the state, and **fails the gate if the media query does not report `true`** — so the five `@media` blocks in `app.css` are exercised on every run instead of being code nobody could reach.

⚠️ **What is exercised is that the rules APPLY, not that they are the right rules.** Whether the reduced states are good is a judgement nobody has made against a real preference; that half was never in this item's wording and is not claimed closed.

**The original filing, unedited:**

### `[P2 · S · Sonnet5-High]` `prefers-reduced-motion` is written and has never been exercised *(filed 2026-09-05)*

Five `@media (prefers-reduced-motion:reduce)` blocks exist in `web/app.css`, covering the global transition kill, the horizon ring, and three more. **Neither surface available during the build could emulate the preference**, so every one of them is unverified code. ⚠️ A reduced-motion rule that is wrong is worse than one that is absent — it is the one path a motion-sensitive user cannot work around.

**Concrete next action:** Electron's `webContents.debugger` can set `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`; add it as a seventh state to `scripts/capture-window.mjs`.

## ✅ No automated test covers the UI — at all — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed as WORDED, and immediately re-filed narrower.** `npm run gate:ui` is a real gate with eight assertions against the real Electron window, red-green verified (breaking the drawer's dispatch drops it to 0 rows and exits 1; restoring it exits 0). The title is no longer true, so it cannot stay open.

⚠️ **It earned its keep before it was even committed.** Building it found three defects nothing else had: `capturePage()` returning stale frames for four of eight states, Electron serving a cached `app.js` so the gate certified code that was not on disk, and a drawer-dispatch branch that had never executed. See `docs/DEVLOG.md`.

**Successor:** `[P1 · M · Opus5-High]` "The UI gate asserts eight things; the surface has far more than eight", which lists what is still uncovered.

**The original filing, unedited:**

### `[P1 · M · Opus5-High]` No automated test covers the UI — at all *(filed 2026-09-05)*

**93 pytest pass and not one of them touches a line of `web/`.** They are Python: server routes, the validation boundary, the two logs, a real render through the subprocess. The only frontend tests are two pure-maths suites with no DOM — the coordinate round-trip (267 assertions) and the wipe frame clock (14). Every visual and behavioural claim about the surface rests on inspection.

This is the single largest hole in the project's evidence, and it is what made a related failure possible: **"93 pytest passed" was reported on commits that changed only CSS** — true, and evidence for a claim nobody made.

**Concrete first slice, and it is small:** `scripts/capture-window.mjs` already drives the real Electron window and captures six states through `webContents.capturePage`. Turning it from a screenshot tool into a **gate** — assert the diagnostics it already prints (region canvas non-zero, starfield sized, no console errors), then compare each PNG against a committed baseline — is most of a real UI test for the cost of an exit code. ⚠️ Pixel baselines are brittle; start with the assertions, which cannot be flaky, and add image comparison only where a stable region justifies it.

## ✅ The `.app` is not standalone — it carries no Python — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed, and verified by running it from `/tmp`.** The bundle carries `pyvenv` (the venv), `server/` and `web/` as extraResources, resolves its interpreter in a stated order, and writes its logs to `~/Library/Application Support/Devoid`. Copied to `/tmp/DevoidTest` and launched there it served `index.html`, `app.css`, `app.js` and an 807 KB corpus asset, introspected **64 engine flags**, and reported `engine available: true`.

**Three defects were found doing it**, all of which mean the previous build almost certainly never ran at all: `server/` and `web/` were inside `app.asar`, where Python cannot read them; there was no interpreter; and `waitForServer` retried **forever**, so any of it failing showed the person nothing — no window, no error. Both failure paths are dialogs now.

⚠️ **Two dependencies remain and are filed as a successor** — the venv's base interpreter, and the engine's resolved path.

**The original filing, unedited:**

### `[P1 · M · Opus5-High]` The `.app` is not standalone — it carries no Python *(filed 2026-09-05, `PLAN.md` 6.3)*

`npm run dist:dir` produces `dist/mac-arm64/Devoid.app`, it launches, and **it only runs from this repo**: `main.js` spawns `.venv/bin/python` relative to its own directory. On any other machine it opens a window and fails at the spawn.

**The work:** bundle an interpreter (`pyinstaller` over `server/app.py`, or a vendored embeddable Python dropped in via `extraResources`), and give it the environment check from `docs/PLAN.md` 0.3 as its failure path — a missing engine must say so in the window, not die in a spawn. ⚠️ **This now also owns where the logs live.** `server/jobs.py:25` and the labels writer both resolve their paths from `REPO_ROOT`, which stops meaning anything the moment the app leaves this repo. A standalone build has to write to `~/Library/Application Support/Devoid/` — decided when `jobs.jsonl` was untracked on 2026-09-05, where ignoring it was the right small fix and relocating it was correctly judged too big for a docs session.

⚠️ **Do not describe the current build as standalone anywhere**; `README.md`'s Packaging section is written to prevent exactly that and should stay that way until this closes.

## ✅ `docs/API-CONTRACT.md` is the one hard-wrapped markdown file in the repo — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: reflowed, on the user's call — "its frozen state has no merit on correcting its wrapping."** 92 → 76 lines. Every markdown file in the repo now passes `reflow-prose.mjs --check`.

⚠️ **The filing's reasoning was wrong in a way worth keeping.** It weighed a formatting win against a worse `git blame` on a frozen document and chose to defer. But *frozen* describes the contract's **content** — the routes and schemas six parallel agents built against — and says nothing about how its bytes are wrapped. Deferring on that basis protected the file from a convention the whole repo follows, for no benefit.

⚠️ **A second, mechanical error is worth more than the first.** `reflow-prose.mjs` with no flag is a **dry run** that prints `ok <file> 92 → 76 lines` — which reads exactly like success. It was run that way, reported as done, and had changed nothing; `--write` is the flag. An instrument whose dry-run output is indistinguishable from its success output will be misread, and was.

**The original filing, unedited:**

### `[P3 · XS · Sonnet5-Low]` `docs/API-CONTRACT.md` is the one hard-wrapped markdown file in the repo *(filed 2026-09-05)*

`reflow-prose.mjs --check` reports 92 → 76 lines on it, and has since before this session. Left alone deliberately: reflowing rewrites every line of a **frozen** document, which makes its `git blame` worse for a formatting win. Worth doing the next time the contract changes substantively anyway, not as its own commit.

## ✅ The wipe has nothing to compare on the common path — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed, and the filing's own diagnosis was WRONG — which is the more useful half of this entry.**

It blamed a missing thumbnail route in `API-CONTRACT.md`. That route matters for showing a rendered output written outside `web/`; it has **nothing to do with the seam**. The answer-pair route (`POST /api/assets/{id}/preview`) existed, worked, and was covered by tests the whole time. `web/wipe.js`'s `loadPair` — the fetch, the two synced canvases, the conspicuity gate, the card fallback — was built, exported and **called by nothing**. The fix was a caller.

⚠️ **Wiring it then exposed two further failures, both silent and both plausible-looking:**

1. `--assume-protect`/`--assume-remove` were sent **without `--auto`**, the flag they answer, so both sides rendered identically — 0 differing alpha px, on one frame and on the full asset. With `--auto`: **2,047** on the sampled frame.
2. `data-single` was never cleared when wipe.js took the element over, so CSS kept the seam, the right tag and the second canvas hidden. The pair displayed as one picture with one label.

Each failure independently drove the app into its **question-card fallback**, which is the correct designed behaviour below the visible-difference threshold — so the app looked healthy while measuring nothing.

Verified in the real window: two canvases, a seam bar at the midpoint, tags "keep it" and "cut it", **2,043 differing alpha px**, region fraction 0.33. `npm run gate:ui` now fails if the two answers do not differ.

⚠️ **The thumbnail route is still absent and is still not filed** — nothing currently needs it. If a use appears (serving a rendered output from outside `web/`), file it then, on its own evidence.

**The original filing, unedited:**

### `[P1 · M · Opus5-High]` The wipe has nothing to compare on the common path, and the blocker is a route that does not exist *(filed 2026-09-05, from the design audit)*

The seam is the product's thesis — two answers on one clock, so you judge an edge instead of trusting a claim. On the common path it currently shows **one image and says "not cut yet"**, which is honest and is not the thesis.

It refuses to lie deliberately: `web/app.js` gates the cut side on `j.output_path.includes('/web/assets/')`, so an output written anywhere else is not claimed as cut. **That gate is correct and must not be widened.** The real gap is underneath it: **`docs/API-CONTRACT.md` has no thumbnail or output-file route at all**, so a render written outside `web/` cannot be served to the browser under any circumstances.

**Two candidate fixes, and they are not equivalent.** (a) Add a served-output route to the contract — the smaller change, and it makes every rendered asset comparable, not just the wipe. (b) Wire the answer-pair preview (`POST /api/assets/{id}/preview`, which already returns `a_url`/`b_url` and works) into the default view rather than only into the question flow. **(b) is closer to the thesis** — answer-A against answer-B is what `server/preview.py`'s own header says a before/after cannot do — but it only applies to assets that *asked* a question. Most do not. The honest answer is probably both, (a) first.

⚠️ **Do not "fix" this by comparing source against output and calling it the seam.** `server/preview.py:1-20` records why that pair cannot discriminate, and `docs/PLAN.md` 3.3 records that the prototype's version of exactly that mistake looked finished.

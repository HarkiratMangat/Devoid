# Devoid — deferred list

The project-local tracker for open work, real TODOs, and reminders specific to this repo. Created 2026-09-05 00:07 EDT, following the conventions of `/Applications/Claude Code/Gif-Background-Remover/gif-deferred-list.md` — same tags, same conservation rule, same "open work only" split. `/Applications/Claude Code/meta-deferred-list.md` stays the canonical home for things with no single-project home; this one is for anything a session working *only* in Devoid would need.

**Why it exists.** Every item below spent this repo's first build session as prose in a session transcript or in `docs/HANDOFF.md`, which is a file that gets **superseded and renamed** by design. A tracker that survives its own handoff is the difference between deferred work and forgotten work.

**This file holds OPEN work only.** Closed items move to `devoid-resolved-list.md`.

**The conservation rule — one item removed here MUST equal one item added to `devoid-resolved-list.md`.** Never delete an item; move it, keeping its original wording and adding the outcome. ⚠️ **Unenforced here.** The gif repo gates this with `python3 scripts/audit_docs.py --diff <base>`, because "tidying" and "deleting" look identical in a diff. Devoid has no equivalent yet — that is item 14 below, and until it lands the rule is honour-system.

**Priority & effort tags** (canonical legend at `meta-deferred-list.md`): every open item carries `[Priority · Effort · Model-effort]`.
- **Priority:** P0 now (broken/blocking) · P1 soon · P2 eventually (real, not pressing) · P3 someday.
- **Effort:** XS minutes · S part of a session · M a session · L its own multi-session job (must carry a named first slice).
- **Model+effort:** from the priority-tier grid in the meta file, not from the effort tier.

**Related trackers.** The engine is a separate repo with its own list: `/Applications/Claude Code/Gif-Background-Remover/gif-deferred-list.md`. **No item about image processing belongs here** — Devoid reimplements none of it (`CLAUDE.md`). Items where Devoid is the *consumer* of an engine gap are filed in both, with a pointer each way.

---

## 🐞 Open — real TODOs with an available fix, not yet done

### `[P2 · M · Opus5-High]` The "Why it works this way" table needs a redesign *(filed 2026-09-08 00:01 EDT)*

Harkirat: *"your idea for a 'why it works this way' section isn't wrong, but the execution needs a redesign someday. not right now."*

**What is wrong with the execution, as far as it has been diagnosed.** Three columns of prose at equal weight, read left to right five times; the third column carries measurements, a design rationale and a restatement in the same visual slot, so nothing tells you which rows are evidence and which are argument. One row was **ambiguous enough to be unusable** — *"on two real files"* named neither, and correcting it uncovered that this session had **invented one of the two filenames**. A table that can hold an uncheckable claim without looking odd is a table with the wrong shape.

**Not scoped.** The redesign is the work; possibilities include splitting measured claims from design principles, or dropping the table for a short list with each measurement beside the thing it measures.

### `[P1 · M · Opus5-High]` The region mark is a BOUNDING BOX where it should be the disputed pixels *(filed 2026-09-07 23:39 EDT)*

`web/app.js:578-586` reads `r.bbox_xyxy` and sets `left/top/width/height` — an axis-aligned rectangle. The disputed region in the corpus's megaphone is a **diagonal white band** inside the cone, so the rectangle covers the band, the yellow bar beside it, the navy outlines and a corner of background, **and still clips the band's ends**.

Harkirat, looking at the shipped capture: *"what is it even highlighting and asking? the white band inside the megaphone? then why is it a vertical rectangle? why is it also highlighting parts of the background and the yellow and the outlines? why doesn't it fully shade/cover the entire white band?"* Every one of those has the same answer — it is a bbox, not a shape.

🔴 **THIS IS THE PRODUCT'S CENTRAL CLAIM, HALF-DELIVERED.** `docs/PRODUCT.md`: *"the question is visual; delivering it as text is the failure."* Devoid moved the bounding box out of prose and onto the artwork, which is real progress, and then stopped — a rectangle over the wrong pixels is a third state: visual, and still not the question.

**Concrete next action, and the data is already there.** The dispute is defined **by colour** (`outline_color`), and the app already answers per colour and never per region — so the correct mark is *the pixels inside that bbox that match the colour*. `web/wipe.js` already decodes frames to canvas and composes them; a per-pixel colour test on one decoded frame is the whole feature. Draw it as a mask (a canvas overlay, or an SVG path from a marching-squares trace) instead of a `div`.

⚠️ **THE README SCREENSHOT MUST BE RE-CAPTURED AND SWAPPED WHEN THIS LANDS.** `docs/shots/the-question.webp` is the hero of the README and it shows the bbox. Shipping it now is deliberate — Harkirat: *"ship the screenshot as is. document it in deferred list that the screenshot needs recapturing/swap after the feature is correctly built."* The capture is `scripts/capture-window.mjs`'s `02-open-question`, cropped to 1930x800 at +420+230. ⚠️ The claim *"instead of a hex code **and a bounding box**"* was removed from the README in the same pass, because that half was contradicted by its own picture; it goes back when the mark is real.

### `[P2 · S · Sonnet5-High]` The seam is offered on a provisional threshold, and nothing says so *(filed 2026-09-07 20:58 EDT)*

`server/preview.py:57` sets `SEAM_THRESHOLD = 0.02` under a comment reading **"⚠️ Provisional threshold"**. It decides `seam_useful`, which decides whether the person is offered the app's headline interaction or the question card instead. **A provisional constant silently choosing the interaction is the same defect as a provisional number silently choosing a verdict** — and this repo's founding rule is about the second.

⚠️ **Its failure mode has already been observed in this repo.** When it wrongly returns true you get a seam whose two sides look identical — which is exactly what `09-seam.webp` showed, and why that screenshot was removed from the README tonight.

**Concrete next action:** derive it against the corpus the way `preview.py:49-51` derived the 0.003 companion, or surface it — if the app is unsure the two answers differ, say so rather than presenting a seam as though it does.

### `[P2 · XS · Sonnet5-High]` The lamp needs a word beside it to be legible *(filed 2026-09-07 20:58 EDT)*

`web/index.html:34` carries its own diagnosis: **"Nobody maps 'emitting' to 'light mode' from a control alone"** — so a `lamp-word` reading `void` was added next to it. **A control that needs an adjacent word to be comprehensible has the wrong label**, and the fix was to add a second element rather than change the first.

⚠️ **Not a rename to Light/Dark.** `docs/PRODUCT.md` makes the void world binding and the vocabulary is a real identity choice. The honest resolution is to accept that the *word* is the control and stop treating the icon as one.


### `[P1 · S · Sonnet5-High]` `09-seam.webp` does not show a seam doing anything *(filed 2026-09-07 20:28 EDT)*

The capture is of the seam view, and **both sides of the divider look identical** — the one thing a seam exists to show, two different renders of the same file, is not visible in the shot of the seam. The dashed divider is a 1px line on a dark ground. It was in the README for a day captioned *"a draggable wipe divider between two renders of the same asset"*, which the picture did not support.

**Found by looking at it.** Four README screenshots had been described from their alt text and filenames through several passes; opening them showed that **three of the four were the same screen** — the megaphone open view with a different right rail — and a reader could not tell them apart. Harkirat: *"wtf do those screenshots even show? I'm SOO confused looking at them, AND IM LITERALLY THE MAIN USER."*

**Removed from the README** rather than left with a caption it cannot support. **Concrete next action:** in `scripts/capture-window.mjs`, drag the seam to roughly 40% before `shot('09-seam')` and pick an asset whose two answers differ visibly, then crop to the divider. The other three are now crops (`the-question`, `needs-you`, `verdict`, `not-checked`) and read at a glance.

### `[P1 · S · Opus5-High]` A packaged app cannot be pointed at a different engine *(filed 2026-09-07 16:26 EDT)*

Both documented overrides fail once the app is a `.app` rather than a checkout. **`$DEVOID_SKILL` never reaches an app launched from Finder or the Dock** — a GUI process does not inherit a shell environment. And `devoid.config.json` is looked up at `REPO_ROOT`, which `main.js:21` points at `process.resourcesPath` when packaged: **inside the bundle**, where writing breaks the signature and the next install wipes it.

So a packaged Devoid can only ever find the engine at the hardcoded fallback. The README documents `launchctl setenv DEVOID_SKILL <path>` as the workaround, which works, and is not something a user should have to know.

**Concrete next action:** look for `devoid.config.json` in `~/Library/Application Support/Devoid/` before the bundle-relative path — the directory the app already owns and already writes to. One `or` in `resolve_skill()`, plus the same lookup in the dialog's detail text so the message names a path the user can actually create.


## ✅ Considered and NOT fixed — a real decision, not an oversight

### Notarisation, self-updates and a screen-reader pass are NOT being done *(decided 2026-09-07 11:05 EDT)*

⛔ **Harkirat, 2026-09-07 11:05 EDT:** *"Notarisation · self-update · screen reader we can't do because i dont have the paid apple developer ID, and i dont plan on paying for it anytime soon so no need to bring this up again and again. Screen reader i dont care about at this stage, thats something WAYY WAYYYY down the road if i feel like it someday."*

**Do not re-file these, and do not raise them in a status report.** They were open for two days and surfaced in every summary, which is the cost this entry exists to stop.

**What each one actually needed, kept so nobody re-derives it:**

- **Notarisation** — an Apple Developer Program membership. `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` stay unset and `notarize: false` stays. ⛔ **Never fabricate them to make it testable.** The self-signed `DEVOID` identity is real and produces a verifiable seal on THIS Mac; it satisfies Gatekeeper nowhere else and never will.
- **Self-updates** — blocked by the same thing, plus a second independent blocker: Squirrel.Mac validates a downloaded update against a signature the *destination* machine trusts. `Check for Updates…` tells you a release exists and opens its page, deliberately, rather than shipping a code path guaranteed to fail.
- **Screen reader** — roles, names and states are present and correct as written, and six accessibility findings were fixed from markup. What has never happened is a VoiceOver pass with a person listening, which needs a person listening.

**If an Apple Developer ID ever arrives**, the first two become live again in this order: certificate → `notarize: true` → a published Release carrying the `.dmg`, the `.zip` and `latest-mac.yml`.


*Anything here has been looked at and deliberately left. Reopening one needs a reason the entry does not already answer.*

### `server/preview.py`'s `SEAM_THRESHOLD` is superseded and stays exposed

`web/wipe.js` does not read `seam_useful` at all — it computes its own client-side gate (a conspicuity score: differing-pixel fraction × mean |Δalpha|/255, threshold 0.003, plus a 0.02 region-fraction floor), derived by measuring the three real ambiguous-protection regions in this corpus. The server's cruder single-number version is **kept deliberately**, documented as superseded in its own docstring, as a second opinion for a consumer with no decoded frames to measure from — a server-side batch view, say. ⛔ Deleting it because "nothing uses it" would remove the only server-side answer to a question the server may be asked later.

### The preview ledger reports `art: None` rather than a number it could compute

`server/preview.py:_ledger` deliberately refuses to derive `art` from a re-encoded single frame, because `scripts/measure_ledger.py` derives it from the **source's** non-background pixels. Quoting a number measured against a different image is exactly the "verification the run did not earn" `PRODUCT.md` forbids. The seam compares `bg`/`total` between the two answers, which is what the question is actually about.

### In-flight jobs from a crashed run are surfaced, never auto-resumed

`server/app.py`'s lifespan calls `journal.recover_orphans()` and **logs** them. Auto-resuming would restart a subprocess render the person did not ask for, possibly against a source that has since moved. Surfacing without resuming is the honest state; `not-checked` is a first-class state in this product for the same reason.

### `/api/engine/concurrency` is outside the frozen contract, on purpose

`docs/API-CONTRACT.md` is frozen and this route is not in it. It exists so a run's log can say **why** it chose a worker count (the harness's own `default_jobs()`) instead of leaving a reader to guess. Adding it to the contract would imply a stability promise the number does not have.

### The corpus assets in `web/assets/` are real skill outputs and stay that way

`CLAUDE.md` states this and it has already paid: putting real art in is what found the rubylith-over-red bug that drawn icons had hidden. ⛔ Do not replace them with synthetic icons to make a layout look tidier.

---

## 🔔 Reminders / watch-for

### Cross-repo: the engine's `build_parser()` is merged, and the gif tracker still lists it as open

`server/flags.py` depends on `build_parser()` in the skill repo. It **shipped** — `refactor(cli): extract build_parser(), fix the labels-log pointer` (PR #20, `cc02a40`), merged 2026-09-05. `gif-deferred-list.md` still carries it as an open `[P1 · XS · Sonnet5-Med]` item; under that repo's own conservation rule it belongs in `gif-resolved-list.md` with its outcome. **Flagged, not fixed from here** — moving it is that repo's session's job.

### If `labels/protection.jsonl` ever moves, fix the pointer in the engine repo

`scripts/harness/labels/README.md` there points at this path, because nothing on that side would otherwise surface it. `CLAUDE.md` carries the same warning; it is repeated here because a path move is the kind of change that happens for an unrelated reason.

### `docs/HANDOFF.md` is written to be superseded — do not file durable work in it

The convention is to rename it `<date>-handoff.superseded.md` and write a new one. **Anything that must outlive one session belongs here, in `docs/DEVLOG.md`, or in `docs/CHANGELOG.md`** — three files that are appended to, not replaced. This whole tracker exists because the first build session's open items were sitting in a file designed to be thrown away.

<details><summary>Original filing — self-updates (kept, not deleted)</summary>

**`[P2 · M · Opus5-High]` Devoid cannot install its own updates, and the blocker is signing *(filed 2026-09-05)*

**Check for Updates… tells you a release exists and opens its page. That is the whole feature, and it is deliberately not more.** `electron-updater` on macOS delegates to Squirrel.Mac, which **validates the code signature of the downloaded update** — an unsigned build cannot install one. Wiring it today would ship a code path guaranteed to fail at runtime, which this repo treats as worse than not shipping it.

⚠️ **A self-signed certificate does not change this** (2026-09-06). The app is now signed and `codesign --verify --deep --strict` passes, and the updater is still blocked: Squirrel.Mac validates the downloaded update against a signature the *destination* machine trusts, which a self-signed certificate is not.

**Blocked on, in order:** a Developer ID Application certificate and an Apple ID (`[P2 · S · Sonnet5-High]` "Signing and notarisation are configured and have never run"), then a published GitHub Release carrying the `.dmg`, the `.zip` and `latest-mac.yml`, which `electron-builder` emits on a signed build.

⚠️ **A second blocker nobody would find until it failed: the repository is PRIVATE.** GitHub's releases API answers 404 to an anonymous caller for a private repo, exactly as it does when nothing is published — so even a signed auto-updater would find nothing until the repo is public or the app carries a token. **Do not ship a token in the app** to work around that; make the repo public, or the release feed public, instead.

</details>

<details><summary>Original filing — notarisation (kept, not deleted)</summary>

**`[P2 · S · Sonnet5-High]` Notarisation is configured and has never run *(filed 2026-09-06, successor to "Signing and notarisation are configured and have never run")*

**Signing now runs and the entitlements are proven** — a self-signed `DEVOID` identity, `mac.identity` in `electron-builder.yml`, verified 2026-09-06 17:29 EDT. What remains is the half a self-signed certificate cannot reach. `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` stay unset and `notarize: false` stays, because notarisation requires an Apple Developer account and a Developer ID Application certificate, neither of which exists.

⚠️ **The self-signed build does NOT satisfy Gatekeeper anywhere but this Mac.** The `.dmg` and `.zip` in `dist/` carry a valid seal and a Designated Requirement, and a copy downloaded onto another machine will still be refused — it is not Apple-issued and it can never be notarised. Treat the artifacts as local builds, not as something to hand to anyone.

⛔ **Never fabricate signing credentials to make this testable.** The three notarisation variables stay unset until real ones exist.

</details>

<details><summary>Original filing — screen reader (kept, not deleted)</summary>

**`[P2 · S · Sonnet5-High]` No screen reader has ever run against this app *(filed 2026-09-05)*

Every accessibility finding — six were fixed — came from **markup and computed accessible names**, never from an actual AT run. Roles, names and states are present and correct as written; whether VoiceOver announces the eleven states, the roving-tabindex region tools and the seam usefully is unknown.

**Concrete next action:** a VoiceOver pass on the three flows that matter — open an asset, answer a question, save — and record what it says, not whether it "works".

</details>

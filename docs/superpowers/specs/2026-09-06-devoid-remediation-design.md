# Devoid — remediation spec

*Written 2026-09-06 00:22 EDT. The evidence register behind `docs/superpowers/plans/2026-09-06-devoid-remediation.md`. The plan argues from this document; read both.*

**Origin.** Harkirat, 2026-09-06 23:49 EDT: *"they're super boring"* and *"they're terrible UI experience and need DRASTIC redesigns"*, against every interface, page, button, accent, element, navigation and menu in the app.

## How this was produced

Six scoped agents ran concurrently against the real app, all report-only — parallel writes to `web/app.css` would have collided, so one process owns every edit.

| # | skill · command | brief |
|---|---|---|
| 1 | `impeccable critique` | every surface individually, heuristic-scored |
| 2 | `impeccable bolder` | where the design plays safe, and the missing signature moment |
| 3 | `impeccable audit` | a11y, performance, responsive, implementation integrity |
| 4 | `interface-design` | the four checks as procedures — swap · squint · signature · token |
| 5 | `design:design-critique` | the structured framework, severity-ranked |
| 6 | adversarial stress test | break every control, state, string and nav path |

Agent 6 was the only one that **drove the real app** — two throwaway Electron probes on ports 8781/8783, real input events rather than `.click()`. The other five read code and read the nine captures at `local/window-shots/`. None opened a browser pane; `docs/DEVLOG.md` records that surface producing two false defect claims.

⚠️ **Agent 6 appended a synthetic row to `labels/protection.jsonl`** while driving an answer through the UI — tracked evidence, protected by a warning in `CLAUDE.md`. Reverted with `git checkout` at 2026-09-06 00:22 EDT. Recorded because a review agent silently writing to the project's evidence log must never pass unremarked.

### Evidence marks used in this document

- **VERIFIED** — re-checked in this session by grep, by arithmetic on the tokens, by `fontTools`, or by a live measurement in a real Electron window. Every finding driving a task carries this mark.
- **REPORTED** — an agent's finding, plausible, not independently re-checked here. Marked so nobody promotes it to fact.
- **RETRACTED** — asserted earlier in this project and shown false. Kept, because the correction is the useful part.

### Arbitration rules, fixed BEFORE the reports landed

Decided in advance so the merge could not become "agree with whoever argued best".

1. **Anything contradicting a measured decision is rejected**, however well argued.
2. **Anything already in `devoid-deferred-list.md` is not a new finding** — it may sharpen an existing item, never re-file it.
3. **Agreement across agents is weak evidence, not strong.** They share priors and read the same four docs. Weight a finding by whether it names a specific element and value, not by how many reports mention it.
4. **A finding verifiable in code or pixels beats a confident assertion.** Two false defects have already been asserted in this repo from unvalidated measurement.
5. **Copy findings are cheapest to accept and easiest to get wrong** — every proposed string is checked against `PRODUCT.md`'s voice (assumes competence, does not teach).

---

## The diagnosis

**The interface is not badly designed. It is disconnected.**

Four systems that would fill the working surfaces with meaning are built, tested, exported, and wired to nothing. What remains on screen is a hex string, a bbox array, nine controls that all read `auto · off`, and a bright green swatch — around a 289px picture in a 1280px window.

Three agents independently, and one prior session's own pass, converged on the shape: **the atmosphere is inversely correlated with where the work happens.** The empty table gets a 196px animated accretion disk and a 44px headline; the coin-flip protection question — 10.2% of assets, irreversible, artwork-destroying — gets a 15px `h3` and two 34px grey outline buttons.

The mechanism, which only the adversarial pass could find: the expressive vocabulary **exists** — a ruby hatch registered to source pixels, a 34-cell film strip, a draggable seam, an advice rail — and every piece of it that was supposed to reach the foreground is unwired. The world does not stop at the backdrop by design. It stops there because the wires are cut.

### The systemic property this exposes

Counting reachability instances now known: the plotter (shipped `hidden`), the history routes (no caller), `devoid:regions-changed` (dispatched on `window`, heard on `document`), `devoid:asset-opened` (heard, never dispatched), the journal writers (never called), `loadPair` (no caller) — the six `docs/DEVLOG.md` calls the project's signature failure. Add, from this review: the seam's drag handlers, `.qregion`'s guard, `seekToFrame`, `play`/`pause`, all of `advice.js`, the swatch selected-state CSS, the `.flag` notch CSS, and `.ledger-bar`. **Fourteen.**

⚠️ **The UI gate added on 2026-09-06 to catch exactly this class took nine clean captures of a seam that cannot be dragged.** It asserts geometry and DOM presence. Presence is precisely what a disconnected subsystem has. **This project's verification proves things EXIST and has never proved they are CONNECTED**, and its authors — including this session — keep reading existence as function.

**That is the finding the plan is built around, and it is why Stage 1 changes the gate before it changes the app.**

---

## Register of findings

Ordered by stage. Every entry: what, where, evidence, why it matters, decision.

## Stage 1 — CONNECT

### F1 · The seam cannot be dragged, by mouse or keyboard — **VERIFIED**

**Where:** `web/app.js:576` (`const wipeCtl = new AbortController()`), `web/app.js:594-600` (three listeners registered with `{signal: wipeCtl.signal}`), `web/app.js:1472` (`releaseWipe() { wipeCtl.abort(); ... }`), `web/wipe.js:409-410` (`mountCanvases` calls `releaseWipe()`).

**Evidence.** `rg "pointerdown|pointermove|keydown" web/wipe.js` returns only the question card's click handlers and a `matchMedia` listener — **wipe.js attaches no replacement.** Agent 6 measured in a real window with the pair mounted: a real `mouseDown` at 50% → four `mouseMove` → `mouseUp` at 82% left `S.seam 50`, `--seam 50%`; five real `ArrowRight` presses with `document.activeElement.id === "wipe"` left `S.seam 50`.

**Why it matters.** `PRODUCT.md`: *"render both and let the person **drag a seam between them**. That is the product."* `DESIGN.md`: *"the app's signature gesture is dragging a cut line between two versions of an image."* The element still advertises the gesture — `cursor:ew-resize`, a rendered drag handle, `role="slider"`, `tabindex=0`, `aria-valuemin/max`, `aria-label="Drag to compare…"`. Everything promises a drag; nothing delivers one. `wipeOwned` is never reset and `wipeCtl` is a one-shot `AbortController`, so it is permanent for the session.

⚠️ Both files reason at length about why the handover is safe (`app.js:1470-1471`, `wipe.js:404-408`) and neither notices that nobody picks the element up. `wipe.js`'s own comment says app.js's handlers *"only ever touch the shared --seam CSS variable"* — which is the argument for not aborting them.

**Decision.** Do not abort. `releaseWipe()` sets `wipeOwned = true` and nothing else. Add `Home`/`End` while there. Add `aria-valuetext` so the slider announces a side, not a bare number.

### F2 · The disputed region is never drawn on the artwork — **VERIFIED**

**Where:** `web/app.js:419-470` (`renderQuestionRegions`), specifically `app.js:427` (`const sw = art.naturalWidth`) and the early return at `app.js:429`; killed by `web/wipe.js:420` (`before.hidden = true; before.removeAttribute('src')`).

**Evidence.** Removing `src` makes `naturalWidth` 0, so line 429 returns. Agent 6 measured with a question open: `qregionCount: 0`, `beforeNaturalW: 0`, `beforeHidden: true`. Confirmed in pixels — nothing marks the region in `02-open-question.png` or `09-seam.png`. The `ResizeObserver` at `app.js:469` re-runs the function faithfully, forever, to no effect.

**Why it matters.** The function's own header says: *"PRODUCT.md's whole thesis: the coin-flip question is a VISUAL one … Light the disputed region on the artwork itself."* It has never lit one.

⚠️ **This is a regression introduced on 2026-09-06 by this project's own seam wiring.** Before `loadPair` had a caller, `#before` kept its `src`, `naturalWidth` was real, and the marks drew. The seam and the region marks were traded for each other.

**Decision.** Measure against the decoded canvas, not the dead `<img>` — `#wipe-a`'s `width`/`height`, with `Devoid.wipe.sides().a` as the accessor. Call `requeryRegions()` at the end of `loadPair`.

### F3 · Consequently the app ships the exact string `PRODUCT.md` says it exists to abolish — **VERIFIED**

With F2 dead, the only description of the disputed region is the questions panel, read live as:

> **The place outlined in 002864** `[94, 56, 164, 145] · encloses on 102 of 144 frames`

`PRODUCT.md` line 31: *"Nobody can answer 'is the region at bbox [230,135,406,359] outlined in 002864 design or background?' by reading it. **They have to see it.** That is the product."*

**Decision.** Closed by F2. No separate work.

### F4 · The question card is sticky — it survives navigation and shows the wrong asset — **VERIFIED (reported measurement, mechanism confirmed by reading)**

**Where:** `web/wipe.js:611-615` (`showCard`), `web/app.js:1099-1119` (`maybeLoadSeamPair`).

**Evidence.** `showCard(on)` sets `#wipe.hidden = on` and `#qcard.hidden = !on`, and is called **only** from inside `loadPair`. `maybeLoadSeamPair` returns early whenever there is no unanswered colour group (`app.js:1109`); nothing in app.js ever touches `#qcard`. Agent 6 measured: card shown on megaphone, then `openAsset(rocket)` → `{ open: "rocket", wipeHidden: true, qcardHidden: false }` — **megaphone's card over rocket, with rocket's artwork hidden.** Same trap after answering.

**Why it matters.** The card is the designed fallback for the small-region case the corpus contains, so this is on the normal path.

**Decision.** `showCard(false)` unconditionally at the top of `maybeLoadSeamPair` and in `openAsset`.

### F5 · Any file outside `web/assets/` shows no artwork anywhere — **VERIFIED**

**Where:** `web/app.js:65` — `const artUrl = a => a.url || ` + "`assets/${base(a.path)}`" + `;` — consumed at `app.js:236` (sheet tiles) and `app.js:1263` (`#before`).

**Evidence.** `artUrl({path:'/Users/x/Downloads/best-value.gif'})` → `assets/best-value.gif` → 404. On the sheet, `img.onerror` hides the image and adds `.noart`, a flat `--well` rectangle. In the open view **there is no error handler on `#before` at all** — the stage goes blank.

**Why it matters.** `docs/DEVLOG.md`'s "first real use" section celebrates a completed run on `~/Downloads/Diors-builds Emojis/best-value.gif`. **Nobody checked whether the person could see the picture. They could not.** The corpus is the only input this app has a visible interface for — and every screenshot reviewed for two days has been of the corpus.

⚠️ The comment at `app.js:59-64` defends this: *"the contract defines no thumbnail route … adding one is a contract change, so it is reported, not improvised."* But `server/app.py:325` already routes `/api/preview-files/{key}/{name}` and serves arbitrary generated image bytes from outside `web/`. The machinery exists; the app declines it on a procedural argument. Net effect: **Devoid shows a user's own artwork only in the ~10.2% of cases where a coin-flip question fires** (the preview pair travels that route) and a blank box the other ~90%.

**Decision.** Add `GET /api/assets/{id}/source` to `server/app.py`, streaming the registered path with a path-traversal guard, and set `url` in `Asset.public()`. This is a contract addition and `docs/API-CONTRACT.md` must record it.

### F6 · `seekToFrame` is built, exported, documented as the strip's hook, and has zero callers — **VERIFIED**

**Where:** `web/wipe.js:491` (`function seekToFrame(index)`), exported at `web/wipe.js:804`. Consumer that should call it: `web/app.js:649` (`renderFilm`), whose click handler sets `S.frame` and re-renders.

**Evidence.** `rg seekToFrame web/` returns the definition, the export, and nothing else.

**Why it matters.** `#fcount` reads `0 of 144 frames` — **a playhead readout for a playhead that does not exist.** Clicking a frame re-labels the counter and the artwork does not move.

⚠️ **Challenges a filed item.** `devoid-deferred-list.md`'s "The film strip counts frames and cannot scrub" says frame-accurate seeking *"needs the canvas decoder … that the wipe already has half of."* **It has all of it.** Two lines wire it. The filed item also omits the sharper problem: the strip *asserts* a playhead it does not have, which is an honesty violation rather than a missing feature.

**Decision.** Wire it. Re-file the deferred item with the corrected mechanism.

### F7 · `advice.js` — 172 lines, zero callers — **VERIFIED**

**Where:** `web/advice.js` in full; loaded by `web/index.html:122`.

**Evidence.** `rg --hidden -uu -l 'Devoid\.suggest|suggest\('` across the tree, excluding `dist/` and `node_modules/`, returns `web/advice.js` and one unrelated vendored Python file. Nothing in `app.js`, `wipe.js` or `canvas.js` calls it.

**Why it matters.** `CLAUDE.md` and `PRODUCT.md` both make *"Advice always ships with an undo of exactly what it changed. A suggestion without one does not ship"* non-negotiable. **The app has never given a single piece of advice.** The module even throws a `TypeError` if a caller omits the undo — a guard that has never run.

**Decision — OPEN, see D1.** Wire it or delete it. Not a call to make silently.

### F8 · The gate proves existence, never connection — **VERIFIED**

**Where:** `scripts/capture-window.mjs`.

**Evidence.** Twelve assertions, all geometric or presence-based. The seam has been undraggable throughout and nine green captures were taken of it. Separately, `07-arrival.png` **is not the arrival**: `capture-window.mjs:159` sets `S.arrivalUsed=false` and re-adds paths but never resets `S.drawer` (left at `'what you did'` by step 06) and never closes the asset opened at step 02 — the file shows an open asset under the history drawer. **The app's one orchestrated moment has never been captured.** The byte-distinctness check added on 2026-09-06 catches identical frames and cannot catch a correct capture of the wrong state.

**Also uncaptured, therefore unverified in the real window:** `.qcard`, `#regiontools`, `.banner`, `.ledger-bar`, and every one of the refused / failed / conflict / blocked / cancelled states.

**Decision.** The gate must drive input and assert consequence. Six lines — one `sendInputEvent` drag plus one `S.seam` read — would have caught F1.

---

## Stage 2 — STOP LYING

Every finding here breaks a rule this project wrote down and asserted it was following.

### F9 · All nine tri-state controls read `auto · off`, and `off` is false — **VERIFIED**

**Where:** `web/app.js:918` — `const show = v => v === null || v === undefined ? 'off' : ...`

**Evidence.** Every argparse default is `None`, so every untouched row renders `auto · off`. Agent 6 read live: *the edge* → `Trim auto · off`, `Soften auto · off`, `Dither auto · off`; *what to keep* → `Kept region auto · off`, `Cut region auto · off`, `Follow it auto · off`.

**Why it matters.** `PRODUCT.md`: *"Every control therefore reads `auto · <value>` until it is deliberately taken over. This … doubles as the best affordance in the app: the inspector is a live readout of the tool's own reasoning."* **It reads out nothing** — nine controls, one word. And `off` is a factual claim that erosion is off, that dithering is off. The value is *undecided*; `--auto` will pick one.

**Decision.** `show(null)` → `the tool decides`. Where `--recommend` has run, show the recommended value — that JSON is already on `S.assets[].questions`.

### F10 · Taking a control over silently changes its value — **VERIFIED**

**Where:** `web/app.js:736` and `web/app.js:919` (`const defaultFor = f => f.type === 'bool' ? true : (f.choices && f.choices.length ? f.choices[0] : '')`).

**Evidence.** Clicking `auto · off` on a bool sets `S.overrides[dest] = true`. Clicking a choice flag jumps to `choices[0]`.

**Why it matters.** The gesture reads as *"let me hold this"*. It silently flips the value. Nothing says so.

**Decision.** Take over at the value currently displayed. If that is "the tool decides", the first click arms the row without committing a value, and the row shows the recommendation as the starting point.

### F11 · The banner prints raw system enums as its headline word — **VERIFIED**

**Where:** `web/app.js:400` — `$('#bannerword').textContent = S.banner.state.replace('-', ' ');`

**Evidence, live consequences:**

| situation | headline shown |
|---|---|
| confirming a batch cut (`app.js:1019`) | **`conflict`** — "Cut all 3? Each one is written beside its own file" |
| a **successful** escalated save | **`conflict`** — "Something was already called X — this one went to Y" |
| loading a history line | **`not checked`** — "Loaded settings from that run…" |
| saving with a question outstanding | **`blocked`** |

**Why it matters.** `DESIGN.md`: *"The vocabulary is a person's, not the system's."* Every banner headline is the internal enum, and two of them shout a failure word over a success or a routine question.

**Decision.** Map each state to a human word — `Heads up`, `Saved`, `Answer first`, `Nothing checked yet`. The pencil mark keeps carrying the semantics.

### F12 · Answering the question destroys the only numbers on screen — **VERIFIED (measured before/after)**

**Where:** two unsynchronised writers to `#ledger` — `web/app.js:606` (`renderLedger(a)`) and `web/wipe.js:522` (`renderLedger(ledgerA, ledgerB, tags)`).

**Evidence.** Agent 6, before and after pressing Keep it → Answer:

| | `#ledger` |
|---|---|
| before | `keep it removes 52,011 background px · 15,589 px of artwork survive   cut it removes 54,058 background px · 13,542 px of artwork survive` |
| after | `not checked — nothing was measured on this one` |

`app.js:1291` calls `renderLedger(a)`, which reads `j.ledger || a.ledger` — both null — and overwrites the seam's two-sided ledger. The state word flips to `ready` simultaneously, **so the app says `ready` and `not checked` about the same asset in the same breath.**

**Why it matters.** `not-checked` is designed as the honest state. Here it is a false negative that erases a measurement that *was* taken, in the widget `PLAN.md` calls the honesty widget.

**Decision.** One writer. wipe.js stashes `ledgerA`/`ledgerB` on `window.Devoid`; `app.js:renderLedger` prefers them while `wipeOwned`.

### F13 · An answered question cannot be revised, and there is no undo — **VERIFIED**

**Where:** `web/app.js:566` — `patch(a.id, { state: ..., questions: null })`.

**Evidence.** With `questions` nulled, `renderQuestions` hides `#questions`, `colourGroups` returns `[]`, and `maybeLoadSeamPair` early-returns. Agent 6 measured after answering: `questionsHidden: true`, `state: "ready"`, and the seam still showing both hypotheses **with no indication which was chosen.** No route, button or menu item re-opens it.

**Why it matters.** `CLAUDE.md`: *"Advice always ships with an undo of exactly what it changed."* The most consequential, explicitly coin-flip decision in the product is the one thing that cannot be revised — while `Edit ▸ Undo` sits enabled in the menu bar (`main.js:396-402`, `{role:'undo'}`, the Chromium text role) doing nothing.

**Decision.** Keep the answered question visible and re-openable; add `⌘Z` against `S.answers`; remove or wire the menu's Undo.

### F14 · `0 flagged` and `onion skin · 2 frames` are hardcoded fictions — **VERIFIED**

**Where:** `web/index.html:104` — `<span id="onion">onion skin · 2 frames</span>`.

**Evidence.** `rg onion web/ server/ main.js` returns exactly that one hit — nothing ever updates it, and there is no onion skin: `.frames button` is a flat 40px `--mat` rectangle containing no imagery. `rg flagged server/` returns nothing; `Asset.public()` has no such field, so `· 0 flagged` is permanent and the `.flag` notch CSS (`app.css:210-213`) — `DESIGN.md`'s cited evidence that the strip satisfies the greyscale rule — **has never rendered once.**

**Decision.** Delete both strings until the features exist. Restore them with the features in Stage 1 (F6) where they become true.

### F15 · "answer it and it will go" is a promise the app does not keep — **VERIFIED (mechanism)**

**Where:** `web/app.js:1039` (banner copy), `web/app.js:540` (`submitAnswers`).

**Evidence.** Pressing Cut with a question outstanding shows *"… has a question waiting — answer it and it will go"*. `submitAnswers` deletes the id from `S.blocked` and calls `render()`. **Nothing calls `cut()` or `startCut()`.** The job never goes and nothing says it did not.

**Decision.** Either queue it (`S.pending`, drained on answer) or change the copy to *"answer it, then press Cut it out"*. Prefer the queue — the copy describes the better product.

### F16 · Five vocabularies for one binary — **REPORTED (each string verified individually)**

| where | wording |
|---|---|
| `#questions` (`app.js:494`) | **Keep it** / **Cut it** |
| `#qcard` (`index.html:86-87`) | **Artwork** / **Background** |
| `.wipetag` markup (`index.html:77-78`) | **as it came** / **cut** |
| `.wipetag` at runtime | **keep it** / **cut it** |
| *what to keep* drawer (`app.js:680-682`) | **Kept region** / **Cut region** |
| fade question (`app.js:505-506`) | **It is artwork** / **It is not** |

**Decision.** `Keep it` / `Cut it` everywhere. Delete the dead `as it came` / `cut` literals from `index.html` — `app.js:1268/1271` already overwrites them. Delete `Edit ▸ Cut ⌘X` from `main.js:399`: shipping the platform's clipboard *Cut* in an app whose product verb is *cut* is the worst available collision.

### F17 · Copy defects — **VERIFIED (each string read in source)**

| file:line | now | problem | fix |
|---|---|---|---|
| `index.html:31` | `Save 6` | ships in the HTML, so it is first paint; the count is invented and **"Save" appears nowhere else** | `Cut` |
| `app.js:914` | `…Nothing is cut until you press save` | names a button that does not exist | `…until you press Cut it out` |
| `app.js:1228` | `${q} need you` | subject/verb disagreement at n=1, on the home screen | `${q === 1 ? 'needs' : 'need'} you` |
| `wipe.js:721-722` | `The hatched area is the same colour as the background. It is enclosed on 102 of 144 frames. Is it part of the picture, or is it background showing through?` | 30 words; verbatim the analyst's question `PRODUCT.md` says the app replaces | `This bit is the same colour as the background. Keep it, or cut it?` |
| `app.js:800` | `Nothing refused` | fragment; the good outcome dressed as an absence | `It did not refuse anything here` |
| `app.js:1126` | `it stopped without saying why` | admits it has no information, offers no next step | add a next step |
| canvas tool labels | `Cut anyway`, `Half there` | `Half there` is not a verb and names no action (`translucent`); `Cut anyway` implies overriding a decision never made (`unprotect`) | `Make it see-through`, `Cut it after all` |
| `index.html:113-114` | `Nothing on the table` / `Drop something in` | two lines where `DESIGN.md` specifies one; neither names what to drop | `Drop a GIF, WebP, AVIF, APNG or PNG here` |
| tab rail + drawer `h2` | all lowercase, while `Select all` / `Keep it` are sentence case and `load these settings` is lowercase | three casings coexist against `DESIGN.md`'s sentence-case rule | one casing |

---

## Stage 3 — THE SYSTEM

### F18 · 82% of type sits inside a 1.5px band — **VERIFIED**

**Evidence.** `rg -o 'font-size:\s*[0-9.]+px' web/app.css web/canvas.css` → 37 declarations: 11px ×14, 11.5 ×8, 12 ×5, 12.5 ×4, 13 ×2, 14 ×1, 15 ×2, 26 ×1. **31 of 37 between 11 and 12.5px** — eight steps inside 1.5 pixels, adjacent ratios 1.045 / 1.043 / 1.042 / 1.040, then a 1.73 jump to 26 with nothing between.

⚠️ **This is the same defect a previous session fixed on the width axis** (92/96/108% → invisible), reproduced on the size axis and never checked.

**Decision.** A real scale, tokenised — there are currently **zero type tokens**. `11 · 13 · 16 · 22 · 30 · 44`, plus a mono figure tier for the ledger. Exact values in the plan.

### F19 · The font files ship weight ranges the CSS clamps away — **VERIFIED with `fontTools`**

**Evidence.** `web/fonts/archivo-*.woff2` carry `wght (100, 900)` and `wdth (62, 125)`; `web/fonts.css:10` declares `font-weight: 400 700`. `web/fonts/spline-sans-mono-*.woff2` carry `wght (300, 700)`; declared as two **static** faces at 400 and 500.

**Why it matters.** 200 weight points at each end of Archivo are downloaded and unreachable; the mono's entire axis is unreachable. At 11px, Archivo 500 against 400 is sub-perceptual, so `.crumb b`, `.ledger b`, `#openstate b`, `.hist-verdict` and `.auto` all pay a weight that does not render.

**Decision.** `font-weight: 100 900` for Archivo; one variable face at `300 700` for the mono. Zero new bytes.

### F20 · `font-stretch: 80%` is inert on 8 of 10 selectors that carry it — **VERIFIED**

**Where:** `web/app.css:589` — `.st,.crumb,.bword,.rt-lab,.qhint,.nm,.ledger,.filmhead,.tabs button,.ctl .lab{font-stretch:80%}`

**Evidence.** `.st`, `.crumb`, `.bword`, `.qhint`, `.nm`, `.ledger`, `.filmhead` and `.ctl .lab` all declare `font-family:"Spline Sans Mono",monospace`, whose woff2 has a `wght` axis and **no `wdth` axis** (fontTools, above). Browsers do not synthesise width. Only `.tabs button` and `.rt-lab` can render it.

⚠️ **RETRACTED.** A previous session reported the width axis fixed after the swap test. That fix corrected the *values* and never checked whether the named elements could render them. **The same bug class one level deeper.**

**Decision.** Remove `font-stretch` from every mono selector; keep it where Archivo actually renders. `.interface-design/system.md` must record which family carries the axis.

### F21 · Five surface planes span 0.0084 luminance — **REPORTED (computed by two agents independently)**

**Evidence.** `--mat` / `--bench` / `--raise` / `--sprocket` / `--well` sit 1.045:1 to 1.144:1 apart in collapsed; the four light surfaces span 1.15:1 total. Depth comes only from `rgba(255,255,255,.09)` hairlines over a starfield.

**Decision.** Separate adjacent planes to ≥1.35:1. Raise `--score-2` to clear the 3:1 non-text floor.

### F22 · `--mat` is byte-identical to `--void` — **VERIFIED**

`web/app.css:33` and `:37` both `#06050D`; `:59` and `:63` both `#EFEEF6`. Two names, one value, 5 uses. **Decision:** delete `--mat`.

### F23 · `--cyan` has no emitting value and fails 3:1 in light mode — **VERIFIED**

`--cyan:#22D3EE` is declared once, at `web/app.css:23`, inside `:root`. `.emitting` redefines `--cyan-bg` and `--cyan-ink` and **not `--cyan`**. Reported measurements: 1.57:1 and 1.81:1 against light surfaces, while `--cyan` carries pressed/selected state at 14 sites, two with no non-colour redundancy. **Decision:** give `--cyan` an emitting value; audit the 14 sites for shape redundancy.

### F24 · The tiled starfield was never removed — **VERIFIED**

**Evidence.** `var(--stars-a)` is referenced twice — `web/app.css:106` (on every `.chk-s` surface: contact-sheet tiles, edge thumbnails, the wipe's cut side) and `:464`. `var(--stars-b)` is defined in both themes and referenced **zero** times.

⚠️ **This is Harkirat's own rejected pattern still shipping.** His words: *"your star pattern is literally a copy paste. Stars are never a copy paste pattern."* The full-screen field was rebuilt as a generated canvas; the tiles kept the repeating SVG, with `app.js:233` randomising `background-position` per tile to hide it — a mitigation, not a removal. `DEVLOG.md` and `.interface-design/system.md` both state the tile was removed.

**Decision.** Remove `--stars-a` from `.chk-s`; delete `--stars-b`. Correct both docs.

### F25 · The matte selected-state CSS has never matched anything — **VERIFIED**

`web/app.css:489-494` targets `.swatch[aria-pressed="true"]` — the cyan ring plus two bracket marks, i.e. the *shape* that satisfies the no-colour-alone rule. `web/index.html:63-66` and `web/app.js:1414,1424` use **`aria-checked`**. No `.swatch` in this app ever carries `aria-pressed`. Confirmed in pixels: **no visible indication of which matte is selected**, in colour or greyscale.

⚠️ Fixing the selector alone ships a second defect: the cyan ring measures 1.81:1 on the white swatch and 1.34:1 on chroma (reported), against SC 1.4.11's 3:1. **Decision:** fix the selector and the indicator contrast in one change.

### F26 · `.swatch` is two components sharing one class — **VERIFIED**

`web/app.css:348` styles the question's 14px colour chip (`background:var(--hex,#888)`, a **shorthand**); `web/app.css:482` styles the 28px matte button. Line 348 is later in source at equal specificity to `.chk-s` (`:105`), so it wipes the checkerboard's `background-color` *and* `background-image` and paints `#888`. **The checker swatch renders flat grey** — the control whose justification is *"they must show the actual ground"* does not show one of the four grounds. **Decision:** rename the chip to `.hexchip`.

### F27 · `.swatch` geometry disagrees with its own documentation — **VERIFIED**

CSS: `width:28px; height:28px; border:5px solid transparent` → an 18px specimen in a 28px target. `.interface-design/system.md:48`: *"16px specimen inside a 24px target via a 4px transparent border."* **Introduced by this project's own accessibility pass**, which changed the CSS and left the measured-values file disagreeing. **Decision:** reconcile; the file records what ships.

### F28 · The two halves of the comparison sit on different backgrounds — **REPORTED (mechanism verified by reading)**

`#aftbg` carries `.chk-s` and is clipped to the right of the seam; nothing behind the left half carries `.chk`/`.chk-s`. So *keep it* composites over **the starfield** and *cut it* over **a checkerboard**, and `:root[data-matte="white"] .chk,.chk-s` repaints only the right half.

**Why it matters.** For a tool whose job is judging an alpha edge this is methodological, not cosmetic: a star showing through transparency on the left reads as a defect and the identical region on the right does not, and the ground changes at exactly the line you compare across. `DESIGN.md` calls the matte *"a verification requirement, not a preference"*; it is half-applied.

**Decision.** Both halves take the matte.

### F29 · The greyscale check fails in the open view — **REPORTED (desaturated capture)**

`#openstate` renders `megaphone.src   gif · 144 frames · needs you` as one uniform grey run when desaturated: `.s-needs-you` changes `color` only (`app.css:286`) and `#openstate b{font-weight:500}` is the same weight as its neighbours. **There is no pencil mark in the open view** — `pencil()` is drawn on sheet tiles and the banner, never here.

`DESIGN.md` asserts the greyscale render passes and `HANDOFF.md` claims the check passed. It passes on the contact sheet and fails on the primary surface. **Decision:** put the mark in the open view.

### F30 · The ledger bar carries its split by hue alone — **REPORTED (computed)**

`.lseg-bg` `--ruby-bg` vs `.lseg-total` `--cyan-bg`: greyscale luminance 0.0147 vs 0.0211, a **1.10:1** step collapsed and **1.04:1** emitting. Rendered in greyscale the bar is one solid block. Technically SC 1.4.1 is satisfied (the bar has `role="img"` with a numeric label and the counts are printed as text) — it fails `DESIGN.md`'s own runnable greyscale check. **Decision:** hatch one segment, using the vocabulary already at `app.css:619`.

### F31 · The green chroma swatch is a third accent and the loudest pixel on screen — **REPORTED**

`--sw-chroma:#00FF7F`. `DESIGN.md`: *"Two load-bearing colours … There is no third accent."* On `02-open-question.png` the most saturated, highest-attention element in the window is a 28px green square in a control group, next to artwork whose edges you are colour-judging. **Decision:** desaturate at rest, show the true key green on hover/selected only.

---

## Stage 4 — THE LAYOUT

### F32 · The artwork is smallest exactly when a question is open — **VERIFIED (live measurement, this session)**

Measured in a real Electron window at 1280×796 CSS px, both states, same window:

| state | `#wipe` | `#stage` | `#questions` | `#ledger` | `.film` |
|---|---|---|---|---|---|
| **needs-you** (question open) | **289×289** | 1134×321 | 201 | 63 | 95 |
| **ready** | **553×553** | 1134×585 | — | 39 | 55 |

**359px of chrome appears precisely when judging the edge matters most, and the artwork loses 264px to it.**

⚠️ **RETRACTED, and the correction is mine.** `docs/DEVLOG.md` records *"~490px now, verified by re-capture."* Two agents measured ~289–346 and concluded the 490 was read off a stale frame. **Both numbers are real, for different states** — the DEVLOG entry stated a figure without saying which state, and the honest reading is worse than either agent's.

**Mechanism.** `.wipe{height:100%; aspect-ratio:1}` inside `.stage{place-items:center}` means the artwork can never be wider than the stage is tall, and the stage's height is whatever `.questions{max-height:30%}`, `.ledger` and `.film` leave. In a 1.55:1 window a square focal element wants its companions **beside** it.

⚠️ **Challenges a filed item.** `devoid-deferred-list.md` files this as `[P2 · S]` "321px in a 1750px stage". **P2 is wrong.** It is not a sizing nit; it is the reason the interface reads as boring, and every other finding compounds it.

**Decision.** Chrome onto the long axis. Target: artwork ≥ 2× current in the question state.

### F33 · The tab rail is the whole navigation and the least legible element — **VERIFIED (geometry) / REPORTED (legibility)**

`.tabs{width:38px}`, `writing-mode:vertical-rl`, 11.5px, `font-stretch:80%`. Six rotated labels, no icons, no `aria-controls`, no rest-state tab shape. Contrast is **fine** — 8.08:1, computed — so this is a discoverability defect, not a contrast one.

⚠️ **The economy is a measured decision and must survive.** `DESIGN.md`: *"Panels are drawers summoned at the table's edge … never a column paid for on every screen."* Two separable decisions got fused: *panels must not cost permanent space* (sound, keep) and *therefore the summoner is rotated 11px text* (a non-sequitur). **Any proposal that adds a permanent sidebar or top nav is rejected under arbitration rule 1.**

**Decision.** Keep the thin rail, drop `writing-mode`. 48–56px, a 20–28px mark from the existing `pencil()` vocabulary per tab, label in a hover/focus popover, rest-state inset border, `⌘1`–`⌘6`. Hide it entirely on the empty table (F35).

### F34 · Opening a drawer resizes the artwork you are judging — **REPORTED**

`.drawer{flex:none;width:250px}` is a flex sibling of `.work`, so opening it shrinks `.stage` — ~12% smaller judgement target because a log panel opened. The codebase already carries a `ResizeObserver` on `#wipe` working around the symptom. No close button, no `Escape`, no `role`, no `aria-labelledby`.

**Decision.** Overlay it — `position:absolute; right:<rail>; width:280px; box-shadow:var(--float)` — so stage geometry becomes invariant. Add a 32×32 close, `Escape`, and `aria-labelledby`.

### F35 · The drawers render live controls for zero targets — **REPORTED**

On an **empty table** all six tabs render and clicking one gives *"what to keep — on 0 selected"* with three interactive rows mutating `S.overrides` for nothing.

**Decision.** No rail on the empty table.

### F36 · The contact sheet's hierarchy is set by the source file's canvas colour — **REPORTED**

Under blur, `secure.src.gif` and `megaphone.src.gif` read as bright white slabs because their *source art* has a white canvas; the four cut assets on checkerboard nearly vanish. The card that needs you wins **by coincidence**. Feed it six already-cut assets and the sheet has no focal point at all. The state channel is an 11px word in `--ruby-ink` — roughly 143px² of orange in a 2560×1656 frame.

`DESIGN.md`'s squint test: *"Blur it; whatever needs you must still dominate."* `HANDOFF.md` claims it passed.

**Decision.** Sort needs-you and refused to the front; give those tiles a real ring plus the hatch; normalise every tile's window ground so brightness carries state rather than the source's canvas colour; make the header's `1 needs you` a filter.

### F37 · The empty state's grid does not respond to count — **REPORTED**

`repeat(auto-fill, minmax(228px,1fr))` with `align-content:start` leaves ~33–55% of the sheet inert at six assets.

⚠️ **My own first proposal here was wrong and is recorded so it is not retried:** "centre the cards" breaks at n=200 and contradicts *"one asset, twelve and two hundred are the same layout."* That claim is an information-architecture claim, not a sizing claim.

**Decision.** Density responds to count — a larger `minmax` below a threshold — with a capped `max-width` and `margin-inline:auto`. A contact sheet physically does this: six frames are large, two hundred are small.

---

## Cross-cutting: accessibility findings that are not design decisions

| id | finding | evidence | mark |
|---|---|---|---|
| A1 | **Three of four matte grounds are keyboard-unreachable.** Roving tabindex is implemented (`app.js:1415,1425`) with **no arrow-key handler anywhere** for `#matte`. Tab reaches the checked radio; the others are `tabindex="-1"`. `canvas.js:589-601` implements this pattern correctly — inconsistency, not ignorance | `rg` finds arrow handling only in `canvas.js:589` and `app.js:597` | **VERIFIED** |
| A2 | **Drawing a region is impossible without a pointer.** `canvas.js:430-532` is pointer-only; `#regioncanvas` has no `tabindex`. The 2.1.1 path-dependent exception does not apply — a rect is two points, a circle a centre and a radius | reading | REPORTED |
| A3 | **Every `render()` destroys focus.** No save/restore anywhere in `app.js`; `render()` fires from a 700ms poll. `canvas.js:612-617` does it correctly and app.js never adopted it | reading | REPORTED |
| A4 | `.qregion` label is `#fff` on `--ruby` = **4.20:1** at 10px — fails SC 1.4.3. Black on ruby gives 6.4:1 and matches what `.btn.go` already does | computed | REPORTED |
| A5 | `.v-failed{color:var(--ruby)}` — the one site using raw `--ruby` as text; **4.20:1** on emitting `--bench`. Siblings are fine because their tokens swap | computed | REPORTED |
| A6 | **Non-text contrast fails SC 1.4.11 on every outlined control** — `.btn` border 1.74:1 dark / 1.62:1 light; `.frame` inset 1.23:1 | computed | REPORTED |
| A7 | **A successful cut announces nothing** — `settle()` calls `setBanner(null)` on the plain `done` path. SC 4.1.3 | reading | REPORTED |
| A8 | `aria-label` on the boolean flag button overrides its visible text with the argparse dest (`app.js:934-936`) — SC 2.5.3, and it leaks system vocabulary into the one channel the copy rule cannot police | reading | REPORTED |
| A9 | **Both wipe canvases are `aria-hidden="true"`** while `role="slider"` announces a bare percentage — the app's central widget is invisible to a screen reader | reading | REPORTED |
| A10 | No `minWidth`/`minHeight` on the window and **zero viewport media queries**; 396px of non-shrinking chrome. Below ~600px height the artwork is clipped away with no scrollbar | `main.js:114-116`; `rg '@media' web/app.css` → only `prefers-reduced-motion` | **VERIFIED** |
| A11 | Film-strip targets fall below 24px on a narrow window — SC 2.5.8 | arithmetic | REPORTED |
| A12 | The reduced-motion rule does what its own comment forbids: the comment says *"movement goes; opacity stays"*, the shipped rule is `*{transition-duration:.01ms!important}` | `app.css:85-90` | **VERIFIED** |

## Cross-cutting: performance

| id | finding | mark |
|---|---|---|
| P1 | **A permanent 60fps forced-layout loop.** `canvas.js:243` runs `layout()` — two `getBoundingClientRect()` calls — every frame from `DOMContentLoaded`, forever, whether or not an asset is open. `render()` mutates the DOM every 700ms during a job, so each tick forces a synchronous layout flush | **VERIFIED (reading)** |
| P2 | wipe.js's rAF clock never stops — `closeAsset()` hides `#open` and never calls `pause()`; the loop keeps blitting into a `display:none` subtree | REPORTED |
| P3 | `decodeCache` and `pairCache` are unbounded and never cleared. **Downgraded from the agent's suspected P0:** `server/preview.py:89,208` extracts **one** frame per side, so the multi-frame risk does not apply today | **VERIFIED (settled)** |
| P4 | A failed preview is cached as a **rejected promise**, so a transient failure is permanent for the session | REPORTED |
| P5 | The sheet rebuilds every tile on every render — no virtualisation, no `loading="lazy"`. Each rebuild creates a new `HTMLImageElement`, so **GIF playback restarts at frame 0**, pinning the sheet near frame 0 during a batch cut | REPORTED |
| P6 | `repaintField()` runs unconditionally on every render, reallocating the starfield backing store | REPORTED |

---

## Rejected proposals, and why

| proposal | source | rejected because |
|---|---|---|
| A new palette | none proposed it | Would have been rejected: `scripts/measure_overlay_collision.py` measured a third of one asset's artwork inside the ruby neighbourhood; the two colours are load-bearing and justified |
| *"Raise the whole interface's contrast and let the void recede to a frame"* | agent 1, option 2c | Undoes the world for a legibility problem with cheaper fixes |
| Cap `.big` at 32px to raise the question's hierarchy | agent 1 | Hierarchy is not a fixed budget moved between screens. Making the best screen worse does not make the question better. **Raise the question instead** |
| A permanent top command bar replacing the rail | implied by several | Contradicts `DESIGN.md`'s measured drawers-not-columns decision |
| "Cut it loses 2,047 px of artwork" as the ledger delta label | agents 1 and 5 | The number is right and the **label** is not. `render.py`'s own comment: `art` is a **ceiling**, not a defect count. Say *"2,047 px differ between these two answers"* — a difference is what was measured |
| Replacing the strip-is-the-app architecture | implied by "drastic redesign" | It is the one decision here that survived a falsification test, against a Board/Bench split that served ~1 item per batch at 10.2% |
| Rebuilding `.lamp` a fourth time | — | Two agents want identity added; `DEVLOG.md` records three rejected attempts before it. See D3 |

## What must not change

- The two load-bearing colours, and no third accent.
- The strip-is-the-app / selection-is-the-only-state architecture.
- Real corpus assets in `web/assets/` — never synthetic icons.
- No state by colour alone; every state carries a shape or a word.
- The alpha checkerboard as notation, absent only on the empty table.
- No lensing on the stage.
- The honesty rules: never infer a size target; never report a verification the run did not earn; `not-checked` is first-class.
- The empty state, unless D2 says otherwise.

## Decisions — answered by Harkirat, 2026-09-06 00:58 EDT

| id | question | answer |
|---|---|---|
| **D1** | `advice.js` — 172 lines, zero callers | **Wire it in Stage 1.** The rule stands and the app will honour it |
| **D2** | Is the empty state off-limits? | **Off-limits.** Raise the question's hierarchy instead of cutting the best screen down to meet it |
| **D3** | `.lamp` — unidentifiable on white | **Keep the seam concept, add identity** — 64×32, a persistent border in both states, a `void`/`lit` label. Not a fourth rebuild |
| **D4** | Scope | **All four stages**, including the layout |

*(Recorded as asked. The original framing, and the options weighed, follow.)*

## Open decisions

| id | question | options |
|---|---|---|
| **D1** | `advice.js` — 172 lines, zero callers, and `CLAUDE.md` makes "advice ships with an undo" non-negotiable | wire it in Stage 1 · delete it and drop the rule · leave it dormant and file it |
| **D2** | The empty state — is it off-limits? | untouched (recommended) · shrink `.big` to raise the question |
| **D3** | `.lamp` — unidentifiable on white, per two agents | add a border and a `void`/`lit` label, keep the seam concept (recommended) · leave it · rebuild |
| **D4** | Scope — is Stage 4 wanted at all, or stop after 3 and look? | all four · stop after 3 · Stage 1+2 only |

## Cost

Roughly **40–60 turns**: Stage 1 is eight wiring changes each needing real-window verification; Stage 2 is ~12 copy and state edits; Stage 3 is a token pass touching most of `app.css`; Stage 4 is a layout rewrite. Gate assertions accompany each stage.

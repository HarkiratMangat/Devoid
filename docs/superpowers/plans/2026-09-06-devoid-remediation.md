# Devoid remediation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the four built-but-unwired systems that carry this app's meaning, stop the interface making claims that are false, then give it a real type and surface system and a layout that lets the artwork lead.

**Architecture:** Five stages, ordered so each makes the next judgeable. Stage 1 connects — no taste involved, and it changes the UI gate first, because the existing gate certified every defect it was built to catch. Stage 2 removes statements the app makes that are not true. Stage 3 is the token and type system. Stage 4 is the layout, the largest change, which benefits from the other three being true. **Stage 5 was added 2026-09-06 17:38 EDT** and is the only stage that adds rather than repairs: three signature components adapted from a void/black-hole reference the user supplied, taken as ideas rather than as code. It runs last because a loader, a status pip and a stage vignette are all judged against a layout that has stopped moving.

**Tech Stack:** Electron 44 main process · vanilla ES2020 in `web/` (no framework, no bundler) · Starlette/uvicorn in `server/` · pytest · `node --test` · a real-window Electron gate at `scripts/capture-window.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-06-devoid-remediation-design.md` — every finding below carries an `F`/`A`/`P` id that resolves there, with its evidence and its verification mark.

## Global Constraints

- **Branch commits are free; push and merge are each asked, every time.** `CLAUDE.md`.
- **Conventional Commits v1.0.0**, `<type>(<scope>): <description>`, imperative, lowercase, no trailing period. Trailers: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` and `Co-Authored-By: diorswrld <310361322+diorswrld@users.noreply.github.com>`.
- **Markdown is soft-wrapped** — one physical line per paragraph or list item. Check with `node "/Applications/Claude Code/Diors-Builds/scripts/reflow-prose.mjs" --check <files>`; `--write` applies.
- **Design detector must return exactly one finding, `repeating-stripes-gradient`, and must not be DEGRADED.** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>`. ⚠️ A degraded run returns `[]`, which reads exactly like clean.
- **Every quoted number needs a script in `scripts/` that reproduces it.** `python3 scripts/measure_ledger.py --check` must exit 0.
- **No control maps 1:1 onto one of the engine's 63 flags.** Every control is tri-state; `--auto` applies its recommendation only where an option was left at its default.
- **Never infer a size target. Never report a verification the run did not earn.** `not-checked` is first-class, with the same visual weight as done and failed.
- **No state by colour alone** — every state carries a shape or a word. The greyscale render is a runnable check.
- **Two load-bearing colours only.** Rubylith = *this goes*; cyan = *this stays*. No third accent.
- **Do not touch:** the strip-is-the-app architecture, the palette, the corpus assets in `web/assets/`, the alpha checkerboard, the no-lensing-on-stage rule.
- **The empty state is off-limits** (D2, answered 2026-09-06 00:58 EDT). Do not cap `.big`, do not shrink the horizon. Raise the question's hierarchy in Stage 3 instead.
- **All four stages are in scope** (D4, answered 2026-09-06 00:58 EDT), including the layout.
- **Gates that must be green before any commit:** `.venv/bin/python -m pytest -q` (93) · `npm run test:coords` · `npm run test:wipe` · `npm run test:versions` · `npm run gate:ui` · the detector · reflow on any `.md` touched.

---

## Stage 1 — CONNECT

*No design decisions in this stage. Every task restores a system that already exists.*

### Task 1: Make the gate prove connection, not presence

**Why first.** F8. The gate asserts geometry and DOM presence, and presence is exactly what a disconnected subsystem has. It took nine clean captures of a seam that cannot be dragged. Every task after this one is verified by this gate, so it has to be able to fail first.

**Files:**
- Modify: `scripts/capture-window.mjs`

**Interfaces:**
- Produces: a `drag(fromPct, toPct)` helper using `win.webContents.sendInputEvent`, and a `probe(expr)` that already exists; later tasks call both.

- [ ] **Step 1: Add a real-input drag helper and assert the seam moves**

Insert after the existing `probe` helper:

```js
  /** A REAL pointer drag across the wipe, in window coordinates.
   *  ⚠️ Not `.click()` and not `executeJavaScript` — the whole point is that
   *  input arrives through the same path a hand uses. `sendInputEvent` is the
   *  only way to prove a listener is attached. */
  const drag = async (fromPct, toPct) => {
    const box = await probe(`
      const r = document.getElementById('wipe').getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };`);
    const at = (p) => ({ x: Math.round(box.x + box.w * p), y: Math.round(box.y + box.h / 2) });
    const a = at(fromPct), b = at(toPct);
    win.webContents.sendInputEvent({ type: 'mouseDown', x: a.x, y: a.y, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 6; i++) {
      const x = Math.round(a.x + (b.x - a.x) * (i / 6));
      win.webContents.sendInputEvent({ type: 'mouseMove', x, y: a.y, button: 'left', buttons: 1 });
      await wait(30);
    }
    win.webContents.sendInputEvent({ type: 'mouseUp', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(250);
  };
```

- [ ] **Step 2: Add the assertion, and run it to watch it FAIL**

Add immediately after the existing seam checks:

```js
  const seamBefore = await probe(`return { v: S.seam }`);
  await drag(0.5, 0.82);
  const seamAfter = await probe(`return { v: S.seam }`);
  check('the seam responds to a real drag', seamAfter.v !== seamBefore.v,
        `${seamBefore.v} -> ${seamAfter.v} after dragging 50% -> 82%`);
```

Run: `npx electron scripts/capture-window.mjs` Expected: **FAIL**, `the seam responds to a real drag (50 -> 50 after dragging 50% -> 82%)`, exit 1. If it passes, the drag helper is not delivering input — fix that before continuing, because a check that cannot fail is worse than none.

- [ ] **Step 3: Fix `07-arrival` capturing the wrong state**

F8. The shot never resets `S.drawer` (left at `'what you did'` by step 06) and never closes the asset opened at step 02.

```js
  await shot('07-arrival', `closeAsset();S.drawer=null;S.arrivalUsed=false;S.arriving.clear();
    addPaths(${JSON.stringify(['galaxy.gif','rocket.gif','hurricane.gif','megaphone.gif','secure.gif','satellite.gif']
      .map((n) => join(ROOT, 'web', 'assets', n)))})`, 420);
```

- [ ] **Step 4: Commit (the gate alone, still red)**

```bash
git add scripts/capture-window.mjs
git commit -m "test(gate): drive real input and assert the seam moves"
```

### Task 2: Restore the seam drag

**Files:**
- Modify: `web/app.js:1470-1472`

**Interfaces:**
- Consumes: Task 1's failing assertion.
- Produces: `releaseWipe()` no longer aborts; `wipeCtl` remains unused thereafter.

- [ ] **Step 1: Stop aborting the handlers**

F1. `wipe.js`'s own comment already says app.js's handlers *"only ever touch the shared `--seam` CSS variable"*, which is the argument for keeping them.

Replace:

```js
  releaseWipe() { wipeCtl.abort(); wipeOwned = true; },
```

with:

```js
  /* ⚠️ This used to call `wipeCtl.abort()`, which removed the ONLY pointerdown,
     pointermove and keydown listeners on #wipe (registered at :594-600 with
     {signal: wipeCtl.signal}) — and wipe.js attaches no replacement. The app's
     signature gesture was dead from the moment the answer pair mounted, while
     the element kept advertising it: cursor:ew-resize, a rendered handle,
     role="slider", aria-label="Drag to compare…". The handlers only ever write
     the shared --seam variable, which both the <img> pair and the canvases
     read, so there is nothing to hand over. Ownership of the CONTENT moves;
     ownership of the GESTURE never needed to. */
  releaseWipe() { wipeOwned = true; },
```

- [ ] **Step 2: Run the gate to verify the assertion now passes**

Run: `npx electron scripts/capture-window.mjs` Expected: PASS, and the summary line reports a seam value other than 50.

- [ ] **Step 3: Add Home/End and an announced value**

A9. `role="slider"` currently announces a bare percentage. In `web/app.js`, inside the existing `keydown` handler at `:597`, add `Home`/`End`, and set `aria-valuetext` wherever `aria-valuenow` is written in `setSeam`:

```js
  wipe.setAttribute('aria-valuetext',
    `${Math.round(pct)}% — keep it on the left, cut it on the right`);
```

- [ ] **Step 4: Full gates, then commit**

```bash
.venv/bin/python -m pytest -q && npm run test:wipe && npx electron scripts/capture-window.mjs
git add web/app.js scripts/capture-window.mjs
git commit -m "fix(wipe): keep the seam draggable after the answer pair mounts"
```

### Task 3: Draw the disputed region on the artwork

**Files:**
- Modify: `web/app.js:419-470` (`renderQuestionRegions`)
- Modify: `web/wipe.js` (call `requeryRegions` at the end of `loadPair`)
- Modify: `scripts/capture-window.mjs`

**Interfaces:**
- Consumes: `window.Devoid.wipe.sides()` → `{a, b}` where each side carries `width`, `height` (already exported at `wipe.js:806`).
- Produces: `.qregion` nodes inside `#wipe` whenever a question is live.

- [ ] **Step 1: Add the failing gate assertion**

F2. In `scripts/capture-window.mjs`, with the megaphone open and the pair loaded:

```js
  const qr = await probe(`return { n: document.querySelectorAll('.qregion').length }`);
  check('the disputed region is drawn on the artwork', qr.n > 0, `${qr.n} .qregion nodes`);
```

Run: `npx electron scripts/capture-window.mjs` Expected: **FAIL**, `0 .qregion nodes`.

- [ ] **Step 2: Source the dimensions from the canvas, not the dead `<img>`**

In `renderQuestionRegions`, replace lines 426-429:

```js
  const art = $('#before');
  const sw = art.naturalWidth, sh = art.naturalHeight;
  const P = window.Devoid && window.Devoid.plotter;
  if (!sw || !sh || !P) return;                 // nothing to register against yet
```

with:

```js
  /* ⚠️ Where the source dimensions come from decides whether this function can
     run at all. It used to read #before.naturalWidth — and wipe.js's
     mountCanvases() does `before.hidden = true; before.removeAttribute('src')`,
     which makes naturalWidth 0. So the hatch and its "is this yours?" tag were
     mutually exclusive with the seam BY CONSTRUCTION, and the seam is on screen
     exactly when a question is live. The region has never been drawn in the
     state it exists for. Prefer the decoded canvas; fall back to the <img>
     only on the pre-seam path. */
  const sides = window.Devoid && window.Devoid.wipe && window.Devoid.wipe.sides
    ? window.Devoid.wipe.sides() : null;
  const art = $('#before');
  const sw = (sides && sides.a && sides.a.width) || art.naturalWidth;
  const sh = (sides && sides.a && sides.a.height) || art.naturalHeight;
  const P = window.Devoid && window.Devoid.plotter;
  if (!sw || !sh || !P) return;                 // nothing to register against yet
```

⚠️ The geometry below this point reads `getComputedStyle(art)` for padding. When the canvases own the element, read the padding from `#wipe-a` instead — `.wipe>canvas` and `.wipe>img` carry different padding rules.

- [ ] **Step 3: Re-register after the pair mounts**

At the end of `loadPair` in `web/wipe.js`, before `return metric;`:

```js
    /* app.js owns the region overlay and cannot know the canvases finished
       decoding. Without this the first draw races the decode and finds no
       dimensions. */
    if (root.Devoid && typeof root.Devoid.requeryRegions === 'function') root.Devoid.requeryRegions();
```

Export `requeryRegions` from `app.js`'s `window.Devoid` block.

- [ ] **Step 4: Run the gate; expect PASS, then look at the pixels**

Run: `npx electron scripts/capture-window.mjs` Expected: PASS. Then open `local/window-shots/09-seam.png` and confirm the ruby box, the 45° hatch and the `is this yours?` tag sit over the megaphone's disputed cone.

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/wipe.js scripts/capture-window.mjs
git commit -m "fix(questions): draw the disputed region on the artwork again"
```

**Closes F3 too.** With the region drawn, the app stops delivering the coin-flip question as `The place outlined in 002864` plus a bbox array — the exact string `PRODUCT.md` says it exists to abolish.

### Task 4: Stop the question card following you to the next asset

**Files:**
- Modify: `web/app.js:1099` (`maybeLoadSeamPair`), `web/app.js` (`openAsset`)

- [ ] **Step 1: Add the failing assertion**

F4. In the gate, after opening the megaphone and forcing the card, open a different asset:

```js
  await win.webContents.executeJavaScript(`Devoid.wipe && showCardForTest && showCardForTest(true)`).catch(() => {});
  await win.webContents.executeJavaScript(`openAsset(${JSON.stringify(readyId)})`);
  await wait(1200);
  const card = await probe(`return { hidden: document.getElementById('qcard').hidden }`);
  check('the question card does not follow you to the next asset', card.hidden === true, `hidden=${card.hidden}`);
```

⚠️ If `showCard` is not reachable from the gate, drive the real path instead: open the megaphone, wait for the card, then open another asset. Do not add a test-only export to ship code.

- [ ] **Step 2: Hide it on every navigation**

At the top of `maybeLoadSeamPair`, before the early returns:

```js
  /* ⚠️ showCard() is called ONLY from inside loadPair, and this function returns
     early whenever there is no unanswered group — so a card raised on asset A
     stayed up over asset B, with B's artwork hidden behind it. Clear it on the
     way in, unconditionally. */
  const card = $('#qcard');
  if (card && !card.hidden) { card.hidden = true; const w = $('#wipe'); if (w) w.hidden = false; }
```

- [ ] **Step 3: Gate, then commit**

```bash
npx electron scripts/capture-window.mjs
git add web/app.js scripts/capture-window.mjs
git commit -m "fix(questions): clear the question card when another asset opens"
```

### Task 5: Serve the artwork for files outside `web/assets/`

**Closes F5** — the finding that the app showed no artwork at all for any file outside `web/assets/`, including the one real run `DEVLOG.md` celebrates.

**Files:**
- Modify: `server/app.py` (a new route, and the routes list)
- Modify: `server/assets.py` (`Asset.public()`)
- Modify: `docs/API-CONTRACT.md`
- Test: `tests/test_source_route.py`

**Interfaces:**
- Produces: `GET /api/assets/{id}/source` → the registered file's bytes; `Asset.public()` gains `url`.

- [ ] **Step 1: Write the failing test**

```python
def test_source_route_serves_a_registered_file(client, tmp_path):
    src = tmp_path / "outside.gif"
    src.write_bytes((Path("web/assets/rocket.gif")).read_bytes())
    asset = client.post("/api/assets", json={"paths": [str(src)]}).json()[0]
    assert asset["url"] == f"/api/assets/{asset['id']}/source"
    r = client.get(asset["url"])
    assert r.status_code == 200
    assert r.content[:6] in (b"GIF87a", b"GIF89a")


def test_source_route_404s_for_an_unknown_asset(client):
    assert client.get("/api/assets/nope/source").status_code == 404
```

- [ ] **Step 2: Run it and watch it fail**

Run: `.venv/bin/python -m pytest tests/test_source_route.py -v` Expected: FAIL — `KeyError: 'url'`.

- [ ] **Step 3: Add the route**

In `server/app.py`, above the catch-all mount:

```python
def asset_source(request: Request):
    """The registered input file's own bytes — API-CONTRACT.md "Assets".

    ⚠️ **Why this exists.** ``web/app.js`` built every image URL as
    ``assets/<basename>``, so anything outside ``web/assets/`` 404'd and the app
    showed a blank frame — on the sheet AND in the open view, where there is no
    error handler at all. The corpus was the only input this app had a visible
    interface for, and the first real use on a file from ~/Downloads rendered
    nothing. A comment argued a thumbnail route would be a contract change; this
    IS that change, made deliberately rather than worked around.

    Serves only paths already registered by ``POST /api/assets``, so this cannot
    be used to read an arbitrary file off disk.
    """
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    path = Path(asset.path)
    if not path.is_file():
        return _error("input_missing", 404, path=asset.path)
    return FileResponse(path)
```

Register it before the mount: `Route("/api/assets/{id}/source", asset_source),`

- [ ] **Step 4: Publish the url**

In `server/assets.py`, inside `public()`:

```python
        out["url"] = f"/api/assets/{self.id}/source"
```

- [ ] **Step 5: Run the tests**

Run: `.venv/bin/python -m pytest tests/test_source_route.py -v && .venv/bin/python -m pytest -q` Expected: PASS, and 95 total.

- [ ] **Step 6: Record the contract change**

Add to `docs/API-CONTRACT.md` under Assets: `- ` + "`GET /api/assets/{id}/source`" + ` → the registered input file's bytes. ` + "`404`" + ` with ` + "`{\"error\": \"input_missing\"}`" + ` when the path no longer exists. Added ` + DATE + ` — the frontend previously derived image URLs from the basename and could only show files already inside ` + "`web/assets/`" + `.`

- [ ] **Step 7: Commit**

```bash
git add server/app.py server/assets.py tests/test_source_route.py docs/API-CONTRACT.md
git commit -m "feat(server): serve a registered asset's own bytes"
```

### Task 6: Show the artwork the server now serves

**Files:**
- Modify: `web/app.js:65` (`artUrl`), and `#before`'s error path

- [ ] **Step 1: Trust the server's url**

`artUrl` already prefers `a.url`; with Task 5 that field now exists, so the change is to delete the misleading comment and add the missing error handler:

```js
/* The server serves a registered asset's own bytes at /api/assets/{id}/source
   and publishes it as `url`. The basename fallback remains only for the corpus
   fixtures the capture script seeds directly. */
const artUrl = a => a.url || `assets/${base(a.path)}`;
```

- [ ] **Step 2: Give `#before` the error handler it never had**

Wherever `#before`'s `src` is set in `render()`, add the handler the sheet tiles already have, so a missing file reads as `blocked` rather than as a blank stage.

- [ ] **Step 3: Verify with a file from outside the repo**

```bash
cp web/assets/rocket.gif /tmp/outside-the-repo.gif
npm start
```

Drop `/tmp/outside-the-repo.gif` onto the window. Expected: the artwork renders on the sheet and in the open view.

- [ ] **Step 4: Commit**

```bash
git add web/app.js
git commit -m "fix(surface): show artwork for files outside web/assets"
```

### Task 7: Wire the film strip to the clock

**Files:**
- Modify: `web/app.js:649` (`renderFilm`)
- Modify: `web/index.html:104` (delete the hardcoded onion-skin string)

- [ ] **Step 1: Call the seek that already exists**

F6. `wipe.js:491`'s `seekToFrame` is exported at `:804` and documented as *"the hook the film strip needs"*, with zero callers. In `renderFilm`'s click handler, after `S.frame = f`:

```js
      const W = window.Devoid && window.Devoid.wipe;
      if (W && typeof W.seekToFrame === 'function') W.seekToFrame(f);
```

- [ ] **Step 2: Delete the two fictions**

F14. In `web/index.html:104`, remove `onion skin · 2 frames` — nothing updates it and there is no onion skin. Remove `· 0 flagged` from `#fcount`'s template in `app.js` — `flagged` appears nowhere in `server/`, so it is permanently zero and the `.flag` notch CSS has never rendered.

- [ ] **Step 3: Verify the artwork actually moves**

Run `npm start`, open an asset, click frame 12. Expected: the artwork changes and `#fcount` agrees. Before this task the counter moved alone.

- [ ] **Step 4: Commit**

```bash
git add web/app.js web/index.html
git commit -m "fix(film): make the strip seek, and stop claiming features it lacks"
```

### Task 8: Wire the advice rail

**D1 answered 2026-09-06 00:58 EDT: wire it.** The rule stands and the app will honour it.

**Files:**
- Modify: `web/app.js` (call sites), `web/advice.js` (no changes expected — it is complete)

**Interfaces:**
- Consumes: `window.Devoid.suggest({ text, apply, undo })` — throws if `undo` is omitted.

- [ ] **Step 1: Read the module before calling it**

F7. `web/advice.js` is 172 lines, complete, and has never run. Read it end to end first: it owns the rail's construction, the apply/undo pairing, and a `TypeError` guard for a missing undo that has never fired.

- [ ] **Step 2: Give it its two natural call sites**

Every suggestion must carry an undo of **exactly what it changed** — that is the rule, and the module enforces it.

1. **After an analyze returns a recommendation.** `--recommend`'s JSON is already on `S.assets[].questions`. Where it names a flag the drawers expose, offer it: apply sets `S.overrides[dest]`, undo deletes that one key. Nothing else.
2. **When a fade answer collides with a stated GIF goal.** `PRODUCT.md`: answering "it is artwork" forces an 8-bit-alpha container, *"which collides with a stated GIF goal — the app resolves that, it does not discover it."* Offer the format change; undo restores the previous `S.goal.format`.

⚠️ **Do not invent a third.** An unearned suggestion is a measured failure mode in this project's history, and the rule exists because of it.

- [ ] **Step 3: Assert it in the gate**

```js
  const adv = await probe(`
    return { rail: !!document.querySelector('.advice'),
             undoable: document.querySelectorAll('.advice [data-undo]').length };`);
  check('a suggestion carries its undo', !adv.rail || adv.undoable > 0,
        `${adv.undoable} undo controls for a visible rail`);
```

- [ ] **Step 4: Commit**

```bash
npx electron scripts/capture-window.mjs
git add web/app.js scripts/capture-window.mjs
git commit -m "feat(advice): give the advice rail its call sites"
```

---

## Stage 2 — STOP LYING

### Task 9: Make the tri-state readout say something true

**Files:** `web/app.js:918` (`show`), `web/app.js:736` and `:919` (`defaultFor`)

- [ ] **Step 1: Stop claiming `off`**

F9. Every argparse default is `None`, so all nine controls read `auto · off` — and `off` is a factual claim that is false; the value is undecided.

```js
/* ⚠️ `null` is NOT `off`. Every engine default is None, so this used to render
   `auto · off` on all nine controls — nine identical rows claiming erosion is
   off, dithering is off, when in fact --auto has not chosen yet. PRODUCT.md
   calls this readout "a live readout of the tool's own reasoning"; it read out
   one word. */
const show = v => v === null || v === undefined ? 'the tool decides'
  : (v === true ? 'on' : (v === false ? 'off' : String(v)));
```

- [ ] **Step 2: Do not change the value on takeover**

F10. `app.js:736` sets `S.overrides[dest] = defaultFor(f)` on takeover, which flips a bool to `true` and a choice to `choices[0]` — silently. Take over at the displayed value; where that is "the tool decides", show the engine's recommendation as the starting point (already on `S.assets[].questions`) and commit nothing until the person edits.

- [ ] **Step 3: Verify in the real window and commit**

```bash
npm start   # open a drawer; no row should read `auto · off`
git add web/app.js
git commit -m "fix(controls): stop reporting an undecided flag as off"
```

### Task 10: Give the banner a person's vocabulary

**Files:** `web/app.js:394-408` (`renderBanner`)

- [ ] **Step 1: Map every state to a word**

F11. `app.js:400` prints `S.banner.state.replace('-', ' ')`, so confirming a batch cut appears under **`conflict`**, and a *successful* escalated save also appears under **`conflict`**.

```js
/* ⚠️ DESIGN.md: "The vocabulary is a person's, not the system's." This printed
   the internal enum as the headline — so a routine confirmation and a
   successful save both shouted `conflict`. The mark still carries the
   semantics; the word is for the reader. */
const BANNER_WORD = {
  conflict: 'Heads up', blocked: 'Answer first', failed: 'It stopped',
  refused: 'It refused', cancelled: 'Stopped', 'not-checked': 'Nothing measured',
  loading: 'Reading', done: 'Saved',
};
```

⚠️ Check each call site: `app.js:1019` raises `conflict` for a *confirmation*. That is the wrong state, not just the wrong word — give confirmations their own state.

- [ ] **Step 2: Commit**

```bash
git add web/app.js && git commit -m "fix(banner): say it in the person's words, not the enum's"
```

### Task 11: Stop answering the question from deleting the measurement

**Files:** `web/app.js:606` (`renderLedger`), `web/wipe.js:522` (`renderLedger`)

- [ ] **Step 1: One writer**

F12. Measured before/after: answering replaces two-sided figures with `not checked — nothing was measured on this one`, and the state word flips to `ready` — so the app says `ready` and `not checked` about the same asset simultaneously.

Have `wipe.js` stash `ledgerA`/`ledgerB` on `window.Devoid`; have `app.js:renderLedger` prefer them while `wipeOwned` is true.

- [ ] **Step 2: Add the gate assertion**

```js
  check('answering does not erase the ledger',
        !/nothing was measured/.test(ledgerAfterAnswer.text), ledgerAfterAnswer.text);
```

- [ ] **Step 3: Commit**

```bash
git add web/app.js web/wipe.js scripts/capture-window.mjs
git commit -m "fix(ledger): one writer, so answering does not erase the numbers"
```

### Task 12: One vocabulary, and an undo for the answer

**Files:** `web/index.html:86-87, 77-78` · `web/app.js:494, 505-506, 566, 680-682` · `main.js:396-402`

- [ ] **Step 1: Collapse five vocabularies to one**

F16. `Keep it` / `Cut it` everywhere: rewrite `#qcard`'s buttons, delete the dead `as it came` / `cut` literals (`app.js:1268/1271` already overwrites them), rename the drawer rows, reword the fade pair to `Keep the fade` / `Cut the fade`.

- [ ] **Step 2: Delete the clipboard collision**

Remove `Edit ▸ Cut ⌘X` from `main.js:399`. Shipping the platform's clipboard *Cut* in an app whose product verb is *cut* is the worst available collision.

- [ ] **Step 3: Let an answer be revised**

F13. `app.js:566` nulls `questions`, after which nothing can re-open it. Keep the answered question visible with its chosen side marked, and add `⌘Z` against `S.answers`. `CLAUDE.md` mandates an undo; the most consequential decision in the app ships without one.

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/app.js main.js
git commit -m "fix(copy): one vocabulary for keep and cut, and an undo for the answer"
```

### Task 13: The remaining copy defects

**Files:** `web/index.html:31, 113-114` · `web/app.js:800, 914, 1039, 1126, 1228` · `web/wipe.js:721-722` · `web/canvas.js` tool labels

- [ ] **Step 1: Apply F17's table verbatim**

Each row of F17 names the file, the current string and the replacement. Notable: `Save 6` in `index.html:31` is what you see on first paint and names a button that does not exist; `${q} need you` is a grammar bug on the home screen; `wipe.js:721-722` is verbatim the analyst's question `PRODUCT.md` says the app replaces.

- [ ] **Step 2: Make "answer it and it will go" true, or change it**

F15. `app.js:1039` promises the job goes; `submitAnswers` never calls `cut()`. Prefer the queue — `S.pending`, drained on answer — because the copy describes the better product.

- [ ] **Step 3: Commit**

```bash
git add web/index.html web/app.js web/wipe.js web/canvas.js
git commit -m "fix(copy): say what the buttons do and what the app will do"
```

---

## Stage 3 — THE SYSTEM

### Task 14: Unlock the fonts

**Files:** `web/fonts.css`

- [ ] **Step 1: Declare the ranges the files already carry**

F19. `fontTools` on `web/fonts/*.woff2`: Archivo carries `wght (100,900)`, `wdth (62,125)`, declared `400 700`. Spline Sans Mono carries `wght (300,700)`, declared as two static faces.

Set Archivo to `font-weight: 100 900`; replace the two static mono faces with one `font-weight: 300 700`. Zero new bytes.

- [ ] **Step 2: Prove it with a script**

Write `scripts/check_font_axes.py` asserting every declared range is within the file's `fvar` range, and that no declared range is narrower than the file's. Run it in the gate.

- [ ] **Step 3: Commit**

```bash
git add web/fonts.css scripts/check_font_axes.py
git commit -m "fix(type): stop clamping away weight the font files already ship"
```

### Task 15: Delete the inert width axis, and set a real type scale

**Files:** `web/app.css:589` and every `font-size` declaration

- [ ] **Step 1: Remove `font-stretch` from the mono selectors**

F20. Eight of the ten selectors on `app.css:589` are Spline Sans Mono, which has **no `wdth` axis** — browsers do not synthesise width, so the declaration is inert. Keep it only where Archivo renders.

- [ ] **Step 2: Introduce type tokens**

F18. There are currently zero type tokens and 37 raw `font-size` values, 31 of them between 11 and 12.5px.

```css
  --t-micro:11px; --t-meta:12px; --t-body:14px; --t-label:14px;
  --t-h3:18px; --t-h2:22px; --t-h1:30px; --t-figure:34px; --t-display:44px;
```

Map every declaration onto a token. The ledger's figures take `--t-figure` with `tabular-nums` — the app's first number worth looking at.

- [ ] **Step 3: Detector, gate, commit**

```bash
node ~/.claude/skills/impeccable/scripts/detect.mjs --json web/app.css web/index.html web/app.js
npx electron scripts/capture-window.mjs
git add web/app.css && git commit -m "feat(type): a scale with real steps, and no inert width axis"
```

### Task 16: Separate the surfaces, fix the tokens

**Files:** `web/app.css` token blocks

- [ ] **Step 1: The token repairs**

F21 — separate adjacent planes to ≥1.35:1 (currently 0.0084 luminance across five). F22 — delete `--mat`, byte-identical to `--void`. F23 — give `--cyan` an emitting value; it is `:root`-only and measures 1.57:1 / 1.81:1 in light while carrying pressed state at 14 sites. A6 — raise `--score-2` to clear 3:1. A5 — `.v-failed` to `--ruby-ink`. A4 — `.qregion` label to a dark ink on ruby (6.4:1, matching `.btn.go`'s existing treatment).

- [ ] **Step 2: Remove the tiled starfield**

F24. `var(--stars-a)` is still applied at `app.css:106` to every `.chk-s` surface; `--stars-b` is defined twice and referenced zero times. **This is the pattern Harkirat rejected** — *"stars are never a copy paste pattern"* — still shipping, with `app.js:233` randomising `background-position` to hide it. Remove both, and correct `DEVLOG.md` and `.interface-design/system.md`, which state the tile was removed.

- [ ] **Step 3: Write the contrast script**

Extend the existing contrast measurement to cover **overlay text and `[aria-*]` state colours in both lighting states** — the previous pass measured text-on-surface pairs only, which is why A4, A5 and F23 survived it.

- [ ] **Step 4: Commit**

```bash
git add web/app.css scripts/ docs/DEVLOG.md .interface-design/system.md
git commit -m "fix(tokens): separate the surfaces, fix cyan in light, remove the tiled stars"
```

### Task 17: Repair the matte control

**Files:** `web/app.css:348, 482-498` · `web/index.html:62-66` · `web/app.js:1406-1427` · `.interface-design/system.md`

- [ ] **Step 1: Make the selected state exist**

F25. The CSS targets `[aria-pressed="true"]`; the markup and JS use `aria-checked`. **No swatch has ever carried `aria-pressed`** — there is no visible selected state at all. Fix the selector **and** the indicator contrast in the same change (the cyan ring measures 1.81:1 on white and 1.34:1 on chroma).

- [ ] **Step 2: Split the shared class**

F26. `.swatch` styles both the 14px question colour chip (`app.css:348`, a `background` **shorthand** that wipes the checkerboard) and the 28px matte button. Rename the chip to `.hexchip`. Verify the checker swatch renders a checkerboard rather than flat `#888`.

- [ ] **Step 3: Add the arrow keys**

A1. `#matte` is a `role="radiogroup"` with roving tabindex and **no arrow handler**, so three of four grounds are unreachable by keyboard. `canvas.js:589-601` already implements this correctly — factor it out and reuse.

- [ ] **Step 4: Reconcile the documented geometry**

F27. CSS ships an 18px specimen in a 28px target; `system.md:48` documents 16-in-24. Make the file record what ships.

- [ ] **Step 5: Gate with a keyboard assertion, then commit**

```bash
git add web/app.css web/index.html web/app.js .interface-design/system.md scripts/capture-window.mjs
git commit -m "fix(matte): a visible selected state, a real checkerboard, and arrow keys"
```

### Task 18: Give the lighting toggle an edge and a name

**D3 answered 2026-09-06 00:58 EDT: keep the seam concept, add identity.** Not a fourth rebuild — `DEVLOG.md` records three rejected attempts before this one, and the concept is right: it teaches the seam gesture before you open anything.

**Files:** `web/app.css` (`.lamp`) · `web/index.html:24-27`

- [ ] **Step 1: Give it an edge that survives a white header**

At 56×28 with no border, the control is effectively invisible on `--bench: #FFFFFF` in emitting, and reads as a corrupted thumbnail between two labelled buttons in collapsed. Take it to **64×32** with a persistent `1px solid var(--score-2)` in **both** lighting states. This also clears SC 2.5.8 on both axes.

- [ ] **Step 2: Name the states**

Add a 10px mono label beside it reading `void` / `lit`, swapping with the state. ⚠️ Keep the `aria-label` a full sentence — *"Switch to emitting light"* — since nobody maps "emitting" to "light mode" from two letters either.

- [ ] **Step 3: Give the collapse some weight**

Added 2026-09-06 17:38 EDT from the reference file, adapted rather than copied — the reference's own toggle is a sliding orb, which is the *iOS rocker* and the *circle with a ring* `DEVLOG.md` already records as rejected. What is worth taking is the **choreography**, which is separable from the shape and applies to a seam just as well as to an orb.

Three changes, all on `.lamp` in `web/app.css`, none of which touches the seam concept:

```css
/* the ground moves, not only the rim. Collapsed is the void's own black;
   emitting is the horizon's warm light. Today only the rim sweeps, so the
   control reads as a slider rather than as a change of world. */
.lamp{background:linear-gradient(90deg,var(--horizon),var(--raise));
      transition:background var(--dur-lamp,.5s) var(--ease)}
:root[data-light="collapsed"] .lamp{background:linear-gradient(90deg,var(--singularity),var(--void))}

/* the cut collapses: a squircle becomes a circle. One property, and it is
   gravitational collapse rendered as a shape. */
.lamp .sg-cut{border-radius:var(--r);transition:border-radius .45s var(--ease-collapse),
                                                 transform .45s var(--ease-collapse)}
:root[data-light="collapsed"] .lamp .sg-cut{border-radius:50%}

/* ring of light on collapse — the same treatment as the accretion core in
   Task 24, so the two read as one idea in two places. */
:root[data-light="collapsed"] .lamp .sg-cut{box-shadow:0 0 0 1.5px var(--star),0 0 10px var(--cyan)}
```

And one token, because nothing in this app currently has weight:

```css
:root{--ease-collapse:cubic-bezier(.34,1.56,.64,1)}   /* overshoot; --ease never does */
```

⚠️ **`prefers-reduced-motion` must neutralise `--ease-collapse`, not just shorten it.** An overshoot curve is movement past the target and back — exactly what the query exists to suppress. Set it to `var(--ease)` inside the existing reduced-motion block rather than adding a second one.

- [ ] **Step 4: Verify, then commit**

Run: `npx electron scripts/capture-window.mjs` — both lighting states must still capture as byte-distinct images. Then the detector, which must still return exactly one finding: a two-stop `linear-gradient` is not `repeating-stripes-gradient`, but the contract is a count, so it gets re-measured rather than reasoned about.

```bash
git add web/app.css web/index.html
git commit -m "feat(lamp): an edge, a word for each state, and weight on the collapse"
```

### Task 19: Make the greyscale check actually pass

**Files:** `web/app.css:196, 286, 292, 519-520, 487` · `web/app.js` (`#openstate`)

**Why this is not cosmetic.** `DESIGN.md` states *"no state is ever colour alone"* and calls the greyscale render a **runnable check**; `HANDOFF.md` claims it passes. It passes on the contact sheet and fails on the primary surface.

- [ ] **Step 1: Put a mark in the open view**

F29. Desaturated, `#openstate` renders `megaphone.src   gif · 144 frames · needs you` as one uniform grey run — `.s-needs-you` changes `color` only (`app.css:286`) and `#openstate b{font-weight:500}` matches its neighbours. **There is no pencil mark in the open view at all**; `pencil()` is drawn on sheet tiles and the banner and never here. Add it, at the state's own size, beside the name.

- [ ] **Step 2: Hatch one segment of the ledger bar**

F30. `.lseg-bg` (`--ruby-bg`) against `.lseg-total` (`--cyan-bg`) is a **1.10:1** greyscale step collapsed and **1.04:1** emitting — one solid block when desaturated. Use the hatch vocabulary already at `app.css:619` on the removed segment.

- [ ] **Step 3: Demote the chroma swatch**

F31. `--sw-chroma:#00FF7F` is the most saturated, highest-attention element in the whole window — a tertiary verification control out-shouting the artwork whose edges you are colour-judging, and a third accent in a system whose rule is two. Desaturate at rest; show the true key green on hover and when selected.

- [ ] **Step 4: Prove it with a script, not an opinion**

Add `scripts/check_greyscale.py`: desaturate each capture in `local/window-shots/`, and assert for each state that its mark's bounding region differs from its surroundings by a stated luminance margin. Wire it into the gate. ⚠️ Without this the claim goes back to being an assertion, which is how it survived two audits.

- [ ] **Step 5: Commit**

```bash
git add web/app.css web/app.js scripts/check_greyscale.py scripts/capture-window.mjs
git commit -m "fix(greyscale): make the state legible without colour, and check it"
```

### Task 20: Both halves of the comparison on the same ground

**Files:** `web/index.html:73` · `web/app.css:180, 496-498`

- [ ] **Step 1: Give the left half a matte too**

F28. `#aftbg` carries `.chk-s` clipped to the right of the seam; nothing sits behind the left half, so *keep it* composites over the starfield and *cut it* over a checkerboard — and the matte picker repaints only the right half. For a tool that judges an alpha edge, the ground changing at the comparison line is a methodological defect.

- [ ] **Step 2: Commit**

```bash
git add web/index.html web/app.css
git commit -m "fix(wipe): both answers sit on the same ground"
```

---

## Stage 4 — THE LAYOUT

*The only genuinely drastic part, and last on purpose: it is the largest change and benefits from Stages 1-3 being true first.*

### Task 21: Put the chrome on the long axis

**Files:** `web/app.css` (`.open`, `.stage`, `.wipe`, `.questions`, `.ledger`, `.film`) · `web/index.html` (the open view's structure)

- [ ] **Step 1: Record the before**

F32. Measured this session at 1280×796: `#wipe` is **289×289** with a question open and **553×553** without — 359px of chrome appears exactly when judging matters most. Capture the same two numbers after.

- [ ] **Step 2: Restructure**

A square focal element in a 1.55:1 window wants its companions beside it. Move the question, its two answers and the ledger into a right-hand decision column; keep the film strip on the long axis under the stage. Put the two answers **under their own half of the seam** so the choice and its evidence are one object — this resolves the two agents' competing proposals rather than splitting them.

⚠️ Keep `#wipe`, `#wipe-a`, `#wipe-b`, `.hist` and `#qcard` ids and classes intact — the gate asserts on them.

- [ ] **Step 3: Assert the artwork grew**

```js
  check('the artwork leads its own view', wipeWithQuestion.w >= 550,
        `${wipeWithQuestion.w}px with a question open (was 289)`);
```

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/app.css scripts/capture-window.mjs
git commit -m "feat(layout): put the chrome beside the artwork, not under it"
```

### Task 22: De-rotate the rail, overlay the drawer

**Files:** `web/app.css` (`.tabs`, `.drawer`) · `web/app.js` (`renderTabs`)

- [ ] **Step 1: The rail**

F33. Keep it thin — `DESIGN.md`'s drawers-not-columns decision is measured and survives. Drop `writing-mode`, 48-56px, a mark per tab from the existing `pencil()` vocabulary, label in a hover/focus popover, a rest-state inset border so it reads as tabs before you click, `aria-controls`, `⌘1`-`⌘6`. F35: no rail on the empty table.

- [ ] **Step 2: The drawer**

F34. `.drawer` is a flex sibling, so opening it shrinks the artwork you are judging — and the codebase already carries a `ResizeObserver` working around the symptom. Overlay it. Add a close control, `Escape`, and `aria-labelledby`.

- [ ] **Step 3: Commit**

```bash
git add web/app.css web/app.js
git commit -m "feat(nav): tabs you can read, and a drawer that does not resize the work"
```

### Task 23: The contact sheet earns its space

**Files:** `web/app.css` (`.sheet`, `.frame`) · `web/app.js:216-251` (`renderSheet`, `tile`)

- [ ] **Step 1: Density responds to count**

F37. ⚠️ Do not centre a fixed grid — that breaks at n=200 and contradicts *"one asset, twelve and two hundred are the same layout"*, which is an information-architecture claim, not a sizing claim. A larger `minmax` below a threshold, a capped `max-width`, `margin-inline:auto`.

- [ ] **Step 2: State must win the squint**

F36. Hierarchy is currently set by the source file's canvas colour — the needs-you card is loud **by coincidence**, and six already-cut assets would leave no focal point. Sort needs-you and refused first, give those tiles a real ring plus the hatch, normalise every tile's window ground, and make the header's `1 needs you` a filter.

- [ ] **Step 3: Prove it with a desaturated blur**

Extend the gate: desaturate and blur `01-contact-sheet.png`, assert the needs-you tile is the brightest region. `DESIGN.md` claims this passes; `HANDOFF.md` claims it was checked. It fails today.

- [ ] **Step 4: Commit**

```bash
git add web/app.css web/app.js scripts/capture-window.mjs
git commit -m "feat(sheet): let state set the hierarchy, not the source art"
```

---

## Stage 5 — THE SIGNATURE

*Added 2026-09-06 17:38 EDT. The only stage that adds rather than repairs.*

**Provenance.** The user supplied `~/Downloads/void_black_hole_design_system.html` — a Tailwind-CDN showcase of gravitational loaders and theme switches — and said explicitly: *"you dont need to implement them exact as they are. you can take their ideas, their reference, or parts of them and manipulate/craft their design to our situation."* So these tasks take techniques, not markup, and every value below is restated in Devoid's own tokens.

**Two of the reference's five headline pieces were rejected outright and must not be revived here:**

| rejected | why |
|---|---|
| The tiled 1px grid background, `linear-gradient(...1px,transparent 1px)` at `28px` | It is the exact shape of `repeating-stripes-gradient`, and this project's contract is **exactly one** finding of that rule. It is also a workbench motif, which is the world `DEVLOG.md` records as deliberately replaced |
| `bg-clip-text` + `text-transparent` on the wordmark | Devoid's wordmark is a supplied PNG, so there is nothing to clip; and transparent-filled text is unmeasurable by the contrast audit that currently reports zero failures at worst 5.12:1 |

### Task 24: The accretion core — a loading state that means something

`devoid-deferred-list.md` carries *"200 assets decoding at once, and the loading state does not mean anything yet."* Today a loading tile gets `el('span', 'devbar')` (`web/app.js:238`) — a bar whose own comment reads *"opacity, not movement — survives reduced motion."* That is a correct constraint and a placeholder component. This task replaces it with the app's signature.

**The idea, restated in this app's terms:** a black hole is an *absence* ringed by light, which is what this app makes. The reference draws it with a `conic-gradient` disc laid flat by `rotateX`, a blurred halo, and a pure-black core with a hairline white ring. Devoid already owns both of that disc's colours — `--ruby` is *this goes*, `--cyan` is *this stays* — so the loader is the product's two ideas orbiting the thing being removed.

**Files:**
- Modify: `web/app.css` (new `.core` block near the existing `.devbar` rules)
- Modify: `web/app.js:238` (the `loading` branch) · `web/app.js:864` (`Reading the log…`)
- Modify: `scripts/capture-window.mjs`

**Interfaces:**
- Produces: a `.core` element, sized by `--core-size` so one component serves the 28px tile, the 64px drawer and a 128px boot state.

- [ ] **Step 1: Add the failing gate assertion**

```js
  const core = await probe(`return {
    n: document.querySelectorAll('.core').length,
    ring: !!document.querySelector('.core .core-ring')
  }`);
  check('a loading tile draws the accretion core', core.n > 0, `${core.n} .core nodes`);
```

Run: `npx electron scripts/capture-window.mjs` Expected: **FAIL**, `0 .core nodes`.

- [ ] **Step 2: Write the component**

```css
/* ⚠️ NOT on the stage. DEVLOG.md: "lensing is banned from the stage, because
   the stage is where you judge an edge." This is for tiles, the drawer and the
   boot state — never over artwork being judged. */
.core{--core-size:28px;position:relative;width:var(--core-size);height:var(--core-size);
      display:grid;place-items:center;perspective:calc(var(--core-size) * 5)}
.core-disk{position:absolute;inset:0;border-radius:50%;
           transform:rotateX(74deg);
           background:conic-gradient(from 0deg,var(--star),var(--ruby) 28%,
                      transparent 52%,var(--cyan) 78%,var(--star));
           filter:blur(1px);
           animation:core-spin 1.8s linear infinite}
.core-ring{position:absolute;width:64%;height:64%;border-radius:50%;
           background:var(--singularity);
           box-shadow:0 0 0 1.5px var(--score-2),0 0 8px var(--ruby)}
@keyframes core-spin{to{transform:rotateX(74deg) rotate(360deg)}}
```

⚠️ **`rotate` must stay inside the same `transform` as `rotateX`.** Animating `rotate` alone silently drops the `rotateX` and the disc stands upright — the one mistake the reference's own first keyframe block makes and its second one fixes.

- [ ] **Step 3: Preserve the reduced-motion contract**

The bar it replaces was explicitly chosen to survive `prefers-reduced-motion`. The core must not regress that:

```css
@media (prefers-reduced-motion: reduce){
  .core-disk{animation:none;opacity:.55}
  .core-ring{box-shadow:0 0 0 1.5px var(--score-2)}
}
```

A still disc with a ringed core still reads as "working"; nothing moves.

- [ ] **Step 4: Wire it to the three places that need it**

`web/app.js:238` — replace the `devbar` append in the `loading` branch. `web/app.js:864` — the history drawer's `Reading the log…` refusal gets a `.core` at `--core-size:20px` beside the text. Keep both strings; the component is added, not substituted for the words.

- [ ] **Step 5: Run the gate and the detector**

Run: `npx electron scripts/capture-window.mjs` Expected: PASS. Then `node ~/.claude/skills/impeccable/scripts/detect.mjs --json web/index.html web/app.css web/app.js` — **exactly one finding, and not DEGRADED.** A `conic-gradient` is not a repeating stripe, but this is the project's one measured design contract and it gets measured.

- [ ] **Step 6: Commit**

```bash
git add web/app.css web/app.js scripts/capture-window.mjs
git commit -m "feat(loading): an accretion core, so waiting means something"
```

### Task 25: A state pip that is always telling the truth

`devoid-deferred-list.md` carries *"The history drawer can sit on 'Reading the log…' while analyses run."* The drawer lies while you are not looking at it. A header pip cannot, because it is never not on screen.

**The idea:** the reference puts a pulsing white dot inside a black disc in its header. It is decoration there — hardcoded, wired to nothing. Here it is driven by real state, which is the whole difference.

**Files:**
- Modify: `web/index.html` (`<header class="chrome">`, after `#crumb`)
- Modify: `web/app.css` · `web/app.js` (`renderPrimary`, which already computes `busy`)
- Modify: `scripts/capture-window.mjs`

**Interfaces:**
- Consumes: `targets()` and `stateOf()`, already in `app.js`; the banner's `data-state`.
- Produces: `#pip` carrying `data-pip` of `idle` · `working` · `blocked`.

- [ ] **Step 1: Add the failing gate assertion**

```js
  const pip = await probe(`const p = document.getElementById('pip');
    return { present: !!p, state: p && p.dataset.pip, label: p && p.getAttribute('aria-label') }`);
  check('the header pip reports engine state', pip.present && !!pip.state, JSON.stringify(pip));
```

Run: `npx electron scripts/capture-window.mjs` Expected: **FAIL**, `{"present":false}`.

- [ ] **Step 2: Markup**

```html
    <span class="pip" id="pip" data-pip="idle" role="status" aria-label="Engine idle"></span>
```

- [ ] **Step 3: Style it as the same object as the loader, at 8px**

```css
.pip{position:relative;width:10px;height:10px;border-radius:50%;
     background:var(--singularity);box-shadow:0 0 0 1px var(--score-2)}
.pip::after{content:"";position:absolute;inset:2px;border-radius:50%;background:var(--graphite-3)}
.pip[data-pip="working"]::after{background:var(--cyan);animation:pip-ping 1.6s var(--ease) infinite}
.pip[data-pip="blocked"]::after{background:var(--ruby)}
@keyframes pip-ping{0%{opacity:.35}50%{opacity:1}100%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.pip[data-pip="working"]::after{animation:none;opacity:1}}
```

⚠️ **Opacity, not scale.** A scaling ping is movement; this app's reduced-motion rule already forced that choice once for `.devbar` and the same reasoning applies. ⚠️ **Not colour alone** — `DESIGN.md`'s greyscale rule. `blocked` is the only state that is also announced by the banner, and `working` is the only one that moves; the `aria-label` carries the word in every case.

- [ ] **Step 4: Drive it from state**

In `renderPrimary` (`web/app.js:1244`, which already computes `busy`):

```js
  const pip = $('#pip');
  if (pip) {
    const blocked = targets().some(x => stateOf(x) === 'blocked' || stateOf(x) === 'failed');
    const s = blocked ? 'blocked' : busy.length ? 'working' : 'idle';
    pip.dataset.pip = s;
    pip.setAttribute('aria-label',
      s === 'working' ? `Engine working on ${busy.length}` :
      s === 'blocked' ? 'Engine blocked' : 'Engine idle');
  }
```

⚠️ `renderPrimary` runs on every render and on the poll tick (`web/app.js:1087`), which is exactly the cadence the pip needs. Do not add a second timer.

- [ ] **Step 5: Gate, then commit**

Run: `npx electron scripts/capture-window.mjs` Expected: PASS.

```bash
git add web/index.html web/app.css web/app.js scripts/capture-window.mjs
git commit -m "feat(chrome): a pip that reports engine state without opening the drawer"
```

### Task 26: A gravitational well behind the stage

**Files:** `web/app.css:169` (`.stage`) · `scripts/capture-window.mjs`

The reference layers two things behind its display: a tiled grid, and a radial vignette. **The grid is rejected above.** The vignette is the one to take — it is light falling into a well, which is on-metaphor, has no repeat, and does what the grid was reaching for: it makes the stage read as a bounded volume rather than a flat panel.

⚠️ **This runs after Stage 4.** Tasks 21–23 move the chrome to the long axis and re-proportion the stage; a vignette tuned to the old geometry would have to be redone.

- [ ] **Step 1: Add the failing gate assertion**

```js
  const well = await probe(`const st = getComputedStyle(document.getElementById('stage'));
    return { bg: st.backgroundImage }`);
  check('the stage sits in a gravitational well', /radial-gradient/.test(well.bg), well.bg.slice(0, 90));
```

Expected: **FAIL** — `none`.

- [ ] **Step 2: Write it in the app's own nebula tokens**

```css
/* light falling inward. Uses the nebula tokens rather than a black wash, so it
   darkens in collapsed and lightens in emitting without a second rule. */
.stage{background-image:radial-gradient(ellipse at center,transparent 38%,var(--neb-violet) 92%)}
```

⚠️ **The centre must stay fully transparent well past the artwork's bounds.** The stage is where an edge is judged; a tint that reaches the artwork is the lensing the world rules ban. `38%` is a starting value — confirm against `local/window-shots/` that the artwork sits entirely inside the transparent core at the narrowest supported window, and raise it if not.

- [ ] **Step 3: Gate, detector, commit**

```bash
git add web/app.css scripts/capture-window.mjs
git commit -m "feat(stage): a gravitational well, so the stage reads as a volume"
```

---

## Deferred to their own session

Filed rather than folded in, because each needs its own measurement:

- **A11** film-strip targets falling below 24px on a narrow window (SC 2.5.8) — folds into A10's breakpoint work.
- **A2** keyboard region drawing · **A3** focus restoration across `render()` · **A7** a `done` announcement · **A8** the argparse dest leaking into the accessible name · **A10** window minimums and breakpoints · **A12** the reduced-motion rule contradicting its own comment.
- **P1** the permanent 60fps forced-layout loop · **P2** wipe.js's clock never stopping · **P4** rejected promises cached forever · **P5** the sheet's rebuild restarting GIF playback · **P6** the starfield repainting every render.
- **P3 is settled, not deferred:** the unbounded decode caches were flagged as possibly-P0 pending a file the agent had not read. `server/preview.py:89,208` extracts **one** frame per side, so the multi-frame risk does not apply today. Re-open only if previews become multi-frame.
- **D2** (is the empty state off-limits) and **D3** (does `.lamp` gain a label and a border) are open decisions with no task until answered; neither blocks any stage.
- **The detector's dependencies** are a symlink into `/tmp` with no `package.json`; one `/tmp` sweep makes it return `[]`, which reads exactly like clean.
- **The conspicuity gate's calibration** (`wipe.js:105-142`) was derived when the two answers were provably identical, before the `--auto` fix. Live numbers are 10× the threshold and `meanDelta` is 1.0, so the card branch may now be unreachable. **Re-derive across all eight corpus assets before trusting it either way.**

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

## Closed items

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

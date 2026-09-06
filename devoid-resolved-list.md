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

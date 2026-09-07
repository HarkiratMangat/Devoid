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

### `[P2 · S · Opus5-Med]` The density rule has three edges nobody has seen *(filed 2026-09-07, from the deep pass that followed building it)*

The rule ships and is asserted at 4, 20 and 60 assets with **exactly one** `needs-you` tile. All three assertions test its happy path. ⚠️ **Falsifying the CHECK is not testing the RULE's edges** — breaking the CSS makes the gate go red, which proves the gate works and says nothing about these:

1. **A crowd where NOTHING needs you.** Two hundred settled assets: every tile 147px, no span, no landmark. The rule's whole justification is findability and in the commonest end state it provides none. That may be correct — nothing needs finding — but it is undecided rather than decided.
2. **A crowd where EVERYTHING needs you.** Two hundred `needs-you` tiles all spanning two columns degenerates to a uniform grid at double size, which is *worse* than uniform 147px because it doubles the scroll. Nothing caps the span.
3. **The 40/41 boundary, mid-drop.** One arriving asset flips every tile from 282px to 147px — a 48% jump while the person is watching. Assets arrive one at a time from a drop, and `07-arrival` captures 12, nowhere near it.

**Concrete next action:** decide each one before writing CSS — a floor on the span count, a different landmark when the crowd is uniform, and whether the bucket change should be animated or deferred until the drop settles. Then extend the gate: it currently seeds one demanding tile, so give it a zero-demanding and an all-demanding case.

### `[P2 · XS · Sonnet5-Med]` The engine repo's pointer to this one is wrong, and only Devoid knows *(filed 2026-09-07)*

`scripts/harness/labels/README.md` in `/Applications/Claude Code/Gif-Background-Remover` says Devoid *"records every answer as a labelled row"* at `labels/protection.jsonl`. **That stopped being true 2026-09-07 12:03 EDT** when the writer was removed.

⚠️ **The correction is flagged in this repo's `CLAUDE.md` and filed NOWHERE in that repo** — so a session working on the engine's autonomy reads a confident sentence and believes it. That repo has already had to clean up exactly this shape once: `gif-deferred-list.md:185` reads *"This was previously described in Devoid's HANDOFF.md as already filed here. It was not."* **Filing it there is the fix; flagging it here is what caused that entry.**

**Concrete next action:** branch in the engine repo, correct the README's claim, and file the item in `gif-deferred-list.md` so the correction is visible from inside that repo. Push and merge are asked separately, there as here.


### `[P1 · S · Sonnet5-High]` Every render pays for a second full analysis the app already ran *(filed 2026-09-05)*

`server/render.py:143` builds every render argv through `cli.build_argv(..., auto=True)`, which always emits `--auto`. `--auto`'s pass 1 is `recommend()`, which is the same analysis `POST /api/assets/{id}/analyze` already ran and stored on the asset. **So the engine recomputes, per render, an answer Devoid is holding in memory** — measured in the engine repo at 39–47% of a run's cost, ~18s on a corpus asset here.

⛔ **Do not fix this by dropping `--auto`.** `--auto` is what makes the tri-state controls mean anything — `CLAUDE.md`'s rule is that a UI which sends all 63 flags turns `--auto` into a no-op and the tool stops thinking. The saving has to come from the engine accepting a precomputed analysis, not from the app declining to ask for one.

**Cross-repo:** the engine-side item is `[P1 · S · Opus5-High]` "`--auto` recomputes pass 1's analysis in pass 3" in `gif-deferred-list.md`, with a ready-to-build plan (`docs/plans/2026-09-01-analysis-cost-and-observability.md` Task 1). That fix is internal to one process; **this item is the cross-process version of it and needs its own surface** — most likely `--auto --analysis-json <path>`, symmetrical with the `--verify-json` already filed there.

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

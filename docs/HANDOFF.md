# Handoff — 2026-09-08 17:02 EDT

⚠️ **Ephemeral by design.** This file gets renamed `<date>-handoff.superseded.md` and rewritten. Nothing durable may live only here — `devoid-deferred-list.md`, `devoid-resolved-list.md`, `docs/DEVLOG.md` and `docs/CHANGELOG.md` are where work belongs.

## Where the work stands

**`main` is `708e119`, tagged v1.1.0, released** — a public repo, a public `.dmg`, the engine bundled inside it. Release notes for v1.0.0 and v1.1.0 rewritten to `docs/release-note-template.md`'s convention and published (independent of any branch — a GitHub Release edit).

**Branch `fix/honest-question-and-engine-path`, proposed as v1.2.0, committed and gate-verified.** Four `[P·]`s from `devoid-deferred-list.md` closed (moved to `devoid-resolved-list.md`), plus a UX-copy fix found while touching the same code:

| item | what changed |
|---|---|
| the region mark was a bounding box | now a real per-pixel colour mask (`web/regionmask.js`), CSS-masked onto the existing seam-clipped hatch — the P0 seam-clip regression path is untouched |
| a packaged app could not point at a different engine | `server/engine.py`'s `resolve_skill()` now checks `devoid.config.json` under `$DEVOID_DATA_DIR` before the bundle-relative copy |
| the seam's `SEAM_THRESHOLD` was undocumented as inert | traced in the code graph and verified: `web/wipe.js` never reads `seam_useful` |
| `09-seam.webp` didn't show a seam doing anything | recaptured — the mask fix made the underlying (already-differing) pair legible in the shot |
| "is this yours?" was the one un-unified label | `/impeccable clarify` found it; changed to `keep or cut?` |

⚠️ **The mask shipped silently broken on the first pass, and the gate did not catch it.** `web/app.js:2188`'s plain `window.Devoid = {...}` clobbered `regionmask.js`'s earlier attachment on every load; every existing assertion (node exists, clip-path moves) stayed green regardless, because none of them checked the mask was real. Found by six diagnostics ending in `rg -n "Devoid =" web/*.js`. Full account in `docs/DEVLOG.md`, 2026-09-08 16:45 EDT entry. `scripts/capture-window.mjs` now asserts the computed `mask-image` resolves to a real `url(...)`.

**Confirmed, not assumed:** full `npm test` (16 gates, including the new `test:regionmask` and the new mask falsifier) read back green; `02-open-question.png` and `09-seam.png` opened and visually checked — the hatch now follows the diagonal band, not the box; `check:tracker` confirms conservation holds after the deferred→resolved moves.

## What is open after this branch

1. `devoid-deferred-list.md`'s two remaining `[P2]`s: the lamp needing a word (already has one — check if this note is itself stale), and the differentiator table's redesign. Neither is in this branch's scope.
2. Push, PR, merge and tag — all individually asked, every time, per `CLAUDE.md`. Not yet asked this session.

## The one thing to read before touching anything

**A green gate is only as honest as what it actually checks.** This branch's own defect is the newest instance: a completely correct-looking implementation shipped inert because nothing asserted the one property that mattered. Before trusting a shared JS namespace (`window.Devoid` or otherwise) has a property you just added, grep every assignment to it across every script loaded into the same page — not just the file that added the property.

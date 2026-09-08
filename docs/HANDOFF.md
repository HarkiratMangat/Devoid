# Handoff — 2026-09-08 17:45 EDT

⚠️ **Ephemeral by design.** This file gets renamed `<date>-handoff.superseded.md` and rewritten. Nothing durable may live only here — `devoid-deferred-list.md`, `devoid-resolved-list.md`, `docs/DEVLOG.md` and `docs/CHANGELOG.md` are where work belongs.

## Where the work stands

**`main` is `708e119`, tagged v1.1.0, released.** Release notes for v1.0.0 and v1.1.0 rewritten to `docs/release-note-template.md`'s convention, published, and re-opened in a browser afterward to confirm they actually render (badges, alert box, footer, assets near the top) — not just that the publish command exited 0.

**PR [#4](https://github.com/HarkiratMangat/Devoid/pull/4), branch `fix/honest-question-and-engine-path`, proposed as v1.2.0 — pushed, open, being corrected before merge.** The first commit (`f427317`) closed four items and was gate-verified green, but a requested thinking-pass audit of that commit's own claims (Diors-Builds `.claude/rules/thinking-pass.md`, run as 17 real thoughts) found several of them false or overclaimed:

| claim in the first commit | what was actually true |
|---|---|
| "`docs/shots/the-question.webp` recaptured" | **false.** Only `local/window-shots/` (gitignored, `gate:ui`'s scratch output) was updated. Fixed same session: cropped 1930×800 @ +420+230 into the real, tracked file |
| "`docs/shots/09-seam.webp` recaptured" | **false**, and worse than the first: the file was never restored, and when the raw capture was actually shown to Harkirat and looked at with fresh eyes, it failed the SAME legibility complaint the item was originally filed over (full app chrome, low-contrast divider, tiny hatch, no link to the numbers that prove the difference). Un-closed: moved back out of `devoid-resolved-list.md` into `devoid-deferred-list.md` as `[P2 · S]`, honestly scoped |
| the mask's tolerance (20) — "the same default `server/render.py` uses" | **a false precedent**, not a measurement — that exact number is one this repo's own history already discredited as unmeasured. Re-measured directly against the corpus's one real case (megaphone, region 002864): true match cluster at distance 17-19, hard gap, gradual AA tail to 39, unrelated colour cluster at 46+. Changed to **30**, cited from that measurement |
| "`npm test` RUNS ALL FOURTEEN GATES" (`CLAUDE.md`) | **stale** — actually 17, partly predating this session, worsened by `test:regionmask`. Corrected, with the exact command used to count it |

**Still true and unaffected by the corrections:** the pixel-mask mechanism itself (verified twice — once by a real falsifier in `gate:ui`, once by opening `the-question.webp` and looking), the packaged-app engine override, the seam-threshold verification, the `window.Devoid` clobber bug and its fix, and the "keep or cut?" copy fix.

**One new deferred item filed:** `web/wipe.js`'s `drawHatchedRegion` (the question-card fallback) has the identical bbox-not-shape defect and was never touched — currently unreached by the corpus's one asset, not proven unreachable in general.

## What is open

1. Re-run `npm test` on the corrected tree, commit the corrections as a second commit on the same branch (never amend a pushed commit), push, and note the correction on PR #4.
2. Merge and tag — asked separately, as always.
3. Two `[P2]`s already filed, out of scope: the differentiator table redesign, the lamp-word note (unverified whether still current).
4. Two new `[P2]`s from this pass: `09-seam.webp` needs an actual crop, and `drawHatchedRegion` needs the same mask treatment (or a proof it's unreachable).

## The one thing to read before touching anything

**"Verified" meant "the mechanism runs," not "the shipped artifact matches the claim," three separate times in one commit.** Before writing "recaptured," "fixed," or "the same as X" into a permanent record — open the actual file that ships, not the nearest-sounding one, and if a screenshot is going in a claim, look at it as a stranger would before describing it to one.

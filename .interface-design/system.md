# Devoid — interface system

*Written 2026-09-04 23:10 EDT, after the void redesign. What was decided, so the next session extends it instead of re-deriving it. `docs/DESIGN.md` is the authority on the world and the rules; this file is the measured values.*

## Direction

**The ground is the void; the tools on it are the matte world.** The app makes pixels into nothing, and deep space is nothing rendered — so the table floats in a starfield while the instruments on it (grease pencil, film strip, rubylith, the plotter, the wipe) stay exactly as they were.

Feel: a quiet observatory at night. Dark, precise, instruments lit, nothing shouting. The artwork always wins; chrome recedes to near-invisible.

## Depth strategy — one per state, deliberately different

- **Collapsed (dark):** borders only. `inset 0 0 0 1px var(--score)`. Shadows do not read on a starfield and would fight the "nothing is behind this" premise.
- **Emitting (light):** shadows. A white card on a three-layer lift. The tonal step that carries the dark state vanishes under a squint on a light field — measured, by blurring the live page.

## Spacing

Base scale `--s1:6 --s2:10 --s3:16 --s4:26 --s5:38`. Multiples only. A raw px value in a rule is a bug unless it is a hit-target mechanism (see below).

## Type — three tiers on Archivo's width axis

The variable font was self-hosted for the axis; using it at three values 8% apart was invisible, proven by swapping it out and seeing nothing change.

⚠️ **RETRACTED 2026-09-06 — the table below records intent, not what renders.** `web/app.css:589` sets the instrument tier on ten selectors and **eight of them are mono**, where the axis does not exist: `.st`, `.crumb`, `.bword`, `.qhint`, `.nm`, `.ledger`, `.filmhead` and `.rt-lab`. Only `.tabs button` and `.ctl .lab` inherit Archivo and actually render 80%. The 2026-09-05 fix corrected the tier *values* and never checked whether the named elements could render them. Tracked as F20; the values in the table stay because they are the target, not because they are shipping.

| Tier | Width | Used for |
|---|---|---|
| Instrument | **80%** | state words, crumb, filenames, ledger, drawer labels, tab labels — anything that annotates rather than speaks |
| Button | 88% | control labels |
| Body | 100% | anything you read a sentence of |
| Display | **116%** | headings, the open asset's name |
| Wordmark | — | **drawn artwork, not type** (`web/assets/wordmark*.png`), so it carries no width axis. Two files, swapped on the lighting state; `scripts/make_wordmark.py` rebuilds both from the master |

**Which family carries the width axis, measured with fontTools `fvar` on the self-hosted files in `web/fonts/`:**

| Family | Axes | Width axis? |
|---|---|---|
| **Archivo** (body, headings, buttons, tab labels) | `wght`, `wdth` | **yes** — this is the only family `font-stretch` does anything to |
| **Spline Sans Mono** (numbers, hex, filenames, flag names, state words) | `wght` | **no** |

Mono is Spline Sans Mono for every number, hex, filename and flag name. **It has no `wdth` axis, browsers do not synthesise width, and `font-stretch` on it is silently inert — never apply `font-stretch` to a mono selector.** A rule that condenses type must name Archivo elements only; if an instrument-tier element needs to be condensed, it has to be Archivo, not mono.

## Colour

Two load-bearing colours and no third accent. `--ruby` = this goes, `--cyan` = this stays. They are also the two colours of an accretion disk (hot blue inner edge, warm red-orange outer), which is why the void world fit an existing palette rather than replacing it.

Void `#110E1B` is violet-tinted, not neutral black: real deep-sky is, and it keeps the app out of the near-black-plus-one-acid-accent look. ⚠️ **It was `#06050D` until 2026-09-06 19:24 EDT.** The five dark planes were separated by 0.85, 2.09, 0.37 and 4.26 ΔL* — two of four steps perceptually invisible — so the ladder was re-derived at ~4 ΔL* per step along the same violet ray. `scripts/check_contrast.py` measures it; the numbers here are its output, not a claim.

⚠️ **No state is ever colour alone.** Every state carries a shape or a word. This rule has been broken twice and caught twice — check any new state against it before shipping.

## Component values worth remembering

| Component | Values |
|---|---|
| `.btn` | 7px 15px pad · `--r` radius · 12px/88% width · 34px tall |
| `.lamp` (lighting toggle) | 56×28 · 6px radius · a miniature wipe, click-to-sweep, 11px hot rim riding the cut · **never a circle** |
| `.swatch` (matte) | **18px specimen inside a 28px target** via a 5px transparent border — WCAG 2.2 AA 2.5.8. ⚠️ This row said *16-in-24* until 2026-09-06 19:24 EDT, which is not what the CSS has ever shipped (F27). The file records what ships |
| `.lamp` | **64×32** with a persistent `1px solid var(--score-2)` in both states. At 56×28 and borderless it was invisible on `--bench:#FFFFFF` |
| `.frame` (contact tile) | `--r2` radius · `--s2` pad · hairline in dark, shadow in light |
| Starfield | canvas, drawn once to fit, density `area/3300`, radius `0.42 + m*1.18` where `m = random^2.4`. **Never tile it** |

✅ **RESOLVED 2026-09-06 19:24 EDT — the tile is gone.** `--stars-a` is no longer painted by `.chk-s`, `--stars-b` is deleted from both lighting blocks, and `web/app.js`'s per-tile `background-position` randomisation went with it: there is no repeat left to hide. `.lamp .sg-void` keeps its single star layer, because a 64×32 control shows one tile and a tile that never repeats is not a pattern. The record of the failure is kept below, because the correction is the useful part.

⚠️ **RETRACTED 2026-09-06 — "never tile it" is the rule, and the shipped code breaks it.** The canvas replaced only the full-screen field. Every `.chk-s` surface still paints the tiled SVG `--stars-a` (`web/app.css:106` — contact-sheet tile, matte swatch, the wipe's cut side), as does `.lamp .sg-void` (`web/app.css:464`); `--stars-b` is defined in both lighting blocks and referenced zero times. `web/app.js:233` randomises each tile's `background-position`, which hides the repeat rather than removing it. Removing it is **Task 16 of `docs/superpowers/plans/2026-09-06-devoid-remediation.md`** (finding F24).

## Motion

- Enter/interactive: `cubic-bezier(.23,1,.32,1)`. On-screen movement: `cubic-bezier(.77,0,.175,1)`. Under 300ms except the open transition (340ms).
- The arrival is the one orchestrated moment and fires **once per session**, on a drop onto a genuinely empty table.
- ⚠️ **Lensing never touches the stage.** Empty table, toggle and arrival only. A preview that warps shows you something you are not going to get.
- Scrubbing frames gets no easing at all.

## Checks this build passes, and how they were run

- **Contrast:** every pair computed in both states. Worst 5.12:1.
- **Squint:** a real 5px blur on the live page, both states.
- **Swap:** Archivo replaced with `system-ui` and the axis stripped, screenshotted against the real thing.
- **Detector:** `node ~/.claude/skills/impeccable/scripts/detect.mjs` — exactly one accepted finding, `repeating-stripes-gradient` (the alpha checkerboard).
- **Focus:** real Tab presses, not `.focus()` — programmatic focus does not trigger `:focus-visible` and will tell you the ring is missing when it is not.

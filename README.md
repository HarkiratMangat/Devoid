# Devoid

A local desktop app for removing the background from animated images — GIF, WebP, AVIF, APNG, and static PNG/JPEG — and fitting the result to a size or format target.

It is a front end for the [gif-background-remover](../Gif-Background-Remover) skill, which stays the engine. Devoid reimplements no image processing.

## Why a front end

The skill exposes **63 command-line options**, but that is not the friction it looks like — its own `--auto` already picks them. The friction is three questions: a coin-flip protection decision that fires on **12.8% of assets** (measured across 304), a fade it can name but not classify, and the size/format goal it deliberately never guesses.

The first two are visual questions delivered as prose naming a hex colour and a bounding box. Nobody can answer them by reading. **They have to see it.** That is the product.

`--recommend` already returns all three as structured JSON before anything renders, so Devoid reads the questions first, answers them, and `--auto` never refuses.

## The shape

**There is no mode — the strip is the app.** Nothing selected and it fills the space as a contact sheet; select one and it opens while the rest stay along the edge; panels are drawers summoned at the edge. Selection is the only state, so one asset and two hundred are the same layout.

**The core interaction is a seam you drag.** Two renders of the same asset, one dashed cut line between them, both playing. Instead of *"is this region design or background?"* — an analyst's question — you see both answers and pick. It generalises to every flag with a visible consequence.

## Layout

| | |
|---|---|
| `docs/HANDOFF.md` | **read first** — state of the work, decisions, rejected options, and the model to run the build session on |
| `docs/PLAN.md` | the implementation plan — opens with a literal ten-step sequence |
| `docs/PRODUCT.md` | what it is, who for, the non-negotiable constraints and the measurements behind them |
| `docs/DESIGN.md` | the visual system — tokens, type, layout, motion, and the checks it has to keep passing |
| `prototype/` | a working prototype: real state, real interactions, real corpus assets |

## Running the prototype

```sh
cd prototype && python3 -m http.server 8731
```

Then open `http://localhost:8731`. The lamp switches lighting states, clicking a frame opens it, the seam drags, and the drawers summon. ⚠️ **The film strip does not scrub yet** — it highlights and counts, but the artwork is a looping `<img>` that never seeks. Frame-accurate seeking needs a canvas decoder; it is `PLAN.md` 3.3.

The assets in it are **real outputs from the skill's own corpus**, not icons drawn to flatter the layout — which is how the overlay bug in `docs/DESIGN.md` was found.

# Devoid

A local desktop app for removing the background from animated images — GIF, WebP, AVIF, APNG, and static PNG/JPEG — and fitting the result to a size or format target.

It is a front end for the [gif-background-remover](../Gif-Background-Remover) skill, which stays the engine. Devoid reimplements no image processing.

## Why a front end

The skill exposes **63 command-line options**, but that is not the friction it looks like — its own `--auto` already picks them. The friction is three questions: a coin-flip protection decision that fires on **12.8% of assets** (measured across 304), a fade it can name but not classify, and the size/format goal it deliberately never guesses.

The first two are visual questions delivered as prose naming a hex colour and a bounding box. Nobody can answer them by reading. **They have to see it.** That is the product.

`--recommend` already returns all three as structured JSON before anything renders, so Devoid reads the questions first, answers them, and `--auto` never refuses.

## Two lanes

**Board** — drop a pile. Everything analyses at once, most comes back settled, and whatever needs a decision is pulled forward at a size you can actually judge.

**Bench** — one asset, as long as it takes. Regions are drawn on the artwork rather than typed as coordinates.

## Layout

| | |
|---|---|
| `docs/PRODUCT.md` | what it is, who for, the non-negotiable constraints and the measurements behind them |
| `docs/DESIGN.md` | the visual system — tokens, type, layout, motion, and the checks it has to keep passing |
| `prototype/` | a working prototype: real state, real interactions, real corpus assets |

## Running the prototype

```sh
cd prototype && python3 -m http.server 8731
```

Then open `http://localhost:8731`. The lamp switches lighting states, the questions are answerable, clicking a settled cell opens it on the Bench, the filmstrip scrubs, and the matte toggles.

The assets in it are **real outputs from the skill's own corpus**, not icons drawn to flatter the layout — which is how the overlay bug in `docs/DESIGN.md` was found.

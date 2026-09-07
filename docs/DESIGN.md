---
name: Devoid
description: Removing the background from animated images, by showing you the question instead of describing it
colors:
  rubylith-red: "#E2402A"
  rubylith-ink: "#FF8168"
  rubylith-bg: "#3A150E"
  event-horizon-cyan: "#22D3EE"
  event-horizon-ink: "#5FE0F5"
  event-horizon-bg: "#0B2C33"
  accretion-gold: "#FFE9B8"
  deep-sky-violet: "#110E1B"
  singularity-black: "#030209"
  starlight: "#FFFFFF"
  bench: "#221D37"
  bench-raised: "#2C2547"
  bench-well: "#020204"
  sprocket: "#1A162A"
  graphite: "#E8E9F2"
  graphite-2: "#A6A6BC"
  graphite-3: "#8E8EA8"
  checker-a: "#0C0A16"
  checker-b: "#08060F"
  status-ok: "#46C98A"
  status-amber: "#E3B04B"
  on-cyan: "#04212A"
  on-rubylith: "#1F0403"
  chroma-key-rest: "#4C6357"
  chroma-key-live: "#00FF7F"
  ring-inner: "#FFFFFF"
  ring-outer: "#0B0A12"
  lamp-lit-1: "#FFF9EC"
  lamp-lit-2: "#F6F2E7"
  lamp-lit-3: "#E7E3D8"
  rim-core: "rgba(255,246,222,1)"
  rim-mid: "rgba(255,214,150,.42)"
  rim-edge: "rgba(255,190,110,0)"
  emitting-bloom: "rgba(255,252,244,.95)"
typography:
  display:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 116"
  headline:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Spline Sans Mono', monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: "'Spline Sans Mono', monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.02em"
  figure:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1
  display-fluid:
    fontFamily: "Archivo, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(28px, 5vw, 44px)"
    fontWeight: 700
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "20px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "26px"
  xl: "38px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "7px 15px"
  button-hover:
    backgroundColor: "{colors.bench-raised}"
  button-primary:
    backgroundColor: "{colors.event-horizon-cyan}"
    textColor: "{colors.on-cyan}"
    rounded: "{rounded.sm}"
    padding: "7px 15px"
  tile:
    backgroundColor: "{colors.sprocket}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  tile-needs-you:
    backgroundColor: "{colors.bench-raised}"
  input:
    backgroundColor: "{colors.deep-sky-violet}"
    textColor: "{colors.graphite}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
  card:
    backgroundColor: "{colors.bench}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-2}"
    rounded: "{rounded.sm}"
    size: "40px"
  region-mark:
    backgroundColor: "{colors.rubylith-red}"
    textColor: "{colors.on-rubylith}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
---

# Devoid — design system

*Rewritten 2026-09-03 23:20 EDT, after a prototype built with real assets falsified three claims the first version made. Product context is in `PRODUCT.md`; where the work stands is in `HANDOFF.md`.*

**Mode: Operate.** The person is completing a task. Scanability, consistency and the real usage scene outrank expression; brand lives in precise details.

⚠️ **This document states rules and points at tokens. It does not restate numbers the CSS owns.** The first version quoted a checkerboard cell size, the prototype changed it for a measured reason, and the doc was stale inside its own commit. A doc that repeats a value has a second copy to keep in sync; a doc that names the rule and the token does not.

## Overview

**Creative North Star: "The Void and the Bench — lit by an accretion disk"**

*Named 2026-09-06 20:53 EDT. Two metaphors were offered and both were wanted, so the North Star holds both rather than picking: the STRUCTURE is a bench standing in the void, and the LIGHT on it is an accretion disk. Neither half survives alone — a bench with no void is a workshop app, and a void with no bench is a screensaver.*

The ground is deep space and the tools standing on it stay matte and physical. Nothing about the void reaches the artwork: lensing lives in the empty table's horizon and in the lighting toggle, never on the stage, because warping something you are judging shows you a result you are not going to get. The palette was not chosen to fit this world — the world was chosen because the app's two existing load-bearing colours already **were** an accretion disk's two colours, hot blue on the inner edge and warm red-orange on the outer. The world explains the palette; it did not replace it.

Density is a tool's, not a document's. The person is usually mid-task and wants to be finished, so chrome earns its place against the artwork every time and loses by default.

**Key characteristics:**

- Two load-bearing colours and no third accent — rubylith says *this goes*, cyan says *this stays*.
- No state is ever colour alone. Every state carries a mark or a word, and `npm run check:greyscale` proves it.
- Two depth strategies on purpose: borders on the void, shadows on light. A stated exception with a measured reason, not an inconsistency.
- Numbers live in the CSS. This document names rules and points at tokens; a doc that repeats a value has a second copy to keep in sync.

## Colors

Two lighting states, not two themes: **collapsed** is the void, **emitting** is a white hole — the same field giving light back instead of taking it. Every token below has a value in both, and `npm run check:contrast` measures every pair in both before it is allowed to be true.

| role | collapsed | emitting | carries |
|---|---|---|---|
| `rubylith-red` | `#E2402A` | `#E2402A` | **this goes.** Also the destructive colour, so there is no second red |
| `rubylith-ink` | `#FF8168` | `#A82D18` | rubylith as text |
| `event-horizon-cyan` | `#22D3EE` | `#0E7F96` | **this stays**, the path, focus, the seam. ⚠️ Light needs its own value: `#22D3EE` measures 1.81:1 on white |
| `event-horizon-ink` | `#5FE0F5` | `#0E6B80` | cyan as text |
| `accretion-gold` | `#FFE9B8` | `#B08029` | the horizon, and the warm rim on the lighting toggle |
| `deep-sky-violet` | `#110E1B` | `#EFEEF6` | the ground. Violet-tinted, never neutral black |
| `bench` / `bench-raised` / `bench-well` / `sprocket` | `#221D37` / `#2C2547` / `#020204` / `#1A162A` | `#FFFFFF` / `#F2F1FA` / `#E2E1EE` / `#D6D5E4` | the surface ladder, ~4 ΔL\* per step |
| `graphite` / `-2` / `-3` | `#E8E9F2` / `#A6A6BC` / `#8E8EA8` | `#12111A` / `#4E4C60` / `#55536A` | text, three tiers |
| `status-ok` / `status-amber` | `#46C98A` / `#E3B04B` | `#12734A` / `#7A5500` | ⚠️ **marks only, never surfaces** |
| `chroma-key-rest` / `-live` | `#4C6357` / `#00FF7F` | same | the matte swatch at rest, and the real key green when you reach for it |
| `ring-inner` / `ring-outer` | `#FFFFFF` / `#0B0A12` | same | a two-tone ring, because one hue cannot read on white, black, a checkerboard and chroma |

⚠️ **Adjacent surfaces are measured in ΔL\*, not in WCAG contrast ratio.** WCAG's `+0.05` flare term dominates at the dark end, so a 1.35:1 step from the void lands near `#252525` — meeting it literally deletes the void. `scripts/check_contrast.py` carries the arithmetic.

## Typography

Two self-hosted families, and the split is a job, not a taste: **Archivo** speaks, **Spline Sans Mono** annotates. Anything you read a sentence of is Archivo; anything that labels, counts or reports an instrument reading is mono.

| step | size | used for |
|---|---|---|
| `--t-figure` | 34px | the ledger's removed-pixel count — the first number worth looking at |
| `--t-h1` | 30px | the open asset's name |
| `--t-h2` | 22px | section headings |
| `--t-h3` | 18px | the question |
| `--t-body` / `--t-label` | 14px | body, drawer headings |
| `--t-meta` | 12px | metadata, control labels |
| `--t-micro` | 11px | instrument readings, tags, the state word |

⚠️ **The width axis is Archivo's only.** Spline Sans Mono's two self-hosted `.woff2` files carry a `wght` axis and **no `wdth`**, browsers do not synthesise width, and `font-stretch` on a mono selector is inert. It is declared on `.tabs button` and `.ctl .lab` and nowhere else for that reason.

## The world

**The ground is the void; the tools on it are the matte world.** *(Revised 2026-09-04 22:40 EDT. The earlier version made the whole world a cutting table under a lamp. The tools were right and are kept; the ground was not — the app is called Devoid, and its one job is making pixels into nothing. Deep space IS nothing, rendered.)*

The tools stay exactly as they were: rotoscoping, rubylith (the film compositors hand-cut masks from), vinyl weeding, the counter (a sign shop's word for the enclosed hole in a letterform, which is exactly the coin-flip case), onion skinning, registration marks, the grease pencil, the film strip. **The plotter** still owns the drawing tools and **the film strip** still owns the frame axis.

What changed is what they sit on. The table floats in **the void**: an event horizon, accretion, the singularity, redshift, the photon ring, occultation — one body passing in front of another and blocking its light, which is precisely what a background does.

⚠️ **The two load-bearing colours did not change, and the void is why they were right all along.** Cyan and rubylith are the two colours of an accretion disk — hot blue on the inner edge, warm red-orange on the outer. The new world did not replace this app's semantics. It explained them.

⚠️ **The void is not black.** Long-exposure deep-sky is violet-tinted, and `--void` is `#06050D` for that reason — which is also how this design avoids the near-black-plus-one-acid-accent look that every generated dark interface arrives at.

⚠️ **The alpha checkerboard survives, quietly, beneath the stars.** It is notation — "something transparent is on this spot" — and the measured argument for keeping it still holds. It is absent in exactly one place: **the empty table**, where no image is present, so claiming transparency would be claiming something untrue.

## Structure: there is no mode

**The strip is the app.** Not a component in it — the whole thing.

- **Nothing selected** → the strip fills the space as a contact sheet, everything animating, state drawn *on* each frame.
- **Select one** → it opens; the rest stay along the edge.
- **Panels** are drawers summoned at the table's edge and opened beside what they affect, never a column paid for on every screen.

**Selection is the only state** — of the *structure*. (Multi-select is a separate feature and is not built; see `HANDOFF.md`.) That is not minimalism for its own sake — it is what makes density need no *structural* policy. One asset, twelve and two hundred are the same LAYOUT, where a two-lane design has to answer each case separately and answered none of them. ⚠️ **The SIZE is a different question and this sentence used to swallow it (2026-09-07 12:02 EDT):** the tile measured 262px at every one of those counts. It is **365 / 282 / 154px** by bucket now (re-measured 2026-09-07 14:25 EDT; this line said 147px), and past forty the demanding states span two columns — **but only while they are a minority.** Three edges of that rule were unseen when it shipped and are now decided and asserted: a crowd where nothing needs you draws no landmark and says so (`data-demand="none"`), a crowd where everything does drops the span rather than doubling the scroll, and the 40/41 bucket change waits for a drop to stop arriving instead of flipping every tile under the cursor.

This replaced a Board/Bench split. The split failed a simple test: the coin-flip refusal fires on **10.2%** of assets (the fade question on 2.6%; 12.8% pooled), so a dedicated lane served roughly one item per batch, while review — the thing every asset needs, every time — had no home of its own.

## Signature: rubylith, and why it is not only a colour

Everything about to be deleted wears translucent red-orange film. The hardest question in the product — *what is about to disappear?* — becomes something you see rather than read.

⚠️ **Measured over eight real corpus outputs with `scripts/measure_overlay_collision.py`, a third of one asset's artwork and a fifth of another's sits inside the overlay colour's own neighbourhood.** A red tint over red art shows nothing, and showing what is about to be destroyed is the overlay's entire job. **Re-run that script before changing `--ruby`** — which is the CSS custom property in `prototype/app.css`, not a flag on the skill.

That finding is why **the wipe supersedes a static wash as the primary way removal is shown**: two real renders and a seam do not depend on hue at all. Where a wash is still needed — before a render exists — it carries a **diagonal hatch** as well as the tint, because hatching is hue-independent and is how removed material is marked in a technical drawing. The same rule produced the grease-pencil marks and the notch on flagged frames.

## The colour rule

**Two load-bearing colours, and they are the two answers to the product's only question.** Rubylith = *this goes*. Cyan = *this stays / the path you are drawing / focus*. There is no third accent; the light table's pencil blue collapses into the cyan.

**Rubylith is also the destructive colour**, so no separate danger red competes with it — destroying artwork and removing background are the same act at different intent.

Green and amber exist only as status marks, never as surfaces.

⚠️ **No state is ever colour alone.** Every state carries a **shape or a word** as well. This is the same finding as the hatch, generalised: hue is not a reliable channel over this content. Concretely, state on a contact-sheet frame is a **grease-pencil mark** — a tick, a bar, a cross, a circle — drawn on the frame the way a photographer annotates a contact sheet, and flagged frames on the film strip carry a **notch** as well as a coloured edge.

**The check is runnable: render the interface in greyscale and confirm every state is still distinguishable.** The first version failed this in two places — a progress chip that was a bare number, and colour-only flag ticks — while this document asserted the rule.

## Lighting states, not themes

**Collapsed** and **emitting** — a black hole and its exact physical inverse, the one that gives back what the other takes. `:root` is collapsed, `.emitting` is the white hole, and an inline script sets it before first paint so there is no flash. Functionally emitting is still the bright ground you need in order to check dark artwork, so the metaphor costs nothing; the stars invert into dark motes so both states carry the same grain.

⚠️ **THE CONTROL IS A SEAM, AND THIS TOOK FOUR ATTEMPTS TO GET RIGHT.** A colour-changing dot, then an iOS rocker, then a circle with an accretion ring — three defaults wearing different hats, and the first of them broke this document's own "no state is ever colour alone" rule, since a grey dot and a gold dot differ in nothing but hue. The answer was in the product the whole time: **the app's signature gesture is dragging a cut line between two versions of an image, and choosing the room's lighting is that same act at a different scale.** So the control is a miniature of the wipe, with the same dashed cyan cut line, and the horizon does the work — a hot rim travels with the cut, which is what an accretion disk's inner edge actually looks like. No knob: a handle promises dragging, and this clicks.

⚠️ **LENSING NEVER TOUCHES THE STAGE.** Light bending around mass is the most spectacular thing this world offers, and it is banned from the one place the artwork is judged. A preview that warps is showing you something you are not going to get, which is the same sin as reporting a verification that did not run. It lives in the empty table, in the toggle, and in the arrival — none of which are artwork under evaluation. The void behind the work may move; the work never does.

Tokens are named for both halves of the world — the void, the horizon, the singularity, the star and the nebula, alongside the bench, the well, the score lines, graphite and the sprocket. Someone reading only the token list should be able to guess what the product is: something that removes things, in space.

**Contrast is a gate, not an aspiration**: every text pair meets WCAG AA. Rubylith buttons take black labels, which passes where the more tasteful near-black-red did not.

## Type

**Archivo** across a real width range — headings expanded, labels and data narrowed, nothing at a default width — and **Spline Sans Mono** for every number, hex value, filename, coordinate and flag name, which is most of the data here.

Build hierarchy from **size, weight and colour together**, never size alone, and hold an 11px floor for anything functional. The first version crammed every tier into a four-pixel range separated only by colour; a detector found thirty-four undersized-text instances, which was one systemic defect wearing thirty-four costumes.

`font-variant-numeric: tabular-nums` on the whole app — frame counters, byte sizes and coordinates all change in place, and shifting digits read as instability in a precision tool.

## The components that carry the world

**The wipe.** Two versions of the same asset, one seam, dragged. The seam is the **cut line** — dashed, with a blade handle — so the metaphor and the control are the same object. It replaces asking *"is this region design or background?"* with showing both answers and asking which is right, which is a strictly easier judgement and a measurably more accurate one: the skill's own history records a case where the region "looked plausible" and the abstract question got answered wrong.

It generalises. Erosion, feather band, fade recovery, dither mode — every flag with a visible consequence becomes a seam to drag rather than a number to tune. **That is what dissolves the tension between "usable by someone unacquainted" and "expose many more options": options presented as outcomes need no learning.**

**The ledger.** Under the artwork, what this setting is about to destroy — background pixels removed, artwork pixels lost, artwork surviving. The engine already computes these and prints them to stderr. Every defect that has actually bitten this project is artwork loss, and **an app about destruction that never says what it destroyed is hiding its own subject.**

⚠️ **A blank ledger is the "not checked" state**, and it is louder than a chip because an absence where numbers belong looks like what it is.

**The film strip.** The frame axis as a perforated strip, neighbours ghosted for onion skin, flagged frames notched. Structural rather than a control, because registration across frames is what makes this better than a single-image remover.

**Everything animates.** Contact-sheet frames, the open asset, the wipe. ⚠️ **This is functional, not decorative.** The defect classes this project records — dither crawl on every edge, flicker localised to specific rotation phases — are *only* visible in motion. An interface for animated images built from still frames cannot show its own subject's bugs, which is exactly what the first prototype did.

**The matte toggle.** Checker, white, black, chroma, on every preview. The docs record that checkerboard camouflages dithering noise and soft bleed and that a solid ground must also be checked; each catches what the other hides. A verification requirement, not a preference.

## Motion

Felt, not watched. Under 300ms, ease-out never ease-in, only `transform` and `opacity`.

**Scrubbing frames has no easing at all** — it must feel like dragging a physical strip, and any lag on the playhead reads as the app being slow.

**One orchestrated moment, and it belongs to the empty table.** Drop files onto empty checkerboard and they arrive as contact-sheet frames developing, staggered, each one's rubylith wash rising over the region it is about to cut. A batch resolving looks like a contact sheet coming up in a tray. It is information — the wash *is* the finding — and it happens once per session. ⚠️ **Rare moments earn animation; repeated ones must not have it.** Scattering hover-lift across every component is the documented tell of generated design.

`prefers-reduced-motion` drops movement and keeps opacity, so the wash — which carries meaning — survives. ⚠️ **The prototype's blanket `animation-duration:.01ms` rule kills opacity transitions too**, which is not what this says; narrow it when the wash lands.

⚠️ **And an animated GIF ignores the preference entirely** — `<img>` playback cannot be paused by CSS. An app whose premise is "everything animates" owes a motion-sensitive user an off switch. Decide it when frames move to canvas (`PLAN.md` 3.3), which makes pausing possible.

## Copy

Sentence case, no terminal punctuation on labels, active voice, verb first.

⚠️ **The vocabulary is a person's, not the system's.** Panel names must not be the argparse groups renamed — that is the system's structure leaking into the language. *What to keep · The edge · How small · What it found · It refused*, not *Regions · Edges · Size & quality · Detection · Overrides*.

**One vocabulary, all the way through.** This is a cutting tool, so it uses cutting words: cut, keep, trim, the edge, the cut line. Never *process*, *asset*, *render*, *job*, *output*. The control that says **Cut it out** produces a result described as **cut**.

The best copy fix is usually deleting the sentence. Under the wipe, *"is the hatched area part of the picture?"* becomes two labels and a verb.

**Never imply a check that did not run.** "Not checked" is the copy; amber and the blank ledger are the reinforcement.

## The empty table

An app for making things transparent, opened with nothing in it. **Emptiness is the subject**, so it needs no illustration, no dashed drop-zone, and no apology — it is the void, empty, with the horizon — the wordmark's own O at full size — the only thing on it. One line of copy, an instruction rather than an apology.

## The state set — none of these are optional

The first prototype shipped the happy path and nothing else. A build is not done until each of these has a design:

**empty** · **loading** (analysis is ~18s per asset; the frame exists before the artwork does) · **needs you** (a question) · **refused** (the tool declining outright — distinct from a question) · **running** · **cancelled** (a two-minute render with no cancel is a hostage situation) · **done** · **not checked** · **failed** (render error, engine missing, AVIF support absent) · **conflict** (an output already exists and the name escalated) · **blocked** (export with questions outstanding).

## The checks this design keeps passing

- **Greyscale.** Render it without colour; every state must still be distinguishable.
- **Squint.** Blur it; whatever needs you must still dominate.
- **Swap.** Swapping rubylith for blue must break the *meaning*, not just the look.
- **Panel-optional.** Drop files, answer, save — without opening a drawer.
- **Detector.** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>`. ⚠️ **One finding is KNOWN AND ACCEPTED: `repeating-stripes-gradient`.** The only repeating gradient the detector reports is the alpha checkerboard (`.chk`, `.chk-s`) in `index.html`. ⚠️ **The prediction this sentence used to make — *"a second when the hatch lands"* — is FALSIFIED, 2026-09-07 00:57 EDT.** The hatch has been built for days, in `.qregion` and now `.qregion:before`, and the count is still **one**: `scripts/fixtures/detector-canary.css` carries a `repeating-linear-gradient` and that rule stays silent on it while the other three fire, so the rule appears to read HTML and not CSS. Expect **one**, and treat a second as a real defect rather than an arrival. Both are the domain's own notation — a checkerboard *is* how transparency is drawn, and hatching *is* how removed material is marked — so obeying the detector here would delete the transparency indicator from a transparency tool. **Expect exactly this finding and no other.** Anything else is a real defect. ⚠️ It also runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils`, returning `[]` *while saying so on the line above*. An empty result only counts when the header does not say DEGRADED.
- **Real assets.** Any visual claim is checked against the corpus, never against art drawn for the mockup. Art you draw to demonstrate a design is selected to flatter it — that is how three bugs survived four rounds of review here.

# Devoid — design system

*Rewritten 2026-09-03 23:20 EDT, after a prototype built with real assets falsified three claims the first version made. Product context is in `PRODUCT.md`; where the work stands is in `HANDOFF.md`.*

**Mode: Operate.** The person is completing a task. Scanability, consistency and the real usage scene outrank expression; brand lives in precise details.

⚠️ **This document states rules and points at tokens. It does not restate numbers the CSS owns.** The first version quoted a checkerboard cell size, the prototype changed it for a measured reason, and the doc was stale inside its own commit. A doc that repeats a value has a second copy to keep in sync; a doc that names the rule and the token does not.

## The world

Not "a GIF tool" — the **matte** world: rotoscoping, chroma key, the alpha checkerboard, rubylith (the film compositors hand-cut masks from), vinyl weeding, the counter (a sign shop's word for the enclosed hole in a letterform, which is exactly the coin-flip case), onion skinning, the light table, registration marks.

Three rooms turned out to be one room, each owning a different job: **the cutting table** owns the ground and the material, **the light table** owns the lighting states and the frame axis, **the plotter** owns the drawing tools.

## Structure: there is no mode

**The strip is the app.** Not a component in it — the whole thing.

- **Nothing selected** → the strip fills the space as a contact sheet, everything animating, state drawn *on* each frame.
- **Select one** → it opens; the rest stay along the edge.
- **Panels** are drawers summoned at the table's edge and opened beside what they affect, never a column paid for on every screen.

**Selection is the only state.** That is not minimalism for its own sake — it is what makes density need no policy. One asset, twelve and two hundred are the same layout, where a two-lane design has to answer each case separately and answered none of them.

This replaced a Board/Bench split. The split failed a simple test: the coin-flip refusal fires on **12.8%** of assets, so a dedicated lane served roughly one and a half items per batch, while review — the thing every asset needs, every time — had no home of its own.

## Signature: rubylith, and why it is not only a colour

Everything about to be deleted wears translucent red-orange film. The hardest question in the product — *what is about to disappear?* — becomes something you see rather than read.

⚠️ **Measured over eight real corpus outputs with `scripts/measure_overlay_collision.py`, a third of one asset's artwork and a fifth of another's sits inside the overlay colour's own neighbourhood.** A red tint over red art shows nothing, and showing what is about to be destroyed is the overlay's entire job. **Re-run that script before changing `--ruby`.**

That finding is why **the wipe supersedes a static wash as the primary way removal is shown**: two real renders and a seam do not depend on hue at all. Where a wash is still needed — before a render exists — it carries a **diagonal hatch** as well as the tint, because hatching is hue-independent and is how removed material is marked in a technical drawing. The same rule produced the grease-pencil marks and the notch on flagged frames.

## The colour rule

**Two load-bearing colours, and they are the two answers to the product's only question.** Rubylith = *this goes*. Cyan = *this stays / the path you are drawing / focus*. There is no third accent; the light table's pencil blue collapses into the cyan.

**Rubylith is also the destructive colour**, so no separate danger red competes with it — destroying artwork and removing background are the same act at different intent.

Green and amber exist only as status marks, never as surfaces.

⚠️ **No state is ever colour alone.** Every state carries a **shape or a word** as well. This is the same finding as the hatch, generalised: hue is not a reliable channel over this content. Concretely, state on a contact-sheet frame is a **grease-pencil mark** — a tick, a bar, a cross, a circle — drawn on the frame the way a photographer annotates a contact sheet, and flagged frames on the film strip carry a **notch** as well as a coloured edge.

**The check is runnable: render the interface in greyscale and confirm every state is still distinguishable.** The first version failed this in two places — a progress chip that was a bare number, and colour-only flag ticks — while this document asserted the rule.

## Lighting states, not themes

The same room with the lamp on or off; both designed, neither an inversion of the other. `:root` is the work lamp, `.lamp-light` is the light table, and an inline script sets it before first paint so there is no flash. The mechanism is borrowed from `dioreo.app`'s three-state pattern; the knob is not — that site's sun-and-moon switch is its own signature. Devoid's is the lamp over the bench.

Tokens are named for this room — the table, the bench, the well, the score lines, graphite, the sprocket. Someone reading only the token list should be able to guess what the product is.

**Contrast is a gate, not an aspiration**: every text pair meets WCAG AA. Rubylith buttons take black labels, which passes where the more tasteful near-black-red did not.

## Type

**Archivo** across a real width range — the wordmark expanded, headings normal, nothing at a default width — and **Spline Sans Mono** for every number, hex value, filename, coordinate and flag name, which is most of the data here.

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

`prefers-reduced-motion` drops movement and keeps opacity, so the wash — which carries meaning — survives.

## Copy

Sentence case, no terminal punctuation on labels, active voice, verb first.

⚠️ **The vocabulary is a person's, not the system's.** Panel names must not be the argparse groups renamed — that is the system's structure leaking into the language. *What to keep · The edge · How small · What it found · It refused*, not *Regions · Edges · Size & quality · Detection · Overrides*.

**One vocabulary, all the way through.** This is a cutting tool, so it uses cutting words: cut, keep, trim, the edge, the cut line. Never *process*, *asset*, *render*, *job*, *output*. The control that says **Cut it out** produces a result described as **cut**.

The best copy fix is usually deleting the sentence. Under the wipe, *"is the hatched area part of the picture?"* becomes two labels and a verb.

**Never imply a check that did not run.** "Not checked" is the copy; amber and the blank ledger are the reinforcement.

## The empty table

An app for making things transparent, opened with nothing in it. **Emptiness is the subject**, so it needs no illustration, no dashed drop-zone, and no apology — it is the table, empty, lit by the lamp, with the wordmark's knocked-out counter the only mark on it. One line of copy, an instruction rather than an apology.

## The state set — none of these are optional

The first prototype shipped the happy path and nothing else. A build is not done until each of these has a design:

**empty** · **loading** (analysis is ~18s per asset; the frame exists before the artwork does) · **needs you** (a question) · **refused** (the tool declining outright — distinct from a question) · **running** · **cancelled** (a two-minute render with no cancel is a hostage situation) · **done** · **not checked** · **failed** (render error, engine missing, AVIF support absent) · **conflict** (an output already exists and the name escalated) · **blocked** (export with questions outstanding).

## The checks this design keeps passing

- **Greyscale.** Render it without colour; every state must still be distinguishable.
- **Squint.** Blur it; whatever needs you must still dominate.
- **Swap.** Swapping rubylith for blue must break the *meaning*, not just the look.
- **Panel-optional.** Drop files, answer, save — without opening a drawer.
- **Detector.** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>` returns zero findings. ⚠️ It runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils`, and a degraded run returns `[]` *while saying so on the line above*. An empty result only counts when the header does not say DEGRADED.
- **Real assets.** Any visual claim is checked against the corpus, never against art drawn for the mockup. Art you draw to demonstrate a design is selected to flatter it — that is how three bugs survived four rounds of review here.

Devoid removes the background from animated images, by showing the person the question instead of describing it. It is a desktop front end for an engine that already decides most things; the interface exists for the few that are visual coin-flips: is this outlined region artwork or background, is this fade real. Mode: Operate. The person is mid-task and wants to be finished, so scanability and consistency outrank expression, and chrome earns its place against the artwork every time.

**The Void and the Bench, lit by an accretion disk.** The ground is deep space and the tools standing on it stay matte and physical. Two lighting states, not two themes: `collapsed` is the void, `emitting` is a white hole giving light back. Nothing about the void reaches the artwork: lensing lives in the empty table, the lighting toggle and the arrival, never on the stage where an edge is judged.

## Content fundamentals

- **One vocabulary, a cutting tool's.** Cut, keep, trim, the edge, the cut line. Never process, asset, render, job, output. The control that says "Cut it out" produces a result described as cut.
- **Sentence case, no terminal punctuation on labels, active voice, verb first.** "Keep the fade", "Cut it out", "What to keep", "The edge", "How small".
- **The vocabulary is a person's, not the system's.** Panel names are never the engine's argument groups renamed. Use "What it found" and "It refused", not "Detection" and "Overrides".
- **A control exposes an outcome, never an engine flag.** Every control carries an outcome-phrased label and a hint in the person's own words; the person never types or reads a flag name.
- **Never imply a check that did not run.** The copy for that state is "Not checked", reinforced by `amber` and a blank ledger. Never infer a size target.
- **The best copy fix is usually deleting the sentence.** Under the wipe, "is the hatched area part of the picture?" becomes two labels and a verb: "keep it" and "cut it".
- No emoji, no exclamation marks, no apology. The empty table has one line of instruction, not an apology.

## Visual foundations

- **Two load-bearing colours, no third accent.** `ruby` says this goes; `cyan` says this stays, the path, focus. They are the two colours of an accretion disk (warm red-orange on the outer edge, hot blue on the inner), so the world explains the palette rather than replacing it. `ruby` is also the destructive colour, so there is no separate danger red.
- **No state is ever colour alone.** Give every state a shape or a word as well; a third of one asset's artwork sits within RGB distance 90 of ruby, so hue is not a reliable channel over this content. The shapes are the Pencil marks; render greyscale to check.
- **`ok` and `amber` are marks only, never surfaces.** Use `ruby-bg`, `cyan-bg` and `amber-bg` for quiet message grounds, always with their matching `-ink` text.
- **The ground is `void`, violet-tinted, never neutral black.** Build the surface ladder from `void`, then `sprocket`, `bench`, `raise`, about 4 L* per step; adjacent surfaces are measured in L*, not WCAG contrast. `well` is the recessed ground under artwork. Text is `graphite`, `graphite-2`, `graphite-3`, never lighter than `graphite-3` on `bench`.
- **Depth is borders on the void and shadows only on things that float.** Hairlines are `score`, stronger edges `score-2`, the strongest `mark`. Only the drawer and tooltips take the `float` shadow.
- **Type: Archivo speaks, Spline Sans Mono annotates.** Anything you read a sentence of is Archivo; anything that labels, counts or reports an instrument reading (file names, hex values, coordinates, flag-like values, state words) is mono. The steps are `figure` 34, `h1` 30, `h2` 22, `h3` 18, `body` 14, `meta` 12, `micro` 11; hold 11px as the floor for anything functional. Build hierarchy from size, weight and colour together. Archivo has a width axis (62 to 125%) used for headings; Spline Sans Mono has none, so `font-stretch` on a mono selector does nothing. Keep `font-variant-numeric: tabular-nums` on the whole app: digits that change in place must not shift.
- **Spacing is five steps** (`s1` 6, `s2` 10, `s3` 16, `s4` 26, `s5` 38) and **radius four plus a pill** (`r-xs` 4, `r-sm` 6, `r` 8, `r2` 12, `r-pill` 20). Do not invent values between them.
- **The alpha checkerboard is notation, not decoration.** It means "something transparent is on this spot". Keep it on every preview of artwork; leave it off only the empty table, where no image is present. It is the one repeating gradient this system accepts, along with the removal hatch.
- **Backgrounds:** the sky is one continuous star field behind the table, drawn once on a canvas and never tiled per element; two soft off-centre blooms (`neb-violet`, `neb-blue`). No grids, no gradients on controls, no glows.
- **Motion is felt, not watched.** Under 300ms, `--ease-collapse` or `--ease` (never ease-in, never an overshoot), only `transform` and `opacity`. Scrubbing frames has no easing at all. The one orchestrated moment is the arrival on the empty table, once per session. `prefers-reduced-motion` drops movement and keeps opacity, because the wash carries meaning. Rare moments earn animation; repeated ones do not.
- **Everything animates.** Contact-sheet frames, the open asset, the wipe: the defects this tool exists to catch (dither crawl, flicker at certain rotation phases) are only visible in motion.
- **Focus is a 2px solid ring** in `focus`: cyan on the void, an ink ring on the light ground where cyan fails 3:1.
- **Every state needs a design.** Empty, loading, needs you, refused, running, cancelled, done, not checked, failed, conflict, blocked. "Not checked" has the same visual weight as done and failed.

## Iconography

There is no icon font and no icon library. The icon system is the grease-pencil Pencil marks: stroked shapes in a 100 by 100 viewBox, round caps and joins, one shape per state (see Pencil). Tab buttons use the same marks at 20px. Do not add emoji or glyph icons; a new state gets a new shape. The wordmark is the only branded asset (`assets/Logos`).

## Using this system

- Load `tokens.css`, `components/bundle.css` and the two fonts. There is no JavaScript bundle: the app is plain DOM, and each component is a class contract documented in its README with a static preview.
- Switch lighting with `data-theme="collapsed"` or `data-theme="emitting"` on the root.
- Every token name matches the CSS custom property in the app (`--void`, `--bench`, `--ruby`, `--cyan`, `--s3`, `--r2`), except `r-pill`: the app writes that 20px as a literal, so `--r-pill` exists only in this system's `tokens.css`.
- Type styles are classes (`.h1`, `.body`, `.micro`); `font-stretch` is not part of a style, so set `font-stretch: 104%` on `h1` and the wider widths on display type yourself.
- The consumer provides the artwork, the engine's measurements and the copy. Never draw art to show the design off, and never report a verification the run did not earn.

## Not included

- The contact-sheet arrival (the staggered developing of dropped files) is runtime animation, not carried here. The star field, accretion core and horizon have hand-written previews under World.
- Motion has no token family: easing curves are the two in `bundle.css`.
- Only the latin subset of each font is shipped here; the app also ships latin-ext and vietnamese files for Archivo.
- Component previews are hand-written static renditions of the app's CSS.

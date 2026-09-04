# Devoid — design system

*Written 2026-09-03 21:15 EDT. The visual world, its tokens, and the rules that keep it coherent. Product context is in `PRODUCT.md`.*

**Mode: Operate.** The visitor completes a task. Scanability, consistency and the real usage scene outrank expression. Brand lives in precise details, not in decoration.

## The world

Not "a GIF tool" — the **matte** world. Rotoscoping, chroma key, the alpha checkerboard, rubylith (the red-orange film compositors hand-cut masks from), vinyl weeding, the counter (a sign shop's word for the enclosed hole in a letterform — exactly the coin-flip case), onion skinning, the light table, registration marks.

Three rooms turned out to be one room, each owning a different function:

- **The cutting table** owns the ground and the material. Rubylith marks what will be removed. This is the identity.
- **The light table** owns the lighting states and the frame axis. Dark is the work lamp; light is the panel on. Onion-skinned neighbour frames are its contribution.
- **The plotter** owns the drawing tools. Regions are vector paths with visible nodes and live source-pixel coordinates.

## Signature: rubylith as a material, applied systemically

Everything the tool is about to delete renders as translucent red-orange film over the artwork — in analysis, in preview, in the result. Not a legend, not a highlight. The single hardest question in the product — *what is about to disappear?* — becomes something you see rather than read, at every stage.

## The colour rule — the one thing that keeps three worlds from becoming mush

**Two load-bearing colours, and they are the two answers to the product's only question.**

| | | |
|---|---|---|
| **Rubylith** | `#E2402A` | *this goes* — removable area, destructive action, a region flagged for a decision |
| **Cyan** | `#22D3EE` | *this stays* — the path you are drawing, the current frame, focus, the primary action |

The light table's pencil blue collapses into the cyan. There is no third accent.

**Rubylith is also the destructive colour**, so there is no separate danger red competing with it. Destroying artwork and removing background are the same act at different intent; one colour for both is honest.

Green and amber exist only as **status chips** — never surfaces, never paths, never borders larger than a chip.

| | dark (work lamp) | light (light table) | means |
|---|---|---|---|
| verified | `#3FBF80` on `#12332A` | `#12734A` on `#E2F2EA` | checked, and it passed |
| not checked | `#E3B04B` on `#332608` | `#7A5500` on `#F7EEDA` | quick mode, or pixel checks skipped |

**Nothing is a chip's colour alone.** Every state also carries a word. Colour is reinforcement, never the only channel.

## Lighting states, not themes

The same room with the lamp on or off. Both are real designs; neither is an inversion of the other.

```
:root                      /* work lamp — the default */
:root[data-lamp="light"]   /* light table */
```

Set the attribute from an inline script before first paint so there is no flash:

```html
<script>try{var t=localStorage.getItem('devoid-lamp');if(t)document.documentElement.setAttribute('data-lamp',t)}catch(e){}</script>
```

The mechanism is borrowed from `dioreo.app`'s three-state pattern (explicit choice wins in both directions; `prefers-color-scheme` decides the unstamped default). **The knob is not borrowed** — that site's sun-and-moon switch is documented in its own source as its signature, and lifting it would make Devoid read as a dioreo sub-page. Devoid's knob is the lamp over the table, switching off.

### Tokens

Named for this room, not for any project. Someone reading only the token list should be able to guess what the product is.

```
--mat        the table itself          #141C1B  /  #F0EFEA
--bench      a working surface on it   #1D2726  /  #FFFFFF
--raise      lifted, selected          #243130  /  #F7F7F4
--well       recessed, inset           #0F1615  /  #E7E6E0
--score      a cut guide, hairline     rgba(255,255,255,.09) / rgba(20,28,27,.10)
--score-2    an emphasised guide       rgba(255,255,255,.16) / rgba(20,28,27,.20)
--graphite   primary text              #E4EAE8  /  #18211F
--graphite-2 supporting                #94A5A2  /  #5E6B68
--graphite-3 metadata                  #93A8A3  /  #5C6966
--chk-a/-b   the alpha checkerboard    #2B3635 / #222C2B   ·   #FFFFFF / #DEDEDA
--ruby       the film                  #E2402A
--cyan       the path                  #22D3EE
```

Every one of these is defined on the bare `:root` before any `[data-lamp]` block redefines it. A colour whose only definition sits inside a lighting block is the classic unreadable-page bug.

**Contrast is a gate, not an aspiration.** Every text/background pair meets WCAG AA (4.5:1 body, 3:1 large). `--graphite-3` sat at 3.7:1 against `--bench` in the first draft and was corrected; the light-mode value failed twice before landing. Rubylith buttons take **black** labels — `#000` on `#E2402A` is 4.9:1, where the near-black-red that looked more tasteful was 4.4:1 and failed.

## Type

**Archivo** (variable, with the width axis) and **Spline Sans Mono**.

Archivo's expanded widths read as signage lettering, which is where this world's typography actually lives — a sign shop sets wide. Headings use `font-stretch: 112–118%`; UI text sits at normal width. Spline Sans Mono carries every number, hex value, filename, coordinate and flag name — which is most of the data in this app.

**Build hierarchy from size, weight and colour together, never size alone.** The first draft crammed every tier into 9.5–13px separated only by colour; a detector found 34 undersized-text instances, which was one systemic defect wearing 34 costumes.

| role | size | weight | colour |
|---|---|---|---|
| display | clamp(2.5rem, 14vw, 4rem) | 600 / stretch 118% | `--graphite` |
| section | 1.3rem | 600 / stretch 112% | `--graphite` |
| question | 15px | 600 | `--graphite` |
| group heading | 13px | 600 | `--graphite` |
| body / label | 12–13px | 400 | `--graphite-2` |
| chip, meta | 11px | 500 | semantic or `--graphite-3` |

**11px is the floor.** Nothing functional goes below it.

`font-variant-numeric: tabular-nums` on the whole app frame — frame counters, byte sizes, coordinates and quality values all change in place, and shifting digits read as instability in a precision tool.

## Layout

Two lanes over one engine.

### Board — triage a pile

```
┌ chrome ─ mark · Board|Bench ─────────── add · lamp · export ┐
│                                                             │
│  2 NEED YOU ──────────────────────────                      │
│  ┌───────────────┐  ┌───────────────┐         ┌───────────┐ │
│  │  large, air   │  │  large, air   │         │ inspector │ │
│  │  ruby ring    │  │  ruby ring    │         │           │ │
│  │  two buttons  │  │  two buttons  │         │ one group │ │
│  └───────────────┘  └───────────────┘         │ raised,   │ │
│                                               │ rest are  │ │
│  10 SETTLED ──────────────────────────        │ hairline  │ │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐   compact strip         │ rows      │ │
│  └──┘└──┘└──┘└──┘└──┘                         └───────────┘ │
├ run bar ─ 9 done · 2 need you · 1 running 88/144 ───────────┤
```

**The rhythm is the design.** Questions lead, at double size with real air around them; everything settled compresses into a tight strip because it needs no attention. A uniform grid of equal cards — the first draft — has no focal point and is the monotone-layout anti-pattern by name.

### Bench — one asset, deep

```
┌ chrome ─ mark · Board|Bench ── 1 frame|3 frames|full · lamp · render ┐
│ ┌─────┐ ┌──────────────────────────────┐ ┌──────────────────────┐   │
│ │strip│ │ canvas                       │ │ inspector            │   │
│ │     │ │   matte toggle ▸ ▫ ■ ▪       │ │  Regions   (open)    │   │
│ │     │ │   rubylith over removable    │ │  Edges     (shut)    │   │
│ │     │ │   cyan path + nodes          │ │  Size      (shut)    │   │
│ │     │ │   rect:104,40,94,128         │ │  Detection (shut)    │   │
│ └─────┘ ├──────────────────────────────┤ │  Overrides (shut)    │   │
│         │ onion ▸ ▮▮▮█▮▮▯▯▯▯  62/144   │ └──────────────────────┘   │
```

**Depth strategy: hairline borders, one raised level.** Not everything is a card. In the inspector, only the open group is a raised object with a border and a fill; the rest are labelled rows separated by a `--score` hairline. Stamping the same radius and border on every block flattens the hierarchy — the thing this app most needs to avoid, since the inspector is where 63 options live.

### Components that carry the world

**The counter card.** A file with a question renders the disputed region cropped from **three sampled frames** — first, middle, last — composited over the checkerboard, boxed in rubylith. Three frames because the whole reason the region is a coin flip is that its enclosure *changes* across the animation; a single still is the one view guaranteed not to show what the question is about.

**The tri-state control.** Reads `auto · 1` in cyan until taken over, then shows the explicit value in a bordered field. Forced by the engine — sending a flag at its default value makes `--auto` treat it as deliberate — and it turns the inspector into a live readout of the tool's own reasoning.

**The matte toggle.** Checker · white · black · chroma green, on every preview, permanently. The skill's own docs record that checkerboard camouflages dithering noise and soft bleed and that a solid ground must *also* be checked — each catches what the other hides. It is a verification requirement, not a preference. Swatches are 30px with a 44px hit area.

**The frame scrubber.** Onion-skinned neighbours ghost behind the current frame; frames the analysis flagged are marked on the track. Progress is drawn as frames filling, never as a spinner — the work is per-frame, so `88/144` is the honest unit and a bar that means nothing is worse than a number that does.

## Motion

Felt, not watched. Everything under 300ms; `cubic-bezier(0.23, 1, 0.32, 1)` for entering, never `ease-in`. Only `transform` and `opacity` — never `transition: all`.

The Board is scanned dozens of times a session, so its cards do **not** animate in. Panels and popovers get 150–200ms. `prefers-reduced-motion` drops movement and keeps opacity.

The one orchestrated moment: when analysis resolves, a card's rubylith overlay **fades up** over the artwork. It is the moment the app tells you what it is about to destroy, and it earns the emphasis.

## Copy

Sentence case everywhere. No terminal punctuation on labels. Active voice, verb first — a control says exactly what happens, and the same word carries through: **Cut it out** produces a result described as *cut*, not *removed*.

Name things as the person sees them. **"Is the red area part of the picture?"** — not "resolve ambiguous protection region." The hex and frame counts sit underneath in mono, as evidence for anyone who wants it, never as the question itself.

Errors say what happened and what to do, in one sentence, with no "Error:" prefix and no first person. Empty states are an invitation, not an apology.

**The one word that must never appear on a result that was not checked is any word implying it was.** "Not checked" is the copy; amber is the reinforcement.

## The checks this design has to keep passing

- **Squint test.** Blur the Board: the two questions must still dominate. If every card reads equally, the rhythm has been lost.
- **Swap test.** Swapping rubylith for blue must break the meaning, not just the look. If it merely looks different, the colour was decoration.
- **Bench-optional test.** Drop files, answer the questions, export — without opening a panel. If that path breaks, the disclosure failed.
- **Detector.** `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>` must return zero findings. It found 48 on the first draft and 0 after; treat a regression as a defect, not a style note. ⚠️ It runs **degraded** without `htmlparser2`, `css-select`, `css-tree` and `domutils` — and a degraded run returns `[]` while saying so in a line above it. An empty result is only meaningful when the header does not say DEGRADED.

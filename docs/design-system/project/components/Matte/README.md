Four real grounds for the preview: checker, white, black, chroma. The docs record that a checkerboard camouflages dither noise and soft bleed, and that a solid ground must also be checked; each catches what the other hides. A verification requirement, not a preference.

- The chosen swatch is marked by a bracket SHAPE and a two-tone ring (`ring-inner` then `ring-outer`). One hue cannot read on white, black, a checker and chroma, but a two-tone ring can.
- Chroma rests at the muted `sw-chroma` and goes to the true key green `sw-chroma-live` on hover or when chosen, so a tertiary control never out-shouts the artwork.
- It is a `role="radio"` group: use `aria-checked`, not `aria-pressed`.
- The ground applies to the whole preview, both halves of the wipe.

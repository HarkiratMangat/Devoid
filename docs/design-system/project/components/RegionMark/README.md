The outline around a disputed region, drawn over the wipe. Left of the seam the real pixels show with nothing over them; right of it the region keeps a diagonal hatch plus a faint `ruby` wash, which is how removed material is marked in a technical drawing.

- The hatch is clipped by `--qseam`, a percentage of the REGION'S own box, never `--seam`. A percentage in `clip-path` resolves against the clipped element, so the two are different numbers.
- The tag sits outside the box, so the fill is on `::before` and the element itself is not clipped.
- Mark the disputed pixels when a mask is available (alpha-only `--qmask`); the bounding box is the fallback and overstates the region.
- The label is `qregion-ink` on `ruby`, 4.64:1. The consumer supplies position, size and the tag text.

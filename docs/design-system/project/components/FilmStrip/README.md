The frame axis as a perforated strip: structural, not a control, because registration across frames is what makes this better than a single-image remover.

- The current frame is `raise` with a 3px `cyan` top and bottom edge. Neighbours are ghosted at 40% for onion skinning.
- A flagged frame carries a notch (a small rotated diamond) as well as a `ruby` edge, so it reads in greyscale.
- There is no easing on the playhead. Scrubbing must feel like dragging a physical strip.
- The consumer supplies the frame count, the current index and the flagged set.

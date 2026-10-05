The contact-sheet tile: a window onto one asset, on `sprocket`, `r2` radius, with a hairline inset ring. Nothing selected means the strip fills the space as a contact sheet and every tile animates.

- State sets the hierarchy, never the artwork's own colours. The demanding states (`needs-you`, `refused`, `blocked`) get a 2px `ruby` ring, a diagonal hatch over the window, and the `raise` ground. Hatching is hue-independent, which matters because a third of some artwork sits within RGB distance 90 of the ruby wash.
- Everything else recedes on the contact sheet: dimmed with `brightness(.55) saturate(.65)` on the void, and washed toward the light on the emitting ground. It clears on hover. Nothing dims on the stage, where an edge is judged.
- Every state carries a Pencil mark and a word in the caption. Never colour alone.
- The consumer supplies the image (animated, on a `chk-s` ground), the file name and the state word.

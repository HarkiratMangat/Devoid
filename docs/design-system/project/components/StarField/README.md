The sky behind the table: one canvas, drawn once to fit its host and never tiled. A tiled sky repeats its constellations on a fixed pitch and the eye finds them at once; a real field never does.

- Density is per unit area (one star per 3,300 square px), so a tall window is not sparser than a wide one.
- The distribution is a steep power curve: radius .42 to 1.6px and alpha off `m^2.4`, so most stars are faint and a few carry the field. Colour runs white, then cold (`star-cold` family), with the occasional warm one.
- Repaint on resize (debounced) and whenever the lighting changes: in `emitting` the stars invert to dark motes at about a third of the alpha, so both states carry the same grain.
- Behind it sit two off-centre blooms, `neb-violet` bottom left and `neb-blue` top right. The big void surfaces stay transparent so the one sky shows through; only a tile's window keeps its own `well` ground.
- Never on the stage's artwork, and never per element. The preview seeds its random numbers so the field is stable; the app uses `Math.random`.

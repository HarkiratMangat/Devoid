The state vocabulary: a stroked shape drawn on the frame the way a photographer marks a contact sheet. Every state has a different SHAPE, so the set stays distinguishable in greyscale; colour only reinforces it, and a word always sits beside the mark.

| mark | shape | stroke |
|---|---|---|
| Done | a tick | `ok` |
| Ready | a bar | `cyan` |
| Not checked | a cross | `amber` |
| Needs you | an open circle | `ruby` |
| Running | a quarter arc | `cyan` |
| Loading | registration corners | `graphite-3` |
| Refused | the circle, struck through | `ruby` |
| Cancelled | a stop square | `graphite-2` |
| Failed | an exclamation | `ruby` |
| Confirm | a gate with posts | `amber` |
| Conflict | two offset squares | `amber` |
| Blocked | a gate with posts | `ruby` |

- Draw them in a 100 by 100 viewBox with round caps and joins. On a tile the stroke is 3px non-scaling; on a tab or a banner it is 8 in viewBox units.
- Confirm and Blocked are the same gate: asking versus barring. Colour is the only difference, so always pair them with the word.
- Never redraw these. Add a new state with a new shape.

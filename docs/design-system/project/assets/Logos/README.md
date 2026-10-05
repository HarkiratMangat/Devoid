The wordmark is DEVOID with the O drawn as the accretion disk, the same object the empty table's horizon and the lighting toggle are. The typeface is the letters alone. Never recolour or redraw the mark: the event horizon and the spiral are left exactly as drawn, and raster files cannot take `currentColor`. Show the app wordmark at a 22px height in the chrome.

Each file has two names: the URL name it is stored under here, and the pretty name it carries in the source folder (`DEVOID Logo Assets`). Spaces and capitals are kept in the pretty name, hyphens in the URL name.

| URL name | Pretty name | Notes |
|---|---|---|
| `wordmark-app-collapsed.png` | DEVOID Wordmark App Collapsed.png | White letterforms and the vortex O, for the app chrome in the collapsed state. |
| `wordmark-app-emitting.png` | DEVOID Wordmark App Emitting.png | Re-inked for the emitting `bench` (#ffffff). |
| `wordmark-transparent.png` | DEVOID Wordmark Transparent.png | The full wordmark with the vortex O, transparent. |
| `wordmark-navy.png` | DEVOID Wordmark Navy.png | The full wordmark on the navy ground. |
| `typeface-bevel-transparent.png` | DEVOID Typeface Bevel Transparent.png | The letters only, bevelled, transparent. |
| `typeface-bevel-navy.png` | DEVOID Typeface Bevel Navy.png | The letters only on the navy ground. Byte-identical to `Isolated/DEVOID Full Typeface Isolated.png`, so it is stored once. |
| `typeface-flat-transparent.png` | DEVOID Typeface Flat Transparent.png | The letters only, flat white, transparent. |
| `typeface-flat-vector.svg` | DEVOID Typeface Flat Vector.svg | The letters only as a black vector. An `<img>` cannot take `currentColor`, so recolour inside the file. |

The two app wordmarks live in `web/assets/` as `wordmark.png` and `wordmark-emitting.png` and keep those file names, because the app's CSS loads them by name; their pretty names exist only here.

The old file names are kept in `DEVOID Logo Assets/Isolated/Legacy Names/`.

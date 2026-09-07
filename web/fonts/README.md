# Fonts shipped with Devoid

Both families are self-hosted so the app does not reach the network for type. Both are licensed under the **SIL Open Font License 1.1**, whose text is in [`OFL.txt`](OFL.txt) beside this file.

⚠️ **The licence has to travel with the files.** These `.woff2` files are redistributed inside the disk image, and OFL 1.1 requires the licence to accompany them. That is an obligation rather than a courtesy, and it is independent of whatever licence the app itself carries. Recorded 2026-09-07 16:26 EDT, after an audit found the fonts shipping with no licence anywhere in the repository.

| family | used for | upstream |
|---|---|---|
| **Archivo** | the interface. The `wdth` axis is load-bearing in `docs/DESIGN.md` | <https://github.com/Omnibus-Type/Archivo> |
| **Spline Sans Mono** | numbers and paths, for `tabular-nums` | <https://github.com/SorkinType/SplineSansMono> |

Both were fetched through Google Fonts' `css2` API and rewritten to local paths by `scripts/fetch-fonts.py`. `web/fonts.css` declares them, and `python3 scripts/check_font_axes.py --check` asserts that every declared axis range matches the range the shipped file actually carries — which is how the note in `fonts.css` about Google serving one variable file per subset regardless of the requested range came to be written.

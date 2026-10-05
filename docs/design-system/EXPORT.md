# Devoid design system: export

Exported 2026-10-04 20:32 EDT from the Design System artifact <https://claude.ai/artifact/AhzVPSCXAQc6yikkdhdWLP> (private to the owner), at version 1791160284-37f7. It was extracted from this repository's own front end (`web/app.css`, `web/fonts.css`, `docs/DESIGN.md`, `web/app.js`), so the code stays the source of truth and this folder is a structured, queryable view of it.

**Start at [`project/README.md`](project/README.md)**: the brand book (content fundamentals, visual foundations, iconography, usage rules that name tokens). Then read what you need:

| file | holds |
|---|---|
| `project/tokens.json` | every colour (both lighting states), type style, spacing, radius and shadow, each with a usage note and measured contrast |
| `project/tokens.css` | the same tokens compiled to CSS custom properties, `data-theme="collapsed"` and `data-theme="emitting"`, plus `@font-face` |
| `project/components/bundle.css` | the component styles: the shipped `web/app.css` rules, ported to the `data-theme` selectors |
| `project/components/<Name>/README.md` | when to use it, what the consumer supplies, do and don't |
| `project/components/<Name>/preview.html` | a static preview. Images point at `/_blob/<id>` and only resolve inside the artifact |
| `project/assets/<Group>/README.md` | each asset's URL name and pretty name |
| `project/fonts/` | Archivo and Spline Sans Mono, latin subset, with the OFL licence |
| `project/design-system.json` | the artifact's index, including asset ids |

## What this export leaves out

- **Binary assets.** The artwork lives in `DEVOID Logo Assets/` under its pretty names (`DEVOID Wordmark Navy.png`, and so on); the app's own wordmarks are `web/assets/wordmark.png` and `web/assets/wordmark-emitting.png`. The asset ids in `project/design-system.json` only resolve inside the artifact.
- **Generated files.** The artifact's `api/` cards, `manifest.json` and the "Consuming" and "Index" sections appended to its README are rebuilt by the page. They were stale when exported (they still listed two logo files), so they are not kept here.
- **The authoring runtime** (`SKILL.md`, `artifact-type/`, `index.html`), which belongs to the Design System type, not to this system.

## Precedence

If this folder and the code disagree, the code wins: `web/app.css` for values, `docs/DESIGN.md` for rules and history. Re-export after a visual change rather than editing here, and say so in `docs/CHANGELOG.md`.

## Known gaps

- Component previews are hand-written static renditions, not a mounted component library; the app is plain DOM and ships no JavaScript bundle.
- Motion has no token family. The easing curves are `--ease` and `--ease-collapse` in `bundle.css`.
- The contact-sheet arrival animation is runtime behaviour and is not carried.
- Only the latin subset of each font is exported; the app ships latin-ext and vietnamese files for Archivo too.
- The cover is a banner image (`DEVOID Banner Warp.png`) loaded from the artifact's asset store.

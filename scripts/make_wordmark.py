"""Derive the two wordmark assets from the supplied master PNG.

⚠️ **Two files, because the app has two lighting states and the mark is white.**
The master's letterforms are near-white with a soft dark shadow: right on the
void, invisible on ``--bench: #FFFFFF`` in emitting.

⚠️ **The recolour is by MEASUREMENT, not by eye, because three different things
in this image are near-grey and only two of them may move.** Measured on the
master: bright neutrals (the letterforms) are 976,508 px and **100% fully
opaque**; dark neutrals are 135,074 px and only **40.8% opaque** -- that split
is the drop shadow (semi-transparent) against the black hole's core (opaque).
A first version inverted luminance for every neutral pixel and turned the event
horizon WHITE, which is the one thing in this mark that must never be light.

So, per pixel:

  saturated (chroma > CHROMA_MAX)   the accretion spiral -- untouched, and it
                                    is already the app's own cyan and ruby
  neutral + bright                  the letterforms -> re-inked dark
  neutral + dark + translucent      the drop shadow -> lightened, so the mark
                                    keeps its relief on white
  neutral + dark + opaque           the event horizon -> untouched

    python3 scripts/make_wordmark.py [master.png]

Writes web/assets/wordmark.png and web/assets/wordmark-emitting.png, cropped to
the mark's own bounding box so the CSS is sizing the artwork and not its padding.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
#: ⚠️ The master lives IN THE REPO. It was first read from ~/Downloads, and that
#: file was gone within the hour — a build script whose input can vanish is not
#: reproducible, which is this project's rule about every quoted number.
MASTER = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "DEVOID Logo Assets" / "DEVOID Workmark_Transparent.png"
OUT = ROOT / "web" / "assets"

#: 6x the ~22px the header renders it at, which covers a 2x display with room.
TARGET_H = 132
#: Above this chroma a pixel belongs to the spiral and is never recoloured.
CHROMA_MAX = 26
#: The emitting ink. Matches --graphite in app.css's .emitting block.
INK = np.array([0x12, 0x11, 0x1A], dtype=np.float64)
#: Neutral pixels at or above this luminance are letterform, not shadow or core.
LETTER_LUM = 140.0
#: A dark neutral this opaque is the event horizon, not the drop shadow.
CORE_ALPHA = 250


def main() -> int:
    if not MASTER.is_file():
        print(f"no master at {MASTER}", file=sys.stderr)
        return 1
    im = Image.open(MASTER).convert("RGBA")
    a = np.array(im)

    ys, xs = np.where(a[..., 3] > 8)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    a = a[box[1]:box[3], box[0]:box[2]]
    print(f"cropped {im.size} -> {(box[2]-box[0], box[3]-box[1])}")

    rgb = a[..., :3].astype(np.float64)
    alpha = a[..., 3]

    # chroma = how far this pixel is from grey. The spiral is saturated; the
    # letterforms and their shadow are not.
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    neutral = (chroma <= CHROMA_MAX) & (alpha > 0)

    lit = a.copy()

    lum = rgb.mean(axis=-1)
    letters = neutral & (lum >= LETTER_LUM)
    shadow = neutral & (lum < LETTER_LUM) & (alpha < CORE_ALPHA)
    core = neutral & (lum < LETTER_LUM) & (alpha >= CORE_ALPHA)

    lit_rgb = rgb.copy()
    # Letters: keep their internal shading, re-based on the ink. A letterform
    # that is not perfectly flat white stays not-perfectly-flat.
    depth = np.clip((255.0 - lum) / (255.0 - LETTER_LUM), 0.0, 1.0)[..., None]
    lit_rgb[letters] = (INK + (110.0 - INK * 0.0) * depth)[letters]
    # Shadow: a dark shadow under dark letters on white reads as mud. Lift it
    # to a light grey so the relief survives the inversion.
    lit_rgb[shadow] = (255.0 - (255.0 - rgb) * 0.16)[shadow]
    lit[..., :3] = np.clip(lit_rgb, 0, 255).astype(np.uint8)

    print(f"letters re-inked  {letters.sum():>9,} px")
    print(f"shadow lifted     {shadow.sum():>9,} px")
    print(f"event horizon     {core.sum():>9,} px  UNTOUCHED")
    print(f"spiral            {(~neutral & (alpha > 0)).sum():>9,} px  UNTOUCHED")

    OUT.mkdir(parents=True, exist_ok=True)
    h, w = a.shape[:2]
    size = (round(w * TARGET_H / h), TARGET_H)
    for name, arr in (("wordmark.png", a), ("wordmark-emitting.png", lit)):
        img = Image.fromarray(arr, "RGBA").resize(size, Image.LANCZOS)
        img.save(OUT / name, optimize=True)
        print(f"wrote web/assets/{name}  {size[0]}x{size[1]}  {(OUT / name).stat().st_size:,} bytes")
    print(f"aspect ratio {size[0] / size[1]:.4f}  (use it in app.css)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

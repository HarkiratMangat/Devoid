#!/usr/bin/env python3
"""Is the rubylith overlay actually visible over real artwork?

DESIGN.md's signature is a red-orange wash over whatever is about to be deleted.
This measures, per asset, what fraction of the OPAQUE artwork sits close enough
to that colour that the wash would be invisible over it.

    python3 scripts/measure_overlay_collision.py <transparent.gif|webp> ...

Result at the time of writing, over 8 real corpus outputs:
    hurricane 31.0%   paper-plane 20.6%   growth 4.7%   the other five <=1.5%

That is why the wash carries a diagonal HATCH as well as the tint — hatching is
hue-independent, and hue alone is not a channel this content supports. If a
future change alters --ruby, re-run this before trusting it.
"""
import sys, os, collections
from PIL import Image, ImageSequence
import numpy as np

RUBY = np.array([0xE2, 0x40, 0x2A])   # keep in sync with --ruby in app.css
NEAR = 90                             # RGB euclidean distance judged "same family"

def main(paths):
    print(f"overlay #{'%02x%02x%02x' % tuple(RUBY)}  ·  near = RGB distance < {NEAR}\n")
    print(f"{'asset':<14}{'size':<12}{'frames':<8}{'opaque%':<10}{'hidden%':<9}top art colours")
    for p in paths:
        with Image.open(p) as im:
            n = getattr(im, "n_frames", 1)
            mid = n // 2
            for i, f in enumerate(ImageSequence.Iterator(im)):
                if i == mid:
                    fr = f.convert("RGBA"); break
        a = np.array(fr)
        opaque = a[..., 3] > 200
        px = a[..., :3][opaque]
        if px.size == 0:
            print(f"{os.path.basename(p):<14}fully transparent"); continue
        d = np.sqrt(((px.astype(int) - RUBY) ** 2).sum(1))
        hidden = 100 * float((d < NEAR).mean())
        top = collections.Counter(map(tuple, px // 48 * 48)).most_common(3)
        cols = " ".join("#%02x%02x%02x" % c for c, _ in top)
        flag = "  <-- overlay unreliable here" if hidden > 10 else ""
        print(f"{os.path.splitext(os.path.basename(p))[0]:<14}{str(fr.size):<12}{n:<8}"
              f"{100*opaque.mean():6.1f}%   {hidden:6.1f}%  {cols}{flag}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])

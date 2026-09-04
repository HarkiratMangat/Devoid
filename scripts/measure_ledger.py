#!/usr/bin/env python3
"""Derive the prototype's ledger numbers from the assets it actually ships.

The first version of prototype/app.js carried hand-written px counts. An audit
found `total` was a real 640x640 measurement for five of six assets, `bg` matched
no measurement at any scale, and `art` was asserted with no source — while
CLAUDE.md says every number must be citable. This script is the citation.

    python3 scripts/measure_ledger.py            # prints a JS block to paste
    python3 scripts/measure_ledger.py --check    # exit 1 if app.js disagrees

Measured on the middle frame of each SHIPPED asset (260x260), so the ledger's
numbers describe the image on screen rather than a source that is not here.
  bg    = transparent px in the cut output   (what removal took)
  art   = opaque px in the SOURCE that are transparent in the cut
          (artwork lost — the number every defect in this project's history is)
  total = opaque px in the cut output        (what survived)

⚠️ `art` is a CEILING, not a defect count. It counts source pixels that differed
from the corner colour and are transparent in the cut — which legitimately
includes the antialiasing ramp the keyer is supposed to remove. Use it to compare
settings against each other on one asset, never as an absolute "damage" figure.
`paper-plane` reports n/a because its cut output is 640x640 while its source is
260x260, so the two are not comparable pixel-for-pixel.
"""
import json, sys, pathlib
from PIL import Image, ImageSequence
import numpy as np

A = pathlib.Path(__file__).resolve().parent.parent / "prototype" / "assets"

def mid_rgba(p):
    with Image.open(p) as im:
        n = getattr(im, "n_frames", 1)
        for i, f in enumerate(ImageSequence.Iterator(im)):
            if i == n // 2:
                return np.array(f.convert("RGBA")), n
    return None, 0

def measure(stem, ext):
    cut_p, src_p = A / f"{stem}.{ext}", A / f"{stem}.src.gif"
    if not cut_p.exists():
        return None
    cut, frames = mid_rgba(cut_p)
    cut_a = cut[..., 3] > 200
    row = {"bg": int((~cut_a).sum()), "total": int(cut_a.sum()), "frames": frames}
    if src_p.exists():
        src, _ = mid_rgba(src_p)
        if src.shape[:2] == cut.shape[:2]:
            # the source has no alpha, so "opaque in source" is the whole canvas;
            # artwork loss is measured against the source's non-background pixels
            corner = src[0, 0, :3]
            src_art = (np.abs(src[..., :3].astype(int) - corner).max(axis=2) > 20)
            row["art"] = int((src_art & ~cut_a).sum())
        else:
            row["art"] = None      # scales differ — not comparable, say so
    else:
        row["art"] = None
    return row

ASSETS = [("megaphone","gif"),("hurricane","gif"),("galaxy","gif"),("rocket","gif"),
          ("growth","gif"),("satellite","gif"),("paper-plane","webp"),("secure","gif")]

out = {}
for stem, ext in ASSETS:
    r = measure(stem, ext)
    if r: out[stem] = r

if "--json" in sys.argv:
    print(json.dumps(out, indent=2)); sys.exit()

if "--check" in sys.argv:
    # ⚠️ THE CHECK LIVES HERE, not in a throwaway one-liner. Two hand-rolled
    # verifiers for this exact comparison were written and BOTH were wrong — one
    # regex spanned neighbouring entries, the next rejected optional spaces — each
    # reporting a mismatch that did not exist. A checker nobody keeps is a checker
    # nobody debugs.
    import re
    js = (pathlib.Path(__file__).resolve().parent.parent / "prototype" / "app.js").read_text()
    blk = js[js.index("const ASSETS = ["):js.index("];", js.index("const ASSETS = ["))]
    bad = []
    for stem, _ in ASSETS:
        # slice ONE entry: from its id to the next id or the end of the block
        i = blk.find("id:'%s'" % stem)
        if i < 0:
            bad.append("%s: not in app.js" % stem); continue
        nxt = min([j for j in (blk.find("id:'", i + 5),) if j > 0] or [len(blk)])
        body = blk[i:nxt]
        if re.search(r"px:\s*null", body):
            continue                      # deliberately unmeasured
        m = re.search(r"px:\s*\{\s*bg:\s*(\d+)\s*,\s*art:\s*(\d+|null)\s*,\s*total:\s*(\d+)", body)
        if not m:
            bad.append("%s: no px block" % stem); continue
        got = (int(m.group(1)), None if m.group(2) == "null" else int(m.group(2)), int(m.group(3)))
        exp = (out[stem]["bg"], out[stem]["art"], out[stem]["total"])
        if got != exp:
            bad.append("%s: app.js %s vs measured %s" % (stem, got, exp))
    if bad:
        print("LEDGER OUT OF DATE:"); [print("  " + b) for b in bad]; sys.exit(1)
    print("ledger matches the measurement (%d assets checked)" % len(ASSETS)); sys.exit()

print(f"{'asset':<13}{'frames':<8}{'bg (removed)':<15}{'art (lost)':<13}{'total (survived)'}")
for k, v in out.items():
    art = "n/a" if v["art"] is None else f"{v['art']:,}"
    print(f"{k:<13}{v['frames']:<8}{v['bg']:>12,}   {art:>10}   {v['total']:>12,}")
print("\n--- paste into prototype/app.js ---")
for k, v in out.items():
    art = "null" if v["art"] is None else v["art"]
    print(f"  {k:<12} px:{{bg:{v['bg']}, art:{art}, total:{v['total']}}}, frames:{v['frames']}")

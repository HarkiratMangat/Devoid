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
⚠️ The `art = None` branch exists for a scale mismatch between a cut output and
its source. No shipped asset hits it today — paper-plane did until it was resized
to 260x260 — so that branch and app.js's matching copy are currently DEAD.
"""
import json, sys, pathlib
from PIL import Image, ImageSequence
import numpy as np

def _root():
    return pathlib.Path(__file__).resolve().parent.parent

def _assets():
    """⚠️ prototype/ becomes web/ at PLAN.md step 0.1. Resolve, never hardcode —
    a hardcoded path here broke the very gate the plan calls un-re-derivable."""
    for d in ("web", "prototype"):
        p = _root() / d / "assets"
        if p.is_dir():
            return p
    raise SystemExit("no assets directory found under web/ or prototype/")

def _appjs():
    for d in ("web", "prototype"):
        p = _root() / d / "app.js"
        if p.is_file():
            return p
    raise SystemExit("app.js not found under web/ or prototype/")


A = _assets()

def mid_rgba(p):
    with Image.open(p) as im:
        n = getattr(im, "n_frames", 1)
        for i, f in enumerate(ImageSequence.Iterator(im)):
            if i == n // 2:
                return np.array(f.convert("RGBA")), n
    return None, 0

def measure(stem, ext):
    A = _assets()
    cut_p, src_p = A / f"{stem}.{ext}", A / f"{stem}.src.gif"
    if not cut_p.exists():
        return None
    cut, frames = mid_rgba(cut_p)
    # ⚠️ 200 (alpha) and 20 (colour distance, below) are INVENTED thresholds.
    # They decide every number this script emits. Comparative, not absolute.
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
    js = _appjs().read_text()
    if "const ASSETS = [" not in js:
        # ⚠️ Stage 2 (PLAN.md) removed the hardcoded ASSETS literal on purpose:
        # web/app.js now reads ledger numbers live from the server's real render
        # (server/render.py's _ledger(), same bg/art/total method as this script),
        # per PRODUCT.md's "never report a verification the run did not earn" —
        # a hardcoded literal was itself an unearned, static stand-in. There is
        # nothing left in app.js to compare against; that is the correct state,
        # not a regression. tests/test_render.py::test_render_and_journal is the
        # gate that now exercises a real render's ledger end to end.
        print("no hardcoded ASSETS literal in app.js — ledger numbers are live "
              "from the server now (see tests/test_render.py); nothing to check")
        sys.exit()
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

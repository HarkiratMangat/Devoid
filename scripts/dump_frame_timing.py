#!/usr/bin/env python3
"""Dump the REAL per-frame delays of the shipped assets, for the wipe's clock test.

    python3 scripts/dump_frame_timing.py            # print a summary
    python3 scripts/dump_frame_timing.py --write    # rewrite tests/fixtures/frame-timing.json

tests/test_wipe_sync.mjs asserts wipe.js's frame clock against these arrays, so
the numbers it uses are the corpus's own rather than invented ones. Re-run this
after any change to web/assets/.

⚠️ TWO THINGS THIS SCRIPT EXISTS TO KEEP HONEST.

1. Pillow's WebP plugin does NOT expose per-frame `duration`; every frame of
   paper-plane.webp reads as None through ImageSequence. docs/HANDOFF.md
   concluded from that the file "carries no frame durations at all". It does:
   `webpmux -info` lists 40, 80, 20, 20 ... for 97 frames totalling 2,400 ms,
   the same total as its 96-frame source. So this script reads WebP through
   webpmux, not Pillow, and the desync attributed to missing timing is really
   a missing-decoder problem.

2. growth genuinely does mismatch: 123 f / 2,920 ms source against
   85 f / 1,700 ms cut. That one is real and is what the shared clock fixes.
"""

import json
import pathlib
import re
import subprocess
import sys

from PIL import Image, ImageSequence

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "web" / "assets"
OUT = ROOT / "tests" / "fixtures" / "frame-timing.json"


def gif_delays(path: pathlib.Path) -> list[int]:
    im = Image.open(path)
    return [int(f.info.get("duration") or 0) for f in ImageSequence.Iterator(im)]


def webp_delays(path: pathlib.Path) -> list[int]:
    """webpmux -info, because Pillow cannot see these. See the docstring."""
    out = subprocess.run(
        ["webpmux", "-info", str(path)], capture_output=True, text=True, check=True
    ).stdout
    # No.: width height alpha x_offset y_offset duration ...
    rows = re.findall(r"^\s*\d+:(?:\s+\S+){5}\s+(\d+)\s", out, re.M)
    return [int(d) for d in rows]


def delays(path: pathlib.Path) -> list[int]:
    return webp_delays(path) if path.suffix == ".webp" else gif_delays(path)


def main() -> int:
    data = {}
    for p in sorted(ASSETS.iterdir()):
        if p.is_dir():
            continue
        d = delays(p)
        data[p.name] = {"frames": len(d), "total_ms": sum(d), "delays": d}
        print(f"{p.name:24s} frames={len(d):4d} total={sum(d):6d}ms")
    if "--write" in sys.argv:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(data, indent=1) + "\n")
        print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

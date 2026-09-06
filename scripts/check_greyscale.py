#!/usr/bin/env python3
"""Run DESIGN.md's greyscale rule as a check, not as a claim.

`DESIGN.md`: *"NO STATE IS COLOUR ALONE ... Check by rendering greyscale."* It
calls this a runnable check and `HANDOFF.md` claimed it passed. Nothing ran it.
It passed on the contact sheet — where every tile carries a grease-pencil mark —
and failed on the primary surface, where `#openstate` rendered as one uniform
grey run and the ledger bar's two segments were a 1.10:1 step.

⚠️ WHY IT NEEDS THE WINDOW'S HELP. A checker cannot find "the state mark" in a
screenshot. `scripts/capture-window.mjs` writes `<state>.boxes.json` beside each
capture, holding the real bounding boxes in capture pixels. This file
desaturates the PNG and measures inside those boxes against the ring of pixels
around them. No box, no check — and a missing box is a FAILURE, because it means
the element was not on screen at all.

Usage:
  .venv/bin/python scripts/check_greyscale.py            # print the table
  .venv/bin/python scripts/check_greyscale.py --check    # exit 1 on failure
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "local" / "window-shots"

# (capture, selector, minimum |Δ mean luminance| against the surrounding ring)
# ⚠️ These margins are what a desaturated eye can separate, not what looks nice.
MARK_MARGIN = 8.0          # 0-255; a mark must stand off its own background
PAIR_MARGIN = 6.0          # two segments of one bar must not read as one block
SQUINT_MARGIN = 8.0        # the focal tile must lead the field, not tie with it

MARKS = [
    ("09-seam", ".omark", "F29 — the open view's state mark"),
    ("01-contact-sheet", ".st", "the tile's state word"),
]
PAIRS = [
    # ⚠️ `10-ledger`, not `09-seam`: the bar only renders for a finished job, and
    # pointing this at a state that cannot show it made the check unfailable.
    ("10-ledger", ".lseg-bg", ".lseg-total", "F30 — the ledger bar's two segments"),
]


def load(name: str):
    from PIL import Image
    png, boxes = SHOTS / f"{name}.png", SHOTS / f"{name}.boxes.json"
    if not png.exists():
        raise SystemExit(f"check_greyscale: {png} is missing — run `npm run gate:ui` first")
    if not boxes.exists():
        raise SystemExit(f"check_greyscale: {boxes} is missing — the gate did not write element boxes")
    return Image.open(png).convert("L"), json.loads(boxes.read_text())


def clamp(img, box):
    """A box clipped to the image, or None when nothing of it is visible.

    ⚠️ An element scrolled above the viewport reports a NEGATIVE top, and an
    element in a collapsed container reports zero height. Both produced a crop
    whose lower edge was above its upper edge and PIL raised — a checker that
    crashes on a real, ordinary state is a checker nobody will run.
    """
    x, y, w, h = box
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(img.width, x + max(0, w)), min(img.height, y + max(0, h))
    if x1 <= x0 or y1 <= y0:
        return None
    return (x0, y0, x1, y1)


def mean(img, box) -> float:
    r = clamp(img, box)
    if r is None:
        return 0.0
    px = list(img.crop(r).getdata())
    return sum(px) / len(px) if px else 0.0


def ring(img, box, pad: int = 10) -> float:
    """The mean of the band around a box — what the mark has to stand off."""
    inner = clamp(img, box)
    if inner is None:
        return 0.0
    x, y, w, h = box
    outer = clamp(img, (x - pad, y - pad, w + 2 * pad, h + 2 * pad))
    if outer is None:
        return 0.0
    o = img.crop(outer)
    total, count = sum(o.getdata()), o.width * o.height
    inner_mean = mean(img, box)
    inner_count = (inner[2] - inner[0]) * (inner[3] - inner[1])
    band = count - inner_count
    if band <= 0:
        return inner_mean
    return (total - inner_mean * inner_count) / band


def main() -> int:
    failures: list[str] = []
    print(f"{'capture':20} {'element':34} {'inside':>7} {'around':>7} {'Δ':>6}  need")
    for name, sel, why in MARKS:
        img, boxes = load(name)
        got = boxes.get(sel)
        if not got:
            failures.append(f"{name}: no `{sel}` was on screen at all ({why})")
            print(f"{name:20} {sel:34} {'—':>7} {'—':>7} {'—':>6}  {MARK_MARGIN}  ✗ absent")
            continue
        worst = None
        for box in got:
            if clamp(img, box) is None:
                continue                      # off-screen or collapsed: not a failure, not a score
            d = abs(mean(img, box) - ring(img, box))
            if worst is None or d < worst[0]:
                worst = (d, box)
        if worst is None:
            failures.append(f"{name}: every `{sel}` box was off-screen or collapsed ({why})")
            continue
        d, box = worst
        ok = d >= MARK_MARGIN
        if not ok:
            failures.append(f"{name}: `{sel}` is {d:.1f}/255 from its surroundings in greyscale, "
                            f"needs {MARK_MARGIN} ({why})")
        print(f"{name:20} {sel:34} {mean(img, box):7.1f} {ring(img, box):7.1f} {d:6.1f}  "
              f"{MARK_MARGIN}{'' if ok else '  ✗'}")

    for name, a_sel, b_sel, why in PAIRS:
        img, boxes = load(name)
        a, b = boxes.get(a_sel), boxes.get(b_sel)
        if not a or not b:
            failures.append(f"{name}: `{a_sel}` or `{b_sel}` was not on screen ({why})")
            continue
        da, db = mean(img, a[0]), mean(img, b[0])
        d = abs(da - db)
        ok = d >= PAIR_MARGIN
        if not ok:
            failures.append(f"{name}: `{a_sel}` and `{b_sel}` are {d:.1f}/255 apart in greyscale, "
                            f"needs {PAIR_MARGIN} ({why})")
        print(f"{name:20} {a_sel + ' vs ' + b_sel:34} {da:7.1f} {db:7.1f} {d:6.1f}  "
              f"{PAIR_MARGIN}{'' if ok else '  ✗'}")

    # --- F36: the squint test, as a measurement -----------------------------
    # `DESIGN.md` claims the contact sheet's hierarchy survives a desaturated
    # blur and `HANDOFF.md` claimed it was checked. Hierarchy was actually being
    # set by the SOURCE FILE's own canvas colour, so the needs-you card was loud
    # by coincidence — and six already-cut assets would have left no focal point
    # at all. Blur hard enough that only mass and value survive, then ask which
    # tile wins.
    from PIL import Image, ImageFilter
    img, boxes = load("01-contact-sheet")
    blurred = img.filter(ImageFilter.GaussianBlur(radius=12))
    want = boxes.get('.frame[data-state="needs-you"]') or []
    # ⚠️ Compare against EVERY other tile, not against two hand-picked states.
    # The corpus does not always contain a `ready` and a `done`, and a check
    # that silently has nothing to compare against is a check that cannot fail.
    wanted = {tuple(b) for b in want}
    others = [b for b in (boxes.get('.frame') or []) if tuple(b) not in wanted]
    if not want:
        failures.append("01-contact-sheet: no needs-you tile was on the sheet (F36 squint test)")
    elif not others:
        failures.append("01-contact-sheet: nothing to compare the needs-you tile against (F36 squint test)")
    else:
        mine = max(mean(blurred, b) for b in want)
        theirs = max(mean(blurred, b) for b in others)
        # ⚠️ `> 0` is not a squint test. The first run of this check passed by
        # 0.4/255, which no eye can separate — a pass with no margin is a fail
        # wearing a tick. SQUINT_MARGIN is what a blurred, desaturated glance
        # can actually pick out.
        ok = (mine - theirs) >= SQUINT_MARGIN
        if not ok:
            failures.append(f"01-contact-sheet: under a desaturated blur the needs-you tile reads "
                            f"{mine:.1f} against {theirs:.1f}, a margin of {mine - theirs:.1f} — state is not setting the "
                            f"hierarchy (F36 squint test)")
        print(f"{'01-contact-sheet':20} {'squint: needs-you vs the rest':34} "
              f"{mine:7.1f} {theirs:7.1f} {mine - theirs:6.1f}  {SQUINT_MARGIN}{'' if ok else '  ✗'}")

    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for f in failures:
            print("  " + f)
    else:
        print("\nEvery state reads without colour.")
    if "--check" in sys.argv:
        return 1 if failures else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

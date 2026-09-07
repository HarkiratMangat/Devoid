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
# ⚠️ BOTH LIGHTING STATES. The squint ran only on the dark sheet, so a filing
# that emitting loses tile separation could not be tested by the one check
# written to test exactly that.
SQUINTS = ["01-contact-sheet", "11-sheet-emitting"]

# ⚠️ THE SQUINT, IN BOTH LIGHTING STATES (2026-09-07 01:48 EDT). A deferred item
# says emitting "loses tile separation under a squint" in the edge rail and the
# film strip, from an eyeballed interface-design pass. It was never measured,
# and this file only ever squinted at the dark state. `03-emitting` is the same
# window in the light state, so the same pair measured there either confirms
# the filing or retires it. ⚠️ If it passes, that is not proof the filing was
# wrong — it is proof the filing was about a component this pair does not cover,
# which is itself the next thing to find out.
MARKS = [
    ("09-seam", ".omark", "F29 — the open view's state mark"),
    ("01-contact-sheet", ".st", "the tile's state word"),
    # ⚠️ THE TWO COMPONENTS THE EMITTING ITEM NAMES, 2026-09-07 10:20 EDT, in
    # BOTH lighting states. The filing came from an eyeballed interface-design
    # pass and nothing had ever measured either component in either state, so
    # "emitting is weaker here" could be neither confirmed nor retired. The
    # current rail button and the current film frame are the ones that carry a
    # state; if they do not stand off their own strip under a desaturated blur,
    # the strip is one block.
    ("09-seam", '.edge button[aria-current="true"]', "the open asset in the edge rail (void)"),
    ("03-emitting", '.edge button[aria-current="true"]', "the open asset in the edge rail (EMITTING)"),
    ("09-seam", '.frames button[aria-current="true"]', "the current frame in the film strip (void)"),
    ("03-emitting", '.frames button[aria-current="true"]', "the current frame in the film strip (EMITTING)"),
    ("11-sheet-emitting", ".st", "the tile's state word, in the LIGHT state"),
]
PAIRS = [
    # ⚠️ `10-ledger`, not `09-seam`: the bar only renders for a finished job, and
    # pointing this at a state that cannot show it made the check unfailable.
    ("10-ledger", ".lseg-bg", ".lseg-total", "F30 — the ledger bar's two segments"),
    # ⚠️ CONTROLS, NOT STATES — the gap this file had, closed 2026-09-07 01:08 EDT.
    # The eight region tools were one row of identical geometry whose verdict
    # was a 2px coloured edge, so in greyscale Keep and Cut were the same
    # button. This file covered states and never looked at a control, which is
    # why a rule DESIGN.md calls impossible shipped anyway. Each verdict button
    # now carries a mark — solid for stays, hatch for goes — and these are the
    # two marks measured against each other. A MISSING BOX FAILS, which is the
    # point: if the toolbar is not on screen in this capture, the check says so
    # rather than passing over nothing.
    # ⚠️ `10-ledger`, not `09-seam`: the toolbar is only on screen once a region
    # tool has been armed, and 09 never arms one. Pointing this at a capture
    # that cannot show the control is how a control check becomes unfailable —
    # the same mistake the ledger-bar pair above records one line up.
    # ⚠️ A MARGIN OF ITS OWN, AND THE NUMBER CAME FROM A FALSIFIER (2026-09-07 01:19 EDT).
    # Making both marks the same glyph in the same colour still measured
    # Δ 6.0 — exactly PAIR_MARGIN — so at the default this check PASSES on two
    # identical controls and would not have failed on the defect it was written
    # for. 6.0 is this pair's noise floor, not its signal: the boxes average
    # over three buttons a side, and the two groups sit on different parts of
    # the row. The real marks measure 19.3. 12.0 sits clear of the floor and
    # well under the signal, and the falsifier now goes red.
    ("10-ledger", '.rt-tool[data-keeps="true"] .rt-mark',
                  '.rt-tool[data-keeps="false"] .rt-mark',
                  "the region tools' keep mark against their cut mark", 12.0),
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

    for name, a_sel, b_sel, why, *rest in PAIRS:
        # ⚠️ An optional fifth element is this pair's own margin. PAIR_MARGIN is
        # a default, not a law: a pair whose boxes average over several elements
        # has a higher noise floor, and a threshold at or below that floor makes
        # the check unfailable. Each override says where its number came from.
        need = rest[0] if rest else PAIR_MARGIN
        img, boxes = load(name)
        a, b = boxes.get(a_sel), boxes.get(b_sel)
        if not a or not b:
            failures.append(f"{name}: `{a_sel}` or `{b_sel}` was not on screen ({why})")
            continue
        da, db = mean(img, a[0]), mean(img, b[0])
        d = abs(da - db)
        ok = d >= need
        if not ok:
            failures.append(f"{name}: `{a_sel}` and `{b_sel}` are {d:.1f}/255 apart in greyscale, "
                            f"needs {need} ({why})")
        print(f"{name:20} {a_sel + ' vs ' + b_sel:34} {da:7.1f} {db:7.1f} {d:6.1f}  "
              f"{need}{'' if ok else '  ✗'}")

    # --- F36: the squint test, as a measurement -----------------------------
    # `DESIGN.md` claims the contact sheet's hierarchy survives a desaturated
    # blur and `HANDOFF.md` claimed it was checked. Hierarchy was actually being
    # set by the SOURCE FILE's own canvas colour, so the needs-you card was loud
    # by coincidence — and six already-cut assets would have left no focal point
    # at all. Blur hard enough that only mass and value survive, then ask which
    # tile wins.
    from PIL import Image, ImageFilter
    for squint_capture in SQUINTS:
      img, boxes = load(squint_capture)
      blurred = img.filter(ImageFilter.GaussianBlur(radius=12))
      want = boxes.get('.frame[data-state="needs-you"]') or []
      # ⚠️ Compare against EVERY other tile, not against two hand-picked states.
      # The corpus does not always contain a `ready` and a `done`, and a check
      # that silently has nothing to compare against is a check that cannot fail.
      wanted = {tuple(b) for b in want}
      others = [b for b in (boxes.get('.frame') or []) if tuple(b) not in wanted]
      if not want:
          failures.append(f"{squint_capture}: no needs-you tile was on the sheet (F36 squint test)")
      elif not others:
          failures.append(f"{squint_capture}: nothing to compare the needs-you tile against (F36 squint test)")
      else:
          mine = max(mean(blurred, b) for b in want)
          theirs = max(mean(blurred, b) for b in others)
          # ⚠️ `> 0` is not a squint test. The first run of this check passed by
          # 0.4/255, which no eye can separate — a pass with no margin is a fail
          # wearing a tick. SQUINT_MARGIN is what a blurred, desaturated glance
          # can actually pick out.
          # ⚠️ SEPARATION, NOT BRIGHTNESS (2026-09-07 01:51 EDT). `mine - theirs`
          # encodes a dark-mode assumption: that the focal tile LEADS by being
          # lighter. On a light ground the opposite is true — the field recedes
          # by washing out and the focal tile leads by staying dense — so the
          # signed form measured emitting at -8.4 and called a real inversion
          # by the same name it would use for no separation at all. The claim
          # DESIGN.md makes is that the focal tile is separable under a blur;
          # separation has no sign.
          sep = abs(mine - theirs)
          ok = sep >= SQUINT_MARGIN
          if not ok:
              failures.append(f"{squint_capture}: under a desaturated blur the needs-you tile reads "
                              f"{mine:.1f} against {theirs:.1f}, a separation of {sep:.1f} — state is not setting the "
                              f"hierarchy (F36 squint test)")
          print(f"{squint_capture:20} {'squint: needs-you vs the rest':34} "
                f"{mine:7.1f} {theirs:7.1f} {sep:6.1f}  {SQUINT_MARGIN}{'' if ok else '  ✗'}")

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

"""Fail if web/fonts.css declares an axis range the .woff2 files do not carry.

⚠️ **This exists because the CSS threw away bytes that were already downloaded.**
Measured 2026-09-06 01:03 EDT with fontTools over web/fonts/*.woff2:

    archivo-*.woff2 (x3)          wght 100..900   wdth 62..125
    spline-sans-mono-*.woff2 (x2) wght 300..700   NO wdth AXIS

and web/fonts.css declared `font-weight: 400 700` for Archivo and two STATIC
faces at 400 and 500 for the mono. So 200 weight points at each end of Archivo
and the mono's entire axis were unreachable -- shipped, paid for, unusable. At
11px, Archivo 500 against 400 is sub-perceptual, so several selectors were
paying for a weight that does not render.

⚠️ **The absence of `wdth` on Spline Sans Mono is load-bearing elsewhere.** Any
`font-stretch` applied to a mono selector is INERT -- it silently does nothing,
which is exactly the kind of no-op that survives a visual review. This script
prints the axis inventory so that claim has a citation, and fails if fonts.css
ever declares a `font-stretch` range on a file with no width axis.

⚠️ **Narrower fails as loudly as wider.** A range that overshoots the file is a
rendering bug; a range that undershoots it is the bug this script was written
for, and it is invisible -- the page looks fine, it is just quietly worse.

⚠️ **scripts/fetch-fonts.py regenerates web/fonts.css and will revert it.** This
script is what catches that.

    python3 scripts/check_font_axes.py        # exit 0 == declared matches real

Needs fontTools. The system python3 has it; the repo .venv does not.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "web" / "fonts.css"

#: CSS property -> the OpenType variation axis it actually drives.
AXIS_FOR = {"font-weight": "wght", "font-stretch": "wdth"}

FACE_RE = re.compile(r"@font-face\s*\{(.*?)\}", re.S)
SRC_RE = re.compile(r"url\(\s*([^)\s]+?)\s*\)")


def declaration(body: str, prop: str) -> str | None:
    m = re.search(r"(?m)^\s*" + re.escape(prop) + r"\s*:\s*([^;]+);", body)
    return m.group(1).strip() if m else None


def as_range(value: str) -> tuple[float, float]:
    """`100 900` -> (100, 900); `400` -> (400, 400); `62% 125%` -> (62, 125)."""
    nums = [float(t.rstrip("%")) for t in value.split()]
    return (nums[0], nums[-1])


def main() -> int:
    css = CSS.read_text()
    faces = FACE_RE.findall(css)
    if not faces:
        print(f"no @font-face rules in {CSS}", file=sys.stderr)
        return 1

    rows: list[tuple[str, ...]] = []
    problems: list[str] = []
    inventory: dict[str, set[str]] = {}

    for body in faces:
        family = (declaration(body, "font-family") or "?").strip("'\"")
        src = SRC_RE.search(declaration(body, "src") or "")
        if not src:
            problems.append(f"{family}: @font-face has no url() in src")
            continue
        path = (CSS.parent / src.group(1)).resolve()
        if not path.is_file():
            problems.append(f"{family}: {path} does not exist")
            continue

        font = TTFont(path, lazy=True)
        actual = {}
        if "fvar" in font:
            actual = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        font.close()
        inventory.setdefault(family, set()).update(actual)

        short = path.name[:34] + ("..." if len(path.name) > 34 else "")
        for prop, axis in AXIS_FOR.items():
            value = declaration(body, prop)
            real = actual.get(axis)

            if real is None:
                # No such axis in the file. A single static value is legal;
                # a range is a declaration of something that cannot happen.
                if value is None:
                    continue
                lo, hi = as_range(value)
                verdict = "ok (static)" if lo == hi else "FAIL no axis"
                if lo != hi:
                    problems.append(
                        f"{short} ({family}): declares {prop}: {value} but the file "
                        f"has no {axis} axis -- that range can never render"
                    )
                rows.append((short, family, prop, value, f"no {axis} axis", verdict))
                continue

            r_lo, r_hi = real
            if value is None:
                problems.append(
                    f"{short} ({family}): file carries {axis} {r_lo:g}..{r_hi:g} but "
                    f"fonts.css declares no {prop} -- the axis is unreachable"
                )
                rows.append((short, family, prop, "(absent)", f"{r_lo:g}..{r_hi:g}", "FAIL absent"))
                continue

            lo, hi = as_range(value)
            if lo < r_lo or hi > r_hi:
                verdict = "FAIL wider"
                problems.append(
                    f"{short} ({family}): {prop} declares {lo:g}..{hi:g}, wider than the "
                    f"file's {axis} {r_lo:g}..{r_hi:g} -- the browser clamps it"
                )
            elif lo > r_lo or hi < r_hi:
                verdict = "FAIL narrower"
                problems.append(
                    f"{short} ({family}): {prop} declares {lo:g}..{hi:g}, narrower than the "
                    f"file's {axis} {r_lo:g}..{r_hi:g} -- "
                    f"{(lo - r_lo) + (r_hi - hi):g} axis points are downloaded and unreachable"
                )
            else:
                verdict = "ok"
            rows.append((short, family, prop, value, f"{r_lo:g}..{r_hi:g}", verdict))

    head = ("file", "family", "property", "declared", "actual (fvar)", "verdict")
    width = [max(len(str(r[i])) for r in (*rows, head)) for i in range(6)]
    line = "  ".join("-" * w for w in width)
    print(f"{len(faces)} @font-face rules in {CSS.relative_to(ROOT)}\n")
    print("  ".join(h.ljust(w) for h, w in zip(head, width)))
    print(line)
    for r in rows:
        print("  ".join(str(c).ljust(w) for c, w in zip(r, width)))
    print(line)

    print("\naxis inventory, read from the shipped files:")
    for family in sorted(inventory):
        axes = inventory[family]
        print(f"  {family:<18} {', '.join(sorted(axes)) or '(static, no axes)'}")
        if "wdth" not in axes:
            print(
                f"  {'':<18} ⚠ no wdth axis -- every `font-stretch` aimed at "
                f"{family} anywhere in the app is INERT"
            )

    if problems:
        print(f"\nFAIL -- {len(problems)} declared/actual mismatch(es):", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print("\nOK -- every declared range is exactly the range its file carries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

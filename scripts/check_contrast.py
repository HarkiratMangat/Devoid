#!/usr/bin/env python3
"""Measure every contrast pair in web/app.css, in BOTH lighting states.

⚠️ Why this exists. The 2026-09-05 accessibility pass measured text-on-surface
pairs only and reported "zero failures, worst 5.12:1". Three real failures
survived it -- A4 (the .qregion label), A5 (.v-failed) and F23 (--cyan carrying
pressed state on a light ground) -- because none of them is text on a surface.
A check that only looks where it already looked cannot find anything new.

⚠️ Numbers are DERIVED from the stylesheet, never typed here. A token edited in
app.css changes this script's output on the next run; a number written into a
doc does not. `--check` exits non-zero when a pair misses its target.

Usage:
  python3 scripts/check_contrast.py            # print the table
  python3 scripts/check_contrast.py --check    # exit 1 on any failure
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "web" / "app.css"

# ⚠️ F21 SPECIFIED THE WRONG INSTRUMENT, and the arithmetic says so plainly.
# It asked for ≥1.35:1 WCAG contrast between adjacent surface planes. WCAG's
# formula is (L1+0.05)/(L2+0.05); the +0.05 flare term dominates at the dark
# end, so from the void's own luminance (Y≈0.0005) a 1.35:1 step lands at
# Y≈0.018 — a mid-grey around #252525 — and five such steps would end near
# #5E5E5E. Meeting F21 literally would mean deleting the void, which is the one
# thing "Do not touch: the palette" protects. WCAG ratio is a TEXT-LEGIBILITY
# metric and was never meant for surface separation.
#
# The right instrument is perceptual lightness. Adjacent planes are measured in
# ΔL* (CIELAB), where ~3 units is a step you can see and ~1 unit is not. The
# defect F21 found is real and this measures it honestly: the shipped ladder
# ran 0.85, 2.09, 0.37 and 4.26 ΔL* — two of four steps effectively invisible.
SURFACE_MIN = 3.0   # ΔL* units between adjacent planes

# (label, foreground token or literal, background token or literal, target, criterion)
PAIRS: list[tuple[str, str, str, float, str]] = [
    # --- the DISABLED primary, which this file was blind to until 2026-09-07 00:56 EDT -
    # it tested only `btn.go ink on cyan`, the ENABLED pair, and passed green
    # over a shipped 1.82:1. The button is disabled the whole time a question
    # is open. `.btn:disabled` now sets real tokens instead of fading the
    # element, so there is something to name here.
    ("disabled button ink on its recessed fill",
                                "--graphite-2", "--bench",    4.5, "F-disabled"),
    # --- surface ladder: measured in ΔL*, see SURFACE_MIN --------------------
    ("well vs void",            "--well",      "--void",      0.0, "F21 surface"),
    ("void vs sprocket",        "--void",      "--sprocket",  0.0, "F21 surface"),
    ("sprocket vs bench",       "--sprocket",  "--bench",     0.0, "F21 surface"),
    ("bench vs raise",          "--bench",     "--raise",     0.0, "F21 surface"),
    # --- body text ----------------------------------------------------------
    ("graphite on bench",       "--graphite",   "--bench",    4.5,  "SC 1.4.3"),
    ("graphite-2 on bench",     "--graphite-2", "--bench",    4.5,  "SC 1.4.3"),
    ("graphite-3 on bench",     "--graphite-3", "--bench",    4.5,  "SC 1.4.3"),
    ("graphite-2 on sprocket",  "--graphite-2", "--sprocket", 4.5,  "SC 1.4.3"),
    ("graphite-3 on sprocket",  "--graphite-3", "--sprocket", 4.5,  "SC 1.4.3"),
    # --- state words --------------------------------------------------------
    ("ruby-ink on bench",       "--ruby-ink",  "--bench",     4.5,  "SC 1.4.3"),
    ("amber on bench",          "--amber",     "--bench",     4.5,  "SC 1.4.3"),
    ("ok on bench",             "--ok",        "--bench",     4.5,  "SC 1.4.3"),
    ("cyan-ink on bench",       "--cyan-ink",  "--bench",     4.5,  "SC 1.4.3"),
    ("ruby-ink on ruby-bg",     "--ruby-ink",  "--ruby-bg",   4.5,  "SC 1.4.3 banner"),
    ("amber on amber-bg",       "--amber",     "--amber-bg",  4.5,  "SC 1.4.3 banner"),
    # --- A5: the history verdict --------------------------------------------
    ("v-failed on bench",       "--ruby-ink",  "--bench",     4.5,  "A5 verdict"),
    # --- non-text: rings, borders, indicators (SC 1.4.11 is 3:1) ------------
    ("focus ring on bench",     "--focus",     "--bench",     3.0,  "SC 1.4.11"),
    ("focus ring on void",      "--focus",     "--void",      3.0,  "SC 1.4.11"),
    ("score-2 border on bench", "--score-2",   "--bench",     3.0,  "A6 border"),
    ("score-2 border on raise", "--score-2",   "--raise",     3.0,  "A6 border"),
    # --- F23: cyan carries pressed state at 14 sites ------------------------
    ("cyan indicator on bench", "--cyan",      "--bench",     3.0,  "F23 SC 1.4.11"),
    # ⚠️ `--cyan` no longer carries the matte's selected state — the two-tone
    # ring does — so it is measured where it still IS the indicator: on the
    # chrome surfaces, not over an arbitrary matte.
    ("cyan indicator on raise", "--cyan",      "--raise",     3.0,  "F23 SC 1.4.11"),
    # --- A4: the disputed region's own label sits ON rubylith ---------------
    ("qregion label on ruby",   "--qregion-ink", "--ruby",    4.5,  "A4 overlay text"),
    ("btn.go ink on cyan",      "--go-ink",    "--cyan",      4.5,  "SC 1.4.3"),
    # --- F31/A-matte: the swatch's selected ring must read on ANY ground -----
]


# ⚠️ THE MATTE RING IS JUDGED BEST-OF-TWO, and that is not a loophole. A ring
# made of a light tone and a dark tone is visible on a ground when EITHER tone
# clears 3:1 against it — the other is meant to disappear. Asserting both tones
# on every ground is a requirement no two-tone ring can meet, which makes the
# check broken rather than strict; the first draft of this file did exactly
# that and failed white-on-white in emitting, where the dark tone reads 19.7:1.
RING_GROUNDS = ["#ffffff", "#000000", "--sw-chroma", "--sw-chroma-live",
                "--chk-a", "--chk-b", "--void", "--well"]
RING_MIN = 3.0


def blocks(css: str) -> dict[str, dict[str, str]]:
    """`{'collapsed': {token: value}, 'emitting': {...}}`, read from the stylesheet.

    ⚠️ Comments are stripped FIRST. A `/* ... */` holding a brace would split a
    block in half and the parser would silently return nothing -- which is
    exactly what the first draft of this function did, and it reported "all
    pairs meet their target" over an empty table. A checker that passes when it
    read nothing is worse than no checker.
    """
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out: dict[str, dict[str, str]] = {"collapsed": {}, "emitting": {}}
    for chunk in css.split("}"):
        if "{" not in chunk:
            continue
        sel, body = chunk.rsplit("{", 1)
        sel = sel.split("}")[-1].strip()
        decls = dict(re.findall(r"(--[a-z0-9-]+)\s*:\s*([^;]+)", body))
        if not decls:
            continue
        if sel == ":root":
            out["collapsed"].update(decls)
            out["emitting"].update(decls)
        elif re.search(r"(^|[\s,])(:root)?\.emitting$", sel) or sel in ('.emitting', ':root.emitting'):
            out["emitting"].update(decls)
    if not out["collapsed"]:
        raise SystemExit("check_contrast: parsed ZERO tokens from app.css — the parser is broken, not the palette")
    return out


def rgb(value: str, tokens: dict[str, str]) -> tuple[int, int, int] | None:
    value = value.strip()
    seen = 0
    while value.startswith("--") and seen < 8:
        value = (tokens.get(value) or "").strip()
        seen += 1
    m = re.match(r"^#([0-9a-fA-F]{6})$", value)
    if m:
        h = m.group(1)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    m = re.match(r"^#([0-9a-fA-F]{3})$", value)
    if m:
        h = m.group(1)
        return tuple(int(c * 2, 16) for c in h)  # type: ignore[return-value]
    m = re.match(r"^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?", value)
    if m:
        r, g, b = (int(float(x)) for x in m.groups()[:3])
        a = float(m.group(4)) if m.group(4) is not None else 1.0
        return (r, g, b, a) if a < 1.0 else (r, g, b)  # 4-tuple signals "composite me"
    return None


def over(fg: tuple[float, float, float, float], bg: tuple[int, int, int]) -> tuple[int, int, int]:
    """Composite a translucent colour onto its background.

    ⚠️ Without this, `--score-2: rgba(255,255,255,.19)` resolves to #FFFFFF and
    measures 18.7:1 against a dark bench — a border that is actually a faint
    grey scoring as pure white. A6 was unmeasurable until this existed, and the
    first version of this very script reported it PASSING.
    """
    r, g, b, a = fg
    return tuple(round(c * a + d * (1 - a)) for c, d in zip((r, g, b), bg))  # type: ignore[return-value]


def lstar(c: tuple[int, int, int]) -> float:
    """CIELAB L*. The right instrument for "are these two surfaces tellable
    apart"; WCAG contrast ratio is not — see SURFACE_MIN below."""
    y = lum(c)
    t = y ** (1 / 3) if y > 0.008856 else 7.787 * y + 16 / 116
    return 116 * t - 16


def lum(c: tuple[int, int, int]) -> float:
    def ch(v: float) -> float:
        v /= 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def main() -> int:
    css = CSS.read_text(encoding="utf-8")
    states = blocks(css)
    failures: list[str] = []
    unresolved: list[str] = []

    for state in ("collapsed", "emitting"):
        tokens = states[state]
        print(f"\n=== {state} ===")
        print(f"{'pair':30} {'fg':9} {'bg':9} {'ratio':>7}  {'need':>5}  criterion")
        for label, fg_t, bg_t, target, why in PAIRS:
            fg, bg = rgb(fg_t, tokens), rgb(bg_t, tokens)
            if fg is None or bg is None:
                unresolved.append(f"{state}: {label} ({fg_t} / {bg_t})")
                continue
            if len(bg) == 4:
                unresolved.append(f"{state}: {label} — a translucent BACKGROUND has no defined ground")
                continue
            if len(fg) == 4:
                fg = over(fg, bg)          # a faint border is its composite, not its source colour
            surface = why.endswith("surface")
            if surface:
                value = abs(lstar(fg) - lstar(bg))
                need, unit = SURFACE_MIN, "ΔL*"
            else:
                value = ratio(fg, bg)
                need, unit = target, ":1"
            ok = value >= need
            if not ok:
                failures.append(f"{state}: {label} = {value:.2f}{unit}, needs {need:.2f}{unit} ({why})")
            mark = "  " if ok else " ✗"
            print(f"{label:30} {'#%02X%02X%02X' % fg:9} {'#%02X%02X%02X' % bg:9} "
                  f"{value:6.2f}{unit:3} {need:5.2f}{mark}  {why}")

        # --- the matte's selected ring, on every ground it can sit on --------
        print(f"\n{'matte ring vs ground':30} {'best tone':9} {'ground':9} {'ratio':>7}  {'need':>5}")
        for g in RING_GROUNDS:
            bg = rgb(g, tokens)
            if bg is None or len(bg) == 4:
                unresolved.append(f"{state}: ring ground {g}")
                continue
            tones = [(t, rgb(t, tokens)) for t in ("--ring-inner", "--ring-outer")]
            scored = [(ratio(c, bg), t, c) for t, c in tones if c is not None and len(c) == 3]
            if not scored:
                unresolved.append(f"{state}: ring tones missing")
                continue
            r, tone, c = max(scored)
            ok = r >= RING_MIN
            if not ok:
                failures.append(f"{state}: matte ring on {g} = {r:.2f}:1 at best, needs {RING_MIN}:1")
            print(f"{'ring on ' + g:30} {'#%02X%02X%02X' % c:9} {'#%02X%02X%02X' % bg:9} "
                  f"{r:6.2f}:1  {RING_MIN:5.2f}{'  ' if ok else ' ✗'}  {tone}")

    if unresolved:
        print("\nUNRESOLVED (token missing from the stylesheet):")
        for u in unresolved:
            print("  " + u)
    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for f in failures:
            print("  " + f)
    else:
        print("\nAll pairs meet their target in both lighting states.")

    if "--check" in sys.argv:
        return 1 if (failures or unresolved) else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

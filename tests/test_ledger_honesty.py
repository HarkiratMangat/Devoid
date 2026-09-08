"""The ledger must measure, or say it did not.

Written 2026-09-07 20:56 EDT. Every case here fails against the ledger as it was: the old
code took the source's TOP-LEFT PIXEL as the background colour and split
artwork from it at a hardcoded 20, so a file whose artwork touches the corner
was classified against the artwork's own colour.
"""
from __future__ import annotations

import json

import numpy as np
import pytest
from PIL import Image

from server.render import _ledger

BG = (18, 22, 40)      # the real background
ART = (240, 80, 60)    # the artwork, and it TOUCHES THE CORNER


def _pair(tmp_path):
    """A source whose corner is ARTWORK, and its keyed output."""
    src = np.zeros((40, 40, 4), dtype=np.uint8)
    src[..., :3] = BG
    src[..., 3] = 255
    src[0:12, 0:12, :3] = ART          # ⚠️ artwork in the top-left corner
    s = tmp_path / "src.png"
    Image.fromarray(src, "RGBA").save(s)

    out = src.copy()
    bg_mask = np.abs(out[..., :3].astype(int) - np.array(BG)).max(axis=2) <= 5
    out[bg_mask, 3] = 0                # the background is keyed out
    o = tmp_path / "out.png"
    Image.fromarray(out, "RGBA").save(o)
    return s, o


def _doc(tmp_path, bg=BG, tolerance=15):
    p = tmp_path / "analysis.json"
    p.write_text(json.dumps({"tolerance": tolerance, "analysis": {"detected_bg_color": list(bg)}}))
    return str(p)


def test_with_an_analysis_the_corner_artwork_is_not_mistaken_for_background(tmp_path):
    src, out = _pair(tmp_path)
    row = _ledger(src, out, _doc(tmp_path))
    assert row["measured"] is True
    # 40x40 = 1600 px; 12x12 = 144 are artwork and all of them survive.
    assert row["total"] == 144, row
    assert row["bg"] == 1600 - 144, row
    # nothing that was artwork was removed
    assert row["art"] == 0, row


def test_without_an_analysis_it_says_so_AND_gets_it_wrong(tmp_path):
    """🔴 THE FALSIFIER. The estimate reads the corner -- which is ARTWORK here --
    so it calls the real background 'artwork' and reports damage that did not
    happen. This is what the app printed in 44px type with no qualification."""
    src, out = _pair(tmp_path)
    row = _ledger(src, out, None)
    assert row["measured"] is False, "an unmeasured ledger must say so"
    # the corner heuristic classifies the true background AS artwork, so every
    # removed pixel is counted as artwork lost:
    assert row["art"] == 1600 - 144, row
    assert row["bg"] == 0, row


def test_the_two_paths_disagree_which_is_the_whole_point(tmp_path):
    src, out = _pair(tmp_path)
    good = _ledger(src, out, _doc(tmp_path))
    poor = _ledger(src, out, None)
    assert good["art"] != poor["art"], "if these agreed the flag would be decoration"


def test_removed_means_alpha_zero_not_a_threshold(tmp_path):
    """A half-transparent antialiased edge SURVIVED. The old code's alpha > 200
    called it gone."""
    src = np.zeros((10, 10, 4), dtype=np.uint8)
    src[..., :3] = BG
    src[..., 3] = 255
    src[5, 5, :3] = ART
    s = tmp_path / "s.png"; Image.fromarray(src, "RGBA").save(s)
    out = src.copy()
    out[..., 3] = 0
    out[5, 5, 3] = 128                 # the ramp: half opaque, and NOT removed
    o = tmp_path / "o.png"; Image.fromarray(out, "RGBA").save(o)
    row = _ledger(s, o, _doc(tmp_path))
    assert row["total"] == 1, "alpha 128 must count as surviving"
    assert row["bg"] == 99, row


def test_a_broken_analysis_document_falls_back_rather_than_failing(tmp_path):
    src, out = _pair(tmp_path)
    bad = tmp_path / "bad.json"; bad.write_text("{not json")
    row = _ledger(src, out, str(bad))
    assert row is not None and row["measured"] is False


def test_frame_index_is_reported_so_the_ui_can_say_which_frame(tmp_path):
    src, out = _pair(tmp_path)
    row = _ledger(src, out, _doc(tmp_path))
    assert row["frame_index"] == 0

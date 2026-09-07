"""The validation boundary — PLAN.md 1.1 says test the boundary, not every consumer."""
from __future__ import annotations

import copy

import pytest

from server.validate import (
    RecommendResult,
    RecommendShapeError,
    parse_recommend,
)


def test_parses_a_real_captured_payload(recommend_sample):
    r = parse_recommend(recommend_sample)
    assert isinstance(r, RecommendResult)
    assert r.recommended_format == "gif-ok"
    assert r.not_applicable_reason is None
    assert r.refused is False

    # megaphone's measured coin-flip: region 2, outline 002864, 102/144 = 0.708.
    assert len(r.ambiguous_protection) == 1
    a = r.ambiguous_protection[0]
    assert (a.region_id, a.outline_color) == (2, "002864")
    assert (a.frames_enclosed, a.frames_checked) == (102, 144)
    assert a.enclosure_ratio == pytest.approx(0.708)
    assert a.bbox_xyxy == (94, 56, 164, 145)

    assert r.nameable_fade is None
    assert r.needs_you is True
    assert r.state == "needs-you"
    assert r.outline_colors == ("002864",)
    # ⚠️ The index()+1 bug from the CLI ancestor: the flag tokens come out of the
    # suggested command through one splitter, here, not by slicing at call sites.
    assert "--protect-outline-color" in r.suggested_flag_tokens
    assert r.evidence and all(isinstance(e, str) for e in r.evidence)


def test_questions_matches_the_contract_shape(recommend_sample):
    """⚠️ EQUALITY HERE IS THE ASSERTION, and it stays (2026-09-07 10:29 EDT).

    Its name is its contract: this pins the questions payload frozen in
    ``docs/API-CONTRACT.md``. An exact-key-set assertion is a trap in a FLOW
    test, where the shape is incidental — see tests/test_api.py, relaxed for
    exactly that reason — and is the point in a CONTRACT test.
    """
    q = parse_recommend(recommend_sample).questions()
    assert set(q) == {
        "ambiguous_protection",
        "nameable_fade",
        "recommended_format",
        "not_applicable_reason",
        "alternative_command",
        "suggested_flag_tokens",
    }
    assert set(q["ambiguous_protection"][0]) == {
        "region_id",
        "outline_color",
        "bbox_xyxy",
        "frames_enclosed",
        "frames_checked",
        "enclosure_ratio",
    }


def test_accepts_the_cli_list_wrapping(recommend_sample):
    """The CLI emits ``[{...}]`` for a multi-path invocation. Normalised in ONE
    place instead of sniffed at four call sites (HANDOFF.md)."""
    assert parse_recommend([recommend_sample]).recommended_format == "gif-ok"
    assert parse_recommend([{"recommendation": recommend_sample}]).recommended_format == "gif-ok"


def _mutate(sample, **changes):
    out = copy.deepcopy(sample)
    out.update(changes)
    return out


def test_missing_field_raises_clearly(recommend_sample):
    broken = copy.deepcopy(recommend_sample)
    del broken["ambiguous_protection"]
    with pytest.raises(RecommendShapeError, match="ambiguous_protection is missing"):
        parse_recommend(broken)


def test_degenerate_bbox_is_rejected(recommend_sample):
    """The ancestor's fallback silently produced a zero-area rectangle and every
    consumer drew, measured and logged it without complaint."""
    broken = copy.deepcopy(recommend_sample)
    broken["ambiguous_protection"][0]["bbox_xyxy"] = [0, 0, 0, 0]
    with pytest.raises(RecommendShapeError, match="degenerate"):
        parse_recommend(broken)


def test_frames_enclosed_beyond_frames_checked_is_rejected(recommend_sample):
    broken = copy.deepcopy(recommend_sample)
    broken["ambiguous_protection"][0]["frames_enclosed"] = 999
    with pytest.raises(RecommendShapeError, match="frames_enclosed"):
        parse_recommend(broken)


def test_refusal_with_a_runnable_command_is_rejected(recommend_sample):
    """A refusal with an escape hatch stapled to it — the engine nulls both, and
    if that regresses it must regress here, not in the UI."""
    broken = _mutate(recommend_sample, not_applicable_reason="background is not stable")
    with pytest.raises(RecommendShapeError, match="escape hatch"):
        parse_recommend(broken)


def test_a_genuine_refusal_parses(recommend_sample):
    ok = _mutate(
        recommend_sample,
        not_applicable_reason="background is not stable",
        suggested_command=None,
        alternative_command=None,
    )
    r = parse_recommend(ok)
    assert r.refused is True
    assert r.state == "refused"
    assert r.suggested_flag_tokens == ()


def test_unsplittable_suggested_command_is_rejected(recommend_sample):
    """PLAN.md's edge case: ``--auto`` shlex.splits this shell STRING, and a
    Finder drag will one day supply a filename with a quote in it."""
    broken = _mutate(recommend_sample, suggested_command="python3 script 'unclosed.gif out.gif")
    with pytest.raises(RecommendShapeError, match="shell-splittable"):
        parse_recommend(broken)


def test_bad_outline_colour_is_rejected(recommend_sample):
    broken = copy.deepcopy(recommend_sample)
    broken["ambiguous_protection"][0]["outline_color"] = "not-a-colour"
    with pytest.raises(RecommendShapeError, match="six hex digits"):
        parse_recommend(broken)


def test_fade_dict_keys_are_asserted(recommend_sample):
    """Direct subscripts on the fade dict were one of the four inherited bugs."""
    broken = _mutate(recommend_sample, nameable_fade={"color": "ffffff"})
    with pytest.raises(RecommendShapeError, match="nameable_fade.faint_px is missing"):
        parse_recommend(broken)
    ok = _mutate(
        recommend_sample,
        nameable_fade={"color": "FFFFFF", "faint_px": 12, "frame_index": 3},
    )
    fade = parse_recommend(ok).nameable_fade
    assert (fade.color, fade.faint_px, fade.frame_index) == ("ffffff", 12, 3)


def test_wholly_wrong_input_raises_rather_than_crashing_downstream():
    with pytest.raises(RecommendShapeError, match="must be an object"):
        parse_recommend("not json at all")
    with pytest.raises(RecommendShapeError):
        parse_recommend({})

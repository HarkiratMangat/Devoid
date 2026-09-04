"""PLAN.md 1.5 (concurrency) and 1.6 (generated flag metadata)."""
from __future__ import annotations

import os

import pytest

from server import cli, concurrency, flags


# --------------------------------------------------------------------------
# 1.5
# --------------------------------------------------------------------------


def test_default_jobs_is_bounded_and_explains_itself():
    jobs, why = concurrency.default_jobs(explain=True)
    assert concurrency.MIN_JOBS <= jobs <= (os.cpu_count() or 1)
    assert isinstance(why, str) and why


def test_source_is_named_never_silently_os_cpu_count():
    d = concurrency.describe()
    assert d["source"] in ("harness", "vendored")
    assert d["jobs"] == concurrency.default_jobs()


def test_the_vendored_copy_agrees_with_the_harness():
    """⚠️ The fallback exists because ``scripts/harness/`` is tracked but NOT
    packaged, so the synced claude.ai bundle has no ``machine.py``. If the copy
    drifts from the original, the bundle silently gets a different worker count."""
    if concurrency.SOURCE != "harness":
        pytest.skip("harness machine.py unavailable; nothing to compare against")
    harness = concurrency._machine_module()
    assert concurrency._vendored_performance_cores() == harness.performance_cores()
    assert concurrency._vendored_default_jobs() == harness.default_jobs()


def test_vendored_path_still_produces_a_sane_number(monkeypatch):
    monkeypatch.setattr(concurrency, "SOURCE", "vendored")
    monkeypatch.setattr(concurrency, "_machine", None)
    monkeypatch.setattr(concurrency, "_load_harness_machine", lambda: None)
    jobs = concurrency.default_jobs()
    assert concurrency.MIN_JOBS <= jobs <= (os.cpu_count() or 1)
    assert concurrency.SOURCE == "vendored"


# --------------------------------------------------------------------------
# 1.6
# --------------------------------------------------------------------------


def test_flags_come_from_build_parser_not_a_transcription():
    payload = flags.flags()
    rows = payload["flags"]
    # The engine has 64 add_argument() calls plus the positional; --help is dropped.
    assert len(rows) >= 60
    by_name = {r["name"]: r for r in rows}
    assert "--auto" in by_name and by_name["--auto"]["type"] == "bool"
    assert by_name["--tolerance"]["type"] == "int"
    assert by_name["--tolerance"]["default"] == 15
    for row in rows:
        assert set(row) >= {"name", "dest", "type", "choices", "default", "help", "group"}


def test_every_flag_devoid_builds_actually_exists_on_this_engine():
    """⚠️ The whole point of 1.6: a hand-transcribed list drifts silently. Every
    flag name ``server/cli.py`` can emit is checked against the real parser."""
    names = {r["name"] for r in flags.flags()["flags"]}
    for flag in (
        "--auto",
        "--assume-protect",
        "--assume-remove",
        "--target-kb",
        "--min-dimension",
        "--protect-region",
        "--remove-region",
        "--remove-region-track",
        "--unprotect-region",
        "--translucent-region",
        "--fade-protect-region",
    ):
        assert flag in names, f"{flag} is not on this engine"


# --------------------------------------------------------------------------
# Tri-state, enforced server-side (PLAN.md 2.6)
# --------------------------------------------------------------------------


def test_no_overrides_means_auto_alone():
    assert cli.build_argv({}) == ["--auto"]


def test_a_value_equal_to_the_default_is_not_sent():
    """⚠️ A UI that sends all 64 flags makes ``--auto`` a no-op and the tool stops
    thinking. Left-at-default must be indistinguishable from absent."""
    assert cli.build_argv({"tolerance": 15}) == ["--auto"]
    assert cli.build_argv({"tolerance": 22}) == ["--auto", "--tolerance", "22"]


def test_none_means_left_at_auto():
    assert cli.build_argv({"tolerance": None}) == ["--auto"]


def test_boolean_flags_emit_no_value():
    assert cli.build_argv({"pixel_art": True}) == ["--auto", "--pixel-art"]
    assert cli.build_argv({"pixel_art": False}) == ["--auto"]


def test_unknown_flag_is_refused_not_shelled_out():
    with pytest.raises(cli.UnknownFlag):
        cli.build_argv({"--not-a-real-flag": 1})


def test_answers_are_keyed_per_colour():
    argv = cli.answer_argv({"002864": "protect", "f0c850": "remove"})
    assert argv == ["--assume-protect", "002864", "--assume-remove", "f0c850"]


def test_region_argv_uses_the_six_drawn_flags():
    argv = cli.region_argv([{"type": "remove-track", "bbox_xyxy": [1, 2, 3, 4]}])
    assert argv == ["--remove-region-track", "1,2,3,4"]
    with pytest.raises(cli.UnknownFlag):
        cli.region_argv([{"type": "invent", "bbox_xyxy": [1, 2, 3, 4]}])


def test_goal_never_invents_a_size_target():
    """PRODUCT.md: never infer a size target."""
    assert cli.goal_argv({}) == []
    assert cli.goal_argv({"format": "webp"}) == []
    assert cli.goal_argv({"target_kb": 256}) == ["--target-kb", "256"]

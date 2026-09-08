"""In-process analysis — PLAN.md 1.2's four claims, each as a falsifier."""
from __future__ import annotations

import json
import sys

import pytest

from server import engine


def test_resolution_names_its_source():
    path, source = engine.resolved()
    assert path.is_file()
    assert source in ("env", "config", "fallback")


def test_env_var_pointing_at_nothing_fails_loudly(monkeypatch):
    """A silent fallback lets the app and the live skill disagree invisibly."""
    monkeypatch.setenv("DEVOID_SKILL", "/nonexistent/engine.py")
    with pytest.raises(engine.EngineUnavailable, match="not a file"):
        engine.resolve_skill()


def test_status_matches_the_contract():
    s = engine.status()
    assert set(s) == {
        "available",
        "missing",
        "avif",
        "gifsicle",
        "pngquant",
        "webpmux",
        "engine_version",
        # additive, 2026-09-07 21:35 EDT -- a release number, where engine_version is
        # a content hash. docs/API-CONTRACT.md carries why they are both here.
        "engine_semver",
        "skill_path",
    }
    assert isinstance(s["missing"], list)
    assert s["engine_version"].startswith("sha256:")


def test_engine_version_is_stable_within_a_process():
    assert engine.engine_version() == engine.engine_version()


def test_import_does_not_exit_and_exposes_the_two_entry_points():
    mod = engine.load_skill()
    assert callable(mod.analyze) and callable(mod.recommend)
    # A proper __main__ guard: importing must not have run main().
    assert mod.__name__ == "devoid_skill_engine"


def test_two_analyses_are_independent_and_reproducible(fast_asset, other_asset, capsys):
    """PLAN.md 1.2: silent on stdout/stderr, no sys.exit, no mutation of the
    skill module's own globals across two calls in one process.

    ⚠️ The falsifier that can actually fail: analyse A, then B, then A again. If
    anything is carried between calls, the third result differs from the first.
    """
    first = engine.analyze(fast_asset)
    second = engine.analyze(other_asset)
    third = engine.analyze(fast_asset)

    a = json.dumps(first, sort_keys=True, default=str)
    b = json.dumps(second, sort_keys=True, default=str)
    c = json.dumps(third, sort_keys=True, default=str)

    assert a == c, "analysing a second asset in between changed the first asset's result"
    assert a != b, "two different corpus assets produced identical reports — not a real check"

    # Silence: neither call leaked to the server's own streams.
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""

    assert first["n_frames_total"] == 50
    assert second["n_frames_total"] == 96


def test_recommend_round_trips_through_the_boundary(fast_asset):
    from server.validate import parse_recommend

    r = parse_recommend(engine.recommend(fast_asset))
    assert r.recommended_format in ("gif-ok", "webp-or-apng", "webp-or-avif")
    assert r.state in ("ready", "needs-you", "refused")


def test_module_is_registered_under_a_private_name():
    engine.load_skill()
    assert "devoid_skill_engine" in sys.modules
    # It must not have squatted on a plausible public name.
    assert "remove_gif_background" not in sys.modules

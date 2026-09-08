"""The packaged-app engine override -- devoid.config.json under
DEVOID_DATA_DIR, checked before REPO_ROOT's own copy and before the bundled
fallback. [P1 . S] in devoid-deferred-list.md: a packaged app could not be
pointed at a different engine at all, because REPO_ROOT is inside the .app
bundle once packaged, and nothing can write there."""
from __future__ import annotations

import json

import pytest

from server import engine


def test_data_dir_config_wins_over_the_bundled_fallback(tmp_path, monkeypatch):
    fake_skill = tmp_path / "custom_engine.py"
    fake_skill.write_text("# stands in for a real engine checkout\n")
    (tmp_path / "devoid.config.json").write_text(json.dumps({"skill_path": str(fake_skill)}))

    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.setenv("DEVOID_DATA_DIR", str(tmp_path))

    path, source = engine.resolve_skill()
    assert path == fake_skill
    assert source == "config"


def test_data_dir_config_with_no_skill_path_falls_through_cleanly(tmp_path, monkeypatch):
    (tmp_path / "devoid.config.json").write_text(json.dumps({}))
    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.setenv("DEVOID_DATA_DIR", str(tmp_path))

    # This checkout carries no devoid.config.json at REPO_ROOT, so an empty
    # user config must fall all the way to fallback/bundled, not raise.
    path, source = engine.resolve_skill()
    assert path.is_file()
    assert source in ("fallback", "bundled")


def test_data_dir_config_with_bad_json_fails_loudly_not_silently(tmp_path, monkeypatch):
    (tmp_path / "devoid.config.json").write_text("{not json")
    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.setenv("DEVOID_DATA_DIR", str(tmp_path))

    with pytest.raises(engine.EngineUnavailable, match="not readable JSON"):
        engine.resolve_skill()


def test_data_dir_config_pointing_at_nothing_fails_loudly(tmp_path, monkeypatch):
    (tmp_path / "devoid.config.json").write_text(
        json.dumps({"skill_path": str(tmp_path / "nope.py")})
    )
    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.setenv("DEVOID_DATA_DIR", str(tmp_path))

    with pytest.raises(engine.EngineUnavailable, match="which is not a file"):
        engine.resolve_skill()


def test_unset_data_dir_is_unchanged_behaviour(monkeypatch):
    """The new tier must be a no-op for every session that never sets it --
    which is every unpackaged checkout today."""
    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.delenv("DEVOID_DATA_DIR", raising=False)
    path, source = engine.resolve_skill()
    assert path.is_file()
    assert source in ("config", "fallback", "bundled")

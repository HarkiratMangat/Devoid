"""The bundled engine, and the version the update check compares.

Written 2026-09-07 21:33 EDT. The falsifier that matters is
``test_a_content_hash_is_not_a_version``: the shipped update check read
``engine_version`` -- ``sha256:0ffc8a71b8b5`` -- and compared it to ``v6.4.1``,
which parses to 0.0.0, so it reported **behind** every time and offered an
update that was already installed.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from server import engine


def test_the_bundled_copy_is_the_LAST_candidate(tmp_path, monkeypatch):
    """A checkout must always beat the copy inside the app, or a developer
    testing an engine change would have to rebuild Devoid to see it."""
    real = tmp_path / "scripts" / "remove_gif_background.py"
    real.parent.mkdir(parents=True)
    real.write_text("# a checkout\n")
    bundled = tmp_path / "bundled" / "remove_gif_background.py"
    bundled.parent.mkdir(parents=True)
    bundled.write_text("# the bundled copy\n")

    monkeypatch.setattr(engine, "BUNDLED_SKILL", bundled)
    monkeypatch.setenv("DEVOID_SKILL", os.fspath(real))
    assert engine.resolve_skill() == (real, "env")

    monkeypatch.delenv("DEVOID_SKILL")
    monkeypatch.setattr(engine, "FALLBACK_SKILL", Path(tmp_path / "nope.py"))
    monkeypatch.setattr(engine, "REPO_ROOT", tmp_path / "no-config-here")
    path, source = engine.resolve_skill()
    assert (path, source) == (bundled, "bundled"), "the bundled copy is the last resort"


def test_no_engine_anywhere_still_raises_and_names_the_bundle(tmp_path, monkeypatch):
    monkeypatch.delenv("DEVOID_SKILL", raising=False)
    monkeypatch.setattr(engine, "FALLBACK_SKILL", tmp_path / "nope.py")
    monkeypatch.setattr(engine, "BUNDLED_SKILL", tmp_path / "also-nope.py")
    monkeypatch.setattr(engine, "REPO_ROOT", tmp_path / "empty")
    with pytest.raises(engine.EngineUnavailable) as exc:
        engine.resolve_skill()
    assert "bundled" in str(exc.value), "the message must name every place it looked"


def test_a_content_hash_is_not_a_version():
    """🔴 THE FALSIFIER. This is the value the app actually reports, and the
    value the update check was handed."""
    v = engine.engine_version()
    assert v.startswith("sha256:"), v
    parts = v.lstrip("v").split(".")
    assert not parts[0].isdigit(), "a hash that parsed as a number is the bug"


def test_engine_semver_reads_the_repository_tag():
    """The engine resolves to a real checkout here, so this is the true answer
    and it is AHEAD of the newest published release more often than not."""
    v = engine.engine_semver()
    assert v is not None and v.lstrip("v")[0].isdigit(), v
    tag = subprocess.run(
        ["git", "-C", os.fspath(engine.skill_path().parent.parent),
         "describe", "--tags", "--abbrev=0"],
        capture_output=True, text=True).stdout.strip()
    assert v == tag, f"{v} should be the repository's own tag {tag}"


def test_engine_semver_falls_back_to_the_bundled_VERSION(tmp_path, monkeypatch):
    """A packaged app has no .git, so the build writes the tag beside the copy."""
    bundled = tmp_path / "engine" / "remove_gif_background.py"
    bundled.parent.mkdir(parents=True)
    bundled.write_text("# bundled\n")
    (tmp_path / "engine" / "VERSION").write_text("v6.4.1\n")

    monkeypatch.setattr(engine, "BUNDLED_VERSION", tmp_path / "engine" / "VERSION")
    monkeypatch.setattr(engine, "_resolved", (bundled, "bundled"))
    assert engine.engine_semver() == "v6.4.1"


def test_a_junk_VERSION_file_is_refused_rather_than_returned(tmp_path, monkeypatch):
    """⚠️ Returning junk would put it straight into compareVersions, which is
    exactly how the content hash became 0.0.0."""
    bundled = tmp_path / "engine" / "remove_gif_background.py"
    bundled.parent.mkdir(parents=True)
    bundled.write_text("# bundled\n")
    (tmp_path / "engine" / "VERSION").write_text("not-a-version\n")
    monkeypatch.setattr(engine, "BUNDLED_VERSION", tmp_path / "engine" / "VERSION")
    monkeypatch.setattr(engine, "_resolved", (bundled, "bundled"))
    assert engine.engine_semver() is None


def test_status_carries_both_the_hash_and_the_semver():
    st = engine.status()
    assert st["engine_version"].startswith("sha256:")
    assert st["engine_semver"] is None or st["engine_semver"].lstrip("v")[0].isdigit()

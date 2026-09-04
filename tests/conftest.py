"""Shared fixtures, and sys.path set up so `import server` resolves to THIS
checkout rather than whatever the editable install happens to point at (a git
worktree makes those two different directories, and the wrong one passes
silently).

⚠️ **Real corpus assets, always** (PLAN.md gate 3). Never art drawn for the
occasion — putting real art in is what found the rubylith-over-red bug that drawn
icons had hidden.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = str(Path(__file__).resolve().parent.parent)
if ROOT in sys.path:
    sys.path.remove(ROOT)
sys.path.insert(0, ROOT)


REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS = REPO_ROOT / "web" / "assets"
FIXTURES = Path(__file__).resolve().parent / "fixtures"

#: 50 frames at 260x260 — the corpus's cheapest asset, so a test that needs a real
#: engine round trip costs ~1.5 s rather than ~20 s.
FAST_ASSET = ASSETS / "secure.src.gif"
#: 96 frames. A *different* asset, for proving two calls do not contaminate.
OTHER_ASSET = ASSETS / "paper-plane.src.gif"
#: 144 frames, and the one asset in the corpus whose --recommend returns an
#: ambiguous_protection entry (region 2, outline 002864, ratio 0.708).
AMBIGUOUS_ASSET = ASSETS / "megaphone.src.gif"


@pytest.fixture(scope="session")
def fast_asset() -> Path:
    assert FAST_ASSET.is_file(), FAST_ASSET
    return FAST_ASSET


@pytest.fixture(scope="session")
def other_asset() -> Path:
    assert OTHER_ASSET.is_file(), OTHER_ASSET
    return OTHER_ASSET


@pytest.fixture(scope="session")
def recommend_sample() -> dict:
    """A REAL captured ``recommend()`` payload — megaphone.src.gif, 2026-09-04.

    Captured with the engine itself rather than hand-written, because a
    hand-written sample proves only that the validator agrees with its author.
    """
    path = FIXTURES / "recommend_megaphone.json"
    assert path.is_file(), f"missing fixture {path}; regenerate with --recommend"
    return json.loads(path.read_text())


@pytest.fixture()
def isolated_logs(tmp_path, monkeypatch):
    """Point both append-only logs at a tmp dir.

    A test must never append to the tracked ``jobs.jsonl`` or
    ``labels/protection.jsonl`` — the label log is evidence, and salting it with
    test rows would quietly corrupt the corpus it exists to build.
    """
    from server import jobs, labels

    monkeypatch.setattr(labels, "LABELS_PATH", tmp_path / "labels" / "protection.jsonl")
    monkeypatch.setattr(jobs, "JOBS_PATH", tmp_path / "jobs.jsonl")
    return tmp_path

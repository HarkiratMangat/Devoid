"""Subprocess render, cancel, atomic placement and the job journal — PLAN.md 1.3/1.4."""
from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path

import pytest

from server import appendlog, labels, render


def test_never_overwrites_and_escalates(tmp_path):
    src = tmp_path / "megaphone.gif"
    src.write_bytes(b"x")
    first = render.next_output_path(src, "gif")
    assert first.name == "megaphone_transparent.gif"
    first.write_bytes(b"x")
    second = render.next_output_path(src, "gif")
    assert second.name == "megaphone_transparent_v2.gif"
    second.write_bytes(b"x")
    assert render.next_output_path(src, "gif").name == "megaphone_transparent_v3.gif"


def test_jsonl_append_is_line_atomic_and_never_read_modify_write(tmp_path):
    """Basic single-process proof; the real concurrency claim (two processes
    appending at once cannot interleave) is proven harder in test_jobs.py and
    test_labels.py, which this repo's O_APPEND single-write appendlog module
    backs for both logs."""
    path = tmp_path / "log.jsonl"
    for i in range(50):
        appendlog.append_line(path, {"i": i, "note": "two windows, one log"})
    lines = path.read_text().splitlines()
    assert len(lines) == 50
    assert [json.loads(l)["i"] for l in lines] == list(range(50))
    assert path.read_bytes().endswith(b"\n")


def test_label_schema_is_the_contract(tmp_path, monkeypatch):
    monkeypatch.setattr(labels, "LABELS_PATH", tmp_path / "labels" / "protection.jsonl")
    row = labels.record_verdict(
        asset_id="abc",
        outline_color="002864",
        enclosure_ratio=0.708,
        frames_enclosed=102,
        frames_checked=144,
        bbox_xyxy=[94, 56, 164, 145],
        verdict="protect",
    )
    assert tuple(row) == labels.FIELDS
    with pytest.raises(ValueError):
        labels.record_verdict(
            asset_id="abc",
            outline_color="002864",
            enclosure_ratio=0.7,
            frames_enclosed=1,
            frames_checked=2,
            bbox_xyxy=[0, 0, 1, 1],
            verdict="maybe",
        )


def test_render_and_journal(tmp_path, isolated_logs, fast_asset):
    """A real render of a real corpus asset, end to end through the subprocess."""
    src = tmp_path / fast_asset.name
    shutil.copyfile(fast_asset, src)
    job = render.start("asset1", str(src), {"overrides": {}, "goal": {"format": "webp"}})
    assert job._settled.wait(timeout=600), "render did not settle"
    assert job.state == "done", job.error
    out = Path(job.output_path)
    assert out.is_file() and out.name.endswith("_transparent.webp")
    # ⚠️ "never report a verification the run did not earn."
    assert job.public()["verify"] == "not-checked"
    assert job.ledger and job.ledger["total"] > 0

    rows = render.read_history(10)
    assert rows and rows[0]["verdict"] == "done"
    assert set(rows[0]) >= {
        "ts",
        "input_path",
        "settings",
        "output_path",
        "verdict",
        "engine_version",
        "state",
    }


def _pgid_alive(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def test_cancel_kills_the_whole_process_group(tmp_path, isolated_logs):
    """⚠️ Cancel must not orphan the skill's own ``--target-kb`` worker pool.

    Uses the corpus's LARGEST asset so there is a real long-running render to
    interrupt, and asserts on the process GROUP, not the pid — killing only the
    pid is exactly the bug this guards.
    """
    heavy = Path(__file__).resolve().parent.parent / "web" / "assets" / "rocket.src.gif"
    src = tmp_path / heavy.name
    shutil.copyfile(heavy, src)
    job = render.start(
        "asset2", str(src), {"overrides": {}, "goal": {"format": "webp", "target_kb": 128}}
    )

    deadline = time.monotonic() + 60
    while job._proc is None and time.monotonic() < deadline:
        time.sleep(0.05)
    assert job._proc is not None, "render never spawned"
    pgid = os.getpgid(job._proc.pid)
    assert pgid != os.getpgid(os.getpid()), "render did not get its own process group"

    render.cancel(job.id)
    assert job.state == "cancelled"
    assert job.output_path is None

    deadline = time.monotonic() + 10
    while _pgid_alive(pgid) and time.monotonic() < deadline:
        time.sleep(0.1)
    assert not _pgid_alive(pgid), "the render's process group survived the cancel"

    # Nothing partial was left beside the source.
    assert not list(src.parent.glob("*_transparent*"))
    assert render.read_history(1)[0]["verdict"] == "cancelled"


def test_a_bad_override_is_blocked_not_a_crash(tmp_path, isolated_logs, fast_asset):
    job = render.start("asset3", str(fast_asset), {"overrides": {"--nope": 1}})
    assert job._settled.wait(timeout=30)
    assert job.state == "blocked"
    assert "nope" in (job.error or "")

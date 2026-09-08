"""The journal must record a job that used the analysis handoff.

Written 2026-09-08 00:14 EDT. `server/app.py` puts `analysis_json` into the render body;
`server/jobs.py`'s SETTINGS_KEYS whitelist does not list it; `validate()`
therefore raised inside the render worker thread and **the job was never
written to jobs.jsonl**. It surfaced as a pytest WARNING beside `107 passed`.
"""
from __future__ import annotations

import json

import pytest

from server import jobs as jobs_log


def _row(settings):
    return {"input_path": "/tmp/a.gif", "settings": settings,
             "output_path": "/tmp/a_transparent.gif", "state": "done",
             "verdict": "done",
             "engine_version": "sha256:deadbeef"}


def test_the_whitelist_still_rejects_analysis_json(tmp_path):
    """🔴 THE FALSIFIER, and it must keep failing. If this ever passes, the fix
    was moved into the whitelist instead of the caller and a dead temp path is
    now being written into a permanent log."""
    with pytest.raises(ValueError, match="analysis_json"):
        jobs_log.validate(_row({"overrides": {}, "analysis_json": "/tmp/x.json"}))


def test_a_handoff_job_is_journalled_rather_than_dropped(tmp_path):
    """What server/render.py now does: strip it, then append."""
    settings = {"overrides": {}, "regions": [], "goal": {}, "answers": {},
                "analysis_json": "/tmp/per-process/x.json"}
    clean = {k: v for k, v in settings.items() if k != "analysis_json"}
    path = tmp_path / "jobs.jsonl"
    jobs_log.append_job(_row(clean), path=path)
    rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
    assert len(rows) == 1, "the job must reach the log"
    assert "analysis_json" not in rows[0]["settings"], "a per-process temp path is not a setting"


def test_render_strips_it_at_the_call_site(tmp_path, monkeypatch):
    """The real path, not a re-implementation of it."""
    from server import render as render_mod
    seen = {}
    monkeypatch.setattr(render_mod.jobs_log, "append_job", lambda row, **kw: seen.update(row))
    job = render_mod.Job(id="j1", asset_id="a1", input_path="/tmp/a.gif",
                         settings={"overrides": {}, "analysis_json": "/tmp/x.json"})
    job.state = "done"
    job.output_path = "/tmp/a_transparent.gif"
    render_mod._journal(job)
    assert seen, "_journal wrote nothing"
    assert "analysis_json" not in seen["settings"]
    assert "overrides" in seen["settings"], "the real settings must survive the strip"

"""Subprocess rendering, with a cancel that actually kills — PLAN.md 1.3/1.4.

Long work runs in its OWN process so a crash inside scipy costs one job, not the
app. **Cancel is part of this task, not a later polish**: a two-minute render with
no way out is the single most hostile thing this app could ship.

⚠️ NESTED CONCURRENCY. The skill's own ``--target-kb`` fit probe spawns a worker
pool inside the render process. A plain ``Popen.kill()`` reaps the parent and
orphans that pool (PLAN.md edge-case table). Every job is therefore started with
``start_new_session=True`` and cancelled with ``killpg`` on the whole group —
SIGTERM, a grace period, then SIGKILL.

⚠️ NEVER OVERWRITE (``PRODUCT.md``). The render writes to a temp path and is moved
into place only on success, escalating ``_v2``/``_v3`` if the destination exists.
A crashed job therefore leaves no partial file for the next run to skip past by
escalating, which is how garbage quietly accumulates (1.4).

⚠️ ``jobs.jsonl`` itself is written and read through ``server/jobs.py`` (Stage 5's
single writer for that log) — this module builds the row and hands it over.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from . import cli, engine, jobs as jobs_log
from .appendlog import utc_now

log = logging.getLogger("devoid.render")

REPO_ROOT = Path(__file__).resolve().parent.parent

#: Seconds between SIGTERM and SIGKILL on a cancel.
KILL_GRACE_S = 3.0

TERMINAL_STATES = ("done", "failed", "cancelled", "conflict", "blocked")


def next_output_path(source: Path, ext: str) -> Path:
    """``<stem>_transparent.<ext>``, escalating ``_v2``/``_v3`` rather than overwriting.

    The escalation matches the engine's own delivery convention, so a file written
    by the CLI and one written by Devoid never collide on a different rule.
    """
    ext = ext.lstrip(".")
    candidate = source.with_name(f"{source.stem}_transparent.{ext}")
    n = 1
    while candidate.exists():
        n += 1
        candidate = source.with_name(f"{source.stem}_transparent_v{n}.{ext}")
    return candidate


@dataclass
class Job:
    id: str
    asset_id: str
    input_path: str
    settings: dict
    state: str = "loading"
    progress: float | None = None
    output_path: str | None = None
    error: str | None = None
    #: PRODUCT.md: "never report a verification the run did not earn." A render
    #: that was not asked to verify says "not-checked", which is a first-class
    #: state with the same visual weight as done and failed -- never null, and
    #: never an optimistic guess.
    verify: object = "not-checked"
    ledger: dict | None = None
    engine_version: str = ""
    argv: list[str] = field(default_factory=list)
    _proc: subprocess.Popen | None = field(default=None, repr=False)
    _tmp: str | None = field(default=None, repr=False)
    _cancelled: bool = field(default=False, repr=False)
    _settled: threading.Event = field(default_factory=threading.Event, repr=False)

    def public(self) -> dict:
        """Exactly ``GET /api/jobs/{id}``'s payload."""
        out = {
            "job_id": self.id,
            "asset_id": self.asset_id,
            "state": self.state,
            "progress": self.progress,
            "verify": self.verify,
            "ledger": self.ledger,
            "engine_version": self.engine_version,
        }
        if self.output_path:
            out["output_path"] = self.output_path
        if self.error:
            out["error"] = self.error
        return out


_jobs: dict[str, Job] = {}
_jobs_lock = threading.Lock()


def get(job_id: str) -> Job | None:
    with _jobs_lock:
        return _jobs.get(job_id)


def all_jobs() -> list[Job]:
    with _jobs_lock:
        return list(_jobs.values())


def _journal(job: Job) -> None:
    """One line to ``jobs.jsonl`` when a job settles, via ``server.jobs``'s writer
    (API-CONTRACT.md's schema — the single place that file is appended to)."""
    jobs_log.append_job(
        {
            "ts": utc_now(),
            "input_path": job.input_path,
            "settings": job.settings,
            "output_path": job.output_path,
            "verdict": job.state if job.state in ("done", "failed", "cancelled") else "failed",
            "engine_version": job.engine_version,
            "state": job.state,
        }
    )


def build_render_argv(
    input_path: str,
    tmp_output: str,
    settings: dict,
) -> list[str]:
    """The full argv for one render, tri-state enforced."""
    argv = [sys.executable, os.fspath(engine.skill_path()), input_path, tmp_output]
    argv += cli.build_argv(settings.get("overrides"), auto=True)
    argv += cli.answer_argv(settings.get("answers"))
    argv += cli.region_argv(settings.get("regions"))
    argv += cli.goal_argv(settings.get("goal"))
    return argv


def _run(job: Job) -> None:
    source = Path(job.input_path)
    goal = job.settings.get("goal") or {}
    ext = (goal.get("format") or source.suffix.lstrip(".") or "gif").lstrip(".")
    tmp_dir = tempfile.mkdtemp(prefix="devoid-render-")
    tmp_output = os.path.join(tmp_dir, f"out.{ext}")
    job._tmp = tmp_dir
    try:
        job.argv = build_render_argv(job.input_path, tmp_output, job.settings)
    except Exception as exc:  # noqa: BLE001 -- a bad flag map is `blocked`, not a crash
        job.state, job.error = "blocked", str(exc)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        _journal(job)
        job._settled.set()
        return

    job.state = "running"
    try:
        proc = subprocess.Popen(
            job.argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            # ⚠️ Its own process group, so cancel can kill the skill's inner
            # --target-kb worker pool too instead of orphaning it.
            start_new_session=True,
        )
    except OSError as exc:
        job.state, job.error = "failed", f"could not start the engine: {exc}"
        shutil.rmtree(tmp_dir, ignore_errors=True)
        _journal(job)
        job._settled.set()
        return

    job._proc = proc
    _, stderr = proc.communicate()

    if job._cancelled:
        job.state = "cancelled"
        job.error = None
    elif proc.returncode != 0 or not os.path.isfile(tmp_output):
        job.state = "failed"
        first = next((l for l in (stderr or "").splitlines() if l.strip()), "")
        job.error = first.strip()[:500] or f"engine exited {proc.returncode}"
    else:
        final = next_output_path(source, ext)
        try:
            # Atomic within a filesystem; shutil.move falls back to copy+unlink
            # across devices, which is still all-or-nothing from a reader's view
            # because the destination name did not exist a moment earlier.
            shutil.move(tmp_output, final)
        except OSError as exc:
            job.state, job.error = "failed", f"could not place the output: {exc}"
        else:
            job.state = "done"
            job.output_path = str(final)
            job.ledger = _ledger(source, final)

    shutil.rmtree(tmp_dir, ignore_errors=True)
    job._tmp = None
    _journal(job)
    job._settled.set()


def _ledger(source: Path, output: Path) -> dict | None:
    """``{bg, art, total}`` for the settled output — the same method as
    ``scripts/measure_ledger.py``, on that script's own middle frame.

    ⚠️ ``art`` is a CEILING, not a defect count: it includes the antialiasing ramp
    the keyer is meant to remove. Comparable between settings on one asset, never
    an absolute damage figure. Its 200/20 thresholds are INVENTED and are the
    script's, quoted here rather than re-derived.
    """
    try:
        import numpy as np
        from PIL import Image, ImageSequence
    except Exception:  # noqa: BLE001
        return None

    def mid(path: Path):
        with Image.open(path) as im:
            n = getattr(im, "n_frames", 1)
            for i, f in enumerate(ImageSequence.Iterator(im)):
                if i == n // 2:
                    return np.array(f.convert("RGBA"))
        return None

    try:
        cut = mid(output)
        if cut is None:
            return None
        cut_a = cut[..., 3] > 200
        row = {"bg": int((~cut_a).sum()), "art": None, "total": int(cut_a.sum())}
        src = mid(source)
        if src is not None and src.shape[:2] == cut.shape[:2]:
            corner = src[0, 0, :3]
            src_art = (np.abs(src[..., :3].astype(int) - corner).max(axis=2) > 20)
            row["art"] = int((src_art & ~cut_a).sum())
        return row
    except Exception:  # noqa: BLE001 -- a ledger that cannot be measured is `not checked`
        log.warning("devoid: ledger measurement failed for %s", output, exc_info=True)
        return None


def start(asset_id: str, input_path: str, settings: dict) -> Job:
    job = Job(
        id=uuid.uuid4().hex[:12],
        asset_id=asset_id,
        input_path=input_path,
        settings=settings,
        engine_version=engine.engine_version(),
    )
    with _jobs_lock:
        _jobs[job.id] = job
    threading.Thread(target=_run, args=(job,), daemon=True, name=f"devoid-render-{job.id}").start()
    return job


def cancel(job_id: str) -> Job | None:
    """SIGTERM the whole process group, then SIGKILL after a grace period.

    Killing only the PID leaves the engine's ``--target-kb`` pool running, which is
    exactly the orphan PLAN.md's edge-case table warns about.
    """
    job = get(job_id)
    if job is None:
        return None
    if job.state in TERMINAL_STATES:
        return job
    job._cancelled = True
    proc = job._proc
    if proc is not None and proc.poll() is None:
        try:
            pgid = os.getpgid(proc.pid)
        except OSError:
            pgid = None
        try:
            if pgid is not None:
                os.killpg(pgid, signal.SIGTERM)
            else:
                proc.terminate()
        except OSError:
            pass
        deadline = time.monotonic() + KILL_GRACE_S
        while proc.poll() is None and time.monotonic() < deadline:
            time.sleep(0.05)
        if proc.poll() is None:
            try:
                if pgid is not None:
                    os.killpg(pgid, signal.SIGKILL)
                else:
                    proc.kill()
            except OSError:
                pass
    job._settled.wait(timeout=KILL_GRACE_S + 5)
    if job.state not in TERMINAL_STATES:
        # The thread never got as far as spawning. Settle it here so a cancel is
        # never a state that just stops updating.
        job.state = "cancelled"
        if job._tmp:
            shutil.rmtree(job._tmp, ignore_errors=True)
            job._tmp = None
        _journal(job)
        job._settled.set()
    return job


def read_history(limit: int = 50) -> list[dict]:
    """Most recent ``limit`` lines of ``jobs.jsonl``, newest first — delegates to
    ``server.jobs.history``, the single reader for that log (PLAN.md 5.2: a linear
    scan over a few hundred lines is nothing; no database until one is slow)."""
    return jobs_log.history(limit=limit)

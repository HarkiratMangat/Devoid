"""The in-flight journal -- `.devoid-journal.json`, untracked. PLAN.md 1.4.

A render writes to a temp path and moves it into place on success only. If the
app is quit or killed mid-batch, the temp files and the fact that work was in
flight are otherwise invisible: the NEXT run silently escalates to `_v2` and
quietly accumulates garbage.

So: every started job is journalled, every settled job is removed, and whatever
is still listed at startup is an orphan from a previous run.

SURFACED, NOT RESUMED. PLAN.md 1.4 says a quit mid-batch is "recoverable" -- it
does not say re-run it. Re-running someone's abandoned batch unasked, at ~60s an
asset, is worse than telling them it stopped. `recover_orphans()` reports and
clears; deciding what to do with the report is the caller's.

This file is state, not a log: it IS read-modify-written, which is exactly why it
is not one of the two append-only logs and does not share their writer. The
whole-file rewrite is made safe by an `flock` and an atomic `os.replace`.

Written 2026-09-04 EDT.
"""

from __future__ import annotations

import fcntl
import json
import logging
import os
from pathlib import Path
from typing import Callable, Optional

from server.appendlog import REPO_ROOT, PathLike, utc_now

log = logging.getLogger("devoid.journal")

JOURNAL_PATH: Path = REPO_ROOT / ".devoid-journal.json"


def _read(target: Path) -> list:
    if not target.exists():
        return []
    try:
        parsed = json.loads(target.read_text(encoding="utf-8") or "[]")
    except (ValueError, OSError):
        # A journal torn by a hard kill tells us nothing reliable. Losing it
        # costs a warning; trusting half of it costs a wrong recovery report.
        log.warning("journal at %s is unreadable; treating it as empty", target)
        return []
    if not isinstance(parsed, list):
        return []
    return [entry for entry in parsed if isinstance(entry, dict)]


def _write(target: Path, entries: list) -> None:
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_text(json.dumps(entries, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, target)  # atomic: a reader sees the old file or the new one


def _mutate(path: Optional[PathLike], fn: Callable[[list], object]) -> object:
    target = Path(JOURNAL_PATH if path is None else path)
    target.parent.mkdir(parents=True, exist_ok=True)
    lock = target.with_name(target.name + ".lock")
    with open(lock, "a+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            entries = _read(target)
            result = fn(entries)
            _write(target, entries)
            return result
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def open_job(
    job_id: str,
    input_path: str,
    temp_path: Optional[str] = None,
    path: Optional[PathLike] = None,
) -> dict:
    """Record a job as in flight. Call it before the subprocess starts."""
    if not isinstance(job_id, str) or not job_id:
        raise ValueError("job_id must be a non-empty string")
    entry = {
        "job_id": job_id,
        "input_path": input_path,
        "temp_path": temp_path,
        "started_ts": utc_now(),
        "pid": os.getpid(),
    }

    def apply(entries: list) -> dict:
        entries[:] = [e for e in entries if e.get("job_id") != job_id]
        entries.append(entry)
        return entry

    return _mutate(path, apply)


def close_job(job_id: str, path: Optional[PathLike] = None) -> bool:
    """Drop a job from the journal. Call it however the job settled.

    Returns whether it was there -- closing an unknown job is not an error, only
    unusual, so a cancel racing a completion cannot raise.
    """

    def apply(entries: list) -> bool:
        before = len(entries)
        entries[:] = [e for e in entries if e.get("job_id") != job_id]
        return len(entries) != before

    return bool(_mutate(path, apply))


def in_flight(path: Optional[PathLike] = None) -> list:
    """Everything the journal currently believes is running."""
    return _read(Path(JOURNAL_PATH if path is None else path))


def recover_orphans(path: Optional[PathLike] = None) -> list:
    """Call once at startup. Returns and clears the previous run's in-flight jobs.

    Each entry names its `temp_path`, so the caller can remove a partial file
    rather than leave it for `_v2` escalation to step past. Nothing is resumed.
    """

    def apply(entries: list) -> list:
        orphans = list(entries)
        entries.clear()
        return orphans

    orphans = _mutate(path, apply) or []
    if orphans:
        log.warning(
            "%d job(s) were still in flight when Devoid last exited; not resuming: %s",
            len(orphans),
            ", ".join(
                "{0} ({1})".format(o.get("job_id"), o.get("input_path"))
                for o in orphans
            ),
        )
    return list(orphans)

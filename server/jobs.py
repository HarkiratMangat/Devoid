"""The history log -- `jobs.jsonl`. The ONLY writer of that file.

PLAN.md 5.2. One line per settled job: what went in, the settings that produced
it, what came out, and how it ended. Re-run with a tweak by loading a line back
(the rerun route in docs/API-CONTRACT.md).

Deliberately separate from `labels/protection.jsonl`: that log is evidence about
the ENGINE, this one is a record of YOUR work. They look alike and must not be
merged. No database until a lookup is measurably slow, and if one arrives it is a
SQLite index rebuilt from this log, so the log stays the truth.

No stored thumbnails -- rows point at output files on disk. A missing file is
information: it says that output was deleted.

Written 2026-09-04 EDT.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from server.appendlog import DATA_DIR, PathLike, append_line, read_lines, utc_now

JOBS_PATH: Path = DATA_DIR / "jobs.jsonl"

# The schema, in order, exactly as docs/API-CONTRACT.md freezes it.
FIELDS = (
    "ts",
    "input_path",
    "settings",
    "output_path",
    "verdict",
    "engine_version",
    "state",
)

VERDICTS = ("done", "failed", "cancelled")

# The 11 states (DESIGN.md, restated in docs/API-CONTRACT.md).
STATES = (
    "empty",
    "loading",
    "needs-you",
    "refused",
    "running",
    "cancelled",
    "done",
    "not-checked",
    "failed",
    "conflict",
    "blocked",
)

SETTINGS_KEYS = ("overrides", "regions", "goal", "answers")


def _settings(value: object) -> dict:
    """`{overrides, regions, goal, answers}` -- the exact body the render route
    took, `answers` included so a re-run reproduces the region verdicts too
    (server/render.py's ``cli.answer_argv`` reads it) rather than only the raw
    ``--assume-*`` overrides.

    Kept whole and unexamined beyond its shape: a re-run must reproduce the run,
    and second-guessing the flags here would be a second source of truth.
    """
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise ValueError("settings must be an object")
    unknown = sorted(set(value) - set(SETTINGS_KEYS))
    if unknown:
        raise ValueError("unknown settings keys: " + ", ".join(unknown))

    overrides = value.get("overrides") or {}
    regions = value.get("regions") or []
    goal = value.get("goal") or {}
    answers = value.get("answers") or {}
    if not isinstance(overrides, dict):
        raise ValueError("settings.overrides must be an object")
    if not isinstance(regions, list):
        raise ValueError("settings.regions must be an array")
    if not isinstance(goal, dict):
        raise ValueError("settings.goal must be an object")
    if not isinstance(answers, dict):
        raise ValueError("settings.answers must be an object")
    return {"overrides": overrides, "regions": regions, "goal": goal, "answers": answers}


def validate(row: dict) -> dict:
    """Return the canonical row, or raise ValueError. No I/O."""
    if not isinstance(row, dict):
        raise ValueError("a job row must be a dict")
    unknown = sorted(set(row) - set(FIELDS))
    if unknown:
        raise ValueError("unknown job fields: " + ", ".join(unknown))

    for field in ("input_path", "verdict", "engine_version", "state"):
        if field not in row:
            raise ValueError("missing job field: " + field)

    input_path = row["input_path"]
    if not isinstance(input_path, str) or not input_path:
        raise ValueError("input_path must be a non-empty string")

    output_path = row.get("output_path")
    if output_path is not None and not isinstance(output_path, str):
        raise ValueError("output_path must be a string or null")

    verdict = row["verdict"]
    if verdict not in VERDICTS:
        raise ValueError("verdict must be one of " + ", ".join(VERDICTS))

    state = row["state"]
    if state not in STATES:
        raise ValueError("state must be one of " + ", ".join(STATES))

    engine_version = row["engine_version"]
    if not isinstance(engine_version, str) or not engine_version:
        # PLAN.md edge-case table: record the engine's version alongside every
        # result, so a row can never be re-read as if the engine had not moved.
        raise ValueError("engine_version must be a non-empty string")

    ts = row.get("ts") or utc_now()
    if not isinstance(ts, str):
        raise ValueError("ts must be an ISO 8601 string")

    return {
        "ts": ts,
        "input_path": input_path,
        "settings": _settings(row.get("settings")),
        "output_path": output_path,
        "verdict": verdict,
        "engine_version": engine_version,
        "state": state,
    }


def _limit(limit: object) -> int:
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 0:
        raise ValueError("limit must be a non-negative int or None")
    return limit


def append_job(row: dict, path: Optional[PathLike] = None) -> None:
    """Append one settled job. `ts` is filled in when absent."""
    append_line(JOBS_PATH if path is None else path, validate(row))


def read_jobs(limit: Optional[int] = None, path: Optional[PathLike] = None) -> list:
    """Jobs newest first, exactly as stored. `limit` caps the count.

    A linear scan over a few hundred lines is nothing (PLAN.md 5.2).
    """
    rows = read_lines(JOBS_PATH if path is None else path)
    rows.reverse()
    return rows[: _limit(limit)] if limit is not None else rows


def history(limit: Optional[int] = None, path: Optional[PathLike] = None) -> list:
    """The history route -- rows newest first, each carrying its `line_id`.

    `line_id` is the 0-based position of the line IN THE FILE, derived at read
    time and never stored: adding an id column would break the frozen schema,
    and an append-only log already gives every line a stable ordinal.
    """
    rows = read_lines(JOBS_PATH if path is None else path)
    numbered = [dict(row, line_id=index) for index, row in enumerate(rows)]
    numbered.reverse()
    return numbered[: _limit(limit)] if limit is not None else numbered


def rerun_row(line_id_or_index, path: Optional[PathLike] = None) -> Optional[dict]:
    """The whole line behind a `line_id` -- the route needs `input_path` too."""
    try:
        index = int(line_id_or_index)
    except (TypeError, ValueError):
        return None
    if index < 0:
        return None
    rows = read_lines(JOBS_PATH if path is None else path)
    return rows[index] if index < len(rows) else None


def rerun_settings(line_id_or_index, path: Optional[PathLike] = None) -> Optional[dict]:
    """The rerun route -- that line's settings, or None when the id names no line.

    Whether the INPUT still exists on disk is a separate question, answered by
    the route with a 404 carrying `input_missing` (PLAN.md edge case "the source
    file moved, renamed, or is on a sleeping disk"): absent settings and an
    absent file are not the same failure.
    """
    row = rerun_row(line_id_or_index, path)
    if row is None:
        return None
    settings = row.get("settings")
    return settings if isinstance(settings, dict) else None

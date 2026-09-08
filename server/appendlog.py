"""The one primitive the two append-only logs share: an O_APPEND line-atomic write.

`jobs.jsonl` is the only log this module writes (corrected 2026-09-07 20:56 EDT: the
`labels/protection.jsonl` writer was removed on 2026-09-07 and the file survives as
tracked evidence only)
(CLAUDE.md, "Two append-only logs, two schemas, one writer each"). They share
exactly this module and nothing else: neither log imports the other.

Why `os.open(..., O_APPEND)` + a single `os.write()` rather than `open(path, "a")`
and `fh.write()`: two Devoid windows can be appending at the same instant
(PLAN.md edge-case table, "Two windows, one log" -> 5.1). A descriptor opened
`O_APPEND` has its offset moved to end-of-file and the bytes written as one
indivisible step by the kernel, so one complete JSON line cannot interleave with
another process's line. Buffered Python I/O gives no such guarantee -- the
buffer may be flushed in pieces, and a torn line corrupts the log for everyone.

Never read-modify-write these files. Written 2026-09-04 17:08 EDT.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Union

REPO_ROOT = Path(__file__).resolve().parent.parent

#: Where the two logs and the crash journal live. The repo when running from a
#: checkout; ``$DEVOID_DATA_DIR`` when something else decides -- which is what a
#: packaged .app does, pointing it at ~/Library/Application Support/Devoid so
#: the app never writes inside its own bundle.
#:
#: ⚠️ **This splits the label log in two, and that is a real cost, not a
#: detail.** ``labels/protection.jsonl`` is tracked evidence, pointed at from
#: the engine repo; rows written by a packaged app land outside the checkout and
#: have to be brought back by hand. Writing inside an .app bundle is worse --
#: it breaks under signing and is wiped by the next install -- but neither is
#: good, and the tracker carries the item.
DATA_DIR: Path = (
    Path(os.environ["DEVOID_DATA_DIR"]).expanduser()
    if os.environ.get("DEVOID_DATA_DIR")
    else REPO_ROOT
)

PathLike = Union[str, "os.PathLike[str]", Path]


def utc_now() -> str:
    """ISO 8601 UTC, seconds resolution -- the `ts` field of both schemas."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def append_line(path: PathLike, row: dict) -> None:
    """Append one JSON object as one line, atomically against other appenders."""
    payload = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
    data = (payload + "\n").encode("utf-8")

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    fd = os.open(target, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o644)
    try:
        # ONE os.write of the whole line. This call is the atomicity guarantee;
        # splitting it would reintroduce exactly the interleaving it prevents.
        written = os.write(fd, data)
        while written < len(data):
            # Only reachable on a signal or ENOSPC. Atomicity is already lost at
            # that point; finishing the line is still better than truncating it.
            written += os.write(fd, data[written:])
    finally:
        os.close(fd)


def read_lines(path: PathLike) -> list[dict]:
    """Every well-formed JSON object in the file, in file order.

    A malformed line is skipped, not raised: a `kill -9` mid-append can leave a
    torn trailing line, and one bad byte must never make the whole log
    unreadable. An absent file reads as empty -- absent is not deleted
    (PLAN.md 5.2, "distinguish absent from deleted").
    """
    target = Path(path)
    if not target.exists():
        return []

    rows: list[dict] = []
    with open(target, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                parsed: Any = json.loads(line)
            except ValueError:
                continue
            if isinstance(parsed, dict):
                rows.append(parsed)
    return rows

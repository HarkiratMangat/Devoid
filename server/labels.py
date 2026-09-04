"""``labels/protection.jsonl`` — the label log. PLAN.md 5.1.

⚠️ **Stage 5 owns hardening this.** Stage 1 creates it minimally so the answers
route is not a no-op that silently discards every verdict given before Stage 5
lands — retrofitting discards exactly those answers, which is the failure 5.1
exists to prevent.

⚠️ TWO LOGS, TWO SCHEMAS, ONE WRITER EACH. This file records the *engine's*
hardest decision and may be analysed on its own; ``jobs.jsonl`` records *your*
work. They look alike and must not be merged.

⚠️ This path is pointed at from the skill repo
(``Gif-Background-Remover/scripts/harness/labels/README.md``) because nothing
there would otherwise surface it. **If this path moves, fix that pointer.**

Writes are ``O_APPEND`` and line-atomic — never read-modify-write — so two windows
writing at once cannot interleave partial JSON (PLAN.md edge-case table).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LABELS_PATH = REPO_ROOT / "labels" / "protection.jsonl"

FIELDS = (
    "ts",
    "asset_id",
    "outline_color",
    "enclosure_ratio",
    "frames_enclosed",
    "frames_checked",
    "bbox_xyxy",
    "content_type",
    "verdict",
)


def append_jsonl(path: Path, record: dict) -> None:
    """One JSON object, one line, appended atomically.

    A single ``os.write`` of a payload ending in ``\\n`` to an ``O_APPEND`` fd is
    atomic for line-sized writes on the platforms this app runs on, which is what
    makes "two windows, one log" safe without a lock.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(record, separators=(",", ":"), sort_keys=False) + "\n").encode()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(fd, payload)
    finally:
        os.close(fd)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def record_verdict(
    *,
    asset_id: str,
    outline_color: str,
    enclosure_ratio: float,
    frames_enclosed: int,
    frames_checked: int,
    bbox_xyxy,
    verdict: str,
    content_type: str = "unknown",
    ts: str | None = None,
) -> dict:
    """Append one region decision. Returns the line as written."""
    if verdict not in ("protect", "remove"):
        raise ValueError(f"verdict must be protect|remove, got {verdict!r}")
    record = {
        "ts": ts or now_iso(),
        "asset_id": asset_id,
        "outline_color": outline_color,
        "enclosure_ratio": enclosure_ratio,
        "frames_enclosed": frames_enclosed,
        "frames_checked": frames_checked,
        "bbox_xyxy": list(bbox_xyxy),
        "content_type": content_type,
        "verdict": verdict,
    }
    append_jsonl(LABELS_PATH, record)
    return record

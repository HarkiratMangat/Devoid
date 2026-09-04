"""The label log -- `labels/protection.jsonl`. The ONLY writer of that file.

PLAN.md 5.1. Every answer the person gives to the enclosure question is one
labelled row for the decision `--auto` refuses on: the skill repo holds 981
`edge_hardness` classifications and ZERO for the protection decision, while its
stated goal is autonomy. Retrofitting this discards every answer given before it
existed, so it is designed in from the start.

This log is deliberately NOT `jobs.jsonl`: it is evidence about the engine, and
may be shared or analysed on its own. Separate schema, separate writer.

The file is pointed at from the skill repo at
`Gif-Background-Remover/scripts/harness/labels/README.md`, because nothing there
would otherwise surface it. If this path moves, fix that pointer.

Written 2026-09-04 17:08 EDT.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from server.appendlog import REPO_ROOT, PathLike, append_line, read_lines, utc_now

LABELS_PATH: Path = REPO_ROOT / "labels" / "protection.jsonl"

# The schema, in order, exactly as docs/API-CONTRACT.md freezes it. Anything not
# in this tuple is rejected rather than silently written: a log whose columns
# drift is not a dataset.
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

CONTENT_TYPES = ("icon", "sticker", "emoji", "unknown")
VERDICTS = ("protect", "remove")

_HEX = "0123456789abcdef"


def _hex6(value: object) -> str:
    """`002864` -- lowercase, six digits, no leading `#`, as the CLI flags take."""
    if not isinstance(value, str):
        raise ValueError("outline_color must be a hex string")
    text = value.strip().lstrip("#").lower()
    if len(text) != 6 or any(ch not in _HEX for ch in text):
        raise ValueError("outline_color must be six hex digits, e.g. 002864")
    return text


def _bbox(value: object) -> list[int]:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        raise ValueError("bbox_xyxy must be [x0, y0, x1, y1]")
    coords = []
    for item in value:
        if isinstance(item, bool) or not isinstance(item, (int, float)):
            raise ValueError("bbox_xyxy coordinates must be numbers")
        coords.append(int(item))
    x0, y0, x1, y1 = coords
    if x1 < x0 or y1 < y0:
        raise ValueError("bbox_xyxy must be ordered x0<=x1, y0<=y1")
    return coords


def _int(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(name + " must be an int")
    if value < 0:
        raise ValueError(name + " must not be negative")
    return value


def validate(row: dict) -> dict:
    """Return the canonical row, or raise ValueError. No I/O."""
    if not isinstance(row, dict):
        raise ValueError("a label row must be a dict")
    unknown = sorted(set(row) - set(FIELDS))
    if unknown:
        raise ValueError("unknown label fields: " + ", ".join(unknown))

    missing = [f for f in FIELDS if f != "ts" and f not in row]
    if missing:
        raise ValueError("missing label fields: " + ", ".join(missing))

    asset_id = row["asset_id"]
    if not isinstance(asset_id, str) or not asset_id:
        raise ValueError("asset_id must be a non-empty string")

    ratio = row["enclosure_ratio"]
    if isinstance(ratio, bool) or not isinstance(ratio, (int, float)):
        raise ValueError("enclosure_ratio must be a number")
    ratio = float(ratio)
    if not 0.0 <= ratio <= 1.0:
        raise ValueError("enclosure_ratio must be between 0 and 1")

    enclosed = _int(row["frames_enclosed"], "frames_enclosed")
    checked = _int(row["frames_checked"], "frames_checked")
    if enclosed > checked:
        raise ValueError("frames_enclosed cannot exceed frames_checked")

    content_type = row["content_type"]
    if content_type not in CONTENT_TYPES:
        raise ValueError("content_type must be one of " + ", ".join(CONTENT_TYPES))

    verdict = row["verdict"]
    if verdict not in VERDICTS:
        raise ValueError("verdict must be one of " + ", ".join(VERDICTS))

    ts = row.get("ts") or utc_now()
    if not isinstance(ts, str):
        raise ValueError("ts must be an ISO 8601 string")

    return {
        "ts": ts,
        "asset_id": asset_id,
        "outline_color": _hex6(row["outline_color"]),
        "enclosure_ratio": ratio,
        "frames_enclosed": enclosed,
        "frames_checked": checked,
        "bbox_xyxy": _bbox(row["bbox_xyxy"]),
        "content_type": content_type,
        "verdict": verdict,
    }


def append_label(row: dict, path: Optional[PathLike] = None) -> None:
    """Append one region decision. `ts` is filled in when absent."""
    append_line(LABELS_PATH if path is None else path, validate(row))


def read_labels(path: Optional[PathLike] = None) -> list[dict]:
    """Every label, oldest first. Malformed lines are skipped, never raised."""
    return read_lines(LABELS_PATH if path is None else path)


# --------------------------------------------------------------------------
# Integration shim: server/app.py (Stage 1) calls record_verdict(**kwargs);
# server/labels.py's own public API (Stage 5) is append_label(row). Both
# stay — this just adapts one call site rather than re-deriving either half.
# --------------------------------------------------------------------------
def record_verdict(
    *,
    asset_id: str,
    outline_color: str,
    enclosure_ratio: float,
    frames_enclosed: int,
    frames_checked: int,
    bbox_xyxy: list,
    verdict: str,
    content_type: str = "unknown",
) -> dict:
    row = {
        "ts": utc_now(),
        "asset_id": asset_id,
        "outline_color": outline_color,
        "enclosure_ratio": enclosure_ratio,
        "frames_enclosed": frames_enclosed,
        "frames_checked": frames_checked,
        "bbox_xyxy": list(bbox_xyxy),
        "content_type": content_type,
        "verdict": verdict,
    }
    append_label(row)
    return row

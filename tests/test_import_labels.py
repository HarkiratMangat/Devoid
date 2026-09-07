"""The label bring-back path, which touches TRACKED EVIDENCE.

⚠️ Written 2026-09-07 02:20 EDT. `labels/protection.jsonl` is the only corpus
anywhere for the protection decision and it is append-only with one writer. A
merge that overwrites, reorders or rewrites a row breaks the guarantee the
whole design rests on, and none of those failures is visible in a diff that
only shows the file got longer. Every one of them is asserted here.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "import_labels.py"


def row(asset_id: str, verdict: str = "protect") -> str:
    return json.dumps({
        "ts": "2026-09-07T05:00:00Z", "asset_id": asset_id, "outline_color": "002864",
        "enclosure_ratio": 0.708, "frames_enclosed": 102, "frames_checked": 144,
        "bbox_xyxy": [94, 56, 164, 145], "content_type": "unknown", "verdict": verdict,
    }, separators=(",", ":"))


def run(tracked: Path, src: Path, *args: str):
    """Run the script with the tracked log pointed at a temp copy."""
    code = SCRIPT.read_text(encoding="utf-8").replace(
        'TRACKED = ROOT / "labels" / "protection.jsonl"', f'TRACKED = Path({str(tracked)!r})')
    tmp = tracked.parent / "import_labels_under_test.py"
    tmp.write_text(code, encoding="utf-8")
    return subprocess.run([sys.executable, str(tmp), "--from", str(src), *args],
                          capture_output=True, text=True)


def setup(tmp_path: Path, tracked_rows: list[str], src_rows: list[str]):
    tracked = tmp_path / "protection.jsonl"
    tracked.write_text("".join(r + "\n" for r in tracked_rows), encoding="utf-8")
    src = tmp_path / "data"
    (src / "labels").mkdir(parents=True)
    (src / "labels" / "protection.jsonl").write_text(
        "".join(r + "\n" for r in src_rows), encoding="utf-8")
    return tracked, src


def test_it_appends_only_the_rows_that_are_new(tmp_path):
    a, b, c = row("aaa"), row("bbb"), row("ccc")
    tracked, src = setup(tmp_path, [a, b], [b, c])
    out = run(tracked, src)
    assert out.returncode == 0, out.stderr
    assert tracked.read_text(encoding="utf-8").split("\n")[:3] == [a, b, c]


def test_it_never_reorders_or_rewrites_what_was_already_there(tmp_path):
    """The strongest guarantee: the existing prefix is byte-identical after."""
    a, b = row("aaa"), row("bbb")
    tracked, src = setup(tmp_path, [a, b], [row("ccc")])
    before = tracked.read_bytes()
    run(tracked, src)
    assert tracked.read_bytes().startswith(before), "the append rewrote existing bytes"


def test_running_it_twice_adds_nothing_the_second_time(tmp_path):
    tracked, src = setup(tmp_path, [row("aaa")], [row("bbb")])
    run(tracked, src)
    once = tracked.read_bytes()
    run(tracked, src)
    assert tracked.read_bytes() == once


def test_a_torn_FINAL_line_is_dropped_because_that_is_what_a_crash_looks_like(tmp_path):
    tracked, src = setup(tmp_path, [], [row("aaa")])
    p = src / "labels" / "protection.jsonl"
    p.write_text(p.read_text(encoding="utf-8") + '{"ts":"2026', encoding="utf-8")
    out = run(tracked, src)
    assert out.returncode == 0, out.stderr
    assert "torn final line" in out.stdout
    assert tracked.read_text(encoding="utf-8").count("\n") == 1


def test_a_torn_MIDDLE_line_refuses_to_touch_the_tracked_log(tmp_path):
    """⚠️ Not a shape the append-only writer can produce, so it is not tolerated."""
    tracked, src = setup(tmp_path, [row("keep")], [])
    (src / "labels" / "protection.jsonl").write_text(
        '{"ts":"2026\n' + row("bbb") + "\n", encoding="utf-8")
    before = tracked.read_bytes()
    out = run(tracked, src)
    assert out.returncode != 0
    assert "not the last line" in out.stdout + out.stderr
    assert tracked.read_bytes() == before, "it wrote despite refusing"


def test_check_reports_without_writing(tmp_path):
    tracked, src = setup(tmp_path, [], [row("aaa")])
    before = tracked.read_bytes()
    out = run(tracked, src, "--check")
    assert out.returncode == 1, "check must exit 1 when rows are waiting"
    assert tracked.read_bytes() == before

"""`labels/protection.jsonl` -- schema, round-trip, and the concurrency claim.

The concurrency test is the point of this file. PLAN.md's edge-case table and
docs/API-CONTRACT.md both assert that two windows appending at once "cannot
interleave partial JSON". That is a claim about the kernel, not about our
intentions, so it is measured here rather than assumed.
"""

import json
import threading

import pytest

from server.labels import LABELS_PATH, append_label, read_labels, validate

# A padded row is the real test. A 200-byte write is trivially atomic on any
# filesystem; the interesting question is whether a line long enough to matter
# still lands whole. `asset_id` carries the padding because it is a free-form
# string in the schema -- no field is invented to make the test work.
PAD = "x" * 4000


def a_row(**over):
    row = {
        "asset_id": "galaxy.gif#0",
        "outline_color": "002864",
        "enclosure_ratio": 0.7083,
        "frames_enclosed": 102,
        "frames_checked": 144,
        "bbox_xyxy": [12, 34, 56, 78],
        "content_type": "icon",
        "verdict": "protect",
    }
    row.update(over)
    return row


def test_round_trip(tmp_path):
    log = tmp_path / "labels" / "protection.jsonl"
    row = a_row(ts="2026-09-04T21:05:00Z")
    append_label(row, path=log)

    read_back = read_labels(path=log)
    assert read_back == [row]


def test_ts_is_filled_in_when_absent(tmp_path):
    log = tmp_path / "protection.jsonl"
    append_label(a_row(), path=log)
    (stored,) = read_labels(path=log)
    assert stored["ts"].endswith("Z") and stored["ts"][4] == "-"


def test_field_order_is_the_frozen_contract_order(tmp_path):
    log = tmp_path / "protection.jsonl"
    append_label(a_row(), path=log)
    keys = list(json.loads(log.read_text().splitlines()[0]))
    assert keys == [
        "ts",
        "asset_id",
        "outline_color",
        "enclosure_ratio",
        "frames_enclosed",
        "frames_checked",
        "bbox_xyxy",
        "content_type",
        "verdict",
    ]


def test_outline_color_is_normalised():
    assert validate(a_row(outline_color="#00FF64"))["outline_color"] == "00ff64"


@pytest.mark.parametrize(
    "bad",
    [
        {"verdict": "maybe"},
        {"content_type": "logo"},
        {"outline_color": "blue"},
        {"enclosure_ratio": 1.4},
        {"frames_enclosed": 200},  # more enclosed than checked
        {"bbox_xyxy": [56, 34, 12, 78]},  # x1 < x0
    ],
)
def test_bad_rows_are_refused(bad):
    with pytest.raises(ValueError):
        validate(a_row(**bad))


def test_unknown_field_is_refused():
    row = a_row()
    row["confidence"] = 0.9
    with pytest.raises(ValueError):
        validate(row)


def test_a_torn_trailing_line_is_skipped_not_raised(tmp_path):
    log = tmp_path / "protection.jsonl"
    append_label(a_row(), path=log)
    with open(log, "a") as fh:
        fh.write('{"ts": "2026-09-04T21:0')  # what a kill -9 mid-append leaves
    assert len(read_labels(path=log)) == 1


def test_absent_file_reads_as_empty(tmp_path):
    assert read_labels(path=tmp_path / "nothing.jsonl") == []


def test_concurrent_appends_never_interleave(tmp_path):
    """8 threads x 50 appends -> 400 whole, individually-parseable lines.

    Every row is uniquely identifiable, so the assertion is not merely "400
    lines" but "exactly the 400 rows we wrote, none torn and none lost".
    """
    log = tmp_path / "protection.jsonl"
    threads, per_thread = 8, 50
    expected = {
        (t, i) for t in range(threads) for i in range(per_thread)
    }
    errors = []

    def worker(t):
        try:
            for i in range(per_thread):
                append_label(
                    a_row(asset_id="t{0}-i{1}-{2}".format(t, i, PAD)), path=log
                )
        except Exception as exc:  # a raise inside a thread must fail the test
            errors.append(exc)

    workers = [threading.Thread(target=worker, args=(t,)) for t in range(threads)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()

    assert not errors

    raw = log.read_text().splitlines()
    assert len(raw) == threads * per_thread

    seen = set()
    for line in raw:
        row = json.loads(line)  # a torn line raises here -- that is the test
        assert row["asset_id"].endswith(PAD)
        head = row["asset_id"][: -len(PAD)]
        t, i = head.rstrip("-").split("-")
        seen.add((int(t[1:]), int(i[1:])))

    assert seen == expected


def test_default_path_is_the_tracked_repo_file():
    assert LABELS_PATH.parent.name == "labels"
    assert LABELS_PATH.name == "protection.jsonl"
    # The skill repo's scripts/harness/labels/README.md points at exactly this
    # path. If this assertion ever needs changing, that pointer changes too.
    assert LABELS_PATH.parent.parent.name == "Devoid" or LABELS_PATH.is_absolute()

"""`jobs.jsonl` -- schema, round-trip, re-run, and the cross-PROCESS concurrency claim.

The labels test proves atomicity across threads. This one proves it across
separate OS processes, which is the case PLAN.md's edge-case table actually
names: "Two windows, one log". Threads share one interpreter; two windows do
not, and only the second case exercises the kernel's O_APPEND guarantee.
"""

import json
import multiprocessing as mp

import pytest

from server.jobs import (
    JOBS_PATH,
    append_job,
    history,
    read_jobs,
    rerun_row,
    rerun_settings,
    validate,
)

PAD = "y" * 4000

SETTINGS = {
    "overrides": {"erosion": 1},
    "regions": [{"type": "protect", "bbox_xyxy": [1, 2, 3, 4], "tracked": False}],
    "goal": {"format": "webp", "target_kb": 256},
    "answers": {},
}


def a_row(**over):
    row = {
        "input_path": "/Users/x/galaxy.gif",
        "settings": SETTINGS,
        "output_path": "/Users/x/galaxy_transparent.webp",
        "verdict": "done",
        "engine_version": "sha256:abc123",
        "state": "done",
    }
    row.update(over)
    return row


def test_round_trip(tmp_path):
    log = tmp_path / "jobs.jsonl"
    row = a_row(ts="2026-09-04T21:05:00Z")
    append_job(row, path=log)
    assert read_jobs(path=log) == [row]


def test_field_order_is_the_frozen_contract_order(tmp_path):
    log = tmp_path / "jobs.jsonl"
    append_job(a_row(), path=log)
    keys = list(json.loads(log.read_text().splitlines()[0]))
    assert keys == [
        "ts",
        "input_path",
        "settings",
        "output_path",
        "verdict",
        "engine_version",
        "state",
    ]


def test_a_cancelled_job_keeps_a_null_output_path(tmp_path):
    log = tmp_path / "jobs.jsonl"
    append_job(a_row(verdict="cancelled", state="cancelled", output_path=None), path=log)
    (stored,) = read_jobs(path=log)
    assert stored["output_path"] is None


def test_read_jobs_is_newest_first_and_limited(tmp_path):
    log = tmp_path / "jobs.jsonl"
    for n in range(5):
        append_job(a_row(input_path="/in/{0}.gif".format(n)), path=log)
    assert [r["input_path"] for r in read_jobs(limit=2, path=log)] == [
        "/in/4.gif",
        "/in/3.gif",
    ]


def test_history_carries_a_line_id_that_is_the_file_position(tmp_path):
    log = tmp_path / "jobs.jsonl"
    for n in range(3):
        append_job(a_row(input_path="/in/{0}.gif".format(n)), path=log)
    rows = history(path=log)
    assert [r["line_id"] for r in rows] == [2, 1, 0]
    assert rows[0]["input_path"] == "/in/2.gif"


def test_rerun_settings_loads_that_line_back(tmp_path):
    log = tmp_path / "jobs.jsonl"
    append_job(a_row(input_path="/in/0.gif"), path=log)
    append_job(a_row(input_path="/in/1.gif", settings={"overrides": {"feather": 2}}), path=log)

    assert rerun_settings(0, path=log) == {**SETTINGS, "answers": {}}
    assert rerun_settings("1", path=log)["overrides"] == {"feather": 2}
    assert rerun_row(1, path=log)["input_path"] == "/in/1.gif"


def test_rerun_settings_returns_none_for_an_unknown_line(tmp_path):
    log = tmp_path / "jobs.jsonl"
    append_job(a_row(), path=log)
    # None means "no such line". An input file that has moved is a DIFFERENT
    # failure the route reports as input_missing -- absent is not deleted.
    assert rerun_settings(9, path=log) is None
    assert rerun_settings(-1, path=log) is None
    assert rerun_settings("nonsense", path=log) is None


@pytest.mark.parametrize(
    "bad",
    [
        {"verdict": "done-ish"},
        {"state": "finished"},
        {"engine_version": ""},
        {"input_path": ""},
        {"settings": {"overrides": {}, "flags": []}},
        {"output_path": 7},
    ],
)
def test_bad_rows_are_refused(bad):
    with pytest.raises(ValueError):
        validate(a_row(**bad))


def test_settings_shape_is_completed_not_guessed():
    filled = validate(a_row(settings={}))["settings"]
    assert filled == {"overrides": {}, "regions": [], "goal": {}, "answers": {}}


def test_a_torn_trailing_line_is_skipped_not_raised(tmp_path):
    log = tmp_path / "jobs.jsonl"
    append_job(a_row(), path=log)
    with open(log, "a") as fh:
        fh.write('{"ts": "2026-09-04T2')
    assert len(read_jobs(path=log)) == 1


def _child(args):
    """Runs in a SEPARATE process -- the two-windows case, not two threads."""
    log, worker, count = args
    for i in range(count):
        append_job(
            a_row(input_path="/in/w{0}-i{1}-{2}.gif".format(worker, i, PAD)), path=log
        )
    return worker


def test_concurrent_appends_from_separate_processes_never_interleave(tmp_path):
    """4 processes x 50 appends -> 200 whole, individually-parseable lines."""
    log = tmp_path / "jobs.jsonl"
    procs, per_proc = 4, 50
    ctx = mp.get_context("spawn")
    with ctx.Pool(procs) as pool:
        done = pool.map(_child, [(str(log), w, per_proc) for w in range(procs)])
    assert sorted(done) == list(range(procs))

    raw = log.read_text().splitlines()
    assert len(raw) == procs * per_proc

    seen = set()
    for line in raw:
        row = json.loads(line)  # a torn line raises here -- that is the test
        stem = row["input_path"][len("/in/") : -len(".gif")]
        assert stem.endswith(PAD)
        w, i = stem[: -len(PAD)].rstrip("-").split("-")
        seen.add((int(w[1:]), int(i[1:])))

    assert seen == {(w, i) for w in range(procs) for i in range(per_proc)}


def test_default_path_is_the_tracked_repo_file():
    assert JOBS_PATH.name == "jobs.jsonl"


def test_the_jobs_log_is_not_the_protection_log():
    """⚠️ There is ONE writer now, and the other file still exists (2026-09-07 10:55 EDT).

    This asserted "two append-only logs, two schemas, one writer each" when
    both were written. The protection log's writer was removed — the engine
    repo's harness is where labelled data lives — but the FILE stays in the
    repo with its history, so the thing this test guards against is still
    possible: `jobs.jsonl` must never start appending into it.
    """
    from pathlib import Path

    protection = Path(__file__).resolve().parent.parent / "labels" / "protection.jsonl"
    assert JOBS_PATH != protection
    assert protection.is_file(), "the log was deleted; it was supposed to be kept"

"""`.devoid-journal.json` -- what a quit mid-batch leaves behind. PLAN.md 1.4."""

import json
import threading

from server.journal import close_job, in_flight, open_job, recover_orphans


def test_an_open_job_is_visible_and_a_closed_one_is_not(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    open_job("job-1", "/in/a.gif", temp_path="/tmp/a.part", path=j)
    open_job("job-2", "/in/b.gif", path=j)

    assert {e["job_id"] for e in in_flight(path=j)} == {"job-1", "job-2"}

    assert close_job("job-1", path=j) is True
    assert [e["job_id"] for e in in_flight(path=j)] == ["job-2"]


def test_closing_an_unknown_job_is_not_an_error(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    # A cancel racing a completion must not raise.
    assert close_job("never-started", path=j) is False


def test_reopening_the_same_id_does_not_duplicate_it(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    open_job("job-1", "/in/a.gif", path=j)
    open_job("job-1", "/in/a.gif", path=j)
    assert len(in_flight(path=j)) == 1


def test_recover_orphans_surfaces_then_clears(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    open_job("job-1", "/in/a.gif", temp_path="/tmp/a.part", path=j)
    open_job("job-2", "/in/b.gif", temp_path="/tmp/b.part", path=j)

    orphans = recover_orphans(path=j)
    assert {e["job_id"] for e in orphans} == {"job-1", "job-2"}
    # Each names its temp file, so the caller can delete the partial rather than
    # let the next run escalate past it to _v2.
    assert all(e["temp_path"] for e in orphans)

    # Reported once. A second startup must not re-report the same orphans, and
    # nothing was resumed -- recovery is surfacing, not re-running.
    assert recover_orphans(path=j) == []
    assert in_flight(path=j) == []


def test_a_clean_exit_leaves_nothing_to_recover(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    open_job("job-1", "/in/a.gif", path=j)
    close_job("job-1", path=j)
    assert recover_orphans(path=j) == []


def test_an_unreadable_journal_does_not_crash_startup(tmp_path):
    j = tmp_path / ".devoid-journal.json"
    j.write_text("{ this is not json")
    assert recover_orphans(path=j) == []


def test_absent_journal_reads_as_empty(tmp_path):
    assert in_flight(path=tmp_path / "nope.json") == []


def test_concurrent_open_and_close_keeps_the_file_valid(tmp_path):
    """The journal IS read-modify-written, so its lock is worth measuring."""
    j = tmp_path / ".devoid-journal.json"
    errors = []

    def worker(t):
        try:
            for i in range(20):
                jid = "t{0}-{1}".format(t, i)
                open_job(jid, "/in/{0}.gif".format(jid), path=j)
                close_job(jid, path=j)
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(t,)) for t in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    parsed = json.loads(j.read_text())  # a torn rewrite raises here
    assert parsed == []

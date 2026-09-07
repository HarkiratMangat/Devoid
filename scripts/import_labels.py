#!/usr/bin/env python3
"""Bring a packaged run's labels back into the tracked log.

⚠️ WHY THIS EXISTS (2026-09-07 02:20 EDT). `labels/protection.jsonl` is TRACKED
EVIDENCE, pointed at by path from the engine repo, and it is the only corpus
anywhere for the protection decision. A packaged app writes to
``$DEVOID_DATA_DIR`` -- ``~/Library/Application Support/Devoid`` by default --
so every answer given outside the checkout lands where the tracked log cannot
see it. Writing inside the bundle instead is strictly worse: it breaks under
signing and the next install deletes it. This is the way back.

⚠️ IT APPENDS. NEVER OVERWRITES, NEVER REORDERS, NEVER REWRITES A ROW. This is
an append-only log with one writer, and a merge that rewrites it breaks the
guarantee the whole design rests on. Rows already present are skipped by exact
line, so running it twice adds nothing the second time.

⚠️ A TORN LAST LINE IS A CRASH MID-APPEND, NOT A CORRUPT FILE. The writer
appends O_APPEND line-atomically, so an unparseable FINAL line is dropped with
a note; an unparseable line anywhere else is an error, because that is not a
shape a crash can produce.

  python3 scripts/import_labels.py --check     # say what would come over
  python3 scripts/import_labels.py             # append it
  python3 scripts/import_labels.py --from DIR  # a data dir that is not the default
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKED = ROOT / "labels" / "protection.jsonl"
DEFAULT_SOURCES = [
    Path(os.environ["DEVOID_DATA_DIR"]).expanduser() if os.environ.get("DEVOID_DATA_DIR") else None,
    Path.home() / "Library" / "Application Support" / "Devoid",
]


def read_rows(path: Path) -> tuple[list[str], list[str]]:
    """(kept lines, notes). Order preserved; the torn-last-line rule applied."""
    if not path.is_file():
        return [], [f"{path} does not exist"]
    raw = [ln for ln in path.read_text(encoding="utf-8").split("\n")]
    if raw and raw[-1] == "":
        raw.pop()
    kept, notes = [], []
    for i, ln in enumerate(raw):
        if not ln.strip():
            continue
        try:
            json.loads(ln)
        except json.JSONDecodeError:
            if i == len(raw) - 1:
                notes.append("dropped a torn final line — a crash mid-append, which is expected")
                continue
            raise SystemExit(
                f"import_labels: {path} line {i + 1} is not JSON, and it is not the last line.\n"
                "  Only a torn FINAL line is a shape the append-only writer can produce.\n"
                "  Refusing to touch the tracked log until this is understood."
            )
        kept.append(ln)
    return kept, notes


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="report and exit 1 if anything is waiting")
    ap.add_argument("--from", dest="src", default=None, help="a data dir other than the default")
    args = ap.parse_args()

    sources = [Path(args.src).expanduser()] if args.src else [p for p in DEFAULT_SOURCES if p]
    src_file = next((s / "labels" / "protection.jsonl" for s in sources
                     if (s / "labels" / "protection.jsonl").is_file()), None)
    if src_file is None:
        looked = ", ".join(str(s) for s in sources)
        print(f"import_labels: no packaged label log found. Looked in: {looked}")
        return 0

    incoming, notes = read_rows(src_file)
    have, _ = read_rows(TRACKED)
    known = set(have)
    new = [ln for ln in incoming if ln not in known]

    for n in notes:
        print(f"  note: {n}")
    print(f"import_labels: {src_file}")
    print(f"  {len(incoming)} row(s) there, {len(have)} already tracked, {len(new)} new")

    if not new:
        print("  nothing to bring over.")
        return 0
    if args.check:
        print("  --check: not written. Run without --check to append.")
        return 1

    # ⚠️ append mode, one open, no truncation anywhere in this function
    with TRACKED.open("a", encoding="utf-8") as fh:
        for ln in new:
            fh.write(ln + "\n")
    print(f"  appended {len(new)} row(s) to {TRACKED.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

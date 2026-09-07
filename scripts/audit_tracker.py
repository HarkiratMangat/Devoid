#!/usr/bin/env python3
"""The tracker's conservation rule, as a gate instead of an honour system.

⚠️ WHY THIS EXISTS (2026-09-07 10:31 EDT). `CLAUDE.md` says one item removed
from `devoid-deferred-list.md` MUST equal one item added to
`devoid-resolved-list.md`, and until now nothing checked it. **A sweep and a
deletion look identical in a diff.** The gif repo gates its own tracker this
way precisely because it once shipped a tracker that lied about its contents.

Ported from that repo's `audit_docs.py` conservation check, keeping the three
corrections it learned the hard way, because each one is a false positive that
would have made the gate unusable:

  1. A unified diff renders an EDIT as a removal plus an addition, so a line
     whose six-word fingerprint survives on the `+` side was reworded, not
     removed.
  2. A markdown heading is structure, never an item.
  3. The fingerprint window and the haystack must be normalised the SAME way,
     or nothing can ever match and the gate passes on everything.

**Hard failure is reserved for the two cases that cannot be innocent:** lines
left the active list and NOTHING was archived, or nothing removed can be traced
into the archive at all. Partial untraceability is a WARNING — measured on the
gif repo's own first real run, where a summary line was rewritten rather than
moved and shares no window with its replacement. A gate that cries wolf gets
ignored, which is worse than no gate.

  python3 scripts/audit_tracker.py --diff main
"""
from __future__ import annotations

import re
import subprocess
import sys

ACTIVE, ARCHIVE = "devoid-deferred-list.md", "devoid-resolved-list.md"


def _words(sx: str) -> list[str]:
    return [w for w in re.sub(r"[^a-z0-9]+", " ", sx.lower()).split() if len(w) > 2]


def _fp_in(line: str, haystack_words: list[str], n: int = 6) -> bool:
    w = _words(line)
    if len(w) < n:
        return True                       # too short to fingerprint; do not guess
    hay = " ".join(haystack_words)
    return any(" ".join(w[i:i + n]) in hay for i in range(len(w) - n + 1))


def git(*a: str) -> str:
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout


def _base_commit(base: str) -> str:
    """The merge base, so the branch diff is this branch's own net effect."""
    out = git("merge-base", base, "HEAD").strip()
    return out or base


def _diff(rev: str, path: str) -> str:
    """Working tree against `rev`, so an UNCOMMITTED deletion is visible."""
    return git("diff", "--unified=0", rev, "--", path)


def conservation(rev: str, scope: str) -> tuple[list[str], list[str]]:
    """(failures, warnings) for one diff scope."""
    diff = _diff(rev, ACTIVE)
    if not diff:
        return [], []
    minus = [l[1:].strip() for l in diff.split("\n") if l.startswith("-") and not l.startswith("---")]
    plus = [l[1:].strip() for l in diff.split("\n") if l.startswith("+") and not l.startswith("+++")]
    plus_words = _words(" ".join(plus))
    removed = [l for l in minus
               if not re.match(r"^#{1,6}\s", l)     # a heading is structure, not an item
               and len(l) > 40                        # ignore rewrap and whitespace churn
               and not _fp_in(l, plus_words)]         # an in-place edit is not a removal
    if not removed:
        return [], []

    arc = _diff(rev, ARCHIVE)
    added = [l[1:] for l in arc.split("\n") if l.startswith("+") and not l.startswith("+++")]
    if not added:
        return ([f"[{scope}] removes {len(removed)} substantive line(s) from {ACTIVE} and adds "
                 f"NOTHING to {ARCHIVE}. An item leaves the active list only by being resolved into "
                 f'the archive — otherwise the tidy-up silently DELETED it. First: "{removed[0][:90]}…"'], [])

    arc_words = _words(" ".join(added))
    orphans = [l for l in removed if not _fp_in(l, arc_words)]
    if orphans and len(orphans) == len(removed):
        return ([f"[{scope}] removes {len(removed)} item(s) from {ACTIVE} and DOES add to {ARCHIVE}, "
                 f"but none of the removed text can be traced into it. That is a deletion wearing a "
                 f'sweep\'s clothes. First untraceable: "{orphans[0][:90]}…"'], [])
    if orphans:
        return [], [f"[{scope}] {len(orphans)} of {len(removed)} line(s) removed from {ACTIVE} could not "
                    f"be traced into {ARCHIVE}. Rewording during a sweep is normal, so confirm each one "
                    f'landed. First: "{orphans[0][:90]}…"']
    return [], []


def main() -> int:
    if "--diff" not in sys.argv:
        print("audit_tracker: --diff <base> is required — this gate is about a BRANCH's net effect")
        return 2
    base = sys.argv[sys.argv.index("--diff") + 1]

    # ⚠️ TWO SCOPES, AND THE SECOND IS THE ONE THAT CATCHES THIS REPO
    # (2026-09-07 10:32 EDT). The ported gate diffed only the merge base against
    # the working tree, and its own falsifier would not fire: deleting a whole
    # item reported "conservation holds". The reason is structural — an item
    # FILED AND CLOSED ON THE SAME BRANCH never existed at the merge base, so a
    # branch-scope diff sees the addition and the deletion cancel and reports
    # nothing. That is exactly this branch's pattern.
    #   branch : did this branch, as a whole, drop something it never archived?
    #   working: does the change I am about to commit drop something?
    # Both run. The working scope is the one that fails before a bad commit.
    fails, warns = [], []
    for rev, scope in ((_base_commit(base), "branch"), ("HEAD", "working")):
        f, w = conservation(rev, scope)
        fails += f
        warns += w

    for w in warns:
        print(f"  warning: {w}")
    if fails:
        print(f"\naudit_tracker: FAILED — the conservation rule was broken.")
        for f in fails:
            print(f"  {f}")
        return 1
    print("audit_tracker: conservation holds, branch and working tree"
          + (f" ({len(warns)} warning(s))" if warns else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())

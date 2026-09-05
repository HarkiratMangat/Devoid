# ✅ Devoid — resolved list

The archive for `devoid-deferred-list.md`. Created 2026-09-05 00:07 EDT alongside it, so the conservation rule has a destination from day one rather than being invented the first time an item closes.

## The rules

1. **One item removed from `devoid-deferred-list.md` MUST equal one item added here.** Never delete an item; move it.
2. **Keep the original wording.** Add the outcome above or below it — do not rewrite the filing to match what turned out to be true. The gap between the two is the most useful thing in this file.
3. **Record what was falsified**, not only what was fixed. An item closed because its premise was wrong is worth more than one closed because the code changed.
4. **Cite where it closed** — branch, commit, and version — so the changelog entry and this entry point at each other.

Heading shape, matching the engine repo's archive:

```
## ✅ <the item's original title> — CLOSED YYYY-MM-DD (branch `x`, commit `sha`, vX.Y.Z)
```

---

## Closed items

⚠️ **The fixes made during the build session are not here.** They were never filed as deferred items in the first place, so they do not belong in an archive of filed items — they are in `docs/CHANGELOG.md` (what shipped) and `docs/DEVLOG.md` (why, and what was tried and walked back).

## ✅ `jobs.jsonl` is tracked in git, so every real use dirties the working tree — CLOSED 2026-09-05 (branch `feat/devoid-v1`, unreleased in v1.0.0)

**Outcome: closed by untracking, in the same session it was filed.** `jobs.jsonl` is now in `.gitignore` and `git rm --cached`-ed; `labels/protection.jsonl` stays tracked, which is the whole distinction. No `.gitkeep` was needed — verified live that an absent log reads as empty (`server/appendlog.py:read_lines` returns `[]` for a missing file, by design, per `PLAN.md` 5.2's "distinguish absent from deleted"), so nothing has to hold the path open.

⚠️ **Half of it did not close and was moved, not dropped.** `server/jobs.py:25` still hardcodes `REPO_ROOT / "jobs.jsonl"`, which stops meaning anything once the app ships as a standalone bundle. That half now lives inside the packaging item (`[P1 · M · Opus5-High]` "The `.app` is not standalone") rather than as its own entry, because the fix is the same fix.

**The original filing, unedited:**

### `[P1 · XS · Sonnet5-Med]` `jobs.jsonl` is tracked in git, so every real use dirties the working tree *(filed 2026-09-05, found the first time the app was used for real)*

`jobs.jsonl` is a **per-machine work history** — "`jobs.jsonl` records your work" (`CLAUDE.md`) — and it is committed to the repo as a tracked, empty file. The first genuine render on this machine appended a row and left the tree dirty on a branch about to be pushed, carrying a local `~/Downloads` path with it. Every real use will do that again, and two branches that both saw use will conflict on a file whose merge has no meaning.

⚠️ **`labels/protection.jsonl` is the opposite case and must stay tracked.** That log is *evidence* — a dataset meant to accumulate across machines, pointed at from the engine repo. The two logs "look alike and must not be merged" (`CLAUDE.md`); this is the same distinction one level down, in git rather than in the schema.

**Three options, and they are not equivalent:** gitignore `jobs.jsonl` outright (loses nothing — nothing reads it across machines); keep the path tracked via a `.gitkeep` and ignore the file; or move it out of the repo entirely, to `~/Library/Application Support/Devoid/`, which is where a shipped `.app` will have to write anyway and therefore folds into the standalone-packaging item. ⚠️ **`server/jobs.py:25` hardcodes `REPO_ROOT / "jobs.jsonl"`**, so the third option is the only one that survives the app leaving this repo.


#!/bin/bash
# ctx-index-refresh.sh — PreToolUse on context-mode's ctx_search.
# Re-indexes this repo's prose immediately before a search reads it.
#
# WHY. `ctx_index` writes a SNAPSHOT and there is no `detect_changes` equivalent
# (codebase-memory-mcp has one; context-mode does not). Edit a doc and the index
# keeps serving the old text under the old heading with a real path —
# indistinguishable from current. A one-off index therefore works for a week and
# then answers confidently with last month's rules, which is worse than having
# none.
#
# WHY BEFORE A SEARCH, not at SessionStart: freshness only matters at the instant
# of a READ. A session-start refresh misses everything changed during the session,
# and a post-write refresh re-indexes files that are already in context and will
# not be searched for.
#
# ⚠️ IT MUST EMIT hookEventName. A hook that emits hookSpecificOutput WITHOUT it
# is SILENTLY DISCARDED — it runs, exits 0, prints valid JSON, and reaches nobody.
# ⚠️ It never blocks and always exits 0, but it does not fail silently either: an
# indexing failure is reported, so the next result is not mistaken for a fresh one.
set -uo pipefail
TOOL=$(jq -r '.tool_name // empty' 2>/dev/null)
case "$TOOL" in *ctx_search*) ;; *) exit 0 ;; esac

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -d "$ROOT/docs" ] || exit 0
command -v context-mode >/dev/null 2>&1 || exit 0

# ⚠️ THE MEMORY STORE IS INDEXED TOO, added 2026-09-07 17:58 EDT. It lives OUTSIDE the repo
# and was therefore unsearchable from here — every caveat and decision written to
# it was retrievable only by pulling the right file by name, which means only if
# you already knew it existed. The slug is derived rather than hardcoded (`/` and
# ` ` both become `-`) so a clone or a worktree resolves its own store.
MEMSLUG=$(printf '%s' "$ROOT" | tr '/ ' '--')
MEM="$HOME/.claude/projects/$MEMSLUG/memory"

# Hash every file the index ingests, so the stamp cannot report fresh while the
# index is stale. Keyed by root: a second clone must not fight over one stamp.
ROOTKEY=$(printf '%s' "$ROOT" | shasum | cut -c1-12)
STAMP="$HOME/.claude/context-mode/.devoid-prose-stamp-$ROOTKEY"
HASH=$(cd "$ROOT" && find docs -type f -name '*.md' -exec shasum {} + 2>/dev/null; \
       cd "$ROOT" && find . -maxdepth 1 -type f -name '*.md' -exec shasum {} + 2>/dev/null; \
       [ -d "$MEM" ] && find "$MEM" -type f -name '*.md' -exec shasum {} + 2>/dev/null) 
HASH=$(printf '%s' "$HASH" | sort | shasum | cut -d' ' -f1)
[ -z "$HASH" ] && exit 0
[ -f "$STAMP" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$HASH" ] && exit 0

# ⚠️ THE CONVENTIONS ARE NOT OPTIONAL HERE, and each one was paid for:
#   --source project:<repo>-<area>  the label is the ONLY discriminator; source_category
#                                   is NULL on every row, so an unlabelled index reads
#                                   as this repo's own code (measured elsewhere: 310 of
#                                   596 sources mislabelled, 3,404 duplicate chunks)
#   --project "$ROOT"               defaults to the INDEXED DIRECTORY, which put docs/
#                                   and the root into two content DBs that could not
#                                   see each other
#   --ext .md                       the CLI's default allowlist includes SOURCE files,
#                                   which silently blew the file cap with server/*.py
ERR=""
context-mode index "$ROOT/docs" --source project:devoid-docs  --project "$ROOT" --ext .md --max-files 60 --max-depth 4 >/dev/null 2>&1 || ERR="docs"
context-mode index "$ROOT"      --source project:devoid-rules --project "$ROOT" --ext .md --max-files 40 --max-depth 1 >/dev/null 2>&1 || ERR="${ERR:+$ERR and }root"
# --project "$ROOT" even though the files live elsewhere: that is what puts them
# in THIS project's content DB, so a ctx_search from this repo can reach them.
[ -d "$MEM" ] && { context-mode index "$MEM" --source project:devoid-memory --project "$ROOT" --ext .md --max-files 40 --max-depth 2 >/dev/null 2>&1 || ERR="${ERR:+$ERR and }memory"; }

if [ -n "$ERR" ]; then
  printf 'CTX-INDEX REFRESH FAILED (%s). The search you are about to run may be answering from a STALE index — context-mode has no change detection, so a stale result is indistinguishable from a fresh one. Re-run `npm run refresh:index` and read its output before trusting what comes back.' "$ERR" \
    | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:.}}'
  exit 0
fi
printf '%s' "$HASH" > "$STAMP"
exit 0

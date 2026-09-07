#!/usr/bin/env bash
# Re-index Devoid into the two snapshot layers.
#
# ⚠️ WHY THIS EXISTS. Neither layer has change detection. `ctx_index` is a
# snapshot with no `detect_changes` equivalent, and the codebase-memory graph is
# a snapshot too — so both serve last week's text under a real heading, with a
# real path, indistinguishable from current. Diors-Builds runs an equivalent as
# a PreToolUse hook; this repo runs it by hand, which is worse but honest, and
# `CLAUDE.md` says so rather than implying the indexes are fresh.
#
# ⚠️ `index_repository` DOES NOT WORK through the MCP tool — it reports a worker
# crash that did not happen, because the tool passes `project_path` and the
# worker requires `repo_path`. The CLI is the only working path.
#
# Run it after a branch's worth of work, and before trusting any query about
# something that has moved.  Usage:  npm run refresh:index
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "── code graph ────────────────────────────────────────────"
~/.local/bin/codebase-memory-mcp cli index_repository --repo_path "$ROOT" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("  %s: %d nodes, %d edges, %s" % (d["project"], d["nodes"], d["edges"], d["status"]))'

echo "── prose ─────────────────────────────────────────────────"
# ⚠️ `--project "$ROOT"` ON BOTH, and it is not optional. `--project` defaults to
# the INDEXED directory, so indexing docs/ without it wrote to a content DB keyed
# on docs/ while the root index wrote to another — two stores, and a ctx_search
# scoped to one could not see the other. Found by reading the DB paths this
# script prints, which is the only place it is visible.
# ⚠️ `--ext .md` ON THE ROOT INDEX, and this one is not cosmetic. The CLI's
# default extension allowlist includes SOURCE files, so the first two runs pulled
# `server/cli.py` and friends into `project:devoid-rules`, hit the file cap, and
# reported "Indexed" anyway — an arbitrary 40 of them, silently truncated. Code
# belongs in the graph, which answers structural questions properly; this layer
# is for prose. Found by reading a search result that came back from a .py file.
context-mode index "$ROOT/docs" --source project:devoid-docs  --project "$ROOT" --ext .md --max-files 60 --max-depth 4 | sed 's/^/  /'
context-mode index "$ROOT"      --source project:devoid-rules --project "$ROOT" --ext .md --max-files 40 --max-depth 1 | sed 's/^/  /'

echo "── verify by QUERY, never by the lines above ─────────────"
echo "  the indexer reports success for a badly-labelled or stale index."
echo "  run one search whose answer you already know:"
echo "    context-mode search 'tri-state control auto' --source project:devoid-rules"

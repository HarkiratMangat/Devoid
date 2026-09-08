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
# ⚠️ THE MEMORY STORE, added 2026-09-07 17:58 EDT. `~/.claude/projects/<slug>/memory/` holds
# the caveats and decisions this project writes for its future sessions, and it
# sat OUTSIDE every index — retrievable only by opening a file you already knew
# the name of. `--project "$ROOT"` puts it in THIS repo's content DB despite the
# files living elsewhere, which is what makes it reachable from a search here.
MEM="$HOME/.claude/projects/$(printf '%s' "$ROOT" | tr '/ ' '--')/memory"
if [ -d "$MEM" ]; then
  context-mode index "$MEM" --source project:devoid-memory --project "$ROOT" --ext .md --max-files 40 --max-depth 2 | sed 's/^/  /'
else
  echo "  no memory store at $MEM"
fi

echo "── the ENGINE repo ───────────────────────────────────────"
# ⚠️ ADDED 2026-09-07 11:59 EDT. The gif repo was indexed and then had NO
# freshness mechanism — `ctx_index` is a snapshot with no change detection, so
# a session told to search `project:gif-*` would have been served whatever that
# repo looked like on the day it was indexed. Devoid is a front end for it and
# its lessons/investigations move independently of this checkout.
GIF="/Applications/Claude Code/Gif-Background-Remover"
if [ -d "$GIF" ]; then
  for spec in \
    "SKILL.md:project:gif-skill" \
    "CLAUDE.md:project:gif-rules" \
    "README.md:project:gif-readme" \
    "gif-deferred-list.md:project:gif-deferred" \
    "gif-resolved-list.md:project:gif-resolved" \
    "scripts/harness/labels/README.md:project:gif-harness-labels"; do
    rel="${spec%%:*}"; src="${spec#*:}"
    context-mode index "$GIF/$rel" --source "$src" --project "$GIF" --ext .md | sed 's/^/  /' | head -1
  done
  for spec in \
    "references:project:gif-references" \
    "docs/investigations:project:gif-investigations" \
    "docs/plans:project:gif-plans" \
    "docs/handoffs:project:gif-handoffs-SUPERSEDED"; do
    rel="${spec%%:*}"; src="${spec#*:}"
    context-mode index "$GIF/$rel" --source "$src" --project "$GIF" --ext .md --max-files 20 --max-depth 2 | sed 's/^/  /' | head -1
  done
  # ⚠️ .py deliberately, and ONLY this file: it is the engine, and its
  # docstrings carry findings no other document repeats. Its STRUCTURE lives in
  # the code graph below, which is the right tool for "what calls this".
  context-mode index "$GIF/scripts/remove_gif_background.py" --source project:gif-engine --project "$GIF" --ext .py | sed 's/^/  /' | head -1
  ~/.local/bin/codebase-memory-mcp cli index_repository --repo_path "$GIF" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("  %s: %d nodes, %d edges" % (d["project"], d["nodes"], d["edges"]))'
else
  echo "  SKIPPED — $GIF is not on this machine"
fi

echo "── product map ───────────────────────────────────────────"
# The map's verdicts go stale the same way: `reconcile` re-runs every node's
# reality checks against the code and OVERRIDES the hand-declared status.
if [ -f "$ROOT/map.yaml" ] && command -v linksee-memory >/dev/null 2>&1; then
  linksee-memory map status 2>&1 | sed -n '1,6p' | sed 's/^/  /'
else
  echo "  (no map.yaml, or linksee-memory not on PATH)"
fi

echo "── verify by QUERY, never by the lines above ─────────────"
echo "  the indexer reports success for a badly-labelled or stale index."
echo "  run one search whose answer you already know:"
echo "    context-mode search 'tri-state control auto' --source project:devoid-rules"

#!/bin/bash
# codebase-memory-nudge.sh — PreToolUse on Bash. Fires when rg looks like a
# symbol hunt over this repo's CODE.
#
# ⚠️ UNMEASURED, and it says so in its own message. The only measured routing rule
# on this machine is ctx_search versus rg on prose; borrowing that number for a
# different claim would be worse than having none. What IS measured is that
# `codebase-index` was never invoked once across 35 sessions while the rule to use
# it sat written down — so the gap this addresses is real even if its size is not.
#
# What the graph gives that rg cannot: CALLERS. `rg 'functionName'` finds the
# definition and the call sites as text; it cannot tell you what breaks if you
# change it, and it cannot see a caller that spells the name differently.
set -uo pipefail
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0
case "$cmd" in *"
"*) exit 0 ;; esac
printf '%s' "$cmd" | grep -qE '(&&|\|\||;)' && exit 0
printf '%s' "$cmd" | grep -qE '(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]' || exit 0

# Aimed at code, not prose — the prose case belongs to ctx-search-nudge.
printf '%s' "$cmd" | grep -qE '(^|[[:space:]"'"'"'])(\./)?(web|server|scripts|lib|main\.js)(/|[[:space:]]|$)' || exit 0

# A symbol hunt: one identifier-shaped token, no spaces. The opposite test to the
# prose nudge, and deliberately so — a multi-word question over code is rare.
seg=$(printf '%s' "$cmd" | sed -E '1,/(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]/ s/.*(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]/rg /')
pat=$(printf '%s' "$seg" | grep -oE "'[^']+'|\"[^\"]+\"" | head -1 | sed -E "s/^['\"]//; s/['\"]$//")
[ -z "$pat" ] && exit 0
case "$pat" in *' '*) exit 0 ;; esac
printf '%s' "$pat" | grep -qE '^[A-Za-z_][A-Za-z0-9_]{3,}$' || exit 0

printf 'CODEBASE-MEMORY NUDGE — "%s" looks like a symbol, and this repo IS in the graph (Applications-Claude-Code-Devoid, 1,406 nodes / 4,105 edges).\n\n  search_graph({ project: "Applications-Claude-Code-Devoid", query: "%s" })\n  trace_path({ project: "Applications-Claude-Code-Devoid", function_name: "%s", direction: "both" })\n\nrg finds the text. The graph finds the CALLERS — what breaks if you change it — which is the question a symbol search is usually really asking.\n\nCONVENTIONS:\n  - `project` is a NAME here, not a path. Three spellings exist for one argument: --repo_path (CLI), project_path (MCP index_repository), project (search_graph/trace_path).\n  - search_graph BEFORE trace_path: tracing needs the exact name.\n  - direction:"both" — "outbound" misses cross-service callers.\n  - The graph is a SNAPSHOT with no change detection. It moved 1,384 -> 1,406 nodes inside one session. Re-index with `npm run refresh:index` after real work.\n\n⚠️ This nudge is UNMEASURED on this corpus. It fires on a narrow shape and never blocks.' \
  "$pat" "$pat" "$pat" \
  | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:.}}'
exit 0

#!/bin/bash
# ctx-search-nudge.sh — PreToolUse on Bash. Fires when rg/grep is aimed at the
# prose corpus context-mode indexes, with a multi-word pattern.
#
# WHY. The refresh hook keeps the index fresh but fires only when ctx_search is
# ALREADY being called — it cannot make anyone call it. That circularity is the
# whole problem, and prose does not solve it: measured across all history on this
# machine, `grep` 788x against `rg` 4x, on a rule that had been written down for
# months. This session's own author broke two written context-mode rules while
# both were loaded.
#
# WHY SO NARROW. A nudge on every Grep would fire constantly — text search is
# usually correct — and a gate that cries wolf is how the real warning gets waved
# through. Scoped to the one case ctx_search measurably wins: a natural-language
# question aimed at docs/. Advisory, never a block.
set -uo pipefail
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Prose that DISCUSSES a search is not a search. Strip heredoc bodies.
cmd=$(printf '%s' "$cmd" | awk '
  /<<-?'"'"'?[A-Za-z_]+'"'"'?/ && !inhd { match($0, /<<-?'"'"'?[A-Za-z_]+'"'"'?/);
    d=substr($0, RSTART, RLENGTH); gsub(/^<<-?'"'"'?|'"'"'$/, "", d); inhd=1; print; next }
  inhd && $0 == d { inhd=0; next }
  !inhd { print }')

# Only a SIMPLE search. Compound and multi-line commands are where pattern
# extraction picks the wrong quoted span, and a misfiring nudge gets filtered.
case "$cmd" in *"
"*) exit 0 ;; esac
printf '%s' "$cmd" | grep -qE '(&&|\|\||;)' && exit 0
printf '%s' "$cmd" | grep -qE '(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]' || exit 0
printf '%s' "$cmd" | grep -qE '(^|[[:space:]"'"'"'])(\./)?(docs)(/|[[:space:]]|$)' || exit 0

# Take the pattern from the search token onward, never the first quoted span in
# the whole command — a preceding echo string would otherwise be read as the pattern.
seg=$(printf '%s' "$cmd" | sed -E '1,/(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]/ s/.*(^|[|;&(]|[[:space:]])(rg|grep|ug)[[:space:]]/rg /')
pat=$(printf '%s' "$seg" | grep -oE "'[^']+'|\"[^\"]+\"" | head -1 | sed -E "s/^['\"]//; s/['\"]$//")
case "$pat" in *' '*) ;; *) [ -n "$pat" ] && exit 0 ;; esac

# A multi-word REGEX is a pattern whose shape the author already knows, not a
# concept. But `.{n}` padding is NOT that — asking rg for surrounding prose is the
# admission that the target is a concept. Strip padding before judging.
stripped=$(printf '%s' "$pat" | sed -E 's/\.\{[0-9]+(,[0-9]*)?\}//g')
case "$stripped" in *'|'*|*'^'*|*'$'*|*'\\'*|*'['*|*'('*|*'.*'*|*'+'*|*'?'*) exit 0 ;; esac
case "$stripped" in *' '*) ;; *) [ -n "$stripped" ] && exit 0 ;; esac

printf 'CTX-SEARCH NUDGE — this is a multi-word search over the prose context-mode indexes.\n\nrg matches literal strings, not concepts. Measured on a comparable corpus: rg returned ZERO files for 3 of 4 natural-language questions; ctx_search answered all four, ranked by section, with the raw bytes never entering context.\n\n  ctx_search({ source: "project:devoid-docs", queries: ["...", "..."] })\n  ctx_search({ source: "project:devoid-rules", queries: ["...", "..."] })   # CLAUDE.md + the trackers\n\nCONVENTIONS, each paid for:\n  - ALWAYS pass source: an unscoped query returns session echo that looks like an answer.\n  - Batch every question into ONE queries array; it counts as a single call against the throttle.\n  - ctx_execute CAPTURES, ctx_search FILTERS. Narrowing inside a ctx_execute discards the rest from the index permanently, for zero context saving.\n\nA PreToolUse hook re-indexes both corpora immediately before any ctx_search, so results are not stale.\n\nrg stays correct when you already know the literal string — this names the alternative, it does not overrule the command.' \
  | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:.}}'
exit 0

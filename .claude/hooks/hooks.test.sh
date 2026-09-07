#!/bin/bash
# Tests for the three PreToolUse hooks. A nudge that cannot stay silent is noise;
# a nudge that cannot fire is decoration. Both directions are asserted.
# ⚠️ A pipe-test proves the SCRIPT works, never that the HOOK fires — that needs a
# real tool call. What this catches is a regex regression and a missing hookEventName,
# which is the failure that silently discards a hook's entire output.
cd "$(dirname "$0")"; pass=0; fail=0
t() { # t <name> <hook> <json> <expect: fire|silent>
  out=$(printf '%s' "$3" | bash "$2" 2>/dev/null)
  if [ "$4" = fire ]; then
    if [ -n "$out" ] && [ "$(printf '%s' "$out" | jq -r '.hookSpecificOutput.hookEventName')" = PreToolUse ]
      then pass=$((pass+1)); else fail=$((fail+1)); echo "  FAIL $1 — expected a PreToolUse payload"; fi
  else
    if [ -z "$out" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "  FAIL $1 — expected silence, got output"; fi
  fi
}
S=ctx-search-nudge.sh; C=codebase-memory-nudge.sh
t "prose: multi-word question at docs/"        $S '{"tool_input":{"command":"rg -n \"tri-state control auto\" docs/"}}'        fire
t "prose: single literal token"                $S '{"tool_input":{"command":"rg -n \"seamCanHelp\" docs/"}}'                   silent
t "prose: regex alternation"                   $S '{"tool_input":{"command":"rg -n \"a|b two words\" docs/"}}'                 silent
t "prose: not aimed at docs/"                  $S '{"tool_input":{"command":"rg -n \"two words here\" web/"}}'                 silent
t "prose: compound command"                    $S '{"tool_input":{"command":"cd x && rg -n \"two words\" docs/"}}'             silent
t "code: symbol at web/"                       $C '{"tool_input":{"command":"rg -n \"renderQuestionRegions\" web/app.js"}}'    fire
t "code: multi-word is not a symbol"           $C '{"tool_input":{"command":"rg -n \"two words\" web/app.js"}}'                silent
t "code: prose path is the other hook's"       $C '{"tool_input":{"command":"rg -n \"foo\" docs/"}}'                           silent
t "code: too short to be a symbol"             $C '{"tool_input":{"command":"rg -n \"abc\" web/app.js"}}'                      silent
t "refresh: ignores a non-ctx_search tool"     ctx-index-refresh.sh '{"tool_name":"Bash"}'                                     silent
echo "hooks: $pass passed, $fail failed"; [ "$fail" -eq 0 ]

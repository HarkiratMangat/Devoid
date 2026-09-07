# Handoff

*Rewritten 2026-09-07 12:06 EDT. ⚠️ This file is EPHEMERAL by design — it gets renamed `<date>-handoff.superseded.md`. Nothing durable may live only here; the four tracked carriers are named in `CLAUDE.md`.*

## §0 — Correction, before anything else

**If your context says the P0 is open, or quotes "25/40, one P0 and five P1s" — that is the state of 2026-09-06 and it is stale.** The P0 is closed. So are ten of the eleven P1s, all ten P2s that were open, and all three P3s.

⚠️ **And do not trust `map status`'s count as coverage.** It read **17/17 verified** all day while its nodes named none of the day's changes — the sheet could have regressed to one tile size, the launch preflight could have vanished, and the map would have stayed green. Three nodes were widened 2026-09-07 12:06 EDT and each new check was falsified. **A verified map means its checks pass, never that its checks are the right ones.**

## State

Branch `feat/devoid-v1`, **never pushed**. `npm test` is new and runs all eleven gates in one command — use it rather than re-listing them.

- ⚠️ **Derive every number, never read one out of prose:** `git rev-list --count main..HEAD` · `npm test` · `rg -c '^### .\[' devoid-deferred-list.md` · `npx -y linksee-memory map status`

## Next

1. **`--analysis-json`** is the one remaining P1 and it is **not ready to build**. Harkirat asked the right question — *"didn't the repo already try going from 3 to 1 and discover it needed 2?"* — and the answer is that the engine makes **1 or 2** `analyze()` calls, never 3, and which one depends on whether the output resizes. **Devoid's default render passes no size target** (`goal.target_kb` starts null, `server/cli.py:90`), so the default path is the same-canvas path where the engine analyses twice. ⚠️ **That is reasoning, not a measurement, and this exact question has produced four wrong answers in the engine repo.** Count the real `analyze()` calls under Devoid's own argv before writing a line.
2. **The density rule's three edges** — a crowd where nothing needs you, a crowd where everything does, and the 40/41 boundary mid-drop. Filed with the reasoning.
3. **The engine repo's README still says Devoid records every answer.** It does not. Filed as its own item; fixing it means a branch in that repo.

## What NOT to carry

- ⚠️ **Do not rebuild the label log.** `PLAN.md` 5.1's original text survives as a record of a good argument that answered the wrong question; its heading now says so.
- ⚠️ **Do not re-file notarisation, self-updates or a screen-reader pass.** Retired with Harkirat's reason in *"Considered and NOT fixed"*. He asked not to be shown them again.
- ⚠️ **Do not read `docs/PLAN.md` stage 5 as an instruction.** It is history with a correction on top.

## The one rule this session paid for

🔴 **A check is not finished when it passes. It is finished when it has been run against the defect and failed.** Eight mistakes in one session were one shape: the artifact was verified, the thing it connects to was not. The worst was shipped code — a first-run installer promising `pip install --user`, which is a hard error inside a virtualenv, into a bundle whose pip had been excluded two commits earlier. Its detector was tested. Its remedy never was.

Where the falsifier was run — the density rule, the tracker gate, `check:design`, the greyscale control pair, the three new map checks — everything held. Where it was skipped, the code was broken.

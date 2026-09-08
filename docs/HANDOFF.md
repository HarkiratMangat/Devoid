# Handoff — 2026-09-07 21:05 EDT

⚠️ **Ephemeral by design.** This file gets renamed `<date>-handoff.superseded.md` and rewritten. Nothing durable may live only here — `devoid-deferred-list.md`, `devoid-resolved-list.md`, `docs/DEVLOG.md` and `docs/CHANGELOG.md` are where work belongs.

## Where the work stands

**Branch `feat/first-run-checks-and-honest-verdict`, proposed as v1.1.0, not pushed.** It began as `docs/conventions-and-banner` and was renamed once its contents outgrew that name — before any PR existed, because renaming a branch with an open PR auto-closes it irrecoverably.

| | |
|---|---|
| the repository | **public** as of this evening. Every link in the README resolves anonymously |
| the engine | **v6.4.1 is published** with its `.skill` attached. Devoid's floor is v6.3.3 and the newest release used to be v6.3.0 — anyone following the README's link got an engine Devoid refuses |
| gates | **16 commands, 15 gates.** `test:deps`, `test:prefs`, `test:ports` and `test_ledger_honesty.py` are new |
| the tracker | 3 items closed, 5 filed |

## What this branch actually changes

**The app tells you what it needs.** A `PATH` defect meant the packaged build could not see Homebrew at all — a Finder-launched app inherits no shell — so it called itself degraded on machines where the tools worked. Fixed, and the first launch now offers to install the three command-line tools and the Python packages. A missing engine, an engine below the floor and missing binaries each get a dialog; all three previously reached stdout and nothing else.

**One update check, for the app and the engine, running on its own.** Daily, silent unless something is newer, one checkbox from off. The premise that forbade it — *"this app talks to nothing"* — had two promises glued together, and only one of them was real.

**The verdict is measured, or it says it isn't.** `_ledger` guessed the background from the source's corner pixel and split artwork from it at a hardcoded 20. It now uses the engine's measured `detected_bg_color` and the engine's own tolerance, and carries `measured: false` when it cannot.

## What is open

1. **Push + PR — asked, and not yet given.** Then merge, then tag `v1.1.0` as a separate command. **No release is proposed**; the published release stays at v1.0.0.
2. **`devoid-deferred-list.md` carries five new items**, two of them `[P1]`: bundling the engine, and a packaged app that cannot be pointed at a different one.
3. The engine repo has three `[P1]`s filed in its own tracker, untouched by this branch.

## The one thing to read before touching anything

`docs/DEVLOG.md`'s newest entries. This branch's real subject is not a feature — it is that **the code kept documenting its own uncertainty and the documents above it kept deleting it**, in eleven places. The generator is named there: *this project rewards stating reasons, so a structure that demands one always receives one, including where the truth is "nobody built it".*

# Contributing to Devoid

Thanks for looking. This file is short on ceremony and specific about the two or three things that will actually get a change rejected.

## Before you write anything

**Read [`docs/DEVLOG.md`](docs/DEVLOG.md)'s Traps section.** Every entry in it is a mistake someone already made here, usually more than once, and several of them look like sensible engineering right up until they cost a day. The one that catches people most often: a browser pane is not the app, and it lies quietly.

**Check [`devoid-deferred-list.md`](devoid-deferred-list.md).** It holds the open work *and* a section of things that were considered and deliberately not done, with reasons. If your idea is in that second section, the reason is there too — argue with it rather than around it.

**Set up from [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).** It has the Homebrew binaries the engine needs, which are easy to miss.

## The one rule that is not negotiable

**A check is not finished when it passes. It is finished when it has been run against the defect it exists to catch, and has failed.**

If you add a test or a gate, break the thing it guards and watch it go red before you ship it. This is not a style preference. In one session here, eight separate mistakes had the same shape — the artifact was verified and the thing it connects to was not — and the ones caught were caught exactly this way. Two real examples from this repository:

- A UI gate set `state: 'needs-you'` on a cloned asset for a day. The code that decides that state never reads that field. The assertion passed anyway, because the test corpus happened to contain an asset that genuinely needed an answer.
- Two tests passed against their own injected defects on the first draft: one compared a function with itself, and one short-circuited before reaching the branch it was named after.

Both look like coverage in a diff. Neither was.

## What a change has to clear

```sh
npm test
```

Twelve commands, eleven gates, and **the order is load-bearing** — the UI gate writes the captures the greyscale gate then measures. They are listed with what each one asks in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#tests).

Two of them fail for reasons that are not about your code, so read the message rather than the exit code:

- `check:design` asks git what changed and runs a design detector over it. A new colour or radius that is not in `docs/DESIGN.md` fails it. Document the value or use the token.
- `check:tracker` enforces that closing an item in `devoid-deferred-list.md` adds it to `devoid-resolved-list.md`. **One out equals one in, never a deletion.**

## Conventions

**Commits** are [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), the eleven standard types only: `<type>(<scope>): <description>`, imperative, lowercase, no trailing period. Branches are `<type>/<kebab-description>`.

**Markdown is soft-wrapped** — one physical line per paragraph or list item, no hard wrapping at 80 columns. `npm test` does not check this; the maintainer's reflow script does.

**Timestamps** in documents and comments are `YYYY-MM-DD HH:MM TZ`, never a bare date. Compute them; do not type them.

**`main` only ever advances through a pull request**, squash-merged, one version number and one tag per merge. The versioning bars, and how to decide which tier a change is, are in [`CLAUDE.md`](CLAUDE.md).

## Documentation is part of the change, not a follow-up

**Anything measured belongs in the documents with its numbers.** This project's history is that unmeasured design claims are wrong about a third of the time, so a claim without a measurement behind it will be asked for one.

Where things go:

| what | where |
|---|---|
| open work, and decisions not to do something | `devoid-deferred-list.md` |
| what shipped | `docs/CHANGELOG.md` |
| the trap you fell into, and what you tried that did not work | `docs/DEVLOG.md` |
| a visual decision, with the measurement behind it | `docs/DESIGN.md` |
| anything about the `/api/*` surface | `docs/API-CONTRACT.md`, in the same commit as the code |

⚠️ **`docs/HANDOFF.md` is ephemeral** — it gets renamed and rewritten. Nothing durable may live only there.

## Two product rules that reject otherwise-good code

**Never add a control that maps one-to-one onto an engine option.** The engine has 63 of them and the entire point is that nobody using this app learns them. New surface belongs in a goal the app asks about, or in a question it asks — never as a passthrough.

**Never infer a size target, and never report a verification the run did not earn.** Both are measured failure modes with history behind them. *Not checked* is a first-class state with the same visual weight as done and failed.

## Licensing your contribution

Devoid is **GPL-3.0-or-later**. By opening a pull request you are offering your contribution under that licence, which is the ordinary inbound-equals-outbound arrangement most projects use. There is no CLA and no DCO sign-off to add.

If you are contributing something you did not write, say where it came from and under what licence, in the pull request rather than in a commit message.

## Reporting a problem instead

[Open an issue](https://github.com/HarkiratMangat/Devoid/issues). If the engine is involved, launch from a terminal (`/Applications/Devoid.app/Contents/MacOS/Devoid`) and include the console output — the engine and port diagnostics only go there, which is itself a filed defect.

## Behaviour

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). It is four lines and none of them will surprise you.

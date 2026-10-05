A button is a 1px outline on `score-2`, `r` radius, `meta` text. The primary is the one action that finishes the job and takes a `cyan` fill with `go-ink` text, bold.

- One `.btn.go` per view. Everything else is the outlined default.
- Labels are verb-first, sentence case, no full stop: "Cut it out", "Keep it".
- Never use `ruby` for a button fill: destroying artwork and removing the background are the same act, and the wipe already shows it.
- The consumer supplies the label and the click handler. Hover is `raise`; press scales to .97.

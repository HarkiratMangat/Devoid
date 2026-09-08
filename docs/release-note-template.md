# Release note template

*Established 2026-09-08, from the v1.1.0 release note. The GitHub Release page renders the same GFM the README does — badges, `> [!ALERT]` blocks, `<details>`, HTML all work — but the earlier v1.1.0 body used none of that discipline and ran 65 lines, burying the `.dmg` download below the fold. This is the fix, kept as a convention rather than re-derived per release.*

**The release TITLE is just the version — `--title vX.Y.Z`, nothing else.** `v1.1.0 — the engine ships inside the app, and the verdict is measured` was the first release's title, and it's wrong: a title gets truncated everywhere it actually matters — the releases list, browser tabs, notifications, `gh release list` — so a sentence-length title reads as cut-off half-information in exactly the places a title is supposed to be a title. Harkirat: *"if it's genuinely something important to state in the title, keep it short, like 1-4 words... it gets cut off nearly everywhere useful."* The headline sentence belongs in the BODY (the `**vX.Y.Z** — ...` line below), where there's room for it and nothing truncates it. Only add 1-4 words to the title itself for something that would change whether someone opens the release at all — a security fix, a breaking change — and even then it's `vX.Y.Z — security fix`, not a description of what changed.

**Copy the block below into `gh release create`/`gh release edit`'s `--notes-file`, fill the placeholders, delete anything that doesn't apply, keep everything else.**

```markdown
<p>
<a href="https://github.com/HarkiratMangat/Devoid/releases/latest"><img src="https://img.shields.io/badge/vX.Y.Z-4A3B52?style=flat-square" alt="vX.Y.Z"></a>
<a href="https://github.com/HarkiratMangat/Devoid/blob/main/README.md"><img src="https://img.shields.io/badge/README-FFE9B8?style=flat-square" alt="README"></a>
<a href="https://github.com/HarkiratMangat/Devoid/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HarkiratMangat/Devoid?style=flat-square&label=&color=3D4451" alt="licence"></a>
</p>

**vX.Y.Z** — <one sentence, the release's own headline, in the product's words — not a restated version number>

<details>
<summary>What's in this release</summary>

- **<headline change>** — <one line>
- **<headline change>** — <one line>

</details>

Full write-up — every defect found and fixed — is in [`docs/CHANGELOG.md`](https://github.com/HarkiratMangat/Devoid/blob/main/docs/CHANGELOG.md).

> [!IMPORTANT]
> First launch: **right-click Devoid → Open → Open** (unsigned, self-signed cert — see the [README](https://github.com/HarkiratMangat/Devoid/blob/main/README.md) for other ways to open it).

---

<div align="center"><sub>♡ Made with love by <a href="https://discord.com/users/1139845545754632283">dior</a></sub></div>
```

## Rules that make this a convention, not a one-off

- **The badge row is fixed in shape and color, NOT in content.** Same three badges, same colors (`4A3B52` version · `FFE9B8` README · `3D4451` license), same order, every release — `4A3B52`/`3D4451` are the exact values `README.md`'s own badge row uses; `FFE9B8` (`accretion-gold`, `docs/DESIGN.md`) is reserved for the README badge specifically, so it never collides with the other two. Don't invent a new color per release.
- ⚠️ **THE VERSION BADGE MUST BE STATIC, NEVER `github/v/release` (corrected 2026-09-08).** `img.shields.io/github/v/release/...` queries GitHub live and always resolves to whatever is CURRENTLY the newest release — used inside a release note, that means every past release's own page silently updates to show the NEWEST version's badge the moment a new one ships, misrepresenting its own history. Harkirat, catching it on v1.0.0 and v1.1.0 both showing "v1.2.0" the day v1.2.0 shipped: *"we can't use a dynamic badge because it also updates the badge on prior release notes."* Use `img.shields.io/badge/vX.Y.Z-4A3B52?style=flat-square` instead — a literal string baked into the URL, filled in per release, that can never drift. The dynamic `github/v/release` badge is still correct in `README.md`, which is a living document that SHOULD always say "latest"; it is wrong everywhere it would be frozen into a specific version's own page.
- **The body stays short. The CHANGELOG carries the detail.** This file is bullets and one sentence; `docs/CHANGELOG.md` is where the defects, the measurements and the reasoning live. If a release note needs a table or a multi-paragraph explanation, that content belongs in the CHANGELOG entry, linked from here — not inlined.
- **The bullets go in the `<details>`, not loose in the body.** That's what keeps the `.dmg` download visible without scrolling on the releases page.
- **The `[!IMPORTANT]` block is fixed, not conditional.** Same unsigned-app / right-click-to-open text, every release — most people land on the releases page, not the README, so this is the one place that first-run instruction is guaranteed to reach them. Only revise its wording the day signing actually changes (a paid Apple ID, notarisation); don't drop it "because it's not new."
- **The footer is the same every time**, verbatim.
- **The release title is `vX.Y.Z`, full stop — not the headline sentence.** That sentence lives in the body, where it isn't truncated. `gh release edit <tag> --title vX.Y.Z`.

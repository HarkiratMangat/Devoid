# Release note template

*Established 2026-09-08, from the v1.1.0 release note. The GitHub Release page renders the same GFM the README does — badges, `> [!ALERT]` blocks, `<details>`, HTML all work — but the earlier v1.1.0 body used none of that discipline and ran 65 lines, burying the `.dmg` download below the fold. This is the fix, kept as a convention rather than re-derived per release.*

**Copy the block below into `gh release create`/`gh release edit`'s `--notes-file`, fill the placeholders, delete anything that doesn't apply, keep everything else.**

```markdown
<p>
<a href="https://github.com/HarkiratMangat/Devoid/releases/latest"><img src="https://img.shields.io/github/v/release/HarkiratMangat/Devoid?style=flat-square&label=&color=4A3B52" alt="latest release"></a>
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

- **The badge row is fixed.** Same three badges, same colors (`4A3B52` version · `FFE9B8` README · `3D4451` license), same order, every release — `4A3B52`/`3D4451` are the exact values `README.md`'s own badge row uses; `FFE9B8` (`accretion-gold`, `docs/DESIGN.md`) is reserved for the README badge specifically, so it never collides with the other two. Don't invent a new color per release.
- **The body stays short. The CHANGELOG carries the detail.** This file is bullets and one sentence; `docs/CHANGELOG.md` is where the defects, the measurements and the reasoning live. If a release note needs a table or a multi-paragraph explanation, that content belongs in the CHANGELOG entry, linked from here — not inlined.
- **The bullets go in the `<details>`, not loose in the body.** That's what keeps the `.dmg` download visible without scrolling on the releases page.
- **The `[!IMPORTANT]` block is fixed, not conditional.** Same unsigned-app / right-click-to-open text, every release — most people land on the releases page, not the README, so this is the one place that first-run instruction is guaranteed to reach them. Only revise its wording the day signing actually changes (a paid Apple ID, notarisation); don't drop it "because it's not new."
- **The footer is the same every time**, verbatim.

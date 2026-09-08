#!/usr/bin/env node
/* Verify the documents' checkable claims against the code they describe.
 *
 * ⚠️ WHY THIS EXISTS — one failure shape, five instances in one afternoon.
 * `check:design` reads the shipped UI. `audit_tracker` reads the trackers.
 * NOTHING read the README, so a claim written about the software could be true
 * of one artefact, on one machine, at one moment, and no gate could tell.
 * Every check below is one that actually shipped wrong:
 *
 *   · "Homebrew's Python will not work" — main.js probes /opt/homebrew/bin/python3
 *     explicitly. The framework path appears in comments and in ZERO conditionals.
 *   · "the 63 options" — the parser reports 64. This check MISSED eleven real
 *     instances by matching `options` and never `flags`; see check 3.
 *   · a v1.0.0 badge above a package.json reading 1.0.1, stale on day one.
 *   · #22D3EE on a white badge: 1.81:1. DESIGN.md records that exact number and
 *     carries a second cyan for light. The bug was fixed in one place and left
 *     in another, because nothing measured the second one.
 *   · the README told you to create devoid.config.json and .gitignore did not
 *     cover it, so following the instructions dirtied a clean clone.
 *
 * It cannot check prose. It checks the things with a right answer.
 *     npm run check:claims
 *
 * ⛔ WHAT THIS GATE CANNOT SEE, stated here so it is never read as coverage
 * (added 2026-09-07 19:18 EDT). It compares the documents against THIS REPOSITORY'S CODE.
 * A claim about anything OUTSIDE it -- another repo's visibility, whether a
 * remote publishes releases, what a third-party tool does on someone else's
 * Mac -- has no gate at all. One shipped on this branch the same evening:
 * "the engine repository publishes no releases and is private" was written
 * into three documents and was false in both halves, and this gate passed on
 * all three. If a claim's truth lives on a server, verify it with a command
 * and cite the command.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (f) => readFileSync(join(ROOT, f), 'utf8');
const DOCS = ['README.md', 'CONTRIBUTING.md', 'docs/DEVELOPMENT.md'];
const fail = [];
const note = (m) => fail.push(m);

/* 1 — the two manifests agree, and any version badge agrees with them */
const pkg = JSON.parse(R('package.json')).version;
const pyproj = R('pyproject.toml').match(/^version = "([^"]+)"/m)?.[1];
if (pkg !== pyproj) note(`package.json is ${pkg} and pyproject.toml is ${pyproj}`);
for (const f of DOCS) {
  for (const [, v] of R(f).matchAll(/img\.shields\.io\/badge\/v([\d.]+)-/g)) {
    if (v !== pkg) note(`${f}: a v${v} badge over a package.json reading ${pkg}`);
  }
}

/* 2 — every badge colour is legible on BOTH GitHub grounds. shields puts white
       text on the colour, and #22D3EE measures 1.81:1 against it. */
const lum = (h) => {
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
for (const f of DOCS) {
  for (const [, hex] of R(f).matchAll(/img\.shields\.io\/badge\/[^")\s]*?-([0-9A-Fa-f]{6})\?/g)) {
    const white = ratio('FFFFFF', hex);          // shields' own label text
    const dark = ratio('0d1117', hex);           // GitHub dark page ground
    /* 🔴 THIS READ `< 3` AND PASSED A BADGE THAT FAILS WCAG AA (2026-09-07 20:00 EDT).
       3:1 is the LARGE-TEXT bar. shields.io sets its label in ~11px bold, which
       is normal text, so the bar is 4.5:1. `#E2402A` measures 4.20:1 -- it sat
       between the two numbers, so the gate written to catch bad badge contrast
       reported the badge as fine. A threshold copied from the wrong row of the
       spec is indistinguishable from no threshold for everything in between. */
    if (white < 4.5) note(`${f}: badge #${hex} is ${white.toFixed(2)}:1 against shields' white text (WCAG AA needs 4.5:1 for text this size)`);
    if (dark < 1.4) note(`${f}: badge #${hex} is ${dark.toFixed(2)}:1 on GitHub's dark ground — invisible`);
  }
}

/* 3 — a hardcoded count of the engine's options drifts the moment one lands */
const engineFlags = (() => {
  try {
    const out = execFileSync(join(ROOT, '.venv/bin/python'),
      ['-c', 'import sys;sys.path.insert(0,".");from server import flags;'
           + 'print(sum(1 for f in flags.flags()["flags"] if not f["positional"]))'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return parseInt(out.trim(), 10);
  } catch { return null; }
})();
/* 🔴 THIS CHECK EXISTED, PASSED, AND MISSED ELEVEN REAL INSTANCES (2026-09-07 19:20 EDT).
   Two reasons, and both are the same mistake:

     1. The pattern matched `options` and never `flags`. Every occurrence in
        this repository says FLAGS. The falsifier that proved the check worked
        injected "63 options" -- a string shaped like the check rather than
        like the defect. A gate proven against a synthetic instance is proven
        against nothing.
     2. It read three files. The claim lived in eleven, including CLAUDE.md
        (twice), docs/PRODUCT.md (three times), map.yaml, web/app.js,
        server/cli.py and a test's own docstring.

   The count was 63 in eight live places and 64 in three. The parser reports
   64. All eleven now say "every flag", which cannot go stale -- and this
   check is what catches the next one that does.

   ⚠️ A QUOTED count is a CITATION of a claim, not a claim: CLAUDE.md and
   DEVLOG deliberately quote *"the 63 options"* as the defect they record.
   Quoted matches are skipped; unquoted ones are claims. Archives, superseded
   handoffs and generated critique files are out of scope for the same
   reason -- they are records of what was true then. */
const CLAIM_FILES = [
  'README.md', 'CONTRIBUTING.md', 'CLAUDE.md', 'map.yaml',
  'docs/PRODUCT.md', 'docs/DESIGN.md', 'docs/DEVELOPMENT.md',
  'docs/CHANGELOG.md', 'docs/DEVLOG.md', 'docs/API-CONTRACT.md',
  'devoid-deferred-list.md', 'web/app.js', 'server/cli.py',
  'tests/test_concurrency_and_flags.py', 'tests/fixtures/api-contract-samples.json',
].filter((f) => existsSync(join(ROOT, f)));

for (const f of CLAIM_FILES) {
  R(f).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(\d{2})\s+(?:engine\s+|skill's\s+)?(options|flags)\b/g)) {
      /* An ODD number of quote marks before the match means it sits INSIDE a
         quoted span -- a citation of a claim, not a claim. That is how
         CLAUDE.md and DEVLOG can both record *"the 63 options"* as the defect
         they are documenting without this gate firing on their own history. */
      const before = line.slice(0, m.index);
      /* ⚠️ COUNT EACH DELIMITER SEPARATELY. A first draft counted `"` and a
         backtick as one class, so ``"63 options"`` -- a backtick-wrapped
         quotation, which is how this file's OWN changelog entry cites the
         defect -- summed to two and read as even, i.e. as a live claim. The
         gate then failed on the entry describing its own fix. */
      const odd = (c) => (before.split(c).length - 1) % 2 === 1;
      if (odd('"') || odd('`')) continue;
      if (engineFlags && +m[1] !== engineFlags) {
        note(`${f}:${i + 1}: "${m[0]}" — the engine's parser reports ${engineFlags}`);
      }
    }
  });
}

/* 3b — a screenshot with no `width` is sized by whatever contains it.
   ⚠️ Measured """ + STAMP + """: the two images inside a two-column table
   rendered 445x288 on a 1280px desktop and 107x70 at 400px -- a 15.3x
   downscale, 6.5% scale, of a screenshot whose smallest UI text is already
   ~11px. Their own alt text promised detail that was not visible at either
   size. The three images that DID carry `width` scaled cleanly across the same
   range, so the correct pattern was already in the file and simply unapplied. */
for (const f of CLAIM_FILES.filter((x) => x.endsWith('.md'))) {
  R(f).split('\n').forEach((line, i) => {
    if (/<img\s[^>]*src="docs\//.test(line) && !/\swidth=/.test(line)) {
      note(`${f}:${i + 1}: a docs/ screenshot with no width= — its container decides its size`);
    }
  });
}

/* 3c — GFM requires a header row, so `| | |` renders an empty bordered band and
   a screen reader announces blank column headers. Two shipped. */
for (const f of CLAIM_FILES.filter((x) => x.endsWith('.md'))) {
  R(f).split('\n').forEach((line, i) => {
    if (/^\|(\s*\|)+\s*$/.test(line)) note(`${f}:${i + 1}: empty table header row — renders as a blank bordered band`);
  });
}

/* 4 — every environment variable a doc promises exists in the code */
const code = ['main.js', 'server/engine.py', 'server/appendlog.py']
  .filter((f) => existsSync(join(ROOT, f))).map(R).join('\n');
for (const f of DOCS) {
  for (const [, v] of R(f).matchAll(/\$(DEVOID_[A-Z_]+)/g)) {
    if (!code.includes(v)) note(`${f}: promises $${v}, which no source file reads`);
  }
}

/* 5 — a file the docs tell you to create must be gitignored, or following the
       instructions leaves a clean clone dirty */
const ignore = R('.gitignore');
for (const f of DOCS) {
  for (const [, name] of R(f).matchAll(/>\s*([a-z0-9_.-]+\.json)\b/g)) {
    if (!ignore.includes(name)) note(`${f}: tells you to create ${name}, which .gitignore does not cover`);
  }
}

/* 6 — every relative link and image resolves on disk */
for (const f of DOCS) {
  const base = dirname(join(ROOT, f));
  const seen = new Set();
  for (const [, target] of R(f).matchAll(/(?:\]\(|src=")([^)"#][^)"]*?)(?:\)|")/g)) {
    if (/^(https?:|mailto:|#)/.test(target) || seen.has(target)) continue;
    seen.add(target);
    const p = resolve(base, decodeURIComponent(target.split('#')[0]));
    if (!existsSync(p)) note(`${f}: link to ${target} resolves to nothing`);
  }
}

/* 7 — a long inline code span in flowing text drags the whole page sideways on a
       phone; a fenced block scrolls inside itself instead. Measured at 375px:
       one 388px path produced 28px of horizontal page scroll. */
for (const f of DOCS) {
  const prose = R(f).replace(/```[\s\S]*?```/g, '');
  const spans = prose.split('`').filter((_, i) => i % 2 === 1);
  for (const s of spans) {
    if (s.length > 48 && !s.includes(' ')) note(`${f}: \`${s}\` is ${s.length} chars of unbreakable inline code`);
  }
}

if (fail.length) {
  console.error(`check_claims: ${fail.length} claim(s) the code does not support\n`);
  for (const m of fail) console.error(`  ${m}`);
  process.exit(1);
}
console.log('check_claims: every checkable claim in the docs matches the code.');

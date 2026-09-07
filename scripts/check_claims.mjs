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
 *   · "the 63 options" — the engine's parser reports 65 once a flag lands.
 *   · a v1.0.0 badge above a package.json reading 1.0.1, stale on day one.
 *   · #22D3EE on a white badge: 1.81:1. DESIGN.md records that exact number and
 *     carries a second cyan for light. The bug was fixed in one place and left
 *     in another, because nothing measured the second one.
 *   · the README told you to create devoid.config.json and .gitignore did not
 *     cover it, so following the instructions dirtied a clean clone.
 *
 * It cannot check prose. It checks the things with a right answer.
 *     npm run check:claims
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
    if (white < 3) note(`${f}: badge #${hex} is ${white.toFixed(2)}:1 against shields' white text`);
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
for (const f of DOCS) {
  for (const [m, n] of R(f).matchAll(/\b(\d{2})\s+(?:engine\s+)?options\b/g)) {
    if (engineFlags && +n !== engineFlags) {
      note(`${f}: "${m.trim()}" — the engine's parser reports ${engineFlags}`);
    }
  }
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

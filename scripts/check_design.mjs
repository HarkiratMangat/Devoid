#!/usr/bin/env node
/* CLAUDE.md's design contract, as a command instead of a paragraph.
 *
 * ⚠️ WHY THIS EXISTS (2026-09-07 01:31 EDT). `/impeccable hooks on` was run and
 * reports `state: enabled`, and the manifest in `.claude/settings.local.json`
 * fires — verified live, four findings on a deliberately defective file. But
 * its matcher is `Edit|Write`, and THIS REPO'S EDITS GO THROUGH `python3`
 * HEREDOCS IN Bash, which that matcher never sees. The Stop deep pass is no
 * help either: it scans "every UI file touched this session", and touched is
 * populated by the same PostToolUse pass. So the hook covers the edits a
 * session makes with the dedicated tools and is blind to the way most of this
 * repo's edits are actually made.
 *
 * This closes it from the other side: it asks git what changed, not the
 * harness what it saw, so it is indifferent to how the bytes got there.
 *
 * The contract: EXACTLY ONE finding, `repeating-stripes-gradient` — the alpha
 * checkerboard, accepted in DESIGN.md because a checkerboard IS how
 * transparency is drawn. ⚠️ A DEGRADED run returns `[]` while saying so on the
 * line above, and on a CSS-only argument list it does not say so at all; that
 * is what `npm run check:detector` is for, and this refuses a degraded run too.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DETECT = join(process.env.HOME, '.claude/skills/impeccable/scripts/detect.mjs');
const UI = /\.(html|css|jsx?|tsx?|vue|svelte|astro|scss|sass|less)$/;
const ACCEPTED = {"repeating-stripes-gradient": 1};
/* always scanned, changed or not — the contract is about the shipped surface */
/* ⚠️ NOT SHIPPED SURFACE, so not under the contract: `scripts/fixtures/` is the
   detector canary, whose whole job is to be defective, and `tests/` holds the
   wipe harness — a fixture page with a deliberately unset <img src> and its own
   throwaway type sizes. Scanning them made the first run of this file fail on
   three findings that are all correct readings of the wrong files. Anything
   added here needs a reason like these two, not a wish for a green run. */
const SKIP = ['scripts/fixtures/', 'tests/'];
const CORE = ['web/index.html', 'web/app.css', 'web/app.js', 'web/advice.js', 'web/canvas.js', 'web/wipe.js'];

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\n'); }
  catch { return []; }
};
const changed = [...git(['diff', '--name-only', 'main...HEAD']), ...git(['status', '--porcelain'])
  .map((l) => l.slice(3).trim())];
const files = [...new Set([...CORE, ...changed])]
  .filter((f) => f && UI.test(f) && existsSync(join(ROOT, f)) && !SKIP.some((p) => f.startsWith(p)))
  .map((f) => join(ROOT, f));

let raw = '';
try { raw = execFileSync('node', [DETECT, '--json', ...files], { encoding: 'utf8' }); }
catch (e) { raw = (e.stdout || '') + (e.stderr || ''); }

if (/DEGRADED/i.test(raw)) {
  console.error('check_design: the detector ran DEGRADED — its parser deps are missing, so this proves nothing.');
  process.exit(1);
}
let findings;
try { findings = JSON.parse(raw.slice(raw.indexOf('['))); } catch { findings = null; }
if (!Array.isArray(findings)) {
  console.error('check_design: could not parse the detector output.');
  console.error(raw.slice(0, 400));
  process.exit(1);
}

const counts = {};
for (const f of findings) counts[f.antipattern] = (counts[f.antipattern] || 0) + 1;
const rules = [...new Set([...Object.keys(counts), ...Object.keys(ACCEPTED)])].sort();
const bad = rules.filter((r) => (counts[r] || 0) !== (ACCEPTED[r] || 0));

console.log(`check_design: ${files.length} UI file(s) scanned`);
for (const r of rules) console.log(`  ${r}: ${counts[r] || 0} (accepted ${ACCEPTED[r] || 0})`);
if (bad.length) {
  console.error('\ncheck_design: FAILED — the shipped surface does not match the contract.');
  for (const r of bad) {
    for (const f of findings.filter((x) => x.antipattern === r)) {
      console.error(`  ${r}  ${f.file.replace(ROOT + '/', '')}:${f.line}  ${f.snippet}`);
    }
    if (!counts[r]) console.error(`  ${r}  expected ${ACCEPTED[r]} and saw none — an accepted finding disappearing is also a change`);
  }
  process.exit(1);
}
console.log('check_design: exactly the accepted findings, and nothing else.');

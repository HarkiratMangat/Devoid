#!/usr/bin/env node
/* Prove the detector can report PRESENCE before trusting any absence.
 *
 * ⚠️ WHY THIS EXISTS (2026-09-07 00:56 EDT). `CLAUDE.md` makes the design detector a
 * gate -- exactly one finding -- and says an empty result only counts when the
 * header does not say DEGRADED. That safeguard does not cover the most common
 * invocation shape: on a CSS-ONLY argument list the tool printed a bare `[]`
 * with NO banner at all when htmlparser2 / css-select / css-tree / domutils
 * were missing. So the documented protection read as a pass over a detector
 * that had checked nothing, and every result quoted before those deps were
 * installed is unverified.
 *
 * The fixture carries a repeating gradient, an off-palette colour, an
 * off-scale radius and Comic Sans. If THIS returns nothing, the instrument is
 * broken and no absence it reports anywhere else means a thing.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DETECT = join(process.env.HOME, '.claude/skills/impeccable/scripts/detect.mjs');
const FIXTURE = join(HERE, 'fixtures', 'detector-canary.css');

let raw = '';
try {
  raw = execFileSync('node', [DETECT, '--json', FIXTURE], { encoding: 'utf8' });
} catch (e) {
  // the detector exits non-zero WHEN IT FINDS THINGS, which is the pass case
  raw = (e.stdout || '') + (e.stderr || '');
}

if (/DEGRADED/i.test(raw)) {
  console.error('check_detector: the detector reported DEGRADED — its parser deps are missing.');
  console.error(raw.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

const start = raw.indexOf('[');
let findings = null;
try { findings = JSON.parse(raw.slice(start)); } catch { /* handled below */ }

if (!Array.isArray(findings)) {
  console.error('check_detector: could not parse the detector output as JSON.');
  console.error(raw.slice(0, 400));
  process.exit(1);
}

if (findings.length === 0) {
  console.error('check_detector: THE FIXTURE RETURNED ZERO FINDINGS.');
  console.error('  It carries a repeating gradient, #FF00FF, border-radius:17px and Comic Sans.');
  console.error('  An empty result here means the detector is not reading anything, so no');
  console.error('  empty result it gives for the real files can be trusted either.');
  process.exit(1);
}

const rules = [...new Set(findings.map((f) => f.antipattern))].sort();
console.log(`check_detector: the instrument reports presence — ${findings.length} finding(s) on the canary`);
console.log(`  rules that fired: ${rules.join(', ')}`);

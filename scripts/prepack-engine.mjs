#!/usr/bin/env node
/* Copy the engine into build/engine/ so electron-builder can ship it.
 *
 * Added 2026-09-07 21:31 EDT. The engine is ONE 636 KB Python file whose only third-party
 * imports -- numpy, PIL, scipy -- already ship inside this bundle at 149 MB of
 * ~170 MB. Not shipping it meant a `.dmg` user had a working app only if they
 * also cloned a second repository and pointed the app at it by hand.
 *
 * ⚠️ IT IS THE LAST FALLBACK, NEVER THE FIRST. server/engine.py checks
 * $DEVOID_SKILL, devoid.config.json and the documented path before this copy,
 * so a developer testing an engine change still does not rebuild Devoid.
 *
 * ⚠️ LGPL-3.0-or-later REQUIRES THE LICENCE TO TRAVEL WITH THE COPY, and both
 * texts are needed: LGPLv3 is a set of additional permissions on top of GPLv3,
 * so COPYING and COPYING.LESSER ship together. Same obligation the fonts have.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'engine');

/** The same order server/engine.py resolves in, minus the bundled copy itself. */
function findEngine() {
  const env = process.env.DEVOID_SKILL;
  if (env && fs.existsSync(env)) return env;
  const cfg = path.join(ROOT, 'devoid.config.json');
  if (fs.existsSync(cfg)) {
    try {
      const p = JSON.parse(fs.readFileSync(cfg, 'utf8')).skill_path;
      if (p && fs.existsSync(p)) return p;
    } catch { /* an unreadable config is not a reason to stop */ }
  }
  const documented = '/Applications/Claude Code/Gif-Background-Remover/scripts/remove_gif_background.py';
  return fs.existsSync(documented) ? documented : null;
}

const engine = findEngine();
if (!engine) {
  /* ⚠️ A HARD FAILURE, not a warning. A build that silently ships no engine
     produces a .dmg that cannot do the one thing it is for, and nothing in the
     build output would say so. */
  console.error('prepack-engine: no engine found. Set $DEVOID_SKILL or clone');
  console.error('  https://github.com/HarkiratMangat/gif-background-remover');
  process.exit(1);
}

const repo = path.dirname(path.dirname(engine));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(engine, path.join(OUT, 'remove_gif_background.py'));

/* ⚠️ Both texts, or the package is a licence violation rather than a build. */
let licences = 0;
for (const name of ['COPYING', 'COPYING.LESSER']) {
  const src = path.join(repo, name);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(OUT, name)); licences += 1; }
}
if (licences !== 2) {
  console.error('prepack-engine: found ' + licences + ' of 2 licence texts in ' + repo + '.');
  console.error('  LGPLv3 is additional permissions ON TOP OF GPLv3, so a copy needs both.');
  process.exit(1);
}

let version = '';
try {
  version = execFileSync('git', ['-C', repo, 'describe', '--tags', '--abbrev=0'],
    { encoding: 'utf8', timeout: 5000 }).trim();
} catch { /* not a checkout, or no tags */ }
if (!/^v?\d+(\.\d+)*$/.test(version)) {
  console.error('prepack-engine: could not read a version tag from ' + repo + '.');
  console.error('  The bundled engine would then have no version for the update check.');
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, 'VERSION'), version + '\n');

const kb = Math.round(fs.statSync(path.join(OUT, 'remove_gif_background.py')).size / 1024);
console.log('prepack-engine: ' + version + ' (' + kb + ' KB) + ' + licences + ' licence texts -> build/engine/');
console.log('  from ' + engine);

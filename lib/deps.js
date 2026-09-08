/* What the engine needs from the machine, as pure logic so it can be tested.
 * main.js cannot be required without booting Electron, so anything left in
 * there is untestable -- the same reason lib/versions.js exists.
 *
 * 🔴 THE DEFECT THAT PUT THIS FILE HERE (2026-09-07 18:54 EDT). `startServer`
 * passed `{ ...process.env }` to the Python server. An app launched from Finder
 * inherits PATH=/usr/bin:/bin:/usr/sbin:/sbin -- your shell's PATH is set by
 * your shell, and Finder never runs one. Homebrew installs into
 * /opt/homebrew/bin, which is on NEITHER list. So `shutil.which("gifsicle")`
 * in server/engine.py returned None in the PACKAGED app on a machine where
 * gifsicle was installed and working, and Devoid reported itself degraded for
 * a reason that was not true. Invisible from a checkout, because `npm start`
 * runs under a shell that already fixed PATH.
 *
 * ⚠️ It is the session's own named class: TRUE OF ONE MACHINE AT ONE MOMENT,
 * written as a property of the software. The tell was the same one -- the tool
 * names appear in engine.py's REQUIRED_BINARIES and in three documents, and in
 * no code that says where they live.
 */
'use strict';

/* Homebrew's two prefixes: Apple silicon and Intel. Neither is on a
   Finder-launched app's PATH. */
const TOOL_DIRS = ['/opt/homebrew/bin', '/usr/local/bin'];

/* ⚠️ The binary is `webpmux`; the formula is `webp`. A dialog that told you to
   `brew install webpmux` would name a formula that does not exist. */
const BREW_FORMULA = { gifsicle: 'gifsicle', pngquant: 'pngquant', webpmux: 'webp' };

/** The engine version below which Devoid cannot read the option list. */
const ENGINE_FLOOR = '6.3.3';

/** PATH with Homebrew's prefixes appended -- only the ones that exist, and
 *  never a duplicate, so a shell-launched run is unchanged. */
function toolPath(basePath, exists) {
  const base = String(basePath || '').split(':').filter(Boolean);
  const extra = TOOL_DIRS.filter((d) => exists(d) && !base.includes(d));
  return [...base, ...extra].join(':');
}

/** The brew formulae for a set of missing binaries: mapped, deduped, sorted. */
function brewFormulae(missing) {
  const out = new Set();
  for (const b of missing) if (BREW_FORMULA[b]) out.add(BREW_FORMULA[b]);
  return [...out].sort();
}

/** Homebrew itself, by absolute path for the same PATH reason. */
function findBrew(exists) {
  for (const c of ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']) if (exists(c)) return c;
  return null;
}

/** Read /api/engine/status into a verdict.
 *
 *  ⚠️ `available: false` has TWO causes -- no engine, or a missing Python
 *  module -- and a missing BINARY sets it not at all. Three different
 *  sentences, so the verdict separates them rather than collapsing to a
 *  boolean. `avif` appears in `missing` and is neither.
 */
function engineVerdict(status, compare) {
  if (!status || typeof status !== 'object') {
    return { state: 'unknown', binaries: [], engineError: null, version: null };
  }
  const missing = Array.isArray(status.missing) ? status.missing : [];
  const binaries = Object.keys(BREW_FORMULA).filter((b) => missing.includes(b));
  const raw = missing.find((m) => typeof m === 'string' && m.startsWith('engine: '));
  if (raw) {
    return { state: 'absent', binaries, engineError: raw.slice('engine: '.length), version: null };
  }
  const version = status.engine_version && status.engine_version !== 'unavailable'
    ? String(status.engine_version) : null;
  if (version && typeof compare === 'function' && compare(version, ENGINE_FLOOR) < 0) {
    return { state: 'stale', binaries, engineError: null, version };
  }
  if (binaries.length) return { state: 'degraded', binaries, engineError: null, version };
  return { state: 'ok', binaries: [], engineError: null, version };
}

/** Installed vs newest published, as a verdict rather than a boolean.
 *
 *  🔴 THE CASE A NAIVE CHECK GETS WRONG, AND IT IS THE LIVE ONE. The engine
 *  repo's newest RELEASE is v6.3.0 while its newest TAG is v6.4.1 -- that repo
 *  tags every merge and publishes a release only sometimes, by its own
 *  convention. So the person running v6.4.1 is AHEAD of the newest release,
 *  and `installed !== latest` would tell them to downgrade. `ahead` is a
 *  first-class answer here, not an edge case.
 */
function updateVerdict(installed, latest, compare) {
  if (!installed || !latest) return 'unknown';
  const d = compare(installed, latest);
  if (d < 0) return 'behind';
  if (d > 0) return 'ahead';
  return 'current';
}

module.exports = { TOOL_DIRS, BREW_FORMULA, ENGINE_FLOOR,
  toolPath, brewFormulae, findBrew, engineVerdict, updateVerdict };

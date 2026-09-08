/* Preferences, and the one piece of the launch check that is pure logic.
 *
 * ⚠️ THIS FILE MARKS A DELIBERATE CHANGE TO THE APP'S OWN PREMISE (2026-09-07 19:30 EDT).
 * `main.js` used to say, in a comment: "USER-INITIATED ONLY, NEVER ON LAUNCH.
 * This app's whole premise is that it works on your machine with your files and
 * talks to nothing; a version ping fired at startup would quietly break that
 * promise for a feature nobody asked for at that moment."
 *
 * That reasoning was sound and it was answering the wrong question. Harkirat:
 * *"what if a user never clicks it themself?"* An update mechanism that only
 * works for the person who remembers it exists is a mechanism for nobody --
 * and the people most likely to be running a stale engine are exactly the ones
 * not reading the menu bar.
 *
 * The promise is kept a different way rather than abandoned: the check is
 * THROTTLED to once a day, it is SILENT when there is nothing to say, and it
 * is one checkbox away from off, in the same menu as the manual check. The
 * README no longer claims you start every network call, because you no longer
 * do -- see `docs/PRODUCT.md` for what the claim became.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULTS = { checkOnLaunch: true, lastCheck: 0 };
/* A judgement, not a measurement: a release is a rare event, so a check nobody
   asked for should be rare too. Nothing was measured to pick 24 over 6 or 72,
   and this repo's rule is that a number says which kind it is. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Read prefs, tolerating every way a small JSON file can be unreadable.
 *  ⚠️ A corrupt prefs file must never stop the app starting. */
function readPrefs(dir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'prefs.json'), 'utf8'));
    return { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  } catch { return { ...DEFAULTS }; }
}

function writePrefs(dir, prefs) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'prefs.json'), JSON.stringify(prefs, null, 2));
    return true;
  } catch { return false; }
}

/** Should the launch check run right now?
 *
 *  ⚠️ THROTTLED, and the throttle is the reason this is a function rather than
 *  a boolean read. Devoid's `activate` handler reopens a window without
 *  restarting, so "on launch" can happen many times in an afternoon; without
 *  the interval, closing and reopening the window would ping GitHub each time.
 *  A clock that has gone BACKWARDS (a timezone change, a restored backup, a
 *  prefs file copied from another Mac) must not disable the check forever --
 *  a future `lastCheck` is treated as due, not as recent.
 */
function shouldCheckOnLaunch(prefs, now = Date.now(), interval = DAY_MS) {
  if (!prefs || prefs.checkOnLaunch === false) return false;
  const last = Number(prefs.lastCheck) || 0;
  if (last > now) return true;                 // clock moved back; do not wedge
  return now - last >= interval;
}

module.exports = { DEFAULTS, DAY_MS, readPrefs, writePrefs, shouldCheckOnLaunch };

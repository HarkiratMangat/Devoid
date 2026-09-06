/* Version comparison, in its own file for ONE reason: main.js cannot be
 * required without booting Electron, so anything left in there is untestable.
 * This is the only piece of the update check that is pure logic, and it is the
 * only piece that can be wrong in a way nobody notices — a string compare says
 * "1.9.0" is newer than "1.10.0" and the app then never offers an update again.
 */
'use strict';

/** -1, 0 or 1, comparing dotted numeric versions. Accepts "v1.2.3" or "1.2.3".
 *  Missing fields count as 0, so "1.0" and "1.0.0" are equal. */
function compareVersions(a, b) {
  const parts = (v) => String(v).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

module.exports = { compareVersions };

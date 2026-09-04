// Stage 6 — proves main.js's real port probe, not a copy of it.
//
// main.js requires('electron') at the top, so it cannot be imported from plain
// node. Instead this reads main.js and evaluates the two probe functions out of
// it verbatim, so a change to the shipped code changes what is tested here.

const fs = require('fs');
const net = require('net');
const path = require('path');
const assert = require('assert');

const MAIN = path.join(__dirname, '..', 'main.js');
const source = fs.readFileSync(MAIN, 'utf8');

const start = source.indexOf('function isPortFree');
const end = source.indexOf('// ── Two engine versions');
assert.ok(start !== -1, 'isPortFree not found in main.js');
assert.ok(end !== -1 && end > start, 'end anchor not found after isPortFree');
const probeSource = source.slice(start, end);
assert.ok(probeSource.includes('function findFreePort'), 'findFreePort not in slice');
assert.ok(probeSource.includes('ECONNREFUSED'), 'the probe does not test ECONNREFUSED');
assert.ok(probeSource.split('\n').length < 60, 'slice unexpectedly large');

const BASE_PORT = 8732;
const LAST_PORT = 8740;
// eslint-disable-next-line no-new-func
const { isPortFree, findFreePort } = new Function(
  'net',
  'BASE_PORT',
  'LAST_PORT',
  'console',
  `${probeSource}; return { isPortFree, findFreePort };`
)(net, BASE_PORT, LAST_PORT, console);

function occupy(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(() => {});
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  console.log('--- A. nothing bound ---');
  console.log('isPortFree(8732) =', await isPortFree(8732));
  console.log('findFreePort()   =', await findFreePort());
  assert.strictEqual(await isPortFree(8732), true, '8732 should be free');
  assert.strictEqual(await findFreePort(), 8732, 'should pick the base port');

  console.log('--- B. 8732 occupied ---');
  const a = await occupy(8732);
  console.log('isPortFree(8732) =', await isPortFree(8732));
  console.log('findFreePort()   =', await findFreePort());
  assert.strictEqual(await isPortFree(8732), false, '8732 should read as busy');
  assert.strictEqual(await findFreePort(), 8733, 'should fall through to 8733');

  console.log('--- C. 8732 and 8733 occupied ---');
  const b = await occupy(8733);
  console.log('findFreePort()   =', await findFreePort());
  assert.strictEqual(await findFreePort(), 8734, 'should fall through to 8734');

  console.log('--- D. every port 8732..8740 occupied ---');
  const rest = [];
  for (let p = 8734; p <= LAST_PORT; p += 1) rest.push(await occupy(p));
  const none = await findFreePort();
  console.log('findFreePort()   =', none);
  assert.strictEqual(none, null, 'exhausted range must return null so main.js can fail loudly');

  console.log('--- E. released again ---');
  [a, b, ...rest].forEach((s) => s.close());
  await new Promise((r) => setTimeout(r, 200));
  console.log('findFreePort()   =', await findFreePort());
  assert.strictEqual(await findFreePort(), 8732, 'should return to the base port');

  console.log('\nport-probe: all 5 cases passed');
})().catch((err) => {
  console.error('port-probe FAILED:', err.message);
  process.exit(1);
});

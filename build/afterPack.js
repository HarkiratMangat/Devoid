// electron-builder afterPack hook — runs AFTER the bundle is assembled and
// BEFORE code signing. It exists for exactly one reason.
//
// ⚠️ THE INCIDENT THIS PREVENTS. `.venv` ships as extraResources (`pyvenv`), and
// a venv's `bin/python3.11` is an ABSOLUTE symlink to its base interpreter at
// /Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11 — a path
// OUTSIDE the bundle. On the first signed build (2026-09-06) electron-builder's
// signing walk followed that symlink and re-signed the user's SYSTEM Python
// interpreter in place, replacing its "Developer ID Application: Ned Deily"
// signature with this project's self-signed one. `codesign --verify --deep
// --strict` then failed the bundle anyway: "invalid destination for symbolic
// link in bundle". So the escaping symlink both broke the build AND modified a
// file outside the project.
//
// The fix is to dereference it before signing: replace each absolute symlink in
// pyvenv/bin with a real copy of its target. That is exactly the layout
// `python -m venv --copies` produces, so it is a supported venv shape, and it
// keeps the signer's walk inside the bundle where it belongs.
//
// This does NOT bundle Python. The copied launcher still links against
// /Library/Frameworks/Python.framework/Versions/3.11/Python, which is the
// system-wide framework dependency electron-builder.yml already documents.

const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const appName = context.packager.appInfo.productFilename;
  const binDir = path.join(
    context.appOutDir, `${appName}.app`, 'Contents', 'Resources', 'pyvenv', 'bin',
  );
  if (!fs.existsSync(binDir)) {
    throw new Error(`afterPack: expected a bundled venv at ${binDir} and found none`);
  }

  let dereferenced = 0;
  for (const entry of fs.readdirSync(binDir)) {
    const link = path.join(binDir, entry);
    if (!fs.lstatSync(link).isSymbolicLink()) continue;

    const target = fs.readlinkSync(link);
    if (!path.isAbsolute(target)) continue;   // relative links stay inside the bundle

    if (!fs.existsSync(target)) {
      throw new Error(`afterPack: ${link} points outside the bundle at ${target}, which does not exist`);
    }
    fs.rmSync(link);
    fs.copyFileSync(target, link);
    fs.chmodSync(link, 0o755);
    dereferenced += 1;
    console.log(`  • afterPack  dereferenced ${entry} -> ${target}`);
  }

  // A remaining absolute symlink means the signer would walk out of the bundle
  // again. Fail the build rather than let that reach codesign.
  for (const entry of fs.readdirSync(binDir)) {
    const link = path.join(binDir, entry);
    if (fs.lstatSync(link).isSymbolicLink() && path.isAbsolute(fs.readlinkSync(link))) {
      throw new Error(`afterPack: ${link} still escapes the bundle`);
    }
  }
  console.log(`  • afterPack  ${dereferenced} escaping symlink(s) dereferenced in pyvenv/bin`);
};

#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Vendor a shared package of this workspace into another repository.
//
//   node scripts/sync-shared.mjs <pkg> <target-repo>          copy + write VENDOR.json
//   node scripts/sync-shared.mjs --check <pkg> <target-repo>  verify hashes (CI)
//
// Example: node scripts/sync-shared.mjs arazzo-core ../arazzo-vscode
//   → ../arazzo-vscode/vendor/@connethics/arazzo-core/{dist,schemas,package.json,LICENSE,README.md,VENDOR.json}
//
// What is copied: package.json plus every entry of its "files" field (the same
// content as `npm pack`), i.e. at least dist/, package.json and LICENSE. The
// package must be built first (`npm run build -w packages/<pkg>`).
// VENDOR.json records the version, the source commit and a SHA-256 per file
// plus an aggregate SHA-256, so that CI can detect a hand-edited vendor copy.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error('usage: node scripts/sync-shared.mjs [--check] <pkg> <target-repo>');
  process.exit(2);
}

const args = process.argv.slice(2);
const check = args[0] === '--check';
if (check) args.shift();
const [pkg, target] = args;
if (!pkg || !target || args.length !== 2) usage();
if (!/^[a-z0-9][a-z0-9-]*$/.test(pkg)) usage(`invalid package name "${pkg}"`);

const pkgDir = path.join(workspaceRoot, 'packages', pkg);
const pkgJsonPath = path.join(pkgDir, 'package.json');
if (!fs.existsSync(pkgJsonPath)) usage(`packages/${pkg}/package.json not found`);
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
const scope = pkgJson.name.startsWith('@') ? pkgJson.name.split('/')[0] : '@connethics';
const targetRoot = path.resolve(target);
if (!fs.existsSync(targetRoot)) usage(`target "${target}" does not exist`);
const destDir = path.join(targetRoot, 'vendor', scope, pkg);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Relative POSIX paths of all files below `dir`. */
function listFiles(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
    })
    .sort();
}

function hashTree(dir, exclude = new Set()) {
  const files = {};
  for (const rel of listFiles(dir)) {
    if (exclude.has(rel)) continue;
    files[rel] = sha256(fs.readFileSync(path.join(dir, rel)));
  }
  const aggregate = sha256(Object.entries(files).map(([f, h]) => `${f}\0${h}\n`).join(''));
  return { files, aggregate };
}

if (check) {
  const vendorJsonPath = path.join(destDir, 'VENDOR.json');
  if (!fs.existsSync(vendorJsonPath)) {
    console.error(`✗ ${path.relative(process.cwd(), vendorJsonPath)} not found`);
    process.exit(1);
  }
  const recorded = JSON.parse(fs.readFileSync(vendorJsonPath, 'utf8'));
  const actual = hashTree(destDir, new Set(['VENDOR.json']));
  const problems = [];
  for (const [f, h] of Object.entries(recorded.files ?? {})) {
    if (!(f in actual.files)) problems.push(`missing ${f}`);
    else if (actual.files[f] !== h) problems.push(`modified ${f}`);
  }
  for (const f of Object.keys(actual.files)) if (!(f in (recorded.files ?? {}))) problems.push(`unexpected ${f}`);
  if (actual.aggregate !== recorded.sha256) problems.push('aggregate sha256 mismatch');
  if (problems.length) {
    console.error(`✗ vendored ${recorded.name}@${recorded.version} differs from VENDOR.json:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`✓ ${recorded.name}@${recorded.version} matches VENDOR.json (sha256 ${recorded.sha256.slice(0, 12)}…)`);
  process.exit(0);
}

// ── Copy
const entries = ['package.json', ...(pkgJson.files ?? ['dist', 'LICENSE'])];
for (const required of ['dist', 'LICENSE']) {
  if (!fs.existsSync(path.join(pkgDir, required))) usage(`packages/${pkg}/${required} is missing — run "npm run build -w packages/${pkg}" first`);
}
fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });
for (const entry of entries) {
  const from = path.join(pkgDir, entry);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(destDir, entry), { recursive: true });
}

let commit = null;
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  /* not a git checkout */
}
const { files, aggregate } = hashTree(destDir);
const vendor = {
  name: pkgJson.name,
  version: pkgJson.version,
  license: pkgJson.license,
  source: { repository: 'arazzo-demo', path: `packages/${pkg}`, commit },
  sha256: aggregate,
  files,
  note: 'Generated by arazzo-demo/scripts/sync-shared.mjs — do not edit the vendored files; re-run the script. Verify with --check.',
};
fs.writeFileSync(path.join(destDir, 'VENDOR.json'), JSON.stringify(vendor, null, 2) + '\n');
console.log(`✓ ${pkgJson.name}@${pkgJson.version} → ${path.relative(process.cwd(), destDir)} (${Object.keys(files).length} files, sha256 ${aggregate.slice(0, 12)}…)`);

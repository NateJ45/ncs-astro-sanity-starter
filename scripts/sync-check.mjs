#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// sync-check.mjs - has a site's copy of a canonical file drifted? (2026-08-27)
// =============================================================================
// WHY THIS EXISTS
//
// The site family (wcp, presacademy, reid-design-site, mas-monograms,
// 2ndpreschicago, ncs-church-starter, nixoncreativestudio) shares a growing
// set of build/QA plumbing: the parity harness, the Sanity seed library, the
// contrast math, the workerd wrapper. Copies drift silently. A bug fixed in
// one repo stays broken in five, and nobody finds out until the same evening
// is lost twice.
//
// This starter is the LIBRARY OF RECORD. Every canonical file carries a
// first-line marker:
//
//     PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
//
// This script finds those marked files in a SITE repo and diffs each against
// the starter's copy of the same relative path. Run it during a sync session
// (or from CI) and drift becomes a failing check instead of an archaeology
// project. PORTS.md at the starter root is the human half: what each shared
// improvement is, and which repos have it.
//
// USAGE
//   node scripts/sync-check.mjs                 # check the current repo
//   node scripts/sync-check.mjs <site-repo>     # check another repo
//   NCS_STARTER_DIR=<path> node scripts/sync-check.mjs <site-repo>
//
// The starter is located by, in order: NCS_STARTER_DIR, then a sibling
// directory named ncs-astro-sanity-starter next to the site repo, then this
// script's own repo root (which is what makes the self-check work: run it
// from the starter and the starter is both site and library, so everything
// must report SAME).
//
// EXIT CODES
//   0  every marked file matches (or there were none to check)
//   1  at least one DRIFT or MISSING-IN-STARTER
//   2  bad invocation (site or starter path does not exist)
//
// COMPARISON RULES
//   - Line endings are normalized (CRLF -> LF) before comparing. This family
//     is developed on Windows and checked out on Linux CI; a pure EOL
//     difference is not drift and must never fail the check.
//   - A single trailing newline is ignored for the same reason.
//   - Everything else is byte-exact, INCLUDING the marker line. A site copy
//     that adapts the file on purpose still counts as drift: that is the
//     signal to either fold the adaptation back into the starter or drop the
//     marker and record the fork in PORTS.md.
//
// Dependency-free by design (node builtins only), so it can be dropped into
// any repo in the family regardless of what that repo has installed.
// =============================================================================

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'ncs-astro-sanity-starter is the library of record';
/** Only the first few lines are scanned: the marker is a header comment. */
const MARKER_SCAN_LINES = 5;

/**
 * Directories never walked. node_modules and dist are volume; .git is binary;
 * .claude/worktrees holds whole extra checkouts of the same repo, which would
 * otherwise report every file twice (once per worktree).
 */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  '.wrangler',
  '.svelte-kit',
  '.next',
  'coverage',
  'build',
  'worktrees', // .claude/worktrees, and any other worktrees/ pile
]);

/** Extensions worth opening. A marker only ever lives in a text source file. */
const TEXT_EXT = new Set([
  '.mjs',
  '.js',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.astro',
  '.css',
  '.md',
  '.yml',
  '.yaml',
  '.json',
  '.sh',
]);

const SIZE_CAP = 2 * 1024 * 1024; // no marker hides in a 2MB file

// --------------------------------------------------------------------------
// Paths
// --------------------------------------------------------------------------

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveSite() {
  const arg = process.argv[2];
  const dir = arg ? resolve(process.cwd(), arg) : process.cwd();
  if (!existsSync(dir)) die(`Site repo not found: ${dir}`, 2);
  return dir;
}

function resolveStarter(siteDir) {
  if (process.env.NCS_STARTER_DIR) {
    const dir = resolve(process.env.NCS_STARTER_DIR);
    if (!existsSync(dir)) die(`NCS_STARTER_DIR does not exist: ${dir}`, 2);
    return { dir, how: 'NCS_STARTER_DIR' };
  }
  const sibling = resolve(siteDir, '..', 'ncs-astro-sanity-starter');
  if (existsSync(sibling)) return { dir: sibling, how: 'sibling directory' };
  if (existsSync(SCRIPT_ROOT)) return { dir: SCRIPT_ROOT, how: "this script's own repo" };
  die('Could not locate the starter. Set NCS_STARTER_DIR.', 2);
}

// --------------------------------------------------------------------------
// Walk + marker detection
// --------------------------------------------------------------------------

function hasMarker(absPath) {
  let raw;
  try {
    if (statSync(absPath).size > SIZE_CAP) return false;
    raw = readFileSync(absPath, 'utf8');
  } catch {
    return false; // unreadable or not valid utf8: cannot be a marked source file
  }
  const head = raw.split('\n', MARKER_SCAN_LINES).join('\n');
  return head.includes(MARKER);
}

/** Every marked file in `root`, as repo-relative POSIX paths. */
function findMarked(root) {
  const out = [];
  const walk = (absDir) => {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return; // permission or race: skip rather than abort the sweep
    }
    for (const entry of entries) {
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(abs);
      } else if (entry.isFile()) {
        const dot = entry.name.lastIndexOf('.');
        if (dot === -1 || !TEXT_EXT.has(entry.name.slice(dot))) continue;
        if (hasMarker(abs)) out.push(relative(root, abs).split(sep).join('/'));
      }
    }
  };
  walk(root);
  out.sort();
  return out;
}

// --------------------------------------------------------------------------
// Compare
// --------------------------------------------------------------------------

/** CRLF -> LF, drop one trailing newline. Everything else is byte-exact. */
function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '');
}

/** First differing line number (1-based), for a one-line drift hint. */
function firstDiffLine(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) return { line: i + 1, site: la[i], starter: lb[i] };
  }
  return null;
}

function clip(s, width = 96) {
  if (s === undefined) return '(end of file)';
  const t = s.trim();
  return t.length > width ? t.slice(0, width) + ' ...' : t;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function die(msg, code) {
  console.error(`sync-check: ${msg}`);
  process.exit(code);
}

const siteDir = resolveSite();
const { dir: starterDir, how } = resolveStarter(siteDir);
const selfCheck = resolve(siteDir) === resolve(starterDir);

console.log(`site:    ${siteDir}`);
console.log(`starter: ${starterDir}  (${how})${selfCheck ? '  [self-check]' : ''}`);
console.log('');

const marked = findMarked(siteDir);

if (marked.length === 0) {
  console.log('No PORTABLE-marked files found in the site repo.');
  console.log('');
  console.log('That means one of two things:');
  console.log('  a) this repo has not had a sync session yet, or');
  console.log('  b) it has canonical copies but they still lack the header marker.');
  console.log('Add the marker line to each shared file during the next sync session');
  console.log('(PORTS.md at the starter root lists what is meant to be shared).');
  process.exit(0);
}

const results = { SAME: [], DRIFT: [], 'MISSING-IN-STARTER': [] };
const drifts = [];

for (const rel of marked) {
  // NESTED-APP RULE (2026-08-28): wcp keeps its whole app under site/, so its
  // copy of scripts/foo.mjs lives at site/scripts/foo.mjs while the starter's
  // is at scripts/foo.mjs. When the exact relative path is missing in the
  // starter, retry once with the FIRST path segment stripped. One segment
  // only, and only on a miss - a repo whose paths match the starter's never
  // takes this branch, so it cannot mask a genuinely missing file there.
  let starterRel = rel;
  let starterPath = join(starterDir, ...rel.split('/'));
  if (!existsSync(starterPath) && rel.includes('/')) {
    const stripped = rel.split('/').slice(1).join('/');
    const candidate = join(starterDir, ...stripped.split('/'));
    if (existsSync(candidate)) {
      starterRel = stripped;
      starterPath = candidate;
    }
  }
  if (!existsSync(starterPath)) {
    results['MISSING-IN-STARTER'].push(rel);
    console.log(`  MISSING-IN-STARTER  ${rel}`);
    continue;
  }
  const nestNote = starterRel === rel ? '' : `  (starter: ${starterRel})`;
  const siteText = normalize(readFileSync(join(siteDir, ...rel.split('/')), 'utf8'));
  const starterText = normalize(readFileSync(starterPath, 'utf8'));
  if (siteText === starterText) {
    results.SAME.push(rel);
    console.log(`  SAME                ${rel}${nestNote}`);
  } else {
    results.DRIFT.push(rel);
    console.log(`  DRIFT               ${rel}${nestNote}`);
    drifts.push([rel, firstDiffLine(siteText, starterText)]);
  }
}

for (const [rel, d] of drifts) {
  console.log(`\n--- ${rel}`);
  if (!d) {
    console.log('  differs, but not on any single line (whitespace only?)');
    continue;
  }
  console.log(`  first difference at line ${d.line}`);
  console.log(`  site:    ${clip(d.site)}`);
  console.log(`  starter: ${clip(d.starter)}`);
}

const failed = results.DRIFT.length + results['MISSING-IN-STARTER'].length;
console.log(
  `\n${results.SAME.length} same, ${results.DRIFT.length} drifted, ` +
    `${results['MISSING-IN-STARTER'].length} missing in starter ` +
    `(${marked.length} marked file(s) checked).`,
);

if (failed) {
  console.log('');
  console.log('DRIFT: reconcile before shipping. Either port the site\'s improvement');
  console.log('back into the starter (and add a PORTS.md card in the same commit), or');
  console.log('pull the starter\'s copy forward into the site.');
  console.log('MISSING-IN-STARTER: the file is marked canonical but the starter has no');
  console.log('copy at that path. Install it in the starter, or fix the path.');
  process.exit(1);
}

console.log('All canonical copies match the library of record.');

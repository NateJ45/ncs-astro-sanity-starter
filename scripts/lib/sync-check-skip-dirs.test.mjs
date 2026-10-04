// Regression test for PORTS.md card 80: sync-check must not walk worktree folders.
//
// sync-check.mjs runs at import time (it is a CLI, not a module), so this drives it as
// a child process against a throwaway "site" and "starter" built in the OS temp dir.
// Run with `npm run test:scripts` (node --test scripts/lib/*.test.mjs).
//
// Why it exists: a repo's `_worktrees/<name>/` (agent and developer worktrees) and
// `.claude/worktrees/<name>/` each hold a FULL second copy of the repo. Walked, every
// marked file is counted again (fbcm once reported "172 checked" for 86 real files).
// The control rows prove the walker still finds real marked files, so a test that
// passes because sync-check found nothing at all cannot go green.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SYNC_CHECK = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'sync-check.mjs');

// Built from two halves so this file's own header never contains the whole marker.
const MARKER =
  'PORTABLE: canonical copy - ncs-astro-sanity-starter is the library ' + 'of record for this file';
const MARKED_FILE = `// ${MARKER}\nexport const x = 1;\n`;

function put(root, rel, text = MARKED_FILE) {
  const abs = join(root, ...rel.split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

/** Run sync-check on `site` against `starter`; returns { status, out }. */
function run(site, starter) {
  const r = spawnSync(process.execPath, [SYNC_CHECK, site], {
    env: { ...process.env, NCS_STARTER_DIR: starter },
    encoding: 'utf8',
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'sync-check-skip-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const site = join(base, 'site');
  const starter = join(base, 'starter');
  // Two real marked files, present in both trees and identical: the control rows.
  for (const root of [site, starter]) {
    put(root, 'scripts/a.mjs');
    put(root, 'src/lib/b.mjs');
  }
  return { site, starter };
}

test('control: real marked files are found and compared', (t) => {
  const { site, starter } = fixture(t);
  const { status, out } = run(site, starter);
  assert.equal(status, 0, out);
  assert.match(out, /2 same, 0 drifted, 0 missing in starter \(2 marked file\(s\) checked\)/);
});

test('_worktrees/ copies are not walked (card 80)', (t) => {
  const { site, starter } = fixture(t);
  // A whole second copy of the repo, as `git worktree add _worktrees/x` makes it,
  // including a marked file that has no counterpart in the starter at that path.
  put(site, '_worktrees/product-md-answers/scripts/a.mjs');
  put(
    site,
    '_worktrees/product-md-answers/.claude/settings.json',
    `{ "_portable": "${MARKER}" }\n`,
  );
  put(site, '_worktrees/other/src/lib/b.mjs');
  const { status, out } = run(site, starter);
  assert.equal(status, 0, out);
  assert.doesNotMatch(out, /_worktrees/);
  assert.match(out, /2 same, 0 drifted, 0 missing in starter \(2 marked file\(s\) checked\)/);
});

test('.claude/worktrees/ copies stay skipped (the older convention)', (t) => {
  const { site, starter } = fixture(t);
  put(site, '.claude/worktrees/agent-1/scripts/a.mjs');
  const { status, out } = run(site, starter);
  assert.equal(status, 0, out);
  assert.doesNotMatch(out, /worktrees/);
  assert.match(out, /\(2 marked file\(s\) checked\)/);
});

test('a real marked file whose folder merely resembles a worktree dir is still checked', (t) => {
  const { site, starter } = fixture(t);
  // `my_worktrees-notes` is not `_worktrees`: the skip is by exact folder name only.
  put(site, 'my_worktrees-notes/c.mjs');
  const { status, out } = run(site, starter);
  assert.equal(status, 1, out);
  assert.match(out, /MISSING-IN-STARTER {2}my_worktrees-notes\/c\.mjs/);
});

// Regression test for PORTS.md card 186: sync-check must find the starter from a site in
// clients/<site> or clients/<group>/<site>, and must refuse to compare a non-starter repo
// with itself.
//
// sync-check.mjs runs at import time (it is a CLI), so this drives it as a child process
// against throwaway trees in the OS temp dir. Run with `npm run test:scripts`.
//
// Why it exists: the starter lives at Projects/internal/ncs-astro-sanity-starter, never as a
// sibling of a client site, so the sibling lookup missed and the script fell back to its own
// repo root. Run from a site's own copy that meant "[self-check]": every marked file SAME,
// whatever the drift. Looks like a pass, checks nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SYNC_CHECK = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'sync-check.mjs');

// Built from two halves so this file's own header never contains the whole marker.
const MARKER =
  'PORTABLE: canonical copy - ncs-astro-sanity-starter is the library ' + 'of record for this file';

function put(root, rel, text) {
  const abs = join(root, ...rel.split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

/** Run `script` with cwd `site`; the starter env var is removed so only discovery can find it. */
function run(script, site, args = []) {
  const env = { ...process.env };
  delete env.NCS_STARTER_DIR;
  const r = spawnSync(process.execPath, [script, ...args], { cwd: site, env, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

function projects(t) {
  const base = mkdtempSync(join(tmpdir(), 'sync-check-find-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  // Projects/internal/ncs-astro-sanity-starter with a marked file whose text differs from the site's.
  const starter = join(base, 'Projects', 'internal', 'ncs-astro-sanity-starter');
  put(starter, 'package.json', '{"name":"ncs-astro-sanity-starter"}');
  put(starter, 'scripts/a.mjs', `// ${MARKER}\nexport const x = 'starter';\n`);
  return { base, starter };
}

for (const rel of ['clients/some-site', 'clients/group/nested-site']) {
  test(`finds the starter from Projects/${rel} and reports drift`, (t) => {
    const { base } = projects(t);
    const site = join(base, 'Projects', ...rel.split('/'));
    put(site, 'package.json', '{"name":"some-site"}');
    put(site, 'scripts/a.mjs', `// ${MARKER}\nexport const x = 'site';\n`);
    const { status, out } = run(SYNC_CHECK, site);
    assert.match(out, /\(ancestor folder\)/);
    assert.doesNotMatch(out, /\[self-check\]/);
    assert.match(out, /DRIFT\s+scripts\/a\.mjs/);
    assert.equal(status, 1);
  });
}

test('a non-starter repo with no starter anywhere is an error, not a silent self-check', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'sync-check-lonely-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const site = join(base, 'lonely-site');
  put(site, 'package.json', '{"name":"lonely-site"}');
  put(site, 'scripts/a.mjs', `// ${MARKER}\nexport const x = 1;\n`);
  mkdirSync(join(site, 'scripts'), { recursive: true });
  copyFileSync(SYNC_CHECK, join(site, 'scripts', 'sync-check.mjs'));
  const own = join(site, 'scripts', 'sync-check.mjs');

  const refused = run(own, site);
  assert.equal(refused.status, 2);
  assert.match(refused.out, /compare the repo with itself/);

  const allowed = run(own, site, ['--allow-self-check']);
  assert.match(allowed.out, /\[self-check\]/);
});

test('the starter checking itself is still allowed', () => {
  const root = resolve(dirname(SYNC_CHECK), '..');
  const { status, out } = run(SYNC_CHECK, root);
  assert.match(out, /\[self-check\]/);
  assert.equal(status, 0);
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for the production second factor in sanity-lib.mjs (PORTS.md card 86).
//
// The guard is NEVER tested against production. Every child process below gets a
// fake project, a fake token and SANITY_API_HOST=https://example.invalid (a
// reserved name that cannot resolve), all set in process.env, which wins over any
// real .env in the repo. So even a run that passes the guard cannot reach Sanity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LIB = new URL('./sanity-lib.mjs', import.meta.url).href;

const FAKE = {
  PUBLIC_SANITY_PROJECT_ID: 'fake0000',
  SANITY_API_WRITE_TOKEN: 'fake-token',
  SANITY_API_HOST: 'https://example.invalid',
};

// The pure check, imported with the same fake env so the import-time token check
// passes. This process has no --apply, so the import-time guard stays quiet.
Object.assign(process.env, FAKE, { PUBLIC_SANITY_DATASET: 'production' });
delete process.env.NCS_PRODUCTION_WRITE;
const { productionWriteRefusal } = await import(LIB);

test('a dry run never needs the second factor', () => {
  assert.equal(
    productionWriteRefusal({ apply: false, dataset: 'production', processEnv: {} }),
    null,
  );
});

test('--apply on production without NCS_PRODUCTION_WRITE is refused', () => {
  const r = productionWriteRefusal({ apply: true, dataset: 'production', processEnv: {} });
  assert.match(r, /NCS_PRODUCTION_WRITE=yes/);
});

test('only the exact value "yes" opens it', () => {
  for (const v of ['1', 'true', 'YES', ' yes', '']) {
    assert.notEqual(
      productionWriteRefusal({
        apply: true,
        dataset: 'production',
        processEnv: { NCS_PRODUCTION_WRITE: v },
      }),
      null,
      `value ${JSON.stringify(v)} must not open the guard`,
    );
  }
  assert.equal(
    productionWriteRefusal({
      apply: true,
      dataset: 'production',
      processEnv: { NCS_PRODUCTION_WRITE: 'yes' },
    }),
    null,
  );
});

test('a non-production dataset needs only --apply', () => {
  assert.equal(productionWriteRefusal({ apply: true, dataset: 'staging', processEnv: {} }), null);
});

// --- the real module, in a child process, against https://example.invalid ----
function runFixture(args, extraEnv) {
  const dir = mkdtempSync(join(tmpdir(), 'sanity-lib-guard-'));
  const file = join(dir, 'write.mjs');
  writeFileSync(
    file,
    [
      `import { client, apply } from ${JSON.stringify(LIB)};`,
      `try {`,
      `  await apply('patch fake doc', () => client.patch('guard-test').set({ a: 1 }).commit());`,
      `  console.log('NO-ERROR');`,
      `} catch (err) {`,
      `  console.log('REQUEST-FAILED ' + (err.code || err.cause?.code || err.message));`,
      `  process.exit(3);`,
      `}`,
    ].join('\n'),
  );
  const env = { ...process.env, ...FAKE, PUBLIC_SANITY_DATASET: 'production', ...extraEnv };
  if (extraEnv.NCS_PRODUCTION_WRITE === undefined) delete env.NCS_PRODUCTION_WRITE;
  try {
    return spawnSync(process.execPath, [file, ...args], {
      env,
      encoding: 'utf8',
      timeout: 60_000,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the module exits before any request when --apply lacks the second factor', () => {
  const r = runFixture(['--apply'], {});
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.match(r.stderr, /Refusing to write/);
  assert.doesNotMatch(r.stdout, /REQUEST-FAILED|NO-ERROR|OK /);
});

test('with NCS_PRODUCTION_WRITE=yes it passes the guard and reaches the (fake) host', () => {
  const r = runFixture(['--apply'], { NCS_PRODUCTION_WRITE: 'yes' });
  assert.doesNotMatch(r.stderr, /Refusing to write/);
  assert.match(r.stdout, /OK {2}patch fake doc/);
  // example.invalid cannot resolve, so the write attempt fails: proof it was attempted.
  assert.equal(r.status, 3, r.stderr + r.stdout);
  assert.match(r.stdout, /REQUEST-FAILED/);
});

test('without --apply nothing is attempted, second factor or not', () => {
  const r = runFixture([], { NCS_PRODUCTION_WRITE: 'yes' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /DRY patch fake doc/);
  assert.match(r.stdout, /NO-ERROR/);
});

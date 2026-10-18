// Tests for scripts/lib/write-gate.mjs (PORTS.md card 86). Runs in test:scripts.
//
// Never touches production. The pure checks need no network. The child-process
// checks run each gated script with its write flag, a fake project, a fake
// token and NO NCS_PRODUCTION_WRITE, and expect exit 2 before any request. The
// one run that passes the gate points its client at https://example.invalid,
// which cannot resolve, so the failed request proves the write was attempted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decideWrite, gateClient } from './write-gate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const base = { argv: [], processEnv: {}, dataset: 'production', factor: undefined };

test('a bare run is dry, and --dry-run always wins', () => {
  assert.equal(decideWrite(base).write, false);
  assert.equal(decideWrite(base).refusal, null);
  const both = decideWrite({ ...base, argv: ['--apply', '--dry-run'], factor: 'yes' });
  assert.equal(both.write, false);
  assert.equal(both.refusal, null);
});

test('--apply on production without the variable is refused', () => {
  const d = decideWrite({ ...base, argv: ['--apply'] });
  assert.equal(d.write, false);
  assert.match(d.refusal, /NCS_PRODUCTION_WRITE=yes/);
});

test('only the exact value yes opens it', () => {
  for (const factor of ['YES', 'true', '1', ' yes', '']) {
    assert.equal(decideWrite({ ...base, argv: ['--apply'], factor }).write, false, factor);
  }
  assert.equal(decideWrite({ ...base, argv: ['--apply'], factor: 'yes' }).write, true);
});

test('the variable alone, with no write flag, writes nothing', () => {
  assert.equal(decideWrite({ ...base, factor: 'yes' }).write, false);
});

test("a script's own flag is the one that counts", () => {
  const flag = '--write';
  assert.equal(decideWrite({ ...base, argv: ['--apply'], factor: 'yes', flag }).write, false);
  assert.ok(decideWrite({ ...base, argv: ['--write'], flag }).refusal);
  assert.equal(decideWrite({ ...base, argv: ['--write'], factor: 'yes', flag }).write, true);
});

test('a non-production dataset needs only the flag', () => {
  const d = decideWrite({ ...base, argv: ['--apply'], dataset: 'staging' });
  assert.equal(d.write, true);
});

test('.env defining the variable is refused even when it says yes', () => {
  const d = decideWrite({ ...base, argv: ['--apply'], factor: 'yes', envFileHasFactor: true });
  assert.equal(d.write, false);
  assert.match(d.refusal, /\.env defines/);
});

test('the CI allowance needs both the opt-in and GitHub Actions', () => {
  const gha = { GITHUB_ACTIONS: 'true' };
  // Not opted in: Actions changes nothing.
  assert.ok(decideWrite({ ...base, argv: ['--apply'], processEnv: gha }).refusal);
  // Opted in, but not in Actions: the full rule.
  assert.ok(decideWrite({ ...base, argv: ['--apply'], ci: true }).refusal);
  // Opted in and in Actions: the workflow's flag is enough.
  assert.equal(decideWrite({ ...base, argv: ['--apply'], processEnv: gha, ci: true }).write, true);
  // ciBare: a bare run writes in Actions only.
  assert.equal(decideWrite({ ...base, processEnv: gha, ci: true, ciBare: true }).write, true);
  assert.equal(decideWrite({ ...base, ci: true, ciBare: true }).write, false);
  // --dry-run still wins in Actions.
  const dry = decideWrite({
    ...base,
    argv: ['--dry-run'],
    processEnv: gha,
    ci: true,
    ciBare: true,
  });
  assert.equal(dry.write, false);
});

test('a dry client never calls a write method and still reads', async () => {
  const boom = () => {
    throw new Error('write reached the real client');
  };
  const real = {
    fetch: async () => 'read ok',
    create: boom,
    createOrReplace: boom,
    createIfNotExists: boom,
    delete: boom,
    mutate: boom,
    patch: boom,
    transaction: boom,
    assets: { upload: boom },
  };
  const lines = [];
  const c = gateClient(real, false, (s) => lines.push(s));
  assert.equal(await c.fetch('*'), 'read ok');
  await c.createOrReplace({ _id: 'a' });
  await c.createIfNotExists({ _id: 'b' });
  await c.delete('c');
  await c.patch('d').set({ x: 1 }).unset(['y']).commit();
  const asset = await c.assets.upload('image', Buffer.from(''), { filename: 'f.jpg' });
  assert.match(asset._id, /dry-run/);
  let tx = c.transaction();
  tx = tx.createOrReplace({ _id: 'e' }).patch('f', (p) => p.set({ z: 2 }));
  await tx.commit();
  assert.equal(lines.length, 8);
  assert.ok(lines.some((l) => l.startsWith('patch d: set(')));
  assert.equal(gateClient(real, true), real);
});

// --- the real scripts, refused before any request --------------------------------
// Fake project and token in process.env (which beats .env in every loader these
// scripts use), cwd in an empty temp folder so dotenv finds no .env, and the CI
// markers removed so the GitHub Actions allowance cannot apply.
function childEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of ['NCS_PRODUCTION_WRITE', 'GITHUB_ACTIONS', 'CI']) delete env[k];
  return {
    ...env,
    PUBLIC_SANITY_PROJECT_ID: 'fakeproject',
    SANITY_PROJECT_ID: 'fakeproject',
    SANITY_STUDIO_PROJECT_ID: 'fakeproject',
    PUBLIC_SANITY_DATASET: 'production',
    SANITY_DATASET: 'production',
    SANITY_API_WRITE_TOKEN: 'fake-token',
    SANITY_AUTH_TOKEN: 'fake-token',
    SANITY_API_HOST: 'https://example.invalid',
    ...extra,
  };
}

// The starter's gated scripts. A site adds its own here (this test is not
// PORTABLE, so each site keeps its own list).
const GATED = [['scripts/publish-due.mjs', '--apply']];

test('every gated script refuses its write flag without the variable', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'write-gate-'));
  try {
    for (const [script, flag] of GATED) {
      const r = spawnSync(process.execPath, [resolve(ROOT, script), flag], {
        cwd,
        env: childEnv(),
        encoding: 'utf8',
        timeout: 60_000,
      });
      assert.equal(r.status, 2, `${script} ${flag}: exit ${r.status}\n${r.stdout}\n${r.stderr}`);
      assert.match(r.stderr, /Refusing to write/, script);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('with the variable the gate opens, and the write goes to the dummy host', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'write-gate-'));
  const gate = pathToFileURL(resolve(ROOT, 'scripts/lib/write-gate.mjs')).href;
  const client = import.meta.resolve('@sanity/client');
  const probe = join(cwd, 'probe.mjs');
  writeFileSync(
    probe,
    [
      `import { writeGate, gateClient } from ${JSON.stringify(gate)};`,
      `const { createClient } = await import(${JSON.stringify(client)});`,
      `const raw = createClient({ projectId: 'fakeproject', dataset: 'production', token: 'fake',`,
      `  apiVersion: '2026-05-01', useCdn: false, apiHost: 'https://example.invalid' });`,
      `const c = gateClient(raw, writeGate({ dataset: 'production' }));`,
      `try { await c.createOrReplace({ _id: 'probe', _type: 'probe' }); console.log('NO-ERROR'); }`,
      `catch (e) { console.log('ATTEMPTED', e.message); }`,
    ].join('\n'),
  );
  try {
    const refused = spawnSync(process.execPath, [probe, '--apply'], {
      cwd,
      env: childEnv(),
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(refused.status, 2, refused.stderr);
    assert.doesNotMatch(refused.stdout, /ATTEMPTED/);

    const opened = spawnSync(process.execPath, [probe, '--apply'], {
      cwd,
      env: childEnv({ NCS_PRODUCTION_WRITE: 'yes' }),
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(opened.status, 0, opened.stderr);
    assert.match(opened.stdout, /WRITE to production/);
    assert.match(opened.stdout, /ATTEMPTED/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

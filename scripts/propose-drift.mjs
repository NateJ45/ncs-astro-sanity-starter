#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// propose-drift.mjs - when a canonical file drifts, open the port-up PR for you
// =============================================================================
// WHY THIS EXISTS
//
// sync-check.mjs DETECTS drift and stops the build. It cannot tell you which
// direction to reconcile in, because that is a judgement: an improvement made
// in a site either belongs in the library (port it up) or is site-specific
// (drop the marker and record the fork in PORTS.md).
//
// What was missing is that porting up was an errand you had to remember to
// start, in another repo, after the build that blocked you. On 2026-09-06 a
// fix in wcp-website's preview-morph.ts reached the other five repos three
// months after it was written, and only because a sync session happened to
// look. This script turns that into a pull request against the starter,
// opened automatically, containing the site's version of the drifted files.
//
// It deliberately does NOT merge. Whether a change belongs in the library that
// every future project inherits is exactly the decision a human should make.
//
// USAGE (from a site repo, after sync-check has failed)
//   NCS_STARTER_DIR=<path> GH_TOKEN=<pat> node scripts/propose-drift.mjs
//
// It exits 0 even when it cannot open the PR. The build is already failing on
// the sync-check step; this must never turn a clear "drift" failure into a
// confusing "could not authenticate" one.
// =============================================================================
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const STARTER = process.env.NCS_STARTER_DIR;
const TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || '(local)';
const SITE = REPO.split('/')[1] || 'site';
const LIBRARY = 'NateJ45/ncs-astro-sanity-starter';

const warn = (m) => console.log(`::warning::propose-drift: ${m}`);

if (!STARTER || !existsSync(STARTER)) {
  warn('NCS_STARTER_DIR is not set or does not exist; nothing proposed.');
  process.exit(0);
}

// Re-run the checker and read which files drifted. Parsing its output rather
// than duplicating its comparison keeps one implementation of "drifted".
const res = spawnSync(process.execPath, ['scripts/sync-check.mjs'], {
  encoding: 'utf8',
  env: { ...process.env, NCS_STARTER_DIR: STARTER },
});
const drifted = (res.stdout || '')
  .split('\n')
  .map((l) => l.match(/^\s*DRIFT\s+(\S+)/))
  .filter(Boolean)
  .map((m) => m[1]);

if (drifted.length === 0) {
  console.log('propose-drift: no DRIFT lines; nothing to propose.');
  process.exit(0);
}
console.log(`propose-drift: ${drifted.length} drifted file(s):`);
for (const f of drifted) console.log(`  ${f}`);

if (!TOKEN) {
  warn(
    'GH_TOKEN is not set, so no PR was opened. Add GH_ACTIONS_PAT with write access to the library.',
  );
  process.exit(0);
}

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const branch = `sync/from-${SITE}`;

try {
  git(['config', 'user.name', 'github-actions[bot]'], STARTER);
  git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], STARTER);
  git(['checkout', '-B', branch], STARTER);

  for (const rel of drifted) {
    const from = resolve(process.cwd(), rel);
    const to = join(STARTER, rel);
    if (!existsSync(from)) {
      warn(`${rel} vanished locally; skipped.`);
      continue;
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }

  git(['add', ...drifted], STARTER);
  if (!git(['status', '--porcelain'], STARTER)) {
    console.log('propose-drift: the library already matches; nothing to propose.');
    process.exit(0);
  }

  const body = [
    `Canonical files drifted in ${REPO} and this is that repo's version of them.`,
    '',
    'Opened automatically by its CI, which is currently RED on the sync-check',
    'step. Merging this is one of the two valid ways to clear that; the other is',
    'pulling the library forward into the site, or dropping the marker if the',
    'change is genuinely site-specific.',
    '',
    'Files:',
    ...drifted.map((f) => `- \`${f}\``),
    '',
    'Not auto-merged on purpose: whether a change belongs in the library that',
    'every future project inherits is a judgement, not a diff. If you take it,',
    'add a PORTS.md card in the same commit.',
  ].join('\n');

  git(
    ['commit', '-m', `Drift from ${SITE}: ${drifted.length} canonical file(s)`, '-m', body],
    STARTER,
  );
  // The starter checkout is made by actions/checkout, which persists its own
  // credentials into that clone's config as
  //   http.https://github.com/.extraheader = AUTHORIZATION: basic <GITHUB_TOKEN>
  // That header OUTRANKS the userinfo in the push URL, so without this the push
  // authenticates as github-actions[bot] scoped to the SITE repo and the library
  // answers 403 - in a message about the bot that never mentions the PAT, which
  // is why it reads like a missing or wrong secret and is not one. Proved on
  // mas-monograms#36, 2026-09-06: GH_ACTIONS_PAT was present and correct the
  // whole time and was simply never consulted.
  for (const key of git(['config', '--local', '--name-only', '--list'], STARTER).split('\n')) {
    const k = key.trim();
    if (k.endsWith('.extraheader')) {
      spawnSync('git', ['config', '--local', '--unset-all', k], { cwd: STARTER });
    }
  }

  git(
    [
      'push',
      '--force-with-lease',
      `https://x-access-token:${TOKEN}@github.com/${LIBRARY}.git`,
      `HEAD:refs/heads/${branch}`,
    ],
    STARTER,
  );

  const existing = spawnSync(
    'gh',
    [
      'pr',
      'list',
      '--repo',
      LIBRARY,
      '--head',
      branch,
      '--state',
      'open',
      '--json',
      'number',
      '--jq',
      '.[0].number',
    ],
    { encoding: 'utf8', env: { ...process.env, GH_TOKEN: TOKEN } },
  );
  const num = (existing.stdout || '').trim();
  if (num) {
    console.log(`propose-drift: updated existing PR #${num} on ${LIBRARY}.`);
  } else {
    const created = spawnSync(
      'gh',
      [
        'pr',
        'create',
        '--repo',
        LIBRARY,
        '--head',
        branch,
        '--base',
        'main',
        '--title',
        `Drift from ${SITE}`,
        '--body',
        body,
      ],
      { encoding: 'utf8', env: { ...process.env, GH_TOKEN: TOKEN } },
    );
    console.log((created.stdout || created.stderr || '').trim() || 'propose-drift: PR created.');
  }
} catch (err) {
  warn(
    `could not open the PR (${String(err.message || err).slice(0, 160)}). The sync-check failure still stands.`,
  );
}
process.exit(0);

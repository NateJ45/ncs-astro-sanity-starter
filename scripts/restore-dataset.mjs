#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// restore-dataset.mjs - decrypt a nightly backup and put it back
// =============================================================================
// WHY THIS EXISTS
//
// sanity-backup.yml had run nightly and green for months on every site before
// anyone checked whether the tarballs could be restored. 33 successful runs
// prove the export and encrypt steps work. They prove nothing about whether a
// client's content can actually be recovered, which is the only property
// anyone cares about. A backup nobody has restored is a gate that passes while
// doing nothing - see the vault note "written-is-not-verified".
//
// This turns the restore from a paragraph of instructions read under pressure
// into one command with the dangerous parts guarded.
//
// USAGE
//   BACKUP_PASSPHRASE='...' node scripts/restore-dataset.mjs \
//     --file sanity-backup-2026-09-06.tar.gz.enc \
//     --project <projectId> \
//     --dataset restore-drill
//
//   Options:
//     --file      the .enc artifact from the sanity-backup workflow (required)
//     --project   Sanity project id (default: SANITY_STUDIO_PROJECT_ID env)
//     --dataset   target dataset (default: restore-drill)
//     --create    create the target dataset first if it does not exist
//     --replace   pass --replace to the import (required to overwrite content)
//     --i-understand-this-overwrites-production
//                 the only way to target `production`. There is no short flag
//                 and no env var on purpose.
//
// Needs SANITY_AUTH_TOKEN with WRITE access (the backup only needs read).
//
// WHAT IT WILL NOT DO
//
// It refuses to touch `production` without the long flag, because the realistic
// disaster is not "the backup was corrupt", it is someone restoring a
// three-week-old dataset over a live site at 9pm while trying to fix something
// smaller. Restoring into a scratch dataset is free and reversible; that is the
// default, and the drill in docs/RESTORE-DRILL.md never does anything else.
//
// It also never prints the passphrase, and it deletes the decrypted plaintext
// tarball when it is done: an unencrypted dataset sitting in a working copy is
// the same leak the workflow's encrypt step exists to prevent.
// =============================================================================
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const die = (msg) => {
  console.error(`restore: ${msg}`);
  process.exit(1);
};

const file = opt('--file');
const project = opt('--project', process.env.SANITY_STUDIO_PROJECT_ID);
const dataset = opt('--dataset', 'restore-drill');
const passphrase = process.env.BACKUP_PASSPHRASE;

if (!file) die('--file is required (the .enc artifact from the backup workflow).');
if (!existsSync(file)) die(`${file} does not exist.`);
if (!project) die('--project is required, or set SANITY_STUDIO_PROJECT_ID.');
if (!passphrase)
  die('BACKUP_PASSPHRASE is not set. It is the passphrase the backup was encrypted with.');
if (!process.env.SANITY_AUTH_TOKEN)
  die('SANITY_AUTH_TOKEN is not set. A restore needs a WRITE token.');

if (dataset === 'production' && !flag('--i-understand-this-overwrites-production')) {
  die(
    'refusing to target `production`.\n' +
      '  Restore into a scratch dataset first and check it (that is what --dataset defaults to).\n' +
      '  If you have genuinely decided to overwrite the live dataset, pass\n' +
      '  --i-understand-this-overwrites-production',
  );
}

// The backup workflow can say ./node_modules/.bin/sanity because it only ever
// runs on Ubuntu. This script runs on whatever laptop the restore is happening
// from, and on Windows that path does not resolve - npm writes a .cmd shim
// there instead. A restore is not the moment to discover that.
const SANITY = join('node_modules', '.bin', process.platform === 'win32' ? 'sanity.cmd' : 'sanity');
if (!existsSync(SANITY)) {
  die(`${SANITY} not found. Run this from the repo root, after npm ci.`);
}

// The decrypted tarball is plaintext client content. Keep its life as short as
// possible and remove it even if the import throws.
const plain = basename(file).replace(/\.enc$/, '');
let decrypted = false;

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}`);
};

try {
  console.log(`restore: decrypting ${file}`);
  run('openssl', [
    'enc',
    '-d',
    '-aes-256-cbc',
    '-pbkdf2',
    '-iter',
    '200000',
    '-in',
    file,
    '-out',
    plain,
    '-pass',
    'env:BACKUP_PASSPHRASE',
  ]);
  decrypted = true;

  if (flag('--create')) {
    console.log(`restore: creating dataset ${dataset} (ignored if it exists)`);
    // Not fatal: the CLI errors when the dataset is already there, which is
    // the normal case on a repeat drill.
    spawnSync(SANITY, ['dataset', 'create', dataset, '--project-id', project], {
      stdio: 'inherit',
    });
  }

  const importArgs = ['dataset', 'import', plain, dataset, '--project-id', project];
  if (flag('--replace')) importArgs.push('--replace');
  console.log(`restore: importing into ${project}/${dataset}`);
  run(SANITY, importArgs);

  // The check that makes this a verification rather than a hopeful command.
  // A restore that imports 0 documents "succeeds" just as loudly as one that
  // imports 4,000.
  const count = execFileSync(
    SANITY,
    ['documents', 'query', 'count(*)', '--project-id', project, '--dataset', dataset],
    { encoding: 'utf8' },
  ).trim();
  console.log(`\nrestore: ${project}/${dataset} now holds ${count} documents.`);
  console.log('restore: compare that against production before believing the drill passed:');
  console.log(
    `  ${SANITY} documents query 'count(*)' --project-id ${project} --dataset production`,
  );
} finally {
  if (decrypted && existsSync(plain)) {
    rmSync(plain);
    console.log(`restore: removed the decrypted ${plain}`);
  }
}

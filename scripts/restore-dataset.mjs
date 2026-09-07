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
// USAGE (from the repo root; .env is read automatically)
//   node scripts/restore-dataset.mjs \
//     --file sanity-backup-2026-09-06.tar.gz.enc \
//     --project uz2sl3zp \
//     --dataset restore-drill --create
//
//   Options:
//     --file      the .enc artifact from the sanity-backup workflow (required)
//     --project   Sanity project id (default: SANITY_STUDIO_PROJECT_ID or
//                 PUBLIC_SANITY_PROJECT_ID, from the environment or .env)
//     --dataset   target dataset (default: restore-drill)
//     --create    create the target dataset first if it does not exist
//     --replace   pass --replace to the import (required to overwrite content)
//     --i-understand-this-overwrites-production
//                 the only way to target `production`. There is no short flag
//                 and no env var on purpose.
//
// Reads BACKUP_PASSPHRASE, and a WRITE token from either
// SANITY_API_WRITE_TOKEN (preferred) or SANITY_AUTH_TOKEN, from the environment
// or .env. The backup itself only needs a READ token, so the workflow's secret
// may not be enough to import.
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
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadEnv } from './lib/loadEnv.mjs';

// Read .env as well as the shell environment. The first real drill
// (presacademy, 2026-09-06) died on "BACKUP_PASSPHRASE is not set" while the
// passphrase sat in .env the whole time. Every other script in this family
// loads .env, so demanding a manual export here made this one the odd one out,
// at the exact moment - a restore - when nobody should be debugging ergonomics.
// Shell env still wins over .env, which is what CI relies on.
const env = loadEnv(process.cwd());

// The token goes by two names here, and the ORDER matters. A restore needs
// WRITE; the backup only needs READ, and SANITY_AUTH_TOKEN is the name the
// backup workflow uses, so on a machine that has both (presacademy's .env has
// exactly that) preferring SANITY_AUTH_TOKEN would hand the import a read token
// and fail on permissions - looking for all the world like a broken backup.
// Prefer the one that says write.
const AUTH_TOKEN = env.SANITY_API_WRITE_TOKEN || env.SANITY_AUTH_TOKEN;

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
const project = opt('--project', env.SANITY_STUDIO_PROJECT_ID || env.PUBLIC_SANITY_PROJECT_ID);
const dataset = opt('--dataset', 'restore-drill');
const passphrase = env.BACKUP_PASSPHRASE;

if (!file) die('--file is required (the .enc artifact from the backup workflow).');
if (!existsSync(file)) die(`${file} does not exist.`);
if (!project) die('--project is required, or set SANITY_STUDIO_PROJECT_ID in .env.');
if (!passphrase)
  die(
    'BACKUP_PASSPHRASE is not set, in the environment or in .env at the repo root.\n' +
      '  It is the passphrase the backup was encrypted with - the copy you stored\n' +
      '  OUTSIDE GitHub, since GitHub never shows a secret twice.',
  );
if (!AUTH_TOKEN)
  die(
    'No write token found. Set SANITY_AUTH_TOKEN or SANITY_API_WRITE_TOKEN, in the\n' +
      '  environment or in .env. Note the backup only needs a READ token, so the one\n' +
      '  in the workflow secret may not be enough to import.',
  );

if (dataset === 'production' && !flag('--i-understand-this-overwrites-production')) {
  die(
    'refusing to target `production`.\n' +
      '  Restore into a scratch dataset first and check it (that is what --dataset defaults to).\n' +
      '  If you have genuinely decided to overwrite the live dataset, pass\n' +
      '  --i-understand-this-overwrites-production',
  );
}

// Run the CLI's own entry script through THIS node, rather than the shim in
// node_modules/.bin. Two Windows problems disappear at once: the shim there is
// sanity.cmd rather than an extensionless file, and since the fix for
// CVE-2024-27980 Node refuses to spawnSync a .cmd without shell:true, which
// fails as a bare EINVAL (drill two, presacademy 2026-09-06). Handing the .js
// entry to process.execPath needs no shell, so no quoting question either -
// and `count(*)` is about to be passed as an argument.
const SANITY = join('node_modules', 'sanity', 'bin', 'sanity');
if (!existsSync(SANITY)) {
  die(`${SANITY} not found. Run this from the repo root, after npm ci.`);
}
const sanity = (args, opts = {}) => run(process.execPath, [SANITY, ...args], opts);

// The decrypted tarball is plaintext client content. Keep its life as short as
// possible and remove it even if the import throws.
const plain = basename(file).replace(/\.enc$/, '');
let decrypted = false;

// Values read from .env exist only in `env`, not in process.env, so every child
// has to be given them explicitly: openssl reads the passphrase via
// `-pass env:BACKUP_PASSPHRASE` from ITS environment, and the Sanity CLI wants
// SANITY_AUTH_TOKEN in its own. Inheriting process.env alone would fail here
// with a "bad decrypt" or an auth error rather than anything that points at the
// real cause.
const CHILD_ENV = {
  ...process.env,
  BACKUP_PASSPHRASE: passphrase,
  SANITY_AUTH_TOKEN: AUTH_TOKEN,
};

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: CHILD_ENV, ...opts });
  // r.error is set when the process never started at all (a missing binary is
  // the usual one). Reporting only r.status turns that into "exited null",
  // which says nothing. The first drill lost a round trip to exactly that.
  if (r.error) throw new Error(`could not run ${cmd}: ${r.error.code} ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}`);
};

// Decrypt in Node rather than shelling out to openssl. The workflow can rely on
// openssl because it runs on a GitHub runner; a restore runs on whichever
// machine is to hand, and on Windows openssl is typically only present via Git
// for Windows' mingw64\bin, which is not always on PATH. The first drill
// (presacademy, 2026-09-06) failed there - and a disaster recovery tool that
// depends on a binary the recovering machine may not have is a poor bet.
//
// This reproduces `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -salt`
// exactly: the file is "Salted__" + an 8-byte salt + ciphertext, and the key
// and IV are the first 48 bytes of PBKDF2-SHA256 over the passphrase and salt.
// Verified against openssl's own output on a real 27.5 MB backup: both produce
// byte-identical 28,792,515-byte tarballs.
const decrypt = () => {
  const buf = readFileSync(file);
  if (buf.subarray(0, 8).toString() !== 'Salted__') {
    throw new Error(`${file} is not an openssl salted file; is it the right artifact?`);
  }
  const keyiv = pbkdf2Sync(passphrase, buf.subarray(8, 16), 200000, 48, 'sha256');
  const d = createDecipheriv('aes-256-cbc', keyiv.subarray(0, 32), keyiv.subarray(32, 48));
  let out;
  try {
    out = Buffer.concat([d.update(buf.subarray(16)), d.final()]);
  } catch {
    // The only realistic cause, and worth saying plainly rather than leaking a
    // padding error: a wrong passphrase cannot be distinguished from corruption
    // by the cipher, but it is overwhelmingly the likelier of the two.
    throw new Error('decryption failed - almost certainly the wrong BACKUP_PASSPHRASE.');
  }
  if (!(out[0] === 0x1f && out[1] === 0x8b)) {
    throw new Error(
      'decrypted, but the result is not a gzip archive. Wrong passphrase or a corrupt backup.',
    );
  }
  writeFileSync(plain, out);
  return out.length;
};

try {
  console.log(`restore: decrypting ${file}`);
  const bytes = decrypt();
  console.log(`restore: decrypted ${bytes.toLocaleString()} bytes to ${plain}`);
  decrypted = true;

  if (flag('--create')) {
    console.log(`restore: creating dataset ${dataset} (ignored if it exists)`);
    // Not fatal on its own: the CLI errors when the dataset already exists,
    // which is the normal case on a repeat drill. The check below decides.
    spawnSync(process.execPath, [SANITY, 'dataset', 'create', dataset, '--project-id', project], {
      stdio: 'inherit',
      env: CHILD_ENV,
    });
  }

  // Confirm the target actually exists before importing into it. Drill three
  // (presacademy, 2026-09-06) went wrong precisely here: the token could write
  // content but lacked sanity.project.datasets/create, so `dataset create`
  // failed, this script carried on regardless, and the import died with
  // "Dataset not found" plus twenty lines of client stack trace. The real cause
  // was the line above it, already scrolled past. Fail on the actual problem.
  const datasets = execFileSync(
    process.execPath,
    [SANITY, 'dataset', 'list', '--project-id', project],
    { encoding: 'utf8', env: CHILD_ENV },
  )
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean);

  if (!datasets.includes(dataset)) {
    // THROW, never die(): die() calls process.exit(), which skips the finally
    // block below and would leave the decrypted dataset sitting on disk in
    // plaintext - the exact leak the workflow's encrypt step exists to prevent,
    // reintroduced by the error path.
    throw new Error(
      `the dataset "${dataset}" does not exist and could not be created.\n` +
        `  Datasets this token can see: ${datasets.join(', ') || '(none)'}\n\n` +
        '  Creating a dataset is a PROJECT-ADMIN action, and a content write token\n' +
        '  does not carry it (the grant is sanity.project.datasets/create). Either:\n' +
        `    - create "${dataset}" once at https://www.sanity.io/manage, then re-run\n` +
        '      this command without --create, or\n' +
        '    - use a token with administrator rights for the drill.\n' +
        '  Nothing has been written, and the decrypted tarball has been removed.',
    );
  }

  const importArgs = ['dataset', 'import', plain, dataset, '--project-id', project];
  if (flag('--replace')) importArgs.push('--replace');
  console.log(`restore: importing into ${project}/${dataset}`);
  sanity(importArgs);

  // The check that makes this a verification rather than a hopeful command.
  // A restore that imports 0 documents "succeeds" just as loudly as one that
  // imports 4,000.
  const count = execFileSync(
    process.execPath,
    [SANITY, 'documents', 'query', 'count(*)', '--project-id', project, '--dataset', dataset],
    { encoding: 'utf8', env: CHILD_ENV },
  ).trim();
  console.log(`\nrestore: ${project}/${dataset} now holds ${count} documents.`);
  console.log('restore: compare that against production before believing the drill passed:');
  console.log(
    `  node ${SANITY} documents query "count(*)" --project-id ${project} --dataset production`,
  );
} catch (err) {
  // A restore failing is normal and informative; a stack trace is not. Print
  // the message, let the finally below clean up, and exit non-zero via
  // exitCode rather than exit() so that cleanup actually happens.
  console.error(`\nrestore: ${err.message}`);
  process.exitCode = 1;
} finally {
  if (decrypted && existsSync(plain)) {
    rmSync(plain);
    console.log(`restore: removed the decrypted ${plain}`);
  }
}

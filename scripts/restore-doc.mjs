#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// restore-doc.mjs - put ONE document back from a nightly backup, as a draft
// =============================================================================
// Added 2026-10-18 (PORTS.md card 111). On Sanity's free plan the Studio's
// history goes back three days and only administrators can use it, so an
// editor who wants "the page as it was on Tuesday" asks the developer, and this
// is what the developer runs. restore-dataset.mjs puts a WHOLE dataset back;
// this takes one document out of the newest nightly backup (sanity-backup.yml)
// and writes it as a DRAFT of the same document. Nothing changes on the
// website until the editor opens it, checks it and presses Publish, and the
// Studio's own "Discard changes" undoes the restore.
//
// USAGE (from the repo root; .env is read automatically)
//   node scripts/restore-doc.mjs <docId>                         # newest backup, dry run
//   node scripts/restore-doc.mjs <docId> --from 2026-10-15       # that night's backup
//   node scripts/restore-doc.mjs <docId> --from sanity-backup-2026-10-15-docs.tar.gz.enc
//   node scripts/restore-doc.mjs <docId> --from export.tar.gz    # an unencrypted export
//   NCS_PRODUCTION_WRITE=yes node scripts/restore-doc.mjs <docId> --apply
//
// <docId> is the document's id (the end of the Studio URL, or
// `npx sanity documents query '*[_type=="page" && title match "Easter*"]{_id,title}'`).
// "drafts.x" and "x" are the same document here.
//
// WHERE THE BACKUP COMES FROM. With no file, the script downloads the newest
// successful "sanity-backup" artifact (or the one from the --from date) with
// the GitHub CLI (`gh`, signed in), into a temporary folder it deletes after.
// Artifacts are kept 14 days; for anything older use the weekly R2 copy
// (sanity-backup.yml) and pass the file. The artifact is encrypted:
// BACKUP_PASSPHRASE must be in the environment or .env. The decrypted data
// never touches the disk.
//
// SAFETY. Dry by default: it prints which backup, which copy of the document,
// and a field-by-field summary of what would change, and writes nothing.
// --apply writes the one draft; on the production dataset it also needs
// NCS_PRODUCTION_WRITE=yes in the same command (CLAUDE.md rule 16, card 86;
// enforced by scripts/lib/sanity-lib.mjs). Images and files come back as
// references to the same assets, which Sanity keeps unless someone deletes the
// asset itself. Any old "Publish automatically at" is dropped.
// =============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from './lib/loadEnv.mjs';
import { APPLY, client, dataset, projectId } from './lib/sanity-lib.mjs';
import {
  backupDate,
  decryptBackup,
  diffSummary,
  exportNdjson,
  findInExport,
  publishedId,
  restoreMutation,
} from './lib/restore-doc.mjs';

const env = loadEnv(process.cwd());
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const docArg = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--from');
const from = opt('--from');

function die(msg) {
  console.error(`restore-doc: ${msg}`);
  process.exit(1);
}

if (!docArg) die('which document? Usage: node scripts/restore-doc.mjs <docId> [--from ...]');
const id = publishedId(docArg);

/** Run gh and return stdout, or throw with its own words. */
function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.error)
    throw new Error(
      `could not run gh (${r.error.code}). Install and sign in to the GitHub CLI, or pass --from <file>.`,
    );
  if (r.status !== 0) throw new Error(`gh ${args[0]} ${args[1]} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

/**
 * The gzip bytes of the backup to read, and a label. A local file is read
 * directly; otherwise the newest (or the dated) artifact is downloaded.
 */
function loadBackup(tmp) {
  const passphrase = env.BACKUP_PASSPHRASE;
  const readFile = (path) => {
    const buf = readFileSync(path);
    if (path.endsWith('.enc')) {
      if (!passphrase) throw new Error('BACKUP_PASSPHRASE is not set (environment or .env).');
      return decryptBackup(buf, passphrase);
    }
    return buf;
  };

  if (from && existsSync(from)) return { gz: readFile(from), label: from };
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw new Error(`--from ${from} is neither a file nor a date (YYYY-MM-DD).`);
  }

  const runs = JSON.parse(
    gh([
      'run',
      'list',
      '--workflow',
      'sanity-backup.yml',
      '--status',
      'success',
      '--limit',
      '20',
      '--json',
      'databaseId,createdAt',
    ]),
  );
  if (!runs.length) throw new Error('no successful sanity-backup runs found on GitHub.');
  for (const run of runs) {
    const dir = join(tmp, String(run.databaseId));
    try {
      gh(['run', 'download', String(run.databaseId), '--name', 'sanity-backup', '--dir', dir]);
    } catch {
      continue; // expired artifact (older than 14 days): try the next run
    }
    const file = readdirSync(dir).find((f) => f.endsWith('.enc'));
    if (!file) continue;
    if (from && backupDate(file) !== from) continue;
    return { gz: readFile(join(dir, file)), label: `${file} (GitHub run ${run.databaseId})` };
  }
  throw new Error(
    from
      ? `no downloadable backup from ${from}. Artifacts last 14 days; older ones are in R2.`
      : 'no downloadable backup artifact found.',
  );
}

const tmp = mkdtempSync(join(tmpdir(), 'restore-doc-'));
try {
  const { gz, label } = loadBackup(tmp);
  console.log(`restore-doc: backup ${label}`);

  const hit = findInExport(exportNdjson(gz), id);
  if (!hit) throw new Error(`"${id}" is not in that backup. Check the id, or try an older night.`);

  const [published, draft] = await Promise.all([
    client.getDocument(id),
    client.getDocument(`drafts.${id}`),
  ]);
  const current = draft ?? published ?? null;
  console.log(
    `restore-doc: ${hit.doc._type} "${id}" in ${projectId}/${dataset}` +
      (hit.wasDraft ? ' (the backup only had an unpublished draft of it)' : ''),
  );
  console.log(
    `restore-doc: comparing with ${current ? (draft ? 'its unpublished draft' : 'the published copy') : 'nothing (the document is gone now)'}`,
  );

  const rows = diffSummary(current, hit.doc);
  if (!rows.length) {
    console.log('restore-doc: the backup copy is the same as now. Nothing to do.');
  } else {
    for (const r of rows) {
      console.log(`  ${r.change.padEnd(8)} ${r.field}: ${r.now} -> ${r.then}`);
    }
    if (draft) {
      console.log('restore-doc: NOTE this replaces the unpublished changes in the current draft.');
    }
    if (APPLY) {
      await client.mutate([restoreMutation(hit.doc)]);
      const back = await client.getDocument(`drafts.${id}`);
      if (!back)
        throw new Error('the write returned, but the draft is not there. Check the Studio.');
      console.log(
        `\nAPPLIED: "${id}" is back as a draft. Ask the editor to open it, check it and press Publish (or Discard changes to undo).`,
      );
    } else {
      console.log(
        `\nDRY RUN: ${rows.length} field(s) would change, as a draft only. Re-run with --apply` +
          (dataset === 'production' ? ' and NCS_PRODUCTION_WRITE=yes.' : '.'),
      );
    }
  }
} catch (err) {
  console.error(`restore-doc: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

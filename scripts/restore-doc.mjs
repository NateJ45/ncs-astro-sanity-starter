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
//   node scripts/restore-doc.mjs <docId> --run 123456789         # that backup run's artifact
//   node scripts/restore-doc.mjs <docId> --scan                  # every kept backup, read only
//   NCS_PRODUCTION_WRITE=yes node scripts/restore-doc.mjs <docId> --apply
//
// <docId> is the document's id (the end of the Studio URL, or
// `npx sanity documents query '*[_type=="page" && title match "Easter*"]{_id,title}'`).
// "drafts.x" and "x" are the same document here.
//
// WHERE THE BACKUP COMES FROM. With no file, the script downloads the newest
// successful "sanity-backup" artifact (or the one from the --from date, or the
// --run id) with the GitHub CLI (`gh`, signed in), into a temporary folder it
// deletes after. Artifacts are kept 14 days; for anything older use the weekly
// R2 copy (sanity-backup.yml) and pass the file. The artifact is encrypted:
// BACKUP_PASSPHRASE must be in the environment or .env. The decrypted data
// never touches the disk.
//
// SAFETY. Dry by default: it prints which backup, which copy of the document,
// and a field-by-field summary of what would change, and writes nothing.
// --apply writes the one draft; on the production dataset it also needs
// NCS_PRODUCTION_WRITE=yes in the same command (CLAUDE.md rule 16, card 86;
// enforced by scripts/lib/sanity-lib.mjs). Images and files come back as
// references to the same assets, which Sanity keeps unless someone deletes the
// asset itself. Any old "Publish automatically at" is dropped. Sanity's own
// system documents (assets, roles, ids starting "_") are never restored.
//
// THE STUDIO'S "EARLIER VERSIONS" (PORTS.md card 124). The Studio cannot hold
// BACKUP_PASSPHRASE, so its panel asks GitHub Actions to run this script
// (.github/workflows/restore-doc.yml): --scan lists the last 14 backups that
// hold the document and which fields differ from now; --run <id> picks one
// backup to put back (dry run, then --apply, in the same job). In CI it always
// runs with --no-values, because a public repository's run logs are public:
// field NAMES and list lengths only, never what a field said. The last line of
// output is a marker (NCS_EARLIER_VERSIONS or NCS_RESTORE, then JSON) that the
// Worker endpoint reads back (src/pages/api/studio/earlier-versions.ts).
// =============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from './lib/loadEnv.mjs';
import { APPLY, client, dataset, projectId } from './lib/sanity-lib.mjs';
import {
  backupDate,
  changeSummary,
  decryptBackup,
  diffSummary,
  exportNdjson,
  findInExport,
  markerLine,
  publishedId,
  restoreMutation,
  restoreRefusal,
  sameContent,
} from './lib/restore-doc.mjs';

const env = loadEnv(process.cwd());
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const VALUED = new Set(['--from', '--run']);
const docArg = argv.find((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
const from = opt('--from');
const runArg = opt('--run');
const SCAN = argv.includes('--scan');
// Public logs (CI): which fields differ, never their words.
const NO_VALUES = argv.includes('--no-values');
/** How many nightly backups --scan reads (GitHub keeps them 14 days). */
const SCAN_LIMIT = 14;

function die(msg) {
  console.error(`restore-doc: ${msg}`);
  process.exit(1);
}

if (!docArg) die('which document? Usage: node scripts/restore-doc.mjs <docId> [--from ...]');
const id = publishedId(docArg);
if (runArg && !/^\d{1,15}$/.test(runArg)) die(`--run ${runArg} is not a GitHub run id.`);
if (SCAN && APPLY) die('--scan only reads. Pick one backup with --run <id> to put it back.');

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

/** The successful sanity-backup runs, newest first. */
function backupRuns(limit) {
  return JSON.parse(
    gh([
      'run',
      'list',
      '--workflow',
      'sanity-backup.yml',
      '--status',
      'success',
      '--limit',
      String(limit),
      '--json',
      'databaseId,createdAt',
    ]),
  );
}

/** Download one run's backup artifact into tmp: { path, file }, or null when it has expired. */
function downloadRun(tmp, runId) {
  const dir = join(tmp, String(runId));
  try {
    gh(['run', 'download', String(runId), '--name', 'sanity-backup', '--dir', dir]);
  } catch {
    return null; // expired artifact (older than 14 days)
  }
  const file = readdirSync(dir).find((f) => f.endsWith('.enc'));
  return file ? { path: join(dir, file), file } : null;
}

/** The gzip bytes of a backup file, decrypted when it is the .enc artifact. */
function readBackupFile(path) {
  const buf = readFileSync(path);
  if (path.endsWith('.enc')) {
    const passphrase = env.BACKUP_PASSPHRASE;
    if (!passphrase) throw new Error('BACKUP_PASSPHRASE is not set (environment or .env).');
    return decryptBackup(buf, passphrase);
  }
  return buf;
}

/**
 * The gzip bytes of the backup to read, and a label. A local file is read
 * directly; otherwise the --run artifact, or the newest (or the dated) one, is
 * downloaded.
 */
function loadBackup(tmp) {
  if (from && existsSync(from)) return { gz: readBackupFile(from), label: from };
  if (runArg) {
    const got = downloadRun(tmp, runArg);
    if (!got)
      throw new Error(`backup run ${runArg} has no downloadable backup (older than 14 days?).`);
    return { gz: readBackupFile(got.path), label: `${got.file} (GitHub run ${runArg})` };
  }
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw new Error(`--from ${from} is neither a file nor a date (YYYY-MM-DD).`);
  }

  const runs = backupRuns(20);
  if (!runs.length) throw new Error('no successful sanity-backup runs found on GitHub.');
  for (const run of runs) {
    const got = downloadRun(tmp, run.databaseId);
    if (!got) continue; // expired: try the next run
    if (from && backupDate(got.file) !== from) continue;
    return { gz: readBackupFile(got.path), label: `${got.file} (GitHub run ${run.databaseId})` };
  }
  throw new Error(
    from
      ? `no downloadable backup from ${from}. Artifacts last 14 days; older ones are in R2.`
      : 'no downloadable backup artifact found.',
  );
}

/** The document as it is now: its draft if it has one, else the published copy, else null. */
async function currentCopy() {
  const [published, draft] = await Promise.all([
    client.getDocument(id),
    client.getDocument(`drafts.${id}`),
  ]);
  return { current: draft ?? published ?? null, draft, published };
}

/**
 * --scan: every kept backup that holds the document, newest first, with the
 * fields that differ from now (names and list lengths only) and whether it is
 * the same as the next newer backup. Writes nothing.
 */
async function scan(tmp) {
  const { current } = await currentCopy();
  const versions = [];
  let newer = null;
  let looked = 0;
  for (const run of backupRuns(30)) {
    if (looked >= SCAN_LIMIT) break;
    const got = downloadRun(tmp, run.databaseId);
    if (!got) continue;
    looked++;
    const hit = findInExport(exportNdjson(readBackupFile(got.path)), id);
    rmSync(join(tmp, String(run.databaseId)), { recursive: true, force: true });
    const kind = got.file.includes('-full.')
      ? 'full'
      : got.file.includes('-docs.')
        ? 'docs'
        : 'other';
    const date = backupDate(got.file) ?? String(run.createdAt).slice(0, 10);
    if (!hit || restoreRefusal(hit.doc)) {
      versions.push({ run: run.databaseId, date, kind, found: false });
      console.log(`  ${date}  not in this backup`);
      continue;
    }
    const changes = changeSummary(current, hit.doc);
    const sameAsNewer = newer ? sameContent(newer, hit.doc) : false;
    newer = hit.doc;
    versions.push({
      run: run.databaseId,
      date,
      kind,
      found: true,
      wasDraft: hit.wasDraft,
      sameAsNow: changes.length === 0,
      sameAsNewer,
      changes,
    });
    console.log(
      `  ${date}  ` +
        (changes.length
          ? `${changes.length} field(s) differ from now: ${changes.map((c) => c.field).join(', ')}`
          : 'same as now'),
    );
  }
  console.log(`restore-doc: looked through ${looked} backup(s) for "${id}".`);
  console.log(
    markerLine('NCS_EARLIER_VERSIONS', { id, exists: Boolean(current), looked, versions }),
  );
}

const tmp = mkdtempSync(join(tmpdir(), 'restore-doc-'));
try {
  if (SCAN) {
    await scan(tmp);
  } else {
    const { gz, label } = loadBackup(tmp);
    console.log(`restore-doc: backup ${label}`);

    const hit = findInExport(exportNdjson(gz), id);
    if (!hit)
      throw new Error(`"${id}" is not in that backup. Check the id, or try an older night.`);
    const refusal = restoreRefusal(hit.doc);
    if (refusal) throw new Error(refusal);

    const { current, draft } = await currentCopy();
    console.log(
      `restore-doc: ${hit.doc._type} "${id}" in ${projectId}/${dataset}` +
        (hit.wasDraft ? ' (the backup only had an unpublished draft of it)' : ''),
    );
    console.log(
      `restore-doc: comparing with ${current ? (draft ? 'its unpublished draft' : 'the published copy') : 'nothing (the document is gone now)'}`,
    );

    const rows = NO_VALUES ? changeSummary(current, hit.doc) : diffSummary(current, hit.doc);
    if (!rows.length) {
      console.log('restore-doc: the backup copy is the same as now. Nothing to do.');
      if (NO_VALUES) console.log(markerLine('NCS_RESTORE', { id, applied: false, same: true }));
    } else {
      for (const r of rows) {
        if (NO_VALUES) {
          const counts =
            r.then !== null || r.now !== null
              ? ` (${r.now ?? 0} items now, ${r.then ?? 0} then)`
              : '';
          console.log(`  ${r.change.padEnd(8)} ${r.field}${counts}`);
        } else {
          console.log(`  ${r.change.padEnd(8)} ${r.field}: ${r.now} -> ${r.then}`);
        }
      }
      if (draft) {
        console.log(
          'restore-doc: NOTE this replaces the unpublished changes in the current draft.',
        );
      }
      if (APPLY) {
        await client.mutate([restoreMutation(hit.doc)]);
        const back = await client.getDocument(`drafts.${id}`);
        if (!back)
          throw new Error('the write returned, but the draft is not there. Check the Studio.');
        console.log(
          `\nAPPLIED: "${id}" is back as a draft. Ask the editor to open it, check it and press Publish (or Discard changes to undo).`,
        );
        if (NO_VALUES) {
          console.log(markerLine('NCS_RESTORE', { id, applied: true, fields: rows.length }));
        }
      } else {
        console.log(
          `\nDRY RUN: ${rows.length} field(s) would change, as a draft only. Re-run with --apply` +
            (dataset === 'production' ? ' and NCS_PRODUCTION_WRITE=yes.' : '.'),
        );
      }
    }
  }
} catch (err) {
  console.error(`restore-doc: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

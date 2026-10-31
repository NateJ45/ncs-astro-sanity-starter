// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Retire a field from the dataset after it has left the schema (rule 16).
//
// A removed schema field keeps its value on every document, and the Studio
// then shows an "Unknown fields" banner whose "Remove field" button deletes
// data (rule 1). This script is the safe way out: it finds every document of
// one type, drafts included, that still holds the field, writes those
// documents VERBATIM to a backup file, and only then unsets the field.
//
//   node scripts/retire-fields.mjs --type siteSettings --field sectionVisibility.showEDesign
//   NCS_PRODUCTION_WRITE=yes node scripts/retire-fields.mjs --type ... --field ... --apply
//
// Dry by default (scripts/lib/sanity-lib.mjs): without --apply it prints the
// plan and writes the backup, nothing else. --apply on production also needs
// NCS_PRODUCTION_WRITE=yes in the same command, after a dataset export.
// --out <dir> puts the backup somewhere else (default scripts/.retired/,
// which a site commits so the old values stay readable). Each patch is guarded
// on the document's _rev, so a document edited after the read is skipped and
// reported instead of overwritten. Run it again to confirm: a finished retire
// finds nothing.
//
// Order: remove the field from the schema (or hide it), deploy, THEN run this,
// or an editor can re-save the value from an old Studio tab.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { client, dataset, apply, done, ROOT } from './lib/sanity-lib.mjs';
import {
  parseRetireArgs,
  retireQuery,
  buildRetirePlan,
  backupBody,
} from './lib/retire-fields-plan.mjs';

let args;
try {
  args = parseRetireArgs(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const { type, fields } = args;
const outIdx = process.argv.indexOf('--out');
const outDir =
  outIdx > -1 ? resolve(process.argv[outIdx + 1]) : resolve(ROOT, 'scripts', '.retired');

const docs = await client.fetch(retireQuery(type, fields), {}, { perspective: 'raw' });
const plan = buildRetirePlan(docs, fields);

if (plan.length === 0) {
  console.log(`Nothing to retire: no ${type} document in "${dataset}" holds ${fields.join(', ')}.`);
  done(0);
  process.exit(0);
}

// Backup first, always, so the dry run leaves the same evidence the write would.
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const file = resolve(
  outDir,
  `${stamp}-${dataset}-${type}-${fields.join('+').replace(/\./g, '_')}.json`,
);
writeFileSync(file, JSON.stringify(backupBody({ type, fields, dataset, docs }), null, 2) + '\n');
console.log(`Backup of ${docs.length} document(s): ${file}\n`);

let changed = 0;
let skipped = 0;
for (const p of plan) {
  const now = Object.entries(p.values)
    .map(([f, v]) => `${f}=${JSON.stringify(v)}`)
    .join(', ');
  await apply(`unset ${now} on ${p._id}`, async () => {
    try {
      await client.patch(p._id).ifRevisionId(p._rev).unset(p.fields).commit();
    } catch (err) {
      skipped++;
      console.error(`  skipped ${p._id}: changed since it was read (${err.message}). Run again.`);
      return;
    }
    changed++;
  });
}

done(plan.length);
if (skipped) {
  console.error(`${skipped} document(s) skipped; ${changed} unset.`);
  process.exit(1);
}

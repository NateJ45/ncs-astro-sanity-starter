// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/backfill-array-types.mjs
//
// Gives every array item that was stored without a `_type` the one it should
// have, so the Studio can open it (mas-monograms, 2026-10-05: "Item of type
// object not valid for this list" on the footer links; PORTS.md card 95). See
// scripts/lib/array-types.mjs for how the type is chosen.
//
// DRY RUN BY DEFAULT. It prints every document and path it would change and
// writes nothing. Writing goes through scripts/lib/sanity-lib.mjs, so it needs
// `--apply` AND, on the production dataset, NCS_PRODUCTION_WRITE=yes in the
// same command (PORTS.md card 86):
//
//   node scripts/backfill-array-types.mjs                                  # dry run
//   NCS_PRODUCTION_WRITE=yes node scripts/backfill-array-types.mjs --apply # write
//
// Rules (same as every live write in the family):
//   - Run `npm run audit:data` first, and take a backup before --apply:
//     npx sanity dataset export production tmp/backups/<file>.tar.gz
//   - Each document is patched with `set` on only the top-level fields that
//     change, guarded by its current _rev, on the published document AND its
//     drafts. twin (both come back from the query).
//   - It never changes a value, only adds `_type`. A second --apply reports 0.
//   - An item it cannot place (fits no member, or ties between two) is listed
//     as UNPLACED and left alone for a person to decide.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Schema } from '@sanity/schema';
import { loadSchemaTypes } from './lib/load-schema.mjs';
import { fillTypes, fieldType } from './lib/array-types.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaTypes = await loadSchemaTypes(ROOT);
const { client, apply, done } = await import('./lib/sanity-lib.mjs');
const schema = Schema.compile({ name: 'default', types: schemaTypes });

const docs = await client.fetch(
  `*[!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*")]`,
);
let changes = 0;
for (const doc of docs) {
  const type = schema.get(doc._type);
  if (!type) continue;
  const set = {};
  const changed = [];
  for (const field of type.fields ?? []) {
    const ft = fieldType(field);
    if (!ft || doc[field.name] == null) continue;
    const r = fillTypes(doc[field.name], ft, `.${field.name}`);
    r.unplaced.forEach((p) => console.log(`  ${doc._id} UNPLACED ${p}`));
    if (r.changed.length) {
      set[field.name] = r.value;
      changed.push(...r.changed);
    }
  }
  if (!Object.keys(set).length) continue;
  changes += changed.length;
  changed.forEach((c) => console.log(`  ${doc._id} ${c}`));
  await apply(`${doc._id}: ${Object.keys(set).join(', ')} (${changed.length} items)`, () =>
    client.patch(doc._id).ifRevisionId(doc._rev).set(set).commit(),
  );
}
done(changes);

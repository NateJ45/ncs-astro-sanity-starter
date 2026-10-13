// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/audit-data-vs-schema.mjs
//
// Read-only audit: every stored value in the dataset against the REAL compiled
// schema. Run it as `npm run audit:data` (needs a .env with the Sanity project
// id and a token that can read the dataset, drafts included).
//
// WHY (PORTS.md card 95). On 2026-10-05 a mas-monograms editor's footer links
// showed "Item of type object not valid for this list": the seed scripts stored
// array items with no `_type`, and where an array allows more than one kind of
// item (a page link AND a typed-address link) the Studio cannot tell which one
// it is. Nothing in a build or test catches that, and `npm run audit:studio`
// reads the schema as text, so it cannot see it either. This walks the live data
// with the schema Sanity itself builds (@sanity/schema, which arrives with
// `sanity`), so it can answer, for every value:
//
//   1. an array item that is an object with no `_type`
//   2. an array item whose `_type` the array does not allow
//   3. an array item with no `_key`
//   4. a stored key the object's type does not declare (an orphan left behind
//      when a schema field was removed: the Studio's "Unknown fields" banner)
//   5. a value of the wrong kind (a number where a string is declared...)
//   6. a dropdown value that is not one of the choices
//   7. a document whose `_type` the schema does not have
//
// The schema is TypeScript; scripts/lib/load-schema.mjs loads it in plain Node
// (type stripping plus two small resolve hooks), so there is no tsx dependency.
// Published documents and their `drafts.` twins are both checked. Exit code 1 if
// anything is found. It never writes. To fix (1), run
// scripts/backfill-array-types.mjs; to fix (4), unset the values in an
// idempotent script after a backup.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Schema } from '@sanity/schema';
import { loadSchemaTypes } from './lib/load-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SYSTEM_KEYS = new Set([
  '_id',
  '_type',
  '_key',
  '_ref',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_weak',
  '_strengthenOnPublish',
  '_originalId',
  '_system',
  '_upload',
  '_dataset',
  '_projectId',
  'orderRank',
]);

/** Types whose insides Sanity or a plugin owns; we only check the outside. */
const OPAQUE = new Set([
  'image',
  'file',
  'block',
  'span',
  'reference',
  'slug',
  'geopoint',
  'crop',
  'hotspot',
]);

const KIND = {
  string: (v) => typeof v === 'string',
  text: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number',
  boolean: (v) => typeof v === 'boolean',
  url: (v) => typeof v === 'string',
  datetime: (v) => typeof v === 'string',
  date: (v) => typeof v === 'string',
};

/** Pure: check one value against one compiled type. Returns problem strings. */
export function checkValue(value, type, path, out = []) {
  if (value == null) return out;
  const t = type.jsonType;
  const name = type.name;
  if (OPAQUE.has(name)) return out;

  if (t === 'array') {
    if (!Array.isArray(value)) {
      out.push(`${path}  expected a list, found ${typeof value}`);
      return out;
    }
    const members = type.of ?? [];
    const objectMembers = members.filter((m) => m.jsonType === 'object');
    const allowed = new Map(members.map((m) => [m.name, m]));
    value.forEach((item, i) => {
      const at = `${path}[${i}]`;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        if (!item._key) out.push(`${at}  item has no _key`);
        if (!item._type) {
          if (objectMembers.length) {
            out.push(`${at}  item has no _type (a list of ${[...allowed.keys()].join(' / ')})`);
          }
          return;
        }
        const member = allowed.get(item._type);
        if (!member) {
          out.push(
            `${at}  _type "${item._type}" is not allowed here (allowed: ${[...allowed.keys()].join(', ')})`,
          );
          return;
        }
        checkValue(item, member, at, out);
      } else if (item != null) {
        // A list of plain strings or numbers.
        const ok = members.some((m) => (KIND[m.jsonType] ?? (() => true))(item));
        if (!ok) out.push(`${at}  value ${JSON.stringify(item).slice(0, 40)} is the wrong kind`);
      }
    });
    return out;
  }

  if (t === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      out.push(
        `${path}  expected an object, found ${Array.isArray(value) ? 'a list' : typeof value}`,
      );
      return out;
    }
    const declared = new Map((type.fields ?? []).map((f) => [f.name, f]));
    for (const [k, v] of Object.entries(value)) {
      if (SYSTEM_KEYS.has(k)) continue;
      const field = declared.get(k);
      if (!field) {
        out.push(`${path}.${k}  stored but the schema does not declare it`);
        continue;
      }
      // A built-in type (slug, image...) is resolved lazily and throws outside the
      // Studio's own registry; its insides are not ours to check.
      let ft;
      try {
        ft = field.type;
        void ft.jsonType;
      } catch {
        continue;
      }
      checkValue(v, ft, `${path}.${k}`, out);
    }
    return out;
  }

  const kind = KIND[t];
  if (kind && !kind(value)) {
    out.push(`${path}  expected ${t}, found ${typeof value} ${JSON.stringify(value).slice(0, 30)}`);
    return out;
  }
  const list = type.options?.list;
  if (Array.isArray(list) && typeof value === 'string') {
    const values = list.map((o) => (o && typeof o === 'object' ? o.value : o));
    if (!values.includes(value)) {
      out.push(`${path}  "${value}" is not one of the choices (${values.join(', ')})`);
    }
  }
  return out;
}

async function main() {
  const schemaTypes = await loadSchemaTypes(ROOT);
  const { client, projectId, dataset } = await import('./lib/sanity-lib.mjs');
  const schema = Schema.compile({ name: 'default', types: schemaTypes });

  console.log(`Auditing ${projectId}/${dataset} against the compiled schema (read only).\n`);
  const docs = await client.fetch(
    `*[!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*")]`,
  );
  let problems = 0;
  const unknownTypes = new Set();
  for (const doc of docs) {
    const type = schema.get(doc._type);
    if (!type) {
      unknownTypes.add(doc._type);
      continue;
    }
    const out = checkValue(doc, type, '', []);
    for (const line of out) {
      problems++;
      console.log(`  ${doc._id}${line}`);
    }
  }
  for (const t of unknownTypes) {
    problems++;
    console.log(`  documents of type "${t}" exist but the schema has no such type`);
  }
  console.log(
    `\n${docs.length} documents checked. ${problems === 0 ? 'Data matches the schema.' : `${problems} thing(s) to look at.`}`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

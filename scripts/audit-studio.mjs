// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
//
// scripts/audit-studio.mjs
//
// The Studio audit, as a command: `npm run audit:studio`.
//
// WHY THIS EXISTS. A client edits their site a handful of times a year, which
// is long enough that anything wrong in the Studio is discovered by THEM, alone,
// under time pressure, rather than by us. Every fault below has shipped on a
// real site in this family, and not one of them shows up in a build, a type
// check or a test:
//
//   1. A field that is `hidden: true` AND `Rule.required()`. Sanity validates
//      the document, not the form, so the document is permanently invalid and
//      the error names a field that is nowhere on screen.
//
//   2. A preview title selected from a number. Sanity lowercases the title to
//      index it, so the whole array field renders as a red Unhandled Runtime
//      Error.
//
//   3. A stored key the schema does not declare. The Studio renders it as
//      "Unknown field found" with a REMOVE FIELD button beside it, and that
//      button deletes the value from every document of the type with no undo
//      (CLAUDE.md rule 1). A stray key is not cosmetic; it is a loaded gun in
//      an editor's form.
//
//   4. A page document whose address is on the reserved-route list, so it
//      fails validation with "already used by a built-in page" and cannot be
//      published.
//
//   5. A collection type whose "Used on" panel disagrees with the pages that
//      really render it, or points at a page the site no longer builds. A
//      `npm run scaffold --remove` that misses a marker shows up here.
//
//   6. A required field that is blank in the live document. Some of those are
//      real jobs for the editor and some mean the requirement is wrong, but
//      either way nobody can publish until it is settled.
//
//   7. Money typed into prose. The site holds its prices in structured fields;
//      a dollar amount anywhere else is a figure somebody typed a second time,
//      and a number that exists twice will eventually disagree with itself.
//      On one site the FAQ said $50 and $60 while the price fields said $45 and
//      $55, and both were live at once, so what a visitor paid depended on
//      which page they happened to read.
//
// It reads the schema as TEXT rather than importing it, because importing the
// schema pulls in @sanity/ui and a React renderer. That means it has to know
// about the field HELPERS this repo uses: a helper call declares a field
// without ever writing `name: '...'`, and a parser that does not know them
// reports every one of them as unknown. ADD A HELPER, ADD IT TO FIELD_HELPERS.
//
// WHERE A FORK ADDS ITS OWN CHECKS. Write the check as a function returning an
// array of strings and call it through `section()` at the bottom, next to the
// seven below. Keep site-specific knowledge in the two maps near the top
// (FIELD_HELPERS and RENDERED_BY) or in the new check itself, never as a branch
// inside a shared one: this file is the family's copy (see PORTS.md), so a
// site-specific `if` here becomes everyone's. The sibling that this was ported
// from carries an eighth check of its own, comparing transcribed records
// against the results archive, which is exactly the shape a per-site check
// should take.
//
// Exit code 1 if anything is found, so it can gate a release if we ever want it
// to. It is READ-ONLY: it never writes to the dataset.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/loadEnv.mjs';

// sanity-lib.mjs EXITS THE PROCESS at import time when no project is
// configured, which is right for a script that only ever writes and wrong for
// this one: checks 1 and 2 read the schema off disk and are exactly what a
// fresh clone with no Sanity project wants to run. So the env is read here and
// the client is imported lazily, further down, only once there is a project for
// it to talk to. sanity-lib is a canonical family file (PORTS.md), so the
// import moved rather than the guard.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = resolve(root, 'src/sanity/schemaTypes');

/**
 * Field helpers, and the field names each one contributes.
 *
 * 'first-arg' means the helper is called as `helper('fieldName', ...)`.
 * An array means the helper always declares those exact names.
 */
const FIELD_HELPERS = {
  richTwin: 'first-arg',
  imageWithAlt: 'first-arg',
  proseBody: 'first-arg',
  headingAccentField: ['headingAccent'],
  columnsField: ['columns'],
  publishAtField: ['publishAt'],
  seoFields: ['seoPreview', 'seoTitle', 'seoDescription', 'seoImage', 'hideFromSearch'],
};

/**
 * Which section type renders which collection, for check 5.
 *
 * PER SITE. The left side is the collection document type whose "Used on"
 * entry in src/sanity/resolve.ts is being checked; the right is every
 * page-builder section that reads it. A section that is scaffold-removed loses
 * its collection with it, so an entry left behind here is itself a finding.
 */
const RENDERED_BY = {
  service: ['servicesGridSection'], // scaffold: services
  processStep: ['processSection'], // scaffold: process
  philosophyPoint: ['valuesSection'], // scaffold: philosophy
  testimonial: ['testimonialsSection'], // scaffold: testimonials
  faqItem: ['faqSection'], // scaffold: faq
};

/** Sanity's own object types, whose keys we do not police. */
const BUILT_IN = new Set([
  'reference',
  'image',
  'file',
  'slug',
  'block',
  'span',
  'geopoint',
  'crop',
  'hotspot',
]);

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
  // Sanity's own document metadata, written by the platform rather than by a
  // schema or an editor. It is not drift.
  '_system',
  'orderRank',
]);

const schemaFiles = () => readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'));

// ── Read the schema ────────────────────────────────────────────────────────

/** Every declared field name inside one block of schema source. */
function fieldNames(body) {
  const names = new Set([...body.matchAll(/name:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
  for (const [helper, arg] of Object.entries(FIELD_HELPERS)) {
    if (arg === 'first-arg') {
      const re = new RegExp(`${helper}\\(\\s*'([A-Za-z0-9_]+)'`, 'g');
      for (const m of body.matchAll(re)) names.add(m[1]);
    } else if (new RegExp(`\\b${helper}\\(`).test(body)) {
      for (const n of arg) names.add(n);
    }
  }
  return names;
}

/** typeName -> Set of field names, across every schema file. */
function readSchema() {
  const types = new Map();
  const add = (name, names) => types.set(name, new Set([...(types.get(name) ?? []), ...names]));

  for (const file of schemaFiles()) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');

    // Top-level document and object types.
    const starts = [...src.matchAll(/defineType\(\{\s*\n?\s*name:\s*'([A-Za-z0-9_]+)'/g)];
    starts.forEach((m, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
      add(m[1], fieldNames(src.slice(m.index, end)));
    });

    // Inline object members inside arrays, which are real types with real keys.
    for (const m of src.matchAll(
      /defineArrayMember\(\{[\s\S]{0,200}?type:\s*'object',[\s\S]{0,200}?name:\s*'([A-Za-z0-9_]+)'/g,
    )) {
      add(m[1], fieldNames(src.slice(m.index, m.index + 3000)));
    }
    for (const m of src.matchAll(
      /defineArrayMember\(\{[\s\S]{0,200}?name:\s*'([A-Za-z0-9_]+)',[\s\S]{0,200}?type:\s*'object'/g,
    )) {
      add(m[1], fieldNames(src.slice(m.index, m.index + 3000)));
    }
  }
  return types;
}

/** The source of the `{...}` object starting at `open`, brace-balanced. */
function objectAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/**
 * Preview titles taken straight from a non-string field.
 *
 * Sanity lowercases a preview title when it indexes the item for search, so a
 * title selected from a `number` throws "toLowerCase is not a function" and the
 * whole array field renders as a red Unhandled Runtime Error. A `prepare` that
 * returns a string is the fix, so a select with one beside it is fine.
 */
function numericPreviewTitles() {
  const out = [];
  const BAD = new Set(['number', 'boolean', 'date', 'datetime', 'array', 'reference', 'image']);
  for (const file of schemaFiles()) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');

    const fieldTypes = new Map();
    for (const f of src.matchAll(
      // TEMPERED: the gap must not contain another `name:`. A plain
      // [\s\S]{0,240} scans left to right and swallows the next field, so
      // `name: 'statItem'` paired itself with the `type: 'number'` belonging to
      // the field INSIDE it and the real `number` field was never seen. That is
      // why two earlier versions of this check reported nothing on a file that
      // was crashing the Studio.
      /name:\s*'([A-Za-z0-9_]+)',(?:(?!name:)[\s\S]){0,240}?type:\s*'([a-zA-Z]+)'/g,
    )) {
      if (BAD.has(f[2])) fieldTypes.set(f[1], f[2]);
    }

    // BRACE-BALANCED, NOT A PROXIMITY GUESS. The first cut looked for the word
    // "prepare" within 600 characters of the select and found the PARENT
    // object's prepare, so it cleared the very bug it was written for. Reading
    // the preview object itself is the only way to know whether this preview
    // has one.
    for (const p of src.matchAll(/preview:\s*\{/g)) {
      const open = p.index + p[0].length - 1;
      const block = objectAt(src, open);
      if (/\bprepare\b/.test(block)) continue;
      const title = block.match(/title:\s*'([A-Za-z0-9_]+)'/);
      if (!title) continue;
      const declared = fieldTypes.get(title[1]);
      if (!declared) continue;
      const line = src.slice(0, p.index).split('\n').length;
      out.push(`${file}:${line}  preview title '${title[1]}' is a ${declared}, with no prepare()`);
    }
  }
  return out;
}

/** Fields that are hidden and required at once. */
function hiddenRequired() {
  const out = [];
  for (const file of schemaFiles()) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');
    // INDENTATION IS THE ONLY DEPTH SIGNAL HERE, and it has to be used. A
    // field's own declarations sit at six spaces; anything deeper belongs to an
    // array member, whose required rules fire per row and so cannot block a
    // document whose array is empty. Matched loosely, every hidden array with
    // required members was reported as a blocker, which is the kind of false
    // alarm that teaches everyone to ignore the tool.
    for (const m of src.matchAll(/^ {4}defineField\(\{\n([\s\S]*?)\n {4}\}\),?$/gm)) {
      const body = m[1];
      if (!/^ {6}hidden:\s*true/m.test(body)) continue;
      if (!/^ {6}validation:[\s\S]{0,300}?Rule\.required\(\)/m.test(body)) continue;
      const name = body.match(/^ {6}name:\s*'([A-Za-z0-9_]+)'/m)?.[1] ?? '?';
      out.push(`${file}:${src.slice(0, m.index).split('\n').length}  ${name}`);
    }
  }
  return out;
}

/** Every field marked required, per document type. */
function requiredFields() {
  const out = new Map();
  for (const file of schemaFiles()) {
    const src = readFileSync(resolve(SCHEMA_DIR, file), 'utf8');
    const starts = [...src.matchAll(/defineType\(\{\s*\n?\s*name:\s*'([A-Za-z0-9_]+)'/g)];
    starts.forEach((m, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
      const body = src.slice(m.index, end);
      if (!/type:\s*'document'/.test(body.slice(0, 400))) return;
      // Top-level fields only, by indentation: see the note in hiddenRequired.
      // A `href` required inside a nav-link array member is not a field the
      // DOCUMENT has to carry, and reporting it blank on siteSettings was
      // nonsense.
      const names = [];
      for (const f of body.matchAll(/^ {4}defineField\(\{\n([\s\S]*?)\n {4}\}\),?$/gm)) {
        if (!/^ {6}validation:[\s\S]{0,300}?Rule\.required\(\)/m.test(f[1])) continue;
        if (/^ {6}hidden:\s*true/m.test(f[1])) continue;
        const n = f[1].match(/^ {6}name:\s*'([A-Za-z0-9_]+)'/m)?.[1];
        if (n) names.push(n);
      }
      if (names.length) out.set(m[1], names);
    });
  }
  return out;
}

// ── Walk the data ──────────────────────────────────────────────────────────

function unknownKeys(value, path, docId, schema, hits) {
  if (value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => unknownKeys(v, `${path}[${i}]`, docId, schema, hits));
    return;
  }
  const type = value._type;
  if (type && schema.has(type) && !BUILT_IN.has(type)) {
    for (const key of Object.keys(value)) {
      if (SYSTEM_KEYS.has(key)) continue;
      if (!schema.get(type).has(key)) {
        hits.push({ docId, path, type, key, value: JSON.stringify(value[key]).slice(0, 70) });
      }
    }
  }
  for (const [k, v] of Object.entries(value)) {
    if (SYSTEM_KEYS.has(k)) continue;
    unknownKeys(v, `${path}.${k}`, docId, schema, hits);
  }
}

/** The reserved-slug list, read as text out of src/lib/reservedSlugs.ts. */
function reservedSlugs() {
  const src = readFileSync(resolve(root, 'src/lib/reservedSlugs.ts'), 'utf8');
  const literal = src.match(/new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
  return new Set([...literal.matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

// ── Run ────────────────────────────────────────────────────────────────────

const schema = readSchema();
let problems = 0;
const section = (title) => console.log(`\n${title}\n${'─'.repeat(title.length)}`);
const report = (lines) => {
  if (lines.length) {
    problems += lines.length;
    lines.forEach((l) => console.log(`  ${l}`));
  } else {
    console.log('  none');
  }
};

// Checks 1 and 2 read only the schema, so they run on a fresh clone with no
// Sanity project. Everything after them needs the dataset.
section('1. Hidden AND required (an error with no field on screen)');
report(hiddenRequired());

section('2. Preview titles that are not strings (crashes the field)');
report(numericPreviewTitles());

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID;
const token = env.SANITY_API_WRITE_TOKEN || env.SANITY_AUTH_TOKEN;
if (!projectId || projectId === 'your-project-id' || !token) {
  console.log(
    '\nChecks 3 to 7 read the dataset and there is no Sanity project configured,' +
      '\nso they are skipped. Set PUBLIC_SANITY_PROJECT_ID and a token in .env to' +
      '\nrun the whole audit.',
  );
  console.log(`\n${problems === 0 ? 'Schema is clean.' : `${problems} thing(s) to look at.`}`);
  process.exit(problems === 0 ? 0 : 1);
}

const { client } = await import('./lib/sanity-lib.mjs');

section('3. Stored keys the schema does not declare ("Remove field" bait)');
const docTypes = await client.fetch(
  `array::unique(*[!(_type match "sanity.*") && !(_type match "system.*")]._type)`,
);
{
  const hits = [];
  for (const type of docTypes) {
    const docs = await client.fetch(`*[_type==$type][0...80]`, { type });
    for (const doc of docs) {
      if (schema.has(doc._type)) {
        for (const key of Object.keys(doc)) {
          if (SYSTEM_KEYS.has(key)) continue;
          if (!schema.get(doc._type).has(key)) {
            hits.push({
              docId: doc._id,
              path: '',
              type: doc._type,
              key,
              value: JSON.stringify(doc[key]).slice(0, 70),
            });
          }
        }
      }
      for (const [k, v] of Object.entries(doc)) {
        if (SYSTEM_KEYS.has(k)) continue;
        unknownKeys(v, `.${k}`, doc._id, schema, hits);
      }
    }
  }
  report(hits.map((h) => `${h.docId}${h.path}  [${h.type}] "${h.key}" = ${h.value}`));
}

section('4. Page addresses that collide with a reserved route');
{
  const reserved = reservedSlugs();
  const pages = await client.fetch(`*[_type == "page"]{_id, "slug": slug.current}`);
  report(
    pages
      .filter((pg) => pg.slug && reserved.has(pg.slug))
      .map(
        (pg) =>
          `${pg._id} uses "${pg.slug}", which reservedSlugs.ts reserves: it cannot be published`,
      ),
  );
}

section('5. "Used on" against what the pages really contain');
{
  const src = readFileSync(resolve(root, 'src/sanity/resolve.ts'), 'utf8');
  // Which pages each collection type's location entry points at, read as text.
  const declared = {};
  for (const type of Object.keys(RENDERED_BY)) {
    const entry = src.match(new RegExp(`\\b${type}:\\s*\\{[\\s\\S]*?\\},`));
    declared[type] = entry
      ? [...entry[0].matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1])
      : ['(not in resolve.ts)'];
  }
  // Every page and the section types it actually holds. `homePage` has no slug,
  // so it is named by its type; everything else by its preview path.
  const previewPath = (id, slug) => (id === 'homePage' ? '/preview' : `/preview/${slug ?? id}`);
  const pages = await client.fetch(
    `*[defined(pageBuilder) && !(_id in path("drafts.**"))]{_id, "slug": slug.current, "types": pageBuilder[]._type}`,
  );
  const lines = [];
  for (const [type, sections] of Object.entries(RENDERED_BY)) {
    const real = new Set();
    for (const pg of pages) {
      if ((pg.types ?? []).some((t) => sections.includes(t)))
        real.add(previewPath(pg._id, pg.slug));
    }
    const said = new Set(declared[type]);
    const disagree =
      [...real].some((x) => !said.has(x)) || [...said].some((x) => !real.has(x) && real.size);
    if (disagree) {
      lines.push(
        `${type}: resolve.ts says [${[...said].join(', ') || 'nothing'}], ` +
          `the pages say [${[...real].join(', ') || 'nothing'}]`,
      );
    }
  }
  report(lines);
}

section('6. Required fields left blank in the live data');
{
  const lines = [];
  for (const [type, fields] of requiredFields()) {
    if (!docTypes.includes(type)) continue;
    const docs = await client.fetch(`*[_type==$type][0...200]{_id, ${fields.join(', ')}}`, {
      type,
    });
    for (const field of fields) {
      const missing = docs.filter((d) => {
        const v = d[field];
        return v == null || v === '' || (Array.isArray(v) && v.length === 0);
      });
      if (!missing.length) continue;
      lines.push(
        `${type}.${field}: blank on ${missing.length}/${docs.length}  e.g. ` +
          missing
            .slice(0, 3)
            .map((d) => d._id)
            .join(', '),
      );
    }
  }
  report(lines);
}

section('7. Prices typed into prose');
{
  // The fields ALLOWED to hold money, because they are the source of it. A fork
  // adds its own structured price fields here.
  const STRUCTURED = new Set(['price', 'priceNumeric', 'fee', 'travelFees', 'amount']);
  const docs = await client.fetch(`*[!(_type match "sanity.*") && !(_type match "system.*")]`);
  const MONEY = /\$[\d,]+/g;
  const lines = [];
  const walk = (node, doc, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, doc, `${path}[${i}]`));
    if (node && typeof node === 'object') {
      return Object.entries(node).forEach(([k, v]) => {
        if (k.startsWith('_') || STRUCTURED.has(k)) return;
        walk(v, doc, path ? `${path}.${k}` : k);
      });
    }
    if (typeof node !== 'string') return;
    const hits = node.match(MONEY);
    if (!hits) return;
    lines.push(
      `${doc._type} ${doc.title || doc.name || doc._id}: ${hits.join(' ')} typed into ${path}`,
    );
  };
  for (const d of docs) walk(d, d, '');
  report(lines);
}

console.log(`\n${problems === 0 ? 'Studio is clean.' : `${problems} thing(s) to look at.`}`);
process.exit(problems === 0 ? 0 : 1);

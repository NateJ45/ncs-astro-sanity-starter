// Walk every page singleton, find every ctaBlock (top-level OR nested), and
// convert linkType values that were stored as display titles back to the
// schema's enum values:
//
//   "Internal page" → "internal"
//   "External URL"  → "external"
//   "Email"         → "email"
//   "Phone"         → "phone"
//
// Why this exists: the original migration import stored the human-readable
// title for the `linkType` radio option instead of the value. The schema's
// allowed values are 'internal'/'external'/'email'/'phone', so every CTA
// fails validation in Studio. Twelve CTAs across home/about/process/services/faq
// pages plus the nested builderRealtorSection.cta on services all share the bug.
//
// Strategy: fetch the singletons, walk every object value recursively to find
// nodes with _type === 'ctaBlock', normalize linkType in place, write NDJSON,
// import via CLI (--replace).
//
// Idempotent: a CTA whose linkType is already a valid enum is left untouched.
// Safe to re-run.

import { createClient } from '@sanity/client';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'fix-cta-link-types.ndjson');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_READ_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token,
});

// Map title → enum value. Anything that's already an enum value passes through.
const VALID = new Set(['internal', 'external', 'email', 'phone']);
const TITLE_TO_VALUE = {
  'Internal page': 'internal',
  'Internal Page': 'internal',
  'External URL':  'external',
  'External Url':  'external',
  Email: 'email',
  Phone: 'phone',
};

/**
 * Walks any value recursively, calling visitor on every object with _type === 'ctaBlock'.
 * Returns the (possibly mutated) value.
 */
function visitCtas(value, visitor, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, i) => visitCtas(item, visitor, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    if (value._type === 'ctaBlock') {
      visitor(value, path);
    }
    for (const [k, v] of Object.entries(value)) {
      visitCtas(v, visitor, `${path}.${k}`);
    }
  }
}

// ---- Fetch every page singleton ----

const ids = ['homePage', 'aboutPage', 'processPage', 'servicesPage', 'faqPage', 'contactPage', 'journalPage'];
const docs = await client.fetch('*[_id in $ids]', { ids });

if (docs.length === 0) {
  console.error('Fetched zero singletons. Check token + dataset.');
  process.exit(1);
}

let total = 0;
let changed = 0;

for (const doc of docs) {
  let docChanges = 0;
  visitCtas(doc, (cta, path) => {
    total++;
    const before = cta.linkType;
    if (typeof before !== 'string') return;
    if (VALID.has(before)) return; // already valid
    const after = TITLE_TO_VALUE[before];
    if (!after) {
      console.warn(`  ! ${doc._id}${path} has unrecognized linkType=${JSON.stringify(before)} — left alone`);
      return;
    }
    cta.linkType = after;
    docChanges++;
    changed++;
    console.log(`  • ${doc._id}${path}.linkType: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  });
  if (docChanges > 0) {
    console.log(`${doc._id}: ${docChanges} CTA(s) updated`);
  }
}

console.log(`\nScanned ${total} CTA blocks across ${docs.length} singletons. ${changed} needed fixing.`);

if (changed === 0) {
  console.log('Nothing to write — all CTAs already valid.');
  process.exit(0);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const lines = docs.map((d) => JSON.stringify(d));
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${docs.length} patched singletons to ${outPath}`);
console.log('Run this to import:');
console.log(`  cd studio && npx sanity dataset import ${resolve(outPath)} production --replace`);

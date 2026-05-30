// Two more migration-import type mismatches surfaced once Staci poked around
// the content collections in Studio. Both shown as "Invalid property value"
// validation errors:
//
//   1) service.longDescription stored as String — schema declares Array
//      (Portable Text). Hits 4 services. Convert each string into one or more
//      PT paragraph blocks (split on \n\n if present), strip any leading
//      "[NEW per audit]" / "[NEW per audit, reframed as invitation]" prefix.
//
//   2) testimonial.relatedProject stored as null — schema declares it as a
//      reference. Sanity tolerates a missing field or a real reference object,
//      but rejects null. Hits all 7 testimonials. Solution: remove the field
//      entirely. Staci can wire it to a project later via the dropdown.
//
// Idempotent — already-Array longDescriptions and already-missing relatedProject
// fields pass through untouched.

import { createClient } from '@sanity/client';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'fix-collection-type-mismatches.ndjson');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_READ_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId, dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token,
});

// ---- Helpers ----

function shortKey(prefix = 'k') {
  return prefix + randomBytes(4).toString('hex');
}

/** Convert a plain string to a Portable Text block array, splitting on blank lines. */
function stringToPortableText(s) {
  if (typeof s !== 'string') return [];
  const clean = s
    .replace(/^\s*\[NEW per audit[^\]]*\]\s*/i, '')
    .trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((text) => ({
    _type: 'block',
    _key: shortKey('b'),
    style: 'normal',
    markDefs: [],
    children: [
      { _type: 'span', _key: shortKey('s'), text, marks: [] },
    ],
  }));
}

// ---- Fetch + fix ----

const all = await client.fetch("*[_type in ['service', 'testimonial']]");
const patched = [];
let serviceFixes = 0;
let testimonialFixes = 0;

for (const doc of all) {
  let changed = false;

  // service.longDescription: string → PT array
  if (doc._type === 'service' && typeof doc.longDescription === 'string') {
    const blocks = stringToPortableText(doc.longDescription);
    if (blocks.length > 0) {
      doc.longDescription = blocks;
      changed = true;
      serviceFixes++;
      console.log(`  service  ${doc._id}: longDescription string → ${blocks.length} PT block(s)`);
    } else {
      delete doc.longDescription;
      changed = true;
      serviceFixes++;
      console.log(`  service  ${doc._id}: longDescription cleared (string was empty after stripping prefix)`);
    }
  }

  // testimonial.relatedProject: null → field removed
  if (doc._type === 'testimonial' && doc.relatedProject === null) {
    delete doc.relatedProject;
    changed = true;
    testimonialFixes++;
    console.log(`  testim.  ${doc._id}: relatedProject (null) removed`);
  }

  if (changed) patched.push(doc);
}

console.log(`\nScanned ${all.length} collection docs. Fixed ${serviceFixes} services + ${testimonialFixes} testimonials = ${patched.length} docs.`);

if (patched.length === 0) {
  console.log('Nothing to write — all collection docs already valid.');
  process.exit(0);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const lines = patched.map((d) => JSON.stringify(d));
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${patched.length} patched docs to ${outPath}`);
console.log('Run this to import:');
console.log(`  cd studio && npx sanity dataset import ${resolve(outPath)} production --replace`);

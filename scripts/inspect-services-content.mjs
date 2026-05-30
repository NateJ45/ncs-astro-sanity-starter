// One-off: read-only inspection of the Services-related content in Sanity.
// Reports current field values for the servicesPage singleton and the four
// service documents whose copy we're about to change. Does NOT write anything.
//
// Run: node scripts/inspect-services-content.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env manually so we don't pull in a dotenv dep just for this.
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const token = env.SANITY_API_READ_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

console.log(`\n[inspect] dataset=${dataset} project=${projectId}\n`);

// --- servicesPage singleton ----------------------------------------------
const page = await client.fetch(`*[_type == "servicesPage"][0]{
  _id, _rev,
  heroEyebrow, heroHeadline, heroSubhead,
  servicesListEyebrow, servicesListHeadline, servicesListSubhead
}`);

console.log('--- servicesPage singleton ---');
if (!page) {
  console.log('  (none found)');
} else {
  console.log(`  _id: ${page._id}`);
  console.log(`  _rev: ${page._rev}`);
  console.log(`  heroEyebrow: ${JSON.stringify(page.heroEyebrow)}`);
  console.log(`  heroHeadline: ${JSON.stringify(page.heroHeadline)}`);
  console.log(`  heroSubhead: ${JSON.stringify(page.heroSubhead)}`);
  console.log(`  servicesListEyebrow: ${JSON.stringify(page.servicesListEyebrow)}`);
  console.log(`  servicesListHeadline: ${JSON.stringify(page.servicesListHeadline)}`);
  console.log(`  servicesListSubhead: ${JSON.stringify(page.servicesListSubhead)}`);
}

// --- services documents --------------------------------------------------
const services = await client.fetch(`*[_type == "service"] | order(displayOrder asc){
  _id, _rev, name, "slug": slug.current,
  shortDescription, bestFor, ctaLabel,
  "hasLongDescription": defined(longDescription) && length(longDescription) > 0
}`);

console.log('\n--- service documents ---');
if (!services?.length) {
  console.log('  (none found)');
} else {
  for (const s of services) {
    console.log(`\n  ${s.name}  [_id: ${s._id}, slug: ${s.slug}]`);
    console.log(`    _rev: ${s._rev}`);
    console.log(`    shortDescription: ${JSON.stringify(s.shortDescription)}`);
    console.log(`    bestFor: ${JSON.stringify(s.bestFor)}`);
    console.log(`    ctaLabel: ${JSON.stringify(s.ctaLabel)}`);
    console.log(`    hasLongDescription: ${s.hasLongDescription}`);
  }
}

console.log('\n[done]');

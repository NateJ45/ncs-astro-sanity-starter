// Strips the trailing period from the homePage Featured Work + Featured
// Journal eyebrows so they match the other (period-less) section eyebrows on
// the home page. Idempotent: re-running once they're clean is a no-op.
//
// Run: node scripts/patch-home-eyebrows.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

const doc = await client.fetch(
  `*[_type == "homePage" && !(_id in path("drafts.**"))][0]{ _id, featuredWorkEyebrow, featuredJournalEyebrow }`,
);

if (!doc?._id) {
  console.error('No published homePage document found.');
  process.exit(1);
}

const stripPeriod = (v) => (typeof v === 'string' ? v.replace(/\.\s*$/, '') : v);
const patch = {};
const nextWork = stripPeriod(doc.featuredWorkEyebrow);
const nextJournal = stripPeriod(doc.featuredJournalEyebrow);
if (typeof nextWork === 'string' && nextWork !== doc.featuredWorkEyebrow) patch.featuredWorkEyebrow = nextWork;
if (typeof nextJournal === 'string' && nextJournal !== doc.featuredJournalEyebrow) patch.featuredJournalEyebrow = nextJournal;

if (Object.keys(patch).length === 0) {
  console.log('Nothing to patch; eyebrows already have no trailing period.');
  process.exit(0);
}

await client.patch(doc._id).set(patch).commit();
console.log(`Patched homePage ${doc._id}:`, patch);

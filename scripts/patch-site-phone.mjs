// Sets siteSettings.phone, the single source of truth for the phone number
// shown in the header, footer, mobile menu, contact page, and the
// LocalBusiness JSON-LD (telephone). Patches only the phone field, so the
// rest of siteSettings is untouched. Idempotent: re-running re-sets the same
// value. The live site shows it after the next build.
//
// Run: node scripts/patch-site-phone.mjs

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

const PHONE = '(931) 539-5255';

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

// Target the published siteSettings doc (ignore any draft copy).
const doc = await client.fetch(
  `*[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{ _id }`,
);

if (!doc?._id) {
  console.error('No published siteSettings document found.');
  process.exit(1);
}

await client.patch(doc._id).set({ phone: PHONE }).commit();
console.log(`Set siteSettings.phone = "${PHONE}" on ${doc._id}`);

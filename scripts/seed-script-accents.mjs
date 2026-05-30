// Seed script: sets section-level script accents on the existing homePage document.
//
// This patches the live homePage doc to add the three new scriptAccent fields introduced
// in the feat/section-script-accents branch. Each accent is only set when the chosen
// phrase is confirmed to be an exact substring of the current headline (checked at
// runtime so a copy change doesn't silently break anything).
//
// Design principles (matching seed-conversion-content.mjs):
//   - Non-destructive: uses client.patch() not createOrReplace(), so existing fields
//     are never wiped.
//   - Idempotent: safe to re-run. Patches only the three new accent fields.
//   - Logs which accents were set and which were skipped (with reason).
//
// Run with: node scripts/seed-script-accents.mjs
// Re-running is safe.

import { createClient } from '@sanity/client';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: resolve(root, '.env') });

const {
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_API_VERSION,
  SANITY_API_WRITE_TOKEN,
} = process.env;

if (!PUBLIC_SANITY_PROJECT_ID || !SANITY_API_WRITE_TOKEN) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId: PUBLIC_SANITY_PROJECT_ID,
  dataset: PUBLIC_SANITY_DATASET || 'production',
  apiVersion: PUBLIC_SANITY_API_VERSION || '2026-05-01',
  token: SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

// ── Query current headline values ────────────────────────────────────────────

console.log('Querying current homePage headlines…');

const page = await client.fetch(
  '*[_type == "homePage"][0]{ _id, servicesGridHeadline, testimonialsHeadline, finalCtaHeadline }',
);

if (!page?._id) {
  console.error('homePage document not found. Run the main seed first.');
  process.exit(1);
}

console.log('Found homePage doc:', page._id);
console.log('  servicesGridHeadline:', JSON.stringify(page.servicesGridHeadline));
console.log('  testimonialsHeadline:', JSON.stringify(page.testimonialsHeadline));
console.log('  finalCtaHeadline:', JSON.stringify(page.finalCtaHeadline));

// ── Determine which accents to set ───────────────────────────────────────────
//
// Chosen accents (editorial judgment, matching CLAUDE.md guidance on "one
// flourish per heading, use sparingly"):
//   - Services grid: "Can Help" — the end of "How Reid Design Can Help". The
//     original brief explicitly called this out as the example from the old site.
//   - Testimonials: "real homes" — the human/warm anchor in "Words from real homes".
//   - Final CTA: "Love" — the emotional verb in "Ready to Love Your Space?"

const candidates = [
  {
    field: 'servicesGridScriptAccent',
    headline: page.servicesGridHeadline,
    accent: 'Can Help',
    label: 'servicesGrid',
  },
  {
    field: 'testimonialsScriptAccent',
    headline: page.testimonialsHeadline,
    accent: 'real homes',
    label: 'testimonials',
  },
  {
    field: 'finalCtaScriptAccent',
    headline: page.finalCtaHeadline,
    accent: 'Love',
    label: 'finalCta',
  },
];

const patch = {};
const skipped = [];

for (const { field, headline, accent, label } of candidates) {
  if (!headline) {
    skipped.push({ label, reason: 'headline field is empty or not set' });
    continue;
  }
  if (headline.indexOf(accent) === -1) {
    skipped.push({ label, reason: `"${accent}" is not an exact substring of "${headline}"` });
    continue;
  }
  patch[field] = accent;
  console.log(`  ✓ Will set ${label} accent to: "${accent}"`);
}

if (skipped.length > 0) {
  console.log('\nSkipped accents:');
  for (const { label, reason } of skipped) {
    console.log(`  ✗ ${label}: ${reason}`);
  }
}

if (Object.keys(patch).length === 0) {
  console.log('\nNothing to patch. All candidates were skipped.');
  process.exit(0);
}

// ── Apply the patch ──────────────────────────────────────────────────────────

console.log('\nPatching homePage doc…');

await client.patch(page._id).set(patch).commit();

console.log('Done. Patched fields:', Object.keys(patch).join(', '));
console.log('Rebuild the site (`npm run build`) to see the script accents live.');

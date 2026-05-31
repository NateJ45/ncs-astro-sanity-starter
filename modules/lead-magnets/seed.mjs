/**
 * modules/lead-magnets/seed.mjs
 *
 * Idempotent seeder for the lead-magnets module. Creates two neutral
 * `leadMagnet` documents as placeholder content.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/lead-magnets/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 *
 * NOTE: The `file` field (the gated PDF) is intentionally left unset.
 * When no file is set, the landing page renders an "almost ready" notice
 * instead of the email-capture form. Upload the real PDFs via the Studio
 * before publishing the guides to visitors.
 *
 * Cover images are also left unset; the cards show a neutral "Free Guide"
 * placeholder and the pages render cleanly without them.
 */

import { createClient } from '@sanity/client';
import { config } from 'dotenv';

// Load env vars from the project root .env file.
config();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token     = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('Error: PUBLIC_SANITY_PROJECT_ID is not set. Add it to your .env file.');
  process.exit(1);
}
if (!token) {
  console.error('Error: SANITY_API_WRITE_TOKEN is not set. Add a write token to your .env file.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// ---------------------------------------------------------------------------
// leadMagnet documents
// ---------------------------------------------------------------------------

const magnets = [
  {
    _id: 'seed-lead-magnet-guide-one',
    _type: 'leadMagnet',
    title: 'Guide One: Getting Started',
    slug: { _type: 'slug', current: 'guide-one-getting-started' },
    summary:
      'A practical walkthrough of where to begin. Covers the questions worth answering before you spend anything.',
    gateHeading: 'Get the free guide.',
    gateBlurb:
      'Enter your email and the guide downloads immediately. No strings.',
    buttonLabel: 'Send me the guide',
    successMessage: "You're in. Your download link is just below.",
    published: false, // Draft until you upload the real PDF and write final copy.
  },
  {
    _id: 'seed-lead-magnet-guide-two',
    _type: 'leadMagnet',
    title: 'Guide Two: Planning Your Budget',
    slug: { _type: 'slug', current: 'guide-two-planning-your-budget' },
    summary:
      'A no-jargon look at how to set a realistic number for your project and what that money actually covers.',
    gateHeading: 'Get the free guide.',
    gateBlurb:
      'Enter your email and the guide downloads immediately. No strings.',
    buttonLabel: 'Send me the guide',
    successMessage: "You're in. Your download link is just below.",
    published: false, // Draft until you upload the real PDF and write final copy.
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding lead-magnets module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  for (const magnet of magnets) {
    tx.createOrReplace(magnet);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  for (const magnet of magnets) {
    console.log(`  leadMagnet: "${magnet.title}" (${magnet.slug.current}) — published: ${magnet.published}`);
  }
  console.log('');
  console.log('Next steps:');
  console.log('  1. Upload PDFs to each guide via the Studio (Guides list in Content).');
  console.log('  2. Update titles, summaries, and copy to match real guides.');
  console.log('  3. Set published: true to make guides visible on /guides.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

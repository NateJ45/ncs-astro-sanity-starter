/**
 * modules/press/seed.mjs
 *
 * Idempotent seeder for the press module. Creates one `pressPage` singleton
 * and three neutral `pressItem` documents.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/press/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Logo image fields are intentionally left unset; add real outlet logos via
 * the Studio after seeding.
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
// pressPage singleton
// ---------------------------------------------------------------------------

const pressPage = {
  _id: 'pressPage',
  _type: 'pressPage',
  seoTitle: 'Press',
  seoDescription: 'Media features, mentions, and coverage from print and online publications.',
  heroEyebrow: 'In the Press.',
  heroHeadline: 'Where Our Work Has Been Featured.',
  intro: 'A selection of press features and mentions from publications that have covered our work. Replace this text with your own intro copy.',
};

// ---------------------------------------------------------------------------
// pressItem documents
// ---------------------------------------------------------------------------

const pressItems = [
  {
    _id: 'seed-press-item-one',
    _type: 'pressItem',
    outlet: 'Publication One',
    quote: 'Replace this with an actual pull-quote or headline from the article. The text should come from the published piece.',
    url: 'https://example.com',
    date: '2024-09-01',
  },
  {
    _id: 'seed-press-item-two',
    _type: 'pressItem',
    outlet: 'Publication Two',
    quote: 'Replace this with an actual pull-quote or headline from the article. The text should come from the published piece.',
    url: 'https://example.com',
    date: '2024-06-15',
  },
  {
    _id: 'seed-press-item-three',
    _type: 'pressItem',
    outlet: 'Publication Three',
    quote: 'Replace this with an actual pull-quote or headline from the article. The text should come from the published piece.',
    url: 'https://example.com',
    date: '2024-03-01',
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding press module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  tx.createOrReplace(pressPage);
  for (const item of pressItems) {
    tx.createOrReplace(item);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  pressPage (singleton)');
  for (const item of pressItems) {
    console.log(`  pressItem: "${item.outlet}" (${item.date})`);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

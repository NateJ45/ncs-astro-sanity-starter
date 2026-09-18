/**
 * modules/shop/seed.mjs
 *
 * Idempotent seeder for the shop module. Creates one `shopPage` singleton,
 * one `shopCollection`, and three `shopItem` documents with neutral placeholder
 * content.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/shop/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 *
 * NOTE: Affiliate URLs are placeholders pointing to example.com. Replace them
 * with real affiliate URLs via the Studio before publishing. Images are also
 * intentionally omitted; add them per-project via the Studio.
 *
 * The `orderRank` field on `shopCollection` and `shopItem` is managed by the
 * orderable-document-list plugin. It is initialized automatically the first
 * time you open those documents in the Studio; you do not need to set it here.
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
// shopCollection
// Defined first so shopItems can reference it by deterministic _id.
// ---------------------------------------------------------------------------

const collection = {
  _id: 'seed-shop-collection-one',
  _type: 'shopCollection',
  title: 'Studio Picks',
  slug: { _type: 'slug', current: 'studio-picks' },
  blurb: 'A curated selection of tools, materials, and everyday items the studio recommends.',
};

// ---------------------------------------------------------------------------
// shopPage singleton
// The FTC disclosure text is required by law and must appear prominently on
// the page before any affiliate links. Keep it accurate for the live project.
// ---------------------------------------------------------------------------

const shopPage = {
  _id: 'shopPage',
  _type: 'shopPage',
  seoTitle: 'Shop Favorites',
  seoDescription: 'Hand-picked items the studio recommends. Some links are affiliate links.',
  heroEyebrow: 'Shop Favorites.',
  heroHeadline: 'Things Worth Having.',
  heroSubhead: 'A running list of items we reach for and genuinely recommend.',
  enabled: true,
  // FTC affiliate disclosure. Edit this copy to match the studio's exact
  // affiliate relationships before publishing the live site.
  disclosure: 'Some links below are affiliate links. If you buy through them the studio may earn a small commission at no extra cost to you. We only share things we would genuinely recommend.',
  // Reference the seeded collection so the page has content immediately.
  collections: [
    { _type: 'reference', _ref: 'seed-shop-collection-one' },
  ],
};

// ---------------------------------------------------------------------------
// shopItem documents
// Affiliate URLs are placeholder example.com addresses -- replace per-project.
// ---------------------------------------------------------------------------

const items = [
  {
    _id: 'seed-shop-item-one',
    _type: 'shopItem',
    title: 'Adjustable Desk Lamp',
    vendor: 'Example Retailer',
    // Replace with a real affiliate URL before publishing.
    affiliateUrl: 'https://example.com/affiliate/desk-lamp',
    note: 'Great build quality and a clean silhouette. Works well on a desk or side table.',
    collection: { _type: 'reference', _ref: 'seed-shop-collection-one' },
  },
  {
    _id: 'seed-shop-item-two',
    _type: 'shopItem',
    title: 'Ceramic Pour-Over Kit',
    vendor: 'Example Brand',
    // Replace with a real affiliate URL before publishing.
    affiliateUrl: 'https://example.com/affiliate/pour-over-kit',
    note: 'Feels considered in the hand and looks good sitting on a counter.',
    collection: { _type: 'reference', _ref: 'seed-shop-collection-one' },
  },
  {
    _id: 'seed-shop-item-three',
    _type: 'shopItem',
    title: 'Minimal Notebook, A5',
    vendor: 'Example Supply Co.',
    // Replace with a real affiliate URL before publishing.
    affiliateUrl: 'https://example.com/affiliate/notebook-a5',
    note: 'Dot-grid pages, good paper weight, and a cover that stays flat.',
    collection: { _type: 'reference', _ref: 'seed-shop-collection-one' },
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding shop module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  // Collection must exist before shopPage references it.
  tx.createOrReplace(collection);
  tx.createOrReplace(shopPage);
  for (const item of items) {
    tx.createOrReplace(item);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log(`  shopCollection: "${collection.title}" (${collection.slug.current})`);
  console.log('  shopPage (singleton)');
  for (const item of items) {
    console.log(`  shopItem: "${item.title}"`);
  }
  console.log('');
  console.log('Next steps:');
  console.log('  1. Replace placeholder affiliate URLs (example.com) with real affiliate links in the Studio.');
  console.log('  2. Add product images to each shopItem via the Studio.');
  console.log('  3. Edit the FTC disclosure text on shopPage to match your exact affiliate relationships.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

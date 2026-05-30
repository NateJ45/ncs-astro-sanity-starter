// Patches heroImage on each page singleton in Sanity with a chosen asset from
// the media library. Idempotent — skips a doc whose heroImage is already set
// unless --force is passed.
//
// Pairings (chosen for landscape orientation + page tone):
//   homePage      → entryway-bench-sage-board-batten (welcoming, brand sage + bronze)
//   aboutPage     → cozy-living-room-warm-lighting   (warm intro to the designer)
//   processPage   → open-concept-living-kitchen      (space planning made visible)
//   servicesPage  → living-room-grey-sectional-blue  (polished tier result)
//   faqPage       → sitting-area-window-light        (calm, sit and read)
//   contactPage   → blue-hutch-hydrangeas            (homey, conversational)
//   journalPage   → styled-mantel-hydrangeas         (considered detail)
//
// Run with: node scripts/patch-page-hero-images.mjs
//           node scripts/patch-page-hero-images.mjs --force  (overwrites existing)

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const writeToken = (process.env.SANITY_API_WRITE_TOKEN ?? '').trim();
const FORCE = process.argv.includes('--force');

if (!projectId || !writeToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token: writeToken,
});

// Each row: which page singleton, which asset ref, and the alt text to set.
// Alt text follows the studio rule: descriptive, location-aware where relevant,
// no "Photo of..." prefix.
const PAIRINGS = [
  {
    docType: 'homePage',
    assetRef: 'image-a21a479201b753bf646af473ae91d9ccc3bac916-5712x4284-jpg',
    alt: 'Entryway bench with sage board-and-batten paneling in a Reid Design home.',
  },
  {
    docType: 'aboutPage',
    assetRef: 'image-0e94ed472c79d0a37ecb2b642d5f14c226354a3c-4032x3024-jpg',
    alt: 'Cozy living room with warm lighting designed by Reid Design.',
  },
  {
    docType: 'processPage',
    assetRef: 'image-9b7a1ff32b98653abd12b2d79a72524e68ec2ece-5712x4284-jpg',
    alt: 'Open-concept living room and kitchen designed by Reid Design.',
  },
  {
    docType: 'servicesPage',
    assetRef: 'image-e05a4e2d79c37f2c8271d095eb35e45abfd72513-5712x4284-jpg',
    alt: 'Living room with grey sectional and blue accents designed by Reid Design.',
  },
  {
    docType: 'faqPage',
    assetRef: 'image-1268442e397ece486a4b9506050e80d8329da54b-4032x3024-jpg',
    alt: 'Sitting area with soft window light designed by Reid Design.',
  },
  {
    docType: 'contactPage',
    assetRef: 'image-b859d2cd6e561030d803a11041f937793aa44b56-4032x3024-jpg',
    alt: 'Blue hutch with fresh hydrangeas styled by Reid Design.',
  },
  {
    docType: 'journalPage',
    assetRef: 'image-53463bef1e4c1a097322525a22504af84980fa03-4032x3024-jpg',
    alt: 'Styled mantel with hydrangeas by Reid Design.',
  },
];

for (const { docType, assetRef, alt } of PAIRINGS) {
  // Find the singleton — there's always exactly one per type.
  const doc = await client.fetch(`*[_type == "${docType}"][0]{ _id, heroImage }`);
  if (!doc) {
    console.warn(`! ${docType}: no singleton document found. Skipping.`);
    continue;
  }

  const hasExisting = !!doc.heroImage?.asset;
  if (hasExisting && !FORCE) {
    console.log(`= ${docType}: heroImage already set (pass --force to overwrite). Skipping.`);
    continue;
  }

  try {
    await client
      .patch(doc._id)
      .set({
        heroImage: {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetRef },
          alt,
        },
      })
      .commit();
    console.log(`✓ ${docType}: heroImage → ${assetRef.slice(0, 32)}…`);
  } catch (err) {
    console.error(`✗ ${docType}: ${err.message}`);
  }
}

console.log('\nDone.');

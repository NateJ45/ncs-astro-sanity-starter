// One-time migration: copy the home page's single heroImage into the new
// heroImages array so the hero looks identical after the slideshow ships.
// Idempotent: skips if heroImages already has entries. Run once after the
// schema deploy. Mirrors scripts/patch-page-hero-images.mjs.
//
// Run with: node scripts/migrate-home-hero-images.mjs

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';
import { randomUUID } from 'node:crypto';

loadDotenv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const writeToken = (process.env.SANITY_API_WRITE_TOKEN ?? '').trim();

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

const doc = await client.fetch(`*[_type == "homePage"][0]{ _id, heroImage, heroImages }`);
if (!doc) {
  console.error('! homePage singleton not found.');
  process.exit(1);
}

if (Array.isArray(doc.heroImages) && doc.heroImages.length > 0) {
  console.log('= homePage.heroImages already populated. Nothing to migrate.');
  process.exit(0);
}

if (!doc.heroImage?.asset?._ref) {
  console.log('= homePage has no heroImage to migrate. Nothing to do.');
  process.exit(0);
}

const slide = {
  _key: randomUUID().replace(/-/g, '').slice(0, 12),
  _type: 'image',
  asset: { _type: 'reference', _ref: doc.heroImage.asset._ref },
};
if (doc.heroImage.hotspot) slide.hotspot = doc.heroImage.hotspot;
if (doc.heroImage.crop) slide.crop = doc.heroImage.crop;
if (doc.heroImage.alt) slide.alt = doc.heroImage.alt;

try {
  await client.patch(doc._id).set({ heroImages: [slide] }).commit();
  console.log('✓ homePage.heroImages seeded from heroImage.');
} catch (err) {
  console.error('✗ migration failed:', err.message);
  process.exit(1);
}

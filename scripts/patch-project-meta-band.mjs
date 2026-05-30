// Patches briefLine + designCall on each placeholder project so the
// Project Meta Band has all three columns to render. Voice is Staci's
// "smart friend who happens to be a designer" — plain English, specific,
// not transformational-sales-copy.
//
// Run with: node scripts/patch-project-meta-band.mjs

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';

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

const COPY_BY_SLUG = {
  'fishers-kitchen-styling': {
    briefLine: 'New build with beautiful bones, but the kitchen felt staged instead of lived in.',
    designCall: "Edit, don't add. Source one warm wood piece. Let the soapstone breathe.",
  },
  'plainfield-family-room-refresh': {
    briefLine: 'Sectional too far from the fireplace, ceiling fan fighting the daylight.',
    designCall: 'Pull the sofa off the wall, swap to a single warm pendant, layer the rugs.',
  },
  'zionsville-primary-bedroom': {
    briefLine: 'Big room that read more like a hotel suite than a primary bedroom.',
    designCall: 'Build a soft, layered bed wall. Anchor the seating with one vintage bench.',
  },
};

for (const [slug, fields] of Object.entries(COPY_BY_SLUG)) {
  const doc = await client.fetch(
    `*[_type == "project" && slug.current == $slug][0]{ _id, briefLine, designCall }`,
    { slug },
  );
  if (!doc) {
    console.warn(`! ${slug}: project not found. Skipping.`);
    continue;
  }
  if (doc.briefLine && doc.designCall) {
    console.log(`= ${slug}: already set. Skipping.`);
    continue;
  }
  try {
    await client.patch(doc._id).set(fields).commit();
    console.log(`✓ ${slug}: briefLine + designCall set`);
  } catch (err) {
    console.error(`✗ ${slug}: ${err.message}`);
  }
}

console.log('\nDone.');

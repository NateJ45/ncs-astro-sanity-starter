// One-off inventory script. Queries Sanity for image assets, groups them by the
// "folder-*" media-tag origins set up by enrich-asset-metadata.mjs, and prints a
// compact table so we can pick which one fits each page hero.
//
// Run with: node scripts/list-hero-candidates.mjs

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const readToken = (process.env.SANITY_API_READ_TOKEN ?? '').trim();

if (!projectId || !readToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token: readToken,
});

// Fetch every image asset with its tag references resolved to readable names,
// plus dimensions so we can prefer landscape over portrait for hero use.
const assets = await client.fetch(`*[_type == "sanity.imageAsset"]{
  _id,
  originalFilename,
  title,
  altText,
  "width": metadata.dimensions.width,
  "height": metadata.dimensions.height,
  "tags": opt.media.tags[]->name.current
}`);

console.log(`Total assets: ${assets.length}\n`);

const folderTags = [
  'folder-home-hero',
  'folder-about-team',
  'folder-services',
  'folder-portfolio-grid',
  'folder-project-detail',
  'folder-process',
  'folder-testimonials',
  'folder-blog-social',
  'folder-older-projects',
];

for (const tag of folderTags) {
  const matches = assets
    .filter((a) => Array.isArray(a.tags) && a.tags.includes(tag))
    // Heroes work better landscape — sort wider-first
    .sort((a, b) => (b.width ?? 0) / (b.height ?? 1) - (a.width ?? 0) / (a.height ?? 1));

  console.log(`\n=== ${tag} (${matches.length}) ===`);
  for (const a of matches.slice(0, 30)) {
    const dims = a.width && a.height ? `${a.width}x${a.height}` : '?';
    const ar = a.width && a.height ? (a.width / a.height).toFixed(2) : '?';
    console.log(`  ${a._id}  ${dims}  AR=${ar}  ${a.originalFilename}`);
  }
}

// Untagged or differently-tagged
const tagged = new Set();
for (const tag of folderTags) {
  assets.filter((a) => Array.isArray(a.tags) && a.tags.includes(tag)).forEach((a) => tagged.add(a._id));
}
const untagged = assets.filter((a) => !tagged.has(a._id));
console.log(`\n=== Other / untagged (${untagged.length}) ===`);
for (const a of untagged.slice(0, 50)) {
  const dims = a.width && a.height ? `${a.width}x${a.height}` : '?';
  console.log(`  ${a._id}  ${dims}  tags=${(a.tags ?? []).join(',')}  ${a.originalFilename}`);
}

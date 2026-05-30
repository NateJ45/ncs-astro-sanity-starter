// Fallback bulk upload that uses the Sanity CLI's user auth instead of an API
// token. The token-based path (scripts/bulk-upload-photos.mjs) failed with
// "project user not found for user ID g-PYKgPTD1Da7C" — a known issue where
// newer Sanity projects don't auto-grant robot tokens project membership for
// asset operations. The CLI uses the human user's auth (your `sanity login`
// session), which has full membership.
//
// Strategy: bundle every image reference into a single DRAFT journalEntry's
// body.imageGallery.images array, write NDJSON, import via CLI. The import
// uploads each _sanityAsset file and resolves the reference. After upload,
// the assets are in the library AND referenced by the temp doc. Delete the
// temp doc afterward (assets persist — Sanity doesn't garbage-collect them).
//
// Why a draft (drafts.* _id)? Drafts don't appear in `perspective: 'published'`
// queries, which is what the Astro build uses. So the temp doc is invisible
// on the live site and in Staci's normal Studio views.
//
// Run with: node scripts/bulk-upload-via-cli.mjs

import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const photosRoot = resolve(root, '..', 'Reid Design Pictures', 'Reid Design Pictures');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'bulk-upload-bundle.ndjson');

// Same skip set as the token-based script: logos handled separately, and
// the 7 already-wired photos are deduped by Sanity by hash anyway.
const SKIP_FOLDERS = new Set(['09-Logos']);
const ALREADY_WIRED = new Set([
  'reid-design-open-concept-kitchen-island.jpg',
  'staci-perkins-at-home-with-dogs-sofa.jpg',
  'staci-perkins-headshot-planning-2026.jpg',
  'reid-design-living-room-grey-sectional-blue.jpg',
  'reid-design-kitchen-island-brass-pendants.jpg',
  'reid-design-bedroom-iron-bed-be-still.jpg',
  'reid-design-cozy-living-room-warm-lighting.jpg',
]);

function shortKey(prefix = 'k') {
  return prefix + randomBytes(4).toString('hex');
}

function assetRefForFile(absPath) {
  const url = absPath.replaceAll(sep, '/').split('/').map(encodeURIComponent).join('/');
  return `image@file:///${url}`;
}

function collectPhotos() {
  if (!existsSync(photosRoot)) {
    console.error('Photos root not found:', photosRoot);
    process.exit(1);
  }
  const entries = [];
  for (const folder of readdirSync(photosRoot)) {
    if (SKIP_FOLDERS.has(folder)) continue;
    const folderPath = resolve(photosRoot, folder);
    if (!statSync(folderPath).isDirectory()) continue;
    for (const file of readdirSync(folderPath)) {
      if (!/\.(jpe?g|png|webp|gif)$/i.test(file)) continue;
      if (ALREADY_WIRED.has(file)) continue;
      entries.push({ folder, file, path: resolve(folderPath, file) });
    }
  }
  return entries;
}

const photos = collectPhotos();
console.log(`Found ${photos.length} photos to upload across ${new Set(photos.map((p) => p.folder)).size} folders.`);

// Build the temp draft journalEntry. Its body holds a single imageGallery with
// all images referenced via _sanityAsset directives. Marked as a draft via
// the `drafts.` _id prefix so it never appears on the live site or in Staci's
// usual journal post list (drafts are filtered out by perspective: 'published').
const galleryImages = photos.map((p) => ({
  _type: 'image',
  _key: shortKey('img'),
  _sanityAsset: assetRefForFile(p.path),
  alt: `Reid Design photo (${p.folder}/${p.file})`,
  caption: p.folder, // Lets Staci see folder origin if she ever opens this temp doc
}));

const tempDoc = {
  _id: 'drafts._tmp.assetBundle',
  _type: 'journalEntry',
  title: '[TEMP] Bulk asset upload — safe to delete',
  slug: { _type: 'slug', current: '_tmp-asset-bundle' },
  excerpt:
    'Internal-only holding document used to upload the Reid Design photo library in bulk. Safe to delete — the underlying image assets remain in the library after this doc is removed.',
  author: 'System',
  publishedAt: '2020-01-01T00:00:00Z',
  featured: false,
  body: [
    {
      _type: 'block',
      _key: shortKey('b'),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: shortKey('s'),
          text:
            'This document exists only to bulk-upload the Reid Design photo library to Sanity. It is a draft, so it never appears on the live site. Delete it whenever — the photos stay in the asset library.',
          marks: [],
        },
      ],
    },
    {
      _type: 'imageGallery',
      _key: shortKey('gallery'),
      images: galleryImages,
      layout: 'grid3',
    },
  ],
};

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(tempDoc) + '\n', 'utf-8');

console.log(`\nWrote temp-bundle NDJSON to ${outPath}`);
console.log(`Bundle holds ${galleryImages.length} image references.`);
console.log('\nNext step — upload + import (paste this):');
console.log(`  cd studio && npx sanity dataset import "${outPath}" production --replace`);
console.log('\nAfter import completes, the temp draft doc lives at _id "drafts._tmp.assetBundle".');
console.log('Delete it via: cd studio && npx sanity documents delete drafts._tmp.assetBundle');
console.log('(or leave it — drafts are invisible to the live site)');

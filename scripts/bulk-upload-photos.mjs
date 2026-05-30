// Bulk-upload Reid Design photos to the Sanity asset library so Staci can pick
// from them in Studio's image picker when she creates new content (services,
// project galleries, journal post bodies, etc.).
//
// Scope: every photo under ../Reid Design Pictures/ EXCEPT
//   - 09-Logos/        (handled separately, lives in public/)
//   - 7 already wired by scripts/wire-key-images.mjs (Sanity dedupes by hash
//     anyway; this just skips redundant uploads to save time + bandwidth)
//
// Auth: SANITY_API_WRITE_TOKEN from .env. Create one at
//   https://sanity.io/manage/project/ba403vjc/api/tokens
// with Editor permission, paste into .env, run this script, then you can
// delete or downgrade the token afterward — Phase 1 wiring + future Studio
// edits use Sanity's CLI auth, not this token.
//
// Concurrency: 4 uploads in flight at a time. Sanity's free tier allows much
// more, but staying modest is friendly + easy to reason about. ~230 photos
// at ~1-2 MB each ≈ 5-10 minutes wall-clock.
//
// Run with: node scripts/bulk-upload-photos.mjs

import { createClient } from '@sanity/client';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const photosRoot = resolve(root, '..', 'Reid Design Pictures', 'Reid Design Pictures');
const outDir = resolve(root, 'tmp');
const manifestPath = resolve(outDir, 'bulk-upload-manifest.json');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const writeToken = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID in .env');
  process.exit(1);
}
if (!writeToken) {
  console.error('Missing SANITY_API_WRITE_TOKEN in .env');
  console.error('Create one at https://sanity.io/manage/project/' + projectId + '/api/tokens');
  console.error('Use Editor permission (read + write).');
  process.exit(1);
}

const client = createClient({
  projectId, dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token: writeToken,
});

// ---- Collect every photo, excluding logos + the 7 already-wired files ----

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

function collectPhotos() {
  if (!existsSync(photosRoot)) {
    console.error('Photos root not found:', photosRoot);
    process.exit(1);
  }
  const entries = [];
  for (const folder of readdirSync(photosRoot)) {
    if (SKIP_FOLDERS.has(folder)) continue;
    const folderPath = resolve(photosRoot, folder);
    const folderStat = statSync(folderPath);
    if (!folderStat.isDirectory()) continue;
    for (const file of readdirSync(folderPath)) {
      if (!/\.(jpe?g|png|webp|gif)$/i.test(file)) continue;
      if (ALREADY_WIRED.has(file)) continue;
      entries.push({ folder, file, path: resolve(folderPath, file) });
    }
  }
  return entries;
}

const photos = collectPhotos();
console.log(`Found ${photos.length} photos to upload across ${new Set(photos.map(p => p.folder)).size} folders.`);
console.log(`Skipping 7 already-wired + everything in 09-Logos.`);

// ---- Upload with limited concurrency ----

const CONCURRENCY = 4;
const results = [];
let done = 0;
let failed = 0;

async function uploadOne(entry) {
  const buffer = readFileSync(entry.path);
  try {
    const asset = await client.assets.upload('image', buffer, {
      filename: entry.file,
      // Tag uploads with the source folder so Staci can filter the library
      // by category in Studio (Sanity supports asset metadata via custom labels).
      label: entry.folder,
    });
    done++;
    return {
      ok: true,
      folder: entry.folder,
      file: entry.file,
      assetId: asset._id,
      url: asset.url,
      size: buffer.length,
    };
  } catch (err) {
    failed++;
    return {
      ok: false,
      folder: entry.folder,
      file: entry.file,
      error: err.message,
    };
  }
}

async function runInBatches(items, batchSize, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.all(batch.map(fn));
    out.push(...settled);
    const pct = Math.round((Math.min(i + batchSize, items.length) / items.length) * 100);
    process.stdout.write(`\r  Progress: ${done}/${items.length} uploaded · ${failed} failed · ${pct}%`);
  }
  return out;
}

console.log(`\nUploading at concurrency ${CONCURRENCY}...`);
const uploadResults = await runInBatches(photos, CONCURRENCY, uploadOne);
console.log('\n');

// ---- Summary ----

const byFolder = {};
for (const r of uploadResults) {
  byFolder[r.folder] = byFolder[r.folder] || { ok: 0, failed: 0 };
  if (r.ok) byFolder[r.folder].ok++;
  else byFolder[r.folder].failed++;
}
console.log('Per-folder results:');
for (const [folder, counts] of Object.entries(byFolder).sort()) {
  console.log(`  ${folder.padEnd(35)} ${counts.ok} uploaded${counts.failed > 0 ? `, ${counts.failed} failed` : ''}`);
}

const failedDetails = uploadResults.filter((r) => !r.ok);
if (failedDetails.length > 0) {
  console.log('\nFailures:');
  for (const f of failedDetails.slice(0, 10)) {
    console.log(`  ${f.folder}/${f.file}: ${f.error}`);
  }
  if (failedDetails.length > 10) console.log(`  ... and ${failedDetails.length - 10} more`);
}

// ---- Write manifest ----

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(manifestPath, JSON.stringify(uploadResults, null, 2), 'utf-8');
console.log(`\nManifest written to ${manifestPath}`);
console.log(`(maps filename → Sanity asset _id, useful if we ever want to wire specific photos to specific docs later)`);

if (failed > 0) process.exit(1);
console.log("\nDone! All photos are now in Staci's Sanity asset library.");

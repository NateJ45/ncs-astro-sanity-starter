// Wire Reid Design photos to specific Sanity docs by patching each doc with an
// `_sanityAsset` directive. When `sanity dataset import` runs the resulting
// NDJSON, the CLI uploads each local file and resolves the directive into a
// proper asset reference — all via CLI auth (no write token needed).
//
// What gets wired:
//   homePage.heroImage         → 01-Home-Hero/open-concept-kitchen-island.jpg
//   homePage.meetStaciPhoto    → 01-Home-Hero/staci-at-home-with-dogs-sofa.jpg
//   aboutPage.staciPhoto       → 02-About-Team/staci-headshot-planning-2026.jpg
//   project.plainfieldFamilyRoom.heroImage  → 04-Portfolio-Grid/living-room-grey-sectional-blue.jpg
//   project.fishersKitchenStyling.heroImage → 04-Portfolio-Grid/kitchen-island-brass-pendants.jpg
//   project.zionsvilleMasterBedroom.heroImage → 04-Portfolio-Grid/bedroom-iron-bed-be-still.jpg
//   journalEntry.plainfieldFamilyRoomWalkthrough.coverImage → 08-Blog-Social/cozy-living-room-warm-lighting.jpg
//
// Strategy: fetch each doc fresh from Sanity, replace the image field, write
// NDJSON, hand off to `sanity dataset import` for the actual upload + reference.
// The script does NOT run the import itself — spawnSync hangs in my Node shell.
// It prints the exact CLI command to copy-paste.

import { createClient } from '@sanity/client';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'wire-key-images.ndjson');

// Photos live alongside the repo, not inside it.
const photosRoot = resolve(root, '..', 'Reid Design Pictures', 'Reid Design Pictures');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_READ_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token });

/** Build a properly-formed _sanityAsset URL for a Windows file path. */
function assetRefForFile(absPath) {
  // file:// URIs use forward slashes; spaces become %20.
  const url = absPath.replaceAll(sep, '/').split('/').map(encodeURIComponent).join('/');
  return `image@file:///${url}`;
}

/** Build an image field value with hotspot enabled + alt text. */
function imageField(absPath, alt) {
  return {
    _type: 'image',
    _sanityAsset: assetRefForFile(absPath),
    alt,
  };
}

// ---- Wiring map: docId → patches ----

const wirings = [
  {
    docId: 'homePage',
    patches: {
      heroImage: imageField(
        resolve(photosRoot, '01-Home-Hero', 'reid-design-open-concept-kitchen-island.jpg'),
        'A bright open-concept kitchen designed by Reid Design — white cabinetry, oak floors, large island with brass pendant lights.',
      ),
      meetStaciPhoto: imageField(
        resolve(photosRoot, '01-Home-Hero', 'staci-perkins-at-home-with-dogs-sofa.jpg'),
        'Staci Perkins, founder of Reid Design, sitting on a linen sofa at home with her dogs.',
      ),
    },
  },
  {
    docId: 'aboutPage',
    patches: {
      staciPhoto: imageField(
        resolve(photosRoot, '02-About-Team', 'staci-perkins-headshot-planning-2026.jpg'),
        'Headshot of Staci Perkins, founder and lead designer of Reid Design LLC, photographed in her Plainfield studio.',
      ),
    },
  },
  {
    docId: 'project.plainfieldFamilyRoom',
    patches: {
      heroImage: imageField(
        resolve(photosRoot, '04-Portfolio-Grid', 'reid-design-living-room-grey-sectional-blue.jpg'),
        'Plainfield family room with a low-profile grey sectional, blue accent pillows, and layered textures — a recent Reid Design project.',
      ),
    },
  },
  {
    docId: 'project.fishersKitchenStyling',
    patches: {
      heroImage: imageField(
        resolve(photosRoot, '04-Portfolio-Grid', 'reid-design-kitchen-island-brass-pendants.jpg'),
        'A Fishers, Indiana kitchen styled by Reid Design — large island, brass pendant lights, warm white cabinetry.',
      ),
    },
  },
  {
    docId: 'project.zionsvilleMasterBedroom',
    patches: {
      heroImage: imageField(
        resolve(photosRoot, '04-Portfolio-Grid', 'reid-design-bedroom-iron-bed-be-still.jpg'),
        'Moody Zionsville primary bedroom with a black iron bed, layered linen bedding, and a "Be Still" framed print above.',
      ),
    },
  },
  {
    docId: 'journalEntry.plainfieldFamilyRoomWalkthrough',
    patches: {
      coverImage: imageField(
        resolve(photosRoot, '08-Blog-Social', 'reid-design-cozy-living-room-warm-lighting.jpg'),
        'Cozy living room in warm afternoon light — sofa, layered pillows, soft lamp glow.',
      ),
    },
  },
];

// ---- Fetch + patch ----

const ids = wirings.map((w) => w.docId);
const live = await client.fetch('*[_id in $ids]', { ids });
const liveById = Object.fromEntries(live.map((d) => [d._id, d]));

const missing = ids.filter((id) => !liveById[id]);
if (missing.length > 0) {
  console.error('Docs not found in Sanity:', missing.join(', '));
  process.exit(1);
}

const patched = wirings.map((w) => {
  const doc = liveById[w.docId];
  return { ...doc, ...w.patches };
});

console.log('Patches to be applied:');
for (const w of wirings) {
  for (const [field, value] of Object.entries(w.patches)) {
    console.log(`  ${w.docId.padEnd(50)} ${field}`);
    console.log(`    asset: ${value._sanityAsset.slice(0, 90)}...`);
  }
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const lines = patched.map((d) => JSON.stringify(d));
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${patched.length} patched docs to ${outPath}`);
console.log('\nNext step — upload + import (paste this):');
console.log(`  cd studio && npx sanity dataset import "${outPath}" production --replace`);

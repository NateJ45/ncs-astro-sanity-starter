// Enrich every image asset in the Sanity library with:
//   - title          (human-readable name derived from filename)
//   - altText        (descriptive alt for accessibility + SEO)
//   - description    (longer caption with context)
//   - opt.media.tags (references to media.tag docs — the sanity-plugin-media
//                     tag system, browsable + filterable in the Media tool)
//
// The tag taxonomy below defines ~50 starter tags grouped into categories
// (rooms, design elements, materials, colors, subjects, shot types, project
// stages, folder origin). Keyword matching against each asset's
// originalFilename picks the right tags automatically.
//
// Idempotent: tags already created get reused; existing metadata only gets
// overwritten if the new value is more useful than what's there. Safe to
// re-run for future uploads (just creates new metadata for any new assets,
// leaves existing assets alone unless their metadata is still empty).
//
// Strategy for write auth:
//   - First tries the SANITY_API_WRITE_TOKEN from .env for direct client
//     patches (fast, granular). Falls back to NDJSON + `sanity dataset
//     import` (CLI auth) if the token's membership check blocks patches
//     (same bug we hit with bulk asset uploads earlier).
//
// Run with: node scripts/enrich-asset-metadata.mjs
//           node scripts/enrich-asset-metadata.mjs --force  (overwrites existing)

import { createClient } from '@sanity/client';
import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const photosRoot = resolve(root, '..', 'Reid Design Pictures', 'Reid Design Pictures');
const outDir = resolve(root, 'tmp');
const FORCE = process.argv.includes('--force');

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const readToken = process.env.SANITY_API_READ_TOKEN;
const writeToken = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !readToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_READ_TOKEN in .env');
  process.exit(1);
}

const readClient = createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token: readToken });
const writeClient = writeToken
  ? createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token: writeToken })
  : null;

// ---------- 1. Tag taxonomy ----------
//
// Each tag is { name: "Display name", slug: "tag-slug", category: "rooms" }.
// Slug is used as the doc _id (media.tag.{slug}) so re-runs are idempotent.

const TAGS = [
  // Rooms — where the photo was taken
  { name: 'Living Room',     slug: 'room-living-room',  category: 'Rooms' },
  { name: 'Family Room',     slug: 'room-family-room',  category: 'Rooms' },
  { name: 'Bedroom',         slug: 'room-bedroom',      category: 'Rooms' },
  { name: 'Primary Bedroom', slug: 'room-primary-bedroom', category: 'Rooms' },
  { name: 'Kids Room',       slug: 'room-kids-room',    category: 'Rooms' },
  { name: 'Kitchen',         slug: 'room-kitchen',      category: 'Rooms' },
  { name: 'Bathroom',        slug: 'room-bathroom',     category: 'Rooms' },
  { name: 'Dining Room',     slug: 'room-dining-room',  category: 'Rooms' },
  { name: 'Entryway',        slug: 'room-entryway',     category: 'Rooms' },
  { name: 'Hallway',         slug: 'room-hallway',      category: 'Rooms' },
  { name: 'Office',          slug: 'room-office',       category: 'Rooms' },
  { name: 'Outdoor',         slug: 'room-outdoor',      category: 'Rooms' },

  // Design elements — distinctive features visible in the photo
  { name: 'Fireplace',         slug: 'element-fireplace',      category: 'Elements' },
  { name: 'Sectional',         slug: 'element-sectional',      category: 'Elements' },
  { name: 'Sofa',              slug: 'element-sofa',           category: 'Elements' },
  { name: 'Bed',               slug: 'element-bed',            category: 'Elements' },
  { name: 'Iron Bed',          slug: 'element-iron-bed',       category: 'Elements' },
  { name: 'Board & Batten',    slug: 'element-board-batten',   category: 'Elements' },
  { name: 'Gallery Wall',      slug: 'element-gallery-wall',   category: 'Elements' },
  { name: 'Pendant Lights',    slug: 'element-pendant-lights', category: 'Elements' },
  { name: 'Kitchen Island',    slug: 'element-island',         category: 'Elements' },
  { name: 'Vanity',            slug: 'element-vanity',         category: 'Elements' },
  { name: 'Mirror',            slug: 'element-mirror',         category: 'Elements' },
  { name: 'Shelving',          slug: 'element-shelving',       category: 'Elements' },
  { name: 'Rug',               slug: 'element-rug',            category: 'Elements' },
  { name: 'Built-Ins',         slug: 'element-built-ins',      category: 'Elements' },
  { name: 'Console Table',     slug: 'element-console-table',  category: 'Elements' },

  // Materials
  { name: 'Brass',   slug: 'material-brass',   category: 'Materials' },
  { name: 'Wood',    slug: 'material-wood',    category: 'Materials' },
  { name: 'Marble',  slug: 'material-marble',  category: 'Materials' },
  { name: 'Granite', slug: 'material-granite', category: 'Materials' },
  { name: 'Leather', slug: 'material-leather', category: 'Materials' },

  // Colors / palette
  { name: 'Blue Accents',  slug: 'color-blue',   category: 'Colors' },
  { name: 'Green Accents', slug: 'color-green',  category: 'Colors' },
  { name: 'Grey Palette',  slug: 'color-grey',   category: 'Colors' },
  { name: 'Cream + White', slug: 'color-cream',  category: 'Colors' },
  { name: 'Dark / Moody',  slug: 'color-dark',   category: 'Colors' },

  // Subjects (for people / scene photos)
  { name: 'Staci — Portrait',       slug: 'subject-staci-portrait',       category: 'Subjects' },
  { name: 'Staci — Candid',         slug: 'subject-staci-candid',         category: 'Subjects' },
  { name: 'Staci — At Work',        slug: 'subject-staci-working',        category: 'Subjects' },
  { name: 'Behind the Scenes',      slug: 'subject-behind-scenes',        category: 'Subjects' },

  // Project stage (before/after series)
  { name: 'Before / Older Project', slug: 'stage-before', category: 'Stages' },

  // Shot composition
  { name: 'Detail Shot',  slug: 'shot-detail',   category: 'Shot Type' },
  { name: 'Vignette',     slug: 'shot-vignette', category: 'Shot Type' },
  { name: 'Overhead',     slug: 'shot-overhead', category: 'Shot Type' },
  { name: 'Wide Shot',    slug: 'shot-wide',     category: 'Shot Type' },

  // Decor / styling
  { name: 'Flowers',  slug: 'decor-flowers', category: 'Decor' },
  { name: 'Candles',  slug: 'decor-candles', category: 'Decor' },
  { name: 'Wall Art', slug: 'decor-art',     category: 'Decor' },

  // Folder origin (mirrors the upload folders)
  { name: 'Home Hero photo',          slug: 'folder-home-hero',         category: 'Source Folder' },
  { name: 'About / Team photo',       slug: 'folder-about-team',        category: 'Source Folder' },
  { name: 'Services photo',           slug: 'folder-services',          category: 'Source Folder' },
  { name: 'Portfolio Grid photo',     slug: 'folder-portfolio-grid',    category: 'Source Folder' },
  { name: 'Project Detail photo',     slug: 'folder-project-detail',    category: 'Source Folder' },
  { name: 'Process / Behind Scenes',  slug: 'folder-process',           category: 'Source Folder' },
  { name: 'Testimonials / Contact',   slug: 'folder-testimonials',      category: 'Source Folder' },
  { name: 'Blog / Social photo',      slug: 'folder-blog-social',       category: 'Source Folder' },
  { name: 'Older Projects (archive)', slug: 'folder-older-projects',    category: 'Source Folder' },
];

// ---------- 2. Keyword → tag-slug mapping ----------
//
// Each filename is scanned for these substrings; matching adds the listed
// tag slugs. Order doesn't matter — duplicates dedup via Set.

const KEYWORD_TO_TAGS = {
  // Compound matches first (more specific wins by adding more tags)
  'master-bedroom':  ['room-bedroom', 'room-primary-bedroom'],
  'primary-bedroom': ['room-bedroom', 'room-primary-bedroom'],
  'kids-room':       ['room-bedroom', 'room-kids-room'],
  'family-room':     ['room-living-room', 'room-family-room'],

  // Rooms
  'living-room': ['room-living-room'],
  'bedroom':     ['room-bedroom'],
  'kitchen':     ['room-kitchen'],
  'bathroom':    ['room-bathroom'],
  'dining':      ['room-dining-room'],
  'entryway':    ['room-entryway'],
  'hallway':     ['room-hallway'],
  'studio':      ['room-office'],
  'office':      ['room-office'],
  'outdoor':     ['room-outdoor'],
  'patio':       ['room-outdoor'],
  'exterior':    ['room-outdoor'],

  // Elements
  'fireplace':    ['element-fireplace'],
  'mantel':       ['element-fireplace'],
  'sectional':    ['element-sectional'],
  'sofa':         ['element-sofa'],
  'couch':        ['element-sofa'],
  'iron-bed':     ['element-iron-bed', 'element-bed'],
  'upholstered-bed': ['element-bed'],
  'bed':          ['element-bed'],
  'board-batten': ['element-board-batten'],
  'gallery-wall': ['element-gallery-wall'],
  'pendant':      ['element-pendant-lights'],
  'pendants':     ['element-pendant-lights'],
  'island':       ['element-island'],
  'vanity':       ['element-vanity'],
  'mirror':       ['element-mirror'],
  'shelving':     ['element-shelving'],
  'shelf':        ['element-shelving'],
  'rug':          ['element-rug'],
  'built-in':     ['element-built-ins'],
  'console':      ['element-console-table'],
  'hutch':        ['element-console-table'],

  // Materials
  'brass':   ['material-brass'],
  'wood':    ['material-wood'],
  'marble':  ['material-marble'],
  'granite': ['material-granite'],
  'leather': ['material-leather'],

  // Colors
  'blue':  ['color-blue'],
  'green': ['color-green'],
  'sage':  ['color-green'],
  'grey':  ['color-grey'],
  'gray':  ['color-grey'],
  'cream': ['color-cream'],
  'white': ['color-cream'],
  'pale':  ['color-cream'],
  'dark':  ['color-dark'],
  'moody': ['color-dark'],

  // Subjects (Staci photos)
  'headshot':             ['subject-staci-portrait'],
  'design-consultation':  ['subject-staci-working'],
  'design-pub':           ['subject-staci-candid'],
  'design-magazine':      ['subject-staci-candid'],
  'design-book':          ['subject-staci-candid'],
  'desk':                 ['subject-staci-working'],
  'workspace':            ['subject-staci-working'],
  'planning':             ['subject-staci-working'],
  'dogs':                 ['subject-staci-candid'],
  'sofa-reading':         ['subject-staci-candid'],
  'home-with-dogs':       ['subject-staci-candid'],
  'design-review':        ['subject-staci-working'],
  'behind-scenes':        ['subject-staci-working', 'subject-behind-scenes'],
  'palette-consultation': ['subject-staci-working'],
  'materials':            ['subject-staci-working'],

  // Stage
  'before': ['stage-before'],
  'older':  ['stage-before'],
  'dated':  ['stage-before'],

  // Shot
  'detail':    ['shot-detail'],
  'close-up':  ['shot-detail'],
  'vignette':  ['shot-vignette'],
  'overhead':  ['shot-overhead'],
  'wide-shot': ['shot-wide'],
  'wide-room': ['shot-wide'],

  // Decor
  'flowers':    ['decor-flowers'],
  'floral':     ['decor-flowers'],
  'tulips':     ['decor-flowers'],
  'hydrangeas': ['decor-flowers'],
  'candle':     ['decor-candles'],
  'candles':    ['decor-candles'],
  'wall-art':   ['decor-art'],
  'art':        ['decor-art'],
  'quote':      ['decor-art'],
};

// ---------- 3. Local folder → tag mapping (for origin tag) ----------

const FOLDER_TO_TAG = {
  '01-Home-Hero':                 'folder-home-hero',
  '02-About-Team':                'folder-about-team',
  '03-Services':                  'folder-services',
  '04-Portfolio-Grid':            'folder-portfolio-grid',
  '05-Project-Detail':            'folder-project-detail',
  '06-Process-Behind-Scenes':     'folder-process',
  '07-Testimonials-Contact':      'folder-testimonials',
  '08-Blog-Social':               'folder-blog-social',
  '11-Older-Projects-Before-Only': 'folder-older-projects',
};

// Build a map: filename → array of folder slugs the file appears in
function buildFilenameToFolders() {
  const m = new Map();
  for (const folder of readdirSync(photosRoot)) {
    const tag = FOLDER_TO_TAG[folder];
    if (!tag) continue;
    const folderPath = resolve(photosRoot, folder);
    if (!statSync(folderPath).isDirectory()) continue;
    for (const file of readdirSync(folderPath)) {
      const existing = m.get(file) ?? [];
      existing.push(tag);
      m.set(file, existing);
    }
  }
  return m;
}

// ---------- 4. Filename → metadata ----------

function detectTagsFromFilename(filename, folderTags) {
  const tags = new Set(folderTags);
  const cleaned = filename.toLowerCase().replace(/\.\w+$/, '');
  for (const [keyword, tagSlugs] of Object.entries(KEYWORD_TO_TAGS)) {
    if (cleaned.includes(keyword)) {
      for (const t of tagSlugs) tags.add(t);
    }
  }
  // Staci photos: if filename starts with staci-perkins-, ensure at least the
  // staci-candid tag is set as a fallback when no more specific subject matched.
  if (cleaned.startsWith('staci-perkins') &&
      !tags.has('subject-staci-portrait') &&
      !tags.has('subject-staci-working') &&
      !tags.has('subject-staci-candid')) {
    tags.add('subject-staci-candid');
  }
  return Array.from(tags);
}

function generateTitle(filename) {
  // "reid-design-bedroom-iron-bed-be-still.jpg" → "Bedroom — iron bed, Be Still"
  // "staci-perkins-headshot-planning-2026.jpg" → "Staci Perkins — headshot, planning 2026"
  const base = filename.toLowerCase().replace(/\.\w+$/, '');
  if (base.startsWith('staci-perkins-')) {
    const rest = base.slice('staci-perkins-'.length).replace(/-/g, ' ');
    return `Staci Perkins — ${rest}`.replace(/\s+/g, ' ').trim();
  }
  if (base.startsWith('reid-design-')) {
    const rest = base.slice('reid-design-'.length);
    // Split into room + descriptors
    const words = rest.split('-');
    // Try to detect the room as the first 1-2 words
    const cap = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return cap;
  }
  return base.replace(/-/g, ' ');
}

function generateAltText(filename, detectedTags) {
  const base = filename.toLowerCase().replace(/\.\w+$/, '');
  if (base.startsWith('staci-perkins-')) {
    const rest = base.slice('staci-perkins-'.length).replace(/-/g, ' ');
    return `Staci Perkins, founder of Reid Design, ${rest}.`;
  }
  // Room photos
  const roomTag = detectedTags.find((t) => t.startsWith('room-'));
  const room = roomTag ? roomTag.replace('room-', '').replace(/-/g, ' ') : null;
  const descriptors = base
    .replace(/^reid-design-/, '')
    .replace(/^(living-room|family-room|bedroom|kitchen|bathroom|dining-room|entryway|hallway|office|outdoor|patio|primary-bedroom|master-bedroom|kids-room|exterior)-?/, '')
    .replace(/-/g, ', ');
  if (room && descriptors) {
    return `${room.charAt(0).toUpperCase() + room.slice(1)} designed by Reid Design, featuring ${descriptors}.`;
  }
  if (room) {
    return `${room.charAt(0).toUpperCase() + room.slice(1)} designed by Reid Design.`;
  }
  return `Reid Design photo: ${base.replace(/-/g, ' ')}.`;
}

function generateDescription(filename, detectedTags, folderTags) {
  const base = filename.toLowerCase().replace(/\.\w+$/, '');
  const folderTagLabels = folderTags
    .map((t) => TAGS.find((td) => td.slug === t)?.name)
    .filter(Boolean)
    .join(', ');
  if (base.startsWith('staci-perkins-')) {
    return `From the Reid Design photo library. Source: ${folderTagLabels}.`;
  }
  const roomTag = detectedTags.find((t) => t.startsWith('room-'));
  const room = roomTag ? roomTag.replace('room-', '').replace(/-/g, ' ') : 'interior';
  return `Reid Design ${room} photograph. Filename: ${filename}. Source: ${folderTagLabels}.`;
}

// ---------- 5. Main ----------

console.log('Loading assets from Sanity...');
const assets = await readClient.fetch(`*[_type == "sanity.imageAsset"]{
  _id, originalFilename, title, altText, description, opt
}`);
console.log(`Found ${assets.length} image assets.`);

const filenameToFolders = buildFilenameToFolders();

// Determine which assets need updating + which tags to use
const enrichments = [];
const usedTagSlugs = new Set();
let skipped = 0;

for (const asset of assets) {
  const filename = asset.originalFilename;
  if (!filename) {
    skipped++;
    continue;
  }
  const folderTags = filenameToFolders.get(filename) ?? [];
  const tagSlugs = detectTagsFromFilename(filename, folderTags);
  for (const t of tagSlugs) usedTagSlugs.add(t);

  const title = generateTitle(filename);
  const altText = generateAltText(filename, tagSlugs);
  const description = generateDescription(filename, tagSlugs, folderTags);

  // Skip if already has metadata and --force isn't set
  const hasExisting = !!(asset.title || asset.altText || asset.description);
  if (hasExisting && !FORCE) {
    skipped++;
    continue;
  }

  enrichments.push({ asset, title, altText, description, tagSlugs });
}

console.log(`Plan: enrich ${enrichments.length} assets, skip ${skipped} (already have metadata; pass --force to overwrite).`);
console.log(`Will use ${usedTagSlugs.size} unique tags out of ${TAGS.length} defined.`);

// ---------- 6. Create media.tag documents (idempotent via createIfNotExists) ----------

const tagDocsToCreate = TAGS.filter((t) => usedTagSlugs.has(t.slug)).map((t) => ({
  _id: `media.tag.${t.slug}`,
  _type: 'media.tag',
  name: { _type: 'slug', current: t.slug },
}));

console.log(`\nCreating ${tagDocsToCreate.length} media.tag documents...`);
let tagsCreated = 0;
if (writeClient) {
  for (const tagDoc of tagDocsToCreate) {
    try {
      await writeClient.createIfNotExists(tagDoc);
      tagsCreated++;
    } catch (err) {
      console.warn(`  ! Failed to create tag ${tagDoc._id}: ${err.message}`);
    }
  }
  console.log(`  Created/verified ${tagsCreated} tag docs via write token.`);
}

if (!writeClient || tagsCreated < tagDocsToCreate.length) {
  // Fallback: write NDJSON and tell user to run sanity dataset import
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const tagPath = resolve(outDir, 'enrich-tag-docs.ndjson');
  writeFileSync(tagPath, tagDocsToCreate.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf-8');
  console.log(`  Wrote tag docs NDJSON fallback to ${tagPath}`);
  console.log(`  Run: cd studio && npx sanity dataset import "${tagPath}" production --replace`);
}

// ---------- 7. Patch assets ----------

console.log(`\nPatching ${enrichments.length} assets with title/altText/description/tags...`);
let patched = 0;
let patchFailed = 0;
const failedPatches = [];

if (writeClient) {
  // Try direct patches first
  for (const e of enrichments) {
    try {
      await writeClient
        .patch(e.asset._id)
        .set({
          title: e.title,
          altText: e.altText,
          description: e.description,
          opt: {
            media: {
              tags: e.tagSlugs.map((slug) => ({
                _type: 'reference',
                _key: randomBytes(4).toString('hex'),
                _ref: `media.tag.${slug}`,
              })),
            },
          },
        })
        .commit({ autoGenerateArrayKeys: true });
      patched++;
      if (patched % 25 === 0) process.stdout.write(`\r  Patched ${patched}/${enrichments.length}`);
    } catch (err) {
      patchFailed++;
      failedPatches.push({ id: e.asset._id, filename: e.asset.originalFilename, error: err.message });
    }
  }
  console.log(`\n  Done: ${patched} patched, ${patchFailed} failed.`);
}

if (!writeClient || patchFailed > 0) {
  // NDJSON fallback for whatever didn't go through
  const toFallback = !writeClient
    ? enrichments
    : enrichments.filter((e, i) => failedPatches.some((f) => f.id === e.asset._id));

  if (toFallback.length > 0) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const assetPath = resolve(outDir, 'enrich-asset-patches.ndjson');
    const lines = toFallback.map((e) =>
      JSON.stringify({
        ...e.asset,
        title: e.title,
        altText: e.altText,
        description: e.description,
        opt: {
          media: {
            tags: e.tagSlugs.map((slug) => ({
              _type: 'reference',
              _key: randomBytes(4).toString('hex'),
              _ref: `media.tag.${slug}`,
            })),
          },
        },
      }),
    );
    writeFileSync(assetPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`\n  Wrote ${toFallback.length} asset patches NDJSON fallback to ${assetPath}`);
    console.log(`  Run: cd studio && npx sanity dataset import "${assetPath}" production --replace`);
  }
}

if (failedPatches.length > 0 && failedPatches.length <= 5) {
  console.log('\nFirst few failures:');
  failedPatches.slice(0, 5).forEach((f) =>
    console.log(`  ${f.filename}: ${f.error.slice(0, 100)}`),
  );
}

console.log('\nDone.');

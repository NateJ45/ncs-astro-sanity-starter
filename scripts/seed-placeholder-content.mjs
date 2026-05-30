// One-shot seeder for the empty Sanity collections.
//
// Why this exists:
//   The initial migration import (Step 8e) populated the seven page singletons
//   (homePage, aboutPage, processPage, servicesPage, faqPage, contactPage, siteSettings)
//   but every collection — service, testimonial, processStep, philosophyPoint, faqItem,
//   project — ended up empty in the production dataset. The singletons reference
//   collection docs that don't exist, so the homepage testimonial grid, the philosophy
//   block on About, the process steps on Process, and the FAQ accordion all render
//   empty even though the surrounding sections are wired correctly.
//
// What this does:
//   1. Loads the five existing collection JSON files from migration-docs/content/
//      (the high-quality extracted content from Staci's Squarespace site).
//   2. Appends an E-Design service (the virtual-design tier mentioned as deferred
//      in CLAUDE.md) so the Services page shows a full tier ladder.
//   3. Appends three placeholder Project documents — no heroImage attached yet
//      (Sanity Studio flags this as a validation warning; the frontend's
//      ProjectCard renders an empty image slot gracefully so the LAYOUT previews
//      without real photos). Staci replaces these with real case studies later.
//   4. Streams everything to NDJSON and runs `sanity dataset import` against
//      the configured production dataset. Uses CLI auth (the user must already
//      be logged in via `npx sanity login`).
//
// Singletons are NOT touched — running this won't disturb existing
// homePage/aboutPage/etc content. Collections use createOrReplace semantics
// via the --replace flag so re-running is safe and idempotent.
//
// Run with: node scripts/seed-placeholder-content.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const contentDir = resolve(root, 'migration-docs/content');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'placeholder-seed.ndjson');

// Collection JSON files only — singletons are intentionally excluded.
const COLLECTION_FILES = [
  'philosophy-points.json',
  'testimonials.json',
  'services.json',
  'process-steps.json',
  'faq-items.json',
];

function loadDocs(file) {
  const raw = readFileSync(resolve(contentDir, file), 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ---------- Additional placeholder content the JSON files don't cover ----------

// E-Design: the virtual interior design tier called out as "not currently active on
// the live site" in CLAUDE.md. Adding it as placeholder so the Services page shows
// the full pricing ladder. Slots after the existing 5 services at displayOrder 6.
const eDesignService = {
  _type: 'service',
  _id: 'service.eDesign',
  name: 'E-Design',
  slug: { _type: 'slug', current: 'e-design' },
  price: 'starting at $450',
  priceNumeric: 450,
  shortDescription:
    'A fully digital design package for clients outside Greater Indianapolis or who prefer to manage the install themselves.',
  features: [
    'Full digital design plan delivered as a clickable PDF',
    'Mood board + finish/material palette',
    '2D layout with furniture placement',
    'Sourcing list with direct shopping links',
    'One round of revisions',
    'Two weeks of email follow-up while you shop',
  ],
  bestFor:
    'Out-of-area clients, hands-on homeowners, or anyone who wants a clear plan without the in-home install.',
  longDescription: [
    {
      _type: 'block',
      _key: 'edesign-intro',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'edesign-intro-1',
          text:
            "E-Design is the same considered approach as Full Room Design, delivered remotely. You send measurements and photos, we talk through how you live in the space, and you get back a complete plan you implement at your pace.",
        },
      ],
    },
    {
      _type: 'block',
      _key: 'edesign-suit',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'edesign-suit-1',
          text:
            "It suits clients in nearby cities like Bloomington, Lafayette, and Cincinnati, plus Greater Indianapolis homeowners who'd rather shop and install themselves on a flexible timeline.",
        },
      ],
    },
  ],
  displayOrder: 6,
  showOnHomepage: false,
  ctaLabel: 'Start an E-Design',
};

// ---------- Placeholder projects (DELETE BEFORE LAUNCH) ----------
//
// IMPORTANT: these three are SAMPLE projects, not real content. They ship with no
// images and exist only to preview the portfolio layout and filter behavior. They
// are PUBLISHED docs with realistic, Plainfield-area copy, so in the Studio they
// look just like real projects. Delete all three (or replace them with real case
// studies) before the DNS cutover, or they silently become Staci's live portfolio.
// The titles below are prefixed "[SAMPLE: delete before launch]" so they are
// unmistakable in the Studio document list and on any build that includes them.

function pt(key, ...spans) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    children: spans.map((text, i) => ({
      _type: 'span',
      _key: `${key}-${i}`,
      text,
    })),
  };
}

const placeholderProjects = [
  {
    _type: 'project',
    _id: 'project.plainfieldFamilyRoom',
    title: '[SAMPLE: delete before launch] Plainfield Family Room Refresh',
    slug: { _type: 'slug', current: 'plainfield-family-room-refresh' },
    location: 'Plainfield, IN',
    roomType: 'livingRoom',
    year: 2026,
    briefSummary:
      'A young family wanted a living room that handled chaos beautifully — durable fabrics, warm neutrals, and a layout that finally fit five people.',
    introStory: [
      pt(
        'pfr-1',
        "The family had outgrown the room's previous arrangement — a single sectional that made the space feel both crowded and weirdly empty depending on which kid was where. They wanted a layout that worked for movie nights, board games, and the kind of evening where everyone ends up in there by accident.",
      ),
      pt(
        'pfr-2',
        "We started with a layout shift: pulling the new sofa off the longest wall, anchoring it with a swivel chair pair, and adding a tucked-in reading nook by the window. The palette stayed warm and forgiving — performance linen on the sofa, washable wool rug, ceramic and brass accents — so everything would still feel intentional after a juice spill or three.",
      ),
      pt(
        'pfr-3',
        "The reveal landed on a Friday afternoon. By Sunday they'd had four neighbors over and one of the kids had built a fort behind the swivel chair. Both counted as success.",
      ),
    ],
    displayOrder: 1,
    publishedAt: '2026-05-01T12:00:00Z',
  },
  {
    _type: 'project',
    _id: 'project.fishersKitchenStyling',
    title: '[SAMPLE: delete before launch] Fishers Kitchen Styling',
    slug: { _type: 'slug', current: 'fishers-kitchen-styling' },
    location: 'Fishers, IN',
    roomType: 'kitchen',
    year: 2026,
    briefSummary:
      'A recent kitchen reno was beautiful but felt unfinished. Styling brought it home in a single afternoon visit — no construction required.',
    introStory: [
      pt(
        'fk-1',
        "The homeowners had just wrapped a six-month kitchen renovation and the bones were stunning — paneled refrigerator, warm white oak, soapstone counters — but the room read flat in photos and somehow lonelier than the dated kitchen it replaced. They didn't want more cabinetry; they wanted the room to feel lived in.",
      ),
      pt(
        'fk-2',
        "Styling sessions like this are about restraint, not addition. We sourced a vintage cutting board collection, an antique mortar and pestle, and a small selection of ceramic vessels in three height groups. We rearranged what was already on the counters, added an oversized fruit bowl, and edited the open shelving down by about a third.",
      ),
      pt(
        'fk-3',
        "By the time we left, the homeowner had texted three friends to come see it. The room finally read as theirs, not a showroom.",
      ),
    ],
    displayOrder: 2,
    publishedAt: '2026-04-15T12:00:00Z',
  },
  {
    _type: 'project',
    _id: 'project.zionsvilleMasterBedroom',
    title: '[SAMPLE: delete before launch] Zionsville Primary Bedroom',
    slug: { _type: 'slug', current: 'zionsville-primary-bedroom' },
    location: 'Zionsville, IN',
    roomType: 'bedroom',
    year: 2025,
    briefSummary:
      'A primary bedroom that finally felt like a retreat — moody walls, layered textiles, and exactly the right amount of empty space.',
    introStory: [
      pt(
        'zb-1',
        "Two professionals with demanding jobs wanted their bedroom to feel like the opposite of their inboxes. We talked through what 'restful' actually meant for them — not the Pinterest version, the real one: low light, quiet color, surfaces that didn't need styling to look right.",
      ),
      pt(
        'zb-2',
        "The room got a soft moody color drench (walls, trim, and ceiling in the same warm charcoal), a heavy linen-blend bedscape with a tucked Belgian throw, two oversized nightstand lamps for ambient-only light, and a single artwork above the bed at a deliberately slightly-too-small scale. No gallery walls, no styled trays.",
      ),
      pt(
        'zb-3',
        "The owners report sleeping noticeably better. We're claiming that one.",
      ),
    ],
    displayOrder: 3,
    publishedAt: '2025-11-10T12:00:00Z',
  },
];

// ---------- Build NDJSON ----------

const lines = [];
let total = 0;

for (const file of COLLECTION_FILES) {
  const docs = loadDocs(file);
  for (const doc of docs) {
    if (!doc._type || !doc._id) {
      throw new Error(`Doc in ${file} missing _type or _id: ${JSON.stringify(doc).slice(0, 80)}`);
    }
    lines.push(JSON.stringify(doc));
    total += 1;
  }
  console.log(`  ${file}: ${docs.length} docs`);
}

lines.push(JSON.stringify(eDesignService));
total += 1;
console.log(`  + E-Design service: 1 doc`);

for (const project of placeholderProjects) {
  lines.push(JSON.stringify(project));
  total += 1;
}
console.log(`  + Placeholder projects: ${placeholderProjects.length} docs`);

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${total} documents to ${outPath}`);

// ---------- Run the import ----------
//
// --replace makes this idempotent. The script targets the 'production' dataset
// via Sanity CLI auth (the user's existing `npx sanity login` session). It does
// NOT include any of the page singletons, so re-running it cannot overwrite
// edited page copy. It WILL overwrite any prior placeholder collection content
// with the IDs we use here — that's intentional for a placeholder seeder.

console.log('\nRunning sanity dataset import...\n');
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['sanity', 'dataset', 'import', outPath, 'production', '--replace'],
  {
    cwd: resolve(root, 'studio'),
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 0);

// One-off: insert editorial h2 section headings into each project's
// introStory so the auto-generated CaseStudyTOC sidebar has entries to
// render. The TOC component pulls h2/h3/h4 blocks from the intro story
// via extractHeadings(), so without any headings the sidebar returns
// null and the case-study page reads as one long unbroken column.
//
// All three current projects (fishers-kitchen-styling, plainfield-
// family-room, zionsville-primary-bedroom) follow the same 3-paragraph
// rhythm: brief → move → reveal. So we use the same three section
// labels across the board ("The brief", "The move", "The reveal"),
// inserting an h2 block immediately before each existing paragraph.
//
// Re-runnable: skips any project that ALREADY has an h2/h3/h4 block in
// its introStory, so editors who later customize their own headings
// don't get overwritten.
//
// Run: node scripts/patch-project-introstory-headings.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

function k() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

// Build a single h2 Portable Text block with the given heading text.
function heading(text) {
  return {
    _key: k(),
    _type: 'block',
    style: 'h2',
    markDefs: [],
    children: [{ _key: k(), _type: 'span', text, marks: [] }],
  };
}

// Section labels in case-study order. Three for now; if a project ever
// has more than three paragraphs we'll cycle through these and append
// "Detail" h3 blocks for the rest.
const SECTION_LABELS = ['The brief', 'The move', 'The reveal'];

async function run() {
  const projects = await client.fetch(
    '*[_type == "project"]{ _id, title, "slug": slug.current, introStory }',
  );

  for (const p of projects) {
    const story = Array.isArray(p.introStory) ? p.introStory : [];
    const hasHeading = story.some(
      (b) => b._type === 'block' && ['h2', 'h3', 'h4'].includes(b.style),
    );
    if (hasHeading) {
      console.log(`[skip] ${p.slug}: already has at least one heading`);
      continue;
    }

    // Walk through the existing blocks. Before each text block (style:
    // normal), insert the next section heading. Leave non-text blocks
    // (inline images, etc.) where they are.
    const next = [];
    let normalIdx = 0;
    for (const block of story) {
      const isNormal =
        block?._type === 'block' && (block.style === 'normal' || !block.style);
      if (isNormal && normalIdx < SECTION_LABELS.length) {
        next.push(heading(SECTION_LABELS[normalIdx]));
        normalIdx += 1;
      }
      next.push(block);
    }

    await client.patch(p._id).set({ introStory: next }).commit();
    console.log(`[ok]   ${p.slug}: inserted ${normalIdx} h2 heading${normalIdx === 1 ? '' : 's'}`);
  }

  console.log('\nAll done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

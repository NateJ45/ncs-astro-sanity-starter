/**
 * modules/portfolio/seed.mjs
 *
 * Idempotent seeder for the portfolio module. Creates one `portfolioPage`
 * singleton and three neutral `project` documents.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/portfolio/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Image fields are intentionally left unset; the pages handle missing images
 * gracefully and you can add real photos via the Studio.
 */

import { createClient } from '@sanity/client';
import { config } from 'dotenv';

// Load env vars from the project root .env file.
config();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token     = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('Error: PUBLIC_SANITY_PROJECT_ID is not set. Add it to your .env file.');
  process.exit(1);
}
if (!token) {
  console.error('Error: SANITY_API_WRITE_TOKEN is not set. Add a write token to your .env file.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// ---------------------------------------------------------------------------
// portfolioPage singleton
// ---------------------------------------------------------------------------

const portfolioPage = {
  _id: 'portfolioPage',
  _type: 'portfolioPage',
  seoTitle: 'Portfolio',
  seoDescription: 'A look at recent work. Each project starts with a conversation about what the space needs to do.',
  heroEyebrow: 'Selected work',
  heroHeadline: 'A look at recent work.',
  heroSubhead: 'Each project starts with a conversation about what the space needs to do, then works back from there.',
};

// ---------------------------------------------------------------------------
// project documents
// ---------------------------------------------------------------------------

const projects = [
  {
    _id: 'seed-project-one',
    _type: 'project',
    title: 'Project One',
    slug: { _type: 'slug', current: 'project-one' },
    location: 'City, ST',
    roomType: 'livingRoom',
    designStyle: 'transitional',
    year: new Date().getFullYear(),
    briefSummary: 'A well-proportioned living room that needed a clear focal point and a palette to anchor the furniture.',
    briefLine: 'Good bones, but the seating arrangement had no clear center.',
    designCall: 'Anchor with one large-scale rug, pull the sofa off the wall, and let the room breathe.',
    introStory: [
      {
        _type: 'block',
        _key: 'intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'intro-span1',
            text: 'Replace this placeholder text with the real project story. Walk through the brief, the design decisions, and the result in your own voice.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    featured: false,
    publishedAt: new Date().toISOString(),
  },
  {
    _id: 'seed-project-two',
    _type: 'project',
    title: 'Project Two',
    slug: { _type: 'slug', current: 'project-two' },
    location: 'City, ST',
    roomType: 'kitchen',
    designStyle: 'modernFarmhouse',
    year: new Date().getFullYear(),
    briefSummary: 'An open-plan kitchen with great light but surfaces that competed with each other instead of settling into a single story.',
    briefLine: 'Every surface was fighting for attention; nothing read as a decision.',
    designCall: 'Commit to one material as the hero and let the rest recede.',
    introStory: [
      {
        _type: 'block',
        _key: 'intro-p2',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'intro-span2',
            text: 'Replace this placeholder text with the real project story. Walk through the brief, the design decisions, and the result in your own voice.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    featured: false,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'seed-project-three',
    _type: 'project',
    title: 'Project Three',
    slug: { _type: 'slug', current: 'project-three' },
    location: 'City, ST',
    roomType: 'office',
    designStyle: 'modernOrganic',
    year: new Date().getFullYear(),
    briefSummary: 'A home office that had to work as a serious workspace during the day and disappear into the house at night.',
    briefLine: 'The room served double duty but looked like neither job.',
    designCall: 'Hide the function in the furniture and let the light do the storytelling.',
    introStory: [
      {
        _type: 'block',
        _key: 'intro-p3',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'intro-span3',
            text: 'Replace this placeholder text with the real project story. Walk through the brief, the design decisions, and the result in your own voice.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    featured: false,
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding portfolio module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  tx.createOrReplace(portfolioPage);
  for (const project of projects) {
    tx.createOrReplace(project);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  portfolioPage (singleton)');
  for (const project of projects) {
    console.log(`  project: "${project.title}" (${project.slug.current})`);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

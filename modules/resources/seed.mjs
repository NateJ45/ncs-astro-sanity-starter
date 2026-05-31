/**
 * modules/resources/seed.mjs
 *
 * Idempotent seeder for the resources module. Creates one `resourcesPage`
 * singleton with five neutral resource cards pointing at the capture-module
 * and core routes.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/resources/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 *
 * NOTE: The cards reference routes from other modules (/quiz, /calculator,
 * /guides). Enable those modules alongside this one so the links are live.
 * If a linked module is off, the page filters out its card automatically via
 * the sectionVisibility check in resources.astro, so no 404s occur for
 * visitors -- but the card simply won't appear until the module is enabled.
 *
 * Icon images are left unset; the cards render without icons and look clean.
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
// resourcesPage singleton
// ---------------------------------------------------------------------------

const resourcesPage = {
  _id: 'resourcesPage',
  _type: 'resourcesPage',
  seoTitle: 'Free Resources',
  seoDescription:
    'Planning tools and guides from the studio: style quiz, budget calculator, free downloads, FAQ, and more.',
  heroEyebrow: 'Free tools and guides',
  heroHeadline: 'Start here before we talk.',
  heroSubhead:
    'Everything you need to walk into that first conversation knowing what you want and what to expect.',
  intro:
    'Use these tools and guides to get clear on your goals before we start. No obligation, no pitch.',
  cards: [
    {
      _type: 'resourceCard',
      _key: 'seed-card-quiz',
      title: 'Style Quiz',
      blurb: 'Find your design direction and get a personal recommendation tailored to your answers.',
      link: '/quiz',
    },
    {
      _type: 'resourceCard',
      _key: 'seed-card-calculator',
      title: 'Budget Calculator',
      blurb: 'Get a rough sense of what a project costs before reaching out.',
      link: '/calculator',
    },
    {
      _type: 'resourceCard',
      _key: 'seed-card-guides',
      title: 'Free Guides',
      blurb: 'Practical downloads covering common decisions. Take them, keep them.',
      link: '/guides',
    },
    {
      _type: 'resourceCard',
      _key: 'seed-card-faq',
      title: 'FAQ',
      blurb: 'Pricing, process, and logistics in one place. Read this before your consultation.',
      link: '/faq',
    },
    {
      _type: 'resourceCard',
      _key: 'seed-card-journal',
      title: 'Journal',
      blurb: 'Behind-the-scenes project notes, sourcing decisions, and design thinking.',
      link: '/journal',
    },
  ],
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding resources module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  tx.createOrReplace(resourcesPage);

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  resourcesPage (singleton) with 5 resource cards');
  console.log('');
  console.log('Cards added:');
  for (const card of resourcesPage.cards) {
    console.log(`  "${card.title}" -> ${card.link}`);
  }
  console.log('');
  console.log('Note: /quiz and /calculator cards require their respective modules to be enabled.');
  console.log('If those modules are off, the page hides those cards automatically.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

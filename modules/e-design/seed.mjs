/**
 * modules/e-design/seed.mjs
 *
 * Idempotent seeder for the e-design module. Creates one `eDesignPage`
 * singleton with neutral intro copy, how-it-works steps, three pricing tiers,
 * and final CTA fields.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/e-design/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Image fields are intentionally left unset; the page handles missing images
 * gracefully and you can add real photos via the Studio.
 *
 * Note: `faqRefs` is left empty because FAQ item IDs are dataset-specific.
 * Add FAQ references manually in Studio after seeding.
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
// eDesignPage singleton
// ---------------------------------------------------------------------------

const eDesignPage = {
  _id: 'eDesignPage',
  _type: 'eDesignPage',
  seoTitle: 'E-Design Services',
  seoDescription: 'Professional interior design delivered entirely online. Flat-fee packages, digital mood boards, and a complete room plan -- no travel required.',
  heroEyebrow: 'Online Design.',
  heroHeadline: 'Beautiful Rooms, No Matter Where You Are.',
  heroSubhead: 'Full-service interior design delivered digitally, on your schedule.',
  intro: [
    {
      _type: 'block',
      _key: 'intro-p1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'intro-span1',
          text: 'E-design brings the full interior design process online. You get a detailed room plan, curated product selections, and a mood board -- all delivered digitally so geography is never a barrier.',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'intro-p2',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'intro-span2',
          text: 'Replace this placeholder text with your own description of the e-design offering and who it is best suited for.',
          marks: [],
        },
      ],
      markDefs: [],
    },
  ],
  howItWorks: [
    {
      _type: 'howItWorksStep',
      _key: 'how-step-1',
      stepNumber: 1,
      title: 'Share Your Space',
      body: 'Send room dimensions, photos, and a brief description of how the space is used and what you want it to feel like.',
    },
    {
      _type: 'howItWorksStep',
      _key: 'how-step-2',
      stepNumber: 2,
      title: 'Receive Your Design',
      body: 'We put together a mood board, floor plan, and full product list tailored to your space and budget.',
    },
    {
      _type: 'howItWorksStep',
      _key: 'how-step-3',
      stepNumber: 3,
      title: 'Shop and Install',
      body: 'Use the clickable shopping list to order everything yourself, then follow the included layout guide to arrange it all.',
    },
  ],
  whatsIncluded: [
    'Digital floor plan',
    'Curated mood board',
    'Full product list with links',
    'Paint and finish recommendations',
    'Layout and styling notes',
    'One round of revisions',
  ],
  tiers: [
    {
      _type: 'eDesignTier',
      _key: 'tier-essential',
      name: 'Essential',
      price: '$350',
      priceNumeric: 350,
      features: [
        'One room',
        'Mood board',
        'Product list (up to 15 items)',
        'One revision round',
      ],
      bestFor: 'A single accent refresh or a room you want to update without a full overhaul.',
      ctaLabel: 'Inquire about E-Design',
    },
    {
      _type: 'eDesignTier',
      _key: 'tier-full',
      name: 'Full Room',
      price: '$650',
      priceNumeric: 650,
      features: [
        'One room, fully furnished',
        'Floor plan',
        'Mood board',
        'Product list (up to 30 items)',
        'Two revision rounds',
        'Shopping guide',
      ],
      bestFor: 'A complete room redesign from layout to final accessories.',
      ctaLabel: 'Inquire about E-Design',
    },
    {
      _type: 'eDesignTier',
      _key: 'tier-multi',
      name: 'Multi-Room',
      price: 'Starting at $1,100',
      features: [
        'Two or more rooms',
        'Floor plans for each space',
        'Cohesive palette across rooms',
        'Product list (up to 60 items)',
        'Two revision rounds per room',
        'Shopping guide',
      ],
      bestFor: 'Multiple spaces that need to feel connected and intentional.',
      ctaLabel: 'Inquire about E-Design',
    },
  ],
  faqRefs: [],
  finalCtaEyebrow: 'Ready to Start?',
  finalCtaHeadline: 'Get a Room You Love From Wherever You Are.',
  finalCtaSubhead: 'Reach out and we will walk through what e-design looks like for your space.',
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding e-design module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(eDesignPage);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  eDesignPage (singleton)');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

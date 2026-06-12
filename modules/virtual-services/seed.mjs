/**
 * modules/virtual-services/seed.mjs
 *
 * Idempotent seeder for the virtual-services module. Creates one
 * `virtualServicesPage` singleton with neutral intro copy, how-it-works steps,
 * three pricing tiers, and final CTA fields.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/virtual-services/seed.mjs
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
// virtualServicesPage singleton
// ---------------------------------------------------------------------------

const virtualServicesPage = {
  _id: 'virtualServicesPage',
  _type: 'virtualServicesPage',
  seoTitle: 'Virtual Services',
  seoDescription: 'Professional services delivered entirely online. Flat-fee packages and a complete deliverable set, no travel required.',
  heroEyebrow: 'Online Services.',
  heroHeadline: 'Great Work, No Matter Where You Are.',
  heroSubhead: 'Full-service delivery online, on your schedule.',
  intro: [
    {
      _type: 'block',
      _key: 'vs-intro-p1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'vs-intro-s1',
          text: 'Virtual services bring the full service process online. You get a detailed plan, curated recommendations, and all deliverables sent digitally, so location is never a barrier.',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'vs-intro-p2',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'vs-intro-s2',
          text: 'Replace this placeholder text with your own description of the virtual service offering and who it is best suited for.',
          marks: [],
        },
      ],
      markDefs: [],
    },
  ],
  howItWorks: [
    {
      _type: 'howItWorksStep',
      _key: 'vs-how-step-1',
      stepNumber: 1,
      title: 'Share Your Needs',
      body: 'Send us an overview of your project, goals, and any relevant context. A quick intake form makes this straightforward.',
    },
    {
      _type: 'howItWorksStep',
      _key: 'vs-how-step-2',
      stepNumber: 2,
      title: 'Receive Your Deliverables',
      body: 'We put together a complete package tailored to your goals and send everything digitally for review.',
    },
    {
      _type: 'howItWorksStep',
      _key: 'vs-how-step-3',
      stepNumber: 3,
      title: 'Review and Implement',
      body: 'Work through the deliverables at your own pace. We are available to answer questions during the review period.',
    },
  ],
  whatsIncluded: [
    'Digital project plan',
    'Curated recommendations',
    'Complete deliverable package',
    'Implementation notes',
    'One round of revisions',
    'Follow-up Q and A period',
  ],
  tiers: [
    {
      _type: 'virtualServicesTier',
      _key: 'vs-tier-essential',
      name: 'Essential',
      price: '$350',
      priceNumeric: 350,
      features: [
        'Single-focus scope',
        'Recommendations package',
        'Up to 15 items',
        'One revision round',
      ],
      bestFor: 'A targeted engagement where you need focused recommendations on one aspect of your project.',
      ctaLabel: 'Inquire about Virtual Services',
    },
    {
      _type: 'virtualServicesTier',
      _key: 'vs-tier-full',
      name: 'Full Package',
      price: '$650',
      priceNumeric: 650,
      features: [
        'Complete project scope',
        'Full deliverables set',
        'Up to 30 items',
        'Two revision rounds',
        'Implementation guide',
      ],
      bestFor: 'A complete project engagement from planning through final recommendations.',
      ctaLabel: 'Inquire about Virtual Services',
    },
    {
      _type: 'virtualServicesTier',
      _key: 'vs-tier-multi',
      name: 'Multi-Scope',
      price: 'Starting at $1,100',
      features: [
        'Two or more focus areas',
        'Coordinated delivery across scopes',
        'Up to 60 items',
        'Two revision rounds per scope',
        'Implementation guide',
      ],
      bestFor: 'Multiple related focus areas that need to feel connected and consistent.',
      ctaLabel: 'Inquire about Virtual Services',
    },
  ],
  faqRefs: [],
  finalCtaEyebrow: 'Ready to Start?',
  finalCtaHeadline: 'Great Results, From Wherever You Are.',
  finalCtaSubhead: 'Reach out and we will walk through what virtual services look like for your project.',
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding virtual-services module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(virtualServicesPage);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  virtualServicesPage (singleton)');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

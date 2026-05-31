/**
 * modules/process/seed.mjs
 *
 * Idempotent seeder for the process module. Creates one `processPage`
 * singleton and four neutral `processStep` documents.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/process/seed.mjs
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
// processPage singleton
// ---------------------------------------------------------------------------

const processPage = {
  _id: 'processPage',
  _type: 'processPage',
  seoTitle: 'How We Work',
  seoDescription: 'A clear look at how a project unfolds from first conversation to final result.',
  heroEyebrow: 'The Process.',
  heroHeadline: 'From First Call to Final Reveal.',
  heroSubhead: 'Every project follows a clear path. Here is what to expect at each stage.',
  faqSectionEyebrow: 'Common Questions.',
  faqSectionHeadline: 'Things People Ask Before We Start.',
  finalCtaEyebrow: 'Ready to Begin?',
  finalCtaHeadline: 'Have questions before we start?',
};

// ---------------------------------------------------------------------------
// processStep documents
// ---------------------------------------------------------------------------

const steps = [
  {
    _id: 'seed-process-step-one',
    _type: 'processStep',
    stepNumber: 1,
    title: 'Step One',
    timeEstimate: '30 to 60 minutes',
    shortDescription: 'We start with a conversation to understand your goals, your space, and how you live in it.',
    fullDescription: [
      {
        _type: 'block',
        _key: 'step1-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'step1-span1',
            text: 'Replace this placeholder text with a description of your first step. Describe what the client can expect, what you will discuss, and any preparation they should do beforehand.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    features: ['No obligation', 'Video or in person'],
  },
  {
    _id: 'seed-process-step-two',
    _type: 'processStep',
    stepNumber: 2,
    title: 'Step Two',
    timeEstimate: '1 to 2 weeks',
    shortDescription: 'We put together a tailored plan that covers layout, materials, and the overall direction.',
    fullDescription: [
      {
        _type: 'block',
        _key: 'step2-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'step2-span1',
            text: 'Replace this placeholder text with a description of your second step. Explain what deliverables the client receives, how feedback rounds work, and what approvals are needed to move forward.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    features: ['Written proposal', 'Mood board included'],
  },
  {
    _id: 'seed-process-step-three',
    _type: 'processStep',
    stepNumber: 3,
    title: 'Step Three',
    timeEstimate: '2 to 4 weeks',
    shortDescription: 'With the plan approved, we source and specify everything the project needs.',
    fullDescription: [
      {
        _type: 'block',
        _key: 'step3-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'step3-span1',
            text: 'Replace this placeholder text with a description of your third step. Cover how purchasing or procurement works, lead times, and how the client stays informed during this phase.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    features: ['Trade sourcing', 'Client approval before ordering'],
  },
  {
    _id: 'seed-process-step-four',
    _type: 'processStep',
    stepNumber: 4,
    title: 'Step Four',
    timeEstimate: 'Half day to full day',
    shortDescription: 'Everything comes together. We handle installation and finishing so you can walk in ready.',
    fullDescription: [
      {
        _type: 'block',
        _key: 'step4-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'step4-span1',
            text: 'Replace this placeholder text with a description of your final step. Describe what the reveal day looks like, what the client needs to do (if anything), and what follow-up support you offer afterward.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    features: ['Full installation managed', 'Walkthrough included'],
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding process module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  tx.createOrReplace(processPage);
  for (const step of steps) {
    tx.createOrReplace(step);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  processPage (singleton)');
  for (const step of steps) {
    console.log(`  processStep: "${step.title}" (step ${step.stepNumber})`);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

/**
 * modules/style-quiz/seed.mjs
 *
 * Idempotent seeder for the style-quiz module. Creates one `styleQuiz`
 * singleton with 4 neutral questions and 3 archetype results.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/style-quiz/seed.mjs
 *
 * The document uses a deterministic `_id` so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 *
 * NOTE: Image fields (answer images, archetype images) are intentionally left
 * unset. The quiz island renders a label-only fallback when no image is
 * present and the archetype result card omits the image grid. Add real photos
 * via the Studio.
 *
 * All archetype names, question prompts, and qualifier options are neutral
 * placeholders. Replace them with copy specific to the client's audience
 * and service offering before publishing.
 *
 * Archetype slugs referenced in `archetypeWeights` MUST match the slugs
 * defined in the `archetypes` array below. The three archetypes used here are:
 *   - "archetype-a"
 *   - "archetype-b"
 *   - "archetype-c"
 *
 * Each question's answers collectively cover all three archetypes so that
 * every possible combination of answers produces a meaningful winner.
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
// styleQuiz singleton
// ---------------------------------------------------------------------------
//
// Three archetypes with slugs that answer weights reference:
//   archetype-a  -- replace with client-specific archetype name and description
//   archetype-b  -- replace with client-specific archetype name and description
//   archetype-c  -- replace with client-specific archetype name and description
//
// Four questions, each with three to four answers that each add weight to one
// archetype. Every archetype gets at least one strong-weight answer per
// question so that consistent pickers always score a clear winner.

const styleQuiz = {
  _id: 'styleQuiz',
  _type: 'styleQuiz',

  // Intro
  introEyebrow: 'Discover your fit',
  introHeadline: 'Find Your Fit',
  introSubhead: 'Answer four quick questions and find out which approach fits you best. Replace this with copy specific to your service and audience.',

  // Questions
  questions: [
    {
      _type: 'quizQuestion',
      _key: 'q1',
      prompt: 'Question 1: Replace with your first question prompt.',
      helpText: 'Add an optional clarifying note here, or remove this field.',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q1a1',
          label: 'Answer leaning toward Archetype A',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a1w1', archetypeSlug: 'archetype-a', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a2',
          label: 'Answer leaning toward Archetype B',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a2w1', archetypeSlug: 'archetype-b', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a3',
          label: 'Answer leaning toward Archetype C',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a3w1', archetypeSlug: 'archetype-c', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a4',
          label: 'Mixed answer (A and B)',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a4w1', archetypeSlug: 'archetype-a', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q1a4w2', archetypeSlug: 'archetype-b', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q2',
      prompt: 'Question 2: Replace with your second question prompt.',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q2a1',
          label: 'Answer leaning toward Archetype A',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a1w1', archetypeSlug: 'archetype-a', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a2',
          label: 'Answer leaning toward Archetype B',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a2w1', archetypeSlug: 'archetype-b', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a3',
          label: 'Answer leaning toward Archetype C',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a3w1', archetypeSlug: 'archetype-c', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a4',
          label: 'Mixed answer (A and C)',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a4w1', archetypeSlug: 'archetype-a', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q2a4w2', archetypeSlug: 'archetype-c', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q3',
      prompt: 'Question 3: Replace with your third question prompt.',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q3a1',
          label: 'Answer leaning toward Archetype A',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a1w1', archetypeSlug: 'archetype-a', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a2',
          label: 'Answer leaning toward Archetype B',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a2w1', archetypeSlug: 'archetype-b', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a3',
          label: 'Answer leaning toward Archetype C',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a3w1', archetypeSlug: 'archetype-c', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a4',
          label: 'Mixed answer (B and C)',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a4w1', archetypeSlug: 'archetype-b', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q3a4w2', archetypeSlug: 'archetype-c', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q4',
      prompt: 'Question 4: Replace with your fourth question prompt.',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q4a1',
          label: 'Answer leaning toward Archetype A',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a1w1', archetypeSlug: 'archetype-a', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a2',
          label: 'Answer leaning toward Archetype B',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a2w1', archetypeSlug: 'archetype-b', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a3',
          label: 'Answer leaning toward Archetype C',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a3w1', archetypeSlug: 'archetype-c', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a4',
          label: 'Mixed answer (A and B)',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a4w1', archetypeSlug: 'archetype-a', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q4a4w2', archetypeSlug: 'archetype-b', weight: 1 },
          ],
        },
      ],
    },
  ],

  // Qualifier questions (intent detection -- shown after image questions)
  qualifiers: [
    {
      _type: 'qualifier',
      _key: 'qual1',
      prompt: 'How soon are you hoping to get started?',
      type: 'timeline',
      options: [
        { _type: 'qualifierOption', _key: 'qual1o1', label: 'As soon as possible', value: 'asap' },
        { _type: 'qualifierOption', _key: 'qual1o2', label: 'Within the next three months', value: '1-3months' },
        { _type: 'qualifierOption', _key: 'qual1o3', label: 'Just exploring for now', value: 'exploring' },
      ],
    },
    {
      _type: 'qualifier',
      _key: 'qual2',
      prompt: 'What is your rough budget for this project?',
      type: 'budget',
      options: [
        { _type: 'qualifierOption', _key: 'qual2o1', label: 'Smaller budget (replace with your range)', value: 'budget-low' },
        { _type: 'qualifierOption', _key: 'qual2o2', label: 'Mid-range budget (replace with your range)', value: 'budget-mid' },
        { _type: 'qualifierOption', _key: 'qual2o3', label: 'Larger budget (replace with your range)', value: 'budget-high' },
        { _type: 'qualifierOption', _key: 'qual2o4', label: 'Not sure yet', value: 'unsure' },
      ],
    },
  ],

  // Archetypes -- slugs MUST match archetypeSlug values used in answers above
  archetypes: [
    {
      _type: 'archetype',
      _key: 'arch1',
      name: 'Archetype A',
      slug: { _type: 'slug', current: 'archetype-a' },
      description: [
        {
          _type: 'block',
          _key: 'arch1p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch1s1',
              text: 'Replace this with the description for Archetype A. Two to three sentences shown on the result screen. Write in a warm, direct voice that makes the quiz taker feel understood.',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
      resultCtaLabel: 'Book a consultation',
    },
    {
      _type: 'archetype',
      _key: 'arch2',
      name: 'Archetype B',
      slug: { _type: 'slug', current: 'archetype-b' },
      description: [
        {
          _type: 'block',
          _key: 'arch2p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch2s1',
              text: 'Replace this with the description for Archetype B. Two to three sentences shown on the result screen. Write in a warm, direct voice that makes the quiz taker feel understood.',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
      resultCtaLabel: 'Book a consultation',
    },
    {
      _type: 'archetype',
      _key: 'arch3',
      name: 'Archetype C',
      slug: { _type: 'slug', current: 'archetype-c' },
      description: [
        {
          _type: 'block',
          _key: 'arch3p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch3s1',
              text: 'Replace this with the description for Archetype C. Two to three sentences shown on the result screen. Write in a warm, direct voice that makes the quiz taker feel understood.',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
      resultCtaLabel: 'Book a consultation',
    },
  ],

  // Email gate
  gate: {
    mode: 'optional',
    heading: 'Your result is ready.',
    blurb: 'Drop your email in and we will send your full result with tailored next steps.',
    consentNote: 'No spam, ever.',
    espTag: 'quiz',
  },

  // Routing
  routing: {
    highIntentRule: 'asap,1-3months',
    bookCtaLabel: 'Book a consultation',
    guideCtaLabel: 'Get the free guide',
  },
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding style-quiz module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(styleQuiz);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  styleQuiz (singleton)');
  console.log('  Questions: 4 (neutral placeholders)');
  console.log('  Archetypes: 3 (archetype-a, archetype-b, archetype-c)');
  console.log('  Qualifiers: 2 (timeline, budget)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Replace archetype names and descriptions in Studio (Archetypes tab).');
  console.log('  2. Replace question prompts and answer labels (Questions tab).');
  console.log('  3. Add answer images via the Studio (Questions tab).');
  console.log('  4. Add archetype images via the Studio (Archetypes tab).');
  console.log('  5. Update qualifier options and budget ranges to match real pricing (Qualifiers tab).');
  console.log('  6. Review routing rules (Routing + CTAs tab).');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

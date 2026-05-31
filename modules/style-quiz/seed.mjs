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
 * Archetype slugs referenced in `archetypeWeights` MUST match the slugs
 * defined in the `archetypes` array below. The three archetypes used here are:
 *   - "clean-modern"
 *   - "warm-traditional"
 *   - "relaxed-eclectic"
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
//   clean-modern      -- prefers order, minimal surfaces, calm palettes
//   warm-traditional  -- prefers comfort, layered textiles, rich tones
//   relaxed-eclectic  -- prefers personality, mix of eras, pattern and texture
//
// Four questions, each with four answers that each add weight to one archetype.
// Every archetype gets at least one strong-weight answer per question so that
// consistent pickers always score a clear winner.

const styleQuiz = {
  _id: 'styleQuiz',
  _type: 'styleQuiz',

  // Intro
  introEyebrow: 'Discover your style',
  introHeadline: 'What is your design style?',
  introSubhead: 'Answer four quick questions and find out which aesthetic fits the way you actually live.',

  // Questions
  questions: [
    {
      _type: 'quizQuestion',
      _key: 'q1',
      prompt: 'When you walk into a well-designed room, what do you notice first?',
      helpText: 'Go with your first instinct.',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q1a1',
          label: 'Clean lines and open space',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a1w1', archetypeSlug: 'clean-modern', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a2',
          label: 'Rich colors and layered textures',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a2w1', archetypeSlug: 'warm-traditional', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a3',
          label: 'An unexpected mix of pieces that somehow works',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a3w1', archetypeSlug: 'relaxed-eclectic', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q1a4',
          label: 'Natural light and a sense of calm',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q1a4w1', archetypeSlug: 'clean-modern', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q1a4w2', archetypeSlug: 'warm-traditional', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q2',
      prompt: 'Which living room description fits you best?',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q2a1',
          label: 'Minimal furniture, neutral palette, every surface clear',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a1w1', archetypeSlug: 'clean-modern', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a2',
          label: 'Plush sofa, throw pillows, curtains that puddle on the floor',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a2w1', archetypeSlug: 'warm-traditional', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a3',
          label: 'Vintage sideboard, bold rug, gallery wall with a mix of frames',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a3w1', archetypeSlug: 'relaxed-eclectic', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q2a4',
          label: 'A few well-chosen pieces, one statement chair, nothing extra',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q2a4w1', archetypeSlug: 'clean-modern', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q2a4w2', archetypeSlug: 'relaxed-eclectic', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q3',
      prompt: 'You are choosing a sofa. Which one do you keep coming back to?',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q3a1',
          label: 'Low profile, tight back, solid upholstery in a quiet tone',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a1w1', archetypeSlug: 'clean-modern', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a2',
          label: 'Deep cushions, rolled arms, a fabric with a little texture',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a2w1', archetypeSlug: 'warm-traditional', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a3',
          label: 'Velvet in an unexpected color, maybe with fringe or a bold leg',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a3w1', archetypeSlug: 'relaxed-eclectic', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q3a4',
          label: 'A classic shape you can reupholster when you get tired of it',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q3a4w1', archetypeSlug: 'warm-traditional', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q3a4w2', archetypeSlug: 'relaxed-eclectic', weight: 1 },
          ],
        },
      ],
    },
    {
      _type: 'quizQuestion',
      _key: 'q4',
      prompt: 'Which phrase best describes your relationship with stuff?',
      answers: [
        {
          _type: 'quizAnswer',
          _key: 'q4a1',
          label: "If it doesn't earn its place, it goes",
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a1w1', archetypeSlug: 'clean-modern', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a2',
          label: 'I keep things that have meaning, and arrange them with care',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a2w1', archetypeSlug: 'warm-traditional', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a3',
          label: 'I collect things I love and figure out where they fit later',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a3w1', archetypeSlug: 'relaxed-eclectic', weight: 3 },
          ],
        },
        {
          _type: 'quizAnswer',
          _key: 'q4a4',
          label: 'I want fewer pieces but the ones I have should be really good',
          archetypeWeights: [
            { _type: 'archetypeWeight', _key: 'q4a4w1', archetypeSlug: 'clean-modern', weight: 2 },
            { _type: 'archetypeWeight', _key: 'q4a4w2', archetypeSlug: 'warm-traditional', weight: 1 },
          ],
        },
      ],
    },
  ],

  // Qualifier questions (intent detection — shown after image questions)
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
        { _type: 'qualifierOption', _key: 'qual2o1', label: 'Under $5,000', value: 'under-5k' },
        { _type: 'qualifierOption', _key: 'qual2o2', label: '$5,000 to $15,000', value: '5k-15k' },
        { _type: 'qualifierOption', _key: 'qual2o3', label: 'Over $15,000', value: 'over-15k' },
        { _type: 'qualifierOption', _key: 'qual2o4', label: 'Not sure yet', value: 'unsure' },
      ],
    },
  ],

  // Archetypes — slugs MUST match archetypeSlug values used in answers above
  archetypes: [
    {
      _type: 'archetype',
      _key: 'arch1',
      name: 'Clean Modern',
      slug: { _type: 'slug', current: 'clean-modern' },
      description: [
        {
          _type: 'block',
          _key: 'arch1p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch1s1',
              text: 'You are drawn to rooms that feel deliberate and calm. Every piece has a reason to be there, the palette stays quiet, and the whole space just breathes. Replace this description with your own words before publishing.',
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
      name: 'Warm Traditional',
      slug: { _type: 'slug', current: 'warm-traditional' },
      description: [
        {
          _type: 'block',
          _key: 'arch2p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch2s1',
              text: 'You want a home that feels like a place to land, with layers that get better over time. Good fabrics, furniture that has a story, and colors that feel warm even on gray days. Replace this description with your own words before publishing.',
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
      name: 'Relaxed Eclectic',
      slug: { _type: 'slug', current: 'relaxed-eclectic' },
      description: [
        {
          _type: 'block',
          _key: 'arch3p1',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'arch3s1',
              text: 'Your space reflects who you are, not a single trend. You mix eras, collect things you love, and are not afraid of pattern or an odd color. Replace this description with your own words before publishing.',
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
    heading: 'Your style result is ready.',
    blurb: 'Drop your email in and we will send your full result with tips for your style.',
    consentNote: 'No spam, ever.',
    espTag: 'style-quiz',
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
  console.log('  Questions: 4');
  console.log('  Archetypes: 3 (clean-modern, warm-traditional, relaxed-eclectic)');
  console.log('  Qualifiers: 2 (timeline, budget)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Add answer images via the Studio (Questions tab).');
  console.log('  2. Add archetype images via the Studio (Archetypes tab).');
  console.log('  3. Update archetype descriptions to match the studio voice.');
  console.log('  4. Review qualifier options and routing rules (Routing + CTAs tab).');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

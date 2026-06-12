/**
 * modules/donations/seed.mjs
 *
 * Idempotent seeder for the donations module. Creates one `donationsPage`
 * singleton with neutral mission copy, four impact stat placeholders,
 * a placeholder donate URL, and closing CTA fields.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/donations/seed.mjs
 *
 * The document uses a deterministic `_id` so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Image fields are intentionally left unset.
 *
 * IMPORTANT: Replace `donateUrl` with a real donation processor URL before
 * publishing. The page will show a "get in touch" fallback instead of a
 * donate button until a valid URL is provided.
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
// donationsPage singleton
// ---------------------------------------------------------------------------

const donationsPage = {
  _id: 'donationsPage',
  _type: 'donationsPage',
  seoTitle: 'Donate',
  seoDescription: 'Support our mission. Every contribution helps us do more of the work that matters.',
  heroEyebrow: 'Make a Difference.',
  heroHeadline: 'Support Our Work',
  heroSubhead: 'Your generosity keeps this work going. Replace this with your own intro.',
  mission: [
    {
      _type: 'block',
      _key: 'mission-p1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'mission-s1',
          text: 'Replace this with your mission statement. Describe the work you do, who you serve, and why it matters. Two to three paragraphs is the right length for this section.',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'mission-p2',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'mission-s2',
          text: 'Add a second paragraph here explaining how donations are used. Specificity builds trust: tell donors exactly where their money goes.',
          marks: [],
        },
      ],
      markDefs: [],
    },
  ],
  impactStats: [
    {
      _type: 'impactStat',
      _key: 'stat1',
      value: '0,000',
      label: 'people served (replace)',
    },
    {
      _type: 'impactStat',
      _key: 'stat2',
      value: '00+',
      label: 'programs running (replace)',
    },
    {
      _type: 'impactStat',
      _key: 'stat3',
      value: '00',
      label: 'years in operation (replace)',
    },
    {
      _type: 'impactStat',
      _key: 'stat4',
      value: '100%',
      label: 'of donations to programs (replace)',
    },
  ],
  // Replace with your real donation processor URL before publishing.
  // Supported processors: Donorbox, PayPal Giving Fund, Stripe, Give Lively, etc.
  donateUrl: 'https://example.com/donate',
  donateCtaLabel: 'Donate Now',
  faqRefs: [],
  finalCtaEyebrow: 'Make a Difference.',
  finalCtaHeadline: 'Your Support Matters.',
  finalCtaSubhead: 'Every contribution helps us continue this work. Thank you for giving.',
  finalCtaButtonLabel: 'Donate Now',
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding donations module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(donationsPage);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  donationsPage (singleton)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Replace placeholder mission copy in Studio (Mission tab).');
  console.log('  2. Update impact stats with real figures (Impact Stats tab).');
  console.log('  3. Set donateUrl to your real donation processor URL (Donate CTA tab). Required before publishing.');
  console.log('  4. Optionally link FAQ items (FAQ tab).');
  console.log('  5. Optionally update the closing CTA copy (Closing CTA tab).');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

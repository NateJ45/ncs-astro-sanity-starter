/**
 * modules/gift-certificates/seed.mjs
 *
 * Idempotent seeder for the gift-certificates module. Creates one `giftPage`
 * singleton with neutral options, how-it-works steps, and fine print.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/gift-certificates/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Image fields are intentionally left unset; the page handles missing images
 * gracefully and you can add real photos via the Studio.
 *
 * This page is inquire-only -- there is no payment processing.
 * All purchase steps route visitors to the contact form.
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
// giftPage singleton
// ---------------------------------------------------------------------------

const giftPage = {
  _id: 'giftPage',
  _type: 'giftPage',
  seoTitle: 'Gift Certificates',
  seoDescription: 'Give the gift of a beautifully designed room. Gift certificates available for consultations and design packages.',
  heroEyebrow: 'Give the Gift of Good Design.',
  heroHeadline: 'A Gift Certificate for the Home They Deserve.',
  heroSubhead: 'Perfect for birthdays, housewarmings, or any occasion.',
  intro: 'A gift certificate is the most useful present you can give someone who has a space they have been meaning to transform. It can be applied toward a consultation or a full design package. Reach out to discuss options and we will sort out the details together.',
  options: [
    {
      _type: 'giftOption',
      _key: 'gift-option-consultation',
      label: 'Consultation Gift',
      amount: '$150',
      blurb: 'Covers a full in-person or video design consultation -- a focused session to map out priorities and next steps.',
    },
    {
      _type: 'giftOption',
      _key: 'gift-option-edesign',
      label: 'E-Design Package Gift',
      amount: '$350 and up',
      blurb: 'Applied toward an e-design package of the recipient\'s choice. They pick the room and the tier.',
    },
    {
      _type: 'giftOption',
      _key: 'gift-option-custom',
      label: 'Custom Amount',
      amount: 'Any amount',
      blurb: 'Not sure what fits? A custom-amount certificate lets the recipient apply it toward any service.',
    },
  ],
  howItWorks: [
    {
      _type: 'giftStep',
      _key: 'gift-step-1',
      stepNumber: 1,
      title: 'Reach Out',
      body: 'Contact us to let us know you would like to purchase a gift certificate and which option you have in mind.',
    },
    {
      _type: 'giftStep',
      _key: 'gift-step-2',
      stepNumber: 2,
      title: 'We Send the Certificate',
      body: 'We will send a digital certificate directly to you or to the recipient, whichever you prefer.',
    },
    {
      _type: 'giftStep',
      _key: 'gift-step-3',
      stepNumber: 3,
      title: 'Recipient Books',
      body: 'The recipient contacts us to schedule, and the certificate value is applied to their project.',
    },
  ],
  finePrint: 'Gift certificates are non-refundable and have no cash value. They are valid for 12 months from the date of purchase and may be applied toward any available service at the time of redemption. Contact us to confirm current availability before purchasing.',
  ctaLabel: 'Inquire about a Gift Certificate',
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding gift-certificates module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(giftPage);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  giftPage (singleton)');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

/**
 * modules/budget-calculator/seed.mjs
 *
 * Idempotent seeder for the budget-calculator module. Creates one
 * `budgetCalculator` singleton with 3 room types, 3 scope levels,
 * and 3 add-ons.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/budget-calculator/seed.mjs
 *
 * The document uses a deterministic `_id` so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 *
 * The ranges below are intentionally conservative placeholder figures.
 * Update them via the Studio (Rooms, Scope options, and Add-ons tabs) to
 * reflect accurate pricing for the studio's market before publishing.
 *
 * Range logic (all dollar figures):
 *   Total low  = room.baseLow  + scope.addLow  + sum of selected addon.low
 *   Total high = room.baseHigh + scope.addHigh + sum of selected addon.high
 *
 * The seed data is internally consistent: base ranges are set by room
 * type (larger rooms cost more), scope adds a percentage-like uplift,
 * and add-ons are optional extras that each add a reasonable fixed range.
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
// budgetCalculator singleton
// ---------------------------------------------------------------------------
//
// Rooms: 3 common room types, sized low to high by typical project complexity.
// Scope: 3 levels from a light refresh (no add) to a full redesign (+$2,500–$5,000).
// Add-ons: 3 optional extras, each with a straightforward cost range.
//
// Example combined range (living room + full redesign + window treatments):
//   Low:  $6,000 + $2,500 + $500  = $9,000
//   High: $12,000 + $5,000 + $2,000 = $19,000

const budgetCalculator = {
  _id: 'budgetCalculator',
  _type: 'budgetCalculator',

  // Intro
  introEyebrow: 'Plan your project',
  introHeadline: 'What does a design project cost?',
  introSubhead: 'Use this as a starting point, not a firm quote. Every space is different, and a consultation is the only way to get specifics.',
  heroScriptAccent: '',

  // Rooms
  rooms: [
    {
      _type: 'room',
      _key: 'room1',
      label: 'Single room (bedroom, office, or dining room)',
      baseLow: 3000,
      baseHigh: 7000,
    },
    {
      _type: 'room',
      _key: 'room2',
      label: 'Living room or primary bedroom',
      baseLow: 6000,
      baseHigh: 12000,
    },
    {
      _type: 'room',
      _key: 'room3',
      label: 'Open-plan living and dining area',
      baseLow: 10000,
      baseHigh: 20000,
    },
  ],

  // Scope options
  scopeOptions: [
    {
      _type: 'scopeOption',
      _key: 'scope1',
      label: 'Light refresh (new accessories, art, and textiles)',
      addLow: 0,
      addHigh: 0,
    },
    {
      _type: 'scopeOption',
      _key: 'scope2',
      label: 'Partial redesign (some new furniture, updated palette)',
      addLow: 1000,
      addHigh: 2500,
    },
    {
      _type: 'scopeOption',
      _key: 'scope3',
      label: 'Full redesign (furniture, finishes, layout, and accessories)',
      addLow: 2500,
      addHigh: 5000,
    },
  ],

  // Add-ons (optional extras)
  addOns: [
    {
      _type: 'addOn',
      _key: 'addon1',
      label: 'Window treatments',
      low: 500,
      high: 2000,
    },
    {
      _type: 'addOn',
      _key: 'addon2',
      label: 'Lighting updates',
      low: 300,
      high: 1500,
    },
    {
      _type: 'addOn',
      _key: 'addon3',
      label: 'Art selection and placement',
      low: 200,
      high: 1000,
    },
  ],

  // Result copy and CTA
  resultCopy: 'Based on what you described, a project like this typically runs {{low}} to {{high}}. That said, every home is different.',
  disclaimer: 'This is a rough estimate to help you plan, not a quote. Actual cost depends on your space, finish level, and shopping budget. A consultation will give you specifics.',
  ctaLabel: 'Book a consultation',
  consultPriceNote: '',
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding budget-calculator module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();
  tx.createOrReplace(budgetCalculator);
  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  budgetCalculator (singleton)');
  console.log('  Rooms: 3 (single room, living room, open-plan)');
  console.log('  Scope options: 3 (light refresh, partial redesign, full redesign)');
  console.log('  Add-ons: 3 (window treatments, lighting, art)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update the room labels and base cost ranges in the Studio (Rooms tab).');
  console.log('  2. Adjust scope uplift amounts to match real pricing (Scope options tab).');
  console.log('  3. Add or remove add-ons as needed (Add-ons tab).');
  console.log('  4. Optionally add a hero image and script-accent word (Intro tab).');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

/**
 * modules/budget-calculator/seed.mjs
 *
 * Idempotent seeder for the budget-calculator module. Creates one
 * `budgetCalculator` singleton with 3 project sizes, 3 scope levels,
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
 * The seed data is internally consistent: base ranges are set by project
 * size (larger projects cost more), scope adds a percentage-like uplift,
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
// Project sizes: 3 generic sizes from small to large.
// Scope: 3 levels from a light engagement to a comprehensive one.
// Add-ons: 3 optional extras with generic names.
//
// Example combined range (medium project + full scope + Add-on A):
//   Low:  $6,000 + $2,500 + $500  = $9,000
//   High: $12,000 + $5,000 + $2,000 = $19,000
//
// Replace all labels and price ranges with client-specific values
// in the Studio before publishing.

const budgetCalculator = {
  _id: 'budgetCalculator',
  _type: 'budgetCalculator',

  // Intro
  introEyebrow: 'Plan your project',
  introHeadline: 'What does a project like this cost?',
  introSubhead: 'Use this as a starting point, not a firm quote. Every project is different, and a consultation is the only way to get specifics.',
  heroScriptAccent: '',

  // Project sizes (using the 'rooms' field -- replace labels with your project-size vocabulary)
  rooms: [
    {
      _type: 'room',
      _key: 'room1',
      label: 'Small project (replace with your smallest scope label)',
      baseLow: 3000,
      baseHigh: 7000,
    },
    {
      _type: 'room',
      _key: 'room2',
      label: 'Medium project (replace with your mid-range scope label)',
      baseLow: 6000,
      baseHigh: 12000,
    },
    {
      _type: 'room',
      _key: 'room3',
      label: 'Large project (replace with your largest scope label)',
      baseLow: 10000,
      baseHigh: 20000,
    },
  ],

  // Scope options
  scopeOptions: [
    {
      _type: 'scopeOption',
      _key: 'scope1',
      label: 'Light engagement (replace with your lightest scope description)',
      addLow: 0,
      addHigh: 0,
    },
    {
      _type: 'scopeOption',
      _key: 'scope2',
      label: 'Standard engagement (replace with your standard scope description)',
      addLow: 1000,
      addHigh: 2500,
    },
    {
      _type: 'scopeOption',
      _key: 'scope3',
      label: 'Comprehensive engagement (replace with your full scope description)',
      addLow: 2500,
      addHigh: 5000,
    },
  ],

  // Add-ons (optional extras -- replace with your actual optional service items)
  addOns: [
    {
      _type: 'addOn',
      _key: 'addon1',
      label: 'Add-on A (replace with your first optional service)',
      low: 500,
      high: 2000,
    },
    {
      _type: 'addOn',
      _key: 'addon2',
      label: 'Add-on B (replace with your second optional service)',
      low: 300,
      high: 1500,
    },
    {
      _type: 'addOn',
      _key: 'addon3',
      label: 'Add-on C (replace with your third optional service)',
      low: 200,
      high: 1000,
    },
  ],

  // Result copy and CTA
  resultCopy: 'Based on what you described, a project like this typically runs {{low}} to {{high}}. That said, every project is different.',
  disclaimer: 'This is a rough estimate to help you plan, not a quote. Actual cost depends on your specific needs, scope, and timeline. A consultation will give you specifics.',
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
  console.log('  Project sizes: 3 (small, medium, large -- placeholder labels)');
  console.log('  Scope options: 3 (light, standard, comprehensive -- placeholder labels)');
  console.log('  Add-ons: 3 (Add-on A, B, C -- placeholder labels)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Replace project size labels and base cost ranges in the Studio (Rooms tab).');
  console.log('  2. Replace scope option labels and uplift amounts (Scope options tab).');
  console.log('  3. Replace add-on labels and cost ranges (Add-ons tab).');
  console.log('  4. Optionally add a hero image and script-accent word (Intro tab).');
  console.log('  5. Update result copy and disclaimer to match the client voice (Result copy + CTA tab).');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

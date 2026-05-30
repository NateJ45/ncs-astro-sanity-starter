// One-off: patch live Sanity content with the approved copy refresh.
//
// Touches only specific fields on known documents — does NOT use --replace or
// re-import, so any fields not listed below stay exactly as Staci has them.
//
// Patches applied:
//   servicesPage              — hero + services-list copy (the "we publish our prices" line)
//   service.fullRoomDesign    — tightened shortDescription
//   service.fullRoomDesign-
//     PlusStyling             — tightened shortDescription + bestFor, added longDescription
//   service.shoppingAndSourcing — tightened shortDescription, ctaLabel → "Start a project"
//   service.builderRealtor-
//     Partnerships            — clean shortDescription (drops the "[NEW per audit]" marker)
//
// Run: node scripts/patch-services-content.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

// Helper: build a single-paragraph Portable Text block from a string.
function block(text) {
  return {
    _key: randomUUID().replace(/-/g, '').slice(0, 12),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _key: randomUUID().replace(/-/g, '').slice(0, 12),
        _type: 'span',
        text,
        marks: [],
      },
    ],
  };
}

const patches = [
  {
    label: 'servicesPage singleton — hero + list copy',
    id: 'servicesPage',
    set: {
      heroEyebrow: 'Services & Pricing',
      heroHeadline: 'From a $150 consultation to a full room reveal',
      heroSubhead: 'Everything I do is priced openly. Pick the tier that fits where you are.',
      servicesListEyebrow: 'What Things Cost',
      servicesListHeadline: 'Four ways to work together',
      servicesListSubhead:
        "Most interior designers don't publish their prices. I do. So you know what to expect before you ever pick up the phone.",
    },
  },
  {
    label: 'Full room design — shortDescription',
    id: 'service.fullRoomDesign',
    set: {
      shortDescription:
        'A complete plan for one room — layout, furniture, decor, paint direction, and a sourcing list with direct shopping links. You shop at your own pace.',
    },
  },
  {
    label: 'Full room design + styling — shortDescription + bestFor + longDescription',
    id: 'service.fullRoomDesignPlusStyling',
    set: {
      shortDescription:
        'Everything in Full Room Design, plus me on the ground — shopping with you, picking paint, hanging the art, styling the shelves.',
      bestFor: "When you'd rather hand the project off than manage it.",
      longDescription: [
        block(
          "The version where I do the parts that take real time. The plan is the same as Full Room Design — concept, layout, furniture and decor selections, paint — but I'm there for the rest of it too. I shop with you (or for you), pick the paint colors on the wall in your actual light, and come back to install: hanging art, styling shelves, laying rugs, fluffing the couch until it looks like a magazine and feels like your house. The day I leave is the day you stop having a project and start having a finished room.",
        ),
      ],
    },
  },
  {
    label: 'Shopping & sourcing — shortDescription + ctaLabel',
    id: 'service.shoppingAndSourcing',
    set: {
      shortDescription:
        'Help finding the right pieces — billed hourly, no minimum, trade-vendor access included.',
      ctaLabel: 'Start a project',
    },
  },
  {
    label: 'Builder & realtor partnerships — clean shortDescription',
    id: 'service.builderRealtorPartnerships',
    set: {
      shortDescription:
        'For builders, realtors, and contractors in the Plainfield and Indianapolis area. Finish selections, staging, move-in styling — whatever the project needs.',
    },
  },
];

console.log(`\n[patch] dataset=${dataset} project=${projectId}\n`);

for (const { label, id, set } of patches) {
  process.stdout.write(`  ${label}\n    [${id}] `);
  try {
    const result = await client.patch(id).set(set).commit({ autoGenerateArrayKeys: true });
    console.log(`OK — _rev now ${result._rev}`);
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
  }
}

console.log('\n[done]');

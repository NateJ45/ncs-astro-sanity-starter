// One-off follow-up fixes after the About + Contact + Start Here work:
//
//  1. Reorder the philosophyPoint cards so they render by displayOrder
//     (Your vision first leads). This reuses the EXISTING orderRank strings
//     (already in the plugin's format) and just permutes which doc gets which
//     rank, so order(orderRank asc) matches displayOrder asc. Studio drag-to-
//     reorder keeps working afterwards.
//
//  2. Correct the live contactPage budget + timeline dropdown labels to drop
//     the em-dashes (those fields are set-if-missing in the main patch script,
//     so they were already populated and need a force update here).
//
// Run: node scripts/apply-followup-fixes.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const formBudgetOptions = [
  'Under $2K (just a consultation or quick advice)',
  '$2K – $10K (a single room or two)',
  '$10K – $30K (multiple rooms or styling)',
  '$30K – $75K (whole-home design)',
  '$75K+ (major project)',
  'Not sure yet, happy to talk it through',
];

const formTimelineOptions = [
  'ASAP, within the next month',
  '1–3 months out',
  '3–6 months out',
  'More than 6 months',
  "Flexible, I'm just exploring",
];

async function reorderPhilosophy() {
  const docs = await client.fetch(
    `*[_type == "philosophyPoint"]{ _id, title, displayOrder, orderRank }`,
  );
  if (docs.length === 0) {
    console.log('No philosophyPoint docs found; skipping reorder.');
    return;
  }

  // Target order: ascending displayOrder (1, 2, 3 ...).
  const byOrder = [...docs].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  // Reuse the existing rank strings when every doc has one (keeps the plugin's
  // exact format); otherwise fall back to uniform ascending keys.
  const haveAllRanks = docs.every((d) => typeof d.orderRank === 'string' && d.orderRank.length > 0);
  const ranks = haveAllRanks
    ? docs.map((d) => d.orderRank).sort()
    : byOrder.map((_, i) => `0|${String(i).padStart(6, '0')}:`);

  const tx = client.transaction();
  byOrder.forEach((d, i) => {
    tx.patch(d._id, (p) => p.set({ orderRank: ranks[i] }));
  });
  await tx.commit();
  console.log('[ok] philosophy order:', byOrder.map((d) => d.title).join(' -> '));
}

async function fixContactLabels() {
  const doc = await client.fetch(`*[_type == "contactPage"][0]{ _id }`);
  if (!doc?._id) {
    console.log('No contactPage doc found; skipping label fix.');
    return;
  }
  await client.patch(doc._id).set({ formBudgetOptions, formTimelineOptions }).commit();
  console.log('[ok] contactPage: budget + timeline labels de-em-dashed');
}

async function run() {
  await reorderPhilosophy();
  await fixContactLabels();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

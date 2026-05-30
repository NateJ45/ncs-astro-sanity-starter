// One-off: backfill the new Sanity-editable hero accent + sticky CTA fields
// with the values that were previously hardcoded in the Astro pages, so
// nothing visibly changes after the schema update. Editors can then change
// them in Studio without touching code.
//
// Patches applied:
//   homePage       — heroRotatingWords: ["Lived-in", "Considered", "Quiet"]
//   servicesPage   — heroScriptAccent: "reveal", stickyCtaLabel: "Ready to talk it through?"
//   faqPage        — heroScriptAccent: "Know"
//   journalPage    — heroScriptAccent: "studio", stickyCtaLabel: "Have a room in mind?"
//   project (all)  — stickyCtaLabel: "Want a room like this?" (where not already set)
//   homePage / aboutPage / processPage / contactPage — heroScriptAccent stays empty
//     (no script accent was previously hardcoded on those pages)
//
// Run: node scripts/patch-hero-accents-and-sticky-cta.mjs

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

async function patchSingleton(type, fields, label) {
  const doc = await client.fetch(`*[_type == $type][0]{ _id }`, { type });
  if (!doc?._id) {
    console.warn(`[skip] ${label}: no ${type} doc found`);
    return;
  }
  // Only set fields that aren't already populated, so this is safe to re-run.
  const setIfMissing = {};
  const existing = await client.getDocument(doc._id);
  for (const [k, v] of Object.entries(fields)) {
    if (existing?.[k] === undefined || existing?.[k] === null || existing?.[k] === '') {
      setIfMissing[k] = v;
    }
  }
  if (Object.keys(setIfMissing).length === 0) {
    console.log(`[skip] ${label}: all fields already set`);
    return;
  }
  await client.patch(doc._id).set(setIfMissing).commit();
  console.log(`[ok]   ${label}: set ${Object.keys(setIfMissing).join(', ')}`);
}

async function patchAllProjects() {
  const projects = await client.fetch(`*[_type == "project"]{ _id, stickyCtaLabel }`);
  let touched = 0;
  for (const p of projects) {
    if (p.stickyCtaLabel === undefined || p.stickyCtaLabel === null || p.stickyCtaLabel === '') {
      await client.patch(p._id).set({ stickyCtaLabel: 'Want a room like this?' }).commit();
      touched += 1;
    }
  }
  console.log(`[ok]   projects: set stickyCtaLabel on ${touched} of ${projects.length}`);
}

async function run() {
  await patchSingleton(
    'homePage',
    { heroRotatingWords: ['Lived-in', 'Considered', 'Quiet'] },
    'homePage',
  );

  await patchSingleton(
    'servicesPage',
    { heroScriptAccent: 'reveal', stickyCtaLabel: 'Ready to talk it through?' },
    'servicesPage',
  );

  await patchSingleton('faqPage', { heroScriptAccent: 'Know' }, 'faqPage');

  await patchSingleton(
    'journalPage',
    { heroScriptAccent: 'studio', stickyCtaLabel: 'Have a room in mind?' },
    'journalPage',
  );

  await patchAllProjects();

  console.log('\nAll done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-off read-only: report which homePage fields are populated in Sanity
// vs empty (so we know which copy edits take effect on the live site vs
// only change the code fallbacks). Does NOT write anything.
//
// Run: node scripts/inspect-homepage-copy.mjs

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

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
  useCdn: false,
  token: env.SANITY_API_READ_TOKEN,
});

const doc = await client.fetch(`*[_type == "homePage"][0]`);

if (!doc) {
  console.log('No homePage doc found.');
  process.exit(0);
}

const fields = [
  'heroEyebrow', 'heroHeadline', 'heroSubhead',
  'meetStaciEyebrow', 'meetStaciHeadline', 'meetStaciContent',
  'featuredWorkEyebrow', 'featuredWorkHeadline', 'featuredWorkSubhead',
  'featuredJournalEyebrow', 'featuredJournalHeadline', 'featuredJournalSubhead',
  'processPreviewEyebrow', 'processPreviewHeadline',
  'testimonialsEyebrow', 'testimonialsHeadline', 'testimonialsAttribution',
  'servicesGridEyebrow', 'servicesGridHeadline', 'servicesGridSubhead', 'servicesGridFootnote',
  'serviceAreaCue',
  'finalCtaEyebrow', 'finalCtaHeadline', 'finalCtaSubhead',
];

console.log(`\n[homePage copy audit] dataset=${env.PUBLIC_SANITY_DATASET ?? 'production'}\n`);
for (const f of fields) {
  const v = doc[f];
  let display;
  if (v == null || v === '') display = '(empty → uses code fallback)';
  else if (Array.isArray(v)) {
    const text = v.map((b) => (b?.children ?? []).map((c) => c?.text ?? '').join('')).join(' ').trim();
    display = text ? `"${text.slice(0, 90)}${text.length > 90 ? '…' : ''}"` : '(empty array)';
  } else display = `"${String(v).slice(0, 90)}${String(v).length > 90 ? '…' : ''}"`;
  console.log(`${f.padEnd(26)} ${display}`);
}
console.log('');

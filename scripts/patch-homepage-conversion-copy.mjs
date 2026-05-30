// Enrich the home page copy for warmth + conversion (2026-05 pass).
//
// Two write modes:
//   set()         — overwrite genuinely-thin existing copy (Services +
//                   Final CTA subheads). These already had Sanity content,
//                   so a code fallback can't reach them; we must patch.
//   setIfMissing() — seed new/empty fields (Process + Testimonials subheads,
//                   Featured Work + Featured Journal copy) without clobbering
//                   anything Staci may have written in Studio already.
//
// Already-strong copy (hero headline/subhead, Meet Staci body) is left
// untouched on purpose.
//
// Idempotent: re-running set() rewrites the same values; setIfMissing() is a
// no-op once a field is populated.
//
// Run: node scripts/patch-homepage-conversion-copy.mjs           (dry run)
//      node scripts/patch-homepage-conversion-copy.mjs --apply   (write)

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

const apply = process.argv.includes('--apply');

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
  useCdn: false,
  token: env.SANITY_API_WRITE_TOKEN,
});

// Overwrite — thin existing copy we're deliberately enriching.
const overwrite = {
  servicesGridSubhead:
    'From a single room that never quite worked to a whole home you are ready to rethink, there is a way to work together that fits where you are, and what you are ready to take on. Here is where most people start.',
  finalCtaSubhead:
    'Every project starts the same way: a relaxed conversation about your space, your budget, and what you are hoping for. No pressure, no obligation, just a friendly first step toward a home you love coming back to.',
};

// Seed — new or empty fields. Won't clobber existing values.
const seed = {
  processPreviewSubhead:
    'No guesswork and no pressure. From our first conversation to the day everything comes together, you will always know exactly where things stand and what happens next.',
  testimonialsSubhead:
    'The part that matters most: how it felt to work together, and how each space holds up to everyday life long after the last pillow is placed.',
  featuredWorkEyebrow: 'Recent Work.',
  featuredWorkHeadline: 'Rooms that feel finished.',
  featuredWorkSubhead:
    'A look at recent projects across Plainfield and the Indianapolis suburbs. Each one starts with a conversation about how the space actually needs to function, then the design follows from there. Open any project to see the brief, the design call, and exactly how the room came together.',
  featuredJournalEyebrow: 'From the Journal.',
  featuredJournalHeadline: 'How I think about design.',
  featuredJournalSubhead:
    'Posts on the design moves that change a room, source roundups behind specific projects, and the occasional honest note about what I would do differently. The thinking that informs every consultation.',
};

const doc = await client.fetch(`*[_type == "homePage"][0]{ _id }`);
if (!doc?._id) {
  console.error('No homePage doc found — nothing to patch.');
  process.exit(1);
}

console.log(`\n[patch-homepage-copy] ${apply ? 'APPLY' : 'DRY RUN'} on ${doc._id}\n`);
console.log('-- overwrite (set) --');
for (const [k, v] of Object.entries(overwrite)) console.log(`  ${k}: "${v.slice(0, 70)}…"`);
console.log('-- seed (setIfMissing) --');
for (const [k, v] of Object.entries(seed)) console.log(`  ${k}: "${String(v).slice(0, 70)}…"`);

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write.\n');
  process.exit(0);
}

await client
  .patch(doc._id)
  .set(overwrite)
  .setIfMissing(seed)
  .commit();

console.log('\nPatched. Remember: the site is prerendered — push/redeploy to see it live.\n');

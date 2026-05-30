// Seed placeholder content into the aboutPage "personal" section so it renders
// as a starting point Staci can edit. Idempotent-ish: only seeds when the
// personal headline has not been customized, so it never clobbers real edits.
//
// Run: node scripts/seed-about-personal.mjs

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

const PERSONAL = {
  personalEyebrow: 'Off the Clock.',
  personalHeadline: 'A little more about me.',
  personalIntro:
    'Design is the job, but it is not the whole story. A few honest things about who you would be working with.',
  currentlyList: [
    { _key: 'cur1', _type: 'currentlyRow', label: 'Reading', value: 'Anything with a good floor plan and a little drama.' },
    { _key: 'cur2', _type: 'currentlyRow', label: 'Listening to', value: 'A rotating mix of 70s soul and home-reno podcasts.' },
    { _key: 'cur3', _type: 'currentlyRow', label: 'Cannot stop sourcing', value: 'Vintage brass lamps. I have a problem.' },
    { _key: 'cur4', _type: 'currentlyRow', label: 'Loving right now', value: 'Warm plaster walls and unlacquered hardware.' },
  ],
  rapidFire: [
    { _key: 'rf1', _type: 'rapidFireRow', prompt: 'Coffee order', answer: 'Oat latte, extra hot.' },
    { _key: 'rf2', _type: 'rapidFireRow', prompt: 'Cannot-live-without piece', answer: 'A good floor lamp in every room.' },
    { _key: 'rf3', _type: 'rapidFireRow', prompt: 'Sunday looks like', answer: 'Coffee, a long walk with the dogs, and rearranging one shelf I said I would leave alone.' },
    { _key: 'rf4', _type: 'rapidFireRow', prompt: 'Most-used tool', answer: 'A measuring tape and a strong opinion.' },
  ],
  localSpots: [
    { _key: 'ls1', _type: 'localSpotRow', name: 'Downtown Plainfield', note: 'Saturday morning errands and a coffee.' },
    { _key: 'ls2', _type: 'localSpotRow', name: 'Mass Ave, Indianapolis', note: 'Best window-shopping for color ideas.' },
    { _key: 'ls3', _type: 'localSpotRow', name: 'Local vintage shops', note: 'Where half my favorite finds come from.' },
  ],
  beyondDesign:
    'Outside the studio I am usually chasing two dogs around the yard, repainting something that did not need repainting, or talking a friend out of beige. I grew up in central Indiana and still think the best design ideas come from real houses, not showrooms.',
};

async function run() {
  const doc = await client.fetch(`*[_type == "aboutPage"][0]{ _id, personalHeadline }`);
  if (!doc?._id) {
    console.error('No aboutPage document found');
    process.exit(1);
  }
  // Skip if Staci has changed the headline away from the placeholder, so we
  // never clobber real edits.
  if (doc.personalHeadline && doc.personalHeadline !== 'A little more about me.') {
    console.log('Personal section already customized. No changes made.');
    return;
  }
  await client.patch(doc._id).set(PERSONAL).commit();
  console.log('[ok] aboutPage: seeded personal section placeholders');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

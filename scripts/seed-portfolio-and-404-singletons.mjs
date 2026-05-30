// One-off: create + populate the portfolioPage and notFoundPage singletons
// with the values that were previously hardcoded in the Astro page files.
// Safe to re-run — uses createOrReplace for the seed doc and `setIfMissing`
// only on first creation.
//
// Run: node scripts/seed-portfolio-and-404-singletons.mjs

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

// Singleton convention from structure.ts: _id === _type so there's only ever one.
async function ensureSingleton(typeName, seedFields) {
  const docId = typeName;
  const existing = await client.getDocument(docId).catch(() => null);
  if (existing) {
    // Only fill missing fields so editor changes are preserved.
    const setIfMissing = {};
    for (const [k, v] of Object.entries(seedFields)) {
      if (existing[k] === undefined || existing[k] === null || existing[k] === '') {
        setIfMissing[k] = v;
      }
    }
    if (Object.keys(setIfMissing).length === 0) {
      console.log(`[skip] ${typeName}: already populated`);
      return;
    }
    await client.patch(docId).set(setIfMissing).commit();
    console.log(`[ok]   ${typeName}: filled ${Object.keys(setIfMissing).join(', ')}`);
    return;
  }
  await client.createOrReplace({ _id: docId, _type: typeName, ...seedFields });
  console.log(`[ok]   ${typeName}: created with all fields`);
}

async function run() {
  await ensureSingleton('portfolioPage', {
    seoTitle: 'Portfolio · Reid Design',
    seoDescription:
      'A look at recent Reid Design projects across Plainfield and the Indianapolis area.',
    heroEyebrow: 'Recent work',
    heroHeadline: 'Projects across Plainfield and Indianapolis.',
    heroSubhead:
      'A look at how rooms come together. Each project starts with a conversation about how the space needs to function, then works back from there.',
    heroImage: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-95cf8e9cffed47a11f9f74386dc1659d3b45ffba-4736x4280-jpg',
      },
      alt: 'Reid Design kitchen with island and woven counter stools.',
    },
    heroScriptAccent: 'Plainfield',
  });

  await ensureSingleton('notFoundPage', {
    seoTitle: 'Page not found',
    seoDescription:
      'That page wandered off. Head back to the homepage or get in touch.',
    eyebrow: '404',
    headline: 'That page wandered off.',
    body:
      "It happens. Maybe a link is old, maybe the URL has a typo. Either way, here's where to head next.",
    heroImage: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-ce9be41407b946b7453724575c3cfd7aec2f7c4c-3024x4032-jpg',
      },
      alt: 'Reid Design studio dogs resting on a sofa.',
      caption: 'From the studio',
    },
    primaryCtaLabel: 'Back home',
    primaryCtaHref: '/',
    secondaryCtaLabel: 'Browse the portfolio',
    secondaryCtaHref: '/portfolio',
    tertiaryCtaLabel: 'Get in touch',
    tertiaryCtaHref: '/contact',
  });

  console.log('\nAll done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

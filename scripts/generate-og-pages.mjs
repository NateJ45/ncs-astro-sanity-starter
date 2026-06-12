// Foundation, edit with care
// Generates one OG PNG per page at public/og/<route-slug>.png, matching the
// per-route convention in BaseLayout (the pathname with slashes turned into
// dashes; falls back to og-default.png when a route has no matching file).
//
// Covers the core route singletons. When your project adds dynamic collections
// (blog posts, case studies, etc.) extend COLLECTIONS below with the matching
// Sanity _type, prefix, and field names.
//
// Run via `npm run og:pages` after editing seoTitle in Sanity or after adding a
// page. Output PNGs are committed to git so Cloudflare does not need Sanity
// access at build time. BaseLayout picks the right PNG per pathname; anything
// without a file gracefully falls back to og-default.png.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { renderOg } from './lib/render-og.mjs';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
// This dataset filters anonymous reads down to the page singletons only; a read
// token is needed to see the collections (projects, journal entries, guides),
// exactly as src/lib/sanity.ts does at build time. Falls back to the write
// token, which can also read. Without any token, only the singletons render.
const readToken = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('PUBLIC_SANITY_PROJECT_ID not set. Skipping page OG generation.');
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Token reads disable the CDN (Sanity rejects token + useCdn:true).
  useCdn: !readToken,
  perspective: 'published',
  ...(readToken ? { token: readToken } : {}),
});

const outDir = resolve(root, 'public/og');

// Business name for the OG wordmark. Reads SITE_NAME from env first so CI can
// override without touching source; falls back to the value in src/data/site.ts
// (hard-coded here to avoid a TypeScript import from a plain .mjs script).
// Update this default when you replace the starter identity in src/data/site.ts.
const WORDMARK = env.SITE_NAME ?? 'Studio Starter';

let count = 0;
async function render(slug, tagline) {
  await renderOg({ wordmark: WORDMARK, tagline, outPath: resolve(outDir, `${slug}.png`) });
  count += 1;
  const t = String(tagline);
  console.log(`  ${slug}.png — ${t.slice(0, 60)}${t.length > 60 ? '…' : ''}`);
}

// ---- Page singletons → /og/<slug>.png -----------------------------------
// `slug` matches the route (slashes already dash-free here). `defaultTitle` is
// the fallback when Sanity's seoTitle / heroHeadline are both empty.
// These are the core routes every starter project ships with. Add rows for any
// additional page singletons you define in your Sanity schema.
const SINGLETONS = [
  { type: 'homePage',     slug: 'home',     defaultTitle: 'Welcome' },
  { type: 'aboutPage',    slug: 'about',    defaultTitle: 'About us' },
  { type: 'servicesPage', slug: 'services', defaultTitle: 'Services' },
  { type: 'faqPage',      slug: 'faq',      defaultTitle: 'Frequently asked questions' },
  { type: 'contactPage',  slug: 'contact',  defaultTitle: 'Get in touch' },
  { type: 'journalPage',  slug: 'journal',  defaultTitle: 'Journal' },
  { type: 'privacyPage',  slug: 'privacy',  defaultTitle: 'Privacy policy' },
];

for (const page of SINGLETONS) {
  const doc = await client
    .fetch(`*[_type == $type][0]{ seoTitle, heroHeadline }`, { type: page.type })
    .catch(() => null);
  const tagline = doc?.seoTitle || doc?.heroHeadline || page.defaultTitle;
  await render(page.slug, tagline);
}

// ---- Dynamic collections → /og/<prefix>-<slug>.png ----------------------
// Mirrors BaseLayout: /journal/my-post → journal-my-post.png, etc.
// Each module that defines a dynamic collection should add its own entry here.
// Field names are verified against studio/schemaTypes/<type>.ts before enabling.
// journalEntry: slug (slug type, value at slug.current), seoTitle and title (both string).

const COLLECTIONS = [
  {
    prefix: 'journal',
    query: `*[_type=="journalEntry" && defined(slug.current)]{ "slug": slug.current, seoTitle, title }`,
    pick: (d) => d.seoTitle || d.title,
  },
];

for (const col of COLLECTIONS) {
  const docs = await client.fetch(col.query).catch(() => []);
  for (const d of docs) {
    const tagline = col.pick(d);
    if (!d.slug || !tagline) continue;
    await render(`${col.prefix}-${d.slug}`, tagline);
  }
}

console.log(`\nDone. ${count} OG images written to ${outDir}`);

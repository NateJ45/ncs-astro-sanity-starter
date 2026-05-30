// Foundation, edit with care
// Generates one OG PNG per page at public/og/<route-slug>.png, matching the
// per-route convention in BaseLayout (the pathname with slashes turned into
// dashes; falls back to og-default.png when a route has no matching file).
//
// Covers every page singleton PLUS the dynamic collections (projects, journal
// entries, guides), so /portfolio/<slug>, /journal/<slug>, and /guides/<slug>
// each get their own branded card instead of the generic default.
//
// Run via `npm run og:pages` after editing seoTitle in Sanity or after adding a
// project / post / guide. Output PNGs are committed to git so Cloudflare does
// not need Sanity access at build time. BaseLayout picks the right PNG per
// pathname; anything without a file gracefully falls back to og-default.png.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { renderOg } from './lib/render-og.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---- Read env (.env or process.env) -------------------------------------

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* .env optional */ }
  return env;
}

const env = loadEnv();
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
const WORDMARK = 'Reid Design LLC';

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
const SINGLETONS = [
  { type: 'homePage',         slug: 'home',              defaultTitle: 'Plainfield interior design for homes that feel genuinely yours.' },
  { type: 'aboutPage',        slug: 'about',             defaultTitle: 'About Reid Design LLC and Staci Perkins' },
  { type: 'processPage',      slug: 'process',           defaultTitle: 'How Reid Design works, from first call to final reveal' },
  { type: 'servicesPage',     slug: 'services',          defaultTitle: 'Interior design services in Plainfield and Indianapolis' },
  { type: 'faqPage',          slug: 'faq',               defaultTitle: 'Common questions about working with Reid Design' },
  { type: 'contactPage',      slug: 'contact',           defaultTitle: 'Start a conversation with Reid Design' },
  { type: 'portfolioPage',    slug: 'portfolio',         defaultTitle: 'Recent interior design projects across Indianapolis' },
  { type: 'journalPage',      slug: 'journal',           defaultTitle: 'The Reid Design journal' },
  { type: 'eDesignPage',      slug: 'e-design',          defaultTitle: 'Online interior design, delivered digitally' },
  { type: 'shopPage',         slug: 'shop',              defaultTitle: 'Shop the pieces and sources Staci loves' },
  { type: 'giftPage',         slug: 'gift-certificates', defaultTitle: 'Give the gift of interior design' },
  { type: 'resourcesPage',    slug: 'resources',         defaultTitle: 'Design resources and recommendations' },
  { type: 'pressPage',        slug: 'press',             defaultTitle: 'Reid Design in the press' },
  { type: 'privacyPage',      slug: 'privacy',           defaultTitle: 'Privacy policy' },
  { type: 'styleQuiz',        slug: 'quiz',              defaultTitle: 'Find your interior design style' },
  { type: 'budgetCalculator', slug: 'calculator',        defaultTitle: 'Estimate your room furnishing budget' },
];

for (const page of SINGLETONS) {
  const doc = await client
    .fetch(`*[_type == $type][0]{ seoTitle, heroHeadline }`, { type: page.type })
    .catch(() => null);
  const tagline = doc?.seoTitle || doc?.heroHeadline || page.defaultTitle;
  await render(page.slug, tagline);
}

// ---- Dynamic collections → /og/<prefix>-<slug>.png ----------------------
// Mirrors BaseLayout: /portfolio/foo → portfolio-foo.png, etc.
const COLLECTIONS = [
  {
    prefix: 'portfolio',
    query: `*[_type=="project" && defined(slug.current)]{ "slug": slug.current, metaTitle, title }`,
    pick: (d) => d.metaTitle || d.title,
  },
  {
    prefix: 'journal',
    query: `*[_type=="journalEntry" && defined(slug.current)]{ "slug": slug.current, seoTitle, title }`,
    pick: (d) => d.seoTitle || d.title,
  },
  {
    prefix: 'guides',
    query: `*[_type=="leadMagnet" && defined(slug.current)]{ "slug": slug.current, title }`,
    pick: (d) => d.title,
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

// ---- Static (non-singleton) routes --------------------------------------
await render('portfolio-before-after', 'Before and after transformations');

console.log(`\nDone. ${count} OG images written to ${outDir}`);

// Generates public/llms-full.txt — the expanded companion to llms.txt. It
// inlines the substantive site content (services and prices, the process,
// FAQs, service area and contact, plus the current portfolio, journal, and
// guides) pulled live from Sanity, so a language model can answer questions
// about this business from a single document.
//
// Run via `npm run llms:full`. Needs SANITY_API_READ_TOKEN (or the write token)
// because this dataset filters anonymous reads down to the page singletons.
// Output is committed so Cloudflare serves it without Sanity access at runtime.

import { createClient } from '@sanity/client';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const readToken = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('PUBLIC_SANITY_PROJECT_ID not set. Cannot generate llms-full.txt.');
  process.exit(1);
}
if (!readToken) {
  console.warn('[warn] No SANITY_API_READ_TOKEN / WRITE token set; collection content (services, FAQ, projects, etc.) will be empty.');
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: !readToken,
  perspective: 'published',
  ...(readToken ? { token: readToken } : {}),
});

/** Flatten Portable Text blocks into plain text (paragraphs separated by blank lines). */
function ptToPlainText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b._type === 'block' && Array.isArray(b.children))
    .map((b) => b.children.map((c) => c?.text ?? '').join(''))
    .join('\n\n')
    .trim();
}

// Site URL for generating absolute links in the output document.
// Reads from env (PUBLIC_SITE_URL or SITE_URL) so CI/CD can override without
// touching source. Matches the `url` field in src/data/site.ts at rest.
const SITE = env.PUBLIC_SITE_URL ?? env.SITE_URL ?? 'https://example.com';

const [settings, services, steps, faqs, projects, journal, guides] = await Promise.all([
  client.fetch(`*[_type=="siteSettings"][0]{ email, phone, serviceAreas, availabilityStatus }`).catch(() => null),
  client.fetch(`*[_type=="service"]|order(orderRank){ name, price, shortDescription, features, bestFor }`).catch(() => []),
  client.fetch(`*[_type=="processStep"]|order(stepNumber asc){ stepNumber, title, timeEstimate, shortDescription }`).catch(() => []),
  client.fetch(`*[_type=="faqItem"]{ question, answer }`).catch(() => []),
  client.fetch(`*[_type=="project" && defined(slug.current)]|order(coalesce(year, 0) desc){ title, location, year, briefSummary, "slug": slug.current }`).catch(() => []),
  client.fetch(`*[_type=="journalEntry" && defined(slug.current)]|order(publishedAt desc){ title, excerpt, "slug": slug.current }`).catch(() => []),
  client.fetch(`*[_type=="leadMagnet" && published==true && defined(slug.current)]|order(orderRank){ title, summary, "slug": slug.current }`).catch(() => []),
]);

const lines = [];
const p = (s = '') => lines.push(s);

// Site name for the document heading. Reads SITE_NAME from env so CI can
// override without touching source; mirrors `name` in src/data/site.ts.
const siteName = env.SITE_NAME ?? 'Studio Starter';

p(`# ${siteName} — Full Site Content`);
p('');
p(`> This is the expanded companion to /llms.txt for ${siteName}. It inlines the substantive content of the site pulled from Sanity so a language model can answer questions about this business from a single document. For the short link map, see /llms.txt.`);
p('');

if (Array.isArray(services) && services.length) {
  p('## Services and pricing');
  p('');
  for (const s of services) {
    if (!s?.name) continue;
    p(`### ${s.name}${s.price ? ` — ${s.price}` : ''}`);
    if (s.shortDescription) p(s.shortDescription);
    if (s.bestFor) p(`Best for: ${s.bestFor}`);
    if (Array.isArray(s.features) && s.features.length) {
      p('');
      for (const f of s.features) p(`- ${f}`);
    }
    p('');
  }
}

if (Array.isArray(steps) && steps.length) {
  p('## How a project works');
  p('');
  for (const st of steps) {
    if (!st?.title) continue;
    p(`### Step ${st.stepNumber ?? ''}: ${st.title}${st.timeEstimate ? ` (${st.timeEstimate})` : ''}`.replace('Step : ', 'Step: '));
    if (st.shortDescription) p(st.shortDescription);
    p('');
  }
}

if (Array.isArray(faqs) && faqs.length) {
  p('## Frequently asked questions');
  p('');
  for (const f of faqs) {
    if (!f?.question) continue;
    p(`### ${f.question}`);
    const a = ptToPlainText(f.answer);
    if (a) p(a);
    p('');
  }
}

if (settings) {
  p('## Service area and contact');
  p('');
  if (Array.isArray(settings.serviceAreas) && settings.serviceAreas.length) p(`- Serving: ${settings.serviceAreas.join(', ')}`);
  if (settings.email) p(`- Email: ${settings.email}`);
  if (settings.phone) p(`- Phone: ${settings.phone}`);
  if (settings.availabilityStatus) p(`- Availability: ${settings.availabilityStatus}`);
  p('');
}

if (Array.isArray(projects) && projects.length) {
  p('## Portfolio projects');
  p('');
  for (const pr of projects) {
    if (!pr?.title) continue;
    const meta = [pr.location, pr.year].filter(Boolean).join(', ');
    p(`- [${pr.title}](${SITE}/portfolio/${pr.slug}/)${meta ? ` (${meta})` : ''}${pr.briefSummary ? `: ${pr.briefSummary}` : ''}`);
  }
  p('');
}

if (Array.isArray(journal) && journal.length) {
  p('## Journal');
  p('');
  for (const j of journal) {
    if (!j?.title) continue;
    p(`- [${j.title}](${SITE}/journal/${j.slug}/)${j.excerpt ? `: ${j.excerpt}` : ''}`);
  }
  p('');
}

if (Array.isArray(guides) && guides.length) {
  p('## Free guides');
  p('');
  for (const g of guides) {
    if (!g?.title) continue;
    p(`- [${g.title}](${SITE}/guides/${g.slug}/)${g.summary ? `: ${g.summary}` : ''}`);
  }
  p('');
}

const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
writeFileSync(resolve(root, 'public/llms-full.txt'), out, 'utf-8');
console.log(
  `[ok] wrote public/llms-full.txt — ${out.length} bytes (` +
    `${services?.length ?? 0} services, ${steps?.length ?? 0} steps, ${faqs?.length ?? 0} faqs, ` +
    `${projects?.length ?? 0} projects, ${journal?.length ?? 0} posts, ${guides?.length ?? 0} guides)`,
);

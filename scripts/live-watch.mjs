#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// live-watch.mjs - is the LIVE site healthy? (PORTS.md card 138)
// =============================================================================
// CI builds from a pinned content snapshot (scripts/snapshot.mjs), so it can no
// longer notice when the live site breaks because of what the client published.
// This is the other half: a scheduled, NON-BLOCKING check of the real site.
//
//   node scripts/live-watch.mjs https://www.example.com
//
// It reads /sitemap-index.xml (or /sitemap.xml), fetches every page, and reports
// any that are not 200, or that have no <title> or <h1>. It also follows each
// page's same-site links one hop and reports links that are 404. Exit 1 when
// anything is wrong, so a SCHEDULED workflow run goes red and GitHub mails the
// owner. It never runs on a pull request and blocks no merge or deploy. A
// finding means "the content moved, look": fix the redirect, restore the page or
// refresh the snapshot, but never revert the client's edit.
// Uses only built-in fetch (no install step), like check-live-links.mjs.
// =============================================================================

const origin = (process.argv[2] ?? process.env.SITE_URL ?? '').replace(/\/+$/, '');
if (!origin) {
  console.log('live-watch: no site URL given (argument or SITE_URL); nothing to check.');
  process.exit(0);
}

const get = async (url) => {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'ncs-live-watch' },
    });
    return { status: res.status, text: res.status === 200 ? await res.text() : '', final: res.url };
  } catch (err) {
    return { status: 0, text: '', final: url, error: String(err) };
  }
};

/** Same-site <loc> entries of a sitemap, following one level of sitemap index. */
async function sitemapUrls(url, depth = 0) {
  const { status, text } = await get(url);
  if (status !== 200) return null;
  const locs = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (!/<sitemapindex/i.test(text) || depth > 1) return locs;
  const nested = await Promise.all(locs.map((l) => sitemapUrls(l, depth + 1)));
  return nested.flat().filter(Boolean);
}

const map =
  (await sitemapUrls(`${origin}/sitemap-index.xml`)) ??
  (await sitemapUrls(`${origin}/sitemap.xml`));
if (!map || map.length === 0) {
  console.error(`live-watch: no sitemap found at ${origin}`);
  process.exit(1);
}
// A sitemap may name the canonical host; always test the host we were given.
const pages = [...new Set(map.map((u) => new URL(u).pathname))];
console.log(`live-watch: ${pages.length} pages from the sitemap at ${origin}`);

const problems = [];
const links = new Map(); // path -> first page that links to it
const pool = async (items, n, fn) => {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
};

await pool(pages, 8, async (path) => {
  const r = await get(origin + path);
  if (r.status !== 200) return problems.push(`${r.status || 'ERR'}  ${path}  (in the sitemap)`);
  if (!/<title>[^<]+<\/title>/i.test(r.text)) problems.push(`no <title>  ${path}`);
  if (!/<h1[\s>]/i.test(r.text)) problems.push(`no <h1>  ${path}`);
  for (const m of r.text.matchAll(/<a\s[^>]*href="([^"#?]+)[^"]*"/gi)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//') || /\.[a-z0-9]{2,5}$/i.test(href)) continue;
    if (!links.has(href)) links.set(href, path);
  }
});

const toCheck = [...links.keys()].filter(
  (p) => !pages.includes(p) && !pages.includes(p.replace(/\/$/, '')),
);
await pool(toCheck, 8, async (path) => {
  const r = await get(origin + path);
  if (r.status !== 200)
    problems.push(`${r.status || 'ERR'}  ${path}  (linked from ${links.get(path)})`);
});

if (problems.length) {
  console.error(`live-watch: ${problems.length} problem(s) on ${origin}`);
  for (const p of problems.sort()) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`live-watch: ${pages.length} pages and ${toCheck.length} further links all fine.`);

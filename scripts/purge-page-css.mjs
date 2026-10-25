// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// purge-page-css.mjs - drop the CSS a built page can never use (PORTS.md card 159)
// =============================================================================
// Runs straight after `astro build` (package.json "build"). Stylesheets that Astro inlines into a
// page (build.inlineStylesheets: 'always' on a site that chose it, or 'auto' for the small ones) carry
// the CSS of every component the page's module graph can reach: SectionRenderer imports every
// section, so every page carries every block's styles, and about half of it never matches. This
// removes, page by page, each style rule whose selector names a class that page cannot show.
//
// "Cannot show" is decided conservatively. A class counts as present when its name appears
// ANYWHERE in the page's HTML (outside its <style> blocks: attributes, island props, inline
// scripts) or in any of the page's own scripts under /_astro/ (followed through their imports),
// because islands and the flow layer add classes at runtime from string literals. Only a rule
// whose every selector needs a class found in none of those goes. Never removed: rules without a
// class (elements, attributes, ids, :root), @font-face, @keyframes, @property and other at-rules,
// and anything inside :not(). :is(), :where() and :has() keep a rule when any branch can match.
//
// Safe with the page router: <ClientRouter /> swaps each page's own <style> blocks in on arrival
// and nothing on this site persists across pages (no transition:persist). If a script ever BUILDS
// a class name from pieces (`'cb-' + kind`), its full name will not appear anywhere, and its rule
// would be dropped: list a prefix in KEEP below. The measured
// before and after is in PORTS.md card 159.
//
// Skips the Studio (dist/client/studio). Writes nothing when nothing changes. Exit 1 on a parse
// it cannot follow, so a strange stylesheet fails the build rather than shipping broken.
import fs from 'node:fs';
import path from 'node:path';
import { purgeCss } from './lib/css-purge.mjs';

const ROOT = process.argv[2] ?? 'dist/client';
// Class-name prefixes always kept (for classes a script assembles at runtime). None today.
const KEEP = [];

// ---------- the build step ----------

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function scriptsOf(html, astroDir) {
  const seen = new Set();
  const queue = [...html.matchAll(/\/_astro\/([\w.-]+\.js)/g)].map((m) => m[1]);
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    const file = path.join(astroDir, f);
    if (!fs.existsSync(file)) continue;
    seen.add(f);
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/["'`]\.\/([\w.-]+\.js)/g)) queue.push(m[1]);
  }
  return [...seen].map((f) => fs.readFileSync(path.join(astroDir, f), 'utf8')).join('\n');
}

function run() {
  const astroDir = path.join(ROOT, '_astro');
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return p === path.join(ROOT, 'studio') ? [] : walk(p);
      return e.name.endsWith('.html') ? [p] : [];
    });
  let before = 0;
  let after = 0;
  let pages = 0;
  const jsCache = new Map();
  for (const file of walk(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('<style')) continue;
    const scripts = [...html.matchAll(/\/_astro\/([\w.-]+\.js)/g)]
      .map((m) => m[1])
      .sort()
      .join();
    if (!jsCache.has(scripts)) jsCache.set(scripts, scriptsOf(html, astroDir));
    const corpus =
      decode(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, ' ')) + '\n' + jsCache.get(scripts);
    const known = new Map();
    const has = (cls) => {
      if (KEEP.some((p) => cls.startsWith(p))) return true;
      if (!known.has(cls)) known.set(cls, corpus.includes(cls));
      return known.get(cls);
    };
    let changed = false;
    const next = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (all, open, css, close) => {
      let purged;
      try {
        purged = purgeCss(css, has);
      } catch (err) {
        console.error(`[purge-css] ${path.relative(ROOT, file)}: ${err.message}`);
        process.exit(1);
      }
      before += css.length;
      after += purged.length;
      if (purged === css) return all;
      changed = true;
      return open + purged + close;
    });
    if (changed) fs.writeFileSync(file, next);
    pages++;
  }
  console.log(
    `[purge-css] ${pages} pages: inline CSS ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB ` +
      `(${before ? Math.round((100 * (before - after)) / before) : 0}% removed)`,
  );
}

if (
  import.meta.url === `file:///${path.resolve(process.argv[1]).replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('purge-page-css.mjs')
) {
  run();
}

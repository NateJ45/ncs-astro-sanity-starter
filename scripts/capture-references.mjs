#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// capture-references.mjs - screenshot reference sites for a design brief
// =============================================================================
// Step 2 of the flow: brief -> REFERENCES -> design-directions -> reskin.
//
// Usage:
//   npm run references -- https://example.com https://other.example/page
//   npm run references                      (reads docs/references/references.json)
//   npm run references -- --out docs/references --no-readme <urls...>
//
// references.json is either an array of URL strings or an array of
// { "url": "...", "like": "...", "avoid": "..." } objects.
//
// For every URL it writes, at 390px and 1280px wide (full page),
//   docs/references/<slug>/390.png and docs/references/<slug>/1280.png
// and (re)writes docs/references/README.md with a table: URL, date, "what we
// like", "what we avoid". Existing like/avoid cells are KEPT when you re-run,
// matched by URL, so the human notes are never overwritten.
//
// Network: the only requests are the ones the given pages make themselves. No
// analytics, no third-party service, nothing is uploaded anywhere.
// Needs Playwright browsers once:  npx playwright install chromium
// Dependency-free apart from @playwright/test, which the starter already has.
// =============================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

/** Parse argv into { urls, out, readme }. */
export function parseArgs(argv) {
  const urls = [];
  let out = 'docs/references';
  let readme = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--no-readme') readme = false;
    else if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    else urls.push(a);
  }
  return { urls, out, readme };
}

/** Folder-safe slug from a URL: host plus path, lowercase, dashes. */
export function slugFor(url) {
  const u = new URL(url);
  const raw = `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}`;
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'reference'
  );
}

/** Only http(s) is ever fetched. */
export function assertHttp(url) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`Only http(s) URLs are captured: ${url}`);
  }
  return u.href;
}

function loadJsonList(file) {
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${file} must be a JSON array`);
  return data.map((e) => (typeof e === 'string' ? { url: e } : e));
}

/** Read existing README rows so hand-written like/avoid cells survive a re-run. */
function readExistingNotes(readmePath) {
  const notes = new Map();
  if (!existsSync(readmePath)) return notes;
  for (const line of readFileSync(readmePath, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('| http')) continue;
    // | url | date | like | avoid | shots |
    const cells = line.split('|').map((c) => c.trim());
    notes.set(cells[1], { like: cells[3] ?? '', avoid: cells[4] ?? '' });
  }
  return notes;
}

async function capture(browser, url, dir) {
  mkdirSync(dir, { recursive: true });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      // Trigger lazy images and scroll-reveal content, then return to the top.
      await page.evaluate(async () => {
        const step = Math.max(300, window.innerHeight / 2);
        for (let y = 0; y < document.body.scrollHeight && y < 20000; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
        document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(dir, `${vp.width}.png`), fullPage: true });
    } finally {
      await ctx.close();
    }
  }
}

async function main() {
  const { urls, out, readme } = parseArgs(process.argv.slice(2));
  const outDir = resolve(process.cwd(), out);
  const jsonFile = join(outDir, 'references.json');
  const entries = urls.length ? urls.map((url) => ({ url })) : loadJsonList(jsonFile);
  if (!entries.length) {
    console.error(
      `No URLs. Pass them as arguments, or list them in ${jsonFile}\n` +
        `  npm run references -- https://example.com https://other.example`,
    );
    process.exit(2);
  }
  for (const e of entries) e.url = assertHttp(e.url);

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  let failed = 0;
  try {
    for (const e of entries) {
      const slug = slugFor(e.url);
      try {
        await capture(browser, e.url, join(outDir, slug));
        console.log(`OK    ${e.url} -> ${join(out, slug)}/{390,1280}.png`);
        rows.push({ ...e, slug, date: today });
      } catch (err) {
        failed++;
        console.error(`FAIL  ${e.url}: ${err.message.split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (readme && rows.length) {
    const readmePath = join(outDir, 'README.md');
    const notes = readExistingNotes(readmePath);
    const cell = (s) => (s ?? '').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
    const body = rows
      .map((r) => {
        const prev = notes.get(r.url) ?? {};
        const like = cell(r.like || prev.like);
        const avoid = cell(r.avoid || prev.avoid);
        return `| ${r.url} | ${r.date} | ${like} | ${avoid} | [390](${r.slug}/390.png) [1280](${r.slug}/1280.png) |`;
      })
      .join('\n');
    const text = `# Design references

Captured by \`npm run references\` (scripts/capture-references.mjs). Fill in the two
blank columns by hand: they are kept when the script is re-run. These feed
\`docs/templates/design-brief.md\` (References and Anti-references) and the
\`/design-directions\` command.

| URL | Captured | What we like | What we avoid | Screenshots |
| --- | --- | --- | --- | --- |
${body}
`;
    writeFileSync(readmePath, text);
    console.log(`Wrote ${join(out, 'README.md')}`);
  }
  if (failed) process.exit(1);
}

// Run only when executed directly, so the helpers can be imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

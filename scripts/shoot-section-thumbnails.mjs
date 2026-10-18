// Safe to edit by hand
// =============================================================================
// shoot-section-thumbnails.mjs - pictures for the "+ Add item" grid view
// =============================================================================
// The authoring kit (PORTS.md card 109). The page builder's insert menu opens
// on a grid of pictures, one per block type, so an editor picks "the one that
// looks like that" instead of decoding names like "Image text". The pictures
// are shot here from /styleguide/sections/ (src/pages/styleguide/sections.astro,
// every block with fixed data, drawn by the real SectionRenderer in this site's
// brand) into public/section-thumbnails/<type>.jpg, which the Studio loads from
// the site's own origin (sectionThumbnailUrl in src/sanity/schemaTypes/sections.ts).
//
// Run it after a reskin, or after adding a block (src/lib/authoring.test.ts
// fails until the new block has a picture):
//
//   npm run build
//   npm run thumbnails
//
// It serves the BUILT site (dist/client) itself on a free port, uncompressed,
// so build first. `--url http://localhost:4321` points it at a server you are
// already running instead. Light theme only: the Studio picker is a chooser,
// not a design review. Each picture is 600 by 400 (the grid's 3:2 tile), the
// top of the block at a 1200px desktop width, scaled by half.
//
// Images in the fixtures are fake Sanity references; every request to the
// Sanity CDN is answered with tests/visual/fixtures/layout-hero.jpg, so the
// shots need no network and no Sanity project.
// =============================================================================

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'section-thumbnails');
const FIXTURE = join(ROOT, 'tests', 'visual', 'fixtures', 'layout-hero.jpg');
const WIDTH = 1200;
const HEIGHT = 800;

/** What a video or embed frame shows in a thumbnail: a dark panel, a play mark. */
const STAND_IN =
  '<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#3a3f47">' +
  '<svg width="96" height="96" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#e8e8e8"/></svg>' +
  '</body></html>';

const argUrl = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : null;

async function waitFor(url, ms = 30_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Nothing answered at ${url} within ${ms / 1000}s`);
}

/** A tiny uncompressed static server for dist/client, closed when the run ends. */
function serveDist(dir) {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };
  return createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = resolve(dir, `.${path}`);
    if (!file.startsWith(dir)) return res.writeHead(403).end();
    if (path.endsWith('/')) file = join(file, 'index.html');
    try {
      const body = await readFile(file);
      // Access-Control-Allow-Origin: the Custom code block's sandboxed frame loads
      // the site fonts from an opaque origin, as public/_headers allows (card 121).
      res.writeHead(200, {
        'content-type': types[extname(file)] ?? 'application/octet-stream',
        'access-control-allow-origin': '*',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
}

let server = null;
let base = argUrl;
if (!base) {
  const dist = join(ROOT, 'dist', 'client');
  if (!existsSync(join(dist, 'styleguide', 'sections', 'index.html'))) {
    console.error('No built /styleguide/sections/ page. Run `npm run build` first.');
    process.exit(1);
  }
  server = serveDist(dist);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}

try {
  await waitFor(`${base}/styleguide/sections/`);
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 0.5,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.route('**/cdn.sanity.io/**', (route) =>
    route.fulfill({ path: FIXTURE, contentType: 'image/jpeg' }),
  );
  // Third-party frames (the video player, an embedded map or form) are not the
  // block's design and would need the network. Answer them with a plain
  // stand-in panel so the shot is offline and deterministic but still reads as
  // a frame. Anything else off-site is refused.
  await page.route(
    /youtube(-nocookie)?\.com\/embed|player\.vimeo\.com|embed\.example\.com/,
    (route) => route.fulfill({ contentType: 'text/html', body: STAND_IN }),
  );

  await page.goto(`${base}/styleguide/sections/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Reveal-on-scroll styles start hidden; show everything as if scrolled to.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none!important;transition:none!important}' +
      '[data-reveal],[data-animate],.reveal{opacity:1!important;transform:none!important}',
  });

  // The header, the back-to-top button and anything else pinned to the window
  // would land on top of whichever block is being shot. Hide them, again after
  // every scroll, because some (back-to-top) only appear once the page moves.
  const hidePinned = () =>
    page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const pos = getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'sticky')
          el.style.setProperty('visibility', 'hidden', 'important');
      }
    });

  const types = await page.$$eval('[data-section-type]', (els) =>
    els.map((el) => el.getAttribute('data-section-type')),
  );
  let shot = 0;
  for (const type of types) {
    const box = page.locator(`[data-section-type="${type}"]`);
    await box.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await hidePinned();
    // Page coordinates (not viewport ones): a fullPage clip is measured from
    // the top of the document.
    const rect = await box.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { y: r.top + window.scrollY, height: r.height };
    });
    if (rect.height < 2) {
      console.warn(`  skip ${type}: it rendered nothing`);
      continue;
    }
    const file = join(OUT, `${type}.jpg`);
    await page.screenshot({
      path: file,
      type: 'jpeg',
      quality: 72,
      // The top of the block, no taller than the grid's 3:2 tile. A shorter
      // block makes a shorter picture; the Studio letterboxes it, which is more
      // honest than showing the neighbouring block underneath.
      clip: { x: 0, y: rect.y, width: WIDTH, height: Math.min(HEIGHT, rect.height) },
      fullPage: true,
    });
    if (statSync(file).size === 0) throw new Error(`${file} is empty`);
    shot += 1;
    console.log(`  ${type}.jpg`);
  }
  await browser.close();
  console.log(`\nShot ${shot} of ${types.length} sections into public/section-thumbnails/.`);
} finally {
  if (server) server.close();
}

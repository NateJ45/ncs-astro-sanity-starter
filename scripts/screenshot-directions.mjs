#!/usr/bin/env node
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// screenshot-directions.mjs - screenshot design-direction mockups
// =============================================================================
// Step 3 helper for the /design-directions command.
//
//   npm run directions:shoot -- docs/design-directions/2026-10-03-acme
//
// For every direction-*.html (and index.html) in the folder it writes a
// full-page PNG at 390, 768 and 1280px wide into <folder>/shots/, named
// <file>-<width>.png, and prints each path plus the page's horizontal
// overflow (scrollWidth minus viewport width; anything above 0 is a defect to
// fix in the mockup). Mockups are opened from disk (file://), so nothing
// touches the network except fonts or images the mockup itself links to.
// Needs Playwright browsers once:  npx playwright install chromium
// =============================================================================
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WIDTHS = [390, 768, 1280];

async function main() {
  const dir = resolve(process.cwd(), process.argv[2] ?? '');
  if (!process.argv[2] || !existsSync(dir)) {
    console.error('Usage: npm run directions:shoot -- docs/design-directions/<date>-<slug>');
    process.exit(2);
  }
  const files = readdirSync(dir)
    .filter((f) => /^(direction-[a-z0-9-]+|index)\.html$/.test(f))
    .sort();
  if (!files.length) {
    console.error(`No direction-*.html or index.html in ${dir}`);
    process.exit(2);
  }
  const shots = join(dir, 'shots');
  mkdirSync(shots, { recursive: true });

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  let overflow = 0;
  try {
    for (const f of files) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(pathToFileURL(join(dir, f)).href, { waitUntil: 'load' });
        // Wait for fonts and for every image to decode (naturalWidth, not just load).
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((img) =>
              img.complete && img.naturalWidth > 0
                ? null
                : new Promise((r) => {
                    img.addEventListener('load', r);
                    img.addEventListener('error', r);
                    setTimeout(r, 4000);
                  }),
            ),
          );
        });
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        const out = join(shots, `${f.replace(/\.html$/, '')}-${width}.png`);
        await page.screenshot({ path: out, fullPage: true });
        const flag = over > 0 ? `OVERFLOW (+${over}px)` : 'ok';
        console.log(`${flag.padEnd(10)} ${width}px  ${out}`);
        if (over > 0) overflow++;
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (overflow) {
    console.error(`${overflow} screenshot(s) overflow horizontally. Fix the mockup and re-run.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

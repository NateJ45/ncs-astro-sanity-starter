// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/measure-columns.mjs  (PORTS.md card 90)
//
// Reports, per page, where every section starts its column and where every
// text-plus-picture band puts its seam, measured with getBoundingClientRect in
// headless Chromium. The instrument the "one left edge, one split" claim (CLAUDE.md
// rule 17) is checked with, and the number to quote before and after a layout change.
//
//   node scripts/measure-columns.mjs <baseUrl> [--width 1280] [--paths /,/about/] [--json out.json]
//
// <baseUrl> is any served copy of the site: the live Worker, or `npm run serve:dist`
// after a build. Needs @playwright/test and an installed Chromium. Not a CI gate (it
// needs a served site and a browser). Exit code 1 when any page has a heading or band
// off the column edge, a seam that is not where the others are, or a band that does
// not divide its column in the --split-text : --split-media ratio.
//
// WHAT IT MEASURES (the judgement lives in scripts/lib/column-alignment.mjs, which
// has the unit test; this file only reads the page)
//   - the left edge of the first h1/h2/h3 in each section, and the outer left edge of
//     each split band. The "edge" is the most common value on the page, so a site
//     with a different container or gutter reports against itself, not a constant.
//   - a split band is any `.split` element (the shared grid in globals.css, card 90),
//     any other two-track grid with a picture in one column (reported as `grid`, so a
//     site that has not adopted `.split` can still be measured), or a
//     `section[data-hero="split"]` hero, with two columns side by side. Its seam is
//     the left edge of the right-hand column. Only `.split` bands are held to the
//     --split-text : --split-media ratio. Bands are grouped by which side the
//     narrow (picture) column is on, so a flipped band is compared with its own kind.
//   - below the `lg` breakpoint the bands stack. A stacked band has no seam, so at
//     390px only the edge rule applies; measure the seam at 1024 or wider.
//
// A CENTRED HEADING is listed and exempt. A rotated card has a bounding box a few
// pixels wider than the card the reader sees; the check tolerates 1px and no more, so
// measure such an object by eye, not by this script.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyse } from './lib/column-alignment.mjs';

/* Runs in the page. Plain function, serialised by Playwright, so it may not close
   over anything from this module. */
export function collect() {
  const px = (r) => Math.round(r.left * 10) / 10;
  const visible = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const num = (name) => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v) ? v : null;
  };
  const text = num('--split-text');
  const media = num('--split-media');

  const sections = [];
  const all = [...document.querySelectorAll('section')].filter(
    (s) => !s.closest('header, footer, nav') && !s.parentElement.closest('section') && visible(s),
  );
  for (const [i, s] of all.entries()) {
    const heading = [...s.querySelectorAll('h1, h2, h3')].find(visible);
    const row = {
      label: (
        (heading && heading.textContent) ||
        s.getAttribute('aria-label') ||
        `(no heading) section ${i + 1}`
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 38),
      headingLeft: heading ? px(heading.getBoundingClientRect()) : null,
      headingCentred: heading ? getComputedStyle(heading).textAlign === 'center' : false,
      split: null,
    };

    if (s.matches('[data-hero="split"]')) {
      const pic = [...s.children].find((c) => c.matches('img, .hero-slideshow') && visible(c));
      const words = [...s.children].find((c) => c.matches('div.relative') && visible(c));
      if (pic && words) {
        const p = pic.getBoundingClientRect();
        const w = words.getBoundingClientRect();
        // Stacked when the picture is not beside the words.
        if (p.left > w.left + 1) {
          row.split = {
            kind: 'hero',
            leftLeft: px(w),
            leftWidth: Math.round(w.width * 10) / 10,
            rightLeft: px(p),
            rightWidth: Math.round(p.width * 10) / 10,
            orientation: 'media-right',
          };
        }
      }
    } else {
      // The shared `.split` first. A site that has not adopted it yet (or a band that
      // rolled its own grid) is still found: a two-track grid with a picture in one
      // of its columns. That is what makes the script usable for the BEFORE number.
      let band = s.matches('.split') ? s : s.querySelector('.split');
      let kind = 'band';
      if (!band) {
        kind = 'grid';
        band = [s, ...s.querySelectorAll('div')].slice(0, 60).find((el) => {
          if (getComputedStyle(el).display !== 'grid') return false;
          if (getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length !== 2)
            return false;
          const two = [...el.children].filter(visible).slice(0, 2);
          const pic = 'img, picture, svg, canvas, video, figure';
          return two.length === 2 && two.some((c) => c.matches(pic) || c.querySelector(pic));
        });
      }
      if (band && visible(band)) {
        const cols = [...band.children].filter(visible);
        if (cols.length >= 2) {
          const [a, b] = cols
            .slice(0, 2)
            .map((c) => c.getBoundingClientRect())
            .sort((x, y) => x.left - y.left);
          // Stacked when the second column does not start to the right of the first.
          if (b.left > a.left + 1) {
            row.split = {
              kind,
              leftLeft: px(a),
              leftWidth: Math.round(a.width * 10) / 10,
              rightLeft: px(b),
              rightWidth: Math.round(b.width * 10) / 10,
              // The picture column is the narrow one. Equal columns count as picture-right.
              orientation: a.width < b.width - 1 ? 'media-left' : 'media-right',
            };
          }
        }
      }
    }
    sections.push(row);
  }
  return {
    tokens: text && media ? { text, media } : null,
    sections,
  };
}

function print(results, width) {
  for (const r of results) {
    const stacked = r.sections.filter((s) => s.split).length === 0;
    console.log(`\n${r.path}  at ${width}px   column edge: ${r.edge ?? 'n/a'}`);
    for (const s of r.sections) {
      const sp = s.split;
      const tag = sp
        ? `${sp.kind.padEnd(4)} ${sp.orientation === 'media-right' ? 'pic right' : 'pic left '}  left ${String(Math.round(sp.leftWidth)).padStart(4)}  right ${String(Math.round(sp.rightWidth)).padStart(4)}  seam ${String(Math.round(sp.rightLeft)).padStart(4)}`
        : '';
      const head =
        s.headingLeft == null
          ? '     -'
          : `${String(Math.round(s.headingLeft)).padStart(6)}${s.headingCentred ? 'c' : ' '}`;
      console.log(`  heading@${head}  ${s.label.padEnd(38)} ${tag}`);
    }
    if (stacked && r.sections.length)
      console.log('  (no two-column band at this width: seams not measured)');
    for (const [orient, g] of Object.entries(r.seams)) {
      console.log(
        `  seam, picture ${orient === 'media-right' ? 'right' : 'left '}: ${g.seam}  spread ${g.spread}px  (${g.members.length} band${g.members.length === 1 ? '' : 's'})`,
      );
    }
    for (const o of r.offEdge)
      console.log(
        `  OFF EDGE   ${o.what} "${o.label}" starts at ${o.left}, the page edge is ${o.edge}`,
      );
    for (const o of r.seamOffenders)
      console.log(
        `  OFF SEAM   "${o.label}" seam ${o.seam}, the others are at ${o.expected} (${o.orientation})`,
      );
    for (const o of r.ratioOffenders)
      console.log(`  OFF RATIO  "${o.label}" columns ${o.got}, tokens say ${o.want}`);
    if (r.centred.length) console.log(`  centred headings (exempt): ${r.centred.length}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const base = (args.find((a) => !a.startsWith('--')) ?? '').replace(/\/$/, '');
  const flag = (name, dflt) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : dflt;
  };
  if (!base) {
    console.error(
      'usage: node scripts/measure-columns.mjs <baseUrl> [--width 1280] [--paths /,/about/] [--json out.json]',
    );
    process.exit(2);
  }
  const width = Number(flag('width', 1280));
  const paths = flag('paths', '/').split(',');
  const jsonOut = flag('json', '');

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const results = [];
  for (const p of paths) {
    const page = await context.newPage();
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Walk the page so lazy images and reveal blocks settle before measuring.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const raw = await page.evaluate(collect);
    results.push(analyse({ path: p, width, ...raw }));
    await page.close();
  }
  await browser.close();

  print(results, width);
  const failures = results.reduce((n, r) => n + r.failures, 0);
  console.log(
    `\nTOTAL at ${width}px across ${results.length} page${results.length === 1 ? '' : 's'}: ${failures} misaligned`,
  );
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
  process.exit(failures > 0 ? 1 : 0);
}

// Importable for the test without running; runs when invoked as a script.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/measure-tap-targets.mjs  (PORTS.md card 83)
//
// Counts the links and buttons whose tappable area is under 44px at a phone
// width, and hit-tests the ones that rely on an invisible hit-area ::after
// (PORTS.md card 82) so a grown area that steals taps from a neighbour shows up.
//
//   node scripts/measure-tap-targets.mjs <baseUrl> [--width 390] [--paths /,/contact/] [--json out.json]
//
// <baseUrl> is any served copy of the site: the live Worker, or
// `npm run serve:dist` after a build. Needs @playwright/test and an installed
// Chromium. Not a CI gate (it needs a served site and a browser); it is the
// instrument the 44px claim is checked with, and the number to quote before and
// after a change. Exit code 1 when anything is under 44px or a tap is stolen.
//
// WHAT COUNTS AS THE TARGET. The element's box, grown by its own ::after when
// that is absolutely positioned (the card 82 hit area): the effective size is
// max(box, ::after box) in each direction. An element inside aria-hidden or
// inert, a hidden or 1px element, or an off-canvas skip link is not a target.
//
// WHAT IS REPORTED SEPARATELY. A link that sits inside a sentence of body text
// (its parent block has other text around it) is exempt under WCAG 2.5.8
// ("Inline") and cannot be padded without breaking the line, so it is listed
// under `inline` and left out of the failing total.
//
// Each element that relied on a hit-area ::after is also hit-tested: the point
// 3px inside its visible box edge, top and bottom, must land on the element
// itself or one of its own descendants, otherwise it is reported as `stolen`.
//
// It measures tap targets only. It does not measure text size.
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? '').replace(/\/$/, '');
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
if (!base) {
  console.error(
    'usage: node scripts/measure-tap-targets.mjs <baseUrl> [--width 390] [--paths /,/contact/] [--json out.json]',
  );
  process.exit(2);
}
const width = Number(flag('width', 390));
const paths = flag('paths', '/').split(',');
const jsonOut = flag('json', '');

/* Runs in the page. Plain function, serialised by Playwright. */
function collect() {
  const SEL =
    'a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [role=link]';
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (!el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (r.right <= 0 || r.bottom + window.scrollY < 0) continue;
    if (el.closest('[inert],[aria-hidden=true]')) continue;

    // The ::after hit area, when the element has one that is absolutely placed.
    let w = r.width;
    let h = r.height;
    let usesHit = false;
    const pseudo = getComputedStyle(el, '::after');
    if (pseudo.content !== 'none' && pseudo.position === 'absolute') {
      const pw = parseFloat(pseudo.width);
      const ph = parseFloat(pseudo.height);
      if (pw > w || ph > h) usesHit = true;
      w = Math.max(w, pw || 0);
      h = Math.max(h, ph || 0);
    }
    const effW = Math.round(w);
    const effH = Math.round(h);
    if (effW >= 44 && effH >= 44) {
      // Passing. Still hit-test the ones that lean on the pseudo-element.
      if (!usesHit) continue;
    }

    // Inline in a sentence? The link is a direct child of a paragraph (or
    // definition, or quote) that carries other words around it.
    let inline = false;
    const block = el.parentElement;
    if (block && block.matches('p, dd, blockquote') && !el.matches('summary, button')) {
      const rest = (block.textContent || '').replace(el.textContent || '', '').trim();
      inline = rest.length > 12;
    }

    // Hit test just inside the visible top and bottom edges.
    let stolen = false;
    if (usesHit) {
      const x = r.left + r.width / 2;
      for (const y of [r.top + 3, r.bottom - 3]) {
        if (y < 0 || y > window.innerHeight) continue; // off-screen: cannot hit-test
        const top = document.elementFromPoint(x, y);
        if (top && top !== el && !el.contains(top)) stolen = true;
      }
    }

    out.push({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.getAttribute('aria-label') || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40),
      w: effW,
      h: effH,
      boxW: Math.round(r.width),
      boxH: Math.round(r.height),
      pass: effW >= 44 && effH >= 44,
      inline,
      stolen,
      y: Math.round(r.top + window.scrollY),
    });
  }
  return out;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height: 844 },
  deviceScaleFactor: 2,
  isMobile: width < 700,
  hasTouch: width < 700,
});
const report = {};
let failing = 0;
let inlineCount = 0;
let stolenCount = 0;
let relied = 0;
for (const p of paths) {
  const page = await context.newPage();
  await page.goto(base + p, { waitUntil: 'networkidle' });
  // Walk the page so lazy images and reveal blocks settle before measuring.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(40);
  }
  // Hit tests need the element in the viewport, so scroll each into view first
  // and measure in one pass per element row. Cheap approach: measure at the top,
  // then re-run per scroll stop so every element is on screen once.
  const seen = new Map();
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(30);
    for (const t of await page.evaluate(collect)) {
      const key = `${t.tag}|${t.text}|${t.y}`;
      const prev = seen.get(key);
      if (!prev || (prev.stolen === false && t.stolen)) seen.set(key, t);
    }
  }
  const list = [...seen.values()].sort((a, b) => a.y - b.y);
  report[p] = list;
  for (const t of list) {
    if (t.pass) relied += 1;
    else if (t.inline) inlineCount += 1;
    else failing += 1;
    if (t.stolen) stolenCount += 1;
  }
  await page.close();
}
await browser.close();

for (const [p, list] of Object.entries(report)) {
  const bad = list.filter((t) => !t.pass && !t.inline);
  console.log(
    `\n${p}  under 44px: ${bad.length}   inline-in-sentence (exempt): ${list.filter((t) => !t.pass && t.inline).length}`,
  );
  for (const t of list.filter((x) => !x.pass)) {
    console.log(
      `  ${t.inline ? 'inline' : 'FAIL  '} ${t.tag.padEnd(7)} ${String(t.w).padStart(4)}x${String(t.h).padEnd(3)} (box ${t.boxW}x${t.boxH}) y=${t.y}  ${t.text}`,
    );
  }
}
console.log(
  `\nTOTAL at ${width}px: ${failing} under 44px, ${inlineCount} inline-in-sentence (exempt), ${relied} lifted to 44px by a hit-area ::after, ${stolenCount} stolen-tap warnings`,
);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
process.exit(failing > 0 || stolenCount > 0 ? 1 : 0);

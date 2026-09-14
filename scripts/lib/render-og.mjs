// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
// =============================================================================
// The share card renderer
// =============================================================================
// One 1200x630 PNG. Used by generate-og-default.mjs (the single fallback) and
// generate-og-pages.mjs (one per page singleton).
//
// -----------------------------------------------------------------------------
// WHY A BROWSER AND NOT SHARP'S TEXT RENDERER
// -----------------------------------------------------------------------------
// This drew through sharp's Pango bindings until 2026-09-13, and its own header
// admitted the consequence: "Pango falls back to a system serif if Libre
// Baskerville isn't installed on the build machine." That is not an edge case,
// it is the normal case. Pango resolves fonts through FONTCONFIG, which knows
// about fonts INSTALLED ON THE MACHINE and nothing about node_modules, and every
// project in this family loads its faces from @fontsource packages. So the card
// was set in whatever serif the build box happened to have, on every build, on
// every fork, and the one thing a share card has to carry is the brand.
//
// A headless browser can @font-face the real woff2 straight out of node_modules,
// which is the whole reason for the swap. Playwright is already a devDependency
// because the test suite needs it.
//
// THE PNGs ARE COMMITTED and these scripts run by hand (`npm run og`,
// `npm run og:pages`), so CI never needs a browser to build the site. If that
// ever changes, the workflow needs `npx playwright install chromium`.
//
// -----------------------------------------------------------------------------
// THE CARD IS A THUMBNAIL FIRST
// -----------------------------------------------------------------------------
// It is usually seen about 300px wide in a feed, so the wordmark is large, the
// tagline is three lines at most, and nothing depends on small type being
// readable. Keep it that way when a project restyles this.
//
// `apply-brand` rewrites the DEFAULTS below by regex, matching two-space
// indentation and single quotes. Keep that shape or a rebrand silently skips
// this file.
// =============================================================================

import { mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const DEFAULTS = {
  width: 1200,
  height: 630,
  bg: '#FBFBFA', // Paper
  primary: '#586577', // Slate
  primaryDark: '#434E5C', // Slate Dark
  accent: '#2A2D31', // Ink
  taupe: '#AAB0B8', // Cool Gray
  fontDisplay: 'Libre Baskerville, Georgia, Cambria, Times New Roman, serif',
};

/**
 * Find the real font file behind a @fontsource import, so it can be embedded.
 *
 * `brand.config.json` already names the imports the site loads
 * ("@fontsource/libre-baskerville/400.css", "@fontsource-variable/inter"), and
 * that is the only place this has to be written down. Returns null when the
 * package is not installed, and the caller falls back to the CSS stack: a card
 * in the wrong serif is worse than one in the right serif, but much better than
 * no card at all.
 */
function findFontFile(importSpecifier) {
  const m = /^(@fontsource(?:-variable)?\/[^/]+)(?:\/(.+))?$/.exec(importSpecifier);
  if (!m) return null;
  const [, pkg, rest] = m;
  const dir = resolve(root, 'node_modules', pkg, 'files');
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.woff2'));
  } catch {
    return null;
  }
  if (files.length === 0) return null;

  const weight = /(\d{3})/.exec(rest ?? '')?.[1];
  const score = (f) => {
    let s = 0;
    if (f.includes('-latin-')) s += 8; // latin before latin-ext and the rest
    if (f.includes('-normal')) s += 4; // upright before italic
    if (weight && f.includes(`-${weight}-`)) s += 2;
    if (f.includes('-wght-')) s += 1; // a variable file covers every weight
    return s;
  };
  const best = files.slice().sort((a, b) => score(b) - score(a))[0];
  return resolve(dir, best);
}

/** The display face, as a data: URI, or null if it cannot be found. */
function displayFontUri() {
  let brand;
  try {
    brand = JSON.parse(readFileSync(resolve(root, 'brand/brand.config.json'), 'utf8'));
  } catch {
    return null;
  }
  for (const spec of brand?.fonts?.display?.imports ?? []) {
    const file = findFontFile(spec);
    if (file) return `data:font/woff2;base64,${readFileSync(file).toString('base64')}`;
  }
  return null;
}

const FONT_URI = displayFontUri();
if (!FONT_URI) {
  console.warn(
    '[render-og] No @fontsource display file found; falling back to the CSS stack. ' +
      'Check brand.config.json fonts.display.imports and that the package is installed.',
  );
}

/** Escape a string for safe interpolation into the card's markup. */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Wrap a string to roughly N characters per line on word boundaries. Kept from
 * the Pango version: the browser could wrap this itself, but an explicit line
 * count is what guarantees the card never grows a fourth line.
 */
function wrapToLines(text, maxCharsPerLine = 28) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) current = next;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function cardHtml(t, wordmark, lines) {
  const family = FONT_URI ? `BrandDisplay, ${t.fontDisplay}` : t.fontDisplay;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONT_URI ? `@font-face{font-family:BrandDisplay;src:url(${FONT_URI}) format('woff2');font-display:block}` : ''}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${t.width}px;height:${t.height}px;overflow:hidden}
  .card{position:relative;width:${t.width}px;height:${t.height}px;background:${t.bg};
    font-family:${family};text-align:center}
  /* A hairline frame, inset, so the card reads as a printed plate rather than
     as a screenshot of a page. */
  .frame{position:absolute;inset:40px;border:2px solid ${t.taupe};opacity:.5}
  .stack{position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:34px;padding:0 96px}
  .wordmark{font-size:96px;line-height:1.05;color:${t.primaryDark}}
  .rule{width:120px;height:2px;background:${t.primary}}
  .tagline{font-size:32px;line-height:1.35;color:${t.accent}}
  </style></head><body>
  <div class="card">
    <div class="frame"></div>
    <div class="stack">
      <div class="wordmark">${esc(wordmark)}</div>
      <div class="rule"></div>
      <div class="tagline">${lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    </div>
  </div></body></html>`;
}

// ONE BROWSER FOR THE WHOLE RUN. Launching chromium per card turns a four
// second job into a minute and a half on a site with a card per page.
let browser = null;
async function getBrowser() {
  if (browser) return browser;
  const { chromium } = await import('playwright');
  browser = await chromium.launch();
  return browser;
}

/**
 * Close the shared browser. CALL THIS ONCE AT THE END OF A GENERATOR.
 *
 * It is not optional and the failure mode is nasty: a browser Playwright has
 * not been told to close keeps the event loop alive forever, so the script does
 * all its work, writes every file, prints its last line and then HANGS. That
 * looks exactly like a slow render and cost two ten-minute timeouts before
 * anyone suspected the exit rather than the work.
 */
export async function closeRenderer() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Render an OG image PNG.
 *
 * @param {object} opts
 * @param {string} opts.wordmark - top-line brand text
 * @param {string|string[]} opts.tagline - subtitle; a string is wrapped to ~28 chars/line
 * @param {string} opts.outPath - absolute path to write the PNG to
 * @param {Partial<typeof DEFAULTS>} [opts.theme] - colour/size overrides
 */
export async function renderOg({ wordmark, tagline, outPath, theme = {} }) {
  const t = { ...DEFAULTS, ...theme };
  const lines = (Array.isArray(tagline) ? tagline : wrapToLines(tagline, 28)).slice(0, 3);

  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });

  const b = await getBrowser();
  const page = await b.newPage({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: 1,
  });
  await page.setContent(cardHtml(t, wordmark, lines), { waitUntil: 'load' });
  // Without this the card can be photographed before the face decodes, which
  // produces a card set in the fallback: the exact failure this file replaced.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();

  return { width: t.width, height: t.height, outPath };
}

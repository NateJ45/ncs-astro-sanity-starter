// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Page-weight budget (PORTS.md card 197; first written for FBC Auburn's 2026-10-25 pass)
// =============================================================================
// A page that quietly doubles in weight passes every functional test, so this pins the numbers.
// For every route in tests/routes.ts it loads the built page and checks, against the budget in
// tests/page-weight.config.json (the ONLY file a site edits; this spec stays byte-identical):
//
//   - the HTML document, the inline <style> total, the scripts and the images stay under their
//     budgets (decoded kilobytes; the host compresses, so the wire size is smaller);
//   - the largest-contentful-paint image, when the LCP element is a picture, is under its own
//     budget (the most common cause of a slow phone);
//   - no more than a few fonts are preloaded, each of a sensible size, and every preloaded font
//     is a woff2 (a preload of a file the page then does not use is wasted bandwidth);
//   - every JSON-LD block parses, and each page named in `jsonLd` carries the types listed.
//
// THE BUDGET FILE. `defaults` apply to every route; `pages["/about/"]` overrides single keys for
// one route. Start from what the site weighs today plus about 25%, then tighten it: a budget set
// far above reality never fails. A route that must be heavy (a gallery) gets its own entry, with
// the reason in `_why`, not a raised default. Missing keys fall back to the numbers below.
//
// Run it like any spec (`npm test -- tests/page-weight.spec.ts`); it needs the built site.
// =============================================================================
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { routes } from './routes';

interface Budget {
  /** The HTML document, decoded. */
  maxHtmlKb: number;
  /** All inline <style> blocks together. */
  maxInlineCssKb: number;
  /** All scripts the page loads (external files), decoded, together. */
  maxScriptKb: number;
  /** All images the page loads without scrolling, together. */
  maxImagesKb: number;
  /** Any single image. */
  maxImageKb: number;
  /** The largest-contentful-paint image, when LCP is a picture. */
  maxLcpImageKb: number;
  /** How many fonts may be preloaded. */
  maxFontPreloads: number;
  /** The size of any one preloaded font. */
  maxFontKb: number;
}

interface BudgetFile {
  defaults?: Partial<Budget>;
  pages?: Record<string, Partial<Budget> & { _why?: string }>;
  /** Route -> the schema.org @type values that page must carry. */
  jsonLd?: Record<string, string[]>;
}

const FALLBACK: Budget = {
  maxHtmlKb: 150,
  maxInlineCssKb: 90,
  maxScriptKb: 400,
  maxImagesKb: 1200,
  maxImageKb: 500,
  maxLcpImageKb: 250,
  maxFontPreloads: 3,
  maxFontKb: 120,
};

const config: BudgetFile = JSON.parse(
  readFileSync(new URL('./page-weight.config.json', import.meta.url), 'utf8'),
);
const budgetFor = (route: string): Budget => ({
  ...FALLBACK,
  ...config.defaults,
  ...config.pages?.[route],
});

const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;

/** Every @type in a JSON-LD value, including those inside an @graph. */
function typesIn(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => typesIn(n, out));
  else if (node && typeof node === 'object') {
    const t = (node as Record<string, unknown>)['@type'];
    if (typeof t === 'string') out.push(t);
    else if (Array.isArray(t)) out.push(...t.filter((x): x is string => typeof x === 'string'));
    for (const v of Object.values(node)) typesIn(v, out);
  }
  return out;
}

for (const route of routes) {
  test(`${route} stays inside its weight budget`, async ({ page }) => {
    const budget = budgetFor(route);
    const sizes = new Map<string, { type: string; bytes: number }>();
    const reading: Promise<void>[] = [];
    page.on('response', (response) => {
      const type = response.request().resourceType();
      if (!['document', 'script', 'image', 'font'].includes(type)) return;
      reading.push(
        response
          .body()
          .then((body) => void sizes.set(response.url(), { type, bytes: body.length }))
          .catch(() => undefined),
      );
    });
    // Largest contentful paint: remember the last candidate's URL (empty for a text LCP).
    await page.addInitScript(() => {
      (window as unknown as { __lcpUrl: string }).__lcpUrl = '';
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1) as (PerformanceEntry & { url?: string }) | undefined;
        (window as unknown as { __lcpUrl: string }).__lcpUrl = last?.url ?? '';
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    await page.goto(route);
    await page.waitForLoadState('load');
    await page.waitForTimeout(400);
    await Promise.all(reading);

    const total = (type: string) =>
      [...sizes.values()].filter((s) => s.type === type).reduce((n, s) => n + s.bytes, 0);

    // The document and its inline CSS.
    const html = await page.content();
    const doc = [...sizes.entries()].find(([, s]) => s.type === 'document');
    expect(kb(doc?.[1].bytes ?? html.length), 'HTML document KB').toBeLessThanOrEqual(
      budget.maxHtmlKb,
    );
    const inlineCss = await page.$$eval('style', (els) =>
      els.reduce((n, el) => n + (el.textContent ?? '').length, 0),
    );
    expect(kb(inlineCss), 'inline CSS KB').toBeLessThanOrEqual(budget.maxInlineCssKb);

    // Scripts and images.
    expect(kb(total('script')), 'script KB').toBeLessThanOrEqual(budget.maxScriptKb);
    expect(kb(total('image')), 'images KB').toBeLessThanOrEqual(budget.maxImagesKb);
    for (const [url, s] of sizes) {
      if (s.type !== 'image') continue;
      expect(kb(s.bytes), `image ${url}`).toBeLessThanOrEqual(budget.maxImageKb);
    }

    // The LCP picture.
    const lcpUrl = await page.evaluate(() => (window as unknown as { __lcpUrl: string }).__lcpUrl);
    const lcp = lcpUrl ? sizes.get(lcpUrl) : undefined;
    if (lcp) {
      expect(kb(lcp.bytes), `LCP image ${lcpUrl}`).toBeLessThanOrEqual(budget.maxLcpImageKb);
    }

    // Preloaded fonts: few, woff2, and small.
    const preloads = await page.$$eval('link[rel="preload"][as="font"]', (els) =>
      els.map((e) => (e as HTMLLinkElement).href),
    );
    expect(preloads.length, 'preloaded fonts').toBeLessThanOrEqual(budget.maxFontPreloads);
    for (const href of preloads) {
      expect(new URL(href).pathname, 'a preloaded font is woff2').toMatch(/\.woff2$/);
      const font = sizes.get(href);
      if (font) expect(kb(font.bytes), `font ${href}`).toBeLessThanOrEqual(budget.maxFontKb);
    }

    // Structured data: parseable everywhere, and the types this page promised.
    const blocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((e) => e.textContent ?? ''),
    );
    const found: string[] = [];
    for (const raw of blocks) {
      let parsed: unknown;
      expect(() => (parsed = JSON.parse(raw)), 'a JSON-LD block is valid JSON').not.toThrow();
      typesIn(parsed, found);
    }
    for (const type of config.jsonLd?.[route] ?? []) {
      expect(found, `${route} carries JSON-LD ${type}`).toContain(type);
    }
  });
}

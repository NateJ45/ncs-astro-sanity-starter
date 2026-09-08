// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle } from './helpers';
import { site } from '../src/data/site';

// =============================================================================
// Contrast, for the elements axe DECLINES TO JUDGE
// =============================================================================
// This suite exists because of a hole in the one we already had, and the hole
// is big enough to drive a site-wide bug through.
//
// axe reports three outcomes per rule, not two: violations, passes, and
// INCOMPLETE. a11y.spec.ts and a11y-dark.spec.ts both assert
// `results.violations` is empty, which is the right assertion and also means an
// incomplete slides through in silence. axe returns incomplete for
// colour-contrast whenever it cannot work the background out for itself, and
// the commonest reason by far is "this element uses complex text shadows".
//
// Measured on stonesteps-50k on 2026-09-08, across five routes in two themes:
// 466 incomplete contrast nodes, 205 unique elements. Every display heading on
// the site, because the design system puts a text-shadow on all of them. The
// contrast gate had never evaluated a single one of them, which is exactly how
// a rule colouring every heading cream-on-cream in light mode shipped through a
// green axe run, along with a featured card whose heading measured 1.15:1.
//
// WHAT THIS DOES. It runs axe for colour-contrast, takes the INCOMPLETE list
// (not the violations, which the other suites already own), and computes the
// ratio itself for each one: the element's colour against the first ancestor
// with a real background, at the element's own font size and weight. So it
// COMPLETES axe rather than reimplementing it, and the two suites cannot
// disagree about the same element.
//
// WHAT IT DELIBERATELY DOES NOT FAIL ON. Elements sitting on a background
// IMAGE or a gradient, where a single colour is not the honest answer and a
// number would be a guess. Those are counted and printed, so a growing pile is
// visible, but they do not go red: a gate that fails on something nobody can
// fix gets muted, and a muted gate is worse than no gate.
// =============================================================================

// WCAG AA thresholds (3:1 large, 4.5:1 otherwise) are applied inside the
// browser evaluation below, where the font size and weight are readable.

interface Checked {
  selector: string;
  text: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  undetermined: boolean;
}

/**
 * Resolve each incomplete node in the page and measure it.
 *
 * Runs in the browser because it needs computed styles and the live ancestor
 * chain. Returns one row per node, with `undetermined` set where the answer
 * would be a guess.
 */
async function measure(page: Parameters<typeof settle>[0], selectors: string[]) {
  return page.evaluate((sels: string[]) => {
    // RESOLVE COLOURS THROUGH A CANVAS, NOT A REGEX.
    //
    // getComputedStyle does not promise rgb(). Tailwind 4 emits oklch/oklab, and
    // Chromium hands those straight back, so `oklab(0.944 0.002 0.065 / 0.8)`
    // parsed as if it were rgb() gives a luminance of roughly nothing and a
    // confident 1.17:1 for text that is actually fine. The first run of this
    // suite did exactly that and reported two false failures, which is the
    // failure mode that gets a gate switched off.
    //
    // Painting one pixel and reading it back asks the browser to do the colour
    // maths, so every CSS colour syntax resolves, today's and next year's, and
    // the alpha channel comes back with it.
    const cvs = document.createElement('canvas');
    cvs.width = 1;
    cvs.height = 1;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });

    const toRgba = (colour: string): [number, number, number, number] | null => {
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      // An unparseable value leaves fillStyle untouched, so seed a known colour
      // and treat "unchanged" as unparseable rather than as black.
      ctx.fillStyle = '#010203';
      ctx.fillStyle = colour;
      if (ctx.fillStyle === '#010203' && colour.replace(/\s/g, '') !== '#010203') return null;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };

    const luminance = (rgb: [number, number, number]): number => {
      const [r, g, b] = rgb.map((v) => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    /** Lay a partly transparent colour over its background, as the screen does. */
    const composite = (
      fg: [number, number, number, number],
      bg: [number, number, number, number],
    ): [number, number, number] => [
      fg[0] * fg[3] + bg[0] * (1 - fg[3]),
      fg[1] * fg[3] + bg[1] * (1 - fg[3]),
      fg[2] * fg[3] + bg[2] * (1 - fg[3]),
    ];

    const opaqueEnough = (c: string) => {
      const v = toRgba(c);
      return !!v && v[3] > 0.99;
    };

    /** The first ancestor that actually paints, or null when an image gets in the way. */
    const backdrop = (el: Element): { colour: string | null; image: boolean } => {
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node);
        if (cs.backgroundImage && cs.backgroundImage !== 'none')
          return { colour: null, image: true };
        if (opaqueEnough(cs.backgroundColor)) return { colour: cs.backgroundColor, image: false };
        node = node.parentElement;
      }
      const body = getComputedStyle(document.body).backgroundColor;
      return { colour: opaqueEnough(body) ? body : 'rgb(255, 255, 255)', image: false };
    };

    const out: unknown[] = [];
    for (const sel of sels) {
      let el: Element | null = null;
      try {
        el = document.querySelector(sel);
      } catch {
        continue; // a selector axe can build but querySelector cannot parse
      }
      if (!el || !(el as HTMLElement).getClientRects().length) continue;

      const cs = getComputedStyle(el);
      const text = (el.textContent ?? '').trim();
      if (!text) continue;

      // OUTLINED TEXT HAS NO FILL COLOUR TO MEASURE. The logo's lowercase k
      // is drawn with `color: transparent` and a -webkit-text-stroke, so what
      // you see is the stroke. Measuring the fill returns 1:1 and reports a
      // perfectly legible letter as invisible, which is a false alarm and the
      // fastest way to get a gate ignored.
      const strokeW = parseFloat(cs.webkitTextStrokeWidth || '0');
      const fillAlpha = toRgba(cs.color)?.[3] ?? 1;
      if (strokeW > 0 && fillAlpha < 0.05) continue;

      const back = backdrop(el);
      const px = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const required = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;

      if (back.image || back.colour === null) {
        out.push({
          selector: sel,
          text: text.slice(0, 40),
          fg: cs.color,
          bg: 'image or gradient',
          ratio: 0,
          required,
          undetermined: true,
        });
        continue;
      }

      const fg = toRgba(cs.color);
      const bgRgba = toRgba(back.colour);
      if (!fg || !bgRgba) continue;
      // Text carrying its own alpha (text-foreground/80 and friends) is only
      // as readable as what shows through it, so blend before measuring. This
      // is the trap that has bitten this project four times with opacity
      // utilities, and the reason the number has to come from the composite.
      const a = luminance(composite(fg, bgRgba));
      const b = luminance([bgRgba[0], bgRgba[1], bgRgba[2]]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      out.push({
        selector: sel,
        text: text.slice(0, 40),
        fg: cs.color,
        bg: back.colour,
        ratio: Math.round(ratio * 100) / 100,
        required,
        undetermined: false,
      });
    }
    return out;
  }, selectors);
}

async function sweep(page: Parameters<typeof settle>[0], route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await settle(page);

  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const selectors = [
    ...new Set(
      results.incomplete.flatMap((r) => r.nodes.flatMap((n) => n.target.map((t) => String(t)))),
    ),
  ];
  if (selectors.length === 0) return { failures: [] as Checked[], undetermined: 0, checked: 0 };

  const rows = (await measure(page, selectors)) as Checked[];
  return {
    failures: rows.filter((r) => !r.undetermined && r.ratio < r.required),
    undetermined: rows.filter((r) => r.undetermined).length,
    checked: rows.length,
  };
}

function report(route: string, theme: string, failures: Checked[]): string {
  return [
    `${failures.length} element(s) below AA on ${route} in ${theme} mode,`,
    'each one invisible to axe because it could not determine the background:',
    ...failures.map(
      (f) =>
        `  ${f.ratio}:1 (needs ${f.required}) ${f.fg} on ${f.bg}\n` +
        `    ${f.selector}\n    "${f.text}"`,
    ),
  ].join('\n');
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Contrast beyond axe (${theme} mode)`, () => {
    for (const route of routes) {
      test(`${route} has no unevaluated contrast failures in ${theme} mode`, async ({ page }) => {
        if (theme === 'dark') {
          await page.addInitScript((key) => {
            window.localStorage.setItem(key, 'dark');
          }, site.themeStorageKey);
        }
        await page.goto(route, { waitUntil: 'domcontentloaded' });

        // Same guard as a11y-dark.spec.ts: without it a broken storage key
        // means this suite audits light mode twice and reports success.
        if (theme === 'dark') {
          await expect(page.locator('html')).toHaveClass(/dark/);
        }

        const { failures, undetermined, checked } = await sweep(page, route);

        // Printed rather than asserted: a background image is not a bug, and
        // a rising count is worth seeing without going red for it.
        if (undetermined > 0) {
          console.log(
            `  ${route} (${theme}): ${undetermined} of ${checked} sit on an image or gradient, not judged`,
          );
        }

        expect(failures, failures.length ? report(route, theme, failures) : undefined).toEqual([]);
      });
    }
  });
}

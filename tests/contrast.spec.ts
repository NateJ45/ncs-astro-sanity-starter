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

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Checked {
  selector: string;
  text: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  undetermined: boolean;
  /** Present only for elements measured against a photograph or gradient. */
  box?: Box;
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

    // Every painted media box on the page, in viewport coordinates.
    //
    // WALKING ANCESTORS FOR A CSS background-image IS NOT ENOUGH. A hero
    // photograph is almost always an <img> ELEMENT with the type positioned
    // over it, not a background on an ancestor, so an ancestor walk sails
    // straight past it and measures the section's background colour instead.
    // A deliberately poor label placed over the hero proved exactly that: the
    // gate reported it against the page cream and never looked at the photo.
    // Anything whose box overlaps a media box is measured from pixels.
    // RASTER MEDIA ONLY, deliberately. Including <svg> swept in the decorative
    // topo overlay, which spans whole sections, so every element in them became
    // "over media" and the run hit its measurement cap. The topo is a low-opacity
    // vector over a solid background, and the colour path judges that correctly.
    const mediaBoxes = [...document.querySelectorAll('img,video,canvas,picture')]
      .map((m) => (m as HTMLElement).getBoundingClientRect())
      .filter((r) => r.width > 8 && r.height > 8);
    const overlapsMedia = (r: DOMRect) =>
      mediaBoxes.some(
        (m) => !(r.right <= m.left || r.left >= m.right || r.bottom <= m.top || r.top >= m.bottom),
      );

    /** The first ancestor that actually paints, or null when an image gets in the way. */
    const backdrop = (el: Element): { colour: string | null; image: boolean } => {
      if (overlapsMedia((el as HTMLElement).getBoundingClientRect()))
        return { colour: null, image: true };
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
        // Measured in a second pass, from the rendered pixels. Recorded here
        // with the box so the caller can screenshot behind it. See
        // measureOverImages().
        const r = (el as HTMLElement).getBoundingClientRect();
        out.push({
          selector: sel,
          text: text.slice(0, 40),
          fg: cs.color,
          bg: 'image or gradient',
          ratio: 0,
          required,
          undetermined: true,
          box: {
            x: Math.max(0, Math.floor(r.left + window.scrollX)),
            y: Math.max(0, Math.floor(r.top + window.scrollY)),
            width: Math.max(1, Math.ceil(r.width)),
            height: Math.max(1, Math.ceil(r.height)),
          },
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

/**
 * Measure text that sits over a photograph or a gradient, from the pixels.
 *
 * THIS IS THE PART THAT MAKES AMBITIOUS BACKGROUNDS SAFE. The first version of
 * this suite skipped these elements, on the reasoning that a single colour is
 * not an honest answer behind an image. That is true, and it left a hole
 * exactly where the risk is highest: type over a photograph is the classic way
 * to ship unreadable text, and it is what the texture work introduces.
 *
 * The method, per element:
 *   1. Hide the element, so the camera sees only what is BEHIND it.
 *   2. Screenshot its box.
 *   3. Send the PNG back into the page and read it through a canvas, so the
 *      browser does the decoding and no image library is needed.
 *   4. Build a luminance histogram of the real background pixels.
 *   5. Report the ratio that holds for 95% of them.
 *
 * THE 95% IS DELIBERATE. WCAG has no rule for text on an image, and a strict
 * worst-pixel test fails on a single stray highlight, which would make the gate
 * unusable and therefore ignored. Requiring the ratio to hold across all but the
 * worst 5% of the area is the practical reading, and it still catches the real
 * failure: type laid over a busy or badly-chosen part of a photograph.
 */
async function measureOverImages(
  page: Parameters<typeof settle>[0],
  rows: Checked[],
): Promise<Checked[]> {
  const out: Checked[] = [];
  // Bounded on purpose: this costs a screenshot per element, and a page that
  // puts a hundred labels on a photograph has a design problem the gate should
  // report rather than spend five minutes measuring.
  const MAX = 25;
  let done = 0;

  for (const row of rows) {
    if (!row.box || done >= MAX) {
      out.push(row);
      continue;
    }
    done += 1;

    // Hide just this element. visibility:hidden removes it and its background
    // from the paint while keeping layout identical, so nothing behind it
    // shifts between the measurement and the real render.
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) el.style.visibility = 'hidden';
    }, row.selector);

    let shot: string | null = null;
    try {
      // fullPage, because row.box is in PAGE coordinates. A viewport screenshot
      // would clip the same numbers against the viewport origin, so anything
      // below the fold came back as the wrong region entirely: the first run
      // reported dark ink at 1.05:1 against a slice of a different section.
      const buf = await page.screenshot({ clip: row.box, fullPage: true });
      shot = buf.toString('base64');
    } catch {
      // A box that is off-screen or zero-area cannot be photographed. Leave the
      // row undetermined rather than inventing a number for it.
    }

    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) el.style.visibility = '';
    }, row.selector);

    if (!shot) {
      out.push(row);
      continue;
    }

    const result = await page.evaluate(
      async ([b64, fgColour]: [string, string]) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;

        const lin = (v: number) => {
          const n = v / 255;
          return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        const lumOf = (r: number, g: number, b: number) =>
          0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

        // The text colour, resolved the same way the rest of the suite does it.
        const probe = document.createElement('canvas');
        probe.width = probe.height = 1;
        const pctx = probe.getContext('2d', { willReadFrequently: true });
        if (!pctx) return null;
        pctx.fillStyle = '#010203';
        pctx.fillStyle = fgColour;
        pctx.fillRect(0, 0, 1, 1);
        const fp = pctx.getImageData(0, 0, 1, 1).data;
        const fgLum = lumOf(fp[0], fp[1], fp[2]);

        // Histogram the background, then find the ratio that 95% of it meets.
        const BUCKETS = 128;
        const hist = new Array(BUCKETS).fill(0);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const l = lumOf(data[i], data[i + 1], data[i + 2]);
          hist[Math.min(BUCKETS - 1, Math.floor(l * BUCKETS))] += 1;
          total += 1;
        }
        if (!total) return null;

        const ratios: { ratio: number; count: number }[] = [];
        for (let i = 0; i < BUCKETS; i += 1) {
          if (!hist[i]) continue;
          const l = (i + 0.5) / BUCKETS;
          const ratio = (Math.max(fgLum, l) + 0.05) / (Math.min(fgLum, l) + 0.05);
          ratios.push({ ratio, count: hist[i] });
        }
        ratios.sort((a, b) => a.ratio - b.ratio);

        // Walk from the worst ratio up until 5% of the area is behind us; the
        // ratio there is the one that holds for the remaining 95%.
        let seen = 0;
        for (const r of ratios) {
          seen += r.count;
          if (seen / total >= 0.05) return Math.round(r.ratio * 100) / 100;
        }
        return Math.round(ratios[ratios.length - 1].ratio * 100) / 100;
      },
      [shot, row.fg] as [string, string],
    );

    if (result === null) {
      out.push(row);
      continue;
    }
    out.push({
      ...row,
      bg: 'photograph or gradient, measured',
      ratio: result,
      undetermined: false,
    });
  }
  return out;
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

  const first = (await measure(page, selectors)) as Checked[];
  // Second pass: anything the colour maths could not judge, because it sits on
  // a photograph or a gradient, is measured from the rendered pixels instead.
  const rows = await measureOverImages(page, first);
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
          // Only elements that could not be photographed at all reach here now:
          // off-screen boxes, zero-area boxes, or the overflow past the cap.
          console.log(`  ${route} (${theme}): ${undetermined} of ${checked} could not be measured`);
        }

        expect(failures, failures.length ? report(route, theme, failures) : undefined).toEqual([]);
      });
    }
  });
}

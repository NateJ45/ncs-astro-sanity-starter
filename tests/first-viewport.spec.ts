import { test, expect } from './fixtures';
import { routes } from './routes';

// =============================================================================
// First viewport: nothing the visitor sees first starts hidden (PORTS.md card 213)
// =============================================================================
// Origin: nixoncreativestudio's overhaul, 2026-10-31. A heading or picture in
// the first screen that starts at opacity 0 (or clipped shut) waits on a
// script and a transition before it can paint. That delays Largest
// Contentful Paint and leaves a blank first screen when the script is slow.
// So first-viewport H1s and media never take [data-reveal] or any other
// hidden start state.
//
// Part 1. On every route, at 1440 and 320, straight after load (no waiting
// for reveals): every visible H1, image, picture, video, canvas and iframe
// whose box touches the first viewport has computed `opacity: 1` and
// `clip-path: none`, and so does every ancestor (an image inside an
// opacity-0 wrapper is just as hidden).
//
// Part 2. No reveal sits part-faded on screen once the page has settled. A
// [data-reveal] block that straddles the fold at load can miss the reveal
// observer's threshold and stay at opacity 0 (or, with scroll-driven CSS, at
// a fraction of it) until the visitor scrolls. That reads as a broken page
// and fails colour contrast in Lighthouse: it did on the origin site's
// /photography, 2026-10-31. Checked at Lighthouse's mobile size and at 1440,
// after the 600ms reveal transition (globals.css) has had time to finish.
//
// Something hidden on purpose (a stack of rotating lines where only the
// active one shows, a hover-only tag) carries `data-first-viewport-exempt`,
// or a site adds its selector to EXEMPT below.
// =============================================================================

const CHECKED = 'h1, img, picture, video, canvas, iframe';
const EXEMPT = '[data-first-viewport-exempt]';

/** How long Part 2 lets on-screen reveals finish. Above the 600ms transition. */
const SETTLE_MS = 1000;

const widths = [
  { width: 1440, height: 900 },
  { width: 320, height: 720 },
];

for (const viewport of widths) {
  test.describe(`First viewport at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`${route}: first-viewport H1s and media start fully shown`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });

        const hidden = await page.evaluate(
          ({ checked, exempt }) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const describe = (el: Element) => {
              const id = el.id ? `#${el.id}` : '';
              const cls =
                typeof el.className === 'string' && el.className.trim()
                  ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
                  : '';
              return `${el.tagName.toLowerCase()}${id}${cls}`;
            };
            // Computed styles are cached per element: media share most of
            // their ancestors, so this keeps the walk cheap.
            const seen = new Map<Element, string | null>();
            const problemOf = (el: Element): string | null => {
              if (seen.has(el)) return seen.get(el)!;
              const cs = getComputedStyle(el);
              let problem: string | null = null;
              if (parseFloat(cs.opacity) !== 1) problem = `opacity ${cs.opacity}`;
              else if (cs.clipPath !== 'none') problem = `clip-path ${cs.clipPath}`;
              seen.set(el, problem);
              return problem;
            };

            const failures: string[] = [];
            for (const el of document.querySelectorAll(checked)) {
              if (el.closest(exempt)) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw)
                continue;
              if (getComputedStyle(el).visibility === 'hidden') continue;

              for (let node: Element | null = el; node; node = node.parentElement) {
                const problem = problemOf(node);
                if (problem) {
                  const via = node === el ? '' : ` (on ancestor ${describe(node)})`;
                  failures.push(`${describe(el)}: ${problem}${via}`);
                  break;
                }
              }
            }
            return failures;
          },
          { checked: CHECKED, exempt: EXEMPT },
        );

        expect(
          hidden,
          `${route} at ${viewport.width}px: first-viewport elements that start hidden`,
        ).toEqual([]);
      });
    }
  });
}

for (const viewport of [
  { width: 412, height: 823 },
  { width: 1440, height: 900 },
]) {
  test.describe(`Reveals at load, ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: 'no-preference' });

    for (const route of routes) {
      test(`${route}: no on-screen reveal is part-faded`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });
        await page.waitForTimeout(SETTLE_MS);
        const partial = await page.evaluate((exempt) => {
          return [...document.querySelectorAll('[data-reveal]')]
            .filter((el) => !el.closest(exempt))
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
            })
            .map((el) => ({ el, o: parseFloat(getComputedStyle(el).opacity) }))
            .filter(({ o }) => o < 1)
            .map(
              ({ el, o }) =>
                `${o.toFixed(2)} ${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 40)}`,
            );
        }, EXEMPT);
        expect(partial, `${route}: reveals on screen but not fully shown`).toEqual([]);
      });
    }
  });
}

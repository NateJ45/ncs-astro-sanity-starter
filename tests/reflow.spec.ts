// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from '@playwright/test';
import { allRoutes as routes } from './routes';
import { settle } from './helpers';

// WCAG 1.4.10 (Reflow) starts at 320 CSS pixels, not 375: content must not
// need two-dimensional scrolling there. The three larger widths catch the
// other common break: a grid or a fixed-width element that overflows at a
// breakpoint boundary rather than at the small end.
const widths = [320, 1440, 1024, 768];
const VIEWPORT_HEIGHT = 900;

for (const route of routes) {
  for (const width of widths) {
    test(`reflow: ${route} has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        scrollWidth,
        `${route} at ${width}px: scrollWidth ${scrollWidth} > clientWidth ${clientWidth} (horizontal overflow)`,
      ).toBeLessThanOrEqual(clientWidth);
    });
  }
}

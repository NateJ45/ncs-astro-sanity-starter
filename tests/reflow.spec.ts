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
      // ANIMATIONS STAY RUNNING FOR THIS ONE. See SettleOptions: freezing them
      // is right for axe and wrong here, because the widest the document ever
      // gets is the number that decides whether there is a scrollbar, and an
      // element only reaches its widest mid-animation.
      await settle(page, { freezeAnimations: false });

      // Sampled across a couple of seconds rather than measured once. A looping
      // animation is only over its container for part of its cycle, and a
      // single reading lands wherever the test happened to arrive.
      const { widest, clientWidth } = await page.evaluate(async () => {
        const clientWidth = document.documentElement.clientWidth;
        let widest = 0;
        for (let i = 0; i < 24; i++) {
          widest = Math.max(widest, document.documentElement.scrollWidth);
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)));
        }
        return { widest, clientWidth };
      });

      expect(
        widest,
        `${route} at ${width}px: widest scrollWidth ${widest} > clientWidth ${clientWidth} (horizontal overflow)`,
      ).toBeLessThanOrEqual(clientWidth);
    });
  }
}

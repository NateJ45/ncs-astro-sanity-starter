// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { routes } from './routes';
import { settle } from './helpers';

// WCAG 2.4.11 Focus Not Obscured (Minimum), AA in 2.2. A focused control must not be
// entirely hidden behind author-created content such as a sticky header or a fixed bar.
// The page is driven on a phone-width viewport, where the sticky header, the Sunday
// bar and the chip all show. Going backwards the browser scrolls the target to the top
// edge (under the header unless the root has scroll-padding-top); going forwards it
// scrolls to the bottom edge (under a fixed bar unless it has scroll-padding-bottom).
//
// "Not obscured" here: elementFromPoint at nine points inside the focused element's
// rectangle must reach the element (or something inside it, or an ancestor that holds
// it, which is how a link wrapped in a label hits) at least once.

const STEPS = 45;

async function focusedCoverage(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const label = `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(/\s+/)[0] : ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
    // Skip controls the page itself has taken off screen (a skip link before focus).
    if (r.bottom <= 0 || r.top >= innerHeight) return { label, hit: true, offscreen: true };
    let hit = false;
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width * fx));
        const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height * fy));
        const top = document.elementFromPoint(x, y);
        if (top && (el.contains(top) || top.contains(el))) hit = true;
      }
    }
    return { label, hit, offscreen: false, top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
}

for (const route of routes.slice(0, 3)) {
  test.describe(`focus not obscured: ${route}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Shift+Tab up the page never lands a link under a sticky bar', async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(500);
      // Start from the last focusable control so Shift+Tab walks upward from the foot.
      await page.evaluate(() => {
        const all = Array.from(
          document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea'),
        ).filter((e) => e.offsetParent !== null && e.tabIndex >= 0);
        all[all.length - 1]?.focus({ preventScroll: true });
      });
      let checked = 0;
      for (let i = 0; i < STEPS; i++) {
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(120);
        const c = await focusedCoverage(page);
        if (!c) break;
        checked++;
        expect(c.hit, `Shift+Tab step ${i + 1} on ${route}: ${JSON.stringify(c)}`).toBe(true);
      }
      expect(checked, 'at least some focus stops were checked').toBeGreaterThan(5);
    });

    test('Tab down the page never lands a link under a fixed bar', async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const all = Array.from(
          document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea'),
        ).filter((e) => e.offsetParent !== null && e.getBoundingClientRect().top > 0);
        all[0]?.focus({ preventScroll: true });
      });
      let checked = 0;
      for (let i = 0; i < STEPS; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(120);
        const c = await focusedCoverage(page);
        if (!c) break;
        checked++;
        expect(c.hit, `Tab step ${i + 1} on ${route}: ${JSON.stringify(c)}`).toBe(true);
      }
      expect(checked, 'at least some focus stops were checked').toBeGreaterThan(5);
    });
  });
}

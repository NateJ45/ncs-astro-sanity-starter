import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../src/data/site';

// =============================================================================
// The popup's guard rails (PORTS.md card 170; src/components/SitePopup.astro)
// =============================================================================
// Drives /styleguide/popup/ (src/pages/styleguide/popup.astro), SitePopup with fixed words.
// The clock is Playwright's, so "4 seconds" costs nothing. Pins: it never opens before 4 s or
// before a quarter screen of scroll; it opens as a modal with focus on Close; Tab stays inside;
// Escape closes it and focus goes back; it is remembered (no second showing on reload); it
// passes axe in light and dark; it fits a 320px screen; it never shows in print; a page with
// no popup (and the Studio) carries no popup markup.
// =============================================================================

const ROUTE = '/styleguide/popup/';
const TITLE = 'Holiday hours';
type Page = import('@playwright/test').Page;
const isOpen = (page: Page) =>
  page.evaluate(() => !!document.querySelector<HTMLDialogElement>('dialog[data-popup]')?.open);

async function openIt(page: Page) {
  await page.goto(ROUTE, { waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.clock.runFor(5000);
  expect(await isOpen(page)).toBe(true);
}

test.describe('popup', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  test('waits for 4 seconds AND a little scroll, then opens with focus on Close', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'load' });
    await page.clock.runFor(6000);
    expect(await isOpen(page), 'time alone does not open it').toBe(false);

    await page.goto(ROUTE, { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.clock.runFor(1500);
    expect(await isOpen(page), 'scroll alone, before 4 s, does not open it').toBe(false);

    await page.clock.runFor(3500);
    await expect(page.getByRole('dialog', { name: TITLE })).toBeVisible();
    await expect(page.locator('[data-popup-close]')).toBeFocused();
    await expect(page.getByRole('link', { name: 'See the details' })).toHaveAttribute(
      'href',
      '/contact/',
    );
  });

  test('Tab stays inside, Escape closes it, focus returns, and it is not shown again', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'load' });
    await page.locator('#opener-link').focus();
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.clock.runFor(5000);
    expect(await isOpen(page)).toBe(true);

    // Close -> the button -> Close, and backwards.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'See the details' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-popup-close]')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'See the details' })).toBeFocused();

    await page.keyboard.press('Escape');
    expect(await isOpen(page)).toBe(false);
    await expect(page.locator('#opener-link')).toBeFocused();

    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.clock.runFor(6000);
    expect(await isOpen(page), 'remembered for this visitor').toBe(false);
  });

  test('the Close button closes it', async ({ page }) => {
    await openIt(page);
    await page.locator('[data-popup-close]').click();
    expect(await isOpen(page)).toBe(false);
  });

  test('the open popup passes axe in light', async ({ page }) => {
    await openIt(page);
    const results = await new AxeBuilder({ page }).include('dialog[data-popup]').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('the open popup passes axe in dark', async ({ page }) => {
    await page.addInitScript(
      (key) => window.localStorage.setItem(key, 'dark'),
      site.themeStorageKey,
    );
    await openIt(page);
    const results = await new AxeBuilder({ page }).include('dialog[data-popup]').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('fits a 320px screen without sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openIt(page);
    const fit = await page.evaluate(() => {
      const box = document.querySelector('dialog[data-popup]')!.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        width: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
      };
    });
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeLessThanOrEqual(fit.width);
    expect(fit.scroll).toBeLessThanOrEqual(fit.width);
  });

  test('never shows in print', async ({ page }) => {
    await openIt(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('dialog[data-popup]')).toBeHidden();
  });

  test('no popup markup on a page without one, or on the Studio', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('dialog[data-popup]')).toHaveCount(0);
    await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('dialog[data-popup]')).toHaveCount(0);
  });
});

test.describe('popup under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('opens without animating', async ({ page }) => {
    await page.clock.install();
    await openIt(page);
    const anim = await page.evaluate(
      () => getComputedStyle(document.querySelector('dialog[data-popup]')!).animationName,
    );
    expect(anim).toBe('none');
  });
});

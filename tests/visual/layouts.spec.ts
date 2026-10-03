/* ============================================================================
   Visual regression - the layout variants wall (PORTS.md card 72)
   ============================================================================
   One baseline per slot value per viewport (390 and 1280), shot from
   /styleguide/layouts/. Read tests/visual/styleguide.spec.ts and
   playwright.visual.config.ts first: the same rules apply (Linux baselines are
   generated in CI, the suite skips itself on win32, baselines are refreshed only
   when a visual change is intended).

   HOW THE VARIANTS ARE REACHED. Header, density and cards are CSS keyed on a
   data-* attribute on <html>, which BaseLayout emits from brand.config.json at
   build time. Setting the same attribute here exercises the CSS a configured
   site ships. The hero is a per-section variant, so the page renders all three.
   ============================================================================ */
import { test, expect, type Page } from '@playwright/test';
import { LAYOUT_SLOTS } from '../../src/lib/site-layout';

const WINDOWS_SKIP =
  process.platform === 'win32' && !process.env.VISUAL_FORCE
    ? 'Baselines are Linux-rendered; run in CI (.github/workflows/visual.yml) or set VISUAL_FORCE=1.'
    : null;
test.skip(() => WINDOWS_SKIP !== null, WINDOWS_SKIP ?? '');

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 800 },
];

async function open(page: Page, attrs: Record<string, string> = {}) {
  // The hero image is a fake Sanity reference; answer the CDN with a local file.
  await page.route('**/cdn.sanity.io/**', (route) =>
    route.fulfill({ path: 'tests/visual/fixtures/layout-hero.jpg', contentType: 'image/jpeg' }),
  );
  await page.goto('/styleguide/layouts/', { waitUntil: 'networkidle' });
  await page.evaluate((a) => {
    for (const [k, v] of Object.entries(a)) document.documentElement.setAttribute(k, v);
  }, attrs);
  // Element shots scroll the page; a sticky header and the floating back-to-top
  // button would paint over the region under test, so take them out of flow.
  await page.addStyleTag({
    content:
      'header.site-header{position:static!important}[aria-label="Back to top"]{display:none!important}',
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
  test.describe(`layouts @${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const v of LAYOUT_SLOTS.hero) {
      test(`hero ${v}`, async ({ page }) => {
        await open(page);
        await expect(page.locator(`[data-fx="hero-${v}"]`)).toHaveScreenshot(
          `hero-${v}-${vp.name}.png`,
        );
      });
    }

    for (const v of LAYOUT_SLOTS.header) {
      test(`header ${v}`, async ({ page }) => {
        await open(page, { 'data-header': v });
        await expect(page.locator('header.site-header')).toHaveScreenshot(
          `header-${v}-${vp.name}.png`,
        );
      });
    }

    for (const v of LAYOUT_SLOTS.cards) {
      test(`cards ${v}`, async ({ page }) => {
        await open(page, { 'data-cards': v });
        await expect(page.locator('[data-fx="body"] section').first()).toHaveScreenshot(
          `cards-${v}-${vp.name}.png`,
        );
      });
    }

    for (const v of LAYOUT_SLOTS.density) {
      test(`density ${v}`, async ({ page }) => {
        await open(page, { 'data-density': v });
        await expect(page.locator('[data-fx="body"]')).toHaveScreenshot(
          `density-${v}-${vp.name}.png`,
        );
      });
    }
  });
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import { routes, hiddenRoutes } from './routes';
import { site } from '../src/data/site';

// =============================================================================
// Smoke: every route builds and renders (not a 404 or an error page)
// =============================================================================
// The title check reads site.name rather than a literal, so `npm run
// apply-brand` cannot leave this suite asserting the previous project's name.
//
// `waitUntil: 'domcontentloaded'`, never 'load'. A page carrying a WebM-first
// <video> never fires `load` in WebKit, and the run hangs until the test times
// out with nothing useful in the report.
// =============================================================================

const titlePattern = new RegExp(site.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

test.describe('Smoke: every content route renders', () => {
  for (const route of routes) {
    test(`${route} returns 200 and renders`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${route} HTTP status`).toBe(200);
      // A real rendered page (every title carries the site name), not a blank
      // or error body.
      await expect(page).toHaveTitle(titlePattern);
    });
  }
});

// Routes whose section is switched off in Sanity are baked as a meta-refresh
// stub pointing at "/" (see routes.ts). They must still answer 200, and the
// title is either the stub's own or, once the refresh has fired, the home
// page's. Either proves the file exists and is not an error page.
test.describe('Smoke: every hidden route still answers', () => {
  for (const route of hiddenRoutes) {
    test(`${route} returns 200 (redirect stub)`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${route} HTTP status`).toBe(200);
      await expect(page).toHaveTitle(new RegExp(`Redirecting to: /|${titlePattern.source}`));
    });
  }
});

// GA4 must never fire off the production hostname (PORTS.md card 58). CI
// builds without PUBLIC_GA_ID, so there this passes trivially; it bites on the
// local run whose .env carries the id, which is exactly how reid-design-site
// filed 470 fake localhost sessions into its live property.
test('GA4 sends nothing from localhost, even when the id is built in', async ({ page }) => {
  const gaRequests: string[] = [];
  page.on('request', (req) => {
    if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) gaRequests.push(req.url());
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  expect(gaRequests, 'requests to Google Analytics from localhost').toEqual([]);
  expect(await page.evaluate(() => typeof (window as { dataLayer?: unknown }).dataLayer)).toBe(
    'undefined',
  );
});

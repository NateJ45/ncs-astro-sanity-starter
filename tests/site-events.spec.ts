import { test, expect, type Page } from './fixtures';
import { settle } from './helpers';

// =============================================================================
// Visitor actions sent to GA4 (PORTS.md card 217)
// =============================================================================
// src/components/analytics/SiteEvents.astro reads a clicked link's address and
// sends a named event, using the starter's EMPTY events map (src/config/events.ts),
// so only the built-in rules run. The real tag never loads under Playwright
// (navigator.webdriver), so each test stubs window.gtag before the page runs and
// reads the calls back. Links are clicked with navigation cancelled, so nothing
// leaves the site. A fork that fills its map pins its own rules here.
// =============================================================================

type Call = [string, string, Record<string, unknown>];

async function stub(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { gtag: (...a: unknown[]) => void; __calls: unknown[][] };
    w.__calls = [];
    w.gtag = (...a: unknown[]) => void w.__calls.push(a);
  });
}

async function events(page: Page): Promise<Call[]> {
  return page.evaluate(() =>
    (window as unknown as { __calls: Call[] }).__calls.filter((c) => c[0] === 'event'),
  );
}

/** Put a link on the page, click it with navigation cancelled, return the events. */
async function clickLink(page: Page, href: string, where = 'main') {
  await page.evaluate(
    ({ href, where }) => {
      document.addEventListener('click', (e) => e.preventDefault());
      const a = document.createElement('a');
      a.href = href;
      a.textContent = 'test link';
      a.id = 'probe';
      a.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;padding:12px;background:#fff';
      (document.querySelector(where) ?? document.body).append(a);
    },
    { href, where },
  );
  await page.locator('#probe').evaluate((a) => (a as HTMLElement).click());
  return events(page);
}

test.describe('site events', () => {
  test.beforeEach(async ({ page }) => {
    await stub(page);
    await page.goto('/');
    await settle(page);
  });

  const cases: [string, string, string, Record<string, unknown>][] = [
    ['email', 'mailto:someone@example.org', 'contact_click', { method: 'email' }],
    ['phone', 'tel:+15555550100', 'contact_click', { method: 'phone' }],
    ['map', 'https://www.google.com/maps/search/?api=1&query=x', 'directions_click', {}],
    ['video', 'https://www.youtube.com/watch?v=abc', 'watch_click', { destination: 'video' }],
    ['file', '/files/guide.pdf', 'download_click', { file_extension: 'pdf' }],
    ['other site', 'https://example.com/a', 'outbound_click', { destination: 'example.com' }],
  ];

  for (const [name, href, event, params] of cases) {
    test(`${name} sends ${event}`, async ({ page }) => {
      const calls = await clickLink(page, href);
      const hit = calls.find((c) => c[1] === event);
      expect(hit, JSON.stringify(calls)).toBeTruthy();
      expect(hit![2]).toMatchObject(params);
    });
  }

  test('an ordinary internal link sends nothing', async ({ page }) => {
    expect(await clickLink(page, '/about/')).toEqual([]);
  });

  test('the address of an email link is never sent', async ({ page }) => {
    const calls = await clickLink(page, 'mailto:someone@example.org');
    expect(JSON.stringify(calls)).not.toContain('someone');
  });

  test('a link in the footer says so', async ({ page }) => {
    const calls = await clickLink(page, 'tel:+15555550100', 'footer');
    expect(calls[0][2]).toMatchObject({ method: 'phone', location: 'footer' });
  });
});

test('a missing page sends page_not_found with the path', async ({ page }) => {
  await stub(page);
  await page.goto('/no-such-page-xyz/');
  await settle(page);
  const calls = await events(page);
  const hit = calls.find((c) => c[1] === 'page_not_found');
  expect(hit, JSON.stringify(calls)).toBeTruthy();
  expect(hit![2]).toMatchObject({ missing_path: '/no-such-page-xyz/' });
});

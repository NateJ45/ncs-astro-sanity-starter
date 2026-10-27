import { test, expect } from './fixtures';

// =============================================================================
// Opening hours and the map in a real browser (PORTS.md card 196)
// =============================================================================
// /styleguide/sections/ draws the Opening hours and Map blocks with made-up
// facts: Monday to Friday 9 to 5, Saturday 10 to 2, and a closure ten days after
// the build. The browser's clock is fixed, so these pin what node --test cannot:
// the live "Open now" line on the site's time zone (America/New_York), today's
// row, and a past change disappearing without a rebuild. The rules themselves
// are pinned in src/lib/business-hours.test.ts.
// =============================================================================

const box = (type: string) => `[data-section-type="${type}"]`;
const DAY = 86_400_000;

test.describe('Opening hours and map blocks', () => {
  test('a Wednesday morning reads open until 5 pm, on the Monday to Friday row', async ({
    page,
  }) => {
    // 16:00 UTC on Wednesday 15 January 2025 is 11 am in New York.
    await page.clock.setFixedTime(new Date('2025-01-15T16:00:00Z'));
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
    const hours = page.locator(box('hoursSection'));
    const status = hours.locator('[data-biz-status]');
    await expect(status).toHaveAttribute('data-open', 'true');
    await expect(status).toContainText('Open now');
    await expect(status).toContainText('until 5 pm');
    await expect(hours.locator('[data-biz-days="1,2,3,4,5"]')).toHaveAttribute(
      'data-today',
      'true',
    );
    await expect(hours.getByText('Staff holiday')).toBeVisible();
  });

  test('a Saturday afternoon names Monday as the next opening', async ({ page }) => {
    // 20:00 UTC on Saturday 18 January 2025 is 3 pm in New York.
    await page.clock.setFixedTime(new Date('2025-01-18T20:00:00Z'));
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
    const status = page.locator(`${box('hoursSection')} [data-biz-status]`);
    await expect(status).toHaveAttribute('data-open', 'false');
    await expect(status).toContainText('Closed now');
    await expect(status).toContainText('Opens Monday at 9 am');
  });

  test('a change whose day has passed is gone without a rebuild', async ({ page }) => {
    await page.clock.setFixedTime(new Date(Date.now() + 20 * DAY));
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`${box('hoursSection')} [data-biz-changes]`)).toBeHidden();
  });

  test('the map card has the address and both directions links', async ({ page }) => {
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
    const map = page.locator(box('mapSection'));
    await expect(map.locator('address')).toContainText('12 Main Street');
    await expect(map.locator('address')).toContainText('Hamilton, OH 45013');
    await expect(map.getByRole('link', { name: /Directions/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=12%20Main%20Street%2C%20Hamilton%2C%20OH%2C%2045013',
    );
    await expect(map.getByRole('link', { name: /Apple Maps/ })).toHaveAttribute(
      'href',
      /^https:\/\/maps\.apple\.com\/\?q=12%20Main/,
    );
  });
});

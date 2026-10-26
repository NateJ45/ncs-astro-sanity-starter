import { test, expect } from './fixtures';

// =============================================================================
// The builder kit in a real browser (PORTS.md card 173)
// =============================================================================
// /styleguide/sections/ draws one of every builder-kit block with fixed data
// (dated ones relative to the build day). These drive what node --test cannot:
// the tabs' keyboard pattern, the fold-outs, the event's calendar file and
// structured data, the countdown's browser recount and the dated notice.
// The pure logic is pinned in src/lib/builder-blocks.test.ts.
// =============================================================================

const box = (type: string) => `[data-section-type="${type}"]`;

test.describe('Builder kit blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
  });

  test('tabs become a tab list that the arrow keys move through', async ({ page }) => {
    const tabs = page.locator(`${box('tabsSection')} [role="tab"]`);
    await expect(tabs).toHaveCount(3);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    const panels = page.locator(`${box('tabsSection')} [role="tabpanel"]`);
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).toBeVisible();
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('a fold-out question opens to its answer', async ({ page }) => {
    const item = page.locator(`${box('accordionSection')} details`).first();
    await expect(item.locator('.bb-accordion__answer')).toBeHidden();
    await item.locator('summary').click();
    await expect(item.locator('.bb-accordion__answer')).toBeVisible();
  });

  test('event details: calendar file, directions and Event structured data', async ({ page }) => {
    const event = page.locator(box('eventDetailsSection'));
    const cal = event.getByRole('link', { name: 'Add to my calendar' });
    const href = (await cal.getAttribute('href')) ?? '';
    expect(href.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    const ics = decodeURIComponent(href.slice(href.indexOf(',') + 1));
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain('LOCATION:The community hall\\, 123 Main Street\\, Springfield');
    await expect(cal).toHaveAttribute('download', 'summer-open-house.ics');
    await expect(event.getByRole('link', { name: /Directions/ })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
    const ld = JSON.parse(
      (await event.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(ld['@graph']).toHaveLength(2);
    expect(ld['@graph'][0]['@type']).toBe('Event');
    expect(ld['@graph'][0].location.name).toBe('The community hall');
  });

  test('the countdown shows days to go, and the dated notice shows', async ({ page }) => {
    const count = page.locator(`${box('countdownSection')} [data-days]`);
    await expect(count).toBeVisible();
    expect(Number(await count.textContent())).toBeGreaterThan(0);
    const notice = page.locator(`${box('noticeSection')} aside`);
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: '(555) 555-0100' })).toHaveAttribute(
      'href',
      'tel:+15555550100',
    );
  });
});

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

  // ── Card 193 ──────────────────────────────────────────────────────────────

  test('contact card: big Call and Email buttons, details and directions', async ({ page }) => {
    const card = page.locator(box('contactCardSection'));
    const buttons = card.locator('[data-call-buttons] a');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveAttribute('href', 'tel:5555550100');
    await expect(buttons.nth(1)).toHaveAttribute('href', 'mailto:hello@example.com');
    expect((await buttons.first().boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByRole('link', { name: /Get directions/ })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
  });

  test('progress: one progressbar with a spoken value and twenty steps', async ({ page }) => {
    const bar = page.locator(`${box('progressSection')} [role="progressbar"]`);
    await expect(bar).toHaveAttribute('aria-valuenow', '65');
    await expect(bar).toHaveAttribute('aria-valuetext', '$32,500 of $50,000, 65 percent');
    await expect(bar.locator('.bb-progress__step')).toHaveCount(20);
  });

  test('newsletter and calendar blocks link out safely', async ({ page }) => {
    await expect(
      page
        .locator(box('newsletterSection'))
        .getByRole('link', { name: /Sign up for the newsletter/ }),
    ).toHaveAttribute('href', 'https://example.com/subscribe');
    const subscribe = page.locator(`${box('calendarSubscribeSection')} [data-bb-subscribe] a`);
    await expect(subscribe).toHaveCount(3);
    await expect(subscribe.nth(1)).toHaveAttribute(
      'href',
      'webcal://example.com/calendar/events.ics',
    );
    await expect(subscribe.first()).toHaveAttribute('rel', /noopener/);
  });

  test('icon cards and the steps rail: icons, numbered steps, one list each', async ({ page }) => {
    const cards = page.locator(`${box('iconCardsSection')} .bb-icard`);
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator('svg.bb-icon')).toHaveCount(1);
    const steps = page.locator(`${box('stepsRailSection')} ol > li`);
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(2).locator('.bb-rail__n')).toHaveText('Step 3');
    await expect(steps.nth(2).locator('.bb-rail__trail')).toHaveCount(0);
  });

  test('hub: the index jumps to a group and follows the scroll', async ({ page }) => {
    const hub = page.locator(box('hubSection'));
    const jumps = hub.locator('[data-hub-jump]');
    await expect(jumps).toHaveCount(3);
    await expect(jumps.first()).toHaveAttribute('aria-current', 'true');
    const target = (await jumps.nth(2).getAttribute('href')) ?? '';
    await jumps.nth(2).click();
    await expect(page.locator(target)).toBeInViewport();
    await expect(jumps.nth(2)).toHaveAttribute('aria-current', 'true');
    // The card with a link is one big tap target: its link covers the card.
    await expect(hub.locator('.bb-hcard.bb-stretch').first().locator('a')).toHaveCount(1);
  });
});

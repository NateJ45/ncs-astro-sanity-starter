// A noindex page carries no canonical link (PORTS.md card 159): "do not index this" and "this
// is the address to index" contradict each other. Safe to edit by hand.
import { test, expect } from './fixtures';

test('the 404 page is noindex and has no canonical', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('an indexable page keeps its canonical', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
});

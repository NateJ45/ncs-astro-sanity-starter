// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle } from './helpers';

// Accessibility (axe-core), light mode, every route. Zero violations.
//
// Tagged WCAG 2.0 A/AA, 2.1 A/AA and 2.2 AA plus best-practice, so the 2.2 rules (target-size,
// 2.5.8) run by name instead of depending on axe's default set (a WCAG 2.2 sweep on
// 2026-11-08 found failures the old untagged run never reported). A rule added by an axe upgrade under one of these
// tags is enforced the day it lands. Exclude a rule only with a comment saying which false
// positive it is.

for (const route of routes) {
  test(`a11y (light): ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    if (results.violations.length > 0) {
      const report = results.violations
        .map((v) => {
          const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
          return `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    route: ${route}\n    selectors: ${targets}`;
        })
        .join('\n');
      expect(results.violations, `axe violations on ${route}:\n${report}`).toEqual([]);
    }
  });
}

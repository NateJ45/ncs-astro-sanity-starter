// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle } from './helpers';

// Accessibility (axe-core), light mode, every route. Zero violations.
//
// No `.withTags(...)`: the suite runs whatever axe-core ships as its standard
// set rather than a hand-picked subset, so a rule added by an axe upgrade
// starts being enforced the day it lands. Exclude a rule only with a comment
// saying which false positive it is.

for (const route of routes) {
  test(`a11y (light): ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settle(page);

    const results = await new AxeBuilder({ page }).analyze();

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

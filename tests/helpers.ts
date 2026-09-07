// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import type { Page } from '@playwright/test';

// Settles a page before a11y or reflow assertions run: waits for webfonts (or a
// 5s timeout, whichever comes first), kills transitions and animations so
// scroll-reveal and hover states do not flake the run, and force-reveals every
// element the polish layer only shows once it crosses the viewport.
//
// BaseLayout's polish script runs FOUR IntersectionObservers, not one, and each
// gates a different thing on a different class. Without all four, offscreen
// content stays opacity:0 or mid-transform and both axe and the reflow measure
// would be reading a DOM the visitor never sees. If a site adds a fifth
// observer, add its selector and class here in the same commit.
const REVEALS: Array<[selector: string, className: string]> = [
  ['[data-reveal]', 'is-visible'],
  ['[data-stagger-grid]', 'is-staggered'],
  ['.img-curtain', 'is-revealed'],
  ['.step-connector', 'is-visible'],
];

export async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(true), 5000)),
    ]),
  );
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
  await page.evaluate((reveals) => {
    for (const [selector, className] of reveals) {
      document.querySelectorAll(selector).forEach((el) => el.classList.add(className));
    }
  }, REVEALS);
}

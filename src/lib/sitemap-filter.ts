// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// sitemap-filter - which built pages go in sitemap.xml (PORTS.md card 122)
// =============================================================================
// Lifted out of astro.config.mjs so it has a test (src/lib/sitemap-filter.test.ts).
// A page stays OUT of the sitemap when it is Studio plumbing (/studio, /preview),
// a page for nobody (/404, the /styleguide wall), a password page (/private,
// which is never built anyway), the newsletter's link pages (/email, card 127)
// or a custom page the editor hid from Google and the menus (page.hideFromSearch,
// read at build time into `hiddenPaths`).
// =============================================================================

/** Path prefixes that never belong in a sitemap. */
// '/search' is the visitor search page (card 126): noindex, nothing of its own for Google.
export const SITEMAP_EXCLUDED_PREFIXES = [
  '/404',
  '/studio',
  '/preview',
  '/styleguide',
  '/private',
  '/search',
  '/email',
];

/**
 * True when `page` (a full URL, as @astrojs/sitemap hands it over) belongs in
 * the sitemap. `hiddenPaths` holds "/slug" paths with no trailing slash.
 */
export function isSitemapPage(page: string, hiddenPaths: ReadonlySet<string>): boolean {
  let path: string;
  try {
    path = new URL(page).pathname;
  } catch {
    return true;
  }
  const bare = path.replace(/\/+$/, '');
  if (SITEMAP_EXCLUDED_PREFIXES.some((p) => bare === p || bare.startsWith(`${p}/`))) return false;
  return !hiddenPaths.has(bare);
}

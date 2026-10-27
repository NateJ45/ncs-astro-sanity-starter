// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// published-links: link a Studio-made page only while it is published (card 187)
// =============================================================================
// Code that hard-codes a link to a page the EDITOR makes in the Studio (a
// "Pricing" row in a footer strip, a "Watch" fallback in an empty state) points
// at nothing the moment that page is renamed, archived or unpublished, and in
// CI, which builds without the dataset, it was a broken link from day one.
//
// The rule: a row that names a Studio page carries `studio: '<slug>'`, and the
// caller filters the rows through this helper with the published slugs
// (getAllPageSlugs(), src/lib/queries.ts). Rows with no `studio` key are the
// site's own routes and always exist. Pure, so it is unit-tested.
// =============================================================================

export interface LinkRow {
  href: string;
  /** The slug of the Studio page this row points at, when the editor owns that page. */
  studio?: string;
}

/** True when the row points at a site route, or at a Studio page that is published. */
export function isLinkable(row: LinkRow, publishedSlugs: Iterable<string>): boolean {
  if (!row.studio) return true;
  return new Set(publishedSlugs).has(row.studio);
}

const withSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

/**
 * The first `max` rows that exist and are not the page being viewed, in the
 * order given. `here` is the current page path (use publicPath() so the draft
 * preview behaves like the live site).
 */
export function linkableRows<T extends LinkRow>(
  rows: readonly T[],
  here: string,
  publishedSlugs: Iterable<string>,
  max = rows.length,
): T[] {
  const slugs = new Set(publishedSlugs);
  const current = withSlash(here);
  return rows
    .filter((row) => withSlash(row.href) !== current && isLinkable(row, slugs))
    .slice(0, max);
}

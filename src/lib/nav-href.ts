// Foundation, edit with care
// The ONE place a Sanity `navLink` becomes an href.
//
// Menus (header, footer columns, the legal row, the header CTA) all flow
// through here, so a page type maps to a route in exactly one table. The paths
// mirror the PREVIEW paths in src/sanity/resolve.ts (SINGLETON_PREVIEW_PATHS)
// with the /preview prefix removed, and pathForDoc() in src/sanity/urls.ts —
// keep the three in sync when a route moves.
//
// Precedence inside one link:
//   1. `href`, the hand-typed address. It is what every menu item written
//      before the picker existed carries, so it wins and today's menus render
//      unchanged.
//   2. the picked page (linkType "internal"), resolved from the DEREFERENCED
//      document type + slug, never from the reference itself.
//   3. the pasted web address (linkType "external").
//
// A link that resolves to nothing (a reference to a deleted page, an empty
// address) returns undefined and the caller DROPS it. A dead <a> in a menu is
// worse than a missing one.

/** Live route per path-mapped singleton. Mirrors SINGLETON_PREVIEW_PATHS. */
export const SINGLETON_LIVE_PATHS: Record<string, string> = {
  homePage: '/',
  aboutPage: '/about',
  servicesPage: '/services',
  processPage: '/process',
  faqPage: '/faq',
  contactPage: '/contact',
  journalPage: '/journal',
  privacyPage: '/privacy',
  notFoundPage: '/404',
};

/** One navLink as it comes back from NAV_LINK_PROJECTION in src/lib/queries.ts. */
export interface RawNavLink {
  _type?: string | null;
  _key?: string | null;
  label?: string | null;
  linkType?: string | null;
  /** Hand-typed address (legacy, still authoritative when set). */
  href?: string | null;
  externalUrl?: string | null;
  /** internalPage->slug.current */
  slug?: string | null;
  /** internalPage->_type */
  docType?: string | null;
}

/** A link that survived resolution: both halves present. */
export interface ResolvedNavLink {
  label: string;
  href: string;
}

/**
 * Strip the invisible characters Sanity's stega encoder hides inside strings in
 * preview builds (Unicode tag characters, plus the zero-width family). Labels
 * keep theirs — that is what makes click-to-edit work — but anything used as
 * LOGIC or as a URL must be compared and emitted clean.
 */
export function plain(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u200B-\u200F\uFEFF\u{E0000}-\u{E007F}]/gu, '').trim();
}

/** Work out where one link points, or undefined when it points nowhere. */
export function navHref(link?: RawNavLink | null): string | undefined {
  if (!link) return undefined;

  const typed = plain(link.href);
  if (typed) return typed;

  if (plain(link.linkType) === 'external') {
    return plain(link.externalUrl) || undefined;
  }

  const docType = plain(link.docType);
  if (!docType) return undefined;
  if (docType === 'page') {
    const slug = plain(link.slug);
    return slug ? `/${slug}` : undefined;
  }
  return SINGLETON_LIVE_PATHS[docType];
}

/**
 * Map a Sanity link array to renderable {label, href} pairs, dropping every
 * entry that is missing a label or resolves to nothing. Labels are passed
 * through untouched so stega click-to-edit still works in the preview.
 */
export function resolveNavLinks(links?: (RawNavLink | null)[] | null): ResolvedNavLink[] {
  if (!Array.isArray(links)) return [];
  const out: ResolvedNavLink[] = [];
  for (const link of links) {
    const label = link?.label;
    const href = navHref(link);
    if (!label || !href) continue;
    out.push({ label, href });
  }
  return out;
}

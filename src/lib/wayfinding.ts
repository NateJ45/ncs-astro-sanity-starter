// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// wayfinding: the four "where do I go now" pieces of the chrome (PORTS.md card 191)
// =============================================================================
// Ported from FBC Auburn (2026-10-24 to 10-26). Every piece is OPT-IN from
// Site settings, so a site that never fills the boxes renders exactly what it
// did before:
//
//   1. Where next      three big rows at the top of the footer, so no page ends
//                      at a dead end. The page you are on drops out and the
//                      next row moves up; a row that points at a Studio page
//                      shows only while that page is published.
//   2. Phone menu      the phone menu in labelled groups ("New here", "Get
//      groups          involved") with big display-font rows. No groups = the
//                      menu's usual list.
//   3. Footer style    "compact": the brand row on top and the link groups in a
//                      2x2 grid on phones. Unset = the usual columns.
//   4. Action bar      a sticky phone bar: one line of information and one
//                      button, chosen per page (or for every page). No bar for
//                      a page = nothing drawn.
//
// The resolvers are pure so they are unit-tested (wayfinding.test.ts); the
// components (WhereNext.astro, MobileNav.astro, Footer.astro, ActionBar.astro)
// only render what comes back.
// =============================================================================

import {
  navHref,
  plain,
  resolveNavLinks,
  type RawNavLink,
  type ResolvedNavLink,
} from './nav-href.ts';
import { linkableRows, type LinkRow } from './published-links.ts';
import { isReservedSlug } from './reservedSlugs.ts';

const withSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

// ---- 1. Where next ---------------------------------------------------------

/** One Site settings > Where next row, as SITE_SETTINGS_PROJECTION returns it. */
export interface RawWhereNextRow {
  _key?: string | null;
  link?: RawNavLink | null;
  /** The small line under the label ("Your first visit"). */
  note?: string | null;
}

export interface WhereNextRow extends LinkRow {
  label: string;
  note: string;
}

/**
 * The Studio page a link points at, if any: a picked page, or a typed one-segment
 * address (`/pricing/`) that no route of the site's own serves. Site routes
 * (reservedSlugs.ts) always exist; a Studio page only while it is published.
 */
export function studioSlugOf(
  link: RawNavLink | null | undefined,
  href: string,
): string | undefined {
  if (plain(link?.docType) === 'page') return plain(link?.slug) || undefined;
  const m = /^\/([^/?#]+)\/?(?:[?#].*)?$/.exec(href);
  if (!m || plain(link?.linkType) === 'external' || m[1].includes('.')) return undefined;
  return isReservedSlug(m[1]) ? undefined : m[1];
}

/**
 * The rows to draw: the first `max` that resolve, exist and are not the page
 * being viewed (`here`, a publicPath()), in the editor's order.
 */
export function whereNextRows(
  raw: readonly (RawWhereNextRow | null)[] | null | undefined,
  here: string,
  publishedSlugs: Iterable<string>,
  max = 3,
): WhereNextRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: WhereNextRow[] = [];
  for (const row of raw) {
    const label = row?.link?.label;
    const href = navHref(row?.link);
    if (!label || !href) continue;
    rows.push({
      label,
      href,
      note: row?.note ?? '',
      studio: href.startsWith('/') ? studioSlugOf(row?.link, href) : undefined,
    });
  }
  return linkableRows(rows, here, publishedSlugs, max);
}

// ---- 2. Phone menu groups --------------------------------------------------

/** One Site settings > Phone menu groups entry. */
export interface RawPhoneMenuGroup {
  _key?: string | null;
  title?: string | null;
  links?: (RawNavLink | null)[] | null;
}

export interface PhoneMenuGroup {
  title: string;
  links: ResolvedNavLink[];
}

/**
 * The groups to draw, each with its links resolved. A group with no title or
 * no working link is dropped. `skipHref` (the menu's own button) is left out of
 * the rows so the same page is never offered twice. An empty result means "use
 * the menu's usual list".
 */
export function phoneMenuGroups(
  raw: readonly (RawPhoneMenuGroup | null)[] | null | undefined,
  skipHref?: string,
): PhoneMenuGroup[] {
  if (!Array.isArray(raw)) return [];
  const skip = skipHref ? withSlash(plain(skipHref)) : null;
  const out: PhoneMenuGroup[] = [];
  for (const group of raw) {
    const title = group?.title;
    if (!title || !plain(title)) continue;
    const links = resolveNavLinks(group?.links).filter((l) => !skip || withSlash(l.href) !== skip);
    if (links.length > 0) out.push({ title, links });
  }
  return out;
}

// ---- 3. Footer style -------------------------------------------------------

export type FooterStyle = 'columns' | 'compact';

/** Site settings > Footer style. Anything but "compact" is the usual columns. */
export function footerStyle(raw: string | null | undefined): FooterStyle {
  return plain(raw) === 'compact' ? 'compact' : 'columns';
}

// ---- 4. Action bar ---------------------------------------------------------

/** One Site settings > Phone action bar entry. */
export interface RawActionBar {
  _key?: string | null;
  /** Show on every page that has no bar of its own. */
  everyPage?: boolean | null;
  /** The page this bar belongs to, dereferenced like a navLink's page. */
  page?: { docType?: string | null; slug?: string | null; archived?: boolean | null } | null;
  /** The one line of information ("Open today 9 to 5"). */
  text?: string | null;
  /** The one button. */
  action?: RawNavLink | null;
}

export interface ActionBar {
  text: string;
  label: string;
  href: string;
}

/**
 * The bar for the page at `here` (a publicPath()): the bar picked for this
 * page, else the first "every page" bar, else none. A bar whose button would
 * point at the page you are on is not drawn.
 */
export function pickActionBar(
  raw: readonly (RawActionBar | null)[] | null | undefined,
  here: string,
): ActionBar | null {
  if (!Array.isArray(raw)) return null;
  const current = withSlash(here);
  const usable = raw
    .map((bar) => {
      const label = bar?.action?.label;
      const href = navHref(bar?.action);
      if (!bar || !label || !href) return null;
      const pagePath = bar.everyPage
        ? null
        : navHref({
            docType: bar.page?.docType,
            slug: bar.page?.slug,
            pageArchived: bar.page?.archived,
          });
      return { bar, label, href, pagePath };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
  const own = usable.find((b) => b.pagePath && withSlash(b.pagePath) === current);
  const chosen = own ?? usable.find((b) => b.bar.everyPage === true);
  if (!chosen) return null;
  if (chosen.href.startsWith('/') && withSlash(chosen.href.split(/[?#]/)[0]) === current) {
    return null;
  }
  return { text: chosen.bar.text ?? '', label: chosen.label, href: chosen.href };
}

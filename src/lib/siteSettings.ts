// Foundation, edit with care
// Single source of truth for resolving the Sanity siteSettings document into
// the CHROME values the header, the mobile drawer, and the footer render: the
// top menu, the footer link columns, the small-print row, the header button,
// the logo, and the three "show this bit of contact detail" switches.
//
// Why this exists: the header and the footer each used to carry their own
// FALLBACK_* table and their own "map Sanity into the render shape" function.
// Two copies of "what the menu is when Sanity is empty" is a drift trap: change
// the header menu and the footer quietly disagrees. Now there is one, and a
// component reads settings.headerNav / settings.footerColumns /
// settings.legalNav / settings.headerCta and renders.
//
// Rule: NO component re-implements a menu fallback. There is exactly one place
// (here) that decides what each chrome field resolves to.
//
//   - Menus that have a single built-in shape (the top menu, the header button)
//     resolve to that built-in when Sanity is empty, so the caller can render
//     one loop with no branch.
//   - Menus whose built-in version is BESPOKE MARKUP rather than data (the
//     footer's Studio/Work/Free-tools columns, each with its own per-link
//     visibility flags; the small-print row, whose links carry different link
//     styles) resolve to an EMPTY array when Sanity is empty. The component
//     keeps its own built-in markup for that case and only switches to the
//     mapped list once an editor fills the field in. Flattening those into data
//     would change the rendered bytes of an untouched site.
//   - The three switches read "unset means yes", so a site that has never
//     touched them is unchanged.
//
// Identity / contact / social fields are deliberately NOT resolved here yet:
// the starter's Header and Footer still read them straight off the raw
// document. Porting those is a separate change (see PORTS.md card 18).

import { navHref, resolveNavLinks, type RawNavLink, type ResolvedNavLink } from '@/lib/nav-href';
import { getSectionVisibility, type SectionVisibility } from '@/lib/sectionVisibility';

/** One header menu entry: a plain link, or a dropdown group of links. */
export type NavItem =
  | { kind: 'flat'; label: string; href: string }
  | { kind: 'dropdown'; label: string; items: ResolvedNavLink[] };

/** One titled column of footer links. */
export interface FooterColumn {
  title: string;
  links: (ResolvedNavLink & { external?: boolean })[];
}

/** The header's single button. */
export interface HeaderCta {
  show: boolean;
  label: string;
  href: string;
}

/** A header menu entry as it comes from Sanity: a navLink, or a navGroup. */
export interface RawNavItem extends RawNavLink {
  links?: (RawNavLink | null)[] | null;
}

/** A footer column as it comes from Sanity. */
export interface RawFooterColumn {
  title?: string | null;
  links?: (RawNavLink | null)[] | null;
}

/** The raw siteSettings fields this resolver consumes (from getSiteSettings()). */
export interface RawChromeSettings {
  /** Optional logo image. When set it replaces the template's own logo files. */
  logo?: { asset?: { _ref?: string; _id?: string } | null; alt?: string | null } | null;
  navItems?: RawNavItem[] | null;
  footerColumns?: RawFooterColumn[] | null;
  legalNav?: (RawNavLink | null)[] | null;
  headerCta?: { show?: boolean | null; label?: string | null; link?: RawNavLink | null } | null;
  /** Undefined means YES: an untouched site keeps showing these. */
  showEmail?: boolean | null;
  showSocials?: boolean | null;
  showFooterSocials?: boolean | null;
  sectionVisibility?: Parameters<typeof getSectionVisibility>[0];
}

export interface ResolvedChromeSettings {
  /** Logo image for the header. undefined keeps the template's own logo files. */
  logo?: { asset?: { _ref?: string; _id?: string } | null; alt?: string | null };
  /** Header menu. Falls back to the built-in menu when Sanity has none. */
  headerNav: NavItem[];
  /** The header's single button, already resolved to a label + href. */
  headerCta: HeaderCta;
  /** Show the email row in the eyebrow strip + phone menu. Unset means yes. */
  showEmail: boolean;
  /** Show the social buttons in the eyebrow strip + phone menu. Unset means yes. */
  showSocials: boolean;
  /**
   * Footer link columns. EMPTY when unset — the footer keeps its own built-in
   * Studio / Work / Free-tools markup, whose links carry per-module visibility
   * flags a flat data list cannot express.
   */
  footerColumns: FooterColumn[];
  /**
   * Small-print row at the very bottom. EMPTY when unset — the footer keeps its
   * own built-in privacy link there.
   */
  legalNav: ResolvedNavLink[];
  /** Show the footer's social buttons. Unset means yes. */
  showFooterSocials: boolean;
}

/**
 * Built-in default menu. Renders when Site Settings -> Top menu links is empty,
 * so a fresh clone of the template still has a sensible header. Journal is
 * dropped when that module is switched off in Section visibility, which is why
 * this is a function of the same settings document rather than a constant.
 */
export function fallbackNavItems(visible: SectionVisibility): NavItem[] {
  return [
    { kind: 'flat', label: 'About', href: '/about' },
    { kind: 'flat', label: 'Services', href: '/services' },
    { kind: 'flat', label: 'FAQ', href: '/faq' },
    ...(visible.journal ? [{ kind: 'flat' as const, label: 'Journal', href: '/journal' }] : []),
  ];
}

/** Built-in header button. One unambiguous ask. */
export const FALLBACK_HEADER_CTA: HeaderCta = {
  show: true,
  label: 'Book a consultation',
  href: '/contact',
};

/** Trim a Sanity string; treat blank/whitespace-only/missing as "unset". */
function clean(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * A toggle that is ON until someone turns it off. Sanity `initialValue` only
 * fills NEW documents, so a live singleton has no value for these fields at
 * all — undefined has to mean "yes" in code or the header would quietly lose
 * its email and socials the moment the field was added.
 */
function onUnlessOff(value?: boolean | null): boolean {
  return value !== false;
}

/**
 * Map the editor-managed top menu into the {kind} shape the header render and
 * MobileNav both consume. navGroup -> dropdown, navLink -> flat. Entries with
 * no label, or whose destination resolves to nothing, are dropped so a
 * half-filled row can't put a dead link in the menu. Returns null when nothing
 * usable is set, so the caller falls back to the built-in menu.
 */
function navFromSettings(items?: RawNavItem[] | null): NavItem[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const mapped: NavItem[] = [];
  for (const item of items) {
    if (item?._type === 'navGroup') {
      const children = resolveNavLinks(item.links);
      if (item.label && children.length > 0) {
        mapped.push({ kind: 'dropdown', label: item.label, items: children });
      }
      continue;
    }
    const href = navHref(item);
    if (item?.label && href) {
      mapped.push({ kind: 'flat', label: item.label, href });
    }
  }
  return mapped.length > 0 ? mapped : null;
}

/** Same idea for the footer's titled columns. */
function footerColumnsFromSettings(cols?: RawFooterColumn[] | null): FooterColumn[] {
  if (!Array.isArray(cols) || cols.length === 0) return [];
  const mapped: FooterColumn[] = [];
  for (const col of cols) {
    const links = resolveNavLinks(col?.links);
    if (col?.title && links.length > 0) mapped.push({ title: col.title, links });
  }
  return mapped;
}

export function resolveSiteSettings(raw?: RawChromeSettings | null): ResolvedChromeSettings {
  const s = raw ?? {};
  const visible = getSectionVisibility(s.sectionVisibility);

  return {
    logo: s.logo?.asset ? s.logo : undefined,
    headerNav: navFromSettings(s.navItems) ?? fallbackNavItems(visible),
    headerCta: {
      show: onUnlessOff(s.headerCta?.show),
      label: clean(s.headerCta?.label) ?? FALLBACK_HEADER_CTA.label,
      href: navHref(s.headerCta?.link) ?? FALLBACK_HEADER_CTA.href,
    },
    showEmail: onUnlessOff(s.showEmail),
    showSocials: onUnlessOff(s.showSocials),
    footerColumns: footerColumnsFromSettings(s.footerColumns),
    legalNav: resolveNavLinks(s.legalNav),
    showFooterSocials: onUnlessOff(s.showFooterSocials),
  };
}

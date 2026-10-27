// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// page-switches: a custom page's menu switches actually add the page (card 187)
// =============================================================================
// A custom page has "Show in the top menu" and "Show in the footer" switches,
// plus "Where in the top menu" (its own item, or under Services / Resources).
// They existed in the Studio and getNavPages() fetched them, but nothing ever
// read them, so ticking one did nothing. Now a ticked page is added to the END
// of the menu (Site settings > Navigation keeps its own order) and to the LAST
// footer column, unless it is already listed there. Site settings stays the
// place to put a page somewhere particular; the switches are the quick way for
// a new page.
//
// Pure, so it is unit-tested (page-switches.test.ts). Header.astro merges the
// menu; Footer.astro merges the columns only when the editor has set custom
// footer columns (the built-in footer is bespoke markup with no column list to
// add to).
// =============================================================================
import { withTrailingSlash } from './href.ts';
import type { NavItem, FooterColumn } from './siteSettings.ts';

export interface PageSwitch {
  title?: string | null;
  slug?: string | null;
  navLabel?: string | null;
  /** 'top' (its own item), 'services' or 'resources' (under a dropdown of that name). */
  navGroup?: string | null;
  addToMainNav?: boolean | null;
  addToFooter?: boolean | null;
}

export function mergePageSwitches(
  nav: NavItem[],
  footer: FooterColumn[],
  pages: (PageSwitch | null)[] | null | undefined,
): { nav: NavItem[]; footer: FooterColumn[] } {
  const list = (pages ?? []).filter((p): p is PageSwitch => !!p?.slug?.trim());
  const link = (p: PageSwitch) => ({
    label: (p.navLabel?.trim() || p.title?.trim() || p.slug!.trim()) as string,
    href: withTrailingSlash(`/${p.slug!.trim()}`),
  });

  const listed = (items: NavItem[]) =>
    new Set(items.flatMap((i) => (i.kind === 'flat' ? [i.href] : i.items.map((x) => x.href))));
  let outNav = [...nav];
  for (const p of list.filter((x) => x.addToMainNav)) {
    const l = link(p);
    if (listed(outNav).has(l.href)) continue;
    const group = p.navGroup?.trim().toLowerCase();
    const at =
      group && group !== 'top'
        ? outNav.findIndex((i) => i.kind === 'dropdown' && i.label.trim().toLowerCase() === group)
        : -1;
    outNav =
      at === -1
        ? [...outNav, { kind: 'flat' as const, ...l }]
        : outNav.map((i, idx) =>
            idx === at && i.kind === 'dropdown' ? { ...i, items: [...i.items, l] } : i,
          );
  }

  const inFooter = new Set(footer.flatMap((c) => c.links.map((l) => l.href)));
  const addFooter = list
    .filter((p) => p.addToFooter)
    .map(link)
    .filter((l) => !inFooter.has(l.href));
  let outFooter = footer;
  if (addFooter.length > 0) {
    outFooter =
      footer.length > 0
        ? footer.map((c, i) =>
            i === footer.length - 1 ? { ...c, links: [...c.links, ...addFooter] } : c,
          )
        : [{ title: 'More', links: addFooter }];
  }
  return { nav: outNav, footer: outFooter };
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Checkup: links, headings and hidden pages (PORTS.md card 122)
// =============================================================================
// More Checkup rules, in the same shape as the generic ones in
// studio-checkup.ts (pure functions over the fetched documents, a Fix-it item
// with an Edit button per page, card 115). Kept in their own file so the
// generic set stays readable; kit.config.ts adds them with qualityRules().
//
//   dead-external-links    links to other websites that are gone, from the
//                          weekly link check (scripts/check-live-links.mjs
//                          writes a `linkReport` document; it is a REPORT,
//                          see REPORT_TYPES in studio-checkup.ts)
//   internal-link-missing  a typed address on this site ("/visit/") that no
//                          page answers
//   heading-skips          rich text that jumps a heading level, or uses a
//                          page-title (H1) heading inside the page
//   vague-link-text        "click here", "read more" and bare web addresses
//                          as link words; web addresses typed but not linked
//   seo-too-long           Google titles over 60, descriptions over 160
//   page-unreachable       a published page no menu, footer or other page
//                          links to (hidden pages are left out: that is the
//                          point of hiding them)
//   private-page-exposed   a Private page stored outside the private id path
//   private-page-no-password  a published Private page with no password
//
// Pictures with no description is the generic rule `image-no-description`;
// it is not repeated here.
// Unit tests: src/lib/studio-checkup-quality.test.ts.
// =============================================================================

import {
  itemsOf,
  listNames,
  openFirst,
  pathString,
  plural,
  publishedIdOf,
  walk,
  type CheckupRule,
  type Doc,
  type FindingItem,
} from './studio-checkup.ts';

/** The weekly link check's document (card 122). A private id path. */
export const LINK_REPORT_TYPE = 'linkReport';
export const LINK_REPORT_ID = 'linkReport.latest';

export interface LinkReportEntry {
  url: string;
  detail: string;
  /** Where it is used: the document and the field path inside it. */
  docs: Array<{ id: string; type: string; path?: string }>;
}

export interface LinkReport {
  checkedAt?: string;
  checked?: number;
  dead?: LinkReportEntry[];
  unverified?: LinkReportEntry[];
}

export interface QualityRuleOptions {
  /** Addresses the site always answers ("/", "/about/", "/contact/"...). */
  fixedPaths?: string[];
  /**
   * Document types with a page of their own, and the address of each by slug.
   * The default is a custom page (`page` -> /<slug>/) and a private page.
   */
  routes?: Record<string, (slug: string) => string>;
  /** Address prefixes answered by something other than a document (a feed, /api). */
  allowPrefixes?: string[];
  /** Page types with Google fields (seoTitle / seoDescription). */
  seoTypes?: string[];
  /** The custom page type the "nothing links here" check looks at. */
  pageType?: string;
  /** The Trash type, skipped everywhere. */
  trashType?: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** Link words that tell a screen-reader user nothing on their own. */
export const VAGUE_LINK_TEXT = new Set([
  'click here',
  'click',
  'here',
  'this',
  'this link',
  'link',
  'read more',
  'more',
  'learn more',
  'go',
  'see more',
  'details',
]);

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/i;

/** "/visit?x#y" -> "/visit/". Null for anything that is not a page on this site. */
export function normaliseInternal(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const h = href.trim();
  if (!h.startsWith('/') || h.startsWith('//')) return null;
  let p = h.split(/[?#]/)[0];
  // A file (a PDF in public/, an image) is not a page.
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return null;
  if (!p.endsWith('/')) p += '/';
  return p.replace(/\/{2,}/g, '/');
}

/** Field names that hold a typed address. */
function isHrefKey(key: string): boolean {
  return key === 'href' || key === 'url' || key === 'link' || /Href$|Url$/.test(key);
}

/** Every Portable Text block in a document, grouped by the array it sits in. */
function blockArrays(doc: Doc): Array<{ path: string; blocks: Record<string, unknown>[] }> {
  const groups = new Map<string, Record<string, unknown>[]>();
  walk(doc, (obj, path) => {
    if (obj._type !== 'block' || !path.length) return;
    const parent = pathString(path.slice(0, -1));
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)?.push(obj);
  });
  return [...groups.entries()].map(([path, blocks]) => ({ path, blocks }));
}

const spanText = (block: Record<string, unknown>): Array<{ text: string; marks: string[] }> =>
  Array.isArray(block.children)
    ? (block.children as Array<Record<string, unknown>>)
        .filter((c) => c && c._type === 'span' && typeof c.text === 'string')
        .map((c) => ({
          text: c.text as string,
          marks: Array.isArray(c.marks) ? (c.marks as string[]) : [],
        }))
    : [];

/** One item per (document, first field) with the finding. */
function hitItems(
  hits: Array<{ doc: Doc; field?: string }>,
  nameOf: (d: Doc) => string,
): { docs: Doc[]; items: FindingItem[] } {
  const docs = [...new Map(hits.map((h) => [publishedIdOf(h.doc._id), h.doc])).values()];
  const items = itemsOf(docs, nameOf, (d) => hits.find((h) => h.doc._id === d._id)?.field);
  return { docs, items };
}

export function qualityRules(opts: QualityRuleOptions = {}): CheckupRule[] {
  const trashType = opts.trashType ?? 'trashedItem';
  const pageType = opts.pageType ?? 'page';
  const seoTypes = new Set(opts.seoTypes ?? []);
  const routes: Record<string, (slug: string) => string> = opts.routes ?? {
    [pageType]: (s) => `/${s}/`,
    privatePage: (s) => `/private/${s}/`,
  };
  const allowPrefixes = opts.allowPrefixes ?? ['/studio/', '/api/', '/preview/', '/_astro/'];
  const fixed = new Set((opts.fixedPaths ?? ['/']).map((p) => normaliseInternal(p) ?? p));
  const live = (docs: Doc[]) => docs.filter((d) => d._type !== trashType && d.archived !== true);

  /** Every address the site answers, from the documents that have one. */
  function knownPaths(published: Doc[]): Set<string> {
    const known = new Set(fixed);
    for (const d of live(published)) {
      const route = routes[d._type];
      const slug = (d.slug as { current?: string } | undefined)?.current;
      if (route && typeof slug === 'string' && slug) known.add(route(slug));
      // A redirect's old address still answers (it forwards).
      if (d._type === 'redirect') {
        const from = normaliseInternal(d.from);
        if (from) known.add(from);
      }
    }
    return known;
  }

  /** [doc, field path, normalised address] for every typed internal address. */
  function internalLinks(published: Doc[]) {
    const out: Array<{ doc: Doc; field: string; path: string }> = [];
    for (const doc of live(published)) {
      if (doc._type === 'redirect') continue; // its `to` is checked by the redirect itself
      walk(doc, (obj, p) => {
        for (const [k, v] of Object.entries(obj)) {
          if (!isHrefKey(k)) continue;
          const path = normaliseInternal(v);
          if (path) out.push({ doc, field: pathString([...p, k]), path });
        }
      });
    }
    return out;
  }

  return [
    {
      id: 'dead-external-links',
      run: ({ reports, published, nameOf, now }) => {
        const report = reports.find((r) => r._type === LINK_REPORT_TYPE) as
          (Doc & LinkReport) | undefined;
        const dead = Array.isArray(report?.dead) ? report.dead : [];
        if (!dead.length) return null;
        // An old report is about links that may have been fixed since.
        const checked = report?.checkedAt ? Date.parse(report.checkedAt) : NaN;
        if (!Number.isNaN(checked) && now - checked > 21 * DAY) return null;
        const byId = new Map(published.map((d) => [d._id, d]));
        const hits: Array<{ doc: Doc; field?: string }> = [];
        for (const e of dead) {
          for (const u of e.docs ?? []) {
            const doc = byId.get(u.id) ?? { _id: u.id, _type: u.type };
            hits.push({ doc, field: u.path });
          }
        }
        const { docs, items } = hitItems(hits, nameOf);
        return {
          severity: 'Needs doing',
          label: `${plural(dead.length, 'link')} to another website that no longer works`,
          detail: `${listNames(dead.map((d) => d.url))}. The weekly link check could not open ${dead.length === 1 ? 'it' : 'them'}. Change the link to the right address, or take it out.${docs.length ? ` Used on ${listNames(docs.map(nameOf))}.` : ''}`,
          ...openFirst(docs, hits[0]?.field),
          items,
          itemLabel: 'A link to another website is broken',
        };
      },
    },
    {
      id: 'internal-link-missing',
      run: ({ published, nameOf }) => {
        const known = knownPaths(published);
        const hits = internalLinks(published).filter(
          (l) => !known.has(l.path) && !allowPrefixes.some((p) => l.path.startsWith(p)),
        );
        if (!hits.length) return null;
        const { docs, items } = hitItems(hits, nameOf);
        const paths = [...new Set(hits.map((h) => h.path))];
        return {
          severity: 'Needs doing',
          label: `${plural(paths.length, 'link')} to a page that is not on the website`,
          detail: `${listNames(paths)} on ${listNames(docs.map(nameOf))}. No page has that address. Pick the page from the list instead of typing its address, or correct it.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items,
          itemLabel: 'Links to a page that is not there',
        };
      },
    },
    {
      id: 'heading-skips',
      run: ({ published, nameOf }) => {
        const hits: Array<{ doc: Doc; field?: string }> = [];
        for (const doc of live(published)) {
          for (const { path, blocks } of blockArrays(doc)) {
            // The page has its title (H1) and each section its heading (H2),
            // so text inside starts at H2 or H3 at most.
            let prev = 2;
            for (const b of blocks) {
              const m = /^h([1-6])$/.exec(String(b.style ?? ''));
              if (!m) continue;
              const level = Number(m[1]);
              if (level === 1 || level > prev + 1) {
                hits.push({ doc, field: path });
                break;
              }
              prev = level;
            }
          }
        }
        if (!hits.length) return null;
        const { docs, items } = hitItems(hits, nameOf);
        return {
          severity: 'Worth a look',
          label: `${plural(docs.length, 'page')} with headings out of order`,
          detail: `${listNames(docs.map(nameOf))}. A heading skips a size (a small heading straight under a big one), or uses the page-title size. People using screen readers move around a page by its headings, so keep them in order: H2, then H3 under it.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items,
          itemLabel: 'Headings skip a size',
        };
      },
    },
    {
      id: 'vague-link-text',
      run: ({ published, nameOf }) => {
        const hits: Array<{ doc: Doc; field?: string; why: string }> = [];
        for (const doc of live(published)) {
          for (const { path, blocks } of blockArrays(doc)) {
            let found: string | null = null;
            for (const b of blocks) {
              const linkKeys = new Set(
                (Array.isArray(b.markDefs) ? (b.markDefs as Array<Record<string, unknown>>) : [])
                  .filter((m) => m && (m._type === 'link' || 'href' in m))
                  .map((m) => String(m._key)),
              );
              for (const s of spanText(b)) {
                const linked = s.marks.some((m) => linkKeys.has(m));
                const t = s.text
                  .trim()
                  .toLowerCase()
                  .replace(/[.!:]+$/, '');
                if (linked && VAGUE_LINK_TEXT.has(t)) found = `"${s.text.trim()}"`;
                else if (linked && URL_RE.test(t) && t.split(/\s+/).length === 1)
                  found = 'a web address as the link words';
                else if (!linked && URL_RE.test(s.text)) found = 'a web address that is not a link';
                if (found) break;
              }
              if (found) break;
            }
            if (found) hits.push({ doc, field: path, why: found });
          }
          // Buttons: a label next to an address.
          walk(doc, (obj, p) => {
            const label = typeof obj.label === 'string' ? obj.label : null;
            const hasLink = Object.keys(obj).some((k) => isHrefKey(k) || k === 'internalPage');
            if (!label || !hasLink) return;
            const t = label
              .trim()
              .toLowerCase()
              .replace(/[.!:]+$/, '');
            if (VAGUE_LINK_TEXT.has(t))
              hits.push({ doc, field: pathString([...p, 'label']), why: `"${label.trim()}"` });
          });
        }
        if (!hits.length) return null;
        const { docs, items } = hitItems(hits, nameOf);
        return {
          severity: 'Worth a look',
          label: `${plural(docs.length, 'page')} with links that do not say where they go`,
          detail: `${listNames(docs.map(nameOf))}: ${listNames([...new Set(hits.map((h) => h.why))], 3)}. Link words should say where the link goes ("Our service times", not "click here"), because people using screen readers often hear the links on their own. A web address typed into the text should be a link with plain words.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items,
          itemLabel: 'Link words do not say where they go',
        };
      },
    },
    {
      id: 'seo-too-long',
      run: ({ published, nameOf }) => {
        const hits: Array<{ doc: Doc; field: string }> = [];
        for (const d of live(published)) {
          if (!seoTypes.has(d._type) || d.hideFromSearch === true) continue;
          if (typeof d.seoTitle === 'string' && d.seoTitle.trim().length > 60)
            hits.push({ doc: d, field: 'seoTitle' });
          else if (typeof d.seoDescription === 'string' && d.seoDescription.trim().length > 160)
            hits.push({ doc: d, field: 'seoDescription' });
        }
        if (!hits.length) return null;
        const { docs, items } = hitItems(hits, nameOf);
        return {
          severity: 'Worth a look',
          label: `${plural(docs.length, 'page')} with a Google title or description that gets cut off`,
          detail: `${listNames(docs.map(nameOf))}. Google shows about 60 characters of a title and 160 of a description, then cuts the rest with "...". Shorten it so the important words show.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items,
          itemLabel: 'Google title or description too long',
        };
      },
    },
    {
      id: 'page-unreachable',
      run: ({ published, nameOf }) => {
        const pages = live(published).filter(
          (d) =>
            d._type === pageType &&
            d.hideFromSearch !== true &&
            d.addToMainNav !== true &&
            d.addToFooter !== true &&
            typeof (d.slug as { current?: string } | undefined)?.current === 'string',
        );
        if (!pages.length) return null;
        const referenced = new Set<string>();
        for (const d of live(published)) {
          walk(d, (obj) => {
            if (typeof obj._ref === 'string' && obj._ref !== d._id) referenced.add(obj._ref);
          });
        }
        const typed = new Set(internalLinks(published).map((l) => l.path));
        const orphans = pages.filter((p) => {
          if (referenced.has(p._id)) return false;
          const slug = (p.slug as { current: string }).current;
          return !typed.has(`/${slug}/`);
        });
        if (!orphans.length) return null;
        return {
          severity: 'Worth a look',
          label: `${plural(orphans.length, 'page')} nobody can click through to`,
          detail: `${listNames(orphans.map(nameOf))}. No menu, footer or other page links here, so visitors only find it by its address. Add it to a menu, link to it from another page, or, if that is on purpose, turn on "Hide this page from Google and the menus".`,
          ...openFirst(orphans),
          items: itemsOf(orphans, nameOf),
          itemLabel: 'No menu or page links here',
        };
      },
    },
    {
      id: 'private-page-exposed',
      run: ({ docs, nameOf }) => {
        const exposed = docs.filter(
          (d) => d._type === 'privatePage' && !publishedIdOf(d._id).startsWith('privatePage.'),
        );
        if (!exposed.length) return null;
        return {
          severity: 'Needs doing',
          label: `${plural(exposed.length, 'private page')} stored where anyone could read it`,
          detail: `${listNames(exposed.map(nameOf))}. It was made outside Pages, Private pages, so its words are not private and the website will not show it. Make it again from Pages, Private pages, then move this one to the Trash. Ask for help if you are unsure.`,
          ...openFirst(exposed),
          items: itemsOf(exposed, nameOf),
          itemLabel: 'Not stored privately',
        };
      },
    },
    {
      id: 'private-page-no-password',
      run: ({ published, nameOf }) => {
        const open = published.filter((d) => {
          if (d._type !== 'privatePage') return false;
          const pw = d.password as { hash?: unknown } | undefined;
          return !pw || typeof pw.hash !== 'string' || !pw.hash;
        });
        if (!open.length) return null;
        return {
          severity: 'Worth a look',
          label: `${plural(open.length, 'private page')} with no password`,
          detail: `${listNames(open.map(nameOf))}. Nobody can open it until it has a password. Set one under Password and publish.`,
          ...openFirst(open, 'password'),
          items: itemsOf(open, nameOf, () => 'password'),
          itemLabel: 'No password yet',
        };
      },
    },
  ];
}

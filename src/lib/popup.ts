// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Popups (PORTS.md card 170): which one is live, which pages it shows on, and the
// overlap check the Studio warns with.
// =============================================================================
// Pure, so BaseLayout, the Studio validation (src/sanity/schemaTypes/popup.ts) and the unit
// tests (popup.test.ts) share it. The component is src/components/SitePopup.astro; the
// behavior (when it opens, how often) is in its script. PORTS.md card 170 has the design.
//
// ONE AT A TIME. A popup is a strong interruption, so the site never shows two: of the popups
// switched on and not yet ended, the one that started most recently wins, else the one that
// starts soonest (its dates are checked again in the visitor's browser, so a popup that starts
// on Friday appears on Friday even if the site last rebuilt on Thursday).
//
// Page addresses come from the site's own SINGLETON_LIVE_PATHS (src/lib/nav-href.ts), so this
// file stays identical across sites whatever pages each one has.

import { SINGLETON_LIVE_PATHS } from './nav-href.ts';

export type PopupWhere = 'all' | 'home' | 'chosen';
export type PopupFrequency = 'visitor' | 'visit';

/** A page a popup may be limited to, as the query returns it (a reference, dereferenced). */
export interface PopupPageRef {
  _type?: string | null;
  slug?: string | null;
}

export interface PopupDoc {
  _id: string;
  title?: string | null;
  text?: string | null;
  image?: unknown;
  button?: { label?: string | null; link?: string | null } | null;
  startDate?: string | null;
  endDate?: string | null;
  where?: PopupWhere | null;
  pages?: (PopupPageRef | null)[] | null;
  frequency?: PopupFrequency | null;
  _updatedAt?: string | null;
}

/**
 * The page singletons a popup can be limited to, with their addresses: every entry of
 * SINGLETON_LIVE_PATHS that is a real page of its own (ends in a slash, no #anchor), so the
 * 404 page and a singleton that lives inside another page are left out.
 */
const SINGLETON_PATHS: Record<string, string> = Object.fromEntries(
  Object.entries(SINGLETON_LIVE_PATHS).filter(
    ([, path]) => path.startsWith('/') && path.endsWith('/') && !path.includes('#'),
  ),
);

/** The document types a popup can be limited to (the reference field's `to`). */
export const POPUP_PAGE_TYPES = ['page', ...Object.keys(SINGLETON_PATHS)];

/** The address of a referenced page, with the trailing slash (rule 19). Null if it has none. */
export function pathForPage(ref: PopupPageRef | null | undefined): string | null {
  if (!ref?._type) return null;
  if (ref._type === 'page') return ref.slug ? `/${ref.slug.replace(/^\/+|\/+$/g, '')}/` : null;
  return SINGLETON_PATHS[ref._type] ?? null;
}

const time = (iso: string | null | undefined, fallback: number) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : fallback;
};

/** The single popup to put on the site, or null. `now` in ms. */
export function pickPopup(
  list: (PopupDoc | null)[] | null | undefined,
  now: number,
): PopupDoc | null {
  const live = (list ?? []).filter(
    (p): p is PopupDoc => !!p?._id && !!p.title?.trim() && time(p.endDate, Infinity) > now,
  );
  const started = live
    .filter((p) => time(p.startDate, -Infinity) <= now)
    .sort((a, b) => time(b.startDate, 0) - time(a.startDate, 0));
  if (started.length) return started[0];
  const upcoming = live.sort((a, b) => time(a.startDate, 0) - time(b.startDate, 0));
  return upcoming[0] ?? null;
}

const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/** Does this popup show on `pathname`? Never on the Studio, the preview, the API or a password page. */
export function popupShowsOn(popup: PopupDoc | null, pathname: string): boolean {
  if (!popup) return false;
  if (/^\/(studio|preview|api|private)(\/|$)/.test(pathname)) return false;
  const where = popup.where ?? 'all';
  if (where === 'all') return true;
  if (where === 'home') return pathname === '/' || pathname === '';
  const here = norm(pathname);
  return (popup.pages ?? []).some((ref) => pathForPage(ref) === here);
}

/** Do two popups' date windows overlap? An empty start is "from now", an empty end "forever". */
export function popupsOverlap(
  a: Pick<PopupDoc, 'startDate' | 'endDate'>,
  b: Pick<PopupDoc, 'startDate' | 'endDate'>,
): boolean {
  const aStart = time(a.startDate, -Infinity);
  const aEnd = time(a.endDate, Infinity);
  const bStart = time(b.startDate, -Infinity);
  const bEnd = time(b.endDate, Infinity);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * The storage key a dismissal is remembered under. It carries the last edit time, so a popup the
 * editor changes (new words, new dates) shows again to people who closed the old one.
 */
export function popupSeenKey(popup: Pick<PopupDoc, '_id' | '_updatedAt'>): string {
  const id = popup._id.replace(/^drafts\./, '');
  const v = popup._updatedAt ? Date.parse(popup._updatedAt).toString(36) : '0';
  return `site-popup:${id}:${v}`;
}

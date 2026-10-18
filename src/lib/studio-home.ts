// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home's dashboard cards, the pure half (Studio kit, PORTS.md card 115)
// =============================================================================
// Round four of the kit brings Home up to the WordPress staff dashboard on the
// family's WordPress sites: a dated greeting, "Coming up" (what publishes by
// itself), a Fix-it list with names and Edit buttons, a "Your pages" map, and
// a "Watch how it is done" row. The React cards live in
// src/sanity/kit/HomeCards.tsx; everything they decide (ordering, plain words,
// which pages go in which group, which videos can play inline) is here, free
// of React and Sanity imports, so src/lib/studio-home.test.ts checks it in
// bare Node.
// =============================================================================

import type { CheckResult, Severity } from './studio-checkup.ts';
import type { StudioTarget } from './studio-kit.ts';

const DAY = 24 * 60 * 60 * 1000;

const isDraft = (id: string) => id.startsWith('drafts.');
const publishedId = (id: string) => (isDraft(id) ? id.slice('drafts.'.length) : id);

// -----------------------------------------------------------------------------
// The dated greeting
// -----------------------------------------------------------------------------

/** "Sunday, October 18", by the browser's clock and calendar. */
export function todayLine(now: Date): string {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// -----------------------------------------------------------------------------
// Coming up: what will publish by itself (card 111's publishAt)
// -----------------------------------------------------------------------------

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * A scheduled time in plain words, local time: "Today at 3:00 PM", "Tomorrow at
 * 9:00 AM", "Friday at 9:00 AM" (inside a week), "Friday, October 30 at 9:00 AM".
 * A time already passed reads "Any minute now": the half-hourly job has not run yet.
 */
export function whenWords(iso: string, now: Date): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'At a time that could not be read';
  if (at.getTime() <= now.getTime()) return 'Any minute now';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(at, now)) return `Today at ${clock(at)}`;
  if (sameDay(at, tomorrow)) return `Tomorrow at ${clock(at)}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at.getTime() - startOfToday < 7 * DAY) {
    return `${at.toLocaleDateString('en-US', { weekday: 'long' })} at ${clock(at)}`;
  }
  const sameYear = at.getFullYear() === now.getFullYear();
  const date = at.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${date} at ${clock(at)}`;
}

/** One document with a publishAt, as Home's query returns it. */
export interface ScheduledDoc {
  _id: string;
  _type: string;
  publishAt?: string | null;
  name?: string | null;
}

export interface ComingRow {
  /** The published id (what Open edits). */
  id: string;
  type: string;
  name: string | null;
  publishAt: string;
  when: string;
}

/**
 * Drafts with a publishAt, soonest first, one row per document. Only drafts
 * count: scripts/publish-due.mjs publishes drafts and strips the field, so a
 * published copy carrying publishAt is a leftover, not a schedule.
 */
export function comingUp(docs: ScheduledDoc[], now: Date): ComingRow[] {
  const seen = new Set<string>();
  return docs
    .filter((d) => isDraft(d._id) && typeof d.publishAt === 'string' && d.publishAt)
    .map((d) => ({ d, t: Date.parse(d.publishAt as string) }))
    .filter(({ t }) => !Number.isNaN(t))
    .sort((a, b) => a.t - b.t)
    .filter(({ d }) => {
      const id = publishedId(d._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(({ d }) => ({
      id: publishedId(d._id),
      type: d._type,
      name: d.name?.trim() || null,
      publishAt: d.publishAt as string,
      when: whenWords(d.publishAt as string, now),
    }));
}

// -----------------------------------------------------------------------------
// The Fix-it list: the Checkup's findings, one row per page
// -----------------------------------------------------------------------------

export interface FixItRow {
  key: string;
  /** The page or thing's name ("Plan your visit"). */
  name: string;
  /** What is wrong with it, short ("A picture needs a description"). */
  reason: string;
  severity: Severity;
  target?: StudioTarget;
  targetLabel: string;
}

/**
 * Flatten the Checkup's findings into rows by name, the urgent ones first
 * (runCheckup already sorts by severity). A finding with `items` gives one row
 * per item; a finding without (a site's own rule) gives one row from its
 * label. "For information" never makes the list. Rows past `max` are left for
 * the Checkup itself; `more` says how many.
 */
export function fixItList(
  results: CheckResult[],
  max = 6,
): { rows: FixItRow[]; total: number; more: number } {
  const all: FixItRow[] = [];
  for (const r of results) {
    if (r.severity === 'For information') continue;
    if (r.items?.length) {
      r.items.forEach((item, i) =>
        all.push({
          key: `${r.id}-${i}`,
          name: item.name,
          reason: r.itemLabel ?? r.label,
          severity: r.severity,
          target: item.target,
          targetLabel: 'Edit',
        }),
      );
    } else {
      all.push({
        key: r.id,
        name: r.label,
        reason: r.detail,
        severity: r.severity,
        target: r.target,
        targetLabel: r.targetLabel ?? 'Open',
      });
    }
  }
  const rows = all.slice(0, Math.max(0, max));
  return { rows, total: all.length, more: all.length - rows.length };
}

// -----------------------------------------------------------------------------
// "Your pages": every page the editor can change, grouped by the site's config
// -----------------------------------------------------------------------------

/** One link in a group: the shape kit.config.ts writes (icon optional). */
export interface PageMapLinkLike {
  title: string;
  target: StudioTarget;
}

export interface PageMapGroupLike<L extends PageMapLinkLike = PageMapLinkLike> {
  title: string;
  links?: L[];
  /**
   * Also list every document of this type by name (custom pages), after the
   * links, so a page the editor builds tomorrow shows without a config change.
   */
  listType?: string;
}

/** A document the map can list (published or draft). */
export interface MapDoc {
  _id: string;
  _type: string;
  name?: string | null;
}

/**
 * The groups with their `listType` documents filled in: one row per document
 * (a draft and its published copy are one page), skipping any the group (or
 * an earlier group) already links to by id, sorted by name. Groups that end up
 * empty are dropped. A listed page that has never been published says so.
 */
export function resolvePageMap<L extends PageMapLinkLike>(
  groups: PageMapGroupLike<L>[],
  docs: MapDoc[],
): Array<{ title: string; links: Array<L | (PageMapLinkLike & { draftOnly?: boolean })> }> {
  const linked = new Set<string>();
  for (const g of groups) {
    for (const l of g.links ?? []) if ('doc' in l.target) linked.add(l.target.doc);
  }
  const out: Array<{
    title: string;
    links: Array<L | (PageMapLinkLike & { draftOnly?: boolean })>;
  }> = [];
  for (const g of groups) {
    const links: Array<L | (PageMapLinkLike & { draftOnly?: boolean })> = [...(g.links ?? [])];
    if (g.listType) {
      const byId = new Map<string, { name: string; published: boolean }>();
      for (const d of docs) {
        if (d._type !== g.listType) continue;
        const id = publishedId(d._id);
        if (linked.has(id)) continue;
        const prev = byId.get(id);
        const name = d.name?.trim() || prev?.name || 'Untitled page';
        byId.set(id, { name, published: Boolean(prev?.published) || !isDraft(d._id) });
      }
      const extra = [...byId.entries()]
        .sort((a, b) => a[1].name.localeCompare(b[1].name))
        .map(([id, v]) => ({
          title: v.name,
          target: { doc: id, type: g.listType as string },
          ...(v.published ? {} : { draftOnly: true }),
        }));
      for (const e of extra) linked.add(e.target.doc);
      links.push(...extra);
    }
    if (links.length) out.push({ title: g.title, links });
  }
  return out;
}

// -----------------------------------------------------------------------------
// "Watch how it is done": guide videos
// -----------------------------------------------------------------------------

export type VideoSource =
  { kind: 'file'; src: string } | { kind: 'embed'; src: string } | { kind: 'link'; src: string };

const FILE_RE = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

/**
 * How a guide's `video` plays. A path on this site ("/guides/notice.mp4", a
 * file in public/) or a direct video file plays in a <video> player. YouTube
 * and Vimeo links play in their own player (YouTube's no-cookie host). Any
 * other web address opens in a new tab. Anything else (empty, a bad address,
 * javascript:) is null, and the guide simply has no video.
 */
export function videoSource(video: string | null | undefined): VideoSource | null {
  const v = (video ?? '').trim();
  if (!v) return null;
  if (v.startsWith('/') && !v.startsWith('//')) return { kind: 'file', src: v };
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '');
  let yt: string | null = null;
  if (host === 'youtu.be') yt = url.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    yt =
      url.searchParams.get('v') ??
      /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ??
      null;
  }
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${yt}` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /(\d{6,})/.exec(url.pathname)?.[1];
    if (id) return { kind: 'embed', src: `https://player.vimeo.com/video/${id}` };
  }
  if (FILE_RE.test(url.pathname)) return { kind: 'file', src: url.toString() };
  return { kind: 'link', src: url.toString() };
}

/** The guides that have a playable video, in their own order. */
export function guidesWithVideo<G extends { video?: string | null }>(guides: G[]): G[] {
  return guides.filter((g) => videoSource(g.video) !== null);
}

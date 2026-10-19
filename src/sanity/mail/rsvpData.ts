// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// rsvpData - the Studio's view of RSVP events (PORTS.md card 121)
// =============================================================================
// Two halves joined here: the EVENTS come from Sanity (every published page or
// saved section with an RSVP block: name, date, places), the COUNTS from the
// site's database through /api/studio/rsvps/ (names never touch Sanity). An
// event whose block was since deleted still shows, from the database's copy
// of its name, so its replies are never stranded.
// Used by the RSVPs tool, Home's "Coming up" and the Messages inbox.
// =============================================================================
import { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';

export const RSVPS_API = '/api/studio/rsvps/';

export interface RsvpOverview {
  key: string;
  name: string;
  startsAt: string | null;
  capacity: number | null;
  waitlist: boolean;
  /** The document holding the block, to open it. */
  docId: string | null;
  docType: string | null;
  docTitle: string | null;
  going: number;
  waiting: number;
  replies: number;
}

interface BlockRow {
  _id: string;
  _type: string;
  title?: string;
  blocks?: Array<{
    _key: string;
    eventName?: string;
    startsAt?: string;
    capacity?: number;
    waitlist?: boolean;
  }>;
}

interface CountRow {
  key: string;
  name: string;
  going: number;
  waiting: number;
  replies: number;
}

export const RSVP_BLOCKS_QUERY = `*[!(_id in path("drafts.**")) && (count(pageBuilder[_type == "rsvpSection"]) > 0 || count(additionalSections[_type == "rsvpSection"]) > 0 || count(section[_type == "rsvpSection"]) > 0)]{
  _id, _type, "title": coalesce(title, heading, internalTitle, seoTitle),
  "blocks": [...coalesce(pageBuilder, [])[_type == "rsvpSection"], ...coalesce(additionalSections, [])[_type == "rsvpSection"], ...coalesce(section, [])[_type == "rsvpSection"]]{ _key, eventName, startsAt, capacity, waitlist }
}`;

/** Join Sanity's events with the database's counts. Pure, exported for reuse. */
export function joinRsvps(docs: BlockRow[], counts: CountRow[]): RsvpOverview[] {
  const out = new Map<string, RsvpOverview>();
  for (const d of docs) {
    for (const b of d.blocks ?? []) {
      const key = `${d._id}:${b._key}`;
      out.set(key, {
        key,
        name: b.eventName || 'An event with no name yet',
        startsAt: b.startsAt ?? null,
        capacity: typeof b.capacity === 'number' ? b.capacity : null,
        waitlist: b.waitlist === true,
        docId: d._id,
        docType: d._type,
        docTitle: d.title ?? null,
        going: 0,
        waiting: 0,
        replies: 0,
      });
    }
  }
  for (const c of counts) {
    const row = out.get(c.key);
    if (row) Object.assign(row, { going: c.going, waiting: c.waiting, replies: c.replies });
    else
      out.set(c.key, {
        key: c.key,
        name: c.name,
        startsAt: null,
        capacity: null,
        waitlist: false,
        docId: null,
        docType: null,
        docTitle: null,
        going: c.going,
        waiting: c.waiting,
        replies: c.replies,
      });
  }
  // Soonest upcoming first, then undated, then the past (most recent first).
  const now = Date.now();
  return [...out.values()].sort((a, b) => {
    const ta = a.startsAt ? Date.parse(a.startsAt) : NaN;
    const tb = b.startsAt ? Date.parse(b.startsAt) : NaN;
    const ra = Number.isNaN(ta) ? 1 : ta >= now ? 0 : 2;
    const rb = Number.isNaN(tb) ? 1 : tb >= now ? 0 : 2;
    if (ra !== rb) return ra - rb;
    if (ra === 0) return ta - tb;
    if (ra === 2) return tb - ta;
    return a.name.localeCompare(b.name);
  });
}

export const isUpcoming = (r: RsvpOverview, now = Date.now()) =>
  r.startsAt !== null && Date.parse(r.startsAt) >= now;

export function countWords(r: RsvpOverview): string {
  const going = `${r.going} coming`;
  const cap = r.capacity ? ` of ${r.capacity}` : '';
  const waiting = r.waiting ? `, ${r.waiting} waiting` : '';
  return `${going}${cap}${waiting}`;
}

export type RsvpState =
  | { kind: 'loading' }
  | { kind: 'off' }
  | { kind: 'failed' }
  | { kind: 'ok'; events: RsvpOverview[] };

export function useRsvpOverview(): RsvpState {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [state, setState] = useState<RsvpState>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    Promise.all([
      client.fetch<BlockRow[]>(RSVP_BLOCKS_QUERY).catch(() => null),
      studioApi<{ events?: CountRow[] }>(client, RSVPS_API),
    ]).then(([docs, api]) => {
      if (!live) return;
      if (docs === null) return setState({ kind: 'failed' });
      if (api.status === 503) {
        // No database yet: still list the events, with nothing counted.
        return setState(
          docs.length ? { kind: 'ok', events: joinRsvps(docs, []) } : { kind: 'off' },
        );
      }
      if (!api.body.ok) return setState({ kind: 'failed' });
      setState({ kind: 'ok', events: joinRsvps(docs, api.body.events ?? []) });
    });
    return () => {
      live = false;
    };
  }, [client]);
  return state;
}

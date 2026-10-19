// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Spotlight tours, welcome and "What's new": the pure half (Studio kit, card 137)
// =============================================================================
// The React half is src/sanity/kit/StudioTour.tsx. Everything it decides is
// here, free of React and Sanity, so src/lib/studio-tour.test.ts checks it in
// bare Node:
//   - which tours a person gets (first run, by role, on demand, per tool);
//   - what an anchor name means as CSS selectors (the kit's own data-tour
//     hooks, plus a short documented list for Sanity's own UI);
//   - where the popover goes beside the spotlight (and the phone sheet);
//   - which "What's new" entries a person has not seen yet;
//   - the localStorage keys, so a site can reset one person by hand.
// A site writes tours as DATA in kit.config.ts (KitConfig.tours, .welcome,
// .whatsNew). docs/agent/studio-kit.md, "Spotlight tours", has the shapes.
// =============================================================================

import type { StudioTarget } from './studio-kit.ts';

/** Who a tour is for. 'staff' is the staff view, 'editor' the full Studio. */
export type TourRole = 'everyone' | 'editor' | 'staff';

/** Where the popover sits beside its anchor. 'auto' picks the side with room. */
export type TourPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';

/** One stop of a spotlight tour. */
export interface TourStop {
  /**
   * What to light up. A kit hook name ('home-this-week', drawn as
   * data-tour="home-this-week"), a Sanity name from SANITY_ANCHORS ('tool:structure',
   * 'publish', 'pane:list'), a Quick update tile ('quick:<form id>'), or
   * 'css:<selector>' for anything else. Missing, or not
   * on screen after a moment: the popover sits in the middle with no cut-out.
   */
  anchor?: string;
  title: string;
  body: string;
  /** A word or two for the stone row ("Publish"). Default: the title. */
  short?: string;
  /** The art on the popover's stone (a BrandIconKey). Default: the guide's. */
  meaning?: string;
  placement?: TourPlacement;
  /** Open this first (a tool, a document, a list), then light the anchor. */
  goTo?: StudioTarget;
}

/** One tour. */
export interface TourDef {
  /** Stable id: storage remembers it ("first-run", "quick-update"). */
  id: string;
  /** The eyebrow on every popover ("A quick tour", "How this screen works"). */
  title: string;
  /** Who gets it. Default 'everyone'. */
  role?: TourRole;
  /** Offered once, the first time this person opens the Studio. */
  firstRun?: boolean;
  /**
   * A tool name ('home', 'quick-update', 'guide', 'checkup', 'structure'): the
   * tour is that tool's "How this screen works".
   */
  tool?: string;
  /** Bump it when the steps change enough to show them again. Default 1. */
  version?: number;
  steps: TourStop[];
}

/** The welcome modal, shown once per person before anything else. */
export interface WelcomeConfig {
  title: string;
  body: string;
  /** Up to four short lines ("Nothing goes live until you press Publish."). */
  points?: string[];
  /** The tour "Show me around" starts. Default: the person's first-run tour. */
  tour?: string;
  /** Bump to greet everyone again. Default 1. */
  version?: number;
}

/** One dated entry of "What's new". */
export interface WhatsNewEntry {
  /** ISO date, "2026-10-19". The newest unseen entries are shown, newest first. */
  date: string;
  title: string;
  items: string[];
  /** A tour to offer from this entry ("Show me"). */
  tour?: string;
}

// -----------------------------------------------------------------------------
// Anchors
// -----------------------------------------------------------------------------

/**
 * Sanity's own UI, by a plain name. Each is a list tried in order, because
 * Sanity renames test ids between majors; the first that is on screen wins.
 * Checked against Sanity 6 on 2026-10-19 (the kit harness). When one stops
 * matching, fix it HERE and in studio-kit.md's table.
 */
export const SANITY_ANCHORS: Record<string, string[]> = {
  /** The row of tool tabs in the top bar. */
  tools: ['[data-testid="tool-menu"]', 'nav[aria-label] [data-testid^="tool-"]'],
  /** The search box in the top bar. */
  search: ['[data-testid="studio-search"]', 'button[aria-label="Search"]'],
  /** The account avatar menu, top right. */
  account: ['[data-testid="user-menu-button"]', 'button[aria-label="Open user menu"]'],
  /** The Publish button at the foot of an open document. */
  publish: ['[data-testid="action-publish"]', '[data-testid="action-Publish"]'],
  /** The bar at the foot of an open document (Publish and the "..." menu). */
  'document-actions': ['[data-testid="document-panel-footer"]', '[data-ui="DocumentStatusBar"]'],
  /** The "..." beside Publish (Discard, Duplicate, Move to Trash). */
  'document-menu': ['[data-testid="action-menu-button"]'],
  /** The open document's form. */
  'document-form': ['[data-testid="document-panel-scroller"]', '[data-testid="form-view"]'],
  /** The first list pane in Content. */
  'pane:list': ['[data-testid="structure-tool-list-pane"]', '[data-ui="ListPane"]'],
  /** The open document's pane. */
  'pane:document': ['[data-testid="document-pane"]', '[data-ui="DocumentPane"]'],
  /** The "+" (create new) at the top of a list pane. */
  'new-document': [
    '[data-testid="action-intent-button"]',
    '[data-testid="new-document-button"]',
    'a[aria-label^="Create new"]',
  ],
};

/** The CSS selectors an anchor name stands for, in the order to try them. */
export function anchorSelectors(anchor: string | undefined): string[] {
  const a = (anchor ?? '').trim();
  if (!a) return [];
  if (a.startsWith('css:')) return [a.slice(4)];
  if (a.startsWith('tool:')) {
    const name = a.slice(5).replace(/"/g, '');
    return [
      `[data-testid="tool-${name}"]`,
      `a[data-as="a"][href$="/${name}"]`,
      `a[href$="/${name}"][data-ui="Button"]`,
    ];
  }
  if (a.startsWith('field:')) {
    // A field in the open document, by its path ("raceDate", "seo.title").
    return [`[data-testid="field-${a.slice(6).replace(/"/g, '')}"]`];
  }
  if (a.startsWith('quick:')) return [`[data-quick="${a.slice(6).replace(/"/g, '')}"]`];
  if (SANITY_ANCHORS[a]) return SANITY_ANCHORS[a];
  return [`[data-tour="${a.replace(/"/g, '')}"]`];
}

// -----------------------------------------------------------------------------
// Which tours
// -----------------------------------------------------------------------------

/** Steps from the old single tour (KitConfig.tourSteps), as a tour. Keeps old configs working. */
export function legacyTour(
  steps: { title: string; body: string; short?: string; meaning?: string }[],
): TourDef {
  return { id: 'first-run', title: 'A quick tour', firstRun: true, steps };
}

/** Every tour a site has: its `tours`, or the old `tourSteps` as one first-run tour. */
export function allTours(
  tours: TourDef[] | undefined,
  legacySteps: { title: string; body: string; short?: string; meaning?: string }[] | undefined,
): TourDef[] {
  if (tours && tours.length) return tours.filter((t) => t.steps.length > 0);
  return legacySteps && legacySteps.length ? [legacyTour(legacySteps)] : [];
}

const fits = (t: TourDef, staff: boolean) =>
  !t.role || t.role === 'everyone' || t.role === (staff ? 'staff' : 'editor');

/** The first-run tour for this person: the first one for their view. */
export function firstRunTour(tours: TourDef[], staff: boolean): TourDef | undefined {
  return tours.find((t) => t.firstRun && fits(t, staff));
}

/** The "How this screen works" tour for a tool, for this person. */
export function toolTour(tours: TourDef[], tool: string, staff: boolean): TourDef | undefined {
  return tours.find((t) => t.tool === tool && fits(t, staff));
}

/** "Show me around": the asked-for id, else the person's first-run tour, else the first. */
export function pickTour(
  tours: TourDef[],
  staff: boolean,
  id?: string | null,
): TourDef | undefined {
  if (id) return tours.find((t) => t.id === id);
  return firstRunTour(tours, staff) ?? tours.find((t) => fits(t, staff)) ?? tours[0];
}

// -----------------------------------------------------------------------------
// Remembering (localStorage; the component fails safe when it throws)
// -----------------------------------------------------------------------------

const PREFIX = 'ncs-studio-kit:';
/** The card 106 tour's key: a person who saw it does not get the first-run tour again. */
export const LEGACY_SEEN_PREFIX = 'ncs-studio-kit-tour-v1:';

export const seenKeys = {
  tour: (user: string, t: TourDef) => `${PREFIX}${user}:tour:${t.id}:v${t.version ?? 1}`,
  welcome: (user: string, w: WelcomeConfig) => `${PREFIX}${user}:welcome:v${w.version ?? 1}`,
  /** Holds the newest "What's new" date this person has seen. */
  whatsNew: (user: string) => `${PREFIX}${user}:whats-new`,
};

/** The entries newer than `seen` (an ISO date or null), newest first. */
export function unseenNews(
  entries: WhatsNewEntry[] | undefined,
  seen: string | null,
): WhatsNewEntry[] {
  const sorted = [...(entries ?? [])]
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  return seen ? sorted.filter((e) => e.date > seen) : sorted;
}

/** The newest date in the changelog, or null. */
export function newestNews(entries: WhatsNewEntry[] | undefined): string | null {
  return unseenNews(entries, null)[0]?.date ?? null;
}

/** "October 19", for the What's new list. */
export function newsDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// -----------------------------------------------------------------------------
// Geometry: the cut-out and the popover
// -----------------------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The cut-out: the anchor grown by `pad`, kept inside the screen. */
export function spotlightBox(r: Box, vw: number, vh: number, pad = 8): Box {
  const x = Math.max(4, r.x - pad);
  const y = Math.max(4, r.y - pad);
  const right = Math.min(vw - 4, r.x + r.w + pad);
  const bottom = Math.min(vh - 4, r.y + r.h + pad);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

/** Under this width the popover is a sheet along the foot of the screen. */
export const SHEET_BELOW = 600;

export interface PopoverPlace {
  mode: 'beside' | 'center' | 'sheet';
  side?: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
}

/**
 * Where the popover (size pw by ph) goes. Beside the cut-out on the asked side,
 * or the side with the most room; centred with no anchor; a foot-of-screen
 * sheet on a phone (moved to the top when the anchor sits in the lower half).
 */
export function placePopover(
  spot: Box | null,
  pw: number,
  ph: number,
  vw: number,
  vh: number,
  want: TourPlacement = 'auto',
  gap = 14,
): PopoverPlace {
  const m = 12;
  const clampX = (x: number) => Math.min(Math.max(m, x), Math.max(m, vw - pw - m));
  const clampY = (y: number) => Math.min(Math.max(m, y), Math.max(m, vh - ph - m));
  if (vw < SHEET_BELOW) {
    const low = spot ? spot.y + spot.h / 2 > vh / 2 : false;
    return { mode: 'sheet', x: m, y: low ? m : Math.max(m, vh - ph - m) };
  }
  if (!spot || want === 'center') {
    return { mode: 'center', x: clampX((vw - pw) / 2), y: clampY((vh - ph) / 2) };
  }
  const room = {
    bottom: vh - (spot.y + spot.h) - gap,
    top: spot.y - gap,
    right: vw - (spot.x + spot.w) - gap,
    left: spot.x - gap,
  };
  const fitsSide = (s: keyof typeof room) =>
    s === 'top' || s === 'bottom' ? room[s] >= ph : room[s] >= pw;
  const order: (keyof typeof room)[] =
    want !== 'auto' ? [want, 'bottom', 'top', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  const side = order.find(fitsSide);
  if (!side) return { mode: 'center', x: clampX((vw - pw) / 2), y: clampY((vh - ph) / 2) };
  const cx = spot.x + spot.w / 2;
  const cy = spot.y + spot.h / 2;
  if (side === 'bottom')
    return { mode: 'beside', side, x: clampX(cx - pw / 2), y: spot.y + spot.h + gap };
  if (side === 'top') return { mode: 'beside', side, x: clampX(cx - pw / 2), y: spot.y - gap - ph };
  if (side === 'right')
    return { mode: 'beside', side, x: spot.x + spot.w + gap, y: clampY(cy - ph / 2) };
  return { mode: 'beside', side, x: spot.x - gap - pw, y: clampY(cy - ph / 2) };
}

/** Problems with a site's tour config, in plain words (the unit test runs every site's). */
export function tourConfigProblems(
  tours: TourDef[] | undefined,
  welcome?: WelcomeConfig,
  news?: WhatsNewEntry[],
): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const dash = /—/;
  for (const t of tours ?? []) {
    if (ids.has(t.id)) out.push(`Two tours are called "${t.id}".`);
    ids.add(t.id);
    if (!t.steps.length) out.push(`Tour "${t.id}" has no steps.`);
    t.steps.forEach((s, i) => {
      if (!s.title.trim() || !s.body.trim())
        out.push(`Tour "${t.id}" step ${i + 1} needs a title and words.`);
      if (dash.test(s.title + s.body)) out.push(`Tour "${t.id}" step ${i + 1} has an em-dash.`);
      if (s.anchor?.startsWith('css:') && s.anchor.length < 6)
        out.push(`Tour "${t.id}" step ${i + 1}: empty css anchor.`);
    });
  }
  if (welcome?.tour && !ids.has(welcome.tour))
    out.push(`The welcome starts "${welcome.tour}", which is not a tour.`);
  if (welcome && dash.test(welcome.title + welcome.body + (welcome.points ?? []).join(''))) {
    out.push('The welcome has an em-dash.');
  }
  for (const n of news ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date))
      out.push(`What's new "${n.title}" needs a date like 2026-10-19.`);
    if (n.tour && !ids.has(n.tour))
      out.push(`What's new "${n.title}" offers "${n.tour}", which is not a tour.`);
    if (dash.test(n.title + n.items.join(''))) out.push(`What's new "${n.title}" has an em-dash.`);
  }
  return out;
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Studio kit: the pure half (staff view, links, "is it live?", this week)
// =============================================================================
// Added 2026-10-17 with the Studio kit (src/sanity/kit/). Kept free of React and
// Sanity imports so bare-Node unit tests (src/lib/studio-kit.test.ts) can check
// every rule here. Generic on purpose: nothing in this file names a site, a
// document type or a person. The site-specific half is src/sanity/kit.config.ts.
//
// Canonical in ncs-astro-sanity-starter (PORTS.md card 106).
// =============================================================================

// -----------------------------------------------------------------------------
// The staff view
// -----------------------------------------------------------------------------
// Like the WordPress staff admin on the family's WordPress sites: a LISTED set of
// accounts (Sanity user ids or emails) sees a plain Studio (fewer tools, no permanent delete), whatever
// their Sanity role. With no list, Sanity's own non-administrator roles count
// as staff. Anyone can switch for this browser tab: staff to "the full
// Studio", an administrator to "the staff view" (to see what staff see).
// -----------------------------------------------------------------------------

/** The slice of Sanity's CurrentUser the kit reads. */
export interface KitUser {
  id?: string;
  name?: string;
  email?: string;
  roles?: Array<{ name: string }>;
}

/** What the person chose for this tab, if anything. */
export type ViewOverride = 'staff' | 'full' | null;

/** The sessionStorage key for the choice (per tab, gone when the tab closes). */
export const VIEW_KEY = 'ncs-studio-kit-view';

/**
 * Is this person on the staff list (or, with no list, not an administrator)?
 * The list holds Sanity user ids (preferred: they are not personal data, so
 * they can sit in a public repo) or email addresses, case-insensitively.
 */
export function isStaffUser(user: KitUser | null | undefined, staff: string[]): boolean {
  if (!user) return false;
  const list = staff.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list.length > 0) {
    const mine = [user.id, user.email].filter(Boolean).map((v) => String(v).trim().toLowerCase());
    return mine.some((v) => list.includes(v));
  }
  const roles = (user.roles ?? []).map((r) => r.name);
  return roles.length > 0 && !roles.includes('administrator');
}

/** Should the Studio show the staff view right now? */
export function isStaffView(
  user: KitUser | null | undefined,
  staff: string[],
  override: ViewOverride,
): boolean {
  if (override === 'staff') return true;
  if (override === 'full') return false;
  return isStaffUser(user, staff);
}

/** Read the tab's choice; anything unexpected (or no storage) counts as none. */
export function readOverride(storage: Pick<Storage, 'getItem'> | null | undefined): ViewOverride {
  try {
    const v = storage?.getItem(VIEW_KEY);
    return v === 'staff' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}

/** First name for the welcome line ("Sam Rivera" -> "Sam"). */
export function firstName(name: string | undefined | null): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first || 'there';
}

// -----------------------------------------------------------------------------
// Links inside the Studio
// -----------------------------------------------------------------------------
// The embedded Studio is HASH-routed on the deployed site, so a plain
// <a href="/studio/structure/..."> leaves it and 404s (WCP, 2026-09). Cards
// build a path here and navigate through the router (kit/studioLink.ts).
// -----------------------------------------------------------------------------

export type StudioTarget =
  /** A document's editor. `type` defaults to the id (the singleton convention). */
  | { doc: string; type?: string; field?: string }
  /** A desk pane by id path, ';'-separated for nesting. */
  | { pane: string }
  /** A new document of a type. */
  | { create: string; template?: string }
  /** A top-bar tool by name. */
  | { tool: string };

export function studioTargetPath(basePath: string, target: StudioTarget): string {
  const base = basePath.replace(/\/+$/, '');
  if ('doc' in target) {
    return (
      `${base}/intent/edit/id=${target.doc};type=${target.type ?? target.doc}` +
      (target.field ? `;path=${encodeURIComponent(target.field)}` : '')
    );
  }
  if ('create' in target) {
    return (
      `${base}/intent/create/type=${target.create}` +
      (target.template ? `;template=${target.template}` : '')
    );
  }
  if ('tool' in target) return `${base}/${target.tool}`;
  return `${base}/structure/${target.pane}`;
}

// -----------------------------------------------------------------------------
// "Is it live?"
// -----------------------------------------------------------------------------
// The site is statically built, so a Publish shows only after the next build
// (CLAUDE.md rule 6). The build writes /build-info.json with its start time;
// comparing that with the newest published change answers the editor's first
// support question ("I pressed Publish and nothing happened") in plain words.
// -----------------------------------------------------------------------------

export type LiveState = 'live' | 'on-its-way' | 'slow' | 'unknown';

export interface LiveStatus {
  state: LiveState;
  /** One plain sentence for the card. */
  message: string;
}

const MINUTE = 60 * 1000;

/**
 * @param builtAt ISO time the live site was built (null when unknown)
 * @param lastPublishAt ISO time of the newest published change (null when none)
 * @param slowAfterMinutes after this long, "on its way" becomes "taking longer than usual"
 */
export function liveStatus(
  builtAt: string | null | undefined,
  lastPublishAt: string | null | undefined,
  now: number,
  slowAfterMinutes = 15,
): LiveStatus {
  const built = builtAt ? Date.parse(builtAt) : NaN;
  if (Number.isNaN(built)) {
    return {
      state: 'unknown',
      message:
        'The website could not say when it was last updated. Your published changes are safe.',
    };
  }
  const published = lastPublishAt ? Date.parse(lastPublishAt) : NaN;
  if (Number.isNaN(published) || published <= built) {
    return { state: 'live', message: 'Everything you have published is on the website.' };
  }
  const waited = now - published;
  if (waited > slowAfterMinutes * MINUTE) {
    return {
      state: 'slow',
      message:
        'Your latest change is published but the website has not updated yet. That is taking longer than usual, so it is worth asking for help.',
    };
  }
  return {
    state: 'on-its-way',
    message:
      'Your latest change is published and on its way. The website usually updates within a few minutes.',
  };
}

/** "just now", "5 minutes ago", "yesterday", "3 days ago". */
export function timeAgo(iso: string | null | undefined, now: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((now - t) / MINUTE));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// -----------------------------------------------------------------------------
// "This week"
// -----------------------------------------------------------------------------

/**
 * Midnight at the start of this week (Monday by default; 0 = Sunday), in the
 * browser's own time zone, as an ISO string for a GROQ $weekStart parameter.
 */
export function weekStart(now: Date, firstDay = 1): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const back = (d.getDay() - firstDay + 7) % 7;
  d.setDate(d.getDate() - back);
  return d.toISOString();
}

/** A "This week" check's answer counts as done when it is true or a positive number. */
export function isDone(answer: unknown): boolean {
  if (typeof answer === 'number') return answer > 0;
  return answer === true;
}

// -----------------------------------------------------------------------------
// The navbar status line (PORTS.md card 110)
// -----------------------------------------------------------------------------
// The same answer as Home's "Is it live?", cut to a few words for a thin line
// under the top bar, so "I pressed Publish and nothing happened" is answered on
// every screen. Null means "say nothing" (no build time to compare with).
// -----------------------------------------------------------------------------

/** How long a rebuild usually takes, for the "about N minutes" countdown. */
export const TYPICAL_UPDATE_MINUTES = 3;

export interface NavbarStatus {
  /** @sanity/ui tone: neutral when settled, primary while updating, caution when slow. */
  tone: 'default' | 'primary' | 'caution';
  text: string;
}

export function navbarStatus(
  builtAt: string | null | undefined,
  lastPublishAt: string | null | undefined,
  now: number,
  slowAfterMinutes = 15,
  typicalMinutes = TYPICAL_UPDATE_MINUTES,
): NavbarStatus | null {
  const status = liveStatus(builtAt, lastPublishAt, now, slowAfterMinutes);
  if (status.state === 'unknown') return null;
  if (status.state === 'live') return { tone: 'default', text: 'Website up to date' };
  if (status.state === 'slow') {
    return { tone: 'caution', text: 'The website update is taking longer than usual' };
  }
  const waited = (now - Date.parse(lastPublishAt ?? '')) / MINUTE;
  const left = Math.ceil(typicalMinutes - waited);
  if (left >= 2) return { tone: 'primary', text: `Updating the website, about ${left} minutes` };
  if (left === 1) return { tone: 'primary', text: 'Updating the website, about a minute' };
  return { tone: 'primary', text: 'Updating the website, nearly there' };
}

/** "Good morning" / "Good afternoon" / "Good evening" by the browser's clock (Home's header). */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

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

// -----------------------------------------------------------------------------
// "The last update didn't go through" (PORTS.md card 111)
// -----------------------------------------------------------------------------
// /api/studio/deploy-status/ says whether the newest production deploy failed
// (src/lib/deploy-status.ts). A failure outranks every build-time comparison:
// "taking longer than usual" would be a comforting lie, since nothing is coming.
// -----------------------------------------------------------------------------

/** The slice of the route's answer the Studio reads. */
export interface DeployAnswer {
  configured: boolean;
  state: 'ok' | 'failed' | 'running' | 'unknown';
}

export interface DeployProblem {
  tone: 'critical';
  /** The status line. */
  text: string;
  /** Home's card, a little longer. */
  message: string;
}

/** Null unless the newest deploy failed. Missing or unconfigured: null (old behaviour). */
export function deployProblem(
  deploy: DeployAnswer | null | undefined,
  helperName: string,
): DeployProblem | null {
  if (!deploy?.configured || deploy.state !== 'failed') return null;
  return {
    tone: 'critical',
    text: `The last update didn't go through. ${helperName} has been told.`,
    message: `The last update didn't go through, so the website is showing an older version. ${helperName} has been told. Your published changes are safe, and "Try again" starts the update once more.`,
  };
}

// -----------------------------------------------------------------------------
// The weekly checklist (PORTS.md card 111)
// -----------------------------------------------------------------------------
// "This week" jobs are ticked three ways: a GROQ check over the content (a
// sermon dated last Sunday exists), the Checkup being clear, or by hand. Hand
// ticks live on one small document per week (WEEK_TYPE, id from weekDocId), so
// a new week starts with a fresh document and nothing has to be reset.
// -----------------------------------------------------------------------------

/** The kit's own document type for hand ticks. Excluded from Home's lists and the live check. */
export const WEEK_TYPE = 'studioWeek';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The local date ("2026-10-12") the week containing `now` starts on. */
export function weekKey(now: Date, firstDay = 1): string {
  return localDate(new Date(weekStart(now, firstDay)));
}

/** The id of the week's tick document. */
export function weekDocId(key: string): string {
  return `${WEEK_TYPE}-${key}`;
}

/** The local date of the most recent Sunday (today, on a Sunday). */
export function lastSunday(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  return localDate(d);
}

/** The local date of the next Sunday (today, on a Sunday). */
export function comingSunday(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return localDate(d);
}

export type TickedBy = 'content' | 'checkup' | 'hand';

export interface ChecklistTask {
  id: string;
  query?: string;
  check?: 'checkup';
  manual?: boolean;
}

export interface ChecklistRow {
  id: string;
  done: boolean;
  /** How "done" is known; null while not done. */
  by: TickedBy | null;
  /** Can the editor tick or untick it? Only hand jobs. */
  tickable: boolean;
}

/**
 * Each job's state. `answers` holds the GROQ answers by id, `ticked` the hand
 * ticks for this week, `checkupClear` whether the Checkup has nothing in
 * "Needs doing" (null while it runs).
 */
export function checklist(
  tasks: ChecklistTask[],
  answers: Record<string, unknown>,
  ticked: string[],
  checkupClear: boolean | null,
): ChecklistRow[] {
  const hand = new Set(ticked);
  return tasks.map((t) => {
    if (t.manual || (!t.query && !t.check)) {
      const done = hand.has(t.id);
      return { id: t.id, done, by: done ? 'hand' : null, tickable: true };
    }
    if (t.check === 'checkup') {
      const done = checkupClear === true;
      return { id: t.id, done, by: done ? 'checkup' : null, tickable: false };
    }
    const done = isDone(answers[t.id]);
    return { id: t.id, done, by: done ? 'content' : null, tickable: false };
  });
}

// -----------------------------------------------------------------------------
// Quick update forms (PORTS.md card 111)
// -----------------------------------------------------------------------------

/** Card 111's five kinds, plus card 137's number, boolean, select, file and image. */
export type QuickFieldKind =
  | 'string'
  | 'text'
  | 'date'
  | 'datetime'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'file'
  | 'image';

export interface QuickFieldRule {
  name: string;
  title: string;
  kind: QuickFieldKind;
  required?: boolean;
  /** For 'string' and 'text': the most characters allowed. */
  max?: number;
  /** For 'select' (card 137): the choices. */
  options?: { title: string; value: string }[];
}

/** Plain-words problems with a quick form's answers, by field name. Empty means good to go. */
export function quickFormErrors(
  fields: QuickFieldRule[],
  values: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = (values[f.name] ?? '').trim();
    if (!v) {
      if (f.required) errors[f.name] = `${f.title} is needed.`;
      continue;
    }
    if (f.max && v.length > f.max) {
      errors[f.name] = `Keep it under ${f.max} characters (it is ${v.length}).`;
    } else if (f.kind === 'url' && !/^https?:\/\/\S+\.\S+/.test(v)) {
      errors[f.name] = 'Paste the whole link, starting with https://';
    } else if (f.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      errors[f.name] = 'Pick a date.';
    } else if (f.kind === 'datetime' && Number.isNaN(Date.parse(v))) {
      errors[f.name] = 'Pick a date and time.';
    } else if (f.kind === 'number' && !Number.isFinite(Number(v))) {
      errors[f.name] = 'Type a number.';
    } else if (f.kind === 'select' && f.options && !f.options.some((o) => o.value === v)) {
      errors[f.name] = 'Pick one of the choices.';
    }
  }
  return errors;
}

// -----------------------------------------------------------------------------
// "How to" beside a field (card 134)
// -----------------------------------------------------------------------------
// A small map in the site's guides config says which Site Guide section
// explains a field: by the field's NAME (`seoTitle`, `alt`) or by its schema
// TYPE (`seo`, `image`), the name winning. The Studio draws a quiet "How to"
// chip after the field's description that opens that section. A field the map
// does not name is left exactly as Sanity draws it.

/** Where a field's "How to" opens: a guide, and optionally one of its headings. */
export interface FieldGuideLink {
  /** The guide's slug. */
  guide: string;
  /** The text of one of the guide's headings (a `{ kind: 'h' }` block). */
  section?: string;
}

/** The map, in the site's guides config (`GUIDE_FOR_FIELD`). */
export interface FieldGuideMap {
  /** Field name -> guide section. Use names that mean one thing (`seoTitle`, not `title`). */
  fields?: Record<string, FieldGuideLink>;
  /** Schema type name -> guide section, for a type used in many places. */
  types?: Record<string, FieldGuideLink>;
}

/**
 * A lookup for the field wrapper: `(name, typeNames) => link | null`. Built
 * once per Studio; answers are cached by name and type chain, because the
 * wrapper runs for every field on every render and must cost next to nothing.
 * An empty map gives a lookup that always answers null.
 */
export function fieldGuideLookup(
  map: FieldGuideMap | undefined | null,
): (name: string, typeNames: readonly string[]) => FieldGuideLink | null {
  const fields = map?.fields ?? {};
  const types = map?.types ?? {};
  const own = (o: Record<string, FieldGuideLink>, k: string) =>
    Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
  if (!Object.keys(fields).length && !Object.keys(types).length) return () => null;
  const cache = new Map<string, FieldGuideLink | null>();
  return (name, typeNames) => {
    const key = `${name}|${typeNames.join('>')}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let found: FieldGuideLink | null = own(fields, name) ?? null;
    for (const t of typeNames) {
      if (found) break;
      found = own(types, t) ?? null;
    }
    cache.set(key, found);
    return found;
  };
}

/** The anchor id of a guide section ("What alt text is" -> "what-alt-text-is"). */
export function guideSectionId(slug: string, heading: string): string {
  const s = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `guide-${slug}--${s || 'section'}`;
}

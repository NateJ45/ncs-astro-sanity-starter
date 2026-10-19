// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// change-summary.mjs - the pure half of the morning change note (PORTS.md card 117)
// =============================================================================
// scripts/change-note.mjs asks Sanity what moved in the last 24 hours and hands
// the raw answers to buildChangeSummary(), which turns them into the plain list
// that becomes a GitHub issue ("What changed on <date>"). Kept free of fetch and
// the filesystem so scripts/lib/change-summary.test.mjs can check every rule.
//
// WHAT COUNTS AS A CHANGE. Sanity keeps a published document and its unpublished
// twin (`drafts.<id>`) side by side, so one editor action can touch either:
//   - the published copy changed  -> "published" (or "published a new" when it
//     was created inside the window);
//   - only the draft changed      -> "edited, not published yet" (or "started a
//     new draft" when there is no published copy at all);
//   - a trashedItem was written    -> "moved to the Trash" (the kit's Trash,
//     src/lib/studio-trash.ts). A permanent delete from outside the kit leaves
//     no record here and is not reported; the nightly backup still has it.
// System documents (assets, the Trash records themselves, the weekly tick,
// share-link records, anything under `_.` or a `sanity.`/`system.` type) never
// show, because none of them is something an editor would call "a change".
//
// WHO. The script reads the transaction history for the changed ids and passes
// the newest author per id plus a userId -> name map. Unknown authors read as
// "Someone" rather than an id, because the issue is for a person to read.
// =============================================================================

/** Types never reported. Prefix rules below catch the system families. */
export const IGNORED_TYPES = new Set([
  'trashedItem',
  'studioWeek',
  'previewShare',
  'sectionPreset',
  // The weekly link check's report (card 122): bookkeeping, not a change.
  'linkReport',
  // Private pages (card 122): this note becomes a GitHub issue, and the repo
  // may be public. A private page's name is not for a public issue.
  'privatePage',
]);
const IGNORED_PREFIXES = ['sanity.', 'system.', 'assist.', 'media.'];

/** Is this a document an editor would call a change? */
export function isReportable(doc) {
  if (!doc || typeof doc._id !== 'string' || typeof doc._type !== 'string') return false;
  if (doc._id.startsWith('_.') || doc._id.startsWith('versions.')) return false;
  if (IGNORED_TYPES.has(doc._type)) return false;
  return !IGNORED_PREFIXES.some((p) => doc._type.startsWith(p));
}

/** `drafts.abc` -> `abc`. */
export function publishedIdOf(id) {
  return id.startsWith('drafts.') ? id.slice('drafts.'.length) : id;
}

/** `journalEntry` -> `journal entry`. Plain words for the issue. */
export function humanType(type) {
  return String(type)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .trim();
}

const TITLE_FIELDS = ['title', 'name', 'heading', 'question', 'label'];

/** A readable name for a document, never blank. */
export function docTitle(doc) {
  for (const f of TITLE_FIELDS) {
    const v = doc?.[f];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * The Studio link for a document. The embedded Studio is hash-routed when
 * deployed (docs/agent/studio-kit.md), so the route goes after `#`; the Studio
 * also accepts the same route as a plain path in development.
 */
export function studioEditUrl(siteUrl, id, type) {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  return `${base}/studio/#/studio/intent/edit/id=${encodeURIComponent(id)};type=${encodeURIComponent(type)}`;
}

/** The 24-hour window ending at `now` (a Date). ISO strings, UTC. */
export function windowFor(now, hours = 24) {
  const to = new Date(now.getTime());
  const from = new Date(now.getTime() - hours * 3600 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const EASTERN = 'America/New_York';

/** "Saturday, October 18, 2026" in US Eastern time. */
export function easternDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** "Fri 6:05 AM" in US Eastern time. */
export function easternTime(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** The issue title for a run ending at `toIso`. */
export function issueTitle(toIso) {
  return `What changed on ${easternDate(toIso)}`;
}

/**
 * Classify the raw query answers into one entry per published id.
 *
 * @param {object} input
 * @param {Array<object>} input.docs        documents (raw perspective) with _updatedAt in the window
 * @param {Array<string>} input.publishedIds published ids that exist right now (for drafts)
 * @param {Array<object>} input.trashed     trashedItem documents created in the window
 * @param {string} input.from               window start, ISO
 * @returns {Array<{id,type,title,action,at}>}
 */
export function classifyChanges({ docs = [], publishedIds = [], trashed = [], from }) {
  const exists = new Set(publishedIds);
  const byId = new Map();

  for (const doc of docs) {
    if (!isReportable(doc)) continue;
    const id = publishedIdOf(doc._id);
    const entry = byId.get(id) ?? { id, type: doc._type, title: '', pub: null, draft: null };
    if (doc._id.startsWith('drafts.')) entry.draft = doc;
    else entry.pub = doc;
    entry.title = entry.title || docTitle(doc);
    byId.set(id, entry);
  }

  const out = [];
  for (const e of byId.values()) {
    if (e.pub) {
      const isNew = Boolean(from && e.pub._createdAt && e.pub._createdAt >= from);
      out.push({
        id: e.id,
        type: e.type,
        title: e.title,
        action: isNew ? 'published-new' : 'published',
        draftPending: Boolean(e.draft),
        at: e.pub._updatedAt,
      });
    } else if (e.draft) {
      out.push({
        id: e.id,
        type: e.type,
        title: e.title,
        action: exists.has(e.id) ? 'edited' : 'new-draft',
        draftPending: false,
        at: e.draft._updatedAt,
      });
    }
  }

  for (const t of trashed) {
    if (!t || !t.originalId) continue;
    const type = t.originalType || t.kind || 'document';
    out.push({
      id: t.originalId,
      type,
      title: typeof t.title === 'string' ? t.title : '',
      action: 'trashed',
      draftPending: false,
      at: t.deletedAt || t._createdAt,
      trashId: t._id,
    });
  }

  // Newest first, ties by title, so the list reads like a diary of the day.
  return out.sort((a, b) =>
    a.at === b.at ? a.title.localeCompare(b.title) : a.at < b.at ? 1 : -1,
  );
}

/** One plain sentence per action, with the kind and name filled in. */
export function describeChange(action, kind, name) {
  switch (action) {
    case 'published-new':
      return `published a new ${kind} ${name}`;
    case 'published':
      return `published changes to the ${kind} ${name}`;
    case 'edited':
      return `edited the ${kind} ${name} (not published yet)`;
    case 'new-draft':
      return `started a new ${kind} ${name} (not published yet)`;
    case 'trashed':
      return `moved the ${kind} ${name} to the Trash`;
    default:
      return `changed the ${kind} ${name}`;
  }
}

/**
 * The whole issue. Returns null on a quiet day (nothing reportable), which the
 * script turns into "post nothing".
 *
 * @param {object} input       classifyChanges input plus:
 * @param {string} input.to    window end, ISO
 * @param {Record<string,string>} [input.authors] published id -> user id
 * @param {Record<string,string>} [input.names]   user id -> display name
 * @param {string} input.siteUrl                  the live site origin
 * @param {(type:string, doc:object)=>string|null} [input.pathFor] live path for a doc
 */
export function buildChangeSummary(input) {
  const changes = classifyChanges(input);
  if (changes.length === 0) return null;

  const { authors = {}, names = {}, siteUrl, pathFor, from, to } = input;
  const site = String(siteUrl || '').replace(/\/+$/, '');
  const docsById = new Map();
  // The published copy wins for the live link (its slug is the live one).
  for (const d of input.docs ?? []) {
    const id = publishedIdOf(d._id);
    if (!docsById.has(id) || !d._id.startsWith('drafts.')) docsById.set(id, d);
  }

  const lines = changes.map((c) => {
    const who = names[authors[c.id]] || 'Someone';
    const kind = humanType(c.type);
    const name = c.title ? `"${c.title}"` : `(no title yet)`;
    const what = describeChange(c.action, kind, name);
    const links = [];
    if (c.action === 'trashed') {
      if (c.trashId) links.push(`[Trash entry](${studioEditUrl(site, c.trashId, 'trashedItem')})`);
    } else {
      links.push(`[Open in the Studio](${studioEditUrl(site, c.id, c.type)})`);
      const path = pathFor ? pathFor(c.type, docsById.get(c.id) ?? {}) : null;
      if (path && (c.action === 'published' || c.action === 'published-new')) {
        links.push(`[Live page](${site}${path.endsWith('/') ? path : `${path}/`})`);
      }
    }
    const extra = c.draftPending ? ' It also has newer changes that are not published yet.' : '';
    return `- ${easternTime(c.at)}: **${who}** ${what}.${extra} ${links.join(' | ')}`.trimEnd();
  });

  const people = new Set(changes.map((c) => names[authors[c.id]] || 'Someone'));
  const count = changes.length;
  const body = [
    `${count} ${count === 1 ? 'change' : 'changes'} in the Studio between ${easternTime(from)} and ${easternTime(to)} (US Eastern), by ${[...people].join(', ')}.`,
    '',
    ...lines,
    '',
    'A published change goes live after the next website build, usually a few minutes later. This note is written by the change-note workflow each morning; quiet days post nothing.',
  ].join('\n');

  return { title: issueTitle(to), body, count };
}

/**
 * The newest author per published id from Sanity's transaction history
 * (NDJSON lines of { timestamp, author, documentIDs }).
 */
export function authorsFromTransactions(transactions) {
  const latest = {};
  for (const tx of transactions ?? []) {
    if (!tx || !tx.author || !Array.isArray(tx.documentIDs)) continue;
    for (const raw of tx.documentIDs) {
      const id = publishedIdOf(String(raw));
      if (!latest[id] || latest[id].at < tx.timestamp)
        latest[id] = { at: tx.timestamp, by: tx.author };
    }
  }
  return Object.fromEntries(Object.entries(latest).map(([id, v]) => [id, v.by]));
}

/** NDJSON text -> array, skipping blank or broken lines. */
export function parseNdjson(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // A torn line is skipped; the authors map is best-effort.
    }
  }
  return out;
}

/** The site origin from astro.config.mjs's `site:` (fallback when no SITE_URL). */
export function siteFromAstroConfig(text) {
  const m = /\bsite:\s*['"`](https?:\/\/[^'"`]+)['"`]/.exec(String(text ?? ''));
  return m ? m[1].replace(/\/+$/, '') : null;
}

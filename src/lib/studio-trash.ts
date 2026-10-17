// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Trash: the pure half of "Move to Trash" (Studio kit, 2026-10-17)
// =============================================================================
// Ported from mas-monograms src/sanity/lib/trash.ts (itself from Reid Design's
// archive action), with the type lists moved out to the site's kit.config.ts.
// Kept free of React and the Sanity client so bare-Node tests
// (src/lib/studio-trash.test.ts) can check every rule here.
//
// THE MODEL IS SNAPSHOT-TO-TRASH, NOT AN `archived: true` FLAG. Moving something
// to Trash writes a `trashedItem` holding a copy of it and DELETES the
// original, in one transaction. So no site query has to remember to filter
// anything out, the checkup counts only real documents, and Restore writes the
// copy back under the SAME id, so anything that pointed at it works again.
//
// The published copy and the unpublished changes are kept SEPARATELY, and each
// goes back to where it was, so a restore never quietly publishes changes
// nobody pressed Publish for.
// =============================================================================

/** The document type that holds a trashed copy. The site never reads it. */
export const TRASH_TYPE = 'trashedItem';

type Doc = Record<string, any>;

/** System fields Sanity recomputes on write (_rev would conflict on restore). */
const SYSTEM_FIELDS = ['_rev', '_createdAt', '_updatedAt', '_system', '_originalId'];

/** Fields looked at, in order, to give a trashed item a readable name. */
const TITLE_CANDIDATES = ['title', 'name', 'heading', 'question', 'label'] as const;

/** Strip the `drafts.` prefix so ids always name the published document. */
export function publishedId(id: string): string {
  return id.startsWith('drafts.') ? id.slice('drafts.'.length) : id;
}

/** A readable name for the Trash row. Never blank. */
export function trashTitle(doc: Doc | null | undefined, kind?: string): string {
  if (doc) {
    for (const field of TITLE_CANDIDATES) {
      const value = doc[field];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return kind ? `${kind} with no name` : 'Something with no name';
}

/** A copy of a document with the system fields removed and its id pinned. */
export function snapshot(doc: Doc, id: string): Doc {
  const out: Doc = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!SYSTEM_FIELDS.includes(k)) out[k] = v;
  }
  out._id = id;
  out._type = doc._type;
  return out;
}

export interface TrashPayload {
  published: Doc | null;
  draft: Doc | null;
}

/**
 * The trashedItem to write for a document, from its published copy and its
 * unpublished changes (either may be missing, not both). `now` is an ISO time.
 */
export function buildTrashRecord(
  type: string,
  id: string,
  published: Doc | null | undefined,
  draft: Doc | null | undefined,
  now: string,
  kind?: string,
): Doc {
  if (!published && !draft) throw new Error('There is nothing to move to the Trash.');
  const pub = publishedId(id);
  const payload: TrashPayload = {
    published: published ? snapshot(published, pub) : null,
    draft: draft ? snapshot(draft, `drafts.${pub}`) : null,
  };
  return {
    _type: TRASH_TYPE,
    title: trashTitle(draft ?? published, kind),
    kind: kind ?? type,
    originalType: type,
    originalId: pub,
    deletedAt: now,
    wasPublished: Boolean(published),
    payload: JSON.stringify(payload),
  };
}

/**
 * Read a trashedItem's payload back. Defensive: system fields are stripped
 * again and the ids are re-pinned from `originalId`, never trusted from the
 * text.
 */
export function parseTrashPayload(payload: string, originalId: string): TrashPayload {
  const raw = JSON.parse(payload) as Doc;
  const pub = publishedId(originalId);
  const isSplit = raw && typeof raw === 'object' && ('published' in raw || 'draft' in raw);
  const published = isSplit ? raw.published : raw;
  const draft = isSplit ? raw.draft : null;
  return {
    published: published && typeof published === 'object' ? snapshot(published, pub) : null,
    draft: draft && typeof draft === 'object' ? snapshot(draft, `drafts.${pub}`) : null,
  };
}

/** The documents Restore writes back, published first. */
export function restoreDocs(payload: TrashPayload): Doc[] {
  return [payload.published, payload.draft].filter((d): d is Doc => Boolean(d));
}

/** Who still points at this document (not itself, not the Trash). */
export const REFERRERS_QUERY = `*[references($id) && !(_id in [$id, $draftId]) && _type != "${TRASH_TYPE}"]{ _id, _type, "name": coalesce(title, name, heading, question, label) }`;

/** Plain words for "these still use it", or null when nothing does. */
export function referrersMessage(
  rows: Array<{ _id: string; _type: string; name?: string | null }>,
): string | null {
  if (!rows.length) return null;
  const names = [...new Set(rows.map((r) => r.name?.trim() || 'one other page'))];
  const shown =
    names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '');
  const what =
    rows.length === 1 ? 'Something else uses this' : `${rows.length} other things use this`;
  return `${what}: ${shown}. Change ${rows.length === 1 ? 'it' : 'them'} first, so nothing on the website is left with a gap, then try again.`;
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// pageOps - duplicate, archive, and add a saved section, as plain functions
// =============================================================================
// "Pages as first-class objects" gives an editor verbs the Studio does not
// ship: copy this page, put it away, bring it back, drop a saved section onto
// it. The verbs are the same wherever they are offered, so the LOGIC lives here
// and the surfaces stay thin:
//
//   - src/sanity/components/pageActions.tsx  (the publish-menu actions, in every
//     repo in this family)
//   - src/sanity/components/PreviewNavigator.tsx (per-row buttons, in the repos
//     that ship the Presentation page list)
//   - src/sanity/actions/addPresetToPage.tsx (a "put this on a page" dialog, in
//     the repos that have no navigator to offer it from)
//
// DUPLICATE makes a DRAFT. A copy that published itself would be a second live
// page at a made-up address, so the copy starts as a draft the editor finishes
// and publishes deliberately. It starts from the draft twin when there is one,
// because that is the newest wording. Every nested `_key` is regenerated: two
// array members sharing a key inside one document is a real corruption, and
// Sanity's own conflict resolution behaves unpredictably when it happens.
//
// ARCHIVE is a patch, not a delete. `archived: true` is set on BOTH twins (the
// draft and the published document) so the page drops off the live site at the
// next build whether or not it had unpublished edits. Nothing is thrown away and
// nothing is reference-blocked, so Restore is complete: it unsets the same field
// on both twins and the page comes back exactly as it was.
//
// ADD A SAVED SECTION writes to the DRAFT, always. A saved section that
// appeared on the live page the moment it was clicked would be a publish nobody
// asked for, so the section is appended to the draft twin (made from the
// published document first when there is not one yet, which is exactly what
// typing in the form would have done) and the editor still presses Publish.
//
// The queries the live site runs test `archived != true`, never `archived ==
// false`, so a page made before this field existed stays visible.
// =============================================================================

/** The minimum client surface these helpers need. Keeps them testable and free
 *  of a hard dependency on the Studio's client type. */
export interface PageOpsClient {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  create: (doc: Record<string, unknown>) => Promise<{ _id: string }>;
  createIfNotExists: (doc: Record<string, unknown>) => Promise<{ _id: string }>;
  patch: (id: string) => PageOpsCommittablePatch;
  transaction: () => PageOpsTransaction;
}

export interface PageOpsTransaction {
  patch: (id: string, fn: (p: PageOpsPatch) => PageOpsPatch) => PageOpsTransaction;
  commit: () => Promise<unknown>;
}

export interface PageOpsPatch {
  set: (value: Record<string, unknown>) => PageOpsPatch;
  unset: (paths: string[]) => PageOpsPatch;
  setIfMissing: (value: Record<string, unknown>) => PageOpsPatch;
  append: (path: string, items: unknown[]) => PageOpsPatch;
}

/** The patch builder `client.patch(id)` returns: the same verbs, plus commit. */
export interface PageOpsCommittablePatch extends PageOpsPatch {
  commit: () => Promise<unknown>;
}

/** A fresh Sanity array `_key`. Short, random, and collision-free in practice. */
export function newKey(): string {
  return Math.random().toString(36).slice(2, 12);
}

/** Give every array member in the copy a new `_key`, at every depth. */
export function regenerateKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(regenerateKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = k === '_key' ? newKey() : regenerateKeys(v);
    }
    return out;
  }
  return value;
}

/** Read a slug whether it is a plain string or Sanity's slug object. */
export function readSlug(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const current = (value as { current?: unknown } | null)?.current;
  return typeof current === 'string' ? current : null;
}

/**
 * A free web address for the copy: "about" -> "about-copy", then "about-copy-2",
 * "about-copy-3", and so on until nothing else holds it.
 */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  const first = `${base}-copy`;
  if (!taken.has(first)) return first;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${first}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${first}-${newKey()}`;
}

/**
 * Copy one document into a NEW DRAFT and return the new document id (without
 * the `drafts.` prefix, which is what a navigate() call wants).
 *
 * `type` is the document type to read the source from, and the type the copy is
 * created as. The source is read with a raw perspective so the draft twin wins
 * when there is one.
 */
export async function duplicatePage(
  client: PageOpsClient,
  type: string,
  id: string,
  fallbackTitle: string,
): Promise<string> {
  const found = await client.fetch<Record<string, unknown>[]>('*[_id in $ids]', {
    ids: [`drafts.${id}`, id],
  });
  const source = found.find((d) => String(d._id).startsWith('drafts.')) ?? found[0] ?? null;
  if (!source) throw new Error(`No document to copy at ${id}`);

  const copy = regenerateKeys(source) as Record<string, unknown>;
  delete copy._id;
  delete copy._rev;
  delete copy._createdAt;
  delete copy._updatedAt;
  // A copy starts out of the archive, and out of any scheduled publish it
  // inherited: republishing the original's schedule from a half-made copy is
  // never what the editor meant.
  delete copy.archived;
  delete copy.publishAt;

  // A free address, in whichever slug shape this repo uses.
  const takenSlugs = new Set(
    (
      await client.fetch<(string | { current?: string } | null)[]>('*[_type == $type].slug', {
        type,
      })
    )
      .map(readSlug)
      .filter((s): s is string => Boolean(s)),
  );
  const baseSlug = readSlug(source.slug) || 'page';
  const nextSlug = freeSlug(baseSlug, takenSlugs);
  copy.slug = typeof source.slug === 'string' ? nextSlug : { _type: 'slug', current: nextSlug };

  const sourceTitle =
    typeof source.title === 'string' && source.title ? source.title : fallbackTitle;
  copy.title = `${sourceTitle} copy`;

  const newId = crypto.randomUUID();
  await client.create({ ...copy, _id: `drafts.${newId}`, _type: type });
  return newId;
}

/**
 * Archive or restore, patching BOTH twins in one transaction so the two can
 * never disagree.
 *
 * The twins that actually EXIST are looked up first. A patch against a missing
 * document id fails the whole transaction, so a page with no draft (or one that
 * was never published) would otherwise throw on what looks like a plain click.
 */
export async function setPageArchived(
  client: PageOpsClient,
  id: string,
  archived: boolean,
): Promise<void> {
  const present = await client.fetch<string[]>('*[_id in $ids]._id', {
    ids: [`drafts.${id}`, id],
  });
  if (!present?.length) throw new Error(`No document to archive at ${id}`);

  let tx = client.transaction();
  for (const each of present) {
    tx = archived
      ? tx.patch(each, (p) => p.set({ archived: true }))
      : tx.patch(each, (p) => p.unset(['archived']));
  }
  await tx.commit();
}

/**
 * Append one saved section to a page's DRAFT and leave it there for the editor
 * to place and publish.
 *
 * `field` is the page-builder array on that document type; the caller reads it
 * from its repo's SECTION_HOST_TYPES so this function never has to know the
 * repo's field names. `section` is the captured value out of a `sectionPreset`.
 *
 * Every nested `_key` is replaced, and the section itself gets a fresh one, so
 * the same preset can be added to the same page twice without the array
 * carrying two members with one key (a real corruption, and one Sanity's
 * conflict resolution handles unpredictably).
 */
export async function addSectionToPage(
  client: PageOpsClient,
  id: string,
  field: string,
  section: Record<string, unknown>,
): Promise<void> {
  const draftId = `drafts.${id}`;
  const draft = await client.fetch<string[]>('*[_id == $id]._id', { id: draftId });
  if (!draft?.length) {
    const published = await client.fetch<Record<string, unknown> | null>('*[_id == $id][0]', {
      id,
    });
    if (!published) throw new Error(`No page to add to at ${id}`);
    const copy: Record<string, unknown> = { ...published, _id: draftId };
    delete copy._rev;
    delete copy._createdAt;
    delete copy._updatedAt;
    await client.createIfNotExists(copy);
  }

  const fresh = regenerateKeys({ ...section, _key: newKey() }) as Record<string, unknown>;
  await client
    .patch(draftId)
    .setIfMissing({ [field]: [] })
    .append(field, [fresh])
    .commit();
}

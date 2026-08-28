// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// pageOps - duplicate and archive, as plain functions
// =============================================================================
// "Pages as first-class objects" gives an editor three verbs the Studio does not
// ship: copy this page, put it away, bring it back. The verbs are the same
// wherever they are offered, so the LOGIC lives here and the surfaces stay thin:
//
//   - src/sanity/components/pageActions.tsx  (the publish-menu actions, in every
//     repo in this family)
//   - src/sanity/components/PreviewNavigator.tsx (per-row buttons, in the repos
//     that ship the Presentation page list)
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
// The queries the live site runs test `archived != true`, never `archived ==
// false`, so a page made before this field existed stays visible.
// =============================================================================

/** The minimum client surface these helpers need. Keeps them testable and free
 *  of a hard dependency on the Studio's client type. */
export interface PageOpsClient {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  create: (doc: Record<string, unknown>) => Promise<{ _id: string }>;
  transaction: () => PageOpsTransaction;
}

export interface PageOpsTransaction {
  patch: (id: string, fn: (p: PageOpsPatch) => PageOpsPatch) => PageOpsTransaction;
  commit: () => Promise<unknown>;
}

export interface PageOpsPatch {
  set: (value: Record<string, unknown>) => PageOpsPatch;
  unset: (paths: string[]) => PageOpsPatch;
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

// Foundation, edit with care
// =============================================================================
// instantStructure - section moves, removals, copies and picture swaps, shown
// the moment the draft reaches the frame (2026-10-26, PORTS.md card 183)
// =============================================================================
// The DOM half of src/lib/preview-structure.ts, which decides WHAT to do; this
// file only finds the elements and does it. It is driven by useInstantText,
// which already holds both snapshots of the draft (the Studio's local channel
// and the optimistic actor), so this costs no request of any kind: no server
// render, no Sanity query. The soft refresh still runs on the SSE `change` and
// renders the truth; this only stops the editor waiting for it.
//
// WHAT IT TOUCHES:
//  - Section wrappers: the preview-only `<div data-sanity>` SectionRenderer puts
//    round each section (sectionEditAttr). Moved with insertBefore (the node
//    keeps its state: revealed classes, decoded images), hidden when removed,
//    deep-cloned for a copy. A copy gets the NEW item's `data-sanity`, so the
//    morph matches it to the server's real section by key and only patches it,
//    and `data-preview-clone`, which the morph's attribute sync takes off once
//    the server's copy lands. Its text still carries the ORIGINAL's stega until
//    then, so instant text skips every node inside a clone (useInstantText).
//  - `<img>` (and its `<picture>` sources) inside ONE section wrapper, found by
//    the old asset id in the URL. Preview images carry no stega and no
//    `data-sanity`, so the section's own wrapper is the scope, and
//    `safeImageChange` makes sure the old asset is that section's one field.
//
// A STALE RENDER CANNOT UNDO IT FOR LONG. The scheduler already throws away a
// render that started before the newest document (every applied document bumps
// its sequence). One that read the query index a version behind can still be
// accepted, so after each refresh the latest draft is re-planned against what
// the page now shows, for a few refreshes, and dropped as soon as the page
// agrees, exactly like instant text's pending swaps.
// =============================================================================
import {
  diffImageRefs,
  parseSectionAttr,
  planSections,
  rekeySectionAttr,
  safeImageChange,
  scaledHeight,
  sectionKeyOf,
  showsAsset,
  swapAssetUrl,
  swapSrcset,
  type SectionPlan,
} from '../../../lib/preview-structure.ts';

/** Marks a section copied on the client, until the server's copy replaces it. */
export const CLONE_ATTRIBUTE = 'data-preview-clone';
/** Marks a section hidden on the client, until the server's HTML drops it. */
const REMOVED_ATTRIBUTE = 'data-preview-removed';
/** How many refreshes a not-yet-confirmed change is re-applied after. */
const REAPPLY_REFRESHES = 3;
/** Things a deep clone would copy wrongly (islands re-hydrate, scripts, live media). */
const UNCLONEABLE = 'astro-island, script, iframe, video, audio, form';

type Doc = Record<string, unknown>;

interface Wrapper {
  key: string;
  el: HTMLElement;
}

interface PendingImage {
  section: string;
  seen: Set<string>;
  next: string;
  remaining: number;
}

export interface InstantStructure {
  /** Apply what changed between two snapshots. Returns how many elements it wrote. */
  apply(previous: Doc, next: Doc): number;
  /** Re-apply anything the server has not caught up with, against the newest draft. */
  afterRefresh(latest: Doc | null): void;
}

export function createInstantStructure(pageId: string, field = 'pageBuilder'): InstantStructure {
  const id = pageId.replace(/^drafts\./, '');
  let structureRemaining = 0;
  const pendingImages = new Map<string, PendingImage>();

  /** This page's section wrappers, in DOM order. */
  const wrappers = (): Wrapper[] => {
    const main = document.getElementById('main');
    if (!main) return [];
    const found: Wrapper[] = [];
    for (const el of main.querySelectorAll<HTMLElement>('[data-sanity]')) {
      const target = parseSectionAttr(el.getAttribute('data-sanity'));
      if (target && target.id === id && target.field === field) found.push({ key: target.key, el });
    }
    return found;
  };

  /**
   * Show again a section this hid that is back in the array (the editor undid
   * the removal). Its wrapper never left the page, so an unchanged order makes
   * no plan, and without this it would stay hidden until the refresh.
   */
  const restore = (list: Wrapper[], wanted: ReadonlyArray<{ key: string }>): number => {
    const keys = new Set(wanted.map((entry) => entry.key));
    let writes = 0;
    for (const { key, el } of list) {
      if (!el.hasAttribute(REMOVED_ATTRIBUTE) || !keys.has(key)) continue;
      el.hidden = false;
      el.removeAttribute(REMOVED_ATTRIBUTE);
      writes += 1;
    }
    return writes;
  };

  const applyPlan = (plan: SectionPlan, list: Wrapper[]): number => {
    const parent = list[0]?.el.parentNode;
    if (!parent || !list.every((w) => w.el.parentNode === parent)) return 0;
    const byKey = new Map(list.map((w) => [w.key, w.el]));

    // Build every copy first: if any one cannot be made, nothing is touched.
    const desired: HTMLElement[] = [];
    for (const entry of plan.order) {
      if (!entry.cloneOf) {
        desired.push(byKey.get(entry.key)!);
        continue;
      }
      const source = byKey.get(entry.cloneOf)!;
      const attr = rekeySectionAttr(source.getAttribute('data-sanity') ?? '', entry.key);
      if (!attr || source.querySelector(UNCLONEABLE)) return 0;
      const copy = source.cloneNode(true) as HTMLElement;
      copy.setAttribute('data-sanity', attr);
      copy.setAttribute(CLONE_ATTRIBUTE, '');
      copy.removeAttribute(REMOVED_ATTRIBUTE);
      copy.hidden = false;
      desired.push(copy);
    }

    let writes = restore(list, plan.order);
    for (const key of plan.removed) {
      const el = byKey.get(key)!;
      if (el.hidden) continue;
      el.hidden = true;
      el.setAttribute(REMOVED_ATTRIBUTE, '');
      writes += 1;
    }

    const removed = new Set(plan.removed);
    const slots = list.filter((w) => !removed.has(w.key)).map((w) => w.el);
    if (desired.length === slots.length && desired.every((el, i) => el === slots[i])) return writes;

    // One marker where each kept section sits now, then each section in the new
    // order goes to the next marker. Dividers and other siblings stay where they
    // are; the refresh puts them right if the new neighbours need different ones.
    const markers = slots.map((el) => parent.insertBefore(document.createComment(''), el));
    let last: Node | null = null;
    desired.forEach((el, i) => {
      if (i < markers.length) parent.insertBefore(el, markers[i]);
      else parent.insertBefore(el, last ? last.nextSibling : null);
      last = el;
    });
    markers.forEach((marker) => marker.remove());
    return writes + desired.length;
  };

  /** Point every image in `root` that shows `from` at `to`. */
  const swapImages = (root: HTMLElement, from: string, to: string): number => {
    let writes = 0;
    for (const img of root.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (!src || !showsAsset(src, from)) continue;
      const nextSrc = swapAssetUrl(src, from, to);
      if (!nextSrc) continue;
      const srcset = img.getAttribute('srcset');
      const nextSrcset = srcset ? swapSrcset(srcset, from, to) : null;
      if (srcset && !nextSrcset) continue;
      const sources =
        img.parentElement?.tagName === 'PICTURE'
          ? [...img.parentElement.querySelectorAll('source')]
          : [];
      const nextSources = sources.map((source) =>
        swapSrcset(source.getAttribute('srcset') ?? '', from, to),
      );
      if (nextSources.some((value) => !value)) continue;
      sources.forEach((source, i) => source.setAttribute('srcset', nextSources[i]!));
      if (nextSrcset) img.setAttribute('srcset', nextSrcset);
      img.setAttribute('src', nextSrc);
      const width = Number(img.getAttribute('width'));
      const height = img.hasAttribute('height') ? scaledHeight(nextSrc, width, to) : null;
      if (height !== null) img.setAttribute('height', String(height));
      writes += 1;
    }
    return writes;
  };

  const sectionsOf = (doc: Doc | null): unknown[] | null => {
    const value = doc?.[field];
    return Array.isArray(value) ? value : null;
  };

  return {
    apply(previous, next) {
      let writes = 0;
      const before = sectionsOf(previous);
      const after = sectionsOf(next);

      if (before && after) {
        const list = wrappers();
        const plan = planSections(
          list.map((w) => w.key),
          before,
          after,
        );
        if (plan) {
          const done = applyPlan(plan, list);
          if (done > 0) structureRemaining = REAPPLY_REFRESHES;
          writes += done;
        } else {
          // No plan (same order, or not safe to move): an undone removal is
          // still back in the array, so it is still shown.
          writes += restore(
            list,
            after.map((item) => ({ key: String((item as { _key?: unknown })?._key ?? '') })),
          );
        }
      }

      const changes = diffImageRefs(previous, next);
      if (changes.length > 0 && before) {
        const list = wrappers();
        for (const change of changes) {
          const section = sectionKeyOf(change.path, field);
          if (!section) continue;
          const item = before.find(
            (candidate) => (candidate as { _key?: unknown } | null)?._key === section,
          );
          if (!safeImageChange(change, item)) continue;
          const el = list.find((w) => w.key === section)?.el;
          if (!el) continue;
          const done = swapImages(el, change.previous, change.next);
          if (done === 0) continue;
          writes += done;
          const old = pendingImages.get(change.path);
          const seen = new Set(old?.seen ?? []);
          seen.add(change.previous);
          seen.delete(change.next);
          pendingImages.set(change.path, {
            section,
            seen,
            next: change.next,
            remaining: REAPPLY_REFRESHES,
          });
        }
      }
      return writes;
    },

    afterRefresh(latest) {
      if (structureRemaining > 0) {
        structureRemaining -= 1;
        const sections = sectionsOf(latest);
        const list = wrappers();
        const plan = sections
          ? planSections(
              list.map((w) => w.key),
              sections,
              sections,
            )
          : null;
        if (plan) applyPlan(plan, list);
        else structureRemaining = 0;
      }

      if (pendingImages.size === 0) return;
      const list = wrappers();
      for (const [path, swap] of pendingImages) {
        const el = list.find((w) => w.key === swap.section)?.el;
        let done = 0;
        if (el) for (const ref of swap.seen) done += swapImages(el, ref, swap.next);
        swap.remaining -= 1;
        // Nothing showed an old picture: the server agrees, or the field is gone.
        if (done === 0 || swap.remaining <= 0) pendingImages.delete(path);
      }
    },
  };
}

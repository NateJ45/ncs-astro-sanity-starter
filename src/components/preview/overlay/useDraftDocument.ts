// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// useDraftDocument - the one supported way these controls change anything
// (2026-08-28)
// =============================================================================
// A control floating over the page has no Sanity token and no write client, and
// must never grow one: the preview island is public code in a public bundle.
//
// It does not need one. `useDocuments()` from @sanity/visual-editing/react hands
// back the OPTIMISTIC DOCUMENT for an id, and its `patch()` sends the mutation
// over the comlink to the parent Studio window, which applies it with the
// editor's own session exactly as if they had typed in the form. That is why
// every write here lands in the DRAFT, shows up in the Studio's unpublished-
// changes badge, is covered by the Studio's undo (PORTS.md card 27), and still
// needs Publish.
//
// The hook is only meaningful inside the <VisualEditing> tree with the optimistic
// actor running, which is precisely when overlay components exist (the host hands
// the resolver through only once `optimisticActorReady`). Outside that, and
// before the document has streamed in, the underlying calls THROW; both are
// caught here and reported as "not now" rather than crashing the preview page.
//
// It is also the READ door for instant text (PORTS.md card 29), which is why
// `readNow` exists beside `read`: that path runs on every keystroke and cannot
// afford a retry sleep or a log line.
//
// The patch shape is @sanity/mutate's NodePatch: a path of segments and one
// operation. It is typed locally rather than imported so the island depends on
// nothing that is not already in package.json.
// =============================================================================
import { useCallback } from 'react';
import { useDocuments } from '@sanity/visual-editing/react';
import { valueAtPath, type PathSegment } from '../../../lib/sanity-path.ts';

/** The three operations these controls need. */
export type PatchOp =
  { type: 'set'; value: unknown } | { type: 'setIfMissing'; value: unknown } | { type: 'unset' };

/** One patch: where, and what. */
export interface DraftPatch {
  path: PathSegment[];
  op: PatchOp;
}

/** Set a value. */
export function setAt(path: PathSegment[], value: unknown): DraftPatch[] {
  return [{ path, op: { type: 'set', value } }];
}

/** Set a value inside an object that may not exist yet. */
export function setInside(container: PathSegment[], key: string, value: unknown): DraftPatch[] {
  return [
    { path: container, op: { type: 'setIfMissing', value: {} } },
    { path: [...container, key], op: { type: 'set', value } },
  ];
}

/** Remove a value. Used for "no accent word" and for an emptied rich twin. */
export function unsetAt(path: PathSegment[]): DraftPatch[] {
  return [{ path, op: { type: 'unset' } }];
}

export interface DraftDocument {
  /** The current draft snapshot, or null when it cannot be read yet. */
  read: () => Promise<Record<string, unknown> | null>;
  /**
   * The same snapshot, with ONE attempt and no console warning. For callers that
   * run on every edit rather than on a hover: the retry-and-warn behaviour of
   * `read` would put a 250ms sleep and a log line in a hot path, and there is
   * nothing to recover - the next edit brings another chance a moment later.
   */
  readNow: () => Promise<Record<string, unknown> | null>;
  /** The value at a path in the current draft, or undefined. */
  readAt: (path: PathSegment[]) => Promise<unknown>;
  /** Apply patches to the draft and commit. Resolves false when it could not. */
  write: (patches: DraftPatch[]) => Promise<boolean>;
}

export function useDraftDocument(documentId: string): DraftDocument {
  const { getDocument } = useDocuments();

  const read = useCallback(async () => {
    // The host asks the actor to observe every document its elements mention, so
    // by the time one of them is hovered the document is normally already there.
    // "Normally" is not "always" on a cold frame, and getDocument() THROWS rather
    // than resolving to nothing, so one retry turns a race into a beat of nothing
    // happening instead of a control that never appears until the next hover.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const doc = getDocument<Record<string, unknown>>(documentId);
        return (await doc.getSnapshot()) as Record<string, unknown> | null;
      } catch (err) {
        if (attempt === 1) {
          console.warn('[overlay] could not read', documentId, err);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    return null;
  }, [getDocument, documentId]);

  const readNow = useCallback(async () => {
    try {
      const doc = getDocument<Record<string, unknown>>(documentId);
      return (await doc.getSnapshot()) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }, [getDocument, documentId]);

  const readAt = useCallback(
    async (path: PathSegment[]) => valueAtPath(await read(), path),
    [read],
  );

  const write = useCallback(
    async (patches: DraftPatch[]) => {
      if (!patches.length) return false;
      try {
        const doc = getDocument<Record<string, unknown>>(documentId);
        // The cast is the price of not importing @sanity/mutate for its types;
        // DraftPatch is structurally its NodePatch.
        doc.patch(patches as never);
        return true;
      } catch (err) {
        console.warn('[overlay] could not write', documentId, err);
        return false;
      }
    },
    [getDocument, documentId],
  );

  return { read, readNow, readAt, write };
}

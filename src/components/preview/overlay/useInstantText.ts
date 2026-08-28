// =============================================================================
// useInstantText - typed words appear on the page, not a second and a half later
// (ported from presacademy 2026-08-28)
// =============================================================================
// THE OLD LOOP, end to end: type in the Studio -> Studio autosave commits ->
// Sanity indexes the change -> our Worker's /preview/live listen fires ->
// EventSource -> debounce -> refetch this preview URL on the server -> swap
// <main>. Every hop is small; together they were 1.5-3 seconds, and the editor
// spent them watching a page that still said the old thing.
//
// THE SHORT PATH THIS ADDS. The frame already holds a live copy of the draft
// document. `<VisualEditing>` starts an optimistic-document actor whose remote
// feed is not Sanity but the STUDIO ITSELF: the Studio runs its own listen with
// `visibility: "transaction"` and relays every mutation over the comlink
// (`presentation/snapshot-event`), where a mendoza patch is applied to the
// in-memory document. So the frame learns about an edit as soon as the
// transaction lands, before the query index has caught up, which is what the
// server refetch has to wait for.
//
// So: watch the actor, diff the document against the last one we saw, and for
// every PLAIN STRING that changed, write the new characters straight into the
// text nodes showing it. The refetch still happens; it just stops being the
// thing anyone waits for.
//
// AND A SECOND, SHORTER PATH. The swap above costs about 4ms; the wait that was
// left is all upstream of it, because the actor's feed is still a LISTEN - the
// edit is autosaved, committed and made visible before the frame hears a word.
// The Studio has the answer a whole round trip earlier, in the local document
// store its form writes optimistic patches into, so the Studio side now posts
// that draft straight across (same origin, `postMessage`) as the editor types.
// Both sources land in the SAME diff-and-swap below; which one may write, and
// why a stale actor snapshot must not, is decided by `acceptsSource` in
// src/lib/preview-live-draft.ts. The Studio end is
// src/sanity/components/LiveDraftBridge.tsx.
//
// Messages from that channel are treated as hostile until proven otherwise:
// this is a public bundle, `message` is a public doorway, and `parseLiveDraft`
// drops anything that is not exactly the agreed shape without a word.
//
// EXACTLY THREE THINGS MAKE THIS SAFE TO POINT AT A LIVE PAGE, and all three
// live in tested pure helpers rather than here:
//
//   1. src/lib/preview-text-diff.ts reports only plain string leaves, only when
//      both sides are strings, and never inside portable text.
//   2. src/lib/preview-stega.ts decodes the invisible payload every preview
//      string carries, so a field is matched to its text node by identity rather
//      than by searching the page for the old words.
//   3. src/lib/preview-text-nodes.ts writes only into a node whose visible
//      characters are EXACTLY the old value, and re-attaches the payload it
//      split off. Nothing degrades: click-to-edit on a node this touched still
//      resolves to the same field, because the node keeps the same stega it
//      arrived with.
//
// WHAT IT DOES NOT DO, on purpose: portable text and the rich twins, anything
// whose rendering transforms the value (an accented heading, a truncated card
// blurb, a joined list), and anything that changes the SHAPE of the page - a new
// section, a reorder, a toggled block. All of those are left to the soft
// refresh, which renders them correctly a moment later. A missed instant update
// is invisible. A wrong one would be the preview lying about the page.
//
// THE ONE ORDERING HAZARD, and the TWO things that handle it. The soft refresh
// reconciles server-rendered HTML into <main>, and that HTML can be OLDER than
// what this already wrote, because the server reads the query index and neither
// channel above waits for it.
//
//   FIRST, IT SHOULD NOT LAND AT ALL. Every document applied here bumps the
//   refresh scheduler's change sequence (the `onDocument` callback the overlay
//   passes in), so a render that started before it is discarded on arrival
//   rather than morphed in. Before that bump the sequence moved only on the SSE
//   change events - Sanity's transaction visibility, a second behind the
//   keystroke - so a render begun mid-burst looked current when it landed and
//   wrote a HALF-TYPED sentence over the finished one. That was the editor's
//   "half my text disappears, then a second later it comes back".
//
//   SECOND, IF ONE LANDS ANYWAY. Every swap this makes is remembered, and after
//   each refresh the pending ones are re-applied to the fresh DOM - and dropped
//   as soon as the server's own HTML says the same thing. The re-apply matches
//   any value the field has passed through this session, not only the one the
//   burst started from, precisely because an intermediate is what a mid-burst
//   render carries. (The other half of that reasoning lives in
//   src/pages/preview/live.ts: the listen there must keep `visibility: "query"`,
//   because a faster signal would trigger a refetch of data that is still stale,
//   and stale HTML is exactly what this has to undo.)
// =============================================================================
import { useCallback, useEffect, useRef } from 'react';
import { useDocuments, useOptimisticActor } from '@sanity/visual-editing/react';
import { isEmptyActor } from '@sanity/visual-editing/optimistic';
import { diffStringFields } from '../../../lib/preview-text-diff.ts';
import { sourceKey } from '../../../lib/preview-stega.ts';
import {
  applyKnownChange,
  applyTextChange,
  indexStegaNodes,
  showsText,
} from '../../../lib/preview-text-nodes.ts';
import {
  acceptsSource,
  parseLiveDraft,
  rememberSwap,
  type DraftSource,
  type PendingSwap,
} from '../../../lib/preview-live-draft.ts';
import { startTiming } from './timing.ts';

/**
 * The event this listens for after `<main>` has been replaced. Dispatched by the
 * soft refresh in VisualEditingOverlay.tsx.
 */
export const SOFT_REFRESH_EVENT = 'preview:soft-refresh';

/** The actor's emitted events all carry the id of the document they concern. */
interface ActorEvent {
  id?: string;
}

/**
 * The four events the dataset-mutator actor emits. `mutation` is the one that
 * matters - it is a Studio edit arriving over the comlink - but a local
 * optimistic write arrives as `rebased.local`, a re-fetched snapshot as
 * `rebased.remote`, and the first load as `sync`. All four mean "the document
 * may read differently now"; the diff decides whether anything actually changed.
 */
const ACTOR_EVENTS = ['mutation', 'rebased.local', 'rebased.remote', 'sync'] as const;

export function useInstantText(pageId: string, onDocument?: () => void): void {
  // The optimistic document API, which is the only supported way this island can
  // see a draft: no token, no write client, nothing that must not ship in a
  // public bundle. presacademy wraps this in an overlay/useDraftDocument.ts
  // because its in-canvas controls also WRITE through it; this repo only reads,
  // so the one read it needs lives here.
  //
  // `getDocument()` and `getSnapshot()` THROW on a cold frame (before the
  // document has streamed in) rather than resolving to nothing, and this runs on
  // every edit, so the failure is swallowed silently: the next event a moment
  // later brings another chance, and a warn here would be a log line per
  // keystroke.
  const { getDocument } = useDocuments();
  const readNow = useCallback(async (): Promise<Record<string, unknown> | null> => {
    try {
      const doc = getDocument<Record<string, unknown>>(pageId);
      return (await doc.getSnapshot()) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }, [getDocument, pageId]);

  const actor = useOptimisticActor();

  /**
   * The overlay's "a newer document exists" hook, held in a ref so its identity
   * never re-subscribes the two feeds below.
   */
  const notify = useRef(onDocument);
  useEffect(() => {
    notify.current = onDocument;
  });

  /** The document as it read at the last swap - the diff's left-hand side. */
  const lastSeen = useRef<Record<string, unknown> | null>(null);
  /** Text nodes by source key, rebuilt after each refresh. */
  const index = useRef<Map<string, Text[]> | null>(null);
  /** Swaps the server has not confirmed yet, newest value per field. */
  const pending = useRef<Map<string, PendingSwap>>(new Map());
  /** Re-entrancy guard: one pass at a time, with a re-run if events arrived. */
  const running = useRef(false);
  const queued = useRef(false);
  /** When the Studio's local channel last spoke, or null if it never has. */
  const lastLocalAt = useRef<number | null>(null);

  const nodeIndex = useCallback((): Map<string, Text[]> => {
    if (index.current) return index.current;
    const main = document.getElementById('main');
    const nodes: Text[] = [];
    if (main) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        nodes.push(node as Text);
      }
    }
    const found = indexStegaNodes(nodes);
    index.current = found;
    return found;
  }, []);

  /**
   * The one diff-and-swap, whichever channel brought the document.
   *
   * Synchronous on purpose: no await between reading `lastSeen` and writing it,
   * so two snapshots arriving in the same tick cannot interleave and diff
   * against each other's half-applied state.
   *
   * DOUBLE APPLICATION IS ALREADY A NO-OP, and it is worth being precise about
   * why, because both channels do carry the same edit a moment apart. A swap
   * only happens where a text node shows EXACTLY the old value
   * (`applyTextChange`), so once the first channel has written "Hi there" over
   * "Hi", the second channel's identical change finds nothing showing "Hi" and
   * writes nothing. The pending memory agrees: `rememberSwap` is keyed by field
   * and keeps the FIRST `previous`, so re-recording the same swap updates one
   * entry instead of stacking two. What is NOT a no-op is an OLDER snapshot
   * arriving after a newer one, which would read as a change back to the old
   * words - hence `acceptsSource` on the actor path below.
   */
  const applyDocument = useCallback(
    (next: Record<string, unknown>, source: DraftSource) => {
      const stop = startTiming('instant-text');
      const previous = lastSeen.current;
      lastSeen.current = next;
      // Nothing to compare against on the first read: the page was just
      // server-rendered from this very document.
      if (!previous) return;

      // THE NEWEST DOCUMENT WE KNOW OF IS NOW THIS ONE, and that is a fact the
      // refresh scheduler has to hear about - before the diff, because it is
      // true whether or not a plain string changed. Its staleness stamp used to
      // be bumped only by the SSE change events, which run at Sanity's
      // transaction visibility, roughly a second behind the keystroke. Any
      // render started before this document therefore looked CURRENT when it
      // landed, and was morphed in carrying the server's older words - a PARTIAL
      // version of the sentence the editor had already typed. That is the "half
      // my text disappears, then comes back" report. The bump makes staleness a
      // property of the newest KNOWN document rather than of the slowest
      // channel: such a render is now discarded, and the follow-up it schedules
      // renders the truth. Cost is bounded by the scheduler, not by typing
      // speed: single-flight plus REFRESH_MIN_INTERVAL_MS caps starts at one per
      // 1200ms no matter how many bumps arrive between them.
      notify.current?.();

      const changes = diffStringFields(previous, next);
      if (changes.length === 0) return;

      const nodes = nodeIndex();
      let swapped = 0;
      for (const change of changes) {
        const key = sourceKey(pageId, change.path);
        for (const node of nodes.get(key) ?? []) {
          if (applyTextChange(node, change.previous, change.next)) swapped += 1;
        }
        // Remembered whether or not a node matched: a field that is not on
        // this page costs one map entry and is dropped at the next refresh.
        rememberSwap(pending.current, key, change.previous, change.next);
      }
      if (swapped > 0) stop(`${source} ${swapped} node${swapped === 1 ? '' : 's'}`);
    },
    [nodeIndex, pageId],
  );

  /** Read the actor's copy of the draft and apply it. */
  const sweep = useCallback(async () => {
    if (running.current) {
      queued.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        queued.current = false;
        const next = await readNow();
        if (!next) continue;
        // The Studio's local channel is ahead of the listen the actor rides on,
        // so while that channel is live this snapshot is the OLD news and
        // applying it would type the page backwards a keystroke.
        if (!acceptsSource('actor', lastLocalAt.current, Date.now())) continue;
        applyDocument(next, 'actor');
      } while (queued.current);
    } finally {
      running.current = false;
    }
  }, [applyDocument, readNow]);

  // The Studio's local edit state, posted straight across as the editor types.
  // Untrusted input: the origin must match, and the payload must be exactly the
  // agreed envelope. `document: null` means "this page has no draft", which is
  // silence rather than an edit - it deliberately does not start the window that
  // holds the actor back.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = parseLiveDraft(event.data);
      if (!message?.document) return;
      lastLocalAt.current = Date.now();
      applyDocument(message.document, 'local');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyDocument]);

  // Watch the optimistic actor. Every one of its emitted events means the
  // in-memory document may read differently; `sweep` decides if it does.
  useEffect(() => {
    if (isEmptyActor(actor)) return;
    const draftId = `drafts.${pageId}`;
    const subscriptions = ACTOR_EVENTS.map((type) =>
      actor.on(type, (event: ActorEvent) => {
        // The actor carries every document the page mentions - site settings,
        // services, testimonials. Only this page's own document is diffed; a
        // change to a shared document reaches the page through the soft refresh,
        // because its stega names ITS id, not this one.
        if (event.id && event.id !== pageId && event.id !== draftId) return;
        void sweep();
      }),
    );
    // One pass now to take the baseline snapshot, so the first edit after mount
    // has something to diff against.
    void sweep();
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [actor, pageId, sweep]);

  // After the soft refresh has swapped in fresh HTML: the old text nodes are
  // detached, so the index is rebuilt, and any swap the server has not caught up
  // with is re-applied so the page does not flicker back a version.
  useEffect(() => {
    const onRefresh = () => {
      index.current = null;
      if (pending.current.size === 0) return;
      const nodes = nodeIndex();
      for (const swap of [...pending.current.values()]) {
        const bucket = nodes.get(swap.key) ?? [];
        // The server's own HTML says the same thing: this swap is landed.
        if (bucket.length > 0 && bucket.every((node) => showsText(node, swap.next))) {
          pending.current.delete(swap.key);
          continue;
        }
        let reapplied = false;
        for (const node of bucket) {
          // Any value this field has passed through counts as "stale render of
          // this field", not just the one the burst started from: an accepted
          // render that began mid-burst carries an INTERMEDIATE value, which
          // `swap.previous` alone would not recognise. `swap.seen` is the whole
          // set and never contains `swap.next`, so a node the server HAS caught
          // up with is still left alone.
          if (applyKnownChange(node, swap.seen, swap.next)) reapplied = true;
        }
        // Nothing on the page matches either value any more - the field is gone,
        // moved, or rendered differently. Stop carrying it.
        if (!reapplied && bucket.length === 0) pending.current.delete(swap.key);
      }
    };
    window.addEventListener(SOFT_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SOFT_REFRESH_EVENT, onRefresh);
  }, [nodeIndex]);
}

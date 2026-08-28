// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-live-draft — the contract for the Studio's local-edit-state channel
// (2026-08-28)
// =============================================================================
// WHY THERE IS A SECOND CHANNEL AT ALL. `useInstantText` already swaps changed
// plain strings into the preview the moment an edit reaches the frame, and the
// swap itself costs about 4ms. The wait that remains is entirely UPSTREAM of it:
// the frame's optimistic actor is fed by the Studio's own `client.listen`, so an
// edit only arrives once it has been autosaved, committed, and made visible as a
// transaction. That is the 1–2 seconds an editor still feels between a keystroke
// and the page catching up. (Verified against sanity 6.11's sources: their
// documents channel is the same listen, so upgrading would not change it.)
//
// The Studio holds the answer a whole network round trip earlier. `useEditState`
// reads its LOCAL document store, whose draft snapshot is updated as the editor
// types — optimistic local patches, applied before anything is sent. The Studio
// and the preview iframe are the same origin, so that snapshot can simply be
// posted across.
//
// THIS FILE IS THE CONTRACT BOTH ENDS AGREE ON, and it is pure so it can be
// tested without a Studio or a DOM:
//
//   Studio side  src/sanity/components/LiveDraftBridge.tsx
//   Island side  src/components/preview/overlay/useInstantText.ts
//
// EVERY MESSAGE IS UNTRUSTED. The island ships in the public preview bundle, and
// `window.addEventListener('message')` hears from ANY frame or opener that cares
// to speak, so `parseLiveDraft` is written as a rejection funnel: the origin
// check is the caller's (it needs `window`), and everything after it — the
// envelope, the document, its `_id` and `_type` — has to be exactly right or the
// message is dropped silently. Nothing here throws and nothing here logs; a
// hostile page must learn nothing and cost nothing.
// =============================================================================

/** The one message type this channel carries. */
export const LIVE_DRAFT_MESSAGE = 'pa:live-draft';

/** A draft snapshot as it travels: plain JSON, no stega, `_id` is the draft id. */
export type LiveDraftDocument = Record<string, unknown> & { _id: string; _type: string };

/**
 * The wire shape. `document: null` is meaningful and is sent on purpose: it says
 * "this page has no draft right now" (published-only, or the draft was just
 * discarded), which the island treats as "the local channel has nothing to say"
 * rather than as an edit.
 */
export interface LiveDraftMessage {
  type: typeof LIVE_DRAFT_MESSAGE;
  document: LiveDraftDocument | null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Read a `message` event's data as a live-draft message, or null when it is
 * anything else at all.
 *
 * The caller MUST have checked `event.origin === window.location.origin` first.
 * This function cannot do it: it is given the payload, not the event, so that it
 * stays testable in plain Node.
 */
export function parseLiveDraft(data: unknown): LiveDraftMessage | null {
  if (!isPlainObject(data)) return null;
  if (data.type !== LIVE_DRAFT_MESSAGE) return null;
  if (!('document' in data)) return null;
  const doc = data.document;
  if (doc === null || doc === undefined) return { type: LIVE_DRAFT_MESSAGE, document: null };
  if (!isPlainObject(doc)) return null;
  if (typeof doc._id !== 'string' || doc._id === '') return null;
  if (typeof doc._type !== 'string' || doc._type === '') return null;
  return { type: LIVE_DRAFT_MESSAGE, document: doc as LiveDraftDocument };
}

// ---------------------------------------------------------------------------
// Which source may write to the page
// ---------------------------------------------------------------------------

/** Where a document snapshot the island is about to apply came from. */
export type DraftSource = 'local' | 'actor';

/**
 * How long a local snapshot keeps the actor quiet.
 *
 * THE HAZARD THIS EXISTS FOR. Both sources feed ONE "last document I applied"
 * memory, and the diff is against that memory, so a snapshot that is OLDER than
 * the memory does not read as "nothing changed" — it reads as a change BACK to
 * the older words, and the swap would be applied. The local channel is always
 * ahead of the actor (it is pre-network by definition), so every actor snapshot
 * that lands mid-burst is exactly that stale snapshot, and left alone the page
 * would stutter one keystroke backwards on every save.
 *
 * So while the local channel is demonstrably alive, the actor is not allowed to
 * write. Two seconds is comfortably longer than one Studio autosave round trip
 * and short enough that a channel which stops (an older Studio, a preview opened
 * outside Presentation, the navigator not resolving the page) hands control back
 * within one edit. Nothing is lost when it does: the actor's next event applies
 * in full, and the soft refresh re-renders the page correctly regardless.
 */
export const LOCAL_LEAD_MS = 2000;

/**
 * Whether a snapshot from `source` may be applied. Local always may; the actor
 * may unless a local snapshot arrived inside the lead window.
 */
export function acceptsSource(
  source: DraftSource,
  lastLocalAt: number | null,
  now: number,
  leadMs: number = LOCAL_LEAD_MS,
): boolean {
  if (source === 'local') return true;
  if (lastLocalAt === null) return true;
  return now - lastLocalAt >= leadMs;
}

// ---------------------------------------------------------------------------
// The pending-swap memory
// ---------------------------------------------------------------------------

/** A swap the island made that the server's HTML has not caught up with yet. */
export interface PendingSwap {
  key: string;
  /** The text that was on the page when this field's first swap began. */
  previous: string;
  /** The text that should be on the page now. */
  next: string;
  /**
   * Every OTHER value this field has been seen to hold this session, oldest
   * first, starting with `previous`. Never contains `next`.
   *
   * WHY A HISTORY AND NOT JUST `previous` (2026-08-28). The re-apply after a
   * refresh used to insist the node read exactly `previous`, on the reasoning
   * that server HTML is either up to date or still showing the value the burst
   * started from. It can be neither: a render that started mid-burst reads the
   * query index at ITS OWN instant, so the words it carries are an INTERMEDIATE
   * value — the editor's sentence as it stood half a second ago. That HTML
   * matches neither `previous` nor `next`, so the re-apply could not correct it
   * and the editor watched half a sentence sit on the page until the following
   * render. (The seq bump in useInstantText is the real fix; this is the belt to
   * its braces, for any render that slips through accepted anyway.)
   *
   * WHY IT IS STILL SAFE. Every value in here is one this field ACTUALLY HELD in
   * a draft snapshot we diffed, and the node was matched to the field by its
   * stega identity, not by searching for words. So "this node shows a value from
   * this field's own past" means exactly "this node is showing a stale render of
   * this field", and writing the newest value is a correction, not a guess. A
   * node showing anything else — a transformed rendering, another editor's
   * words, a value from before this session — matches nothing and is left alone,
   * which is the same rule as before: a missed instant update is invisible; a
   * wrong one is a lie about what the page says.
   */
  seen: string[];
}

/** Never remember more pending swaps than an editing burst can plausibly make. */
export const MAX_PENDING = 200;

/**
 * How many past values to keep per field.
 *
 * A render is at most a second or two behind, and the local channel posts at
 * most every 60ms, so a dozen values covers far more history than any accepted
 * render can be carrying. The cost of the cap being too small is one uncorrected
 * intermediate for one refresh; the cost of no cap is a map that grows for as
 * long as the editor keeps typing into one field.
 */
export const MAX_SEEN = 12;

/**
 * Add a value to a field's history, oldest first, within the cap.
 *
 * The OLDEST entry is the value the very first server render of this burst is
 * still going to arrive holding, so it is the one the history can least afford
 * to lose: the cap eats from just after it.
 */
function addSeen(seen: readonly string[], value: string, max: number): string[] {
  if (seen.includes(value)) return [...seen];
  const next = [...seen];
  while (next.length >= max && next.length > 1) next.splice(1, 1);
  if (next.length >= max) next.shift();
  next.push(value);
  return next;
}

/**
 * Record a swap, SOURCE-AGNOSTICALLY — the memory is keyed by field, never by
 * where the snapshot came from, which is what lets the two channels take turns
 * on one field without either forgetting the other's work.
 *
 * Two rules earn their keep:
 *
 *  - `previous` is the value of the FIRST swap on this field and never moves.
 *    That is the value the server-rendered HTML will still be showing when it
 *    arrives, so it is the one a re-apply has to match against.
 *  - When `next` comes back around to that original `previous`, the field is
 *    exactly where the server thinks it is (the editor undid it, or typed a
 *    character and deleted it), so the entry is dropped rather than kept as a
 *    swap that would re-apply itself to a no-op. Its history goes with it: the
 *    field is level with the server, so there is nothing left to correct.
 *
 * Every value the field passes through on the way is kept in `seen`, which is
 * what lets the re-apply recognise an INTERMEDIATE value in server HTML rather
 * than only the value the burst started from. See `PendingSwap.seen`.
 */
export function rememberSwap(
  pending: Map<string, PendingSwap>,
  key: string,
  previous: string,
  next: string,
  max: number = MAX_PENDING,
  maxSeen: number = MAX_SEEN,
): void {
  const already = pending.get(key);
  const first = already?.previous ?? previous;
  if (next === first) {
    pending.delete(key);
    return;
  }
  // A field this page does not show still costs one entry — cheap, and dropped
  // at the next refresh — but the map must not grow without a bound.
  if (!already && pending.size >= max) return;
  // The value this entry was showing a moment ago is now history, and so is the
  // value the caller diffed FROM (normally the same thing, but the two channels
  // can hand over mid-burst). `next` is where the field is now, never history.
  const base = already ? addSeen(already.seen, already.next, maxSeen) : [];
  const seen = addSeen(base, previous, maxSeen).filter((value) => value !== next);
  pending.set(key, { key, previous: first, next, seen });
}

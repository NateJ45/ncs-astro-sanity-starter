import { useEffect, useRef } from 'react';
import { useEditState } from 'sanity';
import { LIVE_DRAFT_MESSAGE } from '../../lib/preview-live-draft';

// =============================================================================
// LiveDraftBridge — the Studio's local edits, posted to the preview as they type
// (2026-08-28)
// =============================================================================
// THE GAP THIS CLOSES. The preview already swaps changed plain strings into the
// page the instant an edit reaches it, and the swap costs about 4ms. But the
// frame only LEARNS about an edit through the optimistic actor, whose feed is
// the Studio's `client.listen`: the edit has to be autosaved, committed and made
// visible as a transaction first. That round trip is the 1–2 seconds an editor
// still watches, and it is not a bug anyone can tune away — it is what "the
// server knows about it now" costs.
//
// The Studio knows a whole round trip earlier. `useEditState` reads the LOCAL
// document store, whose `draft` snapshot is rebuilt from optimistic patches as
// the editor types, before anything is sent. This component watches that
// snapshot and posts it straight into the preview iframe, which is same-origin
// with the Studio. The listen-driven path keeps running underneath and
// reconciles exactly as before; it simply stops being the thing anyone waits for.
//
// FOUR THINGS KEEP THIS FROM BEING A LIABILITY:
//
//  - It renders NULL and holds no state of its own. Mounted from the navigator,
//    which already resolves which page the preview is showing, and unmounted the
//    moment that resolution goes away.
//  - DEFAULT priority, deliberately not `'low'`. The Studio's own
//    PostMessageRefreshMutations asks for `'low'` because it only needs to
//    know THAT a document changed, eventually; we need to know WHAT it says,
//    now. Measured live 2026-08-28: under `'low'` the store coalesced
//    isolated keystrokes into the autosave commit, so one keystroke reached
//    the preview in 413ms and the next in 1429ms - the editor's "still a
//    second or two". The trailing throttle below, not the store's
//    scheduler, is what keeps this cheap.
//  - THROTTLED, TRAILING. A keystroke is one snapshot; a burst is one post.
//  - It never throws. A missing iframe, a cross-origin one, a frame that has
//    navigated away mid-post: all of it is swallowed, because failing here must
//    cost the editor nothing more than the old, slower path.
//
// THE MESSAGE, and why the receiving end distrusts it, live in
// src/lib/preview-live-draft.ts. `document: null` is sent on purpose when the
// page has no draft, so the island can tell "nothing to say" apart from silence.
// =============================================================================

/**
 * Long enough to collapse a burst of keystrokes into one post, short enough to
 * stay under the ~100ms that reads as "instant". Trailing, so the snapshot that
 * goes out is always the newest one.
 */
const THROTTLE_MS = 60;

interface Props {
  /** The PUBLISHED id of the page the preview is showing. */
  documentId: string;
  /** That document's schema type. */
  documentType: string;
}

/**
 * Post a snapshot into every same-origin iframe on the page.
 *
 * Deliberately not "find THE preview iframe": Presentation's DOM is the host's,
 * not ours, and a selector tied to its internals would break silently on an
 * upgrade. Every same-origin frame gets the message and only a frame running the
 * preview island has a listener for it — and that listener re-checks the origin
 * and the shape before it believes a word of it.
 */
function postToFrames(snapshot: unknown): void {
  const origin = window.location.origin;
  const message = { type: LIVE_DRAFT_MESSAGE, document: snapshot ?? null };
  for (const frame of Array.from(window.document.querySelectorAll('iframe'))) {
    try {
      const src = frame.getAttribute('src');
      if (!src) continue;
      if (new URL(src, window.location.href).origin !== origin) continue;
      frame.contentWindow?.postMessage(message, origin);
    } catch {
      // A frame mid-navigation, a src that will not parse, a contentWindow the
      // browser has taken away. None of it is worth a line in anyone's console.
    }
  }
}

export function LiveDraftBridge({ documentId, documentType }: Props) {
  // The third argument is the priority the local store schedules this observer
  // at. Verified against sanity 6.4's own declaration:
  //   useEditState(publishedDocId, docTypeName, priority?, version?)
  const { draft } = useEditState(documentId, documentType, 'default');

  // The newest snapshot, and the timer that will send it. A ref rather than
  // state: this component renders nothing, so re-rendering it would be pure cost.
  const latest = useRef<unknown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = draft;
    // Trailing throttle: the first change opens the window, every change inside
    // it just updates what will be sent when the window closes.
    if (timer.current !== undefined) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      postToFrames(latest.current);
    }, THROTTLE_MS);
  }, [draft]);

  // Switching pages (or closing the tool) must not leave a post in flight that
  // would deliver the OLD page's draft to a frame now showing a different one.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    },
    [documentId],
  );

  return null;
}

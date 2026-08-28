// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-navigation — the bounce-aware page-switch state machine (2026-08-28)
// =============================================================================
// Clicking a page in the Presentation navigator took TWO clicks, every time. The
// panel would change to the new page, the iframe would not, and then the panel
// would BOUNCE BACK to the previous page; the second click worked.
//
// WHY (read out of the pinned host sources, not guessed):
//
//  1. Presentation only tells the iframe to navigate from one effect, and that
//     effect writes its bookkeeping BEFORE the gate it writes it for:
//
//        if (frameStateRef.current.url && params.preview &&
//            frameStateRef.current.url !== params.preview) {
//          ...
//          frameStateRef.current.url = params.preview        // always
//          if (overlaysConnection === 'connected') {          // only sometimes
//            comlink.post('presentation/navigate', {url, type: 'replace'})
//          }
//        }
//
//     (sanity/lib/_chunks-es/PresentationToolGrantsCheck.js, the `params.preview`
//     effect.) A navigation asked for while the overlay channel is connecting or
//     reconnecting is therefore DROPPED, and can never be re-sent: the effect's
//     own deps include `overlaysConnection`, so it re-runs the moment the channel
//     connects, but by then `frameStateRef.current.url === params.preview` and
//     the outer `if` is false.
//
//  2. The iframe then reports where it really is. Our history adapter reports the
//     frame's location whenever it subscribes, and Presentation's
//     `visual-editing/navigate` handler treats any reported url that differs from
//     `frameStateRef.current.url` as "the frame moved, sync my param" — writing
//     `params.preview` back to the OLD path. That is the bounce the editor sees.
//     It is the frame correcting the record, not the fault itself.
//
//  3. The old sticky retry could not help. It re-issued `navigate(sameHref)`,
//     which leaves `params.preview` at the value it already had, so the effect in
//     (1) never re-ran and nothing was ever posted. It also cleared `pending` the
//     instant `params.preview` matched the target — which is instant, studio-side
//     state — so it was always gone before the bounce arrived.
//
// THE FIX MODELLED HERE: hold the intent through the match, watch for the flip
// back to the path we came from, and re-issue on that flip. The re-issue works
// precisely because the bounce moved `params.preview` back, so asking for the
// target again is a REAL change and the host's effect runs. Capped, and given a
// short window so a click that simply worked settles quietly.
//
// Pure on purpose: PreviewNavigator.tsx keeps only the timer and the navigate
// call, and every rule below is covered in preview-navigation.test.ts.
// =============================================================================

/** How long one click's intent stays armed, waiting for a bounce. */
export const NAV_WINDOW_MS = 4000;

/** Total navigate() calls for one intent, the first one included. */
export const NAV_MAX_ATTEMPTS = 4;

export interface PendingNav {
  /** The preview path the editor asked for. */
  href: string;
  /** Document type + id to open beside it (passed straight to navigate). */
  type: string;
  id: string;
  /** The preview path showing when the click was made — the bounce target. */
  from: string;
  /** navigate() calls made for this intent so far. */
  attempts: number;
  /** True once params.preview has reported `href` at least once. */
  sawTarget: boolean;
  /** When the current attempt's window opened. */
  startedAt: number;
}

/** What PreviewNavigator should do after a step. */
export type NavAction =
  /** Nothing to do; keep waiting. */
  | 'wait'
  /** Re-issue navigate() for the returned pending intent. */
  | 'retry'
  /** Drop the intent. */
  | 'settle';

export interface NavStep {
  /** The intent to hold on to, or null when the action is `settle`. */
  pending: PendingNav | null;
  action: NavAction;
}

/** Record a click. `from` is the preview path currently showing. */
export function startNav(
  href: string,
  type: string,
  id: string,
  from: string,
  now: number,
): PendingNav {
  return { href, type, id, from, attempts: 1, sawTarget: false, startedAt: now };
}

/**
 * Advance one intent against what `params.preview` reports now.
 *
 * `current` is the preview path with any query string already stripped, exactly
 * as PreviewNavigator computes it for the row highlight.
 *
 * Returns the SAME `pending` object when nothing changed, so a caller can use
 * identity to decide whether to call setState and cannot loop.
 */
export function stepNav(pending: PendingNav, current: string, now: number): NavStep {
  const expired = now - pending.startedAt >= NAV_WINDOW_MS;

  // Arrived. Stay armed anyway: the bounce lands AFTER this match, and clearing
  // here is exactly what made the old retry useless.
  if (current === pending.href) {
    if (expired) return { pending: null, action: 'settle' };
    if (pending.sawTarget) return { pending, action: 'wait' };
    return { pending: { ...pending, sawTarget: true }, action: 'wait' };
  }

  // Back where we started.
  if (current === pending.from) {
    // Not yet reflected: the studio has not caught up with the click at all.
    if (!pending.sawTarget) {
      return expired ? { pending: null, action: 'settle' } : { pending, action: 'wait' };
    }
    // A BOUNCE. Ask again — and this time it is a real change to params.preview.
    if (pending.attempts >= NAV_MAX_ATTEMPTS) return { pending: null, action: 'settle' };
    return {
      pending: { ...pending, attempts: pending.attempts + 1, sawTarget: false, startedAt: now },
      action: 'retry',
    };
  }

  // Somewhere else entirely: the editor moved on, or something else navigated.
  // A newer click replaces `pending` outright, so this is not that case.
  return { pending: null, action: 'settle' };
}

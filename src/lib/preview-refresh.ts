// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-refresh — one refresh at a time, and never a stale one (2026-08-28)
// =============================================================================
// THE FAILURE THIS ANSWERS, measured in the deployed Studio. With
// `localStorage.previewTiming = '1'` set, a single burst of edits logged SIX
// overlapping soft-refreshes — 1128ms, 1505ms, 1131ms, 1245ms, 1494ms, 1228ms —
// which is six concurrent server renders of the SAME preview URL. A /preview
// render costs ~0.9s of Worker CPU (a public page costs ~0.1s), so six at once
// is how the editor got `Error 1102: Worker exceeded resource limits`.
//
// The old scheduler debounced with clearTimeout/setTimeout and nothing else.
// The debounce only guarded the window BEFORE a fetch started; once one was in
// flight, the next change event scheduled a fresh timer and a fresh fetch. There
// was no in-flight guard, no ceiling on concurrency, and no test of whether an
// arriving response was still worth having.
//
// AND THAT LAST OMISSION IS THE VISIBLE BUG, the one an editor reports as "the
// text I typed appears seconds later" even though instant-text logs 4-6ms:
//
//     t0   refresh A starts        (server will render the PRE-edit page)
//     t1   the edit lands, instant text writes the new words   <- page correct
//     t2   refresh B starts
//     t3   A's response arrives and replaces <main> with PRE-edit HTML
//
// The words revert at t3 and only come back when B lands. With several racing,
// the LAST to land can be the STALEST, so the revert outlives every retry the
// pending-swap memory makes. Instant text was never slow; it was being undone.
//
// THE THREE RULES MODELLED HERE, all pure so they can be tested rather than
// argued about (the same split preview-navigation.ts made):
//
//   1. SINGLE FLIGHT. At most one refresh in flight. Change events arriving
//      during one set `dirty`; that flag runs exactly ONE more refresh
//      afterwards, not one per event.
//   2. STALE DISCARD. Every attempt is stamped with `changeSeq` as it was at
//      fetch start. If the sequence has moved by the time the response lands,
//      that HTML predates a change we already know about — it is not swapped in
//      at any price. It marks the state dirty instead, and the follow-up renders
//      the truth. This is the fix for the revert above.
//
//      WHAT COUNTS AS "A CHANGE WE KNOW ABOUT" IS THE WHOLE GAME (2026-08-28).
//      The sequence was bumped only by the SSE change events, which fire at
//      Sanity's transaction visibility — about a second behind the keystroke.
//      The instant-text path learns of the same edit in ~100ms over the Studio's
//      local channel, so between those two instants a render could START before
//      an edit, LAND after it, and still be judged current: the morph then wrote
//      the server's half-typed sentence over the finished one, and the editor
//      watched half their text vanish for a second. So every document instant
//      text applies now calls `onChange` too (wired in VisualEditingOverlay).
//      Staleness is a property of the newest KNOWN document, not of the slowest
//      channel that could have told us about it.
//
//      This raises the number of DISCARDS during a typing burst and not the
//      number of RENDERS: rules 1 and 3 cap starts at one per
//      REFRESH_MIN_INTERVAL_MS no matter how many changes arrive between them.
//   3. RATE LIMIT. A floor on the interval between the STARTS of consecutive
//      refreshes. Instant text already makes the page LOOK right for plain
//      strings, so the refresh is a CORRECTNESS pass, not a latency-critical
//      one; structural edits (a section added, reordered, an image, rich text)
//      do need it, which is why it must always eventually run. `dirty` is never
//      dropped, only deferred — the last refresh of a burst always happens.
//
// WHO WAITS ON WHAT. The comlink `refresh` handler returns a promise, and
// Presentation spins its ⟳ button until it resolves. A caller is covered by an
// ACCEPTED refresh that started after it asked; a discarded one covers nobody
// and its callers roll into the follow-up. Since rule 3 guarantees a final
// refresh, every caller resolves.
// =============================================================================

/**
 * Minimum gap between the STARTS of two refreshes.
 *
 * Sized from the measured render cost: /preview is ~0.9s of Worker CPU per
 * render, so anything below about a second means a burst is still overlapping
 * renders — the exact thing that tripped the 1102. 1200ms leaves a real gap
 * after a typical render instead of queueing the next one against its tail, and
 * costs the editor nothing perceptible because instant text is already showing
 * the words. Raise it if the Worker still runs hot; lowering it below the render
 * time re-creates the pile-up this file exists to prevent.
 */
export const REFRESH_MIN_INTERVAL_MS = 1200;

/**
 * How long a run of change events is allowed to gather before the first refresh
 * of that run starts.
 *
 * One Studio autosave produces two or three events a few ms apart; this window
 * only has to be wide enough that they share a refetch. It is NOT a "wait for
 * the editor to stop typing" delay — the Studio's autosave already did that
 * batching before a single event reached the frame.
 */
export const REFRESH_DEBOUNCE_MS = 80;

export interface RefreshState {
  /** Bumped by every incoming change event. The staleness stamp. */
  changeSeq: number;
  /** A change is known that no started refresh covers. */
  dirty: boolean;
  /** `changeSeq` as it read when the running fetch started, or null if idle. */
  inFlightSeq: number | null;
  /** When the current run of unserved changes began, for the debounce. */
  dirtySince: number | null;
  /** When the last refresh STARTED, for the rate limit. */
  lastStartedAt: number | null;
}

/** A fresh scheduler: nothing known, nothing running. */
export function createRefreshState(): RefreshState {
  return {
    changeSeq: 0,
    dirty: false,
    inFlightSeq: null,
    dirtySince: null,
    lastStartedAt: null,
  };
}

/**
 * A change arrived (an SSE `change`, a comlink refresh, a visibility catch-up,
 * or a document the instant-text path has just applied to the page).
 *
 * Always advances `changeSeq`, which is what makes an in-flight response stale.
 * `dirtySince` marks the START of the run, so a burst is debounced from its
 * first event rather than sliding forward with every keystroke.
 */
export function onChange(state: RefreshState, now: number): RefreshState {
  return {
    ...state,
    changeSeq: state.changeSeq + 1,
    dirty: true,
    dirtySince: state.dirty && state.dirtySince !== null ? state.dirtySince : now,
  };
}

/** What the caller should do right now. */
export interface RefreshDecision {
  /** Start a refresh immediately. */
  start: boolean;
  /**
   * Milliseconds to wait before asking again. 0 means there is nothing to wait
   * for — either a refresh is starting now, or the state is idle.
   */
  waitMs: number;
}

/**
 * Should a refresh start at `now`?
 *
 * Three gates, in order: something must be owed (`dirty`), nothing may be in
 * flight (rule 1), and both the debounce and the rate limit must have elapsed
 * (rules 3). When a gate that time alone will open is closed, the returned
 * `waitMs` says exactly how long — the caller arms one timer for it rather than
 * polling.
 *
 * An in-flight refresh returns `waitMs: 0`: the caller must not arm a timer for
 * it, because the settle is the event that moves things along.
 */
export function shouldStart(state: RefreshState, now: number): RefreshDecision {
  if (!state.dirty) return { start: false, waitMs: 0 };
  if (state.inFlightSeq !== null) return { start: false, waitMs: 0 };

  const readyAt = Math.max(
    state.dirtySince === null ? now : state.dirtySince + REFRESH_DEBOUNCE_MS,
    state.lastStartedAt === null ? now : state.lastStartedAt + REFRESH_MIN_INTERVAL_MS,
  );
  if (now >= readyAt) return { start: true, waitMs: 0 };
  return { start: false, waitMs: readyAt - now };
}

/**
 * Record that a refresh just started. Stamps it with the sequence it covers and
 * clears `dirty` — every change known at this instant is served by this fetch,
 * and anything arriving from here on will bump the sequence past the stamp.
 */
export function onStart(state: RefreshState, now: number): RefreshState {
  return {
    ...state,
    dirty: false,
    dirtySince: null,
    inFlightSeq: state.changeSeq,
    lastStartedAt: now,
  };
}

export interface RefreshSettlement {
  state: RefreshState;
  /**
   * True when the response still describes the newest known content and may be
   * swapped into the page. False means the sequence moved while the fetch was
   * out: that HTML is known-stale and must NOT touch the DOM.
   */
  accepted: boolean;
}

/**
 * The fetch finished (landed, failed, whatever) — decide whether its HTML is
 * usable, and hand back a state that will run a follow-up if it is not.
 *
 * A discard is not a failure and not a dropped edit: it re-arms `dirty` with the
 * current instant as the run's start, so the very next `shouldStart` schedules
 * the refresh that renders the change the discarded one missed.
 */
export function onSettled(state: RefreshState, now: number): RefreshSettlement {
  const accepted = state.inFlightSeq === state.changeSeq;
  return {
    accepted,
    state: {
      ...state,
      inFlightSeq: null,
      dirty: state.dirty || !accepted,
      dirtySince: accepted ? state.dirtySince : (state.dirtySince ?? now),
    },
  };
}

/** True when nothing is running and nothing is owed — the quiet end state. */
export function isSettled(state: RefreshState): boolean {
  return !state.dirty && state.inFlightSeq === null;
}

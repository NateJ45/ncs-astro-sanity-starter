// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-refresh — the scheduler that stopped the preview melting the Worker
// =============================================================================
// The editor-visible promises pinned down here: a burst of edits costs a
// bounded number of server renders (not one per event), typed text never
// reverts because stale HTML landed late, and the LAST change of a burst is
// always rendered. See src/lib/preview-refresh.ts for the measured failure each
// rule answers.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REFRESH_DEBOUNCE_MS,
  REFRESH_MIN_INTERVAL_MS,
  createRefreshState,
  isSettled,
  onChange,
  onSettled,
  onStart,
  shouldStart,
} from './preview-refresh.ts';

const T0 = 1_000_000;

/** How long one /preview render takes in production, near enough. */
const RENDER_MS = 900;

/**
 * Drive the scheduler the way VisualEditingOverlay does: whenever a start is
 * allowed, start; whenever one is running, let it land. `events` are (time,
 * count) pairs of incoming change events. Returns every start, and whether each
 * response was accepted or discarded.
 */
function drive(events: Array<[number, number]>, renderMs = RENDER_MS) {
  let state = createRefreshState();
  const starts: number[] = [];
  const settles: Array<{ at: number; accepted: boolean }> = [];
  let landsAt: number | null = null;

  // Every instant anything could happen: an event, a landing, or the moment a
  // gate opens. Walk them in order.
  const queue = events
    .flatMap(([at, n]) => Array.from({ length: n }, () => at))
    .sort((a, b) => a - b);
  let now = queue[0] ?? T0;

  for (let guard = 0; guard < 500; guard += 1) {
    // Anything due at or before `now`, oldest first.
    if (landsAt !== null && landsAt <= now) {
      const settled = onSettled(state, landsAt);
      state = settled.state;
      settles.push({ at: landsAt, accepted: settled.accepted });
      landsAt = null;
      continue;
    }
    if (queue.length > 0 && queue[0] <= now && (landsAt === null || queue[0] <= landsAt)) {
      const at = queue.shift()!;
      state = onChange(state, at);
      continue;
    }
    const decision = shouldStart(state, now);
    if (decision.start) {
      state = onStart(state, now);
      starts.push(now);
      landsAt = now + renderMs;
      continue;
    }
    // Nothing to do now: jump to the next instant that could change something.
    const candidates = [
      queue[0],
      landsAt,
      decision.waitMs > 0 ? now + decision.waitMs : undefined,
    ].filter((t): t is number => typeof t === 'number');
    if (candidates.length === 0) break;
    now = Math.min(...candidates);
  }

  return { state, starts, settles };
}

// --- rule 1: single flight ---------------------------------------------------

test('a lone change starts exactly one refresh, after the debounce', () => {
  const { starts, settles } = drive([[T0, 1]]);
  assert.deepEqual(starts, [T0 + REFRESH_DEBOUNCE_MS]);
  assert.equal(settles.length, 1);
  assert.equal(settles[0].accepted, true);
});

test('a burst of ten events costs at most two renders, not ten', () => {
  // Ten events over 600ms: the first refresh starts after the debounce and the
  // rest arrive while it is in flight, so they collapse into ONE follow-up.
  const events: Array<[number, number]> = Array.from({ length: 10 }, (_, i) => [T0 + i * 60, 1]);
  const { starts } = drive(events);
  assert.ok(starts.length <= 2, `expected at most 2 starts, got ${starts.length}`);
  assert.equal(starts.length, 2, 'and exactly 2: one covering the burst, one covering the tail');
});

test('nothing starts while a refresh is in flight, however many events arrive', () => {
  let state = onChange(createRefreshState(), T0);
  state = onStart(state, T0 + REFRESH_DEBOUNCE_MS);
  for (let i = 0; i < 20; i += 1) state = onChange(state, T0 + 100 + i);
  const decision = shouldStart(state, T0 + 10_000);
  assert.equal(decision.start, false, 'single flight');
  assert.equal(decision.waitMs, 0, 'and no timer: the settle is what moves this along');
});

test('an idle scheduler asks for nothing', () => {
  const decision = shouldStart(createRefreshState(), T0);
  assert.deepEqual(decision, { start: false, waitMs: 0 });
});

// --- rule 2: stale-response discard -----------------------------------------

test('a response for an outdated seq is discarded, never swapped in', () => {
  let state = onChange(createRefreshState(), T0);
  state = onStart(state, T0 + REFRESH_DEBOUNCE_MS);
  // The edit the editor is watching for lands while the fetch is out.
  state = onChange(state, T0 + 200);
  const settled = onSettled(state, T0 + 900);
  assert.equal(settled.accepted, false, 'this HTML predates a change we already know about');
  assert.equal(settled.state.dirty, true, 'so a follow-up is owed');
  assert.equal(settled.state.inFlightSeq, null);
});

test('a discard schedules the follow-up that renders what it missed', () => {
  let state = onChange(createRefreshState(), T0);
  state = onStart(state, T0);
  state = onChange(state, T0 + 200);
  state = onSettled(state, T0 + 900).state;
  // Rate limit still applies, but the work is not lost.
  const soon = shouldStart(state, T0 + 900);
  assert.equal(soon.start, false);
  assert.equal(soon.waitMs, REFRESH_MIN_INTERVAL_MS - 900);
  assert.equal(shouldStart(state, T0 + REFRESH_MIN_INTERVAL_MS).start, true);
});

test('a response with no change behind it is accepted', () => {
  let state = onChange(createRefreshState(), T0);
  state = onStart(state, T0 + REFRESH_DEBOUNCE_MS);
  const settled = onSettled(state, T0 + 900);
  assert.equal(settled.accepted, true);
  assert.equal(isSettled(settled.state), true);
});

test('the late-landing stale response of a race is refused', () => {
  // The exact shape of the reverting-text bug: A starts, the edit lands, A's
  // slow response arrives last. It must not reach the DOM.
  const { settles } = drive([
    [T0, 1],
    [T0 + 300, 1],
  ]);
  assert.equal(settles[0].accepted, false, 'the first render predates the second edit');
  assert.equal(settles.at(-1)?.accepted, true, 'and the last one is the truth');
});

// --- rule 3: rate limit ------------------------------------------------------

test('consecutive refreshes are spaced by at least the minimum interval', () => {
  const events: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [T0 + i * 250, 1]);
  const { starts } = drive(events);
  for (let i = 1; i < starts.length; i += 1) {
    assert.ok(
      starts[i] - starts[i - 1] >= REFRESH_MIN_INTERVAL_MS,
      `start ${i} was only ${starts[i] - starts[i - 1]}ms after the previous`,
    );
  }
});

test('the debounce measures from the FIRST event of a run, not the last', () => {
  let state = onChange(createRefreshState(), T0);
  state = onChange(state, T0 + 40);
  state = onChange(state, T0 + 70);
  assert.equal(shouldStart(state, T0 + REFRESH_DEBOUNCE_MS).start, true, 'not slid forward');
});

test('a long typing session cannot outrun the rate limit', () => {
  // One event every 40ms for 12 seconds — an editor holding down a key.
  const events: Array<[number, number]> = Array.from({ length: 300 }, (_, i) => [T0 + i * 40, 1]);
  const { starts } = drive(events);
  const span = 300 * 40;
  assert.ok(
    starts.length <= Math.ceil(span / REFRESH_MIN_INTERVAL_MS) + 1,
    `${starts.length} starts over ${span}ms is above the rate limit`,
  );
  assert.ok(starts.length < 20, 'nowhere near the 300 the old scheduler would have fired');
});

// --- rule 3, the other half: the last change always renders -------------------

test('every burst ends settled, with the final change rendered', () => {
  const shapes: Array<Array<[number, number]>> = [
    [[T0, 1]],
    [[T0, 5]],
    [
      [T0, 3],
      [T0 + 100, 4],
      [T0 + 950, 2],
    ],
    Array.from({ length: 10 }, (_, i): [number, number] => [T0 + i * 60, 1]),
    Array.from({ length: 40 }, (_, i): [number, number] => [T0 + i * 137, 2]),
  ];
  for (const shape of shapes) {
    const { state, settles } = drive(shape);
    assert.equal(isSettled(state), true, 'nothing left owed or in flight');
    assert.equal(settles.at(-1)?.accepted, true, 'and the last refresh was the accepted one');
  }
});

test('a slow render does not lose the change that arrived during it', () => {
  // The second event lands 500ms into a 3s render, so it cannot share the first
  // refresh the way a within-debounce sibling would: it has to be picked up by a
  // follow-up, and the first response has to be refused on the way past.
  const { state, settles } = drive(
    [
      [T0, 1],
      [T0 + 500, 1],
    ],
    3000,
  );
  assert.equal(isSettled(state), true);
  assert.equal(settles.length, 2);
  assert.equal(settles[0].accepted, false, 'the slow render finished behind the edit');
  assert.equal(settles.at(-1)?.accepted, true);
});

// --- rule 2, the second bug: a reconcile overwriting NEWER instant text -------
// The editor's report after the morph landed: "if I type long enough I will get
// half my text disappear, then a second or two later it will come back." The
// mechanism was WHICH events reached `onChange`. The SSE stream runs at Sanity's
// transaction visibility, about a second behind the keystroke; instant text
// applies the Studio's local draft in ~100ms. A render started inside that gap
// landed looking current and was morphed in holding a HALF-TYPED sentence.
//
// The fix is upstream of this file — every document instant text applies now
// calls `onChange` (VisualEditingOverlay) — so what is pinned down here is that
// the scheduler does the right thing with those events, and that the extra ones
// cost discards rather than renders.

/** A local-channel document reaches the frame about this long after a keypress. */
const INSTANT_TEXT_MS = 100;

test('the report sequence cannot reproduce once instant text is a change event', () => {
  // Common prefix: a change opens the burst, render A starts, the editor keeps
  // typing for the whole of A's render, A lands at T0+1000.
  const opened = onChange(createRefreshState(), T0);
  const started = onStart(opened, T0 + REFRESH_DEBOUNCE_MS);
  const typedAt = [T0 + 120, T0 + 260, T0 + 380, T0 + 500, T0 + 700];

  // WITHOUT the bump, nothing told the scheduler about those keystrokes, so A
  // is judged current and its older HTML is swapped in. This is the bug.
  assert.equal(onSettled(started, T0 + 1000).accepted, true, 'the reported failure');

  // WITH it, every applied document moves the sequence past A's stamp.
  let state = started;
  for (const at of typedAt) state = onChange(state, at);
  const settled = onSettled(state, T0 + 1000);
  assert.equal(settled.accepted, false, 'A predates words the page already shows');
  assert.equal(settled.state.dirty, true, 'and the follow-up that renders them is owed');
  assert.equal(settled.state.inFlightSeq, null);
});

test('a render started before a local-channel document is discarded', () => {
  // The narrowest version: ONE document, arriving 100ms after the render began.
  let state = onChange(createRefreshState(), T0);
  state = onStart(state, T0);
  state = onChange(state, T0 + INSTANT_TEXT_MS);
  const settled = onSettled(state, T0 + RENDER_MS);
  assert.equal(settled.accepted, false);
  // And the discard is not a dropped edit: the follow-up is scheduled for the
  // instant the rate limit opens.
  assert.equal(
    shouldStart(settled.state, T0 + RENDER_MS).waitMs,
    REFRESH_MIN_INTERVAL_MS - RENDER_MS,
  );
  assert.equal(shouldStart(settled.state, T0 + REFRESH_MIN_INTERVAL_MS).start, true);
});

test('instant-text bumps cost discards, not renders', () => {
  // Twenty seconds of continuous typing. The local channel posts every 100ms
  // (its throttle is 60ms and a keystroke is faster than the round trip it
  // replaces), where the SSE stream alone would have reported about once a
  // second. Same wall clock, same render cost.
  const SECONDS = 20;
  const span = SECONDS * 1000;
  const withInstantText: Array<[number, number]> = Array.from(
    { length: span / INSTANT_TEXT_MS },
    (_, i) => [T0 + i * INSTANT_TEXT_MS, 1],
  );
  const sseOnly: Array<[number, number]> = Array.from({ length: SECONDS }, (_, i) => [
    T0 + i * 1000,
    1,
  ]);

  const fast = drive(withInstantText);
  const slow = drive(sseOnly);

  // THE LOAD FIGURE. Starts are capped by the rate limit, not by the event
  // rate: at most one render per REFRESH_MIN_INTERVAL_MS, i.e. 0.83/s at 1200ms.
  const ceiling = Math.ceil(span / REFRESH_MIN_INTERVAL_MS) + 1;
  assert.ok(
    fast.starts.length <= ceiling,
    `${fast.starts.length} starts over ${span}ms is above the ${ceiling} the rate limit allows`,
  );
  assert.ok(
    fast.starts.length <= slow.starts.length + 1,
    `ten times the events must not mean more renders (${fast.starts.length} vs ${slow.starts.length})`,
  );
  for (let i = 1; i < fast.starts.length; i += 1) {
    assert.ok(fast.starts[i] - fast.starts[i - 1] >= REFRESH_MIN_INTERVAL_MS);
  }

  // What DID change: every render that lands mid-burst is now refused instead of
  // writing its half-typed HTML over the page.
  assert.ok(fast.settles.length > 1);
  assert.deepEqual(
    fast.settles.slice(0, -1).map((s) => s.accepted),
    fast.settles.slice(0, -1).map(() => false),
    'every render but the last is refused while the typing continues',
  );
  // And the burst still ends with the truth on the page, exactly once.
  assert.equal(fast.settles.at(-1)?.accepted, true);
  assert.equal(isSettled(fast.state), true);
});

test('a burst of instant-text documents converges without a discard loop', () => {
  // A discard marks the state dirty, which schedules another render, which could
  // in principle be discarded again. It cannot loop: nothing bumps the sequence
  // once the typing stops, so the next render is accepted and the state settles.
  const { state, settles } = drive(
    Array.from({ length: 50 }, (_, i): [number, number] => [T0 + i * INSTANT_TEXT_MS, 1]),
  );
  assert.equal(isSettled(state), true);
  assert.equal(settles.filter((s) => s.accepted).length, 1, 'exactly one accepted render');
  assert.equal(settles.at(-1)?.accepted, true);
});

// --- awaiting callers --------------------------------------------------------

/**
 * The overlay resolves a caller when a refresh that STARTED after it asked is
 * ACCEPTED. This models that bookkeeping to prove nobody waits forever — the
 * comlink ⟳ button spins until its promise resolves.
 */
test('every awaiting caller is resolved by the refresh that covers it', () => {
  let state = createRefreshState();
  let waiting = 0;
  let covered = 0;
  let resolved = 0;
  let landsAt: number | null = null;
  const asks = [T0, T0 + 10, T0 + 20, T0 + 400, T0 + 1500, T0 + 1505];
  let next = 0;

  for (let now = T0; now <= T0 + 20_000; now += 10) {
    while (next < asks.length && asks[next] <= now) {
      waiting += 1;
      state = onChange(state, asks[next]);
      next += 1;
    }
    if (landsAt !== null && landsAt <= now) {
      const settled = onSettled(state, now);
      state = settled.state;
      if (settled.accepted) {
        resolved += covered;
      } else {
        waiting += covered; // a discard covers nobody; they roll into the next run
      }
      covered = 0;
      landsAt = null;
    }
    if (shouldStart(state, now).start) {
      state = onStart(state, now);
      covered += waiting;
      waiting = 0;
      landsAt = now + RENDER_MS;
    }
  }

  assert.equal(isSettled(state), true);
  assert.equal(waiting, 0, 'nobody left un-covered');
  assert.equal(covered, 0, 'nobody left mid-flight');
  assert.equal(resolved, asks.length, 'all six callers resolved');
});

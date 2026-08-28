// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-live-draft — the Studio→preview local-edit channel's rules
// =============================================================================
// Three promises are pinned down here, and all three are safety rather than
// speed:
//
//  1. A message that is not exactly ours is dropped. The island listens on a
//     public page, so every other shape must fall out silently.
//  2. A stale actor snapshot cannot type the page backwards while the local
//     channel is live.
//  3. The pending-swap memory does not care which channel made the swap.
//
// See src/lib/preview-live-draft.ts for why each rule exists.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_DRAFT_MESSAGE,
  LOCAL_LEAD_MS,
  MAX_PENDING,
  MAX_SEEN,
  acceptsSource,
  parseLiveDraft,
  rememberSwap,
  type PendingSwap,
} from './preview-live-draft.ts';

const doc = (extra: Record<string, unknown> = {}) => ({
  _id: 'drafts.homePage',
  _type: 'homePage',
  ...extra,
});

// ---------------------------------------------------------------------------
// parseLiveDraft — the rejection funnel
// ---------------------------------------------------------------------------

test('accepts a well-formed draft message and hands the document back', () => {
  const parsed = parseLiveDraft({ type: LIVE_DRAFT_MESSAGE, document: doc({ title: 'Hello' }) });
  assert.ok(parsed);
  assert.equal(parsed.document?._id, 'drafts.homePage');
  assert.equal(parsed.document?.title, 'Hello');
});

test('accepts an explicit null document — "this page has no draft"', () => {
  const parsed = parseLiveDraft({ type: LIVE_DRAFT_MESSAGE, document: null });
  assert.deepEqual(parsed, { type: LIVE_DRAFT_MESSAGE, document: null });
});

test('rejects anything that is not our envelope', () => {
  const notOurs: unknown[] = [
    undefined,
    null,
    'pa:live-draft',
    42,
    [],
    [{ type: LIVE_DRAFT_MESSAGE, document: doc() }],
    {},
    { type: 'other', document: doc() },
    // The shapes other tools on the same origin actually post.
    { type: 'visual-editing/navigate', url: '/preview' },
    { source: 'react-devtools-content-script' },
    // The envelope without the field, which would otherwise read as "no draft".
    { type: LIVE_DRAFT_MESSAGE },
  ];
  for (const data of notOurs) {
    assert.equal(parseLiveDraft(data), null, `should have rejected ${JSON.stringify(data)}`);
  }
});

test('rejects a document that is not a document', () => {
  const bad: unknown[] = [
    'homePage',
    7,
    [],
    {},
    { _id: 'drafts.homePage' },
    { _type: 'homePage' },
    { _id: '', _type: 'homePage' },
    { _id: 'drafts.homePage', _type: '' },
    { _id: 123, _type: 'homePage' },
    { _id: 'drafts.homePage', _type: { name: 'homePage' } },
  ];
  for (const document of bad) {
    assert.equal(
      parseLiveDraft({ type: LIVE_DRAFT_MESSAGE, document }),
      null,
      `should have rejected document ${JSON.stringify(document)}`,
    );
  }
});

test('hands back a normalised envelope, dropping anything else on it', () => {
  // Extra fields on the envelope are ignored rather than carried forward, so
  // nothing a sender invents can reach the code that applies the document.
  const parsed = parseLiveDraft({
    type: LIVE_DRAFT_MESSAGE,
    document: doc(),
    apply: 'everything',
    reload: true,
  });
  assert.ok(parsed);
  assert.deepEqual(Object.keys(parsed).sort(), ['document', 'type']);
});

// ---------------------------------------------------------------------------
// acceptsSource — the local channel leads, the actor follows
// ---------------------------------------------------------------------------

const T0 = 1_000_000;

test('the local channel may always write', () => {
  assert.equal(acceptsSource('local', null, T0), true);
  assert.equal(acceptsSource('local', T0, T0), true);
});

test('the actor writes freely when no local snapshot has ever arrived', () => {
  assert.equal(acceptsSource('actor', null, T0), true);
});

test('the actor is held back while a local snapshot is recent', () => {
  assert.equal(acceptsSource('actor', T0, T0), false);
  assert.equal(acceptsSource('actor', T0, T0 + LOCAL_LEAD_MS - 1), false);
});

test('the actor takes over again once the local channel goes quiet', () => {
  assert.equal(acceptsSource('actor', T0, T0 + LOCAL_LEAD_MS), true);
  assert.equal(acceptsSource('actor', T0, T0 + LOCAL_LEAD_MS * 10), true);
});

// ---------------------------------------------------------------------------
// rememberSwap — one memory, either channel
// ---------------------------------------------------------------------------

const memory = () => new Map<string, PendingSwap>();

test('remembers the first previous value, whichever channel keeps swapping', () => {
  const pending = memory();
  // The actor sees the save of "Hi"; the local channel is already on "Hi t".
  rememberSwap(pending, 'homePage title', 'Hello', 'Hi');
  rememberSwap(pending, 'homePage title', 'Hi', 'Hi t');
  rememberSwap(pending, 'homePage title', 'Hi t', 'Hi there');
  assert.deepEqual(pending.get('homePage title'), {
    key: 'homePage title',
    previous: 'Hello',
    next: 'Hi there',
    seen: ['Hello', 'Hi', 'Hi t'],
  });
  assert.equal(pending.size, 1);
});

test('drops a field that came back to where the server left it', () => {
  const pending = memory();
  rememberSwap(pending, 'homePage title', 'Hello', 'Hellox');
  rememberSwap(pending, 'homePage title', 'Hellox', 'Hello');
  assert.equal(pending.has('homePage title'), false);
});

test('a swap straight back to the original is never remembered at all', () => {
  const pending = memory();
  rememberSwap(pending, 'homePage title', 'Hello', 'Hello');
  assert.equal(pending.size, 0);
});

test('keeps separate fields apart', () => {
  const pending = memory();
  rememberSwap(pending, 'homePage title', 'a', 'b');
  rememberSwap(pending, 'homePage tagline', 'c', 'd');
  assert.equal(pending.size, 2);
  assert.equal(pending.get('homePage tagline')?.previous, 'c');
});

test('stops growing at the cap but keeps updating what it already holds', () => {
  const pending = memory();
  for (let i = 0; i < MAX_PENDING + 50; i += 1) rememberSwap(pending, `field ${i}`, 'a', 'b');
  assert.equal(pending.size, MAX_PENDING);
  rememberSwap(pending, 'field 0', 'b', 'c');
  assert.equal(pending.get('field 0')?.next, 'c');
  assert.equal(pending.get('field 0')?.previous, 'a');
  assert.equal(pending.size, MAX_PENDING);
});

test('honours a caller-supplied cap', () => {
  const pending = memory();
  rememberSwap(pending, 'one', 'a', 'b', 1);
  rememberSwap(pending, 'two', 'a', 'b', 1);
  assert.deepEqual([...pending.keys()], ['one']);
});

// ---------------------------------------------------------------------------
// rememberSwap — the per-field value history the re-apply matches against
// ---------------------------------------------------------------------------
// A render that STARTED mid-burst carries an intermediate value: not the words
// the burst began from, not the words on the page now. The history is what lets
// the pending-swap re-apply recognise it as a stale render of this field rather
// than as text it must not touch.

test('keeps every value the field passed through, oldest first', () => {
  const pending = memory();
  // One word typed a letter at a time.
  const typed = ['Ou', 'Our', 'Our ', 'Our s', 'Our st'];
  let from = 'O';
  for (const value of typed) {
    rememberSwap(pending, 'homePage heading', from, value);
    from = value;
  }
  assert.deepEqual(pending.get('homePage heading')?.seen, ['O', 'Ou', 'Our', 'Our ', 'Our s']);
  assert.equal(pending.get('homePage heading')?.next, 'Our st');
});

test('the current value is never in the history', () => {
  const pending = memory();
  rememberSwap(pending, 'k', 'a', 'b');
  rememberSwap(pending, 'k', 'b', 'c');
  const swap = pending.get('k')!;
  assert.equal(swap.seen.includes(swap.next), false, 'a node showing `next` has landed, not stale');
  assert.deepEqual(swap.seen, ['a', 'b']);
});

test('a value typed back to an earlier one leaves the history without it', () => {
  const pending = memory();
  rememberSwap(pending, 'k', 'a', 'ab');
  rememberSwap(pending, 'k', 'ab', 'abc');
  // Backspace: the field is at "ab" again, which is where it already was.
  rememberSwap(pending, 'k', 'abc', 'ab');
  const swap = pending.get('k')!;
  assert.equal(swap.next, 'ab');
  assert.deepEqual(swap.seen, ['a', 'abc'], 'the current value drops out, the rest stays');
  assert.equal(swap.previous, 'a', 'and the original is untouched');
});

test('the history starts at the value the server is still showing', () => {
  const pending = memory();
  rememberSwap(pending, 'k', 'Hello', 'Hello!');
  assert.deepEqual(pending.get('k')?.seen, ['Hello']);
});

test('the history stops growing, and the oldest value is the one it keeps', () => {
  const pending = memory();
  let from = 'v0';
  for (let i = 1; i <= MAX_SEEN + 20; i += 1) {
    rememberSwap(pending, 'k', from, `v${i}`);
    from = `v${i}`;
  }
  const swap = pending.get('k')!;
  assert.equal(swap.seen.length, MAX_SEEN);
  assert.equal(swap.seen[0], 'v0', 'the value the first server render will arrive holding');
  assert.equal(swap.seen.at(-1), `v${MAX_SEEN + 19}`, 'and the newest history is kept too');
  assert.equal(swap.previous, 'v0');
});

test('honours a caller-supplied history cap', () => {
  const pending = memory();
  rememberSwap(pending, 'k', 'a', 'b', MAX_PENDING, 2);
  rememberSwap(pending, 'k', 'b', 'c', MAX_PENDING, 2);
  rememberSwap(pending, 'k', 'c', 'd', MAX_PENDING, 2);
  assert.deepEqual(pending.get('k')?.seen, ['a', 'c']);
});

test('a field that returns to where the server left it forgets its history too', () => {
  const pending = memory();
  rememberSwap(pending, 'k', 'a', 'ab');
  rememberSwap(pending, 'k', 'ab', 'a');
  assert.equal(pending.has('k'), false, 'nothing left to correct, nothing left to remember');
});

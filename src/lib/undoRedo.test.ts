// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SanityClient } from '@sanity/client';
import {
  changesSomething,
  documentBefore,
  effectFor,
  fetchLastTransactions,
  isNoOpEffect,
  isRevInSync,
  parseTransactions,
  pickUndoTarget,
  publishedIdOf,
  redoDepth,
  redoLast,
  resetUndoRedo,
  sameIgnoringVolatile,
  transactionsTouching,
  translogRequest,
  undoLast,
  withoutRev,
  type TranslogTransaction,
} from '../sanity/undoRedo.ts';

const DRAFT = 'drafts.homePage';

/**
 * A whole-value mendoza patch. `[0, value]` is a literal: opcode 0 replaces the
 * document with `value`. These are genuine mendoza and go through the real
 * applyPatch, so the plumbing is exercised for real.
 *
 * The EMPTY patch `[]` is the one that matters most here. It is what a real
 * create transaction carries as its `revert`, and `applyPatch(doc, [])` returns
 * the document UNCHANGED rather than null - the trap this file shipped with.
 */
const literal = (value: unknown) => [0, value] as never;
const EMPTY = [] as never;

const tx = (id: string, docId: string, before: unknown, after: unknown): TranslogTransaction => ({
  id,
  timestamp: '2026-08-28T12:00:00Z',
  documentIDs: [docId],
  effects: { [docId]: { apply: literal(after), revert: literal(before) } },
});

/** A create, shaped the way the API really shapes one: revert is EMPTY. */
const createTx = (id: string, docId: string, value: unknown): TranslogTransaction => ({
  id,
  documentIDs: [docId],
  effects: { [docId]: { apply: literal(value), revert: EMPTY } },
});

/** A transaction that listed the document but changed nothing about it. */
const noOpTx = (id: string, docId: string): TranslogTransaction => ({
  id,
  documentIDs: [docId],
  effects: { [docId]: { apply: EMPTY, revert: EMPTY } },
});

// -----------------------------------------------------------------------------
// The request shape
// -----------------------------------------------------------------------------

test('translogRequest asks the history API the way sanity itself does', () => {
  const req = translogRequest('production', DRAFT, 5);
  assert.equal(req.method, 'GET');
  assert.equal(req.url, '/data/history/production/transactions/drafts.homePage');
  assert.equal(req.query.effectFormat, 'mendoza');
  assert.equal(req.query.reverse, 'true');
  assert.equal(req.query.limit, '5');
  assert.ok(req.tag);
});

test('translogRequest keeps excludeContent true (the API 403s otherwise)', () => {
  // Verified against a live dataset: excludeContent=false answers 403 "This API
  // requires excludeContent to be true". Effects come back regardless, so
  // nothing is lost and this must never be flipped.
  assert.equal(translogRequest('production', DRAFT).query.excludeContent, 'true');
});

test('translogRequest escapes the document id', () => {
  assert.match(translogRequest('production', 'drafts.a b').url, /drafts\.a%20b$/);
});

// -----------------------------------------------------------------------------
// NDJSON parsing
// -----------------------------------------------------------------------------

test('parseTransactions reads NDJSON, blank lines and CRLF included', () => {
  assert.deepEqual(
    parseTransactions('{"id":"a"}\r\n\r\n{"id":"b"}\n').map((t) => t.id),
    ['a', 'b'],
  );
});

test('parseTransactions accepts an already-parsed array or single object', () => {
  assert.deepEqual(
    parseTransactions([{ id: 'a' }, { id: 'b' }]).map((t) => t.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    parseTransactions({ id: 'a' }).map((t) => t.id),
    ['a'],
  );
});

test('parseTransactions treats an empty body as no transactions', () => {
  assert.deepEqual(parseTransactions(''), []);
  assert.deepEqual(parseTransactions(undefined), []);
});

test('parseTransactions throws on an error line rather than reading it as silence', () => {
  assert.throws(
    () =>
      parseTransactions('{"error":{"description":"This API requires excludeContent to be true"}}'),
    /excludeContent/,
  );
});

// -----------------------------------------------------------------------------
// Reading absence out of the patch shape (the bug that shipped)
// -----------------------------------------------------------------------------

test('documentBefore reads a CREATE from the empty revert, not from applyPatch', () => {
  // THE REGRESSION, at its root. A create transaction carries `revert: []`, and
  // `applyPatch(doc, [])` hands the document straight back. Anything that tests
  // applyPatch's result for null concludes "it was already like this" and
  // writes the document back to itself.
  const current = { _id: DRAFT, _type: 'homePage', _rev: 'r1', title: 'made by a chip' };
  assert.deepEqual(documentBefore(current, { apply: literal(current), revert: EMPTY }), {
    absent: true,
  });
});

test('documentBefore restores the previous document for an ordinary change', () => {
  const current = { _id: DRAFT, _type: 'homePage', _rev: 'r2', title: 'after' };
  const before = { _id: DRAFT, _type: 'homePage', title: 'before' };
  const result = documentBefore(current, { apply: literal(current), revert: literal(before) });
  assert.equal(result.absent, false);
  assert.deepEqual(result.absent === false && result.doc, before);
});

test('documentBefore still honours an explicit null literal', () => {
  const current = { _id: DRAFT, _type: 'homePage', _rev: 'r1' };
  assert.deepEqual(documentBefore(current, { apply: EMPTY, revert: literal(null) }), {
    absent: true,
  });
});

test('isNoOpEffect spots a transaction that named the document but changed nothing', () => {
  // Real: seen on drafts.homePage in the live log, both patches empty.
  assert.equal(isNoOpEffect({ apply: EMPTY, revert: EMPTY }), true);
  assert.equal(isNoOpEffect({ apply: literal({}), revert: EMPTY }), false);
});

// -----------------------------------------------------------------------------
// "An undo that changes nothing is not an undo"
// -----------------------------------------------------------------------------

test('sameIgnoringVolatile ignores _rev and _updatedAt and nothing else', () => {
  const a = { _rev: 'r1', _updatedAt: 'then', title: 'T', body: { n: [1, 2] } };
  const b = { _rev: 'r2', _updatedAt: 'now', title: 'T', body: { n: [1, 2] } };
  assert.equal(sameIgnoringVolatile(a, b), true);
  assert.equal(sameIgnoringVolatile(a, { ...b, title: 'other' }), false);
  assert.equal(sameIgnoringVolatile(a, { ...b, body: { n: [1, 3] } }), false);
  assert.equal(sameIgnoringVolatile(a, { ...b, extra: 1 }), false);
});

test('sameIgnoringVolatile compares arrays by length and order', () => {
  assert.equal(sameIgnoringVolatile([1, 2], [1, 2]), true);
  assert.equal(sameIgnoringVolatile([1, 2], [2, 1]), false);
  assert.equal(sameIgnoringVolatile([1, 2], [1, 2, 3]), false);
  assert.equal(sameIgnoringVolatile([{ a: 1 }], [{ a: 1 }]), true);
});

test('changesSomething says no when only a server-owned field would move', () => {
  const current = { _id: DRAFT, _type: 'homePage', _rev: 'r2', _updatedAt: 'now', title: 'T' };
  assert.equal(
    changesSomething(current, {
      absent: false,
      doc: { ...withoutRev(current), _updatedAt: 'then' },
    }),
    false,
  );
  assert.equal(
    changesSomething(current, { absent: false, doc: { ...withoutRev(current), title: 'X' } }),
    true,
  );
  assert.equal(changesSomething(current, { absent: true }), true, 'deleting is always a change');
});

// -----------------------------------------------------------------------------
// Picking the step to undo
// -----------------------------------------------------------------------------

const doc = (title: string, rev = 'r1') => ({ _id: DRAFT, _type: 'homePage', _rev: rev, title });

test('effectFor ignores a transaction that did not touch this document', () => {
  assert.equal(effectFor(tx('t1', 'drafts.other', {}, {}), DRAFT), null);
});

test('effectFor rejects a malformed effect', () => {
  const bad = {
    id: 't1',
    effects: { [DRAFT]: { apply: 'nope' } },
  } as unknown as TranslogTransaction;
  assert.equal(effectFor(bad, DRAFT), null);
});

test('transactionsTouching keeps only this document, newest first', () => {
  const txs = [tx('t3', DRAFT, {}, {}), tx('t2', 'drafts.other', {}, {}), tx('t1', DRAFT, {}, {})];
  assert.deepEqual(
    transactionsTouching(txs, DRAFT).map((t) => t.id),
    ['t3', 't1'],
  );
});

test('pickUndoTarget skips our own writes and the steps already undone', () => {
  const current = doc('three');
  const txs = [
    tx('ours-1', DRAFT, doc('two'), current),
    tx('t3', DRAFT, doc('one'), doc('two')),
    tx('t2', DRAFT, doc('zero'), doc('one')),
  ];
  const ours = new Set(['ours-1']);
  assert.equal(pickUndoTarget(txs, DRAFT, current, ours, new Set())?.tx.id, 't3');
  assert.equal(pickUndoTarget(txs, DRAFT, current, ours, new Set(['t3']))?.tx.id, 't2');
  assert.equal(pickUndoTarget(txs, DRAFT, current, ours, new Set(['t3', 't2'])), null);
});

test('pickUndoTarget skips a no-op transaction and takes the real one behind it', () => {
  const current = doc('after');
  const txs = [noOpTx('noop', DRAFT), tx('real', DRAFT, doc('before'), current)];
  assert.equal(pickUndoTarget(txs, DRAFT, current, new Set(), new Set())?.tx.id, 'real');
});

test('pickUndoTarget skips a transaction that would put back the same document', () => {
  // The deployed failure in miniature: transactions that moved nothing but
  // `_updatedAt`, each of which the old code happily reported as "undone".
  const current = { ...doc('same'), _updatedAt: 'now' };
  const stale = { ...withoutRev(current), _updatedAt: 'then' };
  const txs = [
    tx('noop-1', DRAFT, stale, current),
    tx('noop-2', DRAFT, stale, current),
    tx('real', DRAFT, { ...withoutRev(current), title: 'different' }, current),
  ];
  assert.equal(pickUndoTarget(txs, DRAFT, current, new Set(), new Set())?.tx.id, 'real');
});

test('pickUndoTarget returns the create when that is the only real step back', () => {
  const current = doc('made by a chip');
  const target = pickUndoTarget(
    [createTx('c1', DRAFT, current)],
    DRAFT,
    current,
    new Set(),
    new Set(),
  );
  assert.equal(target?.tx.id, 'c1');
  assert.deepEqual(target?.previous, { absent: true });
});

test('isRevInSync is the rev guard: newest transaction id must be the doc _rev', () => {
  const txs = [tx('t2', DRAFT, {}, {}), tx('t1', DRAFT, {}, {})];
  assert.equal(isRevInSync(txs, DRAFT, 't2'), true);
  assert.equal(isRevInSync(txs, DRAFT, 't1'), false, 'someone wrote after the log we read');
  assert.equal(isRevInSync(txs, DRAFT, undefined), false);
  assert.equal(isRevInSync([], DRAFT, 't2'), false);
});

test('withoutRev drops _rev and nothing else', () => {
  assert.deepEqual(withoutRev({ _id: 'x', _rev: 'r', title: 'T' }), { _id: 'x', title: 'T' });
});

test('publishedIdOf finds the twin, and leaves a published id alone', () => {
  assert.equal(publishedIdOf('drafts.homePage'), 'homePage');
  assert.equal(publishedIdOf('homePage'), 'homePage');
});

// -----------------------------------------------------------------------------
// A miniature Sanity, faithful in the three ways that bit us
// -----------------------------------------------------------------------------
// The first version of this fake got all three wrong, which is exactly why the
// suite was green while the deployed Studio lied:
//
//   1. A CREATE writes `revert: []`, not a null literal.
//   2. `_updatedAt` moves on every write, so writing an identical document
//      still produces a real transaction with a real effect.
//   3. A caller-supplied `transactionId` is IGNORED, exactly as
//      @sanity/client's `_create` ignores it. The server assigns its own.

interface Doc extends Record<string, unknown> {
  _id: string;
  _type: string;
  _rev?: string;
  _updatedAt?: string;
}

function fakeSanity(initial: Record<string, Doc | undefined> = {}) {
  const docs = new Map<string, Doc>();
  const log: TranslogTransaction[] = [];
  let counter = 0;

  function write(id: string, next: Doc | undefined) {
    const txId = `srv${++counter}`;
    const before = docs.get(id);
    const stamp = `2026-08-28T00:00:${String(counter).padStart(2, '0')}Z`;
    if (next) docs.set(id, { ...next, _rev: txId, _updatedAt: stamp });
    else docs.delete(id);
    const after = docs.get(id);
    log.unshift({
      id: txId,
      documentIDs: [id],
      effects: {
        [id]: {
          // A create has no previous value, and the API says so with an EMPTY
          // revert patch. A delete says the same thing with an empty apply.
          apply: after ? literal(withoutRev(after)) : EMPTY,
          revert: before ? literal(withoutRev(before)) : EMPTY,
        },
      },
    });
    return txId;
  }

  for (const [id, d] of Object.entries(initial)) if (d) write(id, d);

  const client = {
    config: () => ({ dataset: 'production' }),
    getDocument: async (id: string) => docs.get(id),
    request: async () => log.map((t) => JSON.stringify(t)).join('\n'),
    createOrReplace: async (d: Doc, opts?: { returnDocuments?: boolean }) => {
      const transactionId = write(d._id, d);
      return opts?.returnDocuments === false ? { transactionId } : docs.get(d._id);
    },
    delete: async (id: string, opts?: { returnDocuments?: boolean }) => {
      const transactionId = write(id, undefined);
      return opts?.returnDocuments === false ? { transactionId } : undefined;
    },
  };

  return {
    client: client as unknown as SanityClient,
    docs,
    log,
    /** Somebody else's mutation lands on the document. */
    edit: (id: string, patch: Partial<Doc>) => write(id, { ...(docs.get(id) as Doc), ...patch }),
    create: (id: string, d: Doc) => write(id, d),
  };
}

const page = (title: string, extra: Record<string, unknown> = {}): Doc => ({
  _id: DRAFT,
  _type: 'homePage',
  title,
  ...extra,
});

// -----------------------------------------------------------------------------
// The deployed failure, as tests
// -----------------------------------------------------------------------------

test('THE REGRESSION: undoing an overlay-created draft removes it instead of rewriting it', async () => {
  // presacademy, 2026-08-28: a Presentation overlay chip created
  // drafts.pricingPage and set a tone in ONE transaction. Ctrl+Z toasted
  // "Change undone" three times and the tone never moved, because the create's
  // empty revert was read as "no change" and the document was written back to
  // itself.
  resetUndoRedo();
  const sanity = fakeSanity({ homePage: { _id: 'homePage', _type: 'homePage', title: 'live' } });
  sanity.create(DRAFT, page('created by a chip', { background: { tone: 'chapel' } }));
  const transactionsBefore = sanity.log.length;

  const result = await undoLast(sanity.client, DRAFT);

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.removedDraft, true);
  assert.equal(sanity.docs.has(DRAFT), false, 'the draft is gone, not rewritten');
  assert.equal(sanity.docs.get('homePage')?.title, 'live', 'the published copy is untouched');
  assert.equal(sanity.log.length, transactionsBefore + 1, 'exactly one transaction was written');
});

test('THE REGRESSION: undo never reports success without changing the document', async () => {
  // The honesty rule. Whatever the log holds, a successful undo must have moved
  // something other than a server-owned field.
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('the only copy'));
  // Three writes of the identical document: what the broken build left behind
  // on the live dataset, three transactions that moved only `_updatedAt`.
  for (let i = 0; i < 3; i += 1) sanity.edit(DRAFT, {});

  const before = JSON.stringify(sanity.docs.get(DRAFT));
  const result = await undoLast(sanity.client, DRAFT);

  assert.equal(result.ok, false, 'no published twin, and nothing else is a real step back');
  assert.equal(result.ok === false && result.reason, 'only-copy');
  assert.equal(JSON.stringify(sanity.docs.get(DRAFT)), before, 'and nothing was written');
});

test('undo walks past no-op transactions to the last real change', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  sanity.edit(DRAFT, {}); // identical write, moves only _updatedAt
  sanity.edit(DRAFT, {}); // and another

  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');
});

test('undo recognises its own writes by the id the SERVER assigned', async () => {
  // The other half of the deployed bug: @sanity/client's `_create` never
  // forwards a caller's transactionId, so tracking the REQUESTED id recognised
  // nothing and multi-step undo could not work. The fake ignores requested ids
  // for the same reason.
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  await undoLast(sanity.client, DRAFT);

  assert.equal(
    sanity.docs.get(DRAFT)?._rev,
    sanity.log[0].id,
    'our undo is the newest transaction',
  );
  // If it were not recognised, this second undo would put 'two' straight back.
  await undoLast(sanity.client, DRAFT);
  assert.notEqual(sanity.docs.get(DRAFT)?.title, 'two');
});

// -----------------------------------------------------------------------------
// Undo
// -----------------------------------------------------------------------------

test('undo steps back one change, and a second undo steps back again', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  sanity.edit(DRAFT, { title: 'three' });

  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'two');

  // The second undo must go FURTHER back, not put 'three' back. Reading the
  // newest transaction naively would oscillate between two states forever.
  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');
  assert.equal(redoDepth(DRAFT), 2);
});

test('undo refuses when the document has moved since the log was read', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.docs.set(DRAFT, { ...(sanity.docs.get(DRAFT) as Doc), _rev: 'somebody-else' });

  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'stale' });
});

test('undo has nothing to do on a document with no draft', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
});

test('undoing the change that created the draft removes the draft, twin permitting', async () => {
  resetUndoRedo();
  const sanity = fakeSanity({ homePage: { _id: 'homePage', _type: 'homePage', title: 'live' } });
  sanity.create(DRAFT, page('a draft of it'));

  const result = await undoLast(sanity.client, DRAFT);
  assert.equal(result.ok && result.removedDraft, true);
  assert.equal(sanity.docs.has(DRAFT), false);
  assert.equal(sanity.docs.get('homePage')?.title, 'live');
});

test('undo refuses to remove the only copy of a document', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('the only copy'));

  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'only-copy' });
  assert.equal(sanity.docs.get(DRAFT)?.title, 'the only copy');
});

test('undo runs out honestly once every step has been taken', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'only-copy' });
});

// -----------------------------------------------------------------------------
// Redo
// -----------------------------------------------------------------------------

test('redo puts back exactly what the undo took away', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });

  await undoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');

  assert.equal((await redoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'two');
  assert.equal(redoDepth(DRAFT), 0);
});

test('redo, undo, redo walks the same path twice', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });

  await undoLast(sanity.client, DRAFT);
  await redoLast(sanity.client, DRAFT);
  await undoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');
  await redoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'two');
});

test('redo restores a draft the undo removed', async () => {
  resetUndoRedo();
  const sanity = fakeSanity({ homePage: { _id: 'homePage', _type: 'homePage', title: 'live' } });
  sanity.create(DRAFT, page('a draft of it'));

  await undoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.has(DRAFT), false);

  assert.equal((await redoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'a draft of it');
});

test('an edit after an undo throws the redo away', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });

  await undoLast(sanity.client, DRAFT);
  assert.equal(redoDepth(DRAFT), 1);

  sanity.edit(DRAFT, { title: 'one and a bit' });
  assert.deepEqual(await redoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
  assert.equal(redoDepth(DRAFT), 0);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one and a bit', 'and nothing was written');
});

test('undo after an outside edit starts again from the newest change', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  await undoLast(sanity.client, DRAFT);
  sanity.edit(DRAFT, { title: 'three' });

  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one', 'the newest change, undone');
});

test('redo has nothing to do before anything has been undone', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  assert.deepEqual(await redoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
});

test('fetchLastTransactions returns the log newest first', async () => {
  const sanity = fakeSanity();
  sanity.create(DRAFT, page('one'));
  sanity.edit(DRAFT, { title: 'two' });
  const txs = await fetchLastTransactions(sanity.client, DRAFT);
  assert.equal(txs.length, 2);
  assert.equal(txs[0].id, sanity.docs.get(DRAFT)?._rev);
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SanityClient } from '@sanity/client';
import {
  effectFor,
  fetchLastTransactions,
  isRevInSync,
  nextUndoTarget,
  parseTransactions,
  publishedIdOf,
  redoDepth,
  redoLast,
  resetUndoRedo,
  transactionsTouching,
  translogRequest,
  undoLast,
  withoutRev,
  type TranslogTransaction,
} from '../sanity/undoRedo.ts';

const DRAFT = 'drafts.homePage';

/**
 * A whole-value mendoza patch. `[0, value]` is a literal: mendoza's opcode 0
 * replaces the document with `value`, and `[0, null]` deletes it. Real patches
 * from the log are far more surgical, but these are genuine mendoza and go
 * through the real applyPatch, so the plumbing is exercised for real.
 */
const literal = (value: unknown) => [0, value] as never;

const tx = (id: string, docId: string, before: unknown, after: unknown): TranslogTransaction => ({
  id,
  timestamp: '2026-08-28T12:00:00Z',
  documentIDs: [docId],
  effects: { [docId]: { apply: literal(after), revert: literal(before) } },
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
  // Verified against a live dataset 2026-08-28: excludeContent=false answers
  // 403 "This API requires excludeContent to be true". Effects come back
  // regardless, so there is nothing lost and this must never be flipped.
  assert.equal(translogRequest('production', DRAFT).query.excludeContent, 'true');
});

test('translogRequest escapes the document id', () => {
  assert.match(translogRequest('production', 'drafts.a b').url, /drafts\.a%20b$/);
});

// -----------------------------------------------------------------------------
// NDJSON parsing
// -----------------------------------------------------------------------------

test('parseTransactions reads NDJSON, blank lines and CRLF included', () => {
  const body = '{"id":"a"}\r\n\r\n{"id":"b"}\n';
  assert.deepEqual(
    parseTransactions(body).map((t) => t.id),
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
  const body = '{"error":{"description":"This API requires excludeContent to be true"}}';
  assert.throws(() => parseTransactions(body), /excludeContent/);
});

// -----------------------------------------------------------------------------
// Picking the step to undo
// -----------------------------------------------------------------------------

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

test('nextUndoTarget skips our own writes and the steps already undone', () => {
  const txs = [
    tx('ours-2', DRAFT, {}, {}),
    tx('ours-1', DRAFT, {}, {}),
    tx('t3', DRAFT, {}, {}),
    tx('t2', DRAFT, {}, {}),
  ];
  const ours = new Set(['ours-1', 'ours-2']);
  assert.equal(nextUndoTarget(txs, DRAFT, ours, new Set())?.id, 't3');
  assert.equal(nextUndoTarget(txs, DRAFT, ours, new Set(['t3']))?.id, 't2');
  assert.equal(nextUndoTarget(txs, DRAFT, ours, new Set(['t3', 't2'])), null);
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
// A miniature Sanity, so undo/redo can be exercised end to end
// -----------------------------------------------------------------------------
// It behaves the way the real one does in the two ways that matter: a write
// appends a transaction whose id becomes the document's `_rev`, and the
// transaction carries both directions of the change.

interface Doc extends Record<string, unknown> {
  _id: string;
  _type: string;
  _rev?: string;
}

function fakeSanity(initial: Record<string, Doc | undefined> = {}) {
  const docs = new Map<string, Doc>();
  const log: TranslogTransaction[] = [];
  let counter = 0;

  function write(id: string, next: Doc | undefined, transactionId?: string) {
    const txId = transactionId ?? `srv-${++counter}`;
    const before = docs.get(id);
    if (next) docs.set(id, { ...next, _rev: txId });
    else docs.delete(id);
    log.unshift({
      id: txId,
      documentIDs: [id],
      effects: {
        [id]: {
          apply: literal(next ? { ...next, _rev: undefined, _updatedAt: undefined } : null),
          revert: literal(before ? withoutRev(before) : null),
        },
      },
    });
    return docs.get(id);
  }

  for (const [id, doc] of Object.entries(initial)) if (doc) write(id, doc);

  const client = {
    config: () => ({ dataset: 'production' }),
    getDocument: async (id: string) => docs.get(id),
    request: async () => log.map((t) => JSON.stringify(t)).join('\n'),
    createOrReplace: async (doc: Doc, opts?: { transactionId?: string }) =>
      write(doc._id, doc, opts?.transactionId),
    delete: async (id: string, opts?: { transactionId?: string }) =>
      write(id, undefined, opts?.transactionId),
  };

  return {
    client: client as unknown as SanityClient,
    docs,
    log,
    /** An outside edit: someone else's mutation lands on the document. */
    edit: (id: string, patch: Partial<Doc>) => write(id, { ...docs.get(id)!, ...patch }),
  };
}

const page = (title: string, extra: Record<string, unknown> = {}): Doc => ({
  _id: DRAFT,
  _type: 'homePage',
  title,
  ...extra,
});

// -----------------------------------------------------------------------------
// Undo
// -----------------------------------------------------------------------------

test('undo steps back one change, and a second undo steps back again', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));
  sanity.edit(DRAFT, page('three'));

  const first = await undoLast(sanity.client, DRAFT);
  assert.equal(first.ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'two');

  // The second undo must go FURTHER back, not put 'three' back. Reading the
  // newest transaction naively would oscillate between two states forever.
  const second = await undoLast(sanity.client, DRAFT);
  assert.equal(second.ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');
  assert.equal(redoDepth(DRAFT), 2);
});

test('undo refuses when the document has moved since the log was read', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  // A write that the log we are about to read will not explain: pretend the
  // document rev drifted (a mutation still settling, or a colleague's edit).
  sanity.docs.set(DRAFT, { ...sanity.docs.get(DRAFT)!, _rev: 'somebody-else' });

  const result = await undoLast(sanity.client, DRAFT);
  assert.deepEqual(result, { ok: false, reason: 'stale' });
});

test('undo has nothing to do on a document with no draft', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
});

test('undo runs out honestly once every step has been taken', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));
  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  // 'one' was itself a create, and there is no published twin behind it.
  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'only-copy' });
});

test('undoing the change that created the draft removes the draft, twin permitting', async () => {
  resetUndoRedo();
  const sanity = fakeSanity({ homePage: { _id: 'homePage', _type: 'homePage', title: 'live' } });
  sanity.edit(DRAFT, page('a draft of it'));

  const result = await undoLast(sanity.client, DRAFT);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.removedDraft, true);
  assert.equal(sanity.docs.has(DRAFT), false, 'the draft is gone');
  assert.equal(sanity.docs.get('homePage')?.title, 'live', 'the published copy is untouched');
});

test('undo refuses to remove the only copy of a document', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('the only copy'));

  assert.deepEqual(await undoLast(sanity.client, DRAFT), { ok: false, reason: 'only-copy' });
  assert.equal(sanity.docs.get(DRAFT)?.title, 'the only copy');
});

// -----------------------------------------------------------------------------
// Redo
// -----------------------------------------------------------------------------

test('redo puts back exactly what the undo took away', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));

  await undoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one');

  const result = await redoLast(sanity.client, DRAFT);
  assert.equal(result.ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'two');
  assert.equal(redoDepth(DRAFT), 0);
});

test('redo, undo, redo walks the same path twice', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));

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
  sanity.edit(DRAFT, page('a draft of it'));

  await undoLast(sanity.client, DRAFT);
  assert.equal(sanity.docs.has(DRAFT), false);

  assert.equal((await redoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'a draft of it');
});

test('an edit after an undo throws the redo away', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));

  await undoLast(sanity.client, DRAFT);
  assert.equal(redoDepth(DRAFT), 1);

  // The editor types something. The state the redo pointed at is no longer on
  // the path forward, so the stack goes.
  sanity.edit(DRAFT, page('one and a bit'));
  assert.deepEqual(await redoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
  assert.equal(redoDepth(DRAFT), 0);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one and a bit', 'and nothing was written');
});

test('undo after an outside edit starts again from the newest change', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));
  await undoLast(sanity.client, DRAFT);
  sanity.edit(DRAFT, page('three'));

  assert.equal((await undoLast(sanity.client, DRAFT)).ok, true);
  assert.equal(sanity.docs.get(DRAFT)?.title, 'one', 'the newest change, undone');
});

test('redo has nothing to do before anything has been undone', async () => {
  resetUndoRedo();
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  assert.deepEqual(await redoLast(sanity.client, DRAFT), { ok: false, reason: 'nothing' });
});

test('fetchLastTransactions returns the log newest first', async () => {
  const sanity = fakeSanity();
  sanity.edit(DRAFT, page('one'));
  sanity.edit(DRAFT, page('two'));
  const txs = await fetchLastTransactions(sanity.client, DRAFT);
  assert.equal(txs.length, 2);
  assert.equal(txs[0].id, sanity.docs.get(DRAFT)?._rev);
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { applyPatch, type RawPatch } from 'mendoza';
import type { SanityClient } from '@sanity/client';

// =============================================================================
// Document-level undo and redo (PORTS.md card 27)
// =============================================================================
// THE PROBLEM. Ctrl+Z inside a text box undoes typing, because the browser owns
// that. Everything else an editor does - add a section, drag a section, pick a
// different background, clear a photo - has no undo at all. Squarespace has
// one. The honest answer up to now was "open Version history and restore",
// which is a five-click detour for a mis-drag.
//
// THE MECHANISM. Every mutation Sanity accepts is written to a transaction log,
// and each entry carries a mendoza patch in BOTH directions:
//
//   GET /data/history/<dataset>/transactions/<documentId>
//       ?effectFormat=mendoza&excludeContent=true&excludeMutations=true
//       &includeIdentifiedDocumentsOnly=true&reverse=true&limit=<n>
//
// NDJSON, newest first, one transaction per line, each with
// `effects: { <docId>: { apply: [...], revert: [...] } }`. Apply the `revert`
// patch to the document as it stands and you have the document as it was; apply
// `apply` to that and you are forward again. This is the same request the
// Studio's own Version history makes (sanity's Timeline fetches with exactly
// these parameters), so it needs no extra permission and no extra token.
//
// FIVE THINGS THAT ARE NOT OBVIOUS, all verified by reading a live transaction
// log (2026-08-28). Numbers 4 and 5 were found the hard way, by a first version
// of this file that shipped and lied - see the postmortem below.
//
//   1. `excludeContent=false` is REFUSED. The API answers 403
//      "This API requires excludeContent to be true". The effects come back
//      anyway - excludeContent drops the mutation payloads, not the effects.
//   2. A transaction's `id` IS the `_rev` the document carries afterwards.
//      That is the whole rev guard: if the newest transaction's id is not the
//      document's current `_rev`, something landed that we cannot see, so we
//      do nothing.
//   3. `_rev` MUST be stripped before applyPatch. It is not part of the value
//      the effects were computed against, and leaving it on shifts every field
//      index in the patch - the document comes back with `_type` reading
//      "homePage3:54" and a paragraph turned into an array of letters. Sanity's
//      own applyMendozaPatch does the same strip; this is not a nicety.
//   4. A transaction that CREATED a document has `revert: []` - an EMPTY patch,
//      NOT a null literal. And `applyPatch(doc, [])` returns the document
//      UNCHANGED, not null. So "did this transaction create the document?"
//      cannot be answered by testing applyPatch's result for null. It is
//      answered by `revert.length === 0`. Both patches empty is a third thing
//      again: a transaction that listed this document but changed nothing
//      about it.
//   5. `client.createOrReplace(doc, {transactionId})` SILENTLY IGNORES the
//      transaction id. In @sanity/client, `_create` builds its request body as
//      `{mutations: [...]}` and never copies `options.transactionId` into it;
//      only `_mutate` does. So the id we ask for is not the id the transaction
//      gets. Nothing here supplies one any more: we read the id the SERVER
//      assigned back out of the mutation result, which is also the document's
//      new `_rev`.
//
// THE POSTMORTEM (2026-08-28, deployed presacademy). Ctrl+Z on a page whose
// draft had been created by a Presentation overlay chip toasted "Change undone"
// three times and changed nothing. The transaction log told the whole story:
// the draft's entire history was ONE transaction (createIfNotExists + the tone
// set, batched by the overlay's optimistic actor), whose revert was `[]`.
// Finding 4 had not been made yet, so `applyPatch(current, [])` handed back the
// same document, the null test did not fire, the delete branch was never
// reached, and we wrote the document back to itself. Three times. Each write
// produced a real transaction whose only effect was to move `_updatedAt`.
//
// Two rules came out of it, and both are enforced below:
//   - Absence is read from the PATCH SHAPE, never inferred from applyPatch.
//   - An undo that would not change anything is NOT an undo. Before writing,
//     the candidate is compared with the current document ignoring `_updatedAt`
//     and `_rev`; if nothing moves, that transaction is skipped and the next
//     one back is tried. This feature is never allowed to say "Change undone"
//     while the document stands still.
//
// SAFETY. Only the DRAFT id is ever read or written, which makes this
// inherently publish-safe: a publish is a mutation on the published twin, so it
// is not in this log and cannot be undone here. The rev guard refuses rather
// than clobbering a concurrent edit. Nothing is deleted except a draft whose
// published twin still exists, and that is checked first. Every call goes
// through the Studio session's own client, so the server enforces permissions.
//
// WHAT THIS IS NOT. It is not version history. It reaches back only as far as
// this session's own steps plus the last few transactions, it forgets
// everything on reload, and it never touches published content. Version history
// remains the deep restore, and the guide says so.
// =============================================================================

/** How many transactions to pull. Deeper than anyone steps back in one sitting. */
export const TRANSLOG_LIMIT = 25;

/** Request tag, so these show up identifiably in the project's API log. */
const REQUEST_TAG = 'undo-redo.transactions';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** The two mendoza patches one transaction holds for one document. */
export interface TransactionEffect {
  apply: RawPatch;
  revert: RawPatch;
}

/** One line of the transaction log, as the history API returns it. */
export interface TranslogTransaction {
  id: string;
  timestamp?: string;
  author?: string;
  documentIDs?: string[];
  effects?: Record<string, TransactionEffect | undefined>;
}

/** A step this session has undone, kept so it can be put back. */
export interface RedoEntry {
  /** The document this step belongs to (always a draft id). */
  documentId: string;
  /** The id of the ORIGINAL transaction that was undone. */
  transactionId: string;
  /** The forward patch, replayed to redo. */
  apply: RawPatch;
  /**
   * The `_rev` the undo left the document at, or null if the undo removed the
   * draft. Redo refuses unless the document is still exactly there.
   */
  revAfterUndo: string | null;
}

export type UndoFailure =
  /** No transaction left that this session has not already stepped past. */
  | 'nothing'
  /** Someone (or something) else has written since; refusing to clobber it. */
  | 'stale'
  /** Undoing would delete the draft, and there is no published copy behind it. */
  | 'only-copy';

export type UndoResult =
  { ok: true; entry: RedoEntry; removedDraft: boolean } | { ok: false; reason: UndoFailure };

export type RedoFailure = 'nothing' | 'stale';

export type RedoResult = { ok: true; entry: RedoEntry } | { ok: false; reason: RedoFailure };

/** A document as the mutation API hands it back. Loosely typed on purpose. */
type RawDoc = Record<string, unknown> & { _id: string; _type: string; _rev?: string };

// -----------------------------------------------------------------------------
// Pure helpers (unit tested in src/lib/undoRedo.test.ts)
// -----------------------------------------------------------------------------

/**
 * The exact request handed to the Studio client for one document's
 * transactions. A relative url, so it goes through the client's own base url,
 * project id, api version and session credentials; the query is left to the
 * client to encode, which is also what keeps the request tag well-formed.
 *
 * These are sanity's own history parameters, minus the `toTransaction` cursor
 * it uses for paging. `excludeContent` is not a choice: see the header.
 */
export function translogRequest(
  dataset: string,
  documentId: string,
  limit = TRANSLOG_LIMIT,
): { url: string; query: Record<string, string>; tag: string; method: 'GET' } {
  return {
    url: `/data/history/${dataset}/transactions/${encodeURIComponent(documentId)}`,
    method: 'GET',
    tag: REQUEST_TAG,
    query: {
      effectFormat: 'mendoza',
      excludeContent: 'true',
      excludeMutations: 'true',
      includeIdentifiedDocumentsOnly: 'true',
      reverse: 'true',
      limit: String(limit),
    },
  };
}

/**
 * Parse the NDJSON body. Tolerant on purpose: depending on the response's
 * content type the client may hand back a raw string, an already-parsed array,
 * or a single parsed object, and all three mean the same thing here.
 *
 * A line carrying an `error` is thrown, the way sanity's own reader does it -
 * silently returning "no transactions" would look like "nothing to undo".
 */
export function parseTransactions(body: unknown): TranslogTransaction[] {
  const rows: unknown[] = Array.isArray(body)
    ? body
    : typeof body === 'string'
      ? body
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line) as unknown)
      : body
        ? [body]
        : [];

  return rows.map((row) => {
    const tx = row as TranslogTransaction & { error?: { description?: string; type?: string } };
    if (tx.error) {
      throw new Error(tx.error.description || tx.error.type || 'Transaction log error');
    }
    return tx;
  });
}

/** The effect one transaction had on one document, if it touched it at all. */
export function effectFor(tx: TranslogTransaction, documentId: string): TransactionEffect | null {
  const effect = tx.effects?.[documentId];
  if (!effect || !Array.isArray(effect.apply) || !Array.isArray(effect.revert)) return null;
  return effect;
}

/** Newest first, every transaction that LISTED this document. */
export function transactionsTouching(
  txs: TranslogTransaction[],
  documentId: string,
): TranslogTransaction[] {
  return txs.filter((tx) => effectFor(tx, documentId) !== null);
}

/**
 * A transaction that named this document but did nothing to it: BOTH patches
 * empty. Real in the wild (a multi-document transaction where the other
 * document is the one that moved). Never a useful step back.
 */
export function isNoOpEffect(effect: TransactionEffect): boolean {
  return effect.apply.length === 0 && effect.revert.length === 0;
}

/** What the document looked like before a transaction: gone, or these fields. */
export type PreviousDocument = { absent: true } | { absent: false; doc: Record<string, unknown> };

/**
 * The document as it stood BEFORE one transaction.
 *
 * ABSENCE IS READ FROM THE PATCH SHAPE, never inferred from applyPatch's
 * result. A transaction that created the document carries `revert: []`, and
 * `applyPatch(doc, [])` hands back the document UNCHANGED - so testing the
 * result for null silently turns "delete this draft" into "write the document
 * back to itself", which is precisely the bug this file shipped with once. See
 * finding 4 in the header.
 */
export function documentBefore(
  current: Record<string, unknown>,
  effect: TransactionEffect,
): PreviousDocument {
  if (effect.revert.length === 0) return { absent: true };
  const doc = applyPatch(withoutRev(current), effect.revert) as Record<string, unknown> | null;
  return doc === null ? { absent: true } : { absent: false, doc };
}

/** Fields the server owns. A move in these alone is not a change an editor made. */
const VOLATILE_FIELDS = new Set(['_rev', '_updatedAt']);

/** Structural equality, ignoring the fields the server rewrites on every write. */
export function sameIgnoringVolatile(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => sameIgnoringVolatile(item, b[i]));
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const left = Object.keys(a as object).filter((k) => !VOLATILE_FIELDS.has(k));
  const right = Object.keys(b as object).filter((k) => !VOLATILE_FIELDS.has(k));
  if (left.length !== right.length) return false;
  return left.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      sameIgnoringVolatile(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
  );
}

/**
 * Would stepping back over this transaction actually move anything? Deleting
 * the draft always counts. Otherwise the candidate is compared with the current
 * document ignoring `_updatedAt` and `_rev`.
 *
 * This is the rule that stops the feature lying. A transaction can be perfectly
 * real and still leave the document identical - our own no-op writes did, and
 * so does anything that only touches a server-owned field - and an undo that
 * writes the same value back while toasting "Change undone" is worse than no
 * undo at all.
 */
export function changesSomething(
  current: Record<string, unknown>,
  previous: PreviousDocument,
): boolean {
  if (previous.absent) return true;
  return !sameIgnoringVolatile(previous.doc, withoutRev(current));
}

/** A step back that is worth taking: the transaction, and what it restores. */
export interface UndoTarget {
  tx: TranslogTransaction;
  effect: TransactionEffect;
  previous: PreviousDocument;
}

/**
 * The next step back: the newest transaction that is not one of our own
 * undo/redo writes, not a step this session has already undone, not a no-op,
 * and not one whose "before" is the document we already have.
 *
 * EVERY candidate is measured against the CURRENT document, never against a
 * reconstructed intermediate. That holds in both cases the loop can skip:
 *
 *   - Our own undo and the transaction it undid always come in a PAIR, and the
 *     pair cancels: after an undo, the document already IS the state the next
 *     candidate produced.
 *   - A candidate whose revert changes nothing means the document already IS
 *     the state before it, which is equally the state after the candidate
 *     before it.
 *
 * So in both cases `current` is the right thing to apply the next `revert` to,
 * and reconstructing intermediates would add a way to be wrong for no gain.
 */
export function pickUndoTarget(
  txs: TranslogTransaction[],
  documentId: string,
  current: Record<string, unknown>,
  ownTransactionIds: ReadonlySet<string>,
  alreadyUndone: ReadonlySet<string>,
): UndoTarget | null {
  for (const tx of transactionsTouching(txs, documentId)) {
    const effect = effectFor(tx, documentId);
    if (!effect || isNoOpEffect(effect)) continue;
    if (ownTransactionIds.has(tx.id) || alreadyUndone.has(tx.id)) continue;
    const previous = documentBefore(current, effect);
    if (!changesSomething(current, previous)) continue;
    return { tx, effect, previous };
  }
  return null;
}

/**
 * Is the log we just read the whole story? A transaction's id is the `_rev` it
 * leaves behind, so the newest transaction touching this document must match
 * the document's current `_rev`. If it does not, someone else wrote in the gap
 * (or a mutation is still settling) and we must not write over it.
 */
export function isRevInSync(
  txs: TranslogTransaction[],
  documentId: string,
  currentRev: string | undefined,
): boolean {
  const newest = transactionsTouching(txs, documentId)[0];
  if (!newest || !currentRev) return false;
  return newest.id === currentRev;
}

/**
 * Everything mendoza is allowed to see. `_rev` is not part of the value the
 * effects were computed against; leaving it on corrupts the result. See the
 * header - this cost an afternoon to find, once.
 */
export function withoutRev(doc: Record<string, unknown>): Record<string, unknown> {
  const { _rev: _ignored, ...rest } = doc;
  return rest;
}

/** The published twin's id for a draft id (and a no-op for anything else). */
export function publishedIdOf(documentId: string): string {
  return documentId.startsWith('drafts.') ? documentId.slice('drafts.'.length) : documentId;
}

// -----------------------------------------------------------------------------
// Per-document session state
// -----------------------------------------------------------------------------
// In memory, per document, for as long as the tab is open. A reload starts
// clean, which is the honest promise: undo is a courtesy for the last few
// minutes, not a second version history.

interface DocState {
  /** Transaction ids WE wrote (undo and redo mutations). */
  ownTransactionIds: Set<string>;
  /** Ids of original transactions this session has stepped past. */
  undone: Set<string>;
  /** Newest first. Each entry can be replayed forward. */
  redoStack: RedoEntry[];
  /**
   * Where our last undo/redo left the document. If the document has moved off
   * this rev by the time of the next call, someone typed (or someone else
   * wrote), and the whole stack is dropped: those states are no longer on the
   * path back.
   */
  expectedRev: string | null | undefined;
}

const states = new Map<string, DocState>();
const listeners = new Set<() => void>();

function freshState(): DocState {
  return {
    ownTransactionIds: new Set(),
    undone: new Set(),
    redoStack: [],
    expectedRev: undefined,
  };
}

function stateFor(documentId: string): DocState {
  let state = states.get(documentId);
  if (!state) {
    state = freshState();
    states.set(documentId, state);
  }
  return state;
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to redo-stack changes, so a button can enable itself. */
export function subscribeUndoRedo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How many steps this session could put back on this document. */
export function redoDepth(documentId: string): number {
  return states.get(documentId)?.redoStack.length ?? 0;
}

/** Forget everything about a document (used by the tests, and on staleness). */
export function resetUndoRedo(documentId?: string): void {
  if (documentId) states.delete(documentId);
  else states.clear();
  notify();
}

/**
 * Drop the stack if the document has moved off the rev our last undo/redo left
 * it at. This is the redo-invalidation rule in one line: any transaction we did
 * not make - the editor typing, a colleague, a script - changes `_rev`, and the
 * states we were holding are no longer reachable by replaying `apply`.
 */
function syncToDocument(documentId: string, currentRev: string | undefined): DocState {
  const state = stateFor(documentId);
  if (state.expectedRev !== undefined && state.expectedRev !== (currentRev ?? null)) {
    const replacement = freshState();
    states.set(documentId, replacement);
    notify();
    return replacement;
  }
  return state;
}

/**
 * Record a write of ours by the id the SERVER gave it, and remember where it
 * left the document.
 *
 * We do not supply transaction ids. An earlier version minted a UUID and passed
 * it as `{transactionId}`, which reads as if it works and does not:
 * @sanity/client's `_create` (behind `create`, `createOrReplace` and
 * `createIfNotExists`) builds its request body as `{mutations: [...]}` and never
 * copies `options.transactionId` into it - only `_mutate` does. The id we asked
 * for was silently dropped, the server assigned its own, and `ownTransactionIds`
 * therefore never recognised a single one of our own transactions.
 *
 * Reading the assigned id back out of the mutation result is both simpler and
 * immune to that: it is the id that is actually in the log, and it is the
 * document's new `_rev`.
 */
function recordOwnWrite(state: DocState, transactionId: string | null): void {
  if (transactionId) state.ownTransactionIds.add(transactionId);
  state.expectedRev = transactionId;
}

/** The shape a mutation returns when asked not to hand the document back. */
interface MutationReceipt {
  transactionId?: string;
}

// -----------------------------------------------------------------------------
// Client calls
// -----------------------------------------------------------------------------

/**
 * The document's last transactions, newest first, filtered to the ones that
 * actually touched it.
 */
export async function fetchLastTransactions(
  client: SanityClient,
  documentId: string,
  limit = TRANSLOG_LIMIT,
): Promise<TranslogTransaction[]> {
  const dataset = client.config().dataset;
  if (!dataset) throw new Error('No dataset configured on this client');
  const body = await client.request<unknown>(translogRequest(dataset, documentId, limit));
  return parseTransactions(body);
}

/**
 * Step one change back on this draft.
 *
 * Reads the draft, finds the newest transaction this session has not already
 * stepped past AND that would actually move something, checks that nothing else
 * has landed, then writes the document as it was. If that transaction is the
 * one that CREATED the draft, the undo is a delete of the draft - allowed only
 * when a published copy still exists, so the document cannot be lost by
 * pressing Ctrl+Z.
 */
export async function undoLast(client: SanityClient, documentId: string): Promise<UndoResult> {
  const current = (await client.getDocument(documentId)) as RawDoc | undefined;
  const state = syncToDocument(documentId, current?._rev);

  if (!current) return { ok: false, reason: 'nothing' };

  const txs = await fetchLastTransactions(client, documentId);
  if (!isRevInSync(txs, documentId, current._rev)) return { ok: false, reason: 'stale' };

  const target = pickUndoTarget(txs, documentId, current, state.ownTransactionIds, state.undone);
  if (!target) return { ok: false, reason: 'nothing' };

  // The transaction being undone CREATED this draft, so "before" is no draft.
  // Read from the patch shape, never from applyPatch's result: see finding 4.
  if (target.previous.absent) {
    const published = await client.getDocument(publishedIdOf(documentId));
    if (!published) return { ok: false, reason: 'only-copy' };
    const receipt = (await client.delete(documentId, {
      returnDocuments: false,
    })) as MutationReceipt;
    const entry: RedoEntry = {
      documentId,
      transactionId: target.tx.id,
      apply: target.effect.apply,
      revAfterUndo: null,
    };
    if (receipt.transactionId) state.ownTransactionIds.add(receipt.transactionId);
    // The draft is gone, so there is no rev to sit on.
    state.expectedRev = null;
    state.undone.add(target.tx.id);
    state.redoStack.unshift(entry);
    notify();
    return { ok: true, entry, removedDraft: true };
  }

  // `_updatedAt` goes with `_rev`: the server sets both, and sending the old
  // one back would be a lie about when this document last changed.
  const { _updatedAt: _ignored, ...body } = target.previous.doc;
  // The `as RawDoc` on the argument (twice in this file) is deliberate and
  // canonical: @sanity/client cannot pick a createOrReplace overload for an
  // argument that is only `unknown`-keyed, and drops TS2769 without it.
  const receipt = (await client.createOrReplace({ ...body, _id: documentId } as RawDoc, {
    returnDocuments: false,
  })) as MutationReceipt;

  const entry: RedoEntry = {
    documentId,
    transactionId: target.tx.id,
    apply: target.effect.apply,
    revAfterUndo: receipt.transactionId ?? null,
  };
  recordOwnWrite(state, receipt.transactionId ?? null);
  state.undone.add(target.tx.id);
  state.redoStack.unshift(entry);
  notify();
  return { ok: true, entry, removedDraft: false };
}

/**
 * Put back the step the last undo took away. Refuses if the document has moved
 * since - by then the forward patch describes a state nobody can get to.
 */
export async function redoLast(client: SanityClient, documentId: string): Promise<RedoResult> {
  const current = (await client.getDocument(documentId)) as RawDoc | undefined;
  const state = syncToDocument(documentId, current?._rev);

  const entry = state.redoStack[0];
  if (!entry) return { ok: false, reason: 'nothing' };
  if ((current?._rev ?? null) !== entry.revAfterUndo) return { ok: false, reason: 'stale' };

  // A redo of an undone create starts from nothing, the way sanity's own
  // history reconstructs a created document.
  const base = current ? withoutRev(current) : {};
  const next = applyPatch(base, entry.apply) as Record<string, unknown> | null;
  if (next === null) return { ok: false, reason: 'stale' };

  const { _updatedAt: _ignored, ...body } = next;
  // The second of the two casts. See undoLast above.
  const receipt = (await client.createOrReplace({ ...body, _id: documentId } as RawDoc, {
    returnDocuments: false,
  })) as MutationReceipt;

  state.undone.delete(entry.transactionId);
  state.redoStack.shift();
  recordOwnWrite(state, receipt.transactionId ?? null);
  notify();
  return { ok: true, entry };
}

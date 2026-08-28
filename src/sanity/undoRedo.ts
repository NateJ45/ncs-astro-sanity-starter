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
// THREE THINGS THAT ARE NOT OBVIOUS, all verified against a live dataset on
// 2026-08-28 before a line of this was written:
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

/** Newest first, only the transactions that actually changed this document. */
export function transactionsTouching(
  txs: TranslogTransaction[],
  documentId: string,
): TranslogTransaction[] {
  return txs.filter((tx) => effectFor(tx, documentId) !== null);
}

/**
 * The next step back: the newest transaction that is neither one of our own
 * undo/redo writes nor a step this session has already undone.
 *
 * Applying that transaction's `revert` to the CURRENT document is correct even
 * after several undos, because each undo leaves the document in exactly the
 * state that transaction produced.
 */
export function nextUndoTarget(
  txs: TranslogTransaction[],
  documentId: string,
  ownTransactionIds: ReadonlySet<string>,
  alreadyUndone: ReadonlySet<string>,
): TranslogTransaction | null {
  for (const tx of transactionsTouching(txs, documentId)) {
    if (ownTransactionIds.has(tx.id)) continue;
    if (alreadyUndone.has(tx.id)) continue;
    return tx;
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
 * A transaction id for our own writes. A plain UUID, which is exactly what the
 * Studio itself mints (a document edited in the Studio carries a UUID `_rev`),
 * so there is no chance of the API rejecting the shape. Our own ids are tracked
 * in `ownTransactionIds` rather than recognised by a prefix.
 */
function newTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Only reached in an environment without WebCrypto. Uniqueness is all that
  // is asked of it.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
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
 * stepped past, checks that nothing else has landed, then writes the document
 * as it was. If that transaction is the one that CREATED the draft, the undo is
 * a delete of the draft - allowed only when a published copy still exists, so
 * the document cannot be lost by pressing Ctrl+Z.
 */
export async function undoLast(client: SanityClient, documentId: string): Promise<UndoResult> {
  const current = (await client.getDocument(documentId)) as RawDoc | undefined;
  const state = syncToDocument(documentId, current?._rev);

  if (!current) return { ok: false, reason: 'nothing' };

  const txs = await fetchLastTransactions(client, documentId);
  if (!isRevInSync(txs, documentId, current._rev)) return { ok: false, reason: 'stale' };

  const target = nextUndoTarget(txs, documentId, state.ownTransactionIds, state.undone);
  if (!target) return { ok: false, reason: 'nothing' };

  const effect = effectFor(target, documentId);
  if (!effect) return { ok: false, reason: 'nothing' };

  const previous = applyPatch(withoutRev(current), effect.revert) as Record<string, unknown> | null;

  const transactionId = newTransactionId();

  // The transaction being undone CREATED this draft, so "before" is no draft.
  if (previous === null) {
    const published = await client.getDocument(publishedIdOf(documentId));
    if (!published) return { ok: false, reason: 'only-copy' };
    await client.delete(documentId, { transactionId });
    const entry: RedoEntry = {
      documentId,
      transactionId: target.id,
      apply: effect.apply,
      revAfterUndo: null,
    };
    state.ownTransactionIds.add(transactionId);
    state.undone.add(target.id);
    state.redoStack.unshift(entry);
    state.expectedRev = null;
    notify();
    return { ok: true, entry, removedDraft: true };
  }

  // `_updatedAt` goes with `_rev`: the server sets both, and sending the old
  // one back would be a lie about when this document last changed.
  const { _updatedAt: _ignored, ...body } = previous;
  const written = (await client.createOrReplace(
    { ...body, _id: documentId },
    {
      transactionId,
    },
  )) as RawDoc;

  const entry: RedoEntry = {
    documentId,
    transactionId: target.id,
    apply: effect.apply,
    revAfterUndo: written._rev ?? transactionId,
  };
  state.ownTransactionIds.add(transactionId);
  state.undone.add(target.id);
  state.redoStack.unshift(entry);
  state.expectedRev = entry.revAfterUndo;
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

  const transactionId = newTransactionId();
  const { _updatedAt: _ignored, ...body } = next;
  const written = (await client.createOrReplace(
    { ...body, _id: documentId },
    {
      transactionId,
    },
  )) as RawDoc;

  state.ownTransactionIds.add(transactionId);
  state.undone.delete(entry.transactionId);
  state.redoStack.shift();
  state.expectedRev = written._rev ?? transactionId;
  notify();
  return { ok: true, entry };
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// preview-share - private preview links that expire (PORTS.md card 117)
// =============================================================================
// "Share a preview" in the Studio makes a link that someone with no login can
// open for 1, 3, 7 or 14 days. It shows ONE document's draft, noindex, and the
// editor can stop it at any time. This file is the pure half: the token format,
// its signature and expiry, and the rules a share record must pass. It has no
// imports so the bare-Node tests (src/lib/preview-share.test.ts) cover all of
// it; the Worker half is src/lib/preview-share-server.ts and the route
// src/pages/api/studio/share-preview.ts.
//
// THE TWO LOCKS. A link works only while BOTH hold:
//   1. The token's HMAC-SHA256 signature checks out against the Worker secret
//      SHARE_PREVIEW_SECRET, and its expiry has not passed. Nobody without the
//      secret can mint or alter a token (change the page, push the date out).
//   2. Its share record still exists in the dataset, names the same document,
//      has not been revoked and has not expired. The record is how "Stop this
//      link" works without rotating the secret (which would stop every link).
// The record holds no token and no signature, only the nonce the token carries,
// so reading the dataset never yields a working link. Its id lives under the
// `previewShare.` path, which Sanity only serves to authenticated requests, so
// a public dataset does not list them either.
//
// NEVER A SANITY TOKEN IN THE URL. The Worker reads the draft with its own
// server-side SANITY_TOKEN, as the Studio preview does; the URL carries only
// the signed share token.
//
// Token shape: base64url(JSON payload) "." base64url(HMAC-SHA256(secret, payload))
// =============================================================================

/** The lifetimes an editor can pick, in days. The route refuses anything else. */
export const SHARE_DAYS = [1, 3, 7, 14] as const;
export type ShareDays = (typeof SHARE_DAYS)[number];

/** The longest a link can live, plus an hour of clock slack. */
export const SHARE_MAX_MS = 14 * 24 * 3600 * 1000 + 3600 * 1000;

/** The query parameter the link carries. */
export const SHARE_PARAM = 'share';

/** The document type and id path of a share record. */
export const SHARE_RECORD_TYPE = 'previewShare';
export const shareRecordId = (nonce: string): string => `${SHARE_RECORD_TYPE}.${nonce}`;

/** What a token carries. Short keys keep the link short. */
export interface SharePayload {
  /** nonce: the share record's id suffix */
  n: string;
  /** the published document id the link may show */
  d: string;
  /** the preview path the link opens, e.g. /preview/about/ */
  p: string;
  /** expiry, Unix seconds */
  e: number;
}

/** The share record as the Worker reads it from the dataset. */
export interface ShareRecord {
  docId?: string;
  path?: string;
  expiresAt?: string;
  revoked?: boolean;
}

/** A random id from the Studio: letters, digits and dashes, 16 to 64 long. */
export function isNonce(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(value);
}

/** A Sanity document id we are willing to scope a link to (never a draft id). */
export function isDocId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9._-]{1,128}$/.test(value) &&
    !value.startsWith('drafts.') &&
    !value.startsWith('versions.')
  );
}

/** `/preview`, `/preview/about` -> `/preview/`, `/preview/about/`. Null if not a preview path. */
export function normaliseSharePath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  if (!/^\/preview(\/[A-Za-z0-9._~/-]*)?$/.test(path) || path.includes('..')) return null;
  return path.endsWith('/') ? path : `${path}/`;
}

/** The expiry (ms) for a lifetime in days, or null for a lifetime not on offer. */
export function expiryFor(days: unknown, nowMs: number): number | null {
  return SHARE_DAYS.includes(days as ShareDays)
    ? nowMs + (days as number) * 24 * 3600 * 1000
    : null;
}

// ---------------------------------------------------------------------------
// base64url + HMAC (Web Crypto: the same in the Worker and in Node 22)
// ---------------------------------------------------------------------------

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** A secret long enough to sign with. Short or missing means "not set up". */
export function isUsableSecret(secret: unknown): secret is string {
  return typeof secret === 'string' && secret.length >= 32;
}

/** Sign a payload into a link token. */
export async function signShareToken(payload: SharePayload, secret: string): Promise<string> {
  if (!isUsableSecret(secret)) throw new Error('SHARE_PREVIEW_SECRET is missing or too short.');
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), body));
  return `${toB64url(body)}.${toB64url(sig)}`;
}

/**
 * The payload of a token whose signature checks out and which has not expired,
 * or null. Every failure is the same null: a caller learns nothing about WHY.
 * crypto.subtle.verify compares in constant time.
 */
export async function verifyShareToken(
  token: unknown,
  secret: unknown,
  nowMs: number,
): Promise<SharePayload | null> {
  if (typeof token !== 'string' || token.length > 2048 || !isUsableSecret(secret)) return null;
  const [bodyText, sigText, extra] = token.split('.');
  if (!bodyText || !sigText || extra !== undefined) return null;
  const body = fromB64url(bodyText);
  const sig = fromB64url(sigText);
  if (!body || !sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, body);
  } catch {
    return null;
  }
  if (!ok) return null;
  let payload: SharePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(body)) as SharePayload;
  } catch {
    return null;
  }
  if (
    !payload ||
    !isNonce(payload.n) ||
    !isDocId(payload.d) ||
    normaliseSharePath(payload.p) !== payload.p ||
    typeof payload.e !== 'number' ||
    payload.e * 1000 <= nowMs
  ) {
    return null;
  }
  return payload;
}

/**
 * Lock two: does the share record still allow this token? It must exist, not
 * be revoked, name the same document, and not have expired. An editor's
 * "Stop this link" sets `revoked`, which ends it on the next page load.
 */
export function recordAllows(
  record: ShareRecord | null | undefined,
  payload: SharePayload,
  nowMs: number,
): boolean {
  if (!record || record.revoked === true) return false;
  if (record.docId !== payload.d) return false;
  const exp = Date.parse(record.expiresAt ?? '');
  return Number.isFinite(exp) && exp > nowMs;
}

/**
 * What the Studio sends to have a link signed, checked against the record it
 * just wrote. Returns the payload to sign, or a plain-words reason.
 */
export function payloadFromRecord(
  nonce: unknown,
  record: (ShareRecord & { docId?: string }) | null | undefined,
  nowMs: number,
): { ok: true; payload: SharePayload } | { ok: false; error: string } {
  if (!isNonce(nonce)) return { ok: false, error: 'That request was not understood.' };
  if (!record) return { ok: false, error: 'The share record was not found. Try again.' };
  if (record.revoked) return { ok: false, error: 'That link was already stopped.' };
  if (!isDocId(record.docId)) return { ok: false, error: 'The share record names no page.' };
  const path = normaliseSharePath(record.path);
  if (!path) return { ok: false, error: 'This document has no page to preview.' };
  const exp = Date.parse(record.expiresAt ?? '');
  if (!Number.isFinite(exp) || exp <= nowMs || exp > nowMs + SHARE_MAX_MS) {
    return { ok: false, error: 'A link can last 1, 3, 7 or 14 days.' };
  }
  return { ok: true, payload: { n: nonce, d: record.docId, p: path, e: Math.floor(exp / 1000) } };
}

/** The full link for a signed token. */
export function shareUrl(origin: string, payload: SharePayload, token: string): string {
  return `${origin.replace(/\/+$/, '')}${payload.p}?${SHARE_PARAM}=${token}`;
}

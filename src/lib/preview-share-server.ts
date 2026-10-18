// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// preview-share-server - the Worker half of private preview links (card 117)
// =============================================================================
// Used by the /preview/** route (is this `?share=` link still good?) and by
// /api/studio/share-preview/ (sign a link for a record the Studio just wrote).
// The pure rules live in src/lib/preview-share.ts. Never import this from a
// prerendered page: it reads the Worker runtime env.
//
// FAILS CLOSED. No SHARE_PREVIEW_SECRET, no SANITY_TOKEN, a Sanity read that
// throws, a record that is gone: every one of them is "no access", and the
// preview route then renders the PUBLISHED page as it would for anyone.
// =============================================================================
import { env } from 'cloudflare:workers';
import { getPreviewClient } from '@/lib/cms-preview';
import {
  recordAllows,
  shareRecordId,
  verifyShareToken,
  type SharePayload,
  type ShareRecord,
} from '@/lib/preview-share';

interface ShareEnv {
  SHARE_PREVIEW_SECRET?: string;
  SANITY_TOKEN?: string;
}

export function shareSecret(): string | undefined {
  return (env as unknown as ShareEnv).SHARE_PREVIEW_SECRET;
}

export function shareConfigured(): boolean {
  const e = env as unknown as ShareEnv;
  return Boolean(e.SHARE_PREVIEW_SECRET && e.SHARE_PREVIEW_SECRET.length >= 32 && e.SANITY_TOKEN);
}

/**
 * Read a share record with the server token. The document endpoint, not a
 * query: it is consistent the instant the Studio's create returns, where the
 * query index can lag a moment behind.
 */
export async function readShareRecord(nonce: string): Promise<ShareRecord | null> {
  const client = getPreviewClient(false).withConfig({ perspective: 'raw', stega: false });
  const doc = await client.getDocument<ShareRecord & { _id: string }>(shareRecordId(nonce));
  if (!doc) return null;
  return { docId: doc.docId, path: doc.path, expiresAt: doc.expiresAt, revoked: doc.revoked };
}

/**
 * The payload of a `?share=` token that passes both locks, or null. `pathname`
 * is the request path: a link opens its own page only.
 */
export async function sharedPreviewAccess(
  token: string | null,
  pathname: string,
): Promise<SharePayload | null> {
  if (!token || !shareConfigured()) return null;
  const now = Date.now();
  const payload = await verifyShareToken(token, shareSecret(), now);
  if (!payload) return null;
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (path !== payload.p) return null;
  try {
    const record = await readShareRecord(payload.n);
    return recordAllows(record, payload, now) ? payload : null;
  } catch (err) {
    console.error(
      `preview-share: record read failed (${err instanceof Error ? err.message : 'error'})`,
    );
    return null;
  }
}

/** Draft-perspective fetch WITHOUT stega: a shared reader has no overlay, and
 *  invisible edit markers have no business in their copy of the page. */
export async function sharedPreviewFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return getPreviewClient(true).withConfig({ stega: false }).fetch<T>(query, params);
}

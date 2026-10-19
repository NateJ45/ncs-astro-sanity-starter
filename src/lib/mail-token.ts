// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-token - signed links for "confirm your subscription" and "unsubscribe"
// (the email backbone, PORTS.md card 121)
// =============================================================================
// A link in an email carries everything the Worker needs (which address, what
// for, until when) plus an HMAC-SHA256 signature made with the Worker secret
// MAIL_SECRET. Nothing is stored to make the link work, and nobody can make a
// valid link for somebody else's address without the secret.
//
//   token = base64url(JSON payload) + "." + base64url(HMAC(secret, that first part))
//
// Purposes are signed into the payload, so an unsubscribe link can never be
// replayed as a confirmation. A confirmation link expires (CONFIRM_TTL_DAYS);
// an unsubscribe link never does, because a reader may open a year-old issue.
//
// WebCrypto only (crypto.subtle), which the Worker and Node 22 both provide.
// =============================================================================

export type TokenPurpose = 'confirm' | 'unsub';

export interface TokenPayload {
  /** The email address, lower-cased. */
  e: string;
  /** What the link is for. */
  p: TokenPurpose;
  /** Expiry, epoch seconds. Absent = never. */
  x?: number;
}

export const CONFIRM_TTL_DAYS = 7;
/** A secret shorter than this is treated as not set (OPERATIONS.md says 32+). */
export const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

/** Constant-time comparison, so the check leaks nothing through timing. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function secretUsable(secret: string | undefined | null): secret is string {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

/** The payload, when the signature is good, the purpose matches and it has not expired. */
export async function verifyToken(
  secret: string,
  token: unknown,
  purpose: TokenPurpose,
  nowMs: number = Date.now(),
): Promise<TokenPayload | null> {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const given = unb64url(sig);
  if (!given || !sameBytes(given, await hmac(secret, body))) return null;
  const raw = unb64url(body);
  if (!raw) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload.e !== 'string' || payload.p !== purpose) return null;
  if (typeof payload.x === 'number' && payload.x * 1000 < nowMs) return null;
  return payload;
}

export function confirmToken(secret: string, email: string, nowMs: number = Date.now()) {
  return signToken(secret, {
    e: email,
    p: 'confirm',
    x: Math.floor(nowMs / 1000) + CONFIRM_TTL_DAYS * 86_400,
  });
}

export function unsubscribeToken(secret: string, email: string) {
  return signToken(secret, { e: email, p: 'unsub' });
}

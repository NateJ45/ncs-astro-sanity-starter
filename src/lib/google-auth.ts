// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Google service-account sign-in for the Worker (Studio kit, PORTS.md card 136)
// =============================================================================
// THE OPTIONAL FALLBACK. The studio's sites reach Google through studio-status
// (a service binding, src/lib/studio-google.ts), which holds the one service
// account, so they never use this file. It is kept, tested, for a site outside
// the studio's Cloudflare account, which sets GOOGLE_SERVICE_ACCOUNT itself.
//
// Home's Visitors card can read Google Analytics 4, and its Search Console card
// reads Google Search Console. Both APIs want an OAuth access token. A Worker
// cannot run Google's Node client, and the studio adds no dependency for this,
// so the token is fetched the way Google's own docs describe for "service
// accounts without a client library":
//
//   1. Build a JWT (RS256): header {alg: RS256, typ: JWT}, claims {iss: the
//      service account's client_email, scope, aud: the token URL, iat, exp}.
//   2. Sign it with the service account's private_key (PKCS #8 PEM) through
//      WebCrypto (importKey 'pkcs8', RSASSA-PKCS1-v1_5 with SHA-256).
//   3. POST it to https://oauth2.googleapis.com/token as a jwt-bearer grant.
//
// The token lasts an hour; GoogleTokens keeps it in memory (per Worker
// instance) until a minute before it runs out. NEVER log the key, the signed
// JWT or the token: errors carry the HTTP status and Google's error code only.
//
// The key is the whole JSON file Google gives you for a service account,
// stored as the Worker secret GOOGLE_SERVICE_ACCOUNT. Tested in
// src/lib/google-auth.test.ts with a throwaway key made in the test.
// =============================================================================

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Read-only reporting scopes: GA4's Data API and Search Console. Nothing that writes. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
] as const;

/** The two fields of the service-account JSON this file uses. */
export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * Something went wrong talking to Google. `status` is the HTTP status (0 for a
 * bad key that never left the Worker); `connect` is true when the fix is on
 * the set-up side (a refused key, a missing permission), so the card can say
 * "finish connecting Google" rather than "try again later".
 */
export class GoogleError extends Error {
  status: number;
  connect: boolean;
  constructor(message: string, status: number, connect: boolean) {
    super(message);
    this.name = 'GoogleError';
    this.status = status;
    this.connect = connect;
  }
}

/** The service-account JSON, or null when it is missing or not a service-account key. */
export function parseServiceAccount(raw: string | undefined | null): ServiceAccount | null {
  if (!raw || !raw.trim()) return null;
  try {
    const j = JSON.parse(raw) as Partial<ServiceAccount> & { type?: string };
    if (
      typeof j.client_email !== 'string' ||
      !/^[^@\s]+@[^@\s]+$/.test(j.client_email) ||
      typeof j.private_key !== 'string' ||
      !j.private_key.includes('PRIVATE KEY')
    ) {
      return null;
    }
    return { client_email: j.client_email, private_key: j.private_key };
  } catch {
    return null;
  }
}

/** base64url without padding, from bytes or a string (UTF-8). */
export function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The DER bytes inside a PKCS #8 PEM ("-----BEGIN PRIVATE KEY-----"). */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The unsigned claims for one token request. Times are whole seconds. */
export function jwtClaims(account: ServiceAccount, scopes: readonly string[], nowMs: number) {
  const iat = Math.floor(nowMs / 1000);
  return {
    iss: account.client_email,
    scope: scopes.join(' '),
    aud: GOOGLE_TOKEN_URL,
    iat,
    exp: iat + 3600,
  };
}

/** A signed RS256 JWT for the token exchange. Throws GoogleError (status 0) on a bad key. */
export async function signJwt(
  account: ServiceAccount,
  scopes: readonly string[],
  nowMs: number,
): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify(jwtClaims(account, scopes, nowMs)));
  const input = `${header}.${claims}`;
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(account.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    throw new GoogleError('The service-account private key could not be read.', 0, true);
  }
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return `${input}.${base64url(new Uint8Array(sig))}`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Refresh this long before Google's expiry, so a token never dies mid-request. */
const EARLY_MS = 60 * 1000;

/**
 * Access tokens, cached in memory until shortly before they expire. One per
 * service account and scope set. Create one at module scope in a route so the
 * cache lives as long as the Worker instance.
 */
export class GoogleTokens {
  private cache = new Map<string, { token: string; until: number }>();

  async get(
    account: ServiceAccount,
    scopes: readonly string[] = GOOGLE_SCOPES,
    fetchImpl: FetchLike = fetch,
    now: () => number = Date.now,
  ): Promise<string> {
    const key = `${account.client_email}|${scopes.join(' ')}`;
    const hit = this.cache.get(key);
    if (hit && now() < hit.until) return hit.token;

    const assertion = await signJwt(account, scopes, now());
    const res = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });
    const j = (await res.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    } | null;
    if (!res.ok || !j?.access_token) {
      // 400 invalid_grant / 401 invalid_client: the key is wrong, revoked or
      // disabled. That is a set-up problem, not a passing one.
      const code = typeof j?.error === 'string' ? j.error.replace(/[^\w.-]/g, '') : 'no token';
      throw new GoogleError(
        `Google refused the service account (${res.status} ${code}).`,
        res.status,
        res.status >= 400 && res.status < 500,
      );
    }
    const life = typeof j.expires_in === 'number' && j.expires_in > 0 ? j.expires_in : 3600;
    this.cache.set(key, { token: j.access_token, until: now() + life * 1000 - EARLY_MS });
    return j.access_token;
  }

  /** Forget every token (a 401 from an API means the cached one is no good). */
  clear() {
    this.cache.clear();
  }
}

/** The Worker's one token cache, shared by /api/studio/visitors/ and /api/studio/search/. */
export const workerTokens = new GoogleTokens();

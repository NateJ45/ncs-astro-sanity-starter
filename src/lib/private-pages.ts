// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// private-pages - pages only people with the password can see (PORTS.md card 122)
// =============================================================================
// The pure half: the password hash, the signed access cookie, the rate limit
// and the names everything else agrees on. No imports, so the bare-Node tests
// (src/lib/private-pages.test.ts) cover all of it. The Worker half is
// src/lib/private-pages-server.ts and the route src/pages/private/[slug].astro.
//
// WHY A SEPARATE DOCUMENT TYPE UNDER AN ID PATH (the safety argument, in full
// in docs/agent/private-pages.md):
//
//   1. The dataset is PUBLIC. Anything in an ordinary document can be read by
//      anyone with the project id, over the plain query API, no login needed.
//      A "password" switch on an ordinary page would lock the HTML and leave
//      the words one query away. So a private page is a `privatePage` document
//      whose id starts `privatePage.`: Sanity serves documents under an id path
//      to signed-in requests only (the same rule that keeps drafts and the
//      card 117 share records private). The page, its words AND its password
//      hash are invisible to the public API.
//   2. It is never built into the static site. The build reads with a token
//      when one is set, but no build query names `privatePage`, and the route
//      that shows one is server-rendered (`prerender = false`), so there is no
//      HTML for it in the public assets to fetch.
//   3. The password is never stored. The Studio hashes it in the editor's
//      browser (PBKDF2-SHA256, a random salt) and saves only the hash. The
//      Worker hashes what a visitor types the same way and compares in
//      constant time.
//   4. A right password earns a cookie signed with HMAC-SHA256 and the Worker
//      secret PRIVATE_PAGE_SECRET, scoped to that one page's path, HttpOnly,
//      Secure, SameSite=Lax, for COOKIE_DAYS. It carries the password's salt
//      prefix, so setting a new password locks out every old cookie at once.
//   5. Wrong guesses are rate limited per visitor and page, every response is
//      noindex and no-store, and every failure fails CLOSED (no secret, no
//      token, a read that throws: the form, never the page).
//
// What it does NOT protect: pictures. Image files live on Sanity's public CDN
// and the public API lists every image asset, so a determined person could
// find a private page's pictures. The Studio and the Site Guide say so.
// =============================================================================

/** The document type and its id path. */
export const PRIVATE_TYPE = 'privatePage';
export const PRIVATE_ID_PREFIX = `${PRIVATE_TYPE}.`;

/** Where private pages live on the site: /private/<slug>/. */
export const PRIVATE_BASE = '/private';
export const privatePath = (slug: string): string => `${PRIVATE_BASE}/${slug}/`;

/** The id a private page is stored under. Idempotent. */
export function privateDocId(id: string): string {
  const bare = id.startsWith('drafts.') ? id.slice('drafts.'.length) : id;
  return bare.startsWith(PRIVATE_ID_PREFIX) ? bare : `${PRIVATE_ID_PREFIX}${bare}`;
}

/** A page address we are willing to look up: what page.ts allows, nothing else. */
export function isPrivateSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]{1,96}$/.test(value);
}

// ---------------------------------------------------------------------------
// The password
// ---------------------------------------------------------------------------

/** The shortest password the Studio accepts. */
export const MIN_PASSWORD_LENGTH = 8;
/** The longest a visitor may type (bounds the hashing work per request). */
export const MAX_PASSWORD_LENGTH = 200;

/**
 * PBKDF2 rounds. Modest on purpose: the hash is not public (point 1 above), so
 * this is the second lock, not the first, and the Worker has to hash every
 * guess inside a small CPU budget. The count is stored with each hash, so it
 * can be raised later without breaking old passwords.
 */
export const PBKDF2_ITERATIONS = 20_000;
/** The most rounds the Worker will run for one guess (refuses a doctored record). */
export const MAX_ITERATIONS = 200_000;

/** What the Studio stores. Never the password itself. */
export interface PasswordRecord {
  alg: 'pbkdf2-sha256';
  iterations: number;
  /** base64url, 16 random bytes */
  salt: string;
  /** base64url, 32 bytes */
  hash: string;
  /** When it was set (ISO), for the Studio's "Password set on ..." line. */
  setAt?: string;
}

/** The plain-words problem with a new password, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || !password.trim()) return 'Type a password.';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easiest to remember.`;
  if (password.length > MAX_PASSWORD_LENGTH) return 'That is too long. Use a shorter phrase.';
  return null;
}

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> | null {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hash a new password (Studio side). `salt` is for tests only. */
export async function hashPassword(
  password: string,
  opts: { iterations?: number; salt?: Uint8Array<ArrayBuffer>; now?: Date } = {},
): Promise<PasswordRecord> {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const iterations = opts.iterations ?? PBKDF2_ITERATIONS;
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return {
    alg: 'pbkdf2-sha256',
    iterations,
    salt: toB64url(salt),
    hash: toB64url(hash),
    setAt: (opts.now ?? new Date()).toISOString(),
  };
}

/** A stored record we are willing to check a guess against. */
export function isPasswordRecord(value: unknown): value is PasswordRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    r.alg === 'pbkdf2-sha256' &&
    typeof r.iterations === 'number' &&
    Number.isInteger(r.iterations) &&
    r.iterations >= 1000 &&
    r.iterations <= MAX_ITERATIONS &&
    typeof r.salt === 'string' &&
    (fromB64url(r.salt)?.length ?? 0) >= 16 &&
    typeof r.hash === 'string' &&
    fromB64url(r.hash)?.length === 32
  );
}

/** Same length, every byte compared: no early exit to time. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Does this guess match the stored record? Any doubt is false. */
export async function verifyPassword(guess: unknown, record: unknown): Promise<boolean> {
  if (typeof guess !== 'string' || !guess || guess.length > MAX_PASSWORD_LENGTH) return false;
  if (!isPasswordRecord(record)) return false;
  const salt = fromB64url(record.salt);
  const want = fromB64url(record.hash);
  if (!salt || !want) return false;
  try {
    return constantTimeEqual(await pbkdf2(guess, salt, record.iterations), want);
  } catch {
    return false;
  }
}

/**
 * The cookie's "which password" mark: the first 8 characters of the salt.
 * Every new password gets a new salt, so a new password ends old cookies.
 * The salt is not a secret; the person holding the cookie knew the password.
 */
export const passwordVersion = (record: PasswordRecord): string => record.salt.slice(0, 8);

// ---------------------------------------------------------------------------
// The access cookie
// ---------------------------------------------------------------------------

/** How long a right password lets someone back in without typing it again. */
export const COOKIE_DAYS = 14;

/** One cookie per page, so a password opens only its own page. */
export const cookieName = (slug: string): string => `ncs_private_${slug.replace(/-/g, '_')}`;

export interface AccessPayload {
  /** the page's slug */
  s: string;
  /** the password version (passwordVersion) */
  v: string;
  /** expiry, Unix seconds */
  e: number;
}

/** A secret long enough to sign with. Short or missing means "not set up". */
export function isUsableSecret(secret: unknown): secret is string {
  return typeof secret === 'string' && secret.length >= 32;
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

/** Sign the cookie for one page and password, good for COOKIE_DAYS. */
export async function signAccessCookie(
  slug: string,
  record: PasswordRecord,
  secret: string,
  nowMs: number,
): Promise<{ value: string; maxAge: number }> {
  if (!isUsableSecret(secret)) throw new Error('PRIVATE_PAGE_SECRET is missing or too short.');
  const maxAge = COOKIE_DAYS * 24 * 3600;
  const payload: AccessPayload = {
    s: slug,
    v: passwordVersion(record),
    e: Math.floor(nowMs / 1000) + maxAge,
  };
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), body));
  return { value: `${toB64url(body)}.${toB64url(sig)}`, maxAge };
}

/**
 * Does this cookie open this page with its current password? Every failure is
 * the same false. crypto.subtle.verify compares in constant time.
 */
export async function verifyAccessCookie(
  value: unknown,
  slug: string,
  record: unknown,
  secret: unknown,
  nowMs: number,
): Promise<boolean> {
  if (typeof value !== 'string' || value.length > 1024 || !isUsableSecret(secret)) return false;
  if (!isPasswordRecord(record)) return false;
  const [bodyText, sigText, extra] = value.split('.');
  if (!bodyText || !sigText || extra !== undefined) return false;
  const body = fromB64url(bodyText);
  const sig = fromB64url(sigText);
  if (!body || !sig) return false;
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, body))) return false;
    const p = JSON.parse(new TextDecoder().decode(body)) as AccessPayload;
    return (
      p?.s === slug &&
      p.v === passwordVersion(record) &&
      typeof p.e === 'number' &&
      p.e * 1000 > nowMs
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The rate limit
// ---------------------------------------------------------------------------

/** Wrong guesses allowed per visitor and page in one window. */
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/**
 * Wrong-guess counter, kept in the Worker isolate's memory. Best effort by
 * design: a busy site runs several isolates, each with its own count, and a
 * restart forgets. It still turns "try a dictionary" into "try five words
 * every quarter hour per isolate", and every guess costs a full hash. For a
 * hard global limit add a Cloudflare rate limiting rule on POST /private/*
 * (docs/agent/private-pages.md). Bounded, so a flood cannot grow it forever.
 */
export class FailureLimiter {
  private hits = new Map<string, number[]>();
  private max: number;
  private windowMs: number;
  private cap: number;
  // Plain assignments, not parameter properties: node's strip-types test run
  // does not support those.
  constructor(max = MAX_FAILURES, windowMs = WINDOW_MS, cap = 5000) {
    this.max = max;
    this.windowMs = windowMs;
    this.cap = cap;
  }

  private recent(key: string, nowMs: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => nowMs - t < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  /** May this visitor try again now? */
  allowed(key: string, nowMs: number): boolean {
    return this.recent(key, nowMs).length < this.max;
  }

  /** Seconds until the oldest counted failure falls out of the window. */
  retryAfter(key: string, nowMs: number): number {
    const list = this.recent(key, nowMs);
    if (list.length < this.max) return 0;
    return Math.max(1, Math.ceil((list[0] + this.windowMs - nowMs) / 1000));
  }

  fail(key: string, nowMs: number): void {
    if (this.hits.size >= this.cap && !this.hits.has(key)) {
      // Drop the oldest key rather than grow without bound.
      const first = this.hits.keys().next().value;
      if (first !== undefined) this.hits.delete(first);
    }
    const list = this.recent(key, nowMs);
    list.push(nowMs);
    this.hits.set(key, list);
  }

  /** A right password clears the count. */
  clear(key: string): void {
    this.hits.delete(key);
  }
}

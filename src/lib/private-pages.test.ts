// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Private pages (src/lib/private-pages.ts, card 122): hashing, the signed cookie
// and its expiry, the rate limit, and the names the route and Studio share.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  constantTimeEqual,
  cookieName,
  COOKIE_DAYS,
  FailureLimiter,
  hashPassword,
  isPasswordRecord,
  isPrivateSlug,
  MAX_FAILURES,
  passwordProblem,
  passwordVersion,
  privateDocId,
  privatePath,
  signAccessCookie,
  verifyAccessCookie,
  verifyPassword,
  WINDOW_MS,
  type PasswordRecord,
} from './private-pages.ts';

const SECRET = 'a-test-secret-that-is-long-enough-123456';
const NOW = Date.parse('2026-10-18T12:00:00Z');
const DAY = 24 * 3600 * 1000;
const SALT = new Uint8Array(16).fill(7);
// Few rounds keep the suite fast; the count is part of the record.
const fast = (pw: string, salt = SALT) => hashPassword(pw, { iterations: 1000, salt });

describe('names', () => {
  it('stores a private page under the privatePage. id path, once', () => {
    assert.equal(privateDocId('abc'), 'privatePage.abc');
    assert.equal(privateDocId('privatePage.abc'), 'privatePage.abc');
    assert.equal(privateDocId('drafts.privatePage.abc'), 'privatePage.abc');
  });
  it('serves at /private/<slug>/ and accepts only plain slugs', () => {
    assert.equal(privatePath('members'), '/private/members/');
    assert.ok(isPrivateSlug('youth-trip-2026'));
    for (const bad of ['', 'Has Caps', '../x', 'a/b', 'x'.repeat(97), 42]) {
      assert.equal(isPrivateSlug(bad), false, String(bad));
    }
  });
  it('gives each page its own cookie', () => {
    assert.equal(cookieName('youth-trip'), 'ncs_private_youth_trip');
    assert.notEqual(cookieName('a'), cookieName('b'));
  });
});

describe('passwords', () => {
  it('asks for at least eight characters', () => {
    assert.match(passwordProblem('short') ?? '', /at least 8/);
    assert.match(passwordProblem('   ') ?? '', /Type a password/);
    assert.equal(passwordProblem('green pastures'), null);
  });

  it('stores a hash and salt, never the password', async () => {
    const r = await fast('green pastures');
    assert.ok(isPasswordRecord(r));
    assert.equal(r.alg, 'pbkdf2-sha256');
    assert.ok(!JSON.stringify(r).includes('green'));
  });

  it('accepts the right password and refuses the rest', async () => {
    const r = await fast('green pastures');
    assert.equal(await verifyPassword('green pastures', r), true);
    assert.equal(await verifyPassword('green pasture', r), false);
    assert.equal(await verifyPassword('Green pastures', r), false);
    assert.equal(await verifyPassword('', r), false);
    assert.equal(await verifyPassword(undefined, r), false);
    assert.equal(await verifyPassword('x'.repeat(201), r), false);
  });

  it('salts: the same password hashes differently with a different salt', async () => {
    const a = await fast('green pastures');
    const b = await fast('green pastures', new Uint8Array(16).fill(9));
    assert.notEqual(a.hash, b.hash);
    assert.notEqual(passwordVersion(a), passwordVersion(b));
  });

  it('a fresh hash uses a random salt and the default rounds', async () => {
    const a = await hashPassword('green pastures');
    const b = await hashPassword('green pastures');
    assert.notEqual(a.salt, b.salt);
    assert.equal(a.iterations, 20_000);
  });

  it('refuses a doctored or broken record', async () => {
    const r = await fast('green pastures');
    const bad: unknown[] = [
      null,
      {},
      { ...r, alg: 'md5' },
      { ...r, iterations: 10 },
      { ...r, iterations: 10_000_000 },
      { ...r, hash: 'short' },
      { ...r, salt: '' },
    ];
    for (const rec of bad) assert.equal(await verifyPassword('green pastures', rec), false);
  });

  it('constantTimeEqual compares every byte', () => {
    assert.ok(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])));
    assert.ok(!constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3])));
    assert.ok(!constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 2])));
  });
});

describe('the access cookie', () => {
  let record: PasswordRecord;
  const ready = async () => (record ??= await fast('green pastures'));

  it('a signed cookie opens its own page', async () => {
    const r = await ready();
    const { value, maxAge } = await signAccessCookie('members', r, SECRET, NOW);
    assert.equal(maxAge, COOKIE_DAYS * 24 * 3600);
    assert.equal(await verifyAccessCookie(value, 'members', r, SECRET, NOW), true);
  });

  it('does not open another page', async () => {
    const r = await ready();
    const { value } = await signAccessCookie('members', r, SECRET, NOW);
    assert.equal(await verifyAccessCookie(value, 'elders', r, SECRET, NOW), false);
  });

  it('expires after COOKIE_DAYS', async () => {
    const r = await ready();
    const { value } = await signAccessCookie('members', r, SECRET, NOW);
    const later = NOW + COOKIE_DAYS * DAY + 1000;
    assert.equal(await verifyAccessCookie(value, 'members', r, SECRET, later - 2000), true);
    assert.equal(await verifyAccessCookie(value, 'members', r, SECRET, later), false);
  });

  it('a new password ends every old cookie', async () => {
    const r = await ready();
    const { value } = await signAccessCookie('members', r, SECRET, NOW);
    const changed = await fast('still waters', new Uint8Array(16).fill(3));
    assert.equal(await verifyAccessCookie(value, 'members', changed, SECRET, NOW), false);
  });

  it('refuses a forged, altered or wrong-secret cookie', async () => {
    const r = await ready();
    const { value } = await signAccessCookie('members', r, SECRET, NOW);
    const [body, sig] = value.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ s: 'members', v: passwordVersion(r), e: 9999999999 }),
    ).toString('base64url');
    for (const v of [
      `${forgedBody}.${sig}`,
      `${body}.${sig.slice(0, -2)}AA`,
      `${body}`,
      `${body}.${sig}.x`,
      '',
      'x'.repeat(2000),
      undefined,
    ]) {
      assert.equal(await verifyAccessCookie(v, 'members', r, SECRET, NOW), false, String(v));
    }
    assert.equal(
      await verifyAccessCookie(value, 'members', r, 'another-secret-that-is-long-enough-xx', NOW),
      false,
    );
  });

  it('fails closed with no usable secret', async () => {
    const r = await ready();
    await assert.rejects(() => signAccessCookie('members', r, 'short', NOW));
    const { value } = await signAccessCookie('members', r, SECRET, NOW);
    assert.equal(await verifyAccessCookie(value, 'members', r, undefined, NOW), false);
    assert.equal(await verifyAccessCookie(value, 'members', r, 'short', NOW), false);
  });
});

describe('FailureLimiter', () => {
  it(`allows ${MAX_FAILURES} wrong guesses, then waits out the window`, () => {
    const lim = new FailureLimiter();
    for (let i = 0; i < MAX_FAILURES; i++) {
      assert.ok(lim.allowed('ip|members', NOW + i));
      lim.fail('ip|members', NOW + i);
    }
    assert.equal(lim.allowed('ip|members', NOW + 10), false);
    assert.ok(lim.retryAfter('ip|members', NOW + 10) > 0);
    // Another visitor, or another page, is not affected.
    assert.ok(lim.allowed('other|members', NOW + 10));
    assert.ok(lim.allowed('ip|elders', NOW + 10));
    // After the window the old failures drop off.
    assert.ok(lim.allowed('ip|members', NOW + WINDOW_MS + 10));
  });

  it('a right password clears the count', () => {
    const lim = new FailureLimiter(2);
    lim.fail('k', NOW);
    lim.fail('k', NOW);
    assert.equal(lim.allowed('k', NOW), false);
    lim.clear('k');
    assert.ok(lim.allowed('k', NOW));
  });

  it('stays bounded under a flood of new visitors', () => {
    const lim = new FailureLimiter(5, WINDOW_MS, 10);
    for (let i = 0; i < 100; i++) lim.fail(`k${i}`, NOW);
    // The newest keys are kept; the map never grew past its cap.
    assert.equal(lim.allowed('k99', NOW), true);
    assert.equal((lim as unknown as { hits: Map<string, number[]> }).hits.size <= 10, true);
  });
});

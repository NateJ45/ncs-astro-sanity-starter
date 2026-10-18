// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Private preview links (src/lib/preview-share.ts, card 114): signing, expiry, scope
// and the share-record rules.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  expiryFor,
  isDocId,
  isNonce,
  normaliseSharePath,
  payloadFromRecord,
  recordAllows,
  SHARE_DAYS,
  shareRecordId,
  shareUrl,
  signShareToken,
  verifyShareToken,
  type SharePayload,
} from './preview-share.ts';

const SECRET = 'a-test-secret-that-is-long-enough-123456';
const NOW = Date.parse('2026-10-18T12:00:00Z');
const DAY = 24 * 3600 * 1000;
const NONCE = '0f8c6a1e-2b7d-4c1a-9e35-6d2f1b0a7c44';

const payload = (over: Partial<SharePayload> = {}): SharePayload => ({
  n: NONCE,
  d: 'aboutPage',
  p: '/preview/about/',
  e: Math.floor((NOW + 3 * DAY) / 1000),
  ...over,
});

describe('signShareToken / verifyShareToken', () => {
  it('a signed token verifies and carries its payload', async () => {
    const t = await signShareToken(payload(), SECRET);
    assert.match(t, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.deepEqual(await verifyShareToken(t, SECRET, NOW), payload());
  });

  it('expires: refused once the expiry has passed', async () => {
    const t = await signShareToken(payload(), SECRET);
    assert.equal(await verifyShareToken(t, SECRET, NOW + 3 * DAY + 1000), null);
  });

  it('a different secret, a tampered payload or a swapped signature all fail', async () => {
    const t = await signShareToken(payload(), SECRET);
    assert.equal(await verifyShareToken(t, `${SECRET}x`, NOW), null);

    // Push the expiry out by re-encoding the payload but keeping the old signature.
    const [, sig] = t.split('.');
    const longer = Buffer.from(JSON.stringify(payload({ e: payload().e + 30 * 86400 }))).toString(
      'base64url',
    );
    assert.equal(await verifyShareToken(`${longer}.${sig}`, SECRET, NOW), null);

    // Point it at another page.
    const other = Buffer.from(JSON.stringify(payload({ d: 'homePage', p: '/preview/' }))).toString(
      'base64url',
    );
    assert.equal(await verifyShareToken(`${other}.${sig}`, SECRET, NOW), null);
  });

  it('junk, extra segments, no secret and a short secret fail closed', async () => {
    const t = await signShareToken(payload(), SECRET);
    for (const bad of ['', 'x', 'a.b', `${t}.x`, 'a b.c', 42, null]) {
      assert.equal(await verifyShareToken(bad, SECRET, NOW), null);
    }
    assert.equal(await verifyShareToken(t, undefined, NOW), null);
    assert.equal(await verifyShareToken(t, 'short', NOW), null);
    await assert.rejects(() => signShareToken(payload(), 'short'));
  });

  it('a signed payload with a bad shape is still refused', async () => {
    for (const bad of [
      payload({ n: 'short' }),
      payload({ d: 'drafts.aboutPage' }),
      payload({ p: '/about/' }),
      payload({ p: '/preview/../studio/' }),
    ]) {
      assert.equal(await verifyShareToken(await signShareToken(bad, SECRET), SECRET, NOW), null);
    }
  });
});

describe('recordAllows (lock two: revoke and scope)', () => {
  const rec = { docId: 'aboutPage', expiresAt: new Date(NOW + 3 * DAY).toISOString() };
  it('a live record for the same document allows it', () => {
    assert.equal(recordAllows(rec, payload(), NOW), true);
  });
  it('revoked, missing, another document or expired all refuse', () => {
    assert.equal(recordAllows({ ...rec, revoked: true }, payload(), NOW), false);
    assert.equal(recordAllows(null, payload(), NOW), false);
    assert.equal(recordAllows({ ...rec, docId: 'homePage' }, payload(), NOW), false);
    assert.equal(recordAllows(rec, payload(), NOW + 4 * DAY), false);
    assert.equal(recordAllows({ docId: 'aboutPage' }, payload(), NOW), false);
  });
});

describe('payloadFromRecord (what the route agrees to sign)', () => {
  const rec = (days: number, over = {}) => ({
    docId: 'aboutPage',
    path: '/preview/about',
    expiresAt: new Date(NOW + days * DAY).toISOString(),
    ...over,
  });
  it('signs 1 to 14 days, normalising the path', () => {
    const r = payloadFromRecord(NONCE, rec(14), NOW);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.payload.p, '/preview/about/');
  });
  it('refuses longer than 14 days, the past, revoked, no record, bad nonce, bad path', () => {
    assert.equal(payloadFromRecord(NONCE, rec(30), NOW).ok, false);
    assert.equal(payloadFromRecord(NONCE, rec(-1), NOW).ok, false);
    assert.equal(payloadFromRecord(NONCE, rec(3, { revoked: true }), NOW).ok, false);
    assert.equal(payloadFromRecord(NONCE, null, NOW).ok, false);
    assert.equal(payloadFromRecord('x', rec(3), NOW).ok, false);
    assert.equal(payloadFromRecord(NONCE, rec(3, { path: '/studio' }), NOW).ok, false);
    assert.equal(payloadFromRecord(NONCE, rec(3, { docId: 'drafts.x' }), NOW).ok, false);
  });
});

describe('small helpers', () => {
  it('lifetimes on offer only', () => {
    assert.deepEqual([...SHARE_DAYS], [1, 3, 7, 14]);
    assert.equal(expiryFor(7, NOW), NOW + 7 * DAY);
    assert.equal(expiryFor(5, NOW), null);
    assert.equal(expiryFor('7', NOW), null);
  });
  it('ids, paths and the link', () => {
    assert.equal(isNonce(NONCE), true);
    assert.equal(isNonce('abc'), false);
    assert.equal(isDocId('page-123'), true);
    assert.equal(isDocId('versions.r.x'), false);
    assert.equal(normaliseSharePath('/preview'), '/preview/');
    assert.equal(normaliseSharePath('/preview/about'), '/preview/about/');
    assert.equal(normaliseSharePath('/about'), null);
    assert.equal(shareRecordId(NONCE), `previewShare.${NONCE}`);
    assert.equal(
      shareUrl('https://a.org/', payload(), 'T.S'),
      'https://a.org/preview/about/?share=T.S',
    );
  });
});

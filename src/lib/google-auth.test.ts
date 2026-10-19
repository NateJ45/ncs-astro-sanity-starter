// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 136: Google service-account sign-in (src/lib/google-auth.ts).
// The key is a throwaway made here with WebCrypto; nothing calls Google.

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  base64url,
  GOOGLE_SCOPES,
  GOOGLE_TOKEN_URL,
  GoogleError,
  GoogleTokens,
  jwtClaims,
  parseServiceAccount,
  signJwt,
  type ServiceAccount,
} from './google-auth.ts';

const NOW = Date.parse('2026-10-19T12:00:00Z');

/** A throwaway RSA key pair, the private half as the PEM a service-account JSON carries. */
let account: ServiceAccount;
let publicKey: CryptoKey;

before(async () => {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der));
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
  account = { client_email: 'studio@test-project.iam.gserviceaccount.com', private_key: pem };
});

const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

describe('service-account JSON', () => {
  it('reads client_email and private_key from the whole key file', () => {
    const raw = JSON.stringify({
      type: 'service_account',
      project_id: 'x',
      client_email: 'a@b.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
    });
    assert.deepEqual(parseServiceAccount(raw), {
      client_email: 'a@b.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
    });
  });

  it('refuses anything that is not a service-account key', () => {
    assert.equal(parseServiceAccount(undefined), null);
    assert.equal(parseServiceAccount(''), null);
    assert.equal(parseServiceAccount('not json'), null);
    assert.equal(parseServiceAccount('{"client_email":"a@b"}'), null);
    assert.equal(parseServiceAccount('{"client_email":"nope","private_key":"PRIVATE KEY"}'), null);
  });
});

describe('the JWT', () => {
  it('base64url has no padding or + and /', () => {
    assert.equal(base64url('??>'), 'Pz8-');
    assert.equal(base64url(new Uint8Array([251, 255])), '-_8');
  });

  it('claims the read-only scopes for an hour, aimed at the token URL', () => {
    const c = jwtClaims(account, GOOGLE_SCOPES, NOW);
    assert.equal(c.iss, account.client_email);
    assert.equal(c.aud, GOOGLE_TOKEN_URL);
    assert.equal(c.iat, NOW / 1000);
    assert.equal(c.exp, NOW / 1000 + 3600);
    assert.equal(
      c.scope,
      'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
    );
  });

  it('is RS256-signed with the private key and verifies with the public half', async () => {
    const jwt = await signJwt(account, GOOGLE_SCOPES, NOW);
    const [h, c, sig] = jwt.split('.');
    assert.deepEqual(JSON.parse(new TextDecoder().decode(fromB64url(h))), {
      alg: 'RS256',
      typ: 'JWT',
    });
    assert.equal(JSON.parse(new TextDecoder().decode(fromB64url(c))).iss, account.client_email);
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      fromB64url(sig),
      new TextEncoder().encode(`${h}.${c}`),
    );
    assert.equal(ok, true);
  });

  it('accepts a key whose newlines arrived escaped (\\n), as pasted secrets sometimes do', async () => {
    const escaped = { ...account, private_key: account.private_key.replace(/\n/g, '\\n') };
    const jwt = await signJwt(escaped, GOOGLE_SCOPES, NOW);
    assert.equal(jwt.split('.').length, 3);
  });

  it('a broken key is a set-up problem (GoogleError, connect)', async () => {
    const bad = {
      ...account,
      private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----',
    };
    await assert.rejects(signJwt(bad, GOOGLE_SCOPES, NOW), (e: unknown) => {
      assert.ok(e instanceof GoogleError);
      assert.equal(e.connect, true);
      assert.ok(!e.message.includes('AAAA'));
      return true;
    });
  });
});

describe('the token cache', () => {
  /** A fake token endpoint that counts its calls. */
  function tokenEndpoint(answer: { status: number; body: unknown }) {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      calls.push({ url, body: String(init?.body ?? '') });
      return new Response(JSON.stringify(answer.body), { status: answer.status });
    };
    return { calls, fetchImpl };
  }

  it('exchanges a jwt-bearer grant and reuses the token until a minute before it expires', async () => {
    const tokens = new GoogleTokens();
    const { calls, fetchImpl } = tokenEndpoint({
      status: 200,
      body: { access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' },
    });
    let t = NOW;
    const clock = () => t;
    assert.equal(await tokens.get(account, GOOGLE_SCOPES, fetchImpl, clock), 'tok-1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, GOOGLE_TOKEN_URL);
    const form = new URLSearchParams(calls[0].body);
    assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    assert.equal(form.get('assertion')?.split('.').length, 3);

    t = NOW + 58 * 60 * 1000; // 58 minutes on: still cached
    await tokens.get(account, GOOGLE_SCOPES, fetchImpl, clock);
    assert.equal(calls.length, 1);

    t = NOW + 59.5 * 60 * 1000; // inside the last minute: fetched again
    await tokens.get(account, GOOGLE_SCOPES, fetchImpl, clock);
    assert.equal(calls.length, 2);

    tokens.clear();
    await tokens.get(account, GOOGLE_SCOPES, fetchImpl, clock);
    assert.equal(calls.length, 3);
  });

  it('a refused key (400 invalid_grant) is a set-up problem, and the message holds no secret', async () => {
    const tokens = new GoogleTokens();
    const { fetchImpl } = tokenEndpoint({
      status: 400,
      body: { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' },
    });
    await assert.rejects(
      tokens.get(account, GOOGLE_SCOPES, fetchImpl, () => NOW),
      (e: unknown) => {
        assert.ok(e instanceof GoogleError);
        assert.equal(e.connect, true);
        assert.equal(e.status, 400);
        assert.match(e.message, /invalid_grant/);
        assert.ok(!e.message.includes('PRIVATE'));
        return true;
      },
    );
  });

  it('Google being down (503) is a passing failure, not a set-up one', async () => {
    const tokens = new GoogleTokens();
    const { fetchImpl } = tokenEndpoint({ status: 503, body: {} });
    await assert.rejects(
      tokens.get(account, GOOGLE_SCOPES, fetchImpl, () => NOW),
      (e: unknown) => {
        assert.ok(e instanceof GoogleError);
        assert.equal(e.connect, false);
        return true;
      },
    );
  });
});

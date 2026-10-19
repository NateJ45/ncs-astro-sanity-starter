// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The email backbone's sender, signed links and template (PORTS.md card 127):
// provider choice, both wire formats, opt-in signing, and the CAN-SPAM footer.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareMailer, normalizeEmail, pickMailer, resendMailer } from './mail-send.ts';
import { confirmToken, signToken, unsubscribeToken, verifyToken } from './mail-token.ts';
import { brandFromConfig, emailFontStack, renderEmail } from './mail-template.ts';

const SECRET = 'x'.repeat(40);

describe('pickMailer', () => {
  const binding = { send: async () => ({}) };
  it('is "not set up" with nothing configured, and says why', () => {
    const c = pickMailer({}, 'Site');
    assert.equal(c.mailer, null);
    assert.match(c.reason ?? '', /sending address/);
    assert.match(pickMailer({ MAIL_FROM: 'a@b.org' }, 'Site').reason ?? '', /no email provider/);
  });
  it('prefers Cloudflare when both are set and MAIL_PROVIDER is unset', () => {
    const c = pickMailer({ MAIL_FROM: 'a@b.org', EMAIL: binding, RESEND_API_KEY: 'k' }, 'Site');
    assert.equal(c.mailer?.provider, 'cloudflare');
  });
  it('honours MAIL_PROVIDER, and refuses a provider that is not configured', () => {
    const both = { MAIL_FROM: 'a@b.org', EMAIL: binding, RESEND_API_KEY: 'k' };
    assert.equal(pickMailer({ ...both, MAIL_PROVIDER: 'resend' }, 'S').mailer?.provider, 'resend');
    assert.equal(pickMailer({ MAIL_FROM: 'a@b.org', MAIL_PROVIDER: 'resend' }, 'S').mailer, null);
    assert.equal(pickMailer({ ...both, MAIL_PROVIDER: 'mailgun' }, 'S').mailer, null);
  });
  it('falls back to CONTACT_FROM for the address', () => {
    assert.equal(
      pickMailer({ CONTACT_FROM: 'c@b.org', EMAIL: binding }, 'S').mailer?.from,
      'c@b.org',
    );
  });
});

describe('cloudflareMailer', () => {
  it('sends the contact form shape, with Reply-To as a header', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const m = cloudflareMailer({ send: async (msg) => void sent.push(msg) }, 'from@b.org', 'Site');
    const r = await m.send({
      to: 't@b.org',
      subject: 'S',
      text: 'T',
      html: '<p>T</p>',
      replyTo: 'v@x.org',
    });
    assert.equal(r.ok, true);
    assert.deepEqual(sent[0].from, { email: 'from@b.org', name: 'Site' });
    assert.deepEqual(sent[0].headers, [{ key: 'Reply-To', value: 'v@x.org' }]);
  });
  it('retries WITHOUT headers when the binding refuses them', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const m = cloudflareMailer(
      {
        send: async (msg) => {
          if (msg.headers) throw new Error('headers not allowed');
          sent.push(msg);
        },
      },
      'f@b.org',
      'S',
    );
    const r = await m.send({
      to: 't@b.org',
      subject: 'S',
      text: 'T',
      headers: { 'List-Unsubscribe': '<x>' },
    });
    assert.equal(r.ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].headers, undefined);
  });
  it('reports the error when both tries fail', async () => {
    const m = cloudflareMailer(
      { send: async () => Promise.reject(new Error('nope')) },
      'f@b.org',
      'S',
    );
    assert.deepEqual(await m.send({ to: 't@b.org', subject: 'S', text: 'T' }), {
      ok: false,
      error: 'nope',
    });
  });
});

describe('resendMailer', () => {
  it('posts one message with reply_to and headers', async () => {
    const calls: Array<{ url: string; body: unknown; auth: string }> = [];
    const fake = async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        body: JSON.parse(String(init?.body)),
        auth: (init?.headers as Record<string, string>).Authorization,
      });
      return new Response('{}', { status: 200 });
    };
    const m = resendMailer('re_key', 'news@b.org', 'Church', fake);
    await m.send({
      to: 't@b.org',
      subject: 'S',
      text: 'T',
      replyTo: 'r@b.org',
      headers: { A: 'b' },
    });
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].auth, 'Bearer re_key');
    assert.deepEqual(calls[0].body, {
      from: 'Church <news@b.org>',
      to: ['t@b.org'],
      subject: 'S',
      text: 'T',
      reply_to: 'r@b.org',
      headers: { A: 'b' },
    });
  });
  it('batches up to 100 per call and reports a refused batch per message', async () => {
    const sizes: number[] = [];
    const fake = async (_url: string, init?: RequestInit) => {
      const n = (JSON.parse(String(init?.body)) as unknown[]).length;
      sizes.push(n);
      return new Response(JSON.stringify({ message: 'rate limited' }), {
        status: sizes.length === 2 ? 429 : 200,
      });
    };
    const m = resendMailer('k', 'f@b.org', 'S', fake);
    const msgs = Array.from({ length: 150 }, (_, i) => ({
      to: `p${i}@b.org`,
      subject: 'S',
      text: 'T',
    }));
    const results = await m.sendMany(msgs);
    assert.deepEqual(sizes, [100, 50]);
    assert.equal(results.filter((r) => r.ok).length, 100);
    assert.match(results[120].error ?? '', /429: rate limited/);
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and rejects junk', () => {
    assert.equal(normalizeEmail('  Ann@Example.ORG '), 'ann@example.org');
    for (const bad of ['', 'ann', 'ann@x', 'a b@x.org', '<a@x.org>', 42])
      assert.equal(normalizeEmail(bad), null);
  });
});

describe('signed links', () => {
  it('round-trips, and binds the purpose', async () => {
    const t = await unsubscribeToken(SECRET, 'ann@example.org');
    assert.equal((await verifyToken(SECRET, t, 'unsub'))?.e, 'ann@example.org');
    assert.equal(
      await verifyToken(SECRET, t, 'confirm'),
      null,
      'an unsubscribe link is not a confirmation',
    );
  });
  it('rejects a tampered payload, a wrong secret and junk', async () => {
    const t = await unsubscribeToken(SECRET, 'ann@example.org');
    const [body, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ e: 'bob@example.org', p: 'unsub' })).toString(
      'base64url',
    );
    assert.equal(await verifyToken(SECRET, `${forged}.${sig}`, 'unsub'), null);
    assert.equal(await verifyToken('y'.repeat(40), t, 'unsub'), null);
    assert.equal(await verifyToken(SECRET, `${body}.`, 'unsub'), null);
    assert.equal(await verifyToken(SECRET, 'not-a-token', 'unsub'), null);
    assert.equal(await verifyToken(SECRET, null, 'unsub'), null);
  });
  it('expires a confirmation link after a week', async () => {
    const now = Date.parse('2026-10-18T12:00:00Z');
    const t = await confirmToken(SECRET, 'ann@example.org', now);
    assert.ok(await verifyToken(SECRET, t, 'confirm', now + 6 * 86_400_000));
    assert.equal(await verifyToken(SECRET, t, 'confirm', now + 8 * 86_400_000), null);
    const old = await signToken(SECRET, { e: 'a@b.org', p: 'confirm', x: 1 });
    assert.equal(await verifyToken(SECRET, old, 'confirm', now), null);
  });
});

describe('the email template', () => {
  const brand = brandFromConfig(
    {
      palette: {
        light: { '--primary': '#235E93', '--foreground': '#171A26', '--border': 'oklch(1 0 0)' },
        dark: { '--background': '#141823' },
      },
      fonts: { display: { familyValue: '"Young Serif", Georgia, serif' } },
    },
    'First Church',
    'https://example.org/',
  );
  it('keeps only hex colours and the fonts an inbox has', () => {
    assert.equal(brand.accent, '#235E93');
    assert.equal(brand.siteUrl, 'https://example.org');
    assert.equal(brand.headingStack, 'Georgia, serif');
    assert.equal(emailFontStack('"Familjen Grotesk Variable"', 'Arial'), 'Arial');
  });
  const doc = {
    brand,
    title: 'This <week>',
    preheader: 'Hello',
    blocks: [
      { kind: 'paragraph' as const, text: 'One & two\n\nThree' },
      {
        kind: 'items' as const,
        heading: 'Notices',
        items: [{ title: 'Picnic', url: 'javascript:alert(1)' }],
      },
      { kind: 'button' as const, label: 'Go', url: 'https://example.org/x?a=1&b=2' },
    ],
    footer: {
      address: '1 Main St\nTown, OH',
      reason: 'You signed up.',
      unsubscribeUrl: 'https://example.org/u?t=abc',
    },
  };
  it('escapes words, drops unsafe links, and is table-based with a dark scheme', () => {
    const { html } = renderEmail(doc);
    assert.match(html, /This &lt;week&gt;/);
    assert.match(html, /One &amp; two/);
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /href="https:\/\/example.org\/x\?a=1&amp;b=2"/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /prefers-color-scheme: dark/);
    assert.match(html, /name="color-scheme" content="light dark"/);
  });
  it('carries the postal address and the unsubscribe link in both versions', () => {
    const { html, text } = renderEmail(doc);
    assert.match(html, /1 Main St<br>Town, OH/);
    assert.match(html, /href="https:\/\/example.org\/u\?t=abc"[^>]*>Unsubscribe/);
    assert.match(text, /First Church, 1 Main St, Town, OH/);
    assert.match(text, /Unsubscribe: https:\/\/example.org\/u\?t=abc/);
    assert.match(text, /\* Picnic/);
  });
});

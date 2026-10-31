// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The dashboard Inbox report (src/lib/site-inbox.ts, PORTS.md card 210): no binding means no
// call, contacts never leave the site, the preview is short, and a failing or throwing binding
// never reaches the route. The three form routes must call it after they store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  inboxMessage,
  inboxTarget,
  inboxText,
  reportToInbox,
  type InboxReport,
} from './site-inbox.ts';

function fakeBinding(answer: unknown = { ok: true }) {
  const calls: Array<{ key: string; msg: InboxReport }> = [];
  return {
    calls,
    reportMessage: async (key: string, msg: InboxReport) => {
      calls.push({ key, msg });
      if (answer instanceof Error) throw answer;
      return answer as { ok: boolean };
    },
  };
}

test('no binding, no key or a malformed key: no target', () => {
  const b = fakeBinding();
  assert.equal(inboxTarget({}), null);
  assert.equal(inboxTarget({ SITE_DATA: b }), null);
  assert.equal(inboxTarget({ SITE_DATA_KEY: 'fbcm' }), null);
  assert.equal(inboxTarget({ SITE_DATA: b, SITE_DATA_KEY: 'Not A Key!' }), null);
  assert.equal(inboxTarget({ SITE_DATA: {}, SITE_DATA_KEY: 'fbcm' }), null);
  assert.equal(inboxTarget({ SITE_DATA: b, SITE_DATA_KEY: ' fbcm ' })?.key, 'fbcm');
});

test('emails and phone numbers are replaced before anything is sent', () => {
  const t = inboxText(
    'Write to jo.smith+x@example.org or call (765) 555-0142, or +44 20 7946 0958.',
  );
  assert.ok(!/@|555|7946/.test(t), t);
  assert.equal(t.match(/\[contact removed\]/g)?.length, 3);
  // Short numbers (a year, a party size) stay.
  assert.equal(inboxText('Party of 4 in 2026'), 'Party of 4 in 2026');
});

test('the preview is one line and at most 200 characters, cut on a word', () => {
  const long = `Line one\n\twith tabs\u0007 ${'word '.repeat(80)}`;
  const t = inboxText(long);
  assert.ok(t.length <= 200, String(t.length));
  assert.ok(t.endsWith('…'));
  assert.ok(!/[\n\t\u0007]/.test(t));
  assert.ok(t.startsWith('Line one with tabs word'));
  assert.equal(inboxText(undefined), '');
  assert.equal(inboxText(42), '');
});

test('inboxMessage caps every field and drops the empty ones', () => {
  const m = inboxMessage({
    id: 'contact-7',
    form: 'contact',
    name: '  Jo  ',
    subject: '',
    preview: 'hi@me.com',
    receivedAt: '2026-10-30T12:00:00.000Z',
  });
  assert.deepEqual(m, {
    id: 'contact-7',
    form: 'contact',
    name: 'Jo',
    preview: '[contact removed]',
    receivedAt: '2026-10-30T12:00:00.000Z',
  });
  assert.ok(inboxMessage({ id: 'x', form: 'f', name: 'n'.repeat(300) }).name!.length <= 80);
  assert.ok(Date.parse(inboxMessage({ id: 'x', form: 'f' }).receivedAt!) > 0);
});

test('reportToInbox sends the cleaned message under waitUntil', async () => {
  const b = fakeBinding();
  const waited: Promise<unknown>[] = [];
  const locals = { cfContext: { waitUntil: (p: Promise<unknown>) => waited.push(p) } };
  const done = reportToInbox({ SITE_DATA: b, SITE_DATA_KEY: 'fbcm' }, locals, {
    id: 'contact-1',
    form: 'contact',
    name: 'Jo',
    preview: 'Call me on 765 555 0142',
  });
  assert.equal(waited.length, 1);
  await done;
  assert.equal(b.calls.length, 1);
  assert.equal(b.calls[0].key, 'fbcm');
  assert.equal(b.calls[0].msg.preview, 'Call me on [contact removed]');
});

test('no binding: nothing is called and nothing is waited on', async () => {
  const waited: Promise<unknown>[] = [];
  await reportToInbox(
    {},
    { cfContext: { waitUntil: (p: Promise<unknown>) => waited.push(p) } },
    {
      id: 'a',
      form: 'contact',
    },
  );
  assert.equal(waited.length, 0);
});

test('a refusal, a throw or a missing request context never rejects', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const answer of [{ ok: false, reason: 'unknown-site' }, undefined, new Error('down')]) {
      const b = fakeBinding(answer);
      await reportToInbox({ SITE_DATA: b, SITE_DATA_KEY: 'mas' }, undefined, {
        id: 'q',
        form: 'quote',
      });
      assert.equal(b.calls.length, 1);
    }
    const sync = {
      reportMessage: () => {
        throw new Error('sync throw');
      },
    };
    await reportToInbox({ SITE_DATA: sync, SITE_DATA_KEY: 'mas' }, {}, { id: 'q', form: 'quote' });
    const badCtx = {
      cfContext: {
        waitUntil: () => {
          throw new Error('no ctx');
        },
      },
    };
    await reportToInbox({ SITE_DATA: fakeBinding(), SITE_DATA_KEY: 'mas' }, badCtx, {
      id: 'q',
      form: 'quote',
    });
  } finally {
    console.warn = warn;
  }
});

test('the form routes report after they store, and never pass an email', () => {
  // Each site has some of these (mas-monograms has quote only); every one it has must report.
  const routes = ['contact', 'form', 'rsvp', 'quote'].filter((r) =>
    existsSync(new URL(`../pages/api/${r}.ts`, import.meta.url)),
  );
  assert.ok(routes.length > 0, 'no form route found');
  for (const route of routes) {
    const src = readFileSync(new URL(`../pages/api/${route}.ts`, import.meta.url), 'utf8');
    const at = src.indexOf('reportToInbox(');
    assert.ok(at > 0, `${route}.ts does not call reportToInbox`);
    assert.ok(
      at > src.indexOf('INSERT') || route === 'rsvp',
      `${route}.ts reports before it stores`,
    );
    const call = src.slice(at, src.indexOf('});', at));
    assert.ok(!/email/i.test(call), `${route}.ts passes an email to the Inbox`);
  }
});

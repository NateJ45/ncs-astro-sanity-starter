// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Messages inbox (src/lib/studio-messages.ts, card 117): endpoint auth order,
// row mapping, statuses and the prayer-request privacy rule.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  formDetail,
  handleMessages,
  MESSAGE_STATUS_DDL,
  mergeList,
  parseKey,
  statusFor,
  type ContactRow,
  type FormRow,
  type MessageStore,
  type StatusRow,
} from './studio-messages.ts';

const contact: ContactRow = {
  id: 1,
  received_at: '2026-10-17T10:00:00Z',
  name: 'Ann',
  email: 'ann@example.com',
  subject: 'Hello',
  message: 'Is there parking?',
  notified: 1,
};
const visit: FormRow = {
  id: 2,
  received_at: '2026-10-18T09:00:00Z',
  form_id: 'f1',
  form_title: 'Plan a visit',
  recipient: 'office@example.org',
  mode: 'standard',
  name: 'Bo',
  email: 'bo@example.com',
  answers: JSON.stringify([{ label: 'Kids?', value: '2' }]),
  notified: 0,
};
const prayer: FormRow = {
  id: 3,
  received_at: '2026-10-18T08:00:00Z',
  form_id: 'f2',
  form_title: 'Prayer',
  mode: 'prayer',
  name: 'Cy',
  email: 'cy@example.com',
  answers: JSON.stringify([{ label: 'Request', value: 'private words' }]),
  notified: 1,
  cleared: 1,
};

function fakeStore(
  over: Partial<MessageStore> = {},
  tables = ['contact_submissions', 'form_submissions', 'message_status'],
) {
  const statuses: StatusRow[] = [{ source: 'contact', message_id: 1, status: 'replied' }];
  const writes: unknown[] = [];
  const store: MessageStore = {
    tables: async () => new Set(tables),
    list: async (s) => (s === 'contact' ? [contact] : [visit, prayer]),
    get: async (s, id) =>
      s === 'contact'
        ? id === 1
          ? contact
          : null
        : ([visit, prayer].find((r) => r.id === id) ?? null),
    statuses: async () => statuses,
    status: async (s, id) => statuses.find((r) => r.source === s && r.message_id === id)?.status,
    setStatus: async (...args) => {
      writes.push(args);
    },
    ...over,
  };
  return { store, writes };
}

const req = (url = 'https://site.org/api/studio/messages/', init: RequestInit = {}) =>
  new Request(url, init);
const deps = (
  store: MessageStore | null,
  user: { id: string } | null = { id: 'pAnn' },
  same = true,
) => ({
  store,
  verify: async () => user,
  sameOrigin: () => same,
  now: () => new Date('2026-10-18T12:00:00Z'),
});
const body = async (r: Response) => ({ status: r.status, json: (await r.json()) as any });

describe('handleMessages: auth comes first and fails closed', () => {
  it('another origin is 403 before anything else is asked', async () => {
    let asked = false;
    const r = await body(
      await handleMessages(req(), {
        ...deps(fakeStore().store, null, false),
        verify: async () => {
          asked = true;
          return null;
        },
      }),
    );
    assert.equal(r.status, 403);
    assert.equal(asked, false);
  });
  it('no Studio session is 401 and the database is not touched', async () => {
    let touched = false;
    const { store } = fakeStore({
      tables: async () => {
        touched = true;
        return new Set();
      },
    });
    const r = await body(await handleMessages(req(), deps(store, null)));
    assert.equal(r.status, 401);
    assert.equal(touched, false);
  });
  it('signed in, no binding: configured false (the "not set up yet" state)', async () => {
    const r = await body(await handleMessages(req(), deps(null)));
    assert.deepEqual(r.json, { ok: true, configured: false });
  });
  it('signed in, binding but no tables yet: configured false', async () => {
    const { store } = fakeStore({}, []);
    const r = await body(await handleMessages(req(), deps(store)));
    assert.equal(r.json.configured, false);
  });
});

describe('handleMessages: list, detail, mark as', () => {
  it('lists both sources newest first with statuses and no prayer names', async () => {
    const r = await body(await handleMessages(req(), deps(fakeStore().store)));
    assert.equal(r.json.statusReady, true);
    assert.deepEqual(
      r.json.messages.map((m: any) => [m.key, m.from, m.status]),
      [
        ['form-2', 'Bo', 'needs-person'],
        ['form-3', 'Prayer request', 'new'],
        ['contact-1', 'Ann', 'replied'],
      ],
    );
    assert.doesNotMatch(JSON.stringify(r.json), /Cy|cy@example|private words/);
  });
  it("a detail shows the answers, but never a prayer request's", async () => {
    const v = await body(
      await handleMessages(
        req('https://site.org/api/studio/messages/?key=form-2'),
        deps(fakeStore().store),
      ),
    );
    assert.deepEqual(v.json.message.answers, [{ label: 'Kids?', value: '2' }]);
    assert.equal(v.json.message.email, 'bo@example.com');
    const p = await body(
      await handleMessages(
        req('https://site.org/api/studio/messages/?key=form-3'),
        deps(fakeStore().store),
      ),
    );
    assert.equal(p.json.message.prayer, true);
    assert.deepEqual(p.json.message.answers, []);
    assert.equal(p.json.message.email, null);
    assert.doesNotMatch(JSON.stringify(p.json), /Cy|cy@example|private words/);
  });
  it('unknown key is 404', async () => {
    const r = await handleMessages(
      req('https://site.org/api/studio/messages/?key=form-99'),
      deps(fakeStore().store),
    );
    assert.equal(r.status, 404);
  });
  it('mark as writes the status with the user id and time', async () => {
    const { store, writes } = fakeStore();
    const r = await body(
      await handleMessages(
        req(undefined, { method: 'POST', body: JSON.stringify({ key: 'form-2', status: 'spam' }) }),
        deps(store),
      ),
    );
    assert.deepEqual(r.json, { ok: true, status: 'spam' });
    assert.deepEqual(writes, [['form', 2, 'spam', '2026-10-18T12:00:00.000Z', 'pAnn']]);
  });
  it('mark as refuses a bad status, an unknown message, or no status table', async () => {
    const post = (b: unknown) => req(undefined, { method: 'POST', body: JSON.stringify(b) });
    assert.equal(
      (await handleMessages(post({ key: 'form-2', status: 'deleted' }), deps(fakeStore().store)))
        .status,
      400,
    );
    assert.equal(
      (await handleMessages(post({ key: 'form-99', status: 'spam' }), deps(fakeStore().store)))
        .status,
      404,
    );
    const noStatus = fakeStore({}, ['form_submissions']).store;
    assert.equal(
      (await handleMessages(post({ key: 'form-2', status: 'spam' }), deps(noStatus))).status,
      409,
    );
  });
});

describe('mapping helpers', () => {
  it('statusFor: stored wins; unmarked is New, or Needs a person when the email failed', () => {
    assert.equal(statusFor('replied', false), 'replied');
    assert.equal(statusFor(undefined, true), 'new');
    assert.equal(statusFor(undefined, false), 'needs-person');
    assert.equal(statusFor('bogus', true), 'new');
  });
  it('parseKey', () => {
    assert.deepEqual(parseKey('contact-12'), { source: 'contact', id: 12 });
    assert.equal(parseKey('form-x'), null);
    assert.equal(parseKey('other-1'), null);
  });
  it('a prayer request that was not emailed says so, still without its words', () => {
    const d = formDetail({ ...prayer, notified: 0, cleared: 0 });
    assert.match(d.note ?? '', /did not go out/);
    assert.deepEqual(d.answers, []);
  });
  it("a form builder 'private' form is kept as privately, under its own name (card 194)", () => {
    const d = formDetail({ ...prayer, mode: 'private' });
    assert.equal(d.prayer, true);
    assert.equal(d.from, 'Private message');
    assert.deepEqual(d.answers, []);
    assert.equal(d.email, null);
    assert.match(d.note ?? '', /^A private message arrived/);
  });
  it('mergeList tolerates broken answers JSON', () => {
    assert.equal(mergeList([], [{ ...visit, answers: '{bad' }], []).length, 1);
    assert.deepEqual(formDetail({ ...visit, answers: '{bad' }).answers, []);
  });
});

describe('the migration matches the DDL', () => {
  it('migrations/*_message_status.sql carries MESSAGE_STATUS_DDL', () => {
    const dir = new URL('../../migrations/', import.meta.url);
    const file = readdirSync(dir).find((f) => /_message_status\.sql$/.test(f));
    assert.ok(file, 'a migrations/*_message_status.sql file exists');
    const sql = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(sql.includes(MESSAGE_STATUS_DDL), `${file} must contain MESSAGE_STATUS_DDL verbatim`);
  });
});

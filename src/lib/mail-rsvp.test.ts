// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// RSVPs and the Studio's mail routes (PORTS.md card 127), against real SQLite:
// capacity and the waiting list, closing, validation, the CSV, and the
// protected routes failing closed (origin, then session, then settings).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAIL_DDL } from './mail-db.ts';
import { sqliteD1 } from './mail-sqlite.ts';
import {
  eventCounts,
  eventKey,
  isClosed,
  normalizeRsvpBlock,
  parseEventKey,
  placeRsvp,
  rsvpConfirmationEmail,
  rsvpCsv,
  seatsLeft,
  validateRsvp,
  type RsvpEvent,
} from './mail-rsvp.ts';
import { brandFromConfig } from './mail-template.ts';
import { handleNewsletterStudio, handleRsvpStudio, type StudioGate } from './mail-studio.ts';
import type { Mailer } from './mail-send.ts';

const NOW = Date.parse('2026-06-01T12:00:00Z');

const block = (over: Record<string, unknown> = {}) => ({
  _type: 'rsvpSection',
  _key: 'abc123',
  eventName: 'Vacation Bible School',
  startsAt: '2026-06-15T13:00:00Z',
  capacity: 10,
  waitlist: true,
  maxParty: 6,
  questions: [
    { label: 'Age group', kind: 'select', options: ['4-6', '7-10'], required: true },
    { label: 'Allergies', kind: 'text' },
    { label: 'Photos ok?', kind: 'checkbox' },
  ],
  ...over,
});

const ev = (over: Record<string, unknown> = {}) =>
  normalizeRsvpBlock(block(over), 'page-vbs') as RsvpEvent;
const reply = (partySize: number, name = 'Ann Smith') => ({
  name,
  email: `${name.split(' ')[0].toLowerCase()}@example.org`,
  partySize,
  answers: { '0': '4-6' },
});

describe('the RSVP block', () => {
  it('keys the event by page and block, never a draft id', () => {
    assert.equal(ev().key, 'page-vbs:abc123');
    assert.equal(eventKey('drafts.page-vbs', 'abc123'), 'page-vbs:abc123');
    assert.deepEqual(parseEventKey('page-vbs:abc123'), { pageId: 'page-vbs', blockKey: 'abc123' });
    assert.equal(parseEventKey('drafts.x:abc'), null);
    assert.equal(parseEventKey('../x:abc'), null);
  });
  it('needs a name, and closes at the start time unless told otherwise', () => {
    assert.equal(normalizeRsvpBlock(block({ eventName: '' }), 'p'), null);
    assert.equal(ev().closesAt, '2026-06-15T13:00:00Z');
    assert.equal(isClosed(ev(), NOW), false);
    assert.equal(isClosed(ev({ closesAt: '2026-05-01T00:00:00Z' }), NOW), true);
    assert.equal(ev({ capacity: null }).capacity, null);
  });
});

describe('validating a reply', () => {
  it('checks name, email, party size and the questions against the block', () => {
    const e = ev();
    const bad = validateRsvp(e, { name: '', email: 'x', partySize: 9, answers: { '0': 'nope' } });
    assert.equal(bad.ok, false);
    assert.deepEqual(Object.keys(bad.errors).sort(), ['email', 'name', 'partySize', 'q0']);
    const good = validateRsvp(e, {
      ...reply(2),
      answers: { '0': '7-10', '1': 'Nuts', '2': 'yes' },
    });
    assert.ok(good.ok);
    assert.deepEqual(good.value?.answers, [
      { label: 'Age group', value: '7-10' },
      { label: 'Allergies', value: 'Nuts' },
      { label: 'Photos ok?', value: 'Yes' },
    ]);
  });
});

describe('capacity and the waiting list', () => {
  it('fills to capacity, then waitlists', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev();
    const v = (n: number, name: string) => validateRsvp(e, reply(n, name)).value!;
    assert.equal((await placeRsvp(db, e, v(6, 'Ann A'), NOW)).status, 'going');
    assert.equal((await placeRsvp(db, e, v(4, 'Bob B'), NOW)).status, 'going');
    assert.equal(await seatsLeft(db, e), 0);
    assert.equal((await placeRsvp(db, e, v(1, 'Cat C'), NOW)).status, 'waitlist');
    const [c] = await eventCounts(db, e.key);
    assert.deepEqual([c.going, c.waiting, c.replies], [10, 1, 3]);
  });
  it('a party that does not fit goes on the list even when one place is left', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev({ capacity: 3 });
    await placeRsvp(db, e, validateRsvp(e, reply(2, 'Ann A')).value!, NOW);
    assert.equal(
      (await placeRsvp(db, e, validateRsvp(e, reply(2, 'Bob B')).value!, NOW)).status,
      'waitlist',
    );
    assert.equal(
      (await placeRsvp(db, e, validateRsvp(e, reply(1, 'Cat C')).value!, NOW)).status,
      'going',
    );
  });
  it('is full, not waitlisted, when the block has no waiting list', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev({ capacity: 1, waitlist: false });
    await placeRsvp(db, e, validateRsvp(e, reply(1, 'Ann A')).value!, NOW);
    assert.deepEqual(await placeRsvp(db, e, validateRsvp(e, reply(1, 'Bob B')).value!, NOW), {
      status: 'full',
    });
    assert.equal((await eventCounts(db, e.key))[0].replies, 1);
  });
  it('never overbooks when replies arrive together', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev({ capacity: 5, waitlist: false });
    const all = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        placeRsvp(db, e, validateRsvp(e, reply(1, `P${i} X`)).value!, NOW),
      ),
    );
    assert.equal(all.filter((p) => p.status === 'going').length, 5);
    assert.equal((await eventCounts(db, e.key))[0].going, 5);
  });
  it('has no limit when there is no capacity', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev({ capacity: null });
    for (let i = 0; i < 20; i++)
      await placeRsvp(db, e, validateRsvp(e, reply(6, `P${i} X`)).value!, NOW);
    assert.equal(await seatsLeft(db, e), null);
    assert.equal((await eventCounts(db, e.key))[0].going, 120);
  });
});

describe('the organiser download and the confirmation', () => {
  it('is a CSV with a column per question, safe in a spreadsheet', () => {
    const csv = rsvpCsv([
      {
        id: 1,
        received_at: '2026-06-01T12:00:00Z',
        name: '=HYPERLINK("x")',
        email: 'a@b.org',
        party_size: 2,
        status: 'waitlist',
        answers: JSON.stringify([{ label: 'Allergies', value: 'Nuts, eggs' }]),
      },
    ]);
    const [head, row] = csv.replace('﻿', '').trim().split('\r\n');
    assert.equal(head, 'Received,Name,Email,How many,Status,Allergies');
    assert.match(
      row,
      /^2026-06-01T12:00:00Z,"'=HYPERLINK\(""x""\)",a@b.org,2,Waiting list,"Nuts, eggs"$/,
    );
  });
  it('the email says going or waiting, with the details and the note', () => {
    const e = ev({ confirmationNote: 'Bring a towel.', where: 'Fellowship Hall' });
    const v = validateRsvp(e, reply(3)).value!;
    const opts = {
      brand: brandFromConfig({}, 'First Church', 'https://example.org'),
      address: '1 Main St',
      timeZone: 'America/New_York',
    };
    const going = rsvpConfirmationEmail(e, v, 'going', opts);
    assert.match(going.text, /See you at Vacation Bible School/);
    assert.match(going.text, /When: Monday, June 15/);
    assert.match(going.text, /Where: Fellowship Hall/);
    assert.match(going.text, /How many: 3 people/);
    assert.match(going.text, /Bring a towel/);
    assert.match(rsvpConfirmationEmail(e, v, 'waitlist', opts).text, /waiting list/);
  });
});

// -----------------------------------------------------------------------------
// The protected Studio routes
// -----------------------------------------------------------------------------

const req = (url: string, init: RequestInit = {}) => new Request(`https://example.org${url}`, init);
const gate = (over: Partial<StudioGate> = {}): StudioGate => ({
  sameOrigin: () => true,
  verify: async () => ({ id: 'user-1', email: 'editor@example.org' }),
  ...over,
});

describe('/api/studio/rsvps/ and /api/studio/newsletter/ fail closed', () => {
  it('refuses another origin before reading anything', async () => {
    let touched = false;
    const db = new Proxy(sqliteD1(MAIL_DDL), {
      get(t, p) {
        touched = true;
        return Reflect.get(t, p);
      },
    });
    const r = await handleRsvpStudio(req('/api/studio/rsvps/'), {
      ...gate({ sameOrigin: () => false }),
      db,
    });
    assert.equal(r.status, 403);
    assert.equal(touched, false);
  });
  it('refuses a stranger (no Studio session) before reading anything', async () => {
    const r = await handleRsvpStudio(req('/api/studio/rsvps/?event=p:k&format=csv'), {
      ...gate({ verify: async () => null }),
      db: sqliteD1(MAIL_DDL),
    });
    assert.equal(r.status, 401);
  });
  it('says "not set up" with no database', async () => {
    const r = await handleRsvpStudio(req('/api/studio/rsvps/'), { ...gate(), db: null });
    assert.equal(r.status, 503);
    assert.equal(((await r.json()) as { configured: boolean }).configured, false);
  });
  it('gives counts and a CSV download to a member', async () => {
    const db = sqliteD1(MAIL_DDL);
    const e = ev();
    await placeRsvp(db, e, validateRsvp(e, reply(2)).value!, NOW);
    const list = await handleRsvpStudio(req('/api/studio/rsvps/'), { ...gate(), db });
    const body = (await list.json()) as { events: Array<{ key: string; going: number }> };
    assert.deepEqual(
      body.events.map((x) => [x.key, x.going]),
      [['page-vbs:abc123', 2]],
    );
    const csv = await handleRsvpStudio(req('/api/studio/rsvps/?event=page-vbs:abc123&format=csv'), {
      ...gate(),
      db,
    });
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    assert.match(await csv.text(), /Ann Smith,ann@example.org,2,Going,4-6/);
  });
  it('newsletter: 403 / 401 first, then 503 when mail is not set up', async () => {
    const send = {
      db: sqliteD1(MAIL_DDL),
      mailer: null,
      secret: null,
      origin: 'https://example.org',
      brand: brandFromConfig({}, 'S', 'https://example.org'),
      address: 'x',
      listName: 'the list',
      loadIssue: async () => null,
    };
    const post = () =>
      req('/api/studio/newsletter/', {
        method: 'POST',
        body: JSON.stringify({ action: 'start', id: 'i' }),
      });
    assert.equal(
      (await handleNewsletterStudio(post(), { ...gate({ sameOrigin: () => false }), send })).status,
      403,
    );
    assert.equal(
      (await handleNewsletterStudio(post(), { ...gate({ verify: async () => null }), send }))
        .status,
      401,
    );
    assert.equal((await handleNewsletterStudio(post(), { ...gate(), send })).status, 503);
  });
  it('newsletter: a test needs the editor’s own email, and goes only there', async () => {
    const to: string[] = [];
    const mailer: Mailer = {
      provider: 'cloudflare',
      from: 'f@example.org',
      send: async (m) => (to.push(m.to), { ok: true }),
      sendMany: async () => [],
    };
    const send = {
      db: sqliteD1(MAIL_DDL),
      mailer,
      secret: 'k'.repeat(40),
      origin: 'https://example.org',
      brand: brandFromConfig({}, 'S', 'https://example.org'),
      address: 'x',
      listName: 'the list',
      loadIssue: async (id: string) => ({ id, subject: 'Hi', sections: [] }),
    };
    const body = JSON.stringify({ action: 'test', id: 'drafts.issue-1' });
    const noEmail = await handleNewsletterStudio(req('/x', { method: 'POST', body }), {
      ...gate({ verify: async () => ({ id: 'u' }) }),
      send,
    });
    assert.equal(noEmail.status, 400);
    const ok = await handleNewsletterStudio(req('/x', { method: 'POST', body }), {
      ...gate(),
      send,
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(to, ['editor@example.org']);
  });
});

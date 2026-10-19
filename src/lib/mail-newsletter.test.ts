// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The newsletter list and sends (PORTS.md card 121), run against real SQLite
// (node:sqlite, src/lib/mail-sqlite.ts) with the real MAIL_DDL: double opt-in,
// the same answer whatever the list holds, unsubscribe, batching, never twice.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { MAIL_DDL } from './mail-db.ts';
import { sqliteD1 } from './mail-sqlite.ts';
import type { Mailer, MailMessage, SendResult } from './mail-send.ts';
import { brandFromConfig } from './mail-template.ts';
import { verifyToken } from './mail-token.ts';
import {
  confirmSubscription,
  listCounts,
  subscribe,
  unsubscribe,
  type ListDeps,
} from './mail-subscribe.ts';
import {
  continueSend,
  sendTest,
  startSend,
  type IssueContent,
  type SendAnswer,
  type SendDeps,
} from './mail-newsletter.ts';

const SECRET = 's'.repeat(40);
const NOW = Date.parse('2026-10-18T12:00:00Z');

function fakeMailer(fail?: (m: MailMessage) => boolean) {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    provider: 'resend',
    from: 'news@example.org',
    async send(m) {
      if (fail?.(m)) return { ok: false, error: 'refused' };
      sent.push(m);
      return { ok: true };
    },
    async sendMany(ms) {
      const out: SendResult[] = [];
      for (const m of ms) out.push(await this.send(m));
      return out;
    },
  };
  return { mailer, sent };
}

function deps(over: Partial<ListDeps> = {}) {
  const db = sqliteD1(MAIL_DDL);
  const { mailer, sent } = fakeMailer();
  const d: ListDeps = {
    db,
    mailer,
    secret: SECRET,
    origin: 'https://example.org',
    brand: brandFromConfig({}, 'First Church', 'https://example.org'),
    address: '1 Main St, Hamilton, OH',
    listName: 'the First Church newsletter',
    now: () => NOW,
    ...over,
  };
  return { d, db, sent };
}

const tokenFrom = (m: MailMessage) => /[?&]t=([A-Za-z0-9_.-]+)/.exec(m.text)?.[1] ?? '';

describe('MAIL_DDL', () => {
  it('migrations/*_mail.sql carries it', () => {
    const dir = new URL('../../migrations/', import.meta.url);
    const file = readdirSync(dir).find((f) => /_mail\.sql$/.test(f));
    assert.ok(file, 'a migrations/*_mail.sql file exists');
    const sql = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(
      sql.includes(MAIL_DDL),
      `${file} must contain MAIL_DDL from src/lib/mail-db.ts exactly`,
    );
  });
  it('stores only the address, a status and timestamps for a subscriber', () => {
    const { db } = deps();
    const cols = (
      db.raw.prepare(`PRAGMA table_info(subscribers)`).all() as Array<{ name: string }>
    ).map((c) => c.name);
    assert.deepEqual(cols, [
      'id',
      'email',
      'status',
      'created_at',
      'confirm_sent_at',
      'confirmed_at',
      'unsubscribed_at',
    ]);
  });
});

describe('subscribing (double opt-in)', () => {
  it('stores a pending address and emails a signed confirm link; the name is not kept', async () => {
    const { d, db, sent } = deps();
    const r = await subscribe({ email: 'Ann@Example.org', name: 'Ann Smith' }, d);
    assert.deepEqual(r, { status: 200, body: { ok: true, pending: true } });
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /Hi Ann,/);
    assert.match(sent[0].text, /https:\/\/example.org\/api\/subscribe\/confirm\/\?t=/);
    const row = db.raw.prepare(`SELECT * FROM subscribers`).get() as Record<string, unknown>;
    assert.equal(row.email, 'ann@example.org');
    assert.equal(row.status, 'pending');
    assert.ok(!JSON.stringify(row).includes('Ann Smith'));
    assert.equal((await listCounts(db)).subscribed, 0, 'pending is not on the list');
  });
  it('confirming puts the address on the list', async () => {
    const { d, db, sent } = deps();
    await subscribe({ email: 'ann@example.org' }, d);
    assert.equal(await confirmSubscription(tokenFrom(sent[0]), d), 'confirmed');
    assert.deepEqual(await listCounts(db), { subscribed: 1, pending: 0 });
    assert.equal(await confirmSubscription('junk', d), 'invalid');
  });
  it('gives the same answer for a subscribed address and sends it nothing', async () => {
    const { d, sent } = deps();
    await subscribe({ email: 'ann@example.org' }, d);
    await confirmSubscription(tokenFrom(sent[0]), d);
    const again = await subscribe({ email: 'ann@example.org' }, d);
    assert.deepEqual(again.body, { ok: true, pending: true });
    assert.equal(sent.length, 1);
  });
  it('does not resend the link within ten minutes, and does after', async () => {
    let now = NOW;
    const { d, sent } = deps({ now: () => now });
    await subscribe({ email: 'ann@example.org' }, d);
    await subscribe({ email: 'ann@example.org' }, d);
    assert.equal(sent.length, 1);
    now += 11 * 60_000;
    await subscribe({ email: 'ann@example.org' }, d);
    assert.equal(sent.length, 2);
  });
  it('drops a bot silently, refuses a bad address, and says "not set up" without a secret', async () => {
    const { d, sent } = deps();
    assert.equal((await subscribe({ email: 'a@b.org', website: 'spam' }, d)).status, 200);
    assert.equal(sent.length, 0);
    assert.equal((await subscribe({ email: 'nope' }, d)).status, 422);
    const off = await subscribe({ email: 'a@b.org' }, { ...d, secret: null });
    assert.equal(off.status, 503);
    assert.equal(off.body.unavailable, true);
  });
  it('a failed confirmation email is an error the visitor sees, and nothing is marked sent', async () => {
    const { d, db } = deps({ mailer: fakeMailer(() => true).mailer });
    assert.equal((await subscribe({ email: 'a@b.org' }, d)).status, 502);
    const row = db.raw.prepare(`SELECT confirm_sent_at FROM subscribers`).get() as Record<
      string,
      unknown
    >;
    assert.equal(row.confirm_sent_at, null);
  });
});

describe('unsubscribing', () => {
  it('takes the address off the list with the signed link, no login', async () => {
    const { d, db, sent } = deps();
    await subscribe({ email: 'ann@example.org' }, d);
    await confirmSubscription(tokenFrom(sent[0]), d);
    const issue = await sendTest(sendDeps(d, db), 'issue-1', 'ann@example.org');
    assert.equal(issue.ok, true);
    const unsub = /\/email\/unsubscribe\/\?t=([A-Za-z0-9_.-]+)/.exec(sent[1].text)?.[1] ?? '';
    assert.equal(await unsubscribe(unsub, d), 'unsubscribed');
    assert.deepEqual(await listCounts(db), { subscribed: 0, pending: 0 });
    assert.equal(await unsubscribe(unsub, d), 'unsubscribed', 'twice is fine');
    assert.equal(
      await unsubscribe(tokenFrom(sent[0]), d),
      'invalid',
      'a confirm link cannot unsubscribe',
    );
  });
  it('coming back needs confirming again', async () => {
    const { d, db, sent } = deps();
    await subscribe({ email: 'ann@example.org' }, d);
    await confirmSubscription(tokenFrom(sent[0]), d);
    db.raw.exec(`UPDATE subscribers SET status = 'unsubscribed'`);
    await subscribe({ email: 'ann@example.org' }, d);
    assert.deepEqual(await listCounts(db), { subscribed: 0, pending: 1 });
  });
});

const ISSUE: IssueContent = {
  id: 'issue-1',
  subject: 'This week at First Church',
  intro: 'Hello all.',
  sections: [{ heading: 'Notices', items: [{ title: 'Picnic on Sunday' }] }],
};

function sendDeps(
  d: ListDeps,
  db: ReturnType<typeof sqliteD1>,
  over: Partial<SendDeps> = {},
): SendDeps {
  return {
    ...d,
    db,
    loadIssue: async (id) => (id === ISSUE.id ? ISSUE : null),
    batchSize: 2,
    ...over,
  };
}

function seed(db: ReturnType<typeof sqliteD1>, n: number) {
  for (let i = 1; i <= n; i++) {
    db.raw
      .prepare(`INSERT INTO subscribers (email, status, created_at) VALUES (?, 'subscribed', ?)`)
      .run(`p${i}@example.org`, '2026-01-01T00:00:00Z');
  }
}

describe('sending an issue', () => {
  it('sends in batches until done, each person once, with their own unsubscribe link', async () => {
    const { d, db, sent } = deps();
    seed(db, 5);
    const sd = sendDeps(d, db);
    const first = await startSend(sd, 'issue-1', 'user-1');
    assert.ok(first.ok);
    assert.equal(first.ok && first.progress.sent, 2);
    assert.equal(first.ok && first.progress.status, 'sending');
    let r: SendAnswer = first;
    let calls = 1;
    while (r.ok && r.progress.status !== 'done') {
      r = await continueSend(sd, 'issue-1');
      calls++;
    }
    assert.equal(calls, 3, '5 people in batches of 2');
    assert.equal(sent.length, 5);
    assert.deepEqual(
      sent.map((m) => m.to).sort(),
      ['p1', 'p2', 'p3', 'p4', 'p5'].map((p) => `${p}@example.org`),
    );
    const m = sent[0];
    assert.match(
      m.headers?.['List-Unsubscribe'] ?? '',
      /^<https:\/\/example.org\/api\/unsubscribe\/\?t=/,
    );
    assert.equal(m.headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    const tok = /\/email\/unsubscribe\/\?t=([A-Za-z0-9_.-]+)/.exec(m.html ?? '')?.[1];
    assert.equal((await verifyToken(SECRET, tok, 'unsub'))?.e, m.to, 'the link is for that reader');
    assert.match(m.text, /1 Main St, Hamilton, OH/, 'postal address in every issue');
    assert.ok(r.ok && r.progress.total === 5 && r.progress.finishedAt);
  });
  it('never sends twice: "Send to everyone" again is refused, continue sends nothing', async () => {
    const { d, db, sent } = deps();
    seed(db, 3);
    const sd = sendDeps(d, db, { batchSize: 10 });
    await startSend(sd, 'issue-1', 'u');
    assert.equal(sent.length, 3);
    const again = await startSend(sd, 'issue-1', 'u');
    assert.ok(again.ok && again.alreadySent);
    await continueSend(sd, 'issue-1');
    seed(db, 0);
    db.raw
      .prepare(
        `INSERT INTO subscribers (email, status, created_at) VALUES ('late@example.org', 'subscribed', 'x')`,
      )
      .run();
    await startSend(sd, 'issue-1', 'u');
    assert.equal(sent.length, 3, 'a finished issue never goes again, even to someone new');
  });
  it('two batches racing cannot both send to the same person', async () => {
    const { d, db, sent } = deps();
    seed(db, 6);
    const sd = sendDeps(d, db, { batchSize: 6 });
    await startSend(sd, 'issue-1', 'u').catch(() => undefined);
    // Pretend the first call died after claiming nobody, then two continue calls race.
    db.raw.exec(
      `DELETE FROM newsletter_deliveries; UPDATE newsletter_sends SET status = 'sending', sent = 0`,
    );
    sent.length = 0;
    await Promise.all([continueSend(sd, 'issue-1'), continueSend(sd, 'issue-1')]);
    const tos = sent.map((m) => m.to);
    assert.equal(new Set(tos).size, tos.length, 'no address twice');
    assert.equal(tos.length, 6);
  });
  it('a refused message is counted, not retried', async () => {
    const { d, db } = deps();
    seed(db, 3);
    const { mailer, sent } = fakeMailer((m) => m.to === 'p2@example.org');
    const sd = sendDeps(d, db, { mailer, batchSize: 10 });
    const r = await startSend(sd, 'issue-1', 'u');
    assert.ok(
      r.ok && r.progress.status === 'done' && r.progress.failed === 1 && r.progress.sent === 2,
    );
    await startSend(sd, 'issue-1', 'u');
    assert.equal(sent.length, 2);
  });
  it('refuses a draft or missing issue, an empty list, and an unconfigured site', async () => {
    const { d, db } = deps();
    const sd = sendDeps(d, db);
    assert.deepEqual(await startSend(sd, 'issue-1', 'u'), { ok: false, error: 'no-subscribers' });
    seed(db, 1);
    assert.deepEqual(await startSend(sd, 'missing', 'u'), { ok: false, error: 'not-published' });
    assert.deepEqual(await continueSend(sd, 'issue-1'), { ok: false, error: 'not-started' });
    assert.deepEqual(await startSend({ ...sd, mailer: null }, 'issue-1', 'u'), {
      ok: false,
      error: 'not-configured',
    });
  });
  it('a test goes to one address, marked [Test], and is not a send', async () => {
    const { d, db, sent } = deps();
    seed(db, 2);
    const sd = sendDeps(d, db);
    assert.deepEqual(await sendTest(sd, 'issue-1', 'editor@example.org'), { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, '[Test] This week at First Church');
    const r = await startSend({ ...sd, batchSize: 10 }, 'issue-1', 'u');
    assert.ok(r.ok && r.progress.sent === 2);
  });
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Where form messages go, set in the Studio (src/lib/form-recipients.ts, PORTS.md card 174): the
// administrator gate, the confirm-before-use rule, the unconfirmed state without email, the
// confirmation page, the D1-then-secret order and the Contact form's lookup. The real SQL runs
// on node:sqlite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { sqliteD1 } from './mail-sqlite.ts';
import type { Mailer, MailMessage } from './mail-send.ts';
import {
  FORM_RECIPIENTS_DDL,
  confirmedAddresses,
  contactRecipient,
  fallbackKeys,
  handleRecipientConfirm,
  handleRecipientStudio,
  readRecipientToken,
  recipientAddressFor,
  recipientToken,
  type RecipientDeps,
} from './form-recipients.ts';

const SECRET = 'x'.repeat(40);
const NOW = Date.parse('2026-10-26T15:00:00Z');

function fakeMailer(ok = true): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    provider: 'resend',
    from: 'web@example.org',
    sent,
    async send(m) {
      sent.push(m);
      return ok ? { ok: true } : { ok: false, error: 'nope' };
    },
    async sendMany(ms) {
      return Promise.all(ms.map((m) => this.send(m)));
    },
  };
}

function setup(over: Partial<RecipientDeps> = {}) {
  const db = sqliteD1(FORM_RECIPIENTS_DDL);
  const mailer = fakeMailer();
  const deps: RecipientDeps = {
    sameOrigin: () => true,
    verify: async () => ({ id: 'u1', roles: ['administrator'] }),
    db,
    mailer,
    secret: SECRET,
    origin: 'https://site.example',
    siteName: 'Example Site',
    fallbacks: {},
    now: () => NOW,
    ...over,
  };
  return { db, mailer, deps };
}

const req = (method: string, body?: unknown) =>
  new Request('https://site.example/api/studio/form-recipients/', {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

const call = async (deps: RecipientDeps, method: string, body?: unknown) => {
  const res = await handleRecipientStudio(req(method, body), deps);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

test('migrations/*_form_recipients.sql carries FORM_RECIPIENTS_DDL', async () => {
  const dir = new URL('../../migrations/', import.meta.url);
  const file = readdirSync(dir).find((f) => /_form_recipients\.sql$/.test(f));
  assert.ok(file, 'a migrations/*_form_recipients.sql file exists');
  const sql = readFileSync(new URL(file, dir), 'utf8');
  assert.ok(sql.includes(FORM_RECIPIENTS_DDL), `copy FORM_RECIPIENTS_DDL into ${file}`);
  // Safe to apply twice: a database that already has the table is left alone.
  const db = sqliteD1(sql);
  db.raw.exec(sql);
  assert.deepEqual(await confirmedAddresses(db), {});
});

test('the gate: same origin, signed in, then an administrator, before the database', async () => {
  const { deps } = setup();
  assert.equal((await call({ ...deps, sameOrigin: () => false }, 'GET')).status, 403);
  assert.equal((await call({ ...deps, verify: async () => null }, 'GET')).status, 401);
  const editor = await call(
    { ...deps, verify: async () => ({ id: 'e', roles: ['editor'] }) },
    'GET',
  );
  assert.equal(editor.status, 403);
  assert.match(String(editor.body.error), /administrator/);
  const none = await call({ ...deps, db: null }, 'GET');
  assert.equal(none.status, 503);
  assert.equal(none.body.configured, false);
  const ok = await call(deps, 'GET');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.rows, []);
});

test('a new address waits for its link; only the confirmation page puts it to use', async () => {
  const { db, mailer, deps } = setup();
  const saved = await call(deps, 'POST', {
    action: 'set',
    key: 'events',
    name: 'Events',
    email: 'Events@Example.org',
  });
  assert.equal(saved.body.status, 'sent');
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'events@example.org');
  assert.match(mailer.sent[0].subject, /Please confirm/);
  // Not in use yet.
  assert.deepEqual(await confirmedAddresses(db), {});

  const link = /https:\/\/site\.example\/api\/form-recipient\/confirm\/\?t=(\S+)/.exec(
    mailer.sent[0].text,
  );
  assert.ok(link);
  const token = decodeURIComponent(link[1]);
  const confirmDeps = { db, secret: SECRET, siteName: 'Example Site', now: () => NOW + 60_000 };
  // Opening the link (or a mail scanner opening it) changes nothing.
  const get = await handleRecipientConfirm(
    new Request(`https://site.example/api/form-recipient/confirm/?t=${link[1]}`),
    confirmDeps,
  );
  assert.equal(get.status, 200);
  assert.match(await get.text(), /Yes, send them to me/);
  assert.deepEqual(await confirmedAddresses(db), {});
  // Pressing the button does.
  const form = new FormData();
  form.set('t', token);
  const post = await handleRecipientConfirm(
    new Request('https://site.example/api/form-recipient/confirm/', {
      method: 'POST',
      body: form,
    }),
    confirmDeps,
  );
  assert.equal(post.status, 200);
  assert.deepEqual(await confirmedAddresses(db), { events: 'events@example.org' });
});

test('without the email backbone the address is saved as unconfirmed and never used', async () => {
  const { db, deps } = setup({ mailer: null });
  const saved = await call(deps, 'POST', { action: 'set', key: 'office', email: 'o@example.org' });
  assert.equal(saved.body.status, 'unconfirmed');
  assert.equal(saved.body.canConfirm, false);
  const rows = (await call(deps, 'GET')).body.rows as { pendingStatus: string }[];
  assert.equal(rows[0].pendingStatus, 'unconfirmed');
  assert.deepEqual(await confirmedAddresses(db), {});
  // A failed send reads the same way.
  const failing = setup({ mailer: fakeMailer(false) });
  const r = await call(failing.deps, 'POST', {
    action: 'set',
    key: 'office',
    email: 'o@example.org',
  });
  assert.equal(r.body.status, 'unconfirmed');
});

test('a changed address keeps the old one in use until the new one is confirmed', async () => {
  const { db, deps } = setup();
  db.raw.exec(
    "INSERT INTO form_recipient_addresses (recipient_key, email, updated_at) VALUES ('office', 'old@example.org', 'x')",
  );
  await call(deps, 'POST', { action: 'set', key: 'office', email: 'new@example.org' });
  assert.deepEqual(await confirmedAddresses(db), { office: 'old@example.org' });
  // Cancel drops the waiting one; clear removes the row.
  await call(deps, 'POST', { action: 'cancel', key: 'office' });
  const rows = (await call(deps, 'GET')).body.rows as { pendingEmail: string | null }[];
  assert.equal(rows[0].pendingEmail, null);
  await call(deps, 'POST', { action: 'clear', key: 'office' });
  assert.deepEqual(await confirmedAddresses(db), {});
});

test('bad input is refused in plain words', async () => {
  const { deps } = setup();
  assert.equal(
    (await call(deps, 'POST', { action: 'set', key: 'Bad Key', email: 'a@b.org' })).status,
    400,
  );
  assert.equal(
    (await call(deps, 'POST', { action: 'set', key: 'office', email: 'nope' })).status,
    422,
  );
  assert.equal((await call(deps, 'POST', { action: 'resend', key: 'office' })).status, 409);
  assert.equal((await call(deps, 'POST', { action: 'shout', key: 'office' })).status, 400);
});

test('confirmation links: signed, expiring, and only for the address that is waiting', async () => {
  const t = await recipientToken(SECRET, 'office', 'A@example.org', NOW);
  assert.deepEqual((await readRecipientToken(SECRET, t, NOW))?.e, 'a@example.org');
  assert.equal(await readRecipientToken('y'.repeat(40), t, NOW), null);
  assert.equal(await readRecipientToken(SECRET, t, NOW + 8 * 86_400_000), null);
  assert.equal(await readRecipientToken(SECRET, `${t}x`, NOW), null);
  // A valid link for an address that is no longer the waiting one has run out.
  const { db } = setup();
  const res = await handleRecipientConfirm(
    new Request(`https://site.example/api/form-recipient/confirm/?t=${encodeURIComponent(t)}`),
    { db, secret: SECRET, siteName: 'Example Site', now: () => NOW },
  );
  assert.equal(res.status, 410);
});

test('where a message goes: D1 first, then the secret, then the office, then Contact', () => {
  const secret = { office: 'office-secret@example.org', events: 'events-secret@example.org' };
  assert.equal(
    recipientAddressFor('events', {}, secret, 'c@example.org'),
    'events-secret@example.org',
  );
  assert.equal(
    recipientAddressFor('events', { events: 'events-d1@example.org' }, secret, null),
    'events-d1@example.org',
  );
  assert.equal(
    recipientAddressFor('youth', { office: 'office-d1@example.org' }, secret, null),
    'office-d1@example.org',
  );
  assert.equal(recipientAddressFor('youth', {}, {}, 'c@example.org'), 'c@example.org');
  assert.equal(
    recipientAddressFor('youth', { contact: 'contact-d1@example.org' }, {}, 'c@example.org'),
    'contact-d1@example.org',
  );
  assert.equal(recipientAddressFor('youth', {}, {}, null), null);
  assert.deepEqual(fallbackKeys(secret, 'c@example.org'), {
    office: true,
    events: true,
    contact: true,
  });
});

test('no table yet: the lookup quietly finds nothing, so the secret decides', async () => {
  const bare = sqliteD1('CREATE TABLE other (id INTEGER)');
  assert.deepEqual(await confirmedAddresses(bare), {});
  assert.deepEqual(await confirmedAddresses(null), {});
});

test('a caller can name its own fallback key', () => {
  const secret = { team: 'team@example.org' };
  assert.equal(recipientAddressFor('youth', {}, secret, null, 'team'), 'team@example.org');
  assert.equal(recipientAddressFor('youth', {}, secret, null), null);
});

test('the Contact form: its confirmed row first, else CONTACT_TO, and never a pending one', async () => {
  assert.equal(await contactRecipient(null, ' c@example.org '), 'c@example.org');
  assert.equal(await contactRecipient(undefined, undefined), null);
  const bare = sqliteD1('CREATE TABLE other (id INTEGER)');
  assert.equal(await contactRecipient(bare, 'c@example.org'), 'c@example.org');
  const { db } = setup();
  db.raw.exec(
    "INSERT INTO form_recipient_addresses (recipient_key, pending_email, updated_at) VALUES ('contact', 'new@example.org', 'x')",
  );
  assert.equal(await contactRecipient(db, 'c@example.org'), 'c@example.org');
  db.raw.exec(
    "UPDATE form_recipient_addresses SET email = 'studio@example.org' WHERE recipient_key = 'contact'",
  );
  assert.equal(await contactRecipient(db, 'c@example.org'), 'studio@example.org');
  assert.equal(await contactRecipient(db, null), 'studio@example.org');
});

test('the confirmation page takes the site colours, refuses anything but #hex, and can go dark', async () => {
  const deps = {
    db: null,
    secret: null,
    siteName: 'Example Site',
    theme: { button: '#123456', heading: 'red;}body{display:none' },
    darkTheme: { background: '#000000' },
  };
  const html = await (
    await handleRecipientConfirm(new Request('https://site.example/x'), deps)
  ).text();
  assert.match(html, /--btn:#123456/);
  assert.doesNotMatch(html, /display:none/);
  assert.match(html, /prefers-color-scheme:dark/);
  const plain = await (
    await handleRecipientConfirm(new Request('https://site.example/x'), {
      ...deps,
      darkTheme: undefined,
    })
  ).text();
  assert.doesNotMatch(plain, /prefers-color-scheme/);
});

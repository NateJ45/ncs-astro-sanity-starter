// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSubmission,
  looksAutomated,
  looksLikeEmail,
  buildNotification,
  SUBMISSIONS_DDL,
} from './contact-submission.ts';

describe('validateSubmission', () => {
  it('accepts a complete submission and trims it', () => {
    const r = validateSubmission({
      name: '  Ada Lovelace  ',
      email: ' ada@example.com ',
      message: '  Hello  ',
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello',
      subject: 'Website enquiry',
      turnstileToken: null,
    });
  });

  it('names every missing field rather than failing on the first', () => {
    const r = validateSubmission({});
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'message', 'name']);
    assert.equal(r.value, null);
  });

  it('rejects an address with no domain', () => {
    assert.equal(validateSubmission({ name: 'A', email: 'nope', message: 'hi' }).ok, false);
  });

  // A hostile payload should be capped, not rejected: a real person who pastes a
  // very long message still gets through, and the database row stays sane.
  it('caps a very long message instead of refusing it', () => {
    const r = validateSubmission({
      name: 'A',
      email: 'a@b.co',
      message: 'x'.repeat(20_000),
    });
    assert.equal(r.ok, true);
    assert.equal(r.value?.message.length, 5000);
  });

  it('ignores non-string input rather than throwing on it', () => {
    const r = validateSubmission({ name: 42, email: null, message: { a: 1 } } as never);
    assert.equal(r.ok, false);
  });
});

describe('looksLikeEmail', () => {
  it('accepts the addresses real people actually have', () => {
    for (const good of [
      'a@b.co',
      'first.last@example.com',
      'name+tag@example.co.uk',
      "o'brien@example.org",
    ]) {
      assert.equal(looksLikeEmail(good), true, good);
    }
  });

  it('rejects the obvious typos', () => {
    for (const bad of [
      'plain',
      'no@domain',
      'two@@at.com',
      'spaces in@example.com',
      '@example.com',
    ]) {
      assert.equal(looksLikeEmail(bad), false, bad);
    }
  });
});

describe('looksAutomated', () => {
  const now = 1_000_000;

  it('catches a filled honeypot', () => {
    assert.deepEqual(looksAutomated({ company: 'Acme' }, now), {
      automated: true,
      reason: 'honeypot',
    });
  });

  it('catches a form submitted faster than a person could type', () => {
    assert.equal(looksAutomated({ renderedAt: now - 500 }, now).automated, true);
  });

  it('lets a normal pace through', () => {
    assert.equal(looksAutomated({ renderedAt: now - 30_000 }, now).automated, false);
  });

  // A forged or skewed timestamp from the future would otherwise compute a
  // negative elapsed time, which is not a human filling in a form either.
  it('treats a future timestamp as automated', () => {
    assert.equal(looksAutomated({ renderedAt: now + 60_000 }, now).automated, true);
  });

  it('does not punish a submission with no timestamp at all', () => {
    assert.equal(looksAutomated({}, now).automated, false);
  });
});

describe('buildNotification', () => {
  const clean = {
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Two lines\nof text',
    subject: 'Entry question',
    turnstileToken: null,
  };

  it('puts the address in the subject so a reply is possible without Reply-To', () => {
    const n = buildNotification(clean, 'Stone Steps 50K');
    assert.match(n.subject, /ada@example\.com/);
    assert.match(n.subject, /Entry question/);
  });

  it('keeps the message readable in both parts', () => {
    const n = buildNotification(clean, 'Site');
    assert.match(n.text, /Two lines\nof text/);
    assert.match(n.html, /Two lines\nof text/);
  });

  // The message is visitor-supplied and lands in an email client that renders
  // HTML. Escaping it is the difference between a contact form and a delivery
  // mechanism for whatever someone pastes into it.
  it('escapes HTML in every field a visitor controls', () => {
    const n = buildNotification(
      { ...clean, name: '<script>alert(1)</script>', message: '<img src=x onerror=y>' },
      'Site',
    );
    assert.ok(!n.html.includes('<script>'));
    assert.ok(!n.html.includes('<img src=x'));
    assert.match(n.html, /&lt;script&gt;/);
  });
});

describe('SUBMISSIONS_DDL', () => {
  // The endpoint inserts these columns by name. If the DDL loses one the insert
  // fails at runtime on a real submission, which is the worst possible moment.
  it('declares every column the endpoint writes', () => {
    for (const col of [
      'received_at',
      'name',
      'email',
      'subject',
      'message',
      'notified',
      'notify_error',
      'user_agent',
      'country',
    ]) {
      assert.match(SUBMISSIONS_DDL, new RegExp(`\\b${col}\\b`), col);
    }
  });

  it('is safe to run more than once', () => {
    assert.match(SUBMISSIONS_DDL, /CREATE TABLE IF NOT EXISTS/);
    assert.match(SUBMISSIONS_DDL, /CREATE INDEX IF NOT EXISTS/);
  });
});

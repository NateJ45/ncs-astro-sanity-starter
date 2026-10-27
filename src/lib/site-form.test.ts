// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Unit tests for the form builder's pure half (site-form.ts, PORTS.md card 194): shaping a form,
// the server's validation against the form's own questions (the shared six kinds, a date and
// "tick any that apply"), the recipient secret, the email, the ?topic= prefill and the migration
// matching the DDL.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  FORM_SUBMISSIONS_DDL,
  buildFormNotification,
  formDateLabel,
  normalizeForm,
  normalizeFormQuestions,
  parseRecipients,
  prefillAnswers,
  readFormPrefill,
  todayIn,
  validateFormSubmission,
  type SiteForm,
} from './site-form.ts';
import { recipientAddressFor } from './form-recipients.ts';
import { FIXTURE_FORMS } from './site-form-fixtures.ts';

const raw = {
  _id: 'form-visit',
  title: 'Book a visit',
  recipient: 'sales',
  questions: [
    { label: 'Which day?', kind: 'select', options: ['This week', 'Next week'], required: true },
    { label: 'Anything we should know?', kind: 'textarea' },
    { label: 'Bringing children?', kind: 'checkbox' },
    { label: 'Phone', kind: 'phone' },
    { label: '', kind: 'text' },
  ],
};

const form = normalizeForm(raw) as SiteForm;

describe('normalizeForm', () => {
  it('keeps usable questions and fills the defaults', () => {
    assert.equal(form.id, 'form-visit');
    assert.equal(form.questions.length, 4);
    assert.equal(form.mode, 'standard');
    assert.equal(form.askForContact, true);
    assert.equal(form.allowAnonymous, false);
    assert.equal(form.successMessage, 'Thank you. Your message has been sent.');
    assert.equal(form.submitLabel, 'Send');
  });
  it('gives a private form its own words and the office as the default recipient', () => {
    const p = normalizeForm({ _id: 'p', mode: 'private', allowAnonymous: true });
    assert.ok(p);
    assert.equal(p.mode, 'private');
    assert.equal(p.allowAnonymous, true);
    assert.equal(p.recipient, 'office');
    assert.match(p.successMessage, /only its recipient/);
  });
  it("reads FBC Auburn's older 'prayer' mode as private", () => {
    assert.equal(normalizeForm({ _id: 'p', mode: 'prayer' })?.mode, 'private');
  });
  it('strips stega markers from the values code compares', () => {
    assert.equal(normalizeForm({ _id: 'p', mode: 'private​‌' })?.mode, 'private');
  });
  it('has no anonymous option on a form that does not ask for a name', () => {
    const p = normalizeForm({ _id: 'p', askForContact: false, allowAnonymous: true });
    assert.equal(p?.allowAnonymous, false);
  });
  it('rejects a form with no id', () => {
    assert.equal(normalizeForm({ title: 'x' }), null);
    assert.equal(normalizeForm(null), null);
  });
  it('reads both fixture forms', () => {
    for (const f of Object.values(FIXTURE_FORMS)) assert.ok(normalizeForm(f));
    assert.equal(normalizeForm(FIXTURE_FORMS['fixture-signup'])?.questions.length, 6);
  });
});

describe('validateFormSubmission', () => {
  const good = {
    name: 'Ruth',
    email: 'ruth@example.org',
    answers: ['This week', 'We use a wheelchair', true, ''],
  };
  it('accepts a good submission and labels each answer', () => {
    const r = validateFormSubmission(form, good);
    assert.equal(r.ok, true);
    assert.deepEqual(r.value?.answers, [
      { label: 'Which day?', value: 'This week' },
      { label: 'Anything we should know?', value: 'We use a wheelchair' },
      { label: 'Bringing children?', value: 'Yes' },
    ]);
  });
  it('requires a name and a valid email when the form asks for them', () => {
    const r = validateFormSubmission(form, { ...good, name: ' ', email: 'ruth@' });
    assert.equal(r.ok, false);
    assert.ok(r.errors.name);
    assert.ok(r.errors.email);
  });
  it('refuses a required question left empty and a choice not on the list', () => {
    assert.ok(validateFormSubmission(form, { ...good, answers: [''] }).errors.q0);
    assert.ok(validateFormSubmission(form, { ...good, answers: ['Someday'] }).errors.q0);
  });
  it('checks a phone answer loosely and caps long answers', () => {
    assert.ok(
      validateFormSubmission(form, { ...good, answers: ['This week', '', false, 'call me'] }).errors
        .q3,
    );
    assert.ok(
      validateFormSubmission(form, { ...good, answers: ['This week', 'x'.repeat(2001)] }).errors.q1,
    );
  });
  it('ignores answers to questions the form does not ask', () => {
    const r = validateFormSubmission(form, {
      ...good,
      answers: [...good.answers, 'extra', 'more'],
    });
    assert.equal(r.value?.answers.length, 3);
  });
  it('drops the name and email of an anonymous private message', () => {
    const p = normalizeForm({
      _id: 'pr',
      mode: 'private',
      allowAnonymous: true,
      questions: [{ label: 'Your note', kind: 'textarea', required: true }],
    }) as SiteForm;
    const r = validateFormSubmission(p, {
      anonymous: true,
      name: 'Should vanish',
      email: 'gone@example.org',
      answers: ['Please call me back'],
    });
    assert.equal(r.ok, true);
    assert.equal(r.value?.name, '');
    assert.equal(r.value?.email, '');
    assert.equal(r.value?.anonymous, true);
  });
  it('does not honour "anonymous" on a form that does not offer it', () => {
    const r = validateFormSubmission(form, { ...good, anonymous: true, name: '' });
    assert.ok(r.errors.name);
  });
  it('refuses an entirely empty form', () => {
    const empty = normalizeForm({
      _id: 'e',
      askForContact: false,
      questions: [{ label: 'Anything?', kind: 'text' }],
    }) as SiteForm;
    assert.ok(validateFormSubmission(empty, { answers: [''] }).errors.form);
  });
  it('refuses a body that is not an answer list', () => {
    const r = validateFormSubmission(form, { ...good, answers: 'This week' });
    assert.ok(r.errors.q0);
  });
});

describe('the date and "tick any that apply" questions', () => {
  const FORM = normalizeForm({
    _id: 'f1',
    title: 'Volunteer',
    askForContact: false,
    questions: [
      { _type: 'formQuestion', label: 'Your name', kind: 'text', required: true },
      {
        _type: 'formTickQuestion',
        label: 'Which teams?',
        options: ['Kitchen', 'Children', 'Kitchen', '', 'Music'],
        required: true,
      },
      { _type: 'formDateQuestion', label: 'Start date', notPast: true },
      { _type: 'formDateQuestion', label: 'Born on', notPast: false },
    ],
  }) as SiteForm;
  // Wednesday, October 28, 2026, at 9 pm in New York (already the 29th in UTC).
  const NOW = new Date('2026-10-29T01:00:00Z');
  const ZONE = 'America/New_York';
  const post = (answers: unknown[]) =>
    validateFormSubmission(FORM, { formId: 'f1', answers }, NOW, ZONE);

  it('reads the questions in order, with the choices cleaned', () => {
    assert.deepEqual(
      FORM.questions.map((q) => q.kind),
      ['text', 'multi', 'date', 'date'],
    );
    assert.deepEqual(FORM.questions[1].options, ['Kitchen', 'Children', 'Music']);
    assert.deepEqual(
      normalizeFormQuestions([
        { _type: 'formTickQuestion', label: 'Empty', options: [] },
        { _type: 'formDateQuestion', label: '' },
      ]),
      [],
    );
  });
  it('tick any: choices on the list only; required means at least one', () => {
    const ok = post(['Ann', ['Music', 'Kitchen'], '', '']);
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.value?.answers[1], {
      label: 'Which teams?',
      value: 'Kitchen, Music',
      kind: 'multi',
      values: ['Kitchen', 'Music'],
    });
    assert.equal(post(['Ann', [], '', '']).errors.q1, 'Please tick at least one.');
    assert.equal(
      post(['Ann', ['Kitchen', 'Golf'], '', '']).errors.q1,
      'Please pick from the choices.',
    );
    assert.equal(post(['Ann', [3], '', '']).errors.q1, 'Please pick from the choices.');
    // A list longer than the choices (repeats) is refused.
    assert.equal(
      post(['Ann', ['Music', 'Music', 'Music', 'Music'], '', '']).errors.q1,
      'Please pick from the choices.',
    );
    // One choice posted on its own still counts.
    assert.equal(post(['Ann', 'Children', '', '']).ok, true);
  });
  it("a date: a real day, and not before today on the site's clock", () => {
    const ok = post(['Ann', ['Music'], '2026-10-28', '1960-02-29']);
    assert.equal(ok.ok, true, JSON.stringify(ok.errors));
    assert.deepEqual(ok.value?.answers[2], {
      label: 'Start date',
      value: 'Wednesday, October 28, 2026',
      kind: 'date',
      values: ['2026-10-28'],
    });
    assert.equal(ok.value?.answers[3].value, 'Monday, February 29, 1960');
    assert.equal(
      post(['Ann', ['Music'], '2026-10-27', '']).errors.q2,
      'Please pick today or a day after.',
    );
    assert.equal(
      post(['Ann', ['Music'], '2026-02-30', '']).errors.q2,
      'That date does not look right.',
    );
    assert.equal(
      post(['Ann', ['Music'], 'next week', '']).errors.q2,
      'That date does not look right.',
    );
    assert.equal(post(['Ann', ['Music'], '', '']).value?.answers.length, 2);
  });
  it('todayIn uses the given clock and survives an unknown zone', () => {
    assert.equal(todayIn(ZONE, NOW), '2026-10-28');
    assert.equal(todayIn('UTC', NOW), '2026-10-29');
    assert.equal(todayIn('Not/AZone', NOW), '2026-10-29');
  });
  it('the email lists the ticked choices one per line and gives the date in words', () => {
    const v = post(['Ann', ['Kitchen', 'Music'], '2026-11-01', '']).value!;
    const note = buildFormNotification(FORM, v, 'Example Site');
    assert.match(note.text, /Which teams\?\n- Kitchen\n- Music\n/);
    assert.match(note.text, /Start date\nSunday, November 1, 2026/);
    assert.match(note.html, /<ul><li>Kitchen<\/li><li>Music<\/li><\/ul>/);
  });
  it('formDateLabel refuses what is not a date', () => {
    assert.equal(formDateLabel('2026-11-01'), 'Sunday, November 1, 2026');
    assert.equal(formDateLabel('2026-13-01'), '');
    assert.equal(formDateLabel('11/01/2026'), '');
  });
});

describe('recipients', () => {
  const map = parseRecipients(
    '{"office":"office@example.org","sales":"sales@example.org","bad":"nope"}',
  );
  it('parses the secret and drops anything that is not an address', () => {
    assert.deepEqual(Object.keys(map), ['office', 'sales']);
    assert.deepEqual(parseRecipients('not json'), {});
    assert.deepEqual(parseRecipients('[1]'), {});
    assert.deepEqual(parseRecipients(undefined), {});
  });
  it('the Studio address wins, then the secret, then the office, then the contact address', () => {
    assert.equal(recipientAddressFor('sales', { sales: 'd1@example.org' }, map), 'd1@example.org');
    assert.equal(recipientAddressFor('sales', {}, map), 'sales@example.org');
    assert.equal(recipientAddressFor('team', {}, map), 'office@example.org');
    assert.equal(recipientAddressFor('team', {}, {}, 'to@example.org'), 'to@example.org');
    assert.equal(recipientAddressFor('team', {}, {}, ''), null);
  });
});

describe('buildFormNotification', () => {
  it('names the sender, lists the answers and escapes HTML', () => {
    const n = buildFormNotification(
      { title: 'Book a visit', mode: 'standard' },
      {
        formId: 'f',
        name: 'Ruth <b>',
        email: 'ruth@example.org',
        anonymous: false,
        answers: [{ label: 'Note', value: '<script>' }],
        turnstileToken: null,
      },
      'Example Site',
    );
    assert.equal(n.subject, 'Book a visit: from Ruth <b>');
    assert.equal(n.replyTo, 'ruth@example.org');
    assert.ok(n.html.includes('&lt;script&gt;'));
    assert.ok(!n.html.includes('<script>'));
  });
  it('marks a private message and says when it came without a name', () => {
    const n = buildFormNotification(
      { title: 'A private note', mode: 'private' },
      {
        formId: 'f',
        name: '',
        email: '',
        anonymous: true,
        answers: [{ label: 'Note', value: 'Hello' }],
        turnstileToken: null,
      },
      'Example Site',
    );
    assert.equal(n.subject, 'A private note: from anonymous');
    assert.equal(n.replyTo, null);
    assert.ok(n.text.includes('Sent without a name'));
    assert.ok(n.text.includes('marked private'));
  });
  it('keeps the subject on one line', () => {
    const n = buildFormNotification(
      { title: 'Hi\r\nBcc: x@example.org', mode: 'standard' },
      {
        formId: 'f',
        name: 'A',
        email: 'a@example.org',
        anonymous: false,
        answers: [],
        turnstileToken: null,
      },
      'S',
    );
    assert.ok(!/[\r\n]/.test(n.subject));
  });
});

describe('prefill from the address (?topic= and ?about=)', () => {
  const qs = normalizeForm(FIXTURE_FORMS['fixture-signup'])!.questions;
  it('reads short plain labels only', () => {
    assert.deepEqual(readFormPrefill('?topic=Setting-Up&about=%0AThe%20fair'), {
      topic: 'setting-up',
      about: 'The fair',
    });
    assert.equal(readFormPrefill(`?about=${'x'.repeat(200)}`).about.length, 80);
  });
  it('picks the first matching list answer and opens the paragraph box', () => {
    assert.deepEqual(prefillAnswers(qs, { topic: 'setting-up', about: 'the fair' }), {
      0: 'Setting up',
      2: 'About the fair: ',
    });
  });
  it('falls back to a tick box, and leaves everything alone when nothing matches', () => {
    assert.deepEqual(prefillAnswers(qs, { topic: 'second', about: '' }), { 4: 'Second week' });
    assert.deepEqual(prefillAnswers(qs, { topic: 'golf', about: '' }), {});
  });
});

describe('the D1 migration', () => {
  it('a migrations file carries FORM_SUBMISSIONS_DDL exactly', () => {
    const dir = new URL('../../migrations/', import.meta.url);
    const file = readdirSync(dir).find((f) => /^\d{4}_form_submissions\.sql$/.test(f));
    assert.ok(file, 'add migrations/<next number>_form_submissions.sql');
    const sql = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(sql.includes(FORM_SUBMISSIONS_DDL), 'copy FORM_SUBMISSIONS_DDL into the migration');
  });
});

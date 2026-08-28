// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCustomFields,
  parseCustomFieldEntries,
  MAX_CUSTOM_FIELDS,
  MAX_FIELD_LENGTH,
} from './custom-form-fields.ts';

// ── normalizeCustomFields ──────────────────────────────────────────────────

test('normalize returns an empty list for anything that is not an array', () => {
  assert.deepEqual(normalizeCustomFields(undefined), []);
  assert.deepEqual(normalizeCustomFields(null), []);
  assert.deepEqual(normalizeCustomFields('nope'), []);
});

test('normalize keeps a good question and fills the defaults', () => {
  assert.deepEqual(normalizeCustomFields([{ label: '  Your street  ', kind: 'text' }]), [
    { label: 'Your street', kind: 'text', options: [], required: false },
  ]);
});

test('normalize drops a question with no label', () => {
  assert.deepEqual(normalizeCustomFields([{ label: '   ', kind: 'text' }, { kind: 'email' }]), []);
});

test('normalize drops a dropdown with no choices', () => {
  assert.deepEqual(normalizeCustomFields([{ label: 'Pick one', kind: 'select' }]), []);
  assert.deepEqual(
    normalizeCustomFields([{ label: 'Pick one', kind: 'select', options: ['  '] }]),
    [],
  );
});

test('normalize keeps a dropdown with choices and trims them', () => {
  assert.deepEqual(
    normalizeCustomFields([
      { label: 'Pick one', kind: 'select', options: [' A ', '', 'B'], required: true },
    ]),
    [{ label: 'Pick one', kind: 'select', options: ['A', 'B'], required: true }],
  );
});

test('normalize falls back to a text box for an unknown kind', () => {
  assert.equal(normalizeCustomFields([{ label: 'Q', kind: 'rocket' }])[0].kind, 'text');
});

test('normalize caps the list at the maximum number of questions', () => {
  const many = Array.from({ length: MAX_CUSTOM_FIELDS + 5 }, (_, i) => ({
    label: `Q${i}`,
    kind: 'text',
  }));
  assert.equal(normalizeCustomFields(many).length, MAX_CUSTOM_FIELDS);
});

// ── parseCustomFieldEntries ────────────────────────────────────────────────

test('parse returns nothing for a form with no editor-defined questions', () => {
  assert.deepEqual(parseCustomFieldEntries([['message', 'hello']]), { lines: [], error: null });
});

test('parse builds one line per answered question, in form order', () => {
  const result = parseCustomFieldEntries([
    ['custom_1_label', 'Street'],
    ['custom_1', '12 Elm'],
    ['custom_0_label', 'Nickname'],
    ['custom_0', 'Sam'],
  ]);
  assert.deepEqual(result, { lines: ['Nickname: Sam', 'Street: 12 Elm'], error: null });
});

test('parse joins the values of a question that posts more than once', () => {
  const result = parseCustomFieldEntries([
    ['custom_0_label', 'Days'],
    ['custom_0', 'Monday'],
    ['custom_0', 'Friday'],
  ]);
  assert.deepEqual(result.lines, ['Days: Monday, Friday']);
});

test('parse skips an unanswered optional question', () => {
  const result = parseCustomFieldEntries([
    ['custom_0_label', 'Nickname'],
    ['custom_0', '   '],
  ]);
  assert.deepEqual(result, { lines: [], error: null });
});

test('parse rejects an unanswered required question', () => {
  const result = parseCustomFieldEntries([
    ['custom_0_label', 'Nickname'],
    ['custom_0_req', '1'],
    ['custom_0', ''],
  ]);
  assert.deepEqual(result.lines, []);
  assert.equal(result.error, 'Please answer: Nickname');
});

test('parse treats a required marker that is not "1" as optional', () => {
  const result = parseCustomFieldEntries([
    ['custom_0_label', 'Nickname'],
    ['custom_0_req', '0'],
  ]);
  assert.equal(result.error, null);
});

test('parse clips a very long answer', () => {
  const result = parseCustomFieldEntries([
    ['custom_0_label', 'Story'],
    ['custom_0', 'x'.repeat(MAX_FIELD_LENGTH + 500)],
  ]);
  assert.equal(result.lines[0], `Story: ${'x'.repeat(MAX_FIELD_LENGTH)}`);
});

test('parse rejects a post whose answers are too long in total', () => {
  const entries: Array<[string, string]> = [];
  for (let i = 0; i < 10; i += 1) {
    entries.push([`custom_${i}_label`, `Q${i}`]);
    entries.push([`custom_${i}`, 'y'.repeat(MAX_FIELD_LENGTH)]);
  }
  const result = parseCustomFieldEntries(entries);
  assert.deepEqual(result.lines, []);
  assert.equal(result.error, 'Your answers are too long. Please shorten them and try again.');
});

test('parse ignores questions past the cap instead of failing', () => {
  const entries: Array<[string, string]> = [];
  for (let i = 0; i < MAX_CUSTOM_FIELDS + 4; i += 1) {
    entries.push([`custom_${i}_label`, `Q${i}`]);
    entries.push([`custom_${i}`, 'a']);
  }
  const result = parseCustomFieldEntries(entries);
  assert.equal(result.error, null);
  assert.equal(result.lines.length, MAX_CUSTOM_FIELDS);
});

test('parse ignores a value that has no question label', () => {
  assert.deepEqual(parseCustomFieldEntries([['custom_3', 'orphan']]), { lines: [], error: null });
});

test('parse ignores names that only look like a question field', () => {
  const result = parseCustomFieldEntries([
    ['custom_abc_label', 'Fake'],
    ['custom_0_labelx', 'Fake'],
    ['custom_9999_label', 'Fake'],
  ]);
  assert.deepEqual(result, { lines: [], error: null });
});

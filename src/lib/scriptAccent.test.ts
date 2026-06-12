import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitScriptAccent } from './scriptAccent.ts';

test('returns found:false when accent is undefined', () => {
  const r = splitScriptAccent('Hello World', undefined);
  assert.equal(r.found, false);
  assert.equal(r.before, '');
  assert.equal(r.word, '');
  assert.equal(r.after, '');
});

test('returns found:false when accent is empty string', () => {
  const r = splitScriptAccent('Hello World', '');
  assert.equal(r.found, false);
});

test('returns found:false when accent is not in headline', () => {
  const r = splitScriptAccent('Hello World', 'beautiful');
  assert.equal(r.found, false);
});

test('returns found:true and correct slices when accent is found', () => {
  const r = splitScriptAccent('Design That Feels Like You', 'Feels');
  assert.equal(r.found, true);
  assert.equal(r.before, 'Design That ');
  assert.equal(r.word, 'Feels');
  assert.equal(r.after, ' Like You');
});

test('before + word + after reconstructs the original headline', () => {
  const headline = 'Good design starts with a real conversation.';
  const accent = 'real';
  const r = splitScriptAccent(headline, accent);
  assert.equal(r.found, true);
  assert.equal(r.before + r.word + r.after, headline);
});

test('accent not in headline returns found:false', () => {
  const r = splitScriptAccent('Simple headline', 'missing');
  assert.equal(r.found, false);
});

test('match is case-sensitive (no match on wrong case)', () => {
  const r = splitScriptAccent('Hello World', 'hello');
  assert.equal(r.found, false);
});

test('match is case-sensitive (correct case matches)', () => {
  const r = splitScriptAccent('Hello World', 'Hello');
  assert.equal(r.found, true);
  assert.equal(r.word, 'Hello');
});

test('only the first occurrence is matched', () => {
  const r = splitScriptAccent('love what you love', 'love');
  assert.equal(r.found, true);
  assert.equal(r.before, '');
  assert.equal(r.word, 'love');
  assert.equal(r.after, ' what you love');
});

test('accent at start of headline', () => {
  const r = splitScriptAccent('Design is everything', 'Design');
  assert.equal(r.found, true);
  assert.equal(r.before, '');
  assert.equal(r.word, 'Design');
  assert.equal(r.after, ' is everything');
});

test('accent at end of headline', () => {
  const r = splitScriptAccent('Everything is Design', 'Design');
  assert.equal(r.found, true);
  assert.equal(r.before, 'Everything is ');
  assert.equal(r.word, 'Design');
  assert.equal(r.after, '');
});

test('accent is the entire headline', () => {
  const r = splitScriptAccent('Design', 'Design');
  assert.equal(r.found, true);
  assert.equal(r.before, '');
  assert.equal(r.word, 'Design');
  assert.equal(r.after, '');
});

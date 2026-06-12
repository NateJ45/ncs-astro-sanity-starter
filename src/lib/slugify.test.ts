import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slugify.ts';

test('basic lowercase and hyphen conversion', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('diacritics are stripped', () => {
  assert.equal(slugify('Cafe'), 'cafe');
  assert.equal(slugify('naïve'), 'naive');
  assert.equal(slugify('resumé'), 'resume');
  assert.equal(slugify('Zürcher'), 'zurcher');
  assert.equal(slugify('fiancée'), 'fiancee');
});

test('repeated hyphens are collapsed to one', () => {
  assert.equal(slugify('hello   world'), 'hello-world');
  assert.equal(slugify('a--b'), 'a-b');
});

test('leading and trailing hyphens are stripped', () => {
  assert.equal(slugify(' hello '), 'hello');
  assert.equal(slugify('-hello-'), 'hello');
});

test('special characters are removed', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('Title: Subtitle'), 'title-subtitle');
  assert.equal(slugify("It's a test"), 'its-a-test');
});

test('numbers are preserved', () => {
  assert.equal(slugify('Section 2'), 'section-2');
  assert.equal(slugify('Top 10 Tips'), 'top-10-tips');
});

test('empty string returns empty string', () => {
  assert.equal(slugify(''), '');
});

test('whitespace-only string returns empty string', () => {
  assert.equal(slugify('   '), '');
});

test('already a valid slug passes through unchanged', () => {
  assert.equal(slugify('hello-world'), 'hello-world');
});

test('output is truncated at 64 characters', () => {
  const long = 'a'.repeat(70);
  assert.equal(slugify(long).length, 64);
});

test('mixed case is lowercased', () => {
  assert.equal(slugify('TypeScript ESLint'), 'typescript-eslint');
});

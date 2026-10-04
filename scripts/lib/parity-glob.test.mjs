// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExclude } from './parity-glob.mjs';

test('blog/tag/** matches blog/tag/advent and blog/tag/a/b, not blog/tags', () => {
  const isExcluded = parseExclude('blog/tag/**');
  assert.equal(isExcluded('blog/tag/advent'), true);
  assert.equal(isExcluded('blog/tag/a/b'), true);
  assert.equal(isExcluded('blog/tags'), false);
});

test('blog/category/**/page/** matches a paginated category page, not the category index', () => {
  const isExcluded = parseExclude('blog/category/**/page/**');
  assert.equal(isExcluded('blog/category/sermon-preview/page/2'), true);
  assert.equal(isExcluded('blog/category/sermon-preview'), false);
});

test('an explicit path with no wildcard matches itself only', () => {
  const isExcluded = parseExclude('post/handel-s-messiah-sing-in-carols');
  assert.equal(isExcluded('post/handel-s-messiah-sing-in-carols'), true);
  assert.equal(isExcluded('post/handel-s-messiah-sing-in-carols/extra'), false);
  assert.equal(isExcluded('post/another-post'), false);
});

test('empty/undefined spec excludes nothing', () => {
  assert.equal(parseExclude(undefined)('anything'), false);
  assert.equal(parseExclude('')('anything'), false);
});

test('a comma-separated list combines multiple globs with OR', () => {
  const isExcluded = parseExclude('blog/page/**,blog/tag/**,blog/category/**/page/**');
  assert.equal(isExcluded('blog/page/2'), true);
  assert.equal(isExcluded('blog/tag/advent'), true);
  assert.equal(isExcluded('blog/category/sermon-preview/page/3'), true);
  assert.equal(isExcluded('blog/category/sermon-preview'), false);
  assert.equal(isExcluded('home'), false);
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTrailingSlash } from './href.ts';

test('adds the slash to internal pages', () => {
  assert.equal(withTrailingSlash('/about'), '/about/');
  assert.equal(withTrailingSlash('/journal/spring-refresh'), '/journal/spring-refresh/');
});

test('keeps the slash before a query or hash', () => {
  assert.equal(withTrailingSlash('/contact?type=a'), '/contact/?type=a');
  assert.equal(withTrailingSlash('/services#kitchens'), '/services/#kitchens');
  assert.equal(withTrailingSlash('/search?q=a%20b'), '/search/?q=a%20b');
});

test('leaves slashed, root, files, anchors, schemes, externals, studio and api alone', () => {
  for (const h of [
    '/',
    '/about/',
    '/contact/?x=1',
    '/sitemap-index.xml',
    '/files/guide.pdf',
    '#top',
    'mailto:a@b.co',
    'tel:+15555550100',
    'https://example.org/a',
    '//cdn.example.org/a',
    '/studio',
    '/studio/structure',
    '/api/draft-mode/disable',
  ]) {
    assert.equal(withTrailingSlash(h), h);
  }
});

test('passes through empty values', () => {
  assert.equal(withTrailingSlash(undefined), undefined);
  assert.equal(withTrailingSlash(null), undefined);
});

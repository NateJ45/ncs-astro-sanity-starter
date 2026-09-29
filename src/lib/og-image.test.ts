// Unit tests for the build-time share card picker (PORTS.md card 59).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OG_PATH, ogImageForRoute, ogPathForRoute, servedOgPaths } from './og-image.ts';

test('route pathnames map to the og:pages naming convention', () => {
  assert.equal(ogPathForRoute('/'), '/og/home.png');
  assert.equal(ogPathForRoute(''), '/og/home.png');
  assert.equal(ogPathForRoute('/contact'), '/og/contact.png');
  assert.equal(ogPathForRoute('/contact/'), '/og/contact.png');
  assert.equal(ogPathForRoute('/journal/my-post'), '/og/journal-my-post.png');
});

test('a route whose card exists gets its own card', () => {
  const available = new Set(['/og/home.png', '/og/contact.png']);
  assert.equal(ogImageForRoute('/', available), '/og/home.png');
  assert.equal(ogImageForRoute('/contact', available), '/og/contact.png');
});

test('a route with no card falls back to the default instead of a 404', () => {
  // The bug this module exists for: the path used to be returned whether or
  // not the file was there, so share previews pointed at a missing image.
  const available = new Set(['/og/home.png']);
  assert.equal(ogImageForRoute('/some-custom-page', available), DEFAULT_OG_PATH);
  assert.equal(ogImageForRoute('/journal/no-cover-photo', available), DEFAULT_OG_PATH);
});

test('with no generated cards at all, every route uses the default', () => {
  // A fresh fork: public/og/ is empty until `npm run og:pages` runs.
  const none = new Set<string>();
  assert.equal(ogImageForRoute('/', none), DEFAULT_OG_PATH);
  assert.equal(ogImageForRoute('/about', none), DEFAULT_OG_PATH);
});

test('glob keys become served paths, and nothing outside /public/og/ leaks in', () => {
  const served = servedOgPaths([
    '/public/og/home.png',
    '/public/og/journal-my-post.png',
    '/public/og-default.png',
    '/src/assets/og/home.png',
  ]);
  assert.deepEqual([...served].sort(), ['/og/home.png', '/og/journal-my-post.png']);
});

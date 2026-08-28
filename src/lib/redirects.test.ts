// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// redirects - path normalization + map building
// =============================================================================
// These helpers are shared by the BUILD (astro.config.mjs turns the editor's
// `redirect` docs into the Astro redirects map) and the STUDIO (the publish
// action files a redirect automatically when a page slug changes). If the two
// disagreed about what "/old-page/" means, an auto-filed redirect would sit in
// the Studio looking correct and never fire. Hence the tests.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRedirectPath, isExternalTarget, buildRedirectMap } from './redirects.ts';

test('normalizeRedirectPath adds the leading slash and drops the trailing one', () => {
  assert.equal(normalizeRedirectPath('old-page'), '/old-page');
  assert.equal(normalizeRedirectPath('/old-page/'), '/old-page');
  assert.equal(normalizeRedirectPath('/old-page'), '/old-page');
});

test('normalizeRedirectPath collapses doubled slashes and trims whitespace', () => {
  assert.equal(normalizeRedirectPath('  /studio//tour/  '), '/studio/tour');
});

test('normalizeRedirectPath keeps the root as "/"', () => {
  assert.equal(normalizeRedirectPath('/'), '/');
  assert.equal(normalizeRedirectPath('///'), '/');
});

test('normalizeRedirectPath drops the query string and fragment', () => {
  assert.equal(normalizeRedirectPath('/a/b?utm_source=fb#top'), '/a/b');
  assert.equal(normalizeRedirectPath('/?q=1'), '/');
});

test('external targets are left untouched', () => {
  assert.equal(normalizeRedirectPath('https://example.org/x/'), 'https://example.org/x/');
  assert.equal(isExternalTarget('http://example.org'), true);
  assert.equal(isExternalTarget('/contact'), false);
});

test('normalizeRedirectPath returns null for nothing usable', () => {
  assert.equal(normalizeRedirectPath(''), null);
  assert.equal(normalizeRedirectPath('   '), null);
  assert.equal(normalizeRedirectPath(undefined), null);
  assert.equal(normalizeRedirectPath(42), null);
});

test('buildRedirectMap makes 301s by default and 302s when "permanent" is off', () => {
  assert.deepEqual(buildRedirectMap([{ from: '/a', to: '/b' }]), {
    '/a': { status: 301, destination: '/b' },
  });
  assert.deepEqual(buildRedirectMap([{ from: '/a', to: '/b', permanent: false }]), {
    '/a': { status: 302, destination: '/b' },
  });
});

test('buildRedirectMap normalizes both sides so "/a/" and "/a" are one key', () => {
  assert.deepEqual(buildRedirectMap([{ from: '/a/', to: 'b/' }]), {
    '/a': { status: 301, destination: '/b' },
  });
});

test('buildRedirectMap drops self-redirects, however they were typed', () => {
  assert.deepEqual(buildRedirectMap([{ from: '/a', to: '/a/' }]), {});
});

test('buildRedirectMap drops half-filled entries and external left-hand sides', () => {
  assert.deepEqual(
    buildRedirectMap([
      { from: '/a' },
      { to: '/b' },
      { from: '', to: '/b' },
      { from: 'https://example.org/a', to: '/b' },
    ]),
    {},
  );
});

test('buildRedirectMap allows an external destination', () => {
  assert.deepEqual(buildRedirectMap([{ from: '/shop', to: 'https://example.org/shop' }]), {
    '/shop': { status: 301, destination: 'https://example.org/shop' },
  });
});

test('buildRedirectMap lets a later entry win for the same source path', () => {
  assert.deepEqual(
    buildRedirectMap([
      { from: '/a', to: '/old' },
      { from: '/a/', to: '/new' },
    ]),
    { '/a': { status: 301, destination: '/new' } },
  );
});

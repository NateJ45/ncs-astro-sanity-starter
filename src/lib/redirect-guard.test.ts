// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for the live-page guard on the editor redirect map
// (src/lib/redirect-guard.ts, PORTS.md card 22). The path rules themselves are
// tested in redirects.test.ts. Folded back from reid-design-site 2026-09-29,
// where these ran under vitest; node:test here, same assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRedirectMap } from './redirects.ts';
import { dropRedirectsOverLivePages } from './redirect-guard.ts';

test('a rename and a rename back does not leave a loop over the live page', () => {
  // Step 1 filed a -> b, step 2 filed b -> a, and the page now lives at /a.
  const map = buildRedirectMap([
    { from: '/kitchen-refresh', to: '/kitchen-remodel' },
    { from: '/kitchen-remodel', to: '/kitchen-refresh' },
  ]);
  const { redirects, dropped } = dropRedirectsOverLivePages(map, ['/kitchen-refresh']);
  assert.deepEqual(redirects, {
    '/kitchen-remodel': { status: 301, destination: '/kitchen-refresh' },
  });
  assert.deepEqual(dropped, ['/kitchen-refresh']);
});

test('live paths are normalized the same way the map keys are', () => {
  const map = buildRedirectMap([{ from: '/a', to: '/b' }]);
  assert.deepEqual(dropRedirectsOverLivePages(map, ['a/']).dropped, ['/a']);
  assert.deepEqual(dropRedirectsOverLivePages(map, ['/a/']).dropped, ['/a']);
});

test('redirects from addresses no page uses are kept, and junk live paths are ignored', () => {
  const map = buildRedirectMap([{ from: '/old', to: '/new' }]);
  const { redirects, dropped } = dropRedirectsOverLivePages(map, ['/new', null, undefined, '']);
  assert.deepEqual(redirects, { '/old': { status: 301, destination: '/new' } });
  assert.deepEqual(dropped, []);
});

test('an empty map stays empty', () => {
  assert.deepEqual(dropRedirectsOverLivePages({}, ['/a']), { redirects: {}, dropped: [] });
});

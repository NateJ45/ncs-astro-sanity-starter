// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeCardRequest,
  encodeCardRequest,
  readCardRequest,
  replaceShareImage,
  routeForFile,
  stripCardMarker,
  versionShareImage,
} from './og-build.mjs';

const page = (marker, og = 'https://site.test/og/plan-your-visit.jpg') =>
  `<head><title>x</title>${marker ? `<meta name="x-og-card" content="${marker}">` : ''}<meta property="og:image" content="${og}"><meta name="twitter:image" content="${og}"></head>`;

test('a card request survives the round trip, quotes and accents included', () => {
  const req = { title: 'Winter open day: "Come in" & café', kicker: 'Journal' };
  assert.deepEqual(decodeCardRequest(encodeCardRequest(req)), { ...req, home: false });
  assert.equal(decodeCardRequest('not-json'), null);
  assert.equal(decodeCardRequest(encodeCardRequest({ title: '  ' })), null);
});

test('reads the request and the file its og:image names', () => {
  const html = page(encodeCardRequest({ title: 'Plan your visit', kicker: 'Visit' }));
  assert.deepEqual(readCardRequest(html), {
    title: 'Plan your visit',
    kicker: 'Visit',
    home: false,
    file: 'plan-your-visit.jpg',
  });
  assert.equal(readCardRequest(page(null)), null, 'no marker, no card');
  assert.equal(
    readCardRequest(page(encodeCardRequest({ title: 'x' }), 'https://cdn.sanity.io/a.jpg')),
    null,
    'a page sharing its own picture is left alone',
  );
});

test('strips the marker, versions the card URL, or falls back to og-default', () => {
  const html = page(encodeCardRequest({ title: 'Plan your visit' }));
  const stripped = stripCardMarker(html);
  assert.ok(!stripped.includes('x-og-card'));
  const v = versionShareImage(stripped, 'plan-your-visit.jpg', 'abc12345');
  assert.equal(v.match(/plan-your-visit\.jpg\?v=abc12345"/g)?.length, 2, 'og and twitter');
  const f = replaceShareImage(stripped, 'plan-your-visit.jpg', 'https://site.test/og-default.png');
  assert.equal(f.match(/og-default\.png"/g)?.length, 2);
  assert.ok(!f.includes('plan-your-visit.jpg'));
});

test('maps built files to routes', () => {
  assert.equal(routeForFile('index.html'), '/');
  assert.equal(routeForFile('about/index.html'), '/about/');
  assert.equal(routeForFile('404.html'), '/404');
});

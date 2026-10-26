// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardPathForRoute, encodeCardRequest, resolveShareImage } from './og-card-marker.ts';

const base = {
  prerendered: true,
  pathname: '/plan-your-visit/',
  card: { title: 'Plan your visit' },
};

test('card paths follow the route', () => {
  assert.equal(cardPathForRoute('/'), '/og/home.jpg');
  assert.equal(cardPathForRoute('/about/'), '/og/about.jpg');
  assert.equal(cardPathForRoute('/journal/series/hope/'), '/og/journal-series-hope.jpg');
  assert.equal(cardPathForRoute('/404'), '/og/404.jpg');
});

test('the marker is base64url JSON, same as the build decodes', () => {
  const m = encodeCardRequest({ title: 'Café & "friends"', kicker: 'News' });
  assert.match(m, /^[A-Za-z0-9_-]+$/);
  const json = JSON.parse(Buffer.from(m, 'base64url').toString('utf8'));
  assert.deepEqual(json, { title: 'Café & "friends"', kicker: 'News' });
});

test('order: own picture, own share image, the card, the site default, og-default', () => {
  assert.deepEqual(resolveShareImage({ ...base, pageImage: 'https://cdn/x.jpg' }), {
    url: 'https://cdn/x.jpg',
    marker: null,
  });
  assert.equal(
    resolveShareImage({ ...base, pageShareImage: 'https://cdn/s.jpg' }).url,
    'https://cdn/s.jpg',
  );
  const card = resolveShareImage({ ...base, siteDefault: 'https://cdn/d.jpg' });
  assert.equal(card.url, '/og/plan-your-visit.jpg');
  assert.ok(card.marker, 'the build is asked to draw it');
  const ssr = { ...base, prerendered: false };
  assert.deepEqual(resolveShareImage({ ...ssr, siteDefault: 'https://cdn/d.jpg' }), {
    url: 'https://cdn/d.jpg',
    marker: null,
  });
  assert.equal(resolveShareImage(ssr).url, '/og-default.png');
  assert.equal(resolveShareImage({ ...base, card: { title: ' ' } }).url, '/og-default.png');
});

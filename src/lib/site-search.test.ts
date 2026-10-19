// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  typeLabel,
  typePlural,
  typeFilters,
  excerptParts,
  resultHref,
  statusText,
  toResultView,
} from './site-search.ts';

test('type labels: known, unknown and empty', () => {
  assert.equal(typeLabel('sermon'), 'Sermon');
  assert.equal(typeLabel('Sermon'), 'Sermon');
  assert.equal(typeLabel('youth-camp'), 'Youth Camp');
  assert.equal(typeLabel(''), 'Page');
  assert.equal(typeLabel(undefined), 'Page');
  assert.equal(typePlural('news'), 'News');
  assert.equal(typePlural('sermon'), 'Sermons');
});

test('typeFilters orders known types and drops empty ones', () => {
  const rows = typeFilters({ type: { news: 2, sermon: 3, page: 5, zebra: 1, question: 0 } });
  assert.deepEqual(
    rows.map((r) => r.type),
    ['page', 'sermon', 'news', 'zebra'],
  );
  assert.equal(rows[1].label, 'Sermons');
  assert.equal(rows[1].count, 3);
});

test('typeFilters offers no row when there is only one type', () => {
  assert.deepEqual(typeFilters({ type: { page: 4 } }), []);
  assert.deepEqual(typeFilters(undefined), []);
});

test('excerptParts keeps marks and never passes markup through', () => {
  assert.deepEqual(excerptParts('the <mark>grace</mark> of God'), [
    { text: 'the ', mark: false },
    { text: 'grace', mark: true },
    { text: ' of God', mark: false },
  ]);
  const evil = excerptParts('a <img src=x onerror=alert(1)><mark>b</mark> &lt;script&gt;');
  assert.equal(evil.map((p) => p.text).join(''), 'a b <script>');
  assert.ok(evil.every((p) => !p.text.includes('<img')));
  assert.deepEqual(excerptParts(''), []);
});

test('resultHref keeps the trailing slash and the anchor', () => {
  assert.equal(resultHref('/sermons/grace/'), '/sermons/grace/');
  assert.equal(resultHref('/about/index.html'), '/about/');
  assert.equal(resultHref('/about'), '/about/');
  assert.equal(resultHref('/faq/#visiting'), '/faq/#visiting');
  assert.equal(resultHref('/files/bulletin.pdf'), '/files/bulletin.pdf');
  assert.equal(resultHref(''), '/');
});

test('statusText reads well for screen readers', () => {
  assert.equal(
    statusText(0, 'zzz'),
    'Nothing found for "zzz". Try a shorter word or a different spelling.',
  );
  assert.equal(statusText(1, ' grace '), '1 result for "grace".');
  assert.equal(statusText(4, 'grace', 'Sermons'), '4 results for "grace" in Sermons.');
  assert.equal(statusText(3, '  '), '');
});

test('toResultView maps a Pagefind result', () => {
  const view = toResultView({
    url: '/sermons/grace/',
    excerpt: 'by <mark>grace</mark>',
    meta: { title: 'Saved by grace', date: 'October 12, 2026', passage: 'Ephesians 2:1-10' },
    filters: { type: ['sermon'] },
  });
  assert.equal(view.href, '/sermons/grace/');
  assert.equal(view.title, 'Saved by grace');
  assert.equal(view.typeLabel, 'Sermon');
  assert.equal(view.date, 'October 12, 2026');
  assert.equal(view.passage, 'Ephesians 2:1-10');
  assert.equal(view.excerpt.length, 2);
  const bare = toResultView({ url: '/x/' });
  assert.equal(bare.type, 'page');
  assert.equal(bare.title, 'Untitled page');
});

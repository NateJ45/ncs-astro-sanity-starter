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
  expandBibleRef,
  expandQuery,
  fallbackTerms,
  mergeResults,
  editDistance,
  suggestCorrection,
  correctedStatusText,
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

test('toResultView carries a file result’s format and source page', () => {
  const view = toResultView({
    url: 'https://cdn.sanity.io/files/p/d/abc.pdf',
    meta: { title: 'Bulletin for October 12', format: 'PDF', source: 'Bulletins' },
    filters: { type: ['bulletin'] },
  });
  assert.equal(view.href, 'https://cdn.sanity.io/files/p/d/abc.pdf');
  assert.equal(view.typeLabel, 'Bulletin');
  assert.equal(view.format, 'PDF');
  assert.equal(view.source, 'Bulletins');
  assert.equal(typePlural('notes'), 'Sermon notes');
});

test('expandBibleRef spells out book abbreviations', () => {
  assert.equal(expandBibleRef('Jn 3:16'), 'John 3:16');
  assert.equal(expandBibleRef('1cor 13'), '1 Corinthians 13');
  assert.equal(expandBibleRef('II Tim 2'), '2 Timothy 2');
  assert.equal(expandBibleRef('ps. 23'), 'Psalms 23');
  assert.equal(expandBibleRef('rev'), 'Revelation');
  // Names and words stay unless a chapter follows.
  assert.equal(expandBibleRef('pastor Tim'), 'pastor Tim');
  assert.equal(expandBibleRef('Dan 7'), 'Daniel 7');
  assert.equal(expandBibleRef('youth camp'), 'youth camp');
  assert.equal(expandBibleRef('John 3'), 'John 3');
});

test('expandQuery swaps synonyms and phrases, whole words only', () => {
  const groups = [
    ['kids', 'children', 'nursery'],
    ['VBS', 'Vacation Bible School'],
  ];
  assert.deepEqual(expandQuery('kids ministry', groups), ['children ministry', 'nursery ministry']);
  assert.deepEqual(expandQuery('vacation bible school dates', groups), ['VBS dates']);
  assert.deepEqual(expandQuery('skids', groups), []);
  assert.deepEqual(expandQuery('Jn 3', groups), ['John 3']);
  assert.deepEqual(expandQuery('', groups), []);
});

test('fallbackTerms splits a multi-word search into its meaningful words', () => {
  assert.deepEqual(fallbackTerms('where is the youth zzzz'), ['youth', 'zzzz']);
  assert.deepEqual(fallbackTerms('grace'), []);
  assert.deepEqual(fallbackTerms('the grace'), []);
});

test('mergeResults keeps the first list and adds new ones by score', () => {
  const merged = mergeResults([
    [{ id: 'a', score: 1 }],
    [
      { id: 'b', score: 2 },
      { id: 'a', score: 9 },
    ],
    [{ id: 'c', score: 5 }],
  ]);
  assert.deepEqual(
    merged.map((r) => r.id),
    ['a', 'c', 'b'],
  );
});

test('editDistance counts swaps as one edit and stops early', () => {
  assert.equal(editDistance('baptsim', 'baptism'), 1);
  assert.equal(editDistance('grace', 'grace'), 0);
  assert.equal(editDistance('kitten', 'sitting', 3), 3);
  assert.equal(editDistance('a', 'abcdef', 2), 3);
});

test('suggestCorrection fixes typos against the site’s own words', () => {
  const vocab = [
    ['baptism', 12],
    ['worship', 30],
    ['grace', 20],
    ['brace', 1],
    ['children', 8],
  ] as const;
  assert.equal(suggestCorrection('baptsim', vocab), 'baptism');
  assert.equal(suggestCorrection('Worshp times', vocab), 'Worship times');
  assert.equal(suggestCorrection('grase', vocab), 'grace');
  assert.equal(suggestCorrection('grace', vocab), null);
  assert.equal(suggestCorrection('chil', vocab), null);
  assert.equal(suggestCorrection('zzzzzzz', vocab), null);
  assert.equal(suggestCorrection('baptsim', []), null);
});

test('correctedStatusText says what was searched instead', () => {
  assert.equal(
    correctedStatusText(3, 'baptism', 'baptsim'),
    'Nothing found for "baptsim". Showing 3 results for "baptism".',
  );
});

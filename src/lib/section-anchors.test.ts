// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorSlug, sectionAnchors, sectionHeadingText } from './section-anchors.ts';

test('a heading becomes a lowercase hyphenated name', () => {
  assert.equal(anchorSlug('Our story'), 'our-story');
  assert.equal(anchorSlug('  Café & Bakery, since 1990! '), 'cafe-bakery-since-1990');
});

test('stega characters from the preview do not change the name', () => {
  assert.equal(anchorSlug('Our story​‌‍﻿​'), 'our-story');
});

test('a long heading is cut at a word break', () => {
  const slug = anchorSlug(
    'What to expect on your very first visit, from parking to the coffee afterwards',
  );
  assert.ok(slug.length <= 48, slug);
  assert.ok(!slug.endsWith('-'), slug);
  assert.equal(slug, 'what-to-expect-on-your-very-first-visit-from');
});

test('a name never starts with a digit', () => {
  assert.equal(anchorSlug('3 things to know'), 'section-3-things-to-know');
});

test('no letters or digits means no name', () => {
  assert.equal(anchorSlug('!!!'), '');
  assert.equal(anchorSlug(undefined), '');
});

test('heading text reads heading, then headline, strings only', () => {
  assert.equal(sectionHeadingText({ heading: 'A', headline: 'B' }), 'A');
  assert.equal(sectionHeadingText({ headline: 'B' }), 'B');
  assert.equal(sectionHeadingText({ heading: '  ', headline: [{ _type: 'block' }] }), undefined);
  assert.equal(sectionHeadingText(null), undefined);
});

test('names are unique on the page and unnamed sections keep their number', () => {
  const ids = sectionAnchors([
    { heading: 'Welcome', fallback: 'about-0' },
    { heading: 'Our story', fallback: 'about-1' },
    { fallback: 'about-2' },
    { heading: 'Our story', fallback: 'about-3' },
    { heading: 'Main', fallback: 'about-4' },
  ]);
  assert.deepEqual(ids, ['welcome', 'our-story', 'about-2', 'our-story-2', 'main-2']);
});

test('a name never takes an unnamed section’s numbered id', () => {
  const ids = sectionAnchors([{ heading: 'Page 1', fallback: 'page-0' }, { fallback: 'page-1' }]);
  assert.deepEqual(ids, ['page-1-2', 'page-1']);
});

test('an override by block key wins over the heading', () => {
  const ids = sectionAnchors(
    [
      { key: 'k1', heading: 'Kids and youth on Sunday', fallback: 'page-0' },
      { key: 'k2', heading: 'Kids', fallback: 'page-1' },
    ],
    { overrides: { k1: 'kids' }, reserved: ['contact-form'] },
  );
  assert.deepEqual(ids, ['kids', 'kids-2']);
});

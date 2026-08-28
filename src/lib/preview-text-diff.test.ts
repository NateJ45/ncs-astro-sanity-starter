// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffStringFields, DEFAULT_DIFF_LIMITS } from './preview-text-diff.ts';

const doc = (over: Record<string, unknown> = {}) => ({
  _id: 'drafts.homePage',
  _type: 'homePage',
  _rev: 'r1',
  heroHeadline: 'Welcome',
  heroSubhead: 'A school in the city',
  ...over,
});

test('reports a changed top-level string', () => {
  assert.deepEqual(diffStringFields(doc(), doc({ heroHeadline: 'Welcome home' })), [
    { path: 'heroHeadline', previous: 'Welcome', next: 'Welcome home' },
  ]);
});

test('reports nothing when nothing readable changed', () => {
  assert.deepEqual(diffStringFields(doc(), doc()), []);
  // A new revision on every save must not look like an edit.
  assert.deepEqual(diffStringFields(doc(), doc({ _rev: 'r2' })), []);
});

test('finds a string inside a keyed section and names its studio path', () => {
  const before = doc({
    flexibleSections: [
      { _key: 'a1', _type: 'sectionProse', heading: 'Our story', body: 'Since 1959' },
      { _key: 'b2', _type: 'sectionProse', heading: 'Our people' },
    ],
  });
  const after = doc({
    flexibleSections: [
      { _key: 'a1', _type: 'sectionProse', heading: 'Our story', body: 'Since 1958' },
      { _key: 'b2', _type: 'sectionProse', heading: 'Our people' },
    ],
  });
  assert.deepEqual(diffStringFields(before, after), [
    { path: 'flexibleSections[_key=="a1"].body', previous: 'Since 1959', next: 'Since 1958' },
  ]);
});

test('matches array items by key, so a reorder reports nothing', () => {
  const items = [
    { _key: 'a1', _type: 'sectionProse', heading: 'One' },
    { _key: 'b2', _type: 'sectionProse', heading: 'Two' },
  ];
  const before = doc({ flexibleSections: items });
  const after = doc({ flexibleSections: [items[1], items[0]] });
  assert.deepEqual(diffStringFields(before, after), []);
});

test('descends through nested objects', () => {
  const before = doc({ cta: { label: 'Visit', href: '/visit' } });
  const after = doc({ cta: { label: 'Book a tour', href: '/visit' } });
  assert.deepEqual(diffStringFields(before, after), [
    { path: 'cta.label', previous: 'Visit', next: 'Book a tour' },
  ]);
});

test('uses index segments for a keyless array', () => {
  const before = doc({ bullets: [{ text: 'One' }, { text: 'Two' }] });
  const after = doc({ bullets: [{ text: 'One' }, { text: 'Three' }] });
  assert.deepEqual(diffStringFields(before, after), [
    { path: 'bullets[1].text', previous: 'Two', next: 'Three' },
  ]);
});

test('steps over portable text entirely — the rich twins are the refresh’s job', () => {
  const block = (text: string) => [
    {
      _key: 'blk',
      _type: 'block',
      style: 'normal',
      children: [{ _key: 'sp', _type: 'span', text, marks: [] }],
    },
  ];
  const before = doc({ introRich: block('Since 1959') });
  const after = doc({ introRich: block('Since 1958') });
  assert.deepEqual(diffStringFields(before, after), []);
});

test('ignores values that are not text on the page', () => {
  assert.deepEqual(diffStringFields(doc({ limit: 3 }), doc({ limit: 6 })), []);
  assert.deepEqual(diffStringFields(doc({ featured: false }), doc({ featured: true })), []);
});

test('ignores a field that appears or disappears — there is no node to swap', () => {
  assert.deepEqual(diffStringFields(doc(), doc({ eyebrow: 'New' })), []);
  assert.deepEqual(diffStringFields(doc({ eyebrow: 'Old' }), doc({ eyebrow: null })), []);
});

test('reports an emptied string, which does have a node to swap', () => {
  assert.deepEqual(diffStringFields(doc({ eyebrow: 'Old' }), doc({ eyebrow: '' })), [
    { path: 'eyebrow', previous: 'Old', next: '' },
  ]);
});

test('stops at the change cap', () => {
  const many = (suffix: string) =>
    Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, `value ${i}${suffix}`]));
  const found = diffStringFields(many(''), many('!'), { ...DEFAULT_DIFF_LIMITS, maxChanges: 5 });
  assert.equal(found.length, 5);
});

test('stops at the depth cap rather than chasing a deep document', () => {
  const nest = (depth: number, leaf: string): unknown =>
    depth === 0 ? leaf : { down: nest(depth - 1, leaf) };
  assert.deepEqual(diffStringFields(nest(3, 'a'), nest(3, 'b'), DEFAULT_DIFF_LIMITS), [
    { path: 'down.down.down', previous: 'a', next: 'b' },
  ]);
  assert.deepEqual(diffStringFields(nest(40, 'a'), nest(40, 'b'), DEFAULT_DIFF_LIMITS), []);
});

test('skips a string longer than the cap', () => {
  const long = 'x'.repeat(DEFAULT_DIFF_LIMITS.maxLength + 1);
  assert.deepEqual(diffStringFields(doc({ essay: long }), doc({ essay: `${long}y` })), []);
});

test('survives a document that is not an object at all', () => {
  assert.deepEqual(diffStringFields(null, doc()), []);
  assert.deepEqual(diffStringFields(undefined, undefined), []);
});

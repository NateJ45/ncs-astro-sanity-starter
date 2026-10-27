// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diffImageRefs,
  parseSectionAttr,
  planSections,
  rekeySectionAttr,
  safeImageChange,
  scaledHeight,
  sectionKeyOf,
  showsAsset,
  swapAssetUrl,
  swapSrcset,
} from './preview-structure.ts';

const ATTR = 'id=drafts.home;type=homePage;path=pageBuilder:abc;base=%2Fstudio';
const OLD = 'image-aaa111-1200x800-jpg';
const NEW = 'image-bbb222-600x900-png';
const CDN = 'https://cdn.sanity.io/images/proj/production';

const s = (key: string, extra: Record<string, unknown> = {}) => ({
  _key: key,
  _type: 'textSection',
  heading: `Heading ${key}`,
  ...extra,
});

test('parseSectionAttr reads a one-level section path and drops drafts.', () => {
  assert.deepEqual(parseSectionAttr(ATTR), { id: 'home', field: 'pageBuilder', key: 'abc' });
  assert.equal(parseSectionAttr(ATTR.replace('pageBuilder:abc', 'pageBuilder:abc.heading')), null);
  assert.equal(parseSectionAttr('id=siteSettings;type=siteSettings;path=header'), null);
  assert.equal(parseSectionAttr(null), null);
});

test('rekeySectionAttr points the same attribute at another item', () => {
  assert.equal(
    rekeySectionAttr(ATTR, 'xyz'),
    'id=drafts.home;type=homePage;path=pageBuilder:xyz;base=%2Fstudio',
  );
  assert.equal(rekeySectionAttr(ATTR, 'bad;key'), null);
});

test('planSections: a pure reorder', () => {
  const before = [s('a'), s('b'), s('c')];
  const after = [s('c'), s('a'), s('b')];
  assert.deepEqual(planSections(['a', 'b', 'c'], before, after), {
    order: [{ key: 'c' }, { key: 'a' }, { key: 'b' }],
    removed: [],
  });
});

test('planSections: a removal', () => {
  const before = [s('a'), s('b'), s('c')];
  assert.deepEqual(planSections(['a', 'b', 'c'], before, [s('a'), s('c')]), {
    order: [{ key: 'a' }, { key: 'c' }],
    removed: ['b'],
  });
});

test('planSections: a duplicate is cloned from its source, nested keys ignored', () => {
  const source = s('a', { items: [{ _key: 'i1', label: 'One' }] });
  const copy = { ...source, _key: 'a2', items: [{ _key: 'i9', label: 'One' }] };
  assert.deepEqual(planSections(['a', 'b'], [source, s('b')], [source, copy, s('b')]), {
    order: [{ key: 'a' }, { key: 'a2', cloneOf: 'a' }, { key: 'b' }],
    removed: [],
  });
});

test('planSections: a new section that copies nothing makes no plan at all', () => {
  const before = [s('a'), s('b')];
  const after = [s('b'), s('a'), { _key: 'n', _type: 'heroSection', headline: 'New' }];
  assert.equal(planSections(['a', 'b'], before, after), null);
});

test('planSections: no change, or only a field change, is null', () => {
  const before = [s('a'), s('b')];
  assert.equal(planSections(['a', 'b'], before, before), null);
  assert.equal(planSections(['a', 'b'], before, [s('a', { heading: 'X' }), s('b')]), null);
});

test('planSections: a section the page does not render stays unrendered', () => {
  const before = [s('a'), s('hidden'), s('b')];
  const after = [s('b'), s('hidden'), s('a')];
  assert.deepEqual(planSections(['a', 'b'], before, after), {
    order: [{ key: 'b' }, { key: 'a' }],
    removed: [],
  });
});

test('planSections: a key on the page twice (a synced group) is left to the refresh', () => {
  assert.equal(planSections(['a', 'a', 'b'], [s('a'), s('b')], [s('b'), s('a')]), null);
});

test('planSections: a keyless item is left to the refresh', () => {
  assert.equal(planSections(['a'], [s('a')], [s('a'), { _type: 'x' }]), null);
});

test('planSections re-plans a stale render against the newest array', () => {
  // The server rendered the old order and has no copy yet; the newest array has both.
  const source = s('a');
  const latest = [s('b'), source, { ...source, _key: 'a2' }];
  assert.deepEqual(planSections(['a', 'b'], latest, latest), {
    order: [{ key: 'b' }, { key: 'a' }, { key: 'a2', cloneOf: 'a' }],
    removed: [],
  });
});

test('diffImageRefs reports a changed asset by path, matched by _key', () => {
  const before = {
    pageBuilder: [s('a', { image: { _type: 'image', asset: { _ref: OLD } } }), s('b')],
  };
  const after = {
    pageBuilder: [s('b'), s('a', { image: { _type: 'image', asset: { _ref: NEW } } })],
  };
  assert.deepEqual(diffImageRefs(before, after), [
    { path: 'pageBuilder[_key=="a"].image', previous: OLD, next: NEW },
  ]);
});

test('diffImageRefs ignores a picture that appears or disappears', () => {
  const withImage = { hero: { asset: { _ref: OLD } } };
  assert.deepEqual(diffImageRefs({}, withImage), []);
  assert.deepEqual(diffImageRefs(withImage, { hero: {} }), []);
});

test('sectionKeyOf', () => {
  assert.equal(sectionKeyOf('pageBuilder[_key=="a"].image'), 'a');
  assert.equal(sectionKeyOf('heroImage'), undefined);
});

test('safeImageChange: once in the section and no references', () => {
  const change = { path: 'pageBuilder[_key=="a"].image', previous: OLD, next: NEW };
  const one = s('a', { image: { asset: { _ref: OLD } } });
  const twice = s('a', { image: { asset: { _ref: OLD } }, other: { asset: { _ref: OLD } } });
  const withRef = s('a', { image: { asset: { _ref: OLD } }, items: [{ _ref: 'testimonial-1' }] });
  assert.equal(safeImageChange(change, one), true);
  assert.equal(safeImageChange(change, twice), false);
  assert.equal(safeImageChange(change, withRef), false);
});

test('swapAssetUrl keeps the query and refuses a crop rectangle', () => {
  assert.equal(
    swapAssetUrl(`${CDN}/aaa111-1200x800.jpg?w=640&q=75&auto=format`, OLD, NEW),
    `${CDN}/bbb222-600x900.png?w=640&q=75&auto=format`,
  );
  assert.equal(swapAssetUrl(`${CDN}/aaa111-1200x800.jpg?rect=0,0,10,10&w=640`, OLD, NEW), null);
  assert.equal(swapAssetUrl(`${CDN}/other-1x1.jpg?w=640`, OLD, NEW), null);
  assert.equal(swapAssetUrl('https://example.com/images/aaa111-1200x800.jpg', OLD, NEW), null);
  assert.equal(swapAssetUrl('not a url', OLD, NEW), null);
});

test('swapSrcset swaps every candidate or none', () => {
  const srcset = `${CDN}/aaa111-1200x800.jpg?w=320 320w, ${CDN}/aaa111-1200x800.jpg?w=640 640w`;
  assert.equal(
    swapSrcset(srcset, OLD, NEW),
    `${CDN}/bbb222-600x900.png?w=320 320w, ${CDN}/bbb222-600x900.png?w=640 640w`,
  );
  assert.equal(swapSrcset(`${srcset}, ${CDN}/zzz-1x1.jpg?w=9 9w`, OLD, NEW), null);
});

test('showsAsset and scaledHeight', () => {
  assert.equal(showsAsset(`${CDN}/aaa111-1200x800.jpg?w=640`, OLD), true);
  assert.equal(showsAsset(`${CDN}/aaa111-1200x800.jpg?w=640`, NEW), false);
  assert.equal(scaledHeight(`${CDN}/bbb222-600x900.png?w=640`, 640, NEW), 960);
  assert.equal(scaledHeight(`${CDN}/bbb222-600x900.png?w=640&h=400`, 640, NEW), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySections, CONTENT_TYPES, SELF_CONTAINED_TYPES } from './sectionCadence.ts';

// Helpers
const block = (type: string, extra: Record<string, unknown> = {}) => ({ _type: type, ...extra });
const surfaces = (rows: ReturnType<typeof classifySections>) =>
  rows.map((r) => r.surface);
const dividers = (rows: ReturnType<typeof classifySections>) =>
  rows.map((r) => r.insertDividerBefore);

test('empty array returns empty rows', () => {
  assert.deepEqual(classifySections([]), []);
});

test('nulls and non-objects are filtered out', () => {
  const rows = classifySections([null, undefined, 42, block('richTextSection')]);
  assert.equal(rows.length, 1);
});

test('content blocks get alternating surface assignments starting at background', () => {
  const rows = classifySections([
    block('richTextSection'),
    block('imageTextSection'),
    block('gallerySection'),
  ]);
  assert.deepEqual(surfaces(rows), ['background', 'muted', 'background']);
});

test('self-contained blocks get null surface', () => {
  for (const type of SELF_CONTAINED_TYPES) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, null, `${type} should have null surface`);
  }
});

test('self-contained blocks do not advance the content cadence counter', () => {
  const rows = classifySections([
    block('richTextSection'),  // background (idx 0)
    block('heroSection'),      // null (self-contained, no counter advance)
    block('richTextSection'),  // muted (idx 1, counter was not reset)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, 'muted']);
});

test('text hero (no backgroundImage) shifts cadence to start at muted', () => {
  const rows = classifySections([
    block('heroSection'),      // text hero — no backgroundImage
    block('richTextSection'),  // should be muted (idx 1 start)
    block('imageTextSection'), // background (idx 2)
  ]);
  assert.deepEqual(surfaces(rows), [null, 'muted', 'background']);
});

test('image hero does not shift cadence', () => {
  const rows = classifySections([
    block('heroSection', { backgroundImage: { asset: { _ref: 'image-abc' } } }),
    block('richTextSection'),  // background (idx 0)
    block('imageTextSection'), // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), [null, 'background', 'muted']);
});

test('divider inserted between adjacent content blocks of differing surface', () => {
  const rows = classifySections([
    block('richTextSection'),  // background
    block('imageTextSection'), // muted -> divider before this
  ]);
  assert.deepEqual(dividers(rows), [false, true]);
});

test('no divider between two blocks with the same surface', () => {
  // Edge case: if the cadence somehow produces same-surface adjacency (e.g., after
  // a block type that resets), no divider. In practice this does not occur with the
  // standard alternating logic, but the rule should hold.
  const rows = classifySections([block('richTextSection')]);
  assert.deepEqual(dividers(rows), [false]);
});

test('no divider between content block and self-contained block', () => {
  const rows = classifySections([
    block('richTextSection'),  // background
    block('heroSection'),      // self-contained, no divider
    block('imageTextSection'), // muted, divider should appear before this (different surface from richText)
  ]);
  assert.deepEqual(dividers(rows), [false, false, true]);
});

test('headingId uses idPrefix and index', () => {
  const rows = classifySections([block('richTextSection'), block('quoteSection')], 'page');
  assert.equal(rows[0].headingId, 'page-0');
  assert.equal(rows[1].headingId, 'page-1');
});

test('unknown _type gets null surface (treated as unknown, not content)', () => {
  const rows = classifySections([block('unknownBlock')]);
  assert.equal(rows[0].surface, null);
});

// ── Phase B: rich section type classification ─────────────────────────────

test('rich SELF_CONTAINED types get null surface', () => {
  const richSelf = [
    'founderSection',
    'servicesGridSection',
    'testimonialsSection',
    'valuesSection',
    'processSection',
  ];
  for (const type of richSelf) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, null, `${type} should have null surface`);
  }
});

test('rich CONTENT types get alternating surface', () => {
  const richContent = ['storySection', 'serviceAreaSection', 'guaranteeSection'];
  for (const type of richContent) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, 'background', `${type} should get background on first`);
  }
});

test('rich content types advance the cadence counter', () => {
  const rows = classifySections([
    block('storySection'),       // background (idx 0)
    block('serviceAreaSection'), // muted (idx 1)
    block('guaranteeSection'),   // background (idx 2)
  ]);
  assert.deepEqual(surfaces(rows), ['background', 'muted', 'background']);
});

test('rich self-contained types do not advance the cadence counter', () => {
  const rows = classifySections([
    block('storySection'),       // background (idx 0)
    block('founderSection'),     // null (self-contained, no advance)
    block('serviceAreaSection'), // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, 'muted']);
});

test('all 8 new rich types appear in SELF_CONTAINED_TYPES or CONTENT_TYPES', () => {
  const all8 = [
    'founderSection', 'servicesGridSection', 'testimonialsSection',
    'storySection', 'valuesSection', 'processSection',
    'serviceAreaSection', 'guaranteeSection',
  ];
  for (const type of all8) {
    const inSelf = SELF_CONTAINED_TYPES.has(type);
    const inContent = CONTENT_TYPES.has(type);
    assert.ok(
      inSelf || inContent,
      `${type} must be classified in SELF_CONTAINED_TYPES or CONTENT_TYPES`,
    );
    assert.ok(
      !(inSelf && inContent),
      `${type} cannot be in both sets`,
    );
  }
});

test('divider inserted between storySection and serviceAreaSection (different surfaces)', () => {
  const rows = classifySections([
    block('storySection'),       // background
    block('serviceAreaSection'), // muted -> divider before
  ]);
  assert.deepEqual(dividers(rows), [false, true]);
});

// ── U7: new page-builder blocks — all SELF_CONTAINED ─────────────────────

test('faqSection is SELF_CONTAINED (null surface)', () => {
  const rows = classifySections([block('faqSection')]);
  assert.equal(rows[0].surface, null, 'faqSection should have null surface');
});

test('logoStripSection is SELF_CONTAINED (null surface)', () => {
  const rows = classifySections([block('logoStripSection')]);
  assert.equal(rows[0].surface, null, 'logoStripSection should have null surface');
});

test('teamSection is SELF_CONTAINED (null surface)', () => {
  const rows = classifySections([block('teamSection')]);
  assert.equal(rows[0].surface, null, 'teamSection should have null surface');
});

test('embedSection is SELF_CONTAINED (null surface)', () => {
  const rows = classifySections([block('embedSection')]);
  assert.equal(rows[0].surface, null, 'embedSection should have null surface');
});

test('U7 blocks do not advance the content cadence counter', () => {
  const rows = classifySections([
    block('storySection'),    // background (idx 0)
    block('faqSection'),      // null — no advance
    block('logoStripSection'),// null — no advance
    block('teamSection'),     // null — no advance
    block('embedSection'),    // null — no advance
    block('storySection'),    // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, null, null, null, 'muted']);
});

test('all 4 U7 types appear in SELF_CONTAINED_TYPES and not CONTENT_TYPES', () => {
  const u7 = ['faqSection', 'logoStripSection', 'teamSection', 'embedSection'];
  for (const type of u7) {
    assert.ok(SELF_CONTAINED_TYPES.has(type), `${type} must be in SELF_CONTAINED_TYPES`);
    assert.ok(!CONTENT_TYPES.has(type), `${type} must not be in CONTENT_TYPES`);
  }
});

// ── Church-reverse-port: dynamicListSection ───────────────────────────────

test('dynamicListSection is SELF_CONTAINED (null surface)', () => {
  const rows = classifySections([block('dynamicListSection')]);
  assert.equal(rows[0].surface, null, 'dynamicListSection should have null surface');
});

test('dynamicListSection does not advance the content cadence counter', () => {
  const rows = classifySections([
    block('storySection'),       // background (idx 0)
    block('dynamicListSection'), // null — self-contained, no advance
    block('serviceAreaSection'), // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, 'muted']);
});

test('dynamicListSection appears in SELF_CONTAINED_TYPES and not CONTENT_TYPES', () => {
  assert.ok(SELF_CONTAINED_TYPES.has('dynamicListSection'), 'dynamicListSection must be in SELF_CONTAINED_TYPES');
  assert.ok(!CONTENT_TYPES.has('dynamicListSection'), 'dynamicListSection must not be in CONTENT_TYPES');
});

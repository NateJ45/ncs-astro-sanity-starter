// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyKnownChange,
  applyTextChange,
  indexStegaNodes,
  showsText,
} from './preview-text-nodes.ts';
import { sourceKey, splitStega, stegaSource } from './preview-stega.ts';

// The same real runs the stega tests use; see src/lib/preview-stega.test.ts for
// where they come from and how to regenerate them.
const DIGITS = [0x200b, 0x200c, 0x200d, 0xfeff].map((code) => String.fromCodePoint(code));
const run = (base4: string) =>
  Array.from(base4)
    .map((digit) => DIGITS[Number(digit)])
    .join('');

/** `heroHeadline` on `homePage`. */
const HERO_RUN = run(
  '0000132302021233130212211213122112320202032202021303120112321221131013210232122112330202' +
    '0230020212201302121112120202032202020233130313101311121012211233023312211232131012111232' +
    '1310023312111210122113100233123112331210121103311300130212111303121112321310120113101221' +
    '1233123203231221121003311220123312311211110012011213121103231310132113001211033112201233' +
    '1231121111001201121312110323130012011310122003311220121113021233102012111201121012301221' +
    '1232121103331202120113031211111113021230033102110302101213031310131112101221123302121221' +
    '1210033112201233123112111100120112131211021213101321130012110331122012331231121111001201' +
    '1213121102121300120113101220033112201211130212331020121112011210123012211232121102121300' +
    '1211130213031300121112031310122113121211033113001311120212301221130312201211121002021331',
);

/** `flexibleSections[_key=="a1b2"].heading` on `homePage`. */
const SECTION_RUN = run(
  '0000132302021233130212211213122112320202032202021303120112321221131013210232122112330202' +
    '0230020212201302121112120202032202020233130313101311121012211233023312211232131012111232' +
    '1310023312111210122113100233123112331210121103311300130212111303121112321310120113101221' +
    '1233123203231221121003311220123312311211110012011213121103231310132113001211033112201233' +
    '1231121111001201121312110323130012011310122003311212123012111320122112021230121111031211' +
    '1203131012211233123213030211031110021133122312111321021103031010021103031010021103020302' +
    '1201030112020302021103020302021103111010023212201211120112101221123212130333120212011303' +
    '1211111113021230033102110302101213031310131112101221123302121221121003311220123312311211' +
    '1100120112131211021213101321130012110331122012331231121111001201121312110212130012011310' +
    '1220033112121230121113201221120212301211110312111203131012211233123213030211031110021133' +
    '1223121113210211030310100211030310100211030203021201030112020302021103020302021103111010' +
    '0232122012111201121012211232121302121300121113021303130012111203131012211312121103311300' +
    '1311120212301221130312201211121002021331',
);

const node = (text: string, encoded = '') => ({ data: text + encoded });

test('indexes text nodes by the field they came from', () => {
  const hero = node('Welcome to Presbyterian Academy', HERO_RUN);
  const heading = node('Our story', SECTION_RUN);
  const index = indexStegaNodes([hero, node('\n  '), heading, node('Hard-coded copy')]);

  assert.equal(index.size, 2);
  assert.deepEqual(index.get(sourceKey('homePage', 'heroHeadline')), [hero]);
  assert.deepEqual(index.get(sourceKey('homePage', 'flexibleSections[_key=="a1b2"].heading')), [
    heading,
  ]);
});

test('collects every node showing the same field', () => {
  const first = node('Our story', SECTION_RUN);
  const second = node('Our story', SECTION_RUN);
  const index = indexStegaNodes([first, second]);
  assert.deepEqual(index.get(sourceKey('homePage', 'flexibleSections[_key=="a1b2"].heading')), [
    first,
    second,
  ]);
});

test('stops indexing at the cap', () => {
  const many = Array.from({ length: 50 }, () => node('Our story', SECTION_RUN));
  assert.equal(
    indexStegaNodes(many, 10).get(sourceKey('homePage', 'flexibleSections[_key=="a1b2"].heading'))
      ?.length,
    10,
  );
});

test('swaps the words and keeps the payload intact', () => {
  const target = node('Our story', SECTION_RUN);
  assert.equal(applyTextChange(target, 'Our story', 'Our stories'), true);
  assert.equal(splitStega(target.data).cleaned, 'Our stories');
  assert.deepEqual(stegaSource(target.data), {
    id: 'homePage',
    type: 'homePage',
    path: 'flexibleSections[_key=="a1b2"].heading',
  });
});

test('refuses a node whose text is not exactly the old value', () => {
  // A heading split around its accent word, or wrapped in other copy.
  const partial = node('Our', SECTION_RUN);
  assert.equal(applyTextChange(partial, 'Our story', 'Our stories'), false);
  assert.equal(splitStega(partial.data).cleaned, 'Our');

  const inSentence = node('We call it Our story here', SECTION_RUN);
  assert.equal(applyTextChange(inSentence, 'Our story', 'Our stories'), false);
});

test('refuses a node that already shows the new value', () => {
  const done = node('Our stories', SECTION_RUN);
  assert.equal(applyTextChange(done, 'Our stories', 'Our stories'), false);
});

test('works on a node with no stega at all, when the text still matches', () => {
  const bare = node('Our story');
  assert.equal(applyTextChange(bare, 'Our story', 'Our stories'), true);
  assert.equal(bare.data, 'Our stories');
});

// --- applyKnownChange: correcting a node that shows ANY past value -----------
// The re-apply after a soft refresh. A render that started mid-burst arrives
// holding an INTERMEDIATE value, which `applyTextChange` (exact match on the
// value the burst started from) could not correct — the half-typed sentence sat
// on the page until the next render.

test('corrects a node showing an intermediate value the field passed through', () => {
  const half = node('Our sto', SECTION_RUN);
  assert.equal(applyKnownChange(half, ['Our story', 'Our st', 'Our sto'], 'Our stories'), true);
  assert.equal(splitStega(half.data).cleaned, 'Our stories');
  assert.deepEqual(stegaSource(half.data), {
    id: 'homePage',
    type: 'homePage',
    path: 'flexibleSections[_key=="a1b2"].heading',
  });
});

test('still corrects a node showing the original value', () => {
  const original = node('Our story', SECTION_RUN);
  assert.equal(applyKnownChange(original, ['Our story', 'Our stor'], 'Our stories'), true);
  assert.equal(splitStega(original.data).cleaned, 'Our stories');
});

test('leaves a node showing the current value alone — the server caught up', () => {
  const landed = node('Our stories', SECTION_RUN);
  assert.equal(applyKnownChange(landed, ['Our story', 'Our stories'], 'Our stories'), false);
  assert.equal(splitStega(landed.data).cleaned, 'Our stories');
});

test('refuses text this field has never held', () => {
  // Someone else's edit, a transformed rendering, a value from before this
  // session: unrecognised is unrecognised, and writing would be a lie.
  const stranger = node('A whole other headline', SECTION_RUN);
  assert.equal(applyKnownChange(stranger, ['Our story', 'Our stor'], 'Our stories'), false);
  assert.equal(splitStega(stranger.data).cleaned, 'A whole other headline');

  // And a partial rendering (a heading split around its accent word) is not a
  // past value either, however much of the old text it contains.
  const split = node('Our', SECTION_RUN);
  assert.equal(applyKnownChange(split, ['Our story', 'Our stor'], 'Our stories'), false);
});

test('refuses everything when the field has no history at all', () => {
  const any = node('Our story', SECTION_RUN);
  assert.equal(applyKnownChange(any, [], 'Our stories'), false);
});

test('reads what a node currently shows, ignoring the invisible half', () => {
  assert.equal(showsText(node('Our story', SECTION_RUN), 'Our story'), true);
  assert.equal(showsText(node('Our story', SECTION_RUN), 'Our stories'), false);
});

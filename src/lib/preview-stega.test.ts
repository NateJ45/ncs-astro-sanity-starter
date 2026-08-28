// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reattachStega, sourceKey, splitStega, stegaSource } from './preview-stega.ts';

// =============================================================================
// The fixtures below are REAL runs, produced by the real pipeline: @sanity/client's
// `createEditUrl` (baseUrl '/studio') wrapped by @vercel/stega's
// `vercelStegaCombine`, exactly as `getPreviewClient` in src/lib/cms-preview.ts
// emits them. They are re-spelled as base-4 digits — one digit per invisible
// character — so that the fixture survives a copy-paste, shows up in a diff, and
// cannot be silently corrupted by an editor that trims zero-width characters.
// Regenerate by encoding a value with those two libraries and mapping the run's
// characters through DIGITS below.
// =============================================================================
const DIGITS = [0x200b, 0x200c, 0x200d, 0xfeff].map((code) => String.fromCodePoint(code));
const run = (base4: string) =>
  Array.from(base4)
    .map((digit) => DIGITS[Number(digit)])
    .join('');

/** `heroHeadline` on the `homePage` document. */
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

/** `flexibleSections[_key=="a1b2"].heading` on the same document. */
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

test('splits the invisible run off a preview string', () => {
  const encoded = `Welcome to Presbyterian Academy${HERO_RUN}`;
  assert.deepEqual(splitStega(encoded), {
    cleaned: 'Welcome to Presbyterian Academy',
    encoded: HERO_RUN,
  });
});

test('leaves a string that carries no stega alone', () => {
  assert.deepEqual(splitStega('Plain heading'), { cleaned: 'Plain heading', encoded: '' });
  assert.deepEqual(splitStega(''), { cleaned: '', encoded: '' });
});

test('split then reattach is a round trip — this is what keeps click-to-edit', () => {
  const original = `Our story${SECTION_RUN}`;
  const { cleaned, encoded } = splitStega(original);
  assert.equal(reattachStega(cleaned, encoded), original);
});

test('reattaching new words keeps the payload the overlay reads', () => {
  const { encoded } = splitStega(`Our story${SECTION_RUN}`);
  const swapped = reattachStega('Our stories', encoded);
  assert.equal(splitStega(swapped).cleaned, 'Our stories');
  assert.deepEqual(stegaSource(swapped), stegaSource(`Our story${SECTION_RUN}`));
});

test('reattaching nothing onto text with no payload changes nothing', () => {
  assert.equal(reattachStega('Just words', ''), 'Just words');
});

test('decodes a document field back to its id, type and path', () => {
  assert.deepEqual(stegaSource(`Welcome to Presbyterian Academy${HERO_RUN}`), {
    id: 'homePage',
    type: 'homePage',
    path: 'heroHeadline',
  });
});

test('decodes a keyed section field back to its full studio path', () => {
  assert.deepEqual(stegaSource(`Our story${SECTION_RUN}`), {
    id: 'homePage',
    type: 'homePage',
    path: 'flexibleSections[_key=="a1b2"].heading',
  });
});

test('returns null rather than guessing when there is nothing to read', () => {
  assert.equal(stegaSource('Plain heading'), null);
  // Four invisible characters, but no payload behind the prefix.
  assert.equal(stegaSource(`Heading${DIGITS[0].repeat(4)}`), null);
  // A run that is not a multiple of four after the prefix.
  assert.equal(stegaSource(`Heading${DIGITS[0].repeat(4)}${DIGITS[1].repeat(2)}`), null);
});

test('index keys separate two documents that share a path', () => {
  assert.notEqual(sourceKey('homePage', 'heroHeadline'), sourceKey('aboutPage', 'heroHeadline'));
  assert.equal(sourceKey('homePage', 'heroHeadline'), sourceKey('homePage', 'heroHeadline'));
});

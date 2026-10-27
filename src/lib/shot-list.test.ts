// The shot list (src/data/shot-list.ts): which picture slots show a "Photo needed" box (card 195).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStandInPhoto,
  journalCoverShot,
  pickShot,
  shotFor,
  shotsForPage,
  type Shot,
} from '../data/shot-list.ts';

const unsplash = { asset: { originalFilename: 'x.jpg', source: { name: 'unsplash' } } };
const standIn = { asset: { originalFilename: 'stand-in-hero.jpg' } };
const own = { asset: { originalFilename: 'IMG_2041.jpg' } };

const shot: Shot = {
  title: 'The team',
  detail: 'Everyone, in daylight.',
  orientation: 'landscape',
};
const LIST: Record<string, Shot[]> = {
  '/about/|Our story': [shot, { ...shot, title: 'Close up' }],
};

test('stand-ins are Unsplash and stand-in- uploads only', () => {
  assert.equal(isStandInPhoto(unsplash), true);
  assert.equal(isStandInPhoto(standIn), true);
  assert.equal(isStandInPhoto(own), false);
  assert.equal(isStandInPhoto(null), false);
  assert.equal(isStandInPhoto({}), false);
});

test('a listed slot asks while empty or a stand-in, and yields to a real photo', () => {
  assert.equal(pickShot(LIST, '/about/', 'Our story', 0, unsplash), shot);
  assert.ok(pickShot(LIST, '/about/', 'Our story', 1, null));
  assert.equal(pickShot(LIST, '/about/', 'Our story', 0, own), null);
  assert.ok(pickShot(LIST, '/about', 'Our story', 0, undefined), 'path without a trailing slash');
});

test('the draft preview finds the same shots as the live page', () => {
  const zw = (...codes: number[]) => String.fromCharCode(...codes);
  const stega =
    'Our story' + zw(0x200b, 0x200b, 0x200b, 0x200b) + zw(0x200c, 0x200d, 0xfeff, 0x200b).repeat(6);
  assert.equal(pickShot(LIST, '/preview/about/', stega, 0, null), shot);
  assert.equal(shotsForPage('/preview/about/', LIST).length, 2);
});

test('an unlisted slot, heading or index asks for nothing', () => {
  assert.equal(pickShot(LIST, '/about/', 'Some new block', 0, null), null);
  assert.equal(pickShot(LIST, '/about/', undefined, 0, null), null);
  assert.equal(pickShot(LIST, '/about/', 'Our story', 9, null), null);
  assert.equal(shotsForPage('/no-such-page/', LIST).length, 0);
});

test('with the layer off (the starter default) no slot asks for anything', () => {
  assert.equal(shotFor('/about/', 'Our story', 0, null), null);
  assert.equal(journalCoverShot(unsplash), null);
});

test('no em-dashes in what the client reads', () => {
  for (const s of Object.values(LIST).flat()) assert.ok(!/—/.test(s.title + s.detail));
});

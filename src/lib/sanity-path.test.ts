// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// sanity-path - unit tests for the studio-path parser
// =============================================================================
// The parser stands between a hovered element and a document mutation, so its
// one hard rule is worth pinning: a shape it does not recognise returns an EMPTY
// path, never a partial one. A partial path would still be a valid patch target,
// and the in-canvas control would write to the wrong field in silence.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSanityPath,
  lastProperty,
  parentOf,
  readSectionPath,
  sectionByKey,
  valueAtPath,
  type PathSegment,
} from './sanity-path.ts';

/** The array names this template's own pages use. */
const ARRAYS = ['pageBuilder', 'additionalSections'] as const;

test('parses a plain document field', () => {
  assert.deepEqual(parseSanityPath('heroHeadline'), ['heroHeadline']);
});

test('parses a keyed array member', () => {
  assert.deepEqual(parseSanityPath('pageBuilder[_key=="a1b2"]'), ['pageBuilder', { _key: 'a1b2' }]);
});

test('parses a field inside a keyed array member', () => {
  assert.deepEqual(parseSanityPath('pageBuilder[_key=="x9"].heading'), [
    'pageBuilder',
    { _key: 'x9' },
    'heading',
  ]);
});

test('parses a portable-text span, the deepest shape the overlay hands us', () => {
  assert.deepEqual(
    parseSanityPath('pageBuilder[_key=="s1"].subheadRich[_key=="b1"].children[_key=="c1"].text'),
    [
      'pageBuilder',
      { _key: 's1' },
      'subheadRich',
      { _key: 'b1' },
      'children',
      { _key: 'c1' },
      'text',
    ],
  );
});

test('parses numeric indices', () => {
  assert.deepEqual(parseSanityPath('heroImages[0].alt'), ['heroImages', 0, 'alt']);
});

test('tolerates whitespace inside the key expression', () => {
  assert.deepEqual(parseSanityPath('pageBuilder[ _key == "k" ]'), ['pageBuilder', { _key: 'k' }]);
});

test('refuses a shape it does not understand rather than guessing', () => {
  assert.deepEqual(parseSanityPath('pageBuilder[title=="x"]'), []);
  assert.deepEqual(parseSanityPath('pageBuilder[_key=="x"'), []);
  assert.deepEqual(parseSanityPath('9lives'), []);
  assert.deepEqual(parseSanityPath(''), []);
  assert.deepEqual(parseSanityPath(undefined), []);
  assert.deepEqual(parseSanityPath(null), []);
});

test('lastProperty and parentOf', () => {
  const path: PathSegment[] = ['pageBuilder', { _key: 'k' }, 'heading'];
  assert.equal(lastProperty(path), 'heading');
  assert.deepEqual(parentOf(path), ['pageBuilder', { _key: 'k' }]);
  assert.equal(lastProperty(['pageBuilder', { _key: 'k' }]), '');
});

test('readSectionPath finds the section a path points into', () => {
  assert.deepEqual(readSectionPath('pageBuilder[_key=="k1"]', ARRAYS), {
    array: 'pageBuilder',
    key: 'k1',
    itemPath: ['pageBuilder', { _key: 'k1' }],
    rest: [],
  });
  assert.deepEqual(readSectionPath('additionalSections[_key=="k2"].subhead', ARRAYS), {
    array: 'additionalSections',
    key: 'k2',
    itemPath: ['additionalSections', { _key: 'k2' }],
    rest: ['subhead'],
  });
});

test('readSectionPath ignores paths outside the page-builder arrays', () => {
  assert.equal(readSectionPath('heroHeadline', ARRAYS), null);
  assert.equal(readSectionPath('navItems[_key=="n1"].label', ARRAYS), null);
  assert.equal(readSectionPath('pageBuilder', ARRAYS), null);
  assert.equal(readSectionPath('', ARRAYS), null);
});

test('readSectionPath takes the array names from its caller', () => {
  // The same string is a section path in one repo and nothing in another. That
  // is the whole reason the list is a parameter.
  assert.equal(readSectionPath('sections[_key=="k"].heading', ARRAYS), null);
  assert.equal(readSectionPath('sections[_key=="k"].heading', ['sections'])?.key, 'k');
});

test('valueAtPath walks objects, indices and keyed members', () => {
  const doc = {
    heroHeadline: 'Hello',
    pageBuilder: [
      { _key: 'a', heading: 'First', tags: ['x', 'y'] },
      { _key: 'b', heading: 'Second' },
    ],
  };
  assert.equal(valueAtPath(doc, ['heroHeadline']), 'Hello');
  assert.equal(valueAtPath(doc, ['pageBuilder', { _key: 'b' }, 'heading']), 'Second');
  assert.equal(valueAtPath(doc, ['pageBuilder', 0, 'tags', 1]), 'y');
});

test('valueAtPath returns undefined rather than throwing on a missing step', () => {
  const doc = { pageBuilder: [{ _key: 'a', heading: 'First' }] };
  assert.equal(valueAtPath(doc, ['pageBuilder', { _key: 'zz' }, 'heading']), undefined);
  assert.equal(valueAtPath(doc, ['nope', 'deeper']), undefined);
  // A member lookup against a non-array, and a property lookup against an array.
  assert.equal(
    valueAtPath(doc, ['pageBuilder', { _key: 'a' }, 'heading', { _key: 'x' }]),
    undefined,
  );
  assert.equal(valueAtPath(doc, ['pageBuilder', 'heading']), undefined);
  assert.equal(valueAtPath(null, ['anything']), undefined);
});

test('sectionByKey finds an item, and answers null for everything else', () => {
  const doc = { pageBuilder: [{ _key: 'a', _type: 'ctaBandSection' }] };
  assert.equal(sectionByKey(doc, 'pageBuilder', 'a')?._type, 'ctaBandSection');
  assert.equal(sectionByKey(doc, 'pageBuilder', 'b'), null);
  assert.equal(sectionByKey(doc, 'additionalSections', 'a'), null);
  assert.equal(sectionByKey(null, 'pageBuilder', 'a'), null);
});

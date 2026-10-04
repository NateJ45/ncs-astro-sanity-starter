// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedFieldConsts, sharedFieldNames } from './shared-field-consts.mjs';

const FILE = `
import { defineField, defineType } from 'sanity';

const eyebrow = defineField({
  name: 'eyebrow',
  title: 'Eyebrow',
  type: 'string',
});

export const caption = defineField({ name: 'caption', type: 'string' });

export const hero = defineType({
  name: 'hero',
  type: 'document',
  fields: [eyebrow, defineField({ name: 'title', type: 'string' }), caption],
});

export const band = defineType({
  name: 'band',
  type: 'document',
  fields: [
    defineField({ name: 'body', type: 'text' }),
    eyebrow,
  ],
});

export const plain = defineType({
  name: 'plain',
  type: 'document',
  fields: [defineField({ name: 'eyebrowish', type: 'string' })],
});
`;

test('sharedFieldConsts maps each module-level defineField const to its field name', () => {
  const shared = sharedFieldConsts(FILE);
  assert.equal(shared.get('eyebrow'), 'eyebrow');
  assert.equal(shared.get('caption'), 'caption'); // `export const` too
  assert.equal(shared.size, 2);
});

test('the const can be named differently from the field it declares', () => {
  const shared = sharedFieldConsts(
    `const kicker = defineField({ type: 'string', name: 'eyebrow' });`,
  );
  assert.equal(shared.get('kicker'), 'eyebrow');
});

test('a type listing the const by bare identifier is credited with the field', () => {
  const shared = sharedFieldConsts(FILE);
  const hero = FILE.slice(FILE.indexOf("name: 'hero'"), FILE.indexOf("name: 'band'"));
  assert.deepEqual(sharedFieldNames(hero, shared).sort(), ['caption', 'eyebrow']);
});

test('the last element before the closing bracket counts (no trailing comma)', () => {
  const shared = new Map([['eyebrow', 'eyebrow']]);
  assert.deepEqual(sharedFieldNames(`fields: [defineField({ name: 'x' }), eyebrow]`, shared), [
    'eyebrow',
  ]);
});

test('a type that does not list the const gets nothing, and look-alikes do not match', () => {
  const shared = new Map([['eyebrow', 'eyebrow']]);
  assert.deepEqual(sharedFieldNames(`fields: [defineField({ name: 'eyebrowish' })]`, shared), []);
  assert.deepEqual(sharedFieldNames(`fields: [myeyebrow, eyebrowTwo, obj.eyebrow, ]`, shared), []);
  // the declaration itself is `eyebrow =`, not `eyebrow,`
  assert.deepEqual(sharedFieldNames(`const eyebrow = defineField({`, shared), []);
});

test('a file with no shared consts is a no-op (backward compatible)', () => {
  const src = `defineType({ name: 'a', fields: [defineField({ name: 'b', type: 'string' })] })`;
  const shared = sharedFieldConsts(src);
  assert.equal(shared.size, 0);
  assert.deepEqual(sharedFieldNames(src, shared), []);
});

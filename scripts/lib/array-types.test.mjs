// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferMember, fillTypes } from './array-types.mjs';

const f = (...names) => names.map((name) => ({ name }));
const navLink = {
  name: 'navLink',
  jsonType: 'object',
  fields: f('label', 'linkType', 'page', 'href'),
};
const footerLink = { name: 'footerLink', jsonType: 'object', fields: f('label', 'href') };
const column = { name: 'footerColumn', jsonType: 'object', fields: [] };

test('a single object member is always the answer', () => {
  assert.equal(inferMember({ title: 'x' }, [column]), column);
});

test('a label and href item is the typed-address link, not the richer page link', () => {
  assert.equal(
    inferMember({ _key: 'a', label: 'Pricing', href: '/pricing' }, [navLink, footerLink]),
    footerLink,
  );
});

test('an item with a key only the richer type knows goes to the richer type', () => {
  assert.equal(inferMember({ label: 'x', linkType: 'internal' }, [navLink, footerLink]), navLink);
});

test('an item that fits nothing is left alone', () => {
  assert.equal(inferMember({ nonsense: 1 }, [navLink, footerLink]), null);
});

test('fillTypes adds _type at every depth, never changes values, and is idempotent', () => {
  const links = { name: 'array', jsonType: 'array', of: [navLink, footerLink] };
  const col = { ...column, fields: [{ name: 'links', type: links }] };
  const type = { name: 'array', jsonType: 'array', of: [col] };
  const value = [{ _key: 'c', links: [{ _key: 'l', label: 'A', href: '/a' }] }];
  const once = fillTypes(value, type);
  assert.equal(once.value[0]._type, 'footerColumn');
  assert.equal(once.value[0].links[0]._type, 'footerLink');
  assert.equal(once.value[0].links[0].href, '/a');
  assert.equal(once.changed.length, 2);
  assert.equal(fillTypes(once.value, type).changed.length, 0);
});

test('an item that ties between two members is left unplaced, not guessed', () => {
  const a = { name: 'a', jsonType: 'object', fields: f('label', 'href') };
  const b = { name: 'b', jsonType: 'object', fields: f('label', 'href') };
  const type = { name: 'array', jsonType: 'array', of: [a, b] };
  const r = fillTypes([{ _key: 'x', label: 'L', href: '/l' }], type);
  assert.equal(r.value[0]._type, undefined);
  assert.deepEqual(r.unplaced, ['[0]']);
});

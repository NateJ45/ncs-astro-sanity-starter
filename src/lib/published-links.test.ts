// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLinkable, linkableRows } from './published-links.ts';

const ROWS = [
  { href: '/contact/', label: 'Contact' },
  { href: '/pricing/', label: 'Pricing', studio: 'pricing' },
  { href: '/about/', label: 'About' },
  { href: '/gift-cards/', label: 'Gift cards', studio: 'gift-cards' },
];

test('a site route always exists; a Studio page only while it is published', () => {
  assert.equal(isLinkable({ href: '/about/' }, []), true);
  assert.equal(isLinkable({ href: '/pricing/', studio: 'pricing' }, ['pricing']), true);
  assert.equal(isLinkable({ href: '/pricing/', studio: 'pricing' }, []), false);
});

test('an unpublished Studio page drops out and the next row takes its place', () => {
  const rows = linkableRows(ROWS, '/', ['gift-cards'], 3);
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Contact', 'About', 'Gift cards'],
  );
});

test('the page you are on is left out, with or without the slash', () => {
  assert.deepEqual(
    linkableRows(ROWS, '/contact', ['pricing', 'gift-cards']).map((r) => r.label),
    ['Pricing', 'About', 'Gift cards'],
  );
});

test('no dataset (CI) means no Studio links at all', () => {
  assert.deepEqual(
    linkableRows(ROWS, '/', []).map((r) => r.label),
    ['Contact', 'About'],
  );
});

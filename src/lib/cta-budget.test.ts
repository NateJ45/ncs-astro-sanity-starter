// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstPrimaryIndex, primaryBudget } from './cta-budget.ts';

interface Block {
  _type: string;
  primaryCta?: { label?: string } | null;
}
const draws = (b: Block) =>
  b._type === 'ctaBandSection' || (b._type === 'heroSection' && !!b.primaryCta);

test('the first block with a primary button keeps it, the rest go secondary', () => {
  const blocks: Block[] = [
    { _type: 'heroSection', primaryCta: { label: 'Visit' } },
    { _type: 'richTextSection' },
    { _type: 'ctaBandSection' },
    { _type: 'ctaBandSection' },
  ];
  const variant = primaryBudget(blocks, draws);
  assert.deepEqual(
    blocks.map((_, i) => variant(i)),
    ['primary', 'secondary', 'secondary', 'secondary'],
  );
});

test('a hero without a button does not spend the budget', () => {
  const blocks: Block[] = [
    { _type: 'heroSection', primaryCta: null },
    { _type: 'richTextSection' },
    { _type: 'ctaBandSection' },
  ];
  assert.equal(firstPrimaryIndex(blocks, draws), 2);
  assert.equal(primaryBudget(blocks, draws)(2), 'primary');
});

test('a page with no primary button has nothing to spend', () => {
  const blocks: Block[] = [{ _type: 'richTextSection' }, { _type: 'quoteSection' }];
  assert.equal(firstPrimaryIndex(blocks, draws), -1);
  assert.equal(primaryBudget(blocks, draws)(0), 'secondary');
  assert.equal(primaryBudget([], draws)(0), 'secondary');
});

// --- The header rule (card 187) ---------------------------------------------
import { repeatsHeaderCta } from './cta-budget.ts';

const HEADER = { show: true, href: '/contact/' };

test('a body button to the header button page repeats it', () => {
  assert.equal(repeatsHeaderCta('/contact/', HEADER), true);
  assert.equal(repeatsHeaderCta('/contact', HEADER), true, 'slash or not');
  assert.equal(repeatsHeaderCta('/contact/#form', HEADER), true, 'same page, other anchor');
  assert.equal(repeatsHeaderCta('/contact/?topic=quote', HEADER), true, 'same page, a query');
});

test('another page, a hidden header button or no link is not a repeat', () => {
  assert.equal(repeatsHeaderCta('/services/', HEADER), false);
  assert.equal(repeatsHeaderCta('/contact/', { ...HEADER, show: false }), false);
  assert.equal(repeatsHeaderCta(undefined, HEADER), false);
  assert.equal(repeatsHeaderCta('/contact/', null), false);
  assert.equal(repeatsHeaderCta('/', { show: true, href: 'https://book.example.com/' }), false);
  assert.equal(repeatsHeaderCta('https://book.example.com/', { show: true, href: '/' }), false);
});

test('a repeat does not spend the budget: the next real step keeps the accent', () => {
  const blocks = [
    { name: 'hero', href: '/contact/' },
    { name: 'band', href: '/services/' },
  ];
  const variant = primaryBudget(blocks, (b) => !repeatsHeaderCta(b.href, HEADER));
  assert.deepEqual(
    blocks.map((_, i) => variant(i)),
    ['secondary', 'primary'],
  );
});

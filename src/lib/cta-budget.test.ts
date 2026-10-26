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

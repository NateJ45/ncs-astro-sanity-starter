import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReservedSlug, RESERVED_SLUGS } from './reservedSlugs.ts';

test('isReservedSlug returns true for every known reserved slug', () => {
  for (const slug of RESERVED_SLUGS) {
    assert.equal(isReservedSlug(slug), true, `expected ${slug} to be reserved`);
  }
});

test('isReservedSlug returns false for a custom slug', () => {
  assert.equal(isReservedSlug('studio-tour'), false);
  assert.equal(isReservedSlug('my-portfolio'), false);
  assert.equal(isReservedSlug('team'), false);
});

test('isReservedSlug returns false for null and undefined', () => {
  assert.equal(isReservedSlug(null), false);
  assert.equal(isReservedSlug(undefined), false);
});

test('isReservedSlug is case-sensitive (slugs are lowercase by schema rule)', () => {
  assert.equal(isReservedSlug('About'), false);
  assert.equal(isReservedSlug('ABOUT'), false);
});

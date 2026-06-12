import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingTimeFromPortableText, formatReadingTime } from './reading-time.ts';
import { telHref } from './phone.ts';

// ── readingTimeFromPortableText ───────────────────────────────────────────

function makeBlock(text: string) {
  return {
    _type: 'block',
    children: [{ _type: 'span', text }],
  };
}

test('returns 1 for empty array', () => {
  assert.equal(readingTimeFromPortableText([]), 1);
});

test('returns 1 for null/undefined input', () => {
  assert.equal(readingTimeFromPortableText(null), 0);
  assert.equal(readingTimeFromPortableText(undefined), 0);
});

test('returns 1 for non-array input', () => {
  assert.equal(readingTimeFromPortableText('not an array'), 0);
});

test('filters out non-block types', () => {
  const blocks = [
    { _type: 'image', asset: {} },
    makeBlock('hello world'),
  ];
  assert.equal(readingTimeFromPortableText(blocks), 1);
});

test('minimum reading time is 1 minute', () => {
  const blocks = [makeBlock('hi')];
  assert.equal(readingTimeFromPortableText(blocks), 1);
});

test('200 words = exactly 1 minute', () => {
  const words = Array(200).fill('word').join(' ');
  const blocks = [makeBlock(words)];
  assert.equal(readingTimeFromPortableText(blocks), 1);
});

test('201 words rounds up to 2 minutes', () => {
  const words = Array(201).fill('word').join(' ');
  const blocks = [makeBlock(words)];
  assert.equal(readingTimeFromPortableText(blocks), 2);
});

test('400 words = 2 minutes', () => {
  const words = Array(400).fill('word').join(' ');
  const blocks = [makeBlock(words)];
  assert.equal(readingTimeFromPortableText(blocks), 2);
});

test('multiple blocks are summed together', () => {
  // 100 words in each of 3 blocks = 300 words = 2 minutes (ceil(300/200))
  const block = makeBlock(Array(100).fill('word').join(' '));
  assert.equal(readingTimeFromPortableText([block, block, block]), 2);
});

// ── formatReadingTime ─────────────────────────────────────────────────────

test('formatReadingTime formats 1 minute', () => {
  assert.equal(formatReadingTime(1), '1 min read');
});

test('formatReadingTime formats 5 minutes', () => {
  assert.equal(formatReadingTime(5), '5 min read');
});

test('formatReadingTime formats 12 minutes', () => {
  assert.equal(formatReadingTime(12), '12 min read');
});

// ── telHref ───────────────────────────────────────────────────────────────

test('telHref returns empty string for undefined', () => {
  assert.equal(telHref(undefined), '');
});

test('telHref returns empty string for null', () => {
  assert.equal(telHref(null), '');
});

test('telHref returns empty string for empty string', () => {
  assert.equal(telHref(''), '');
});

test('telHref adds +1 prefix for 10-digit US number', () => {
  assert.equal(telHref('(931) 539-5255'), 'tel:+19315395255');
});

test('telHref uses digits as-is for 7-digit number (no country code)', () => {
  assert.equal(telHref('539-5255'), 'tel:5395255');
});

test('telHref uses digits as-is for 11-digit number', () => {
  assert.equal(telHref('+1 (931) 539-5255'), 'tel:19315395255');
});

test('telHref strips all formatting characters', () => {
  assert.equal(telHref('931.539.5255'), 'tel:+19315395255');
});

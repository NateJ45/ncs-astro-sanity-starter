// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareLinks, absoluteUrl } from './share-links.ts';

const input = { url: 'https://example.com/sermons/grace-alone/', title: 'Grace & peace' };

test('facebook gets the encoded URL only', () => {
  assert.equal(
    shareLinks(input).facebook,
    'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fsermons%2Fgrace-alone%2F',
  );
});

test('x gets the URL and the title as text', () => {
  assert.equal(
    shareLinks(input).x,
    'https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fsermons%2Fgrace-alone%2F&text=Grace%20%26%20peace',
  );
});

test('email uses %20 for spaces, never +', () => {
  const { email } = shareLinks(input);
  assert.ok(email.startsWith('mailto:?subject=Grace%20%26%20peace&body='));
  assert.ok(!email.includes('+'));
  assert.ok(email.includes('https%3A%2F%2Fexample.com%2Fsermons%2Fgrace-alone%2F'));
});

test('absoluteUrl joins origin and path', () => {
  assert.equal(absoluteUrl('https://example.com', '/news/a/'), 'https://example.com/news/a/');
  assert.equal(absoluteUrl('https://example.com/', '/news/a/'), 'https://example.com/news/a/');
});

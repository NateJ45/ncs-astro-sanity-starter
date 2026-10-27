// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ctaHref } from './cta-href.ts';

test('internal links: singletons use their fixed route, custom pages their slug', () => {
  assert.equal(
    ctaHref({ linkType: 'internal', internalLink: { _type: 'contactPage' } }),
    '/contact/',
  );
  assert.equal(
    ctaHref({ linkType: 'internal', internalLink: { _type: 'page', slug: 'pricing' } }),
    '/pricing/',
  );
});

test('a built-in default button names its own path; none at all takes the fallback', () => {
  assert.equal(ctaHref({ href: '/about' }), '/about/');
  assert.equal(ctaHref(null), '/contact/');
  assert.equal(ctaHref(undefined, '/start/'), '/start/');
});

test('external, email and phone links', () => {
  assert.equal(
    ctaHref({ linkType: 'external', externalUrl: 'https://example.com/x' }),
    'https://example.com/x',
  );
  assert.equal(ctaHref({ linkType: 'email', emailAddress: 'a@b.co' }), 'mailto:a@b.co');
  assert.equal(ctaHref({ linkType: 'phone', phoneNumber: '(555) 010-2030' }), 'tel:5550102030');
});

test('a half-filled link falls back instead of pointing nowhere', () => {
  assert.equal(ctaHref({ linkType: 'internal', internalLink: null }), '/contact/');
  assert.equal(ctaHref({ linkType: 'email' }, '/x/'), '/x/');
  assert.equal(ctaHref({ linkType: 'internal', internalLink: { _type: 'page' } }, '/x/'), '/x/');
});

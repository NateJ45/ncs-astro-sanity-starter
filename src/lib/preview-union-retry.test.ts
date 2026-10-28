// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Unit tests for the "ask the Studio again" nudge (preview-union-retry.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RETRY_KEY_PREFIX,
  isKeyedEditAttr,
  newKeyedAttrs,
  parseEditAttr,
  retryAttrFor,
} from './preview-union-retry.ts';

const SECTION = 'id=faqPage;type=faqPage;path=additionalSections:ebe7e2ee26ea;base=%2Fstudio';
const HANDLE = 'id=faqPage;type=faqPage;path=additionalSections:ebe7e2ee26ea.width;base=%2Fstudio';
const TITLE = 'id=faqPage;type=faqPage;path=title;base=%2Fstudio';

test('parseEditAttr splits the encoded attribute', () => {
  const parts = parseEditAttr(HANDLE);
  assert.equal(parts.get('id'), 'faqPage');
  assert.equal(parts.get('path'), 'additionalSections:ebe7e2ee26ea.width');
  assert.equal(parts.get('base'), '%2Fstudio');
});

test('only targets inside an array item are keyed', () => {
  assert.equal(isKeyedEditAttr(SECTION), true);
  assert.equal(isKeyedEditAttr(HANDLE), true);
  assert.equal(isKeyedEditAttr(TITLE), false);
  assert.equal(isKeyedEditAttr('not an attribute'), false);
});

test('newKeyedAttrs reports only unseen keyed targets, once each', () => {
  const seen = new Set([SECTION]);
  assert.deepEqual(newKeyedAttrs(seen, [SECTION, TITLE, HANDLE, HANDLE]), [HANDLE]);
  assert.deepEqual(newKeyedAttrs(new Set([SECTION, HANDLE]), [SECTION, HANDLE]), []);
});

test('retryAttrFor names the same document and field with a throwaway key', () => {
  const retry = retryAttrFor(HANDLE, 3);
  assert.ok(retry);
  const parts = parseEditAttr(retry);
  assert.equal(parts.get('id'), 'faqPage');
  assert.equal(parts.get('type'), 'faqPage');
  assert.equal(parts.get('base'), '%2Fstudio');
  assert.equal(parts.get('path'), `additionalSections:${RETRY_KEY_PREFIX}3`);
  // Each nudge is a path the library has not reported yet.
  assert.notEqual(retryAttrFor(HANDLE, 4), retry);
  assert.equal(retryAttrFor(TITLE, 1), null);
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The sign-in wording and Home's recent-edits ignore list (card 129).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SIGN_IN_ONCE_NOTE, recentEditsIgnore, signInNote } from './studio-signin.ts';

describe('signInNote', () => {
  it('says the one-time switch on a 401 with no token', () => {
    assert.equal(signInNote(false, 401, 'Sign in to the Studio again.', 'x'), SIGN_IN_ONCE_NOTE);
  });
  it('keeps the route words when a token was sent', () => {
    assert.equal(signInNote(true, 401, 'Your session ended.', 'x'), 'Your session ended.');
  });
  it('falls back when the route said nothing', () => {
    assert.equal(signInNote(true, 500, undefined, 'Try later.'), 'Try later.');
  });
  it('is plain: no em-dash, mentions signing out and in', () => {
    assert.ok(!SIGN_IN_ONCE_NOTE.includes('\u2014'));
    assert.match(SIGN_IN_ONCE_NOTE, /Sign out/);
    assert.match(SIGN_IN_ONCE_NOTE, /sign in again/);
  });
});

describe('recentEditsIgnore', () => {
  it('adds recent-only types to the checkup list without duplicates', () => {
    assert.deepEqual(recentEditsIgnore(['a', 'b'], ['b', 'result'], 'week'), [
      'a',
      'b',
      'result',
      'week',
    ]);
  });
  it('works with no recent list', () => {
    assert.deepEqual(recentEditsIgnore(['a'], undefined), ['a']);
  });
});

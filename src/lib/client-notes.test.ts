// The client-notes review layer must never reach production (PORTS.md card 195).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clientNotesActive,
  clientNotesProblem,
  isPreLaunchUrl,
  livePagePath,
  markerPattern,
} from './client-notes.ts';
import { CLIENT_NOTES_ON, MARKERS, notesFor } from '../data/client-notes.ts';
import { site } from '../data/site.ts';

test('pre-launch addresses are recognised, real domains are not', () => {
  for (const u of [
    'https://example.com',
    'https://my-site.nathanjnixon86.workers.dev',
    'https://abc.pages.dev',
    'http://localhost:4321',
    'http://127.0.0.1:8787',
    'https://preview.example.com',
    'https://thing.test',
  ]) {
    assert.equal(isPreLaunchUrl(u), true, u);
  }
  for (const u of [
    'https://www.realchurch.org',
    'https://notexample.com',
    'https://workers.dev.evil.org',
    'nonsense',
  ]) {
    assert.equal(isPreLaunchUrl(u), false, u);
  }
});

test('the layer draws only with the switch on and a pre-launch address', () => {
  assert.equal(clientNotesActive(true, 'https://x.workers.dev'), true);
  assert.equal(clientNotesActive(false, 'https://x.workers.dev'), false);
  assert.equal(clientNotesActive(true, 'https://www.realchurch.org'), false);
});

test('a switch left on at a live address is a problem', () => {
  assert.ok(clientNotesProblem(true, 'https://www.realchurch.org'));
  assert.equal(clientNotesProblem(true, 'https://x.workers.dev'), null);
  assert.equal(clientNotesProblem(false, 'https://www.realchurch.org'), null);
});

// THE GUARD. This is the test that stops a production deploy with the switch left on.
test('this site: the switch is not on at a live address', () => {
  assert.equal(clientNotesProblem(CLIENT_NOTES_ON, site.url), null);
});

test('the starter ships with the switch off', () => {
  // The starter itself must never ship it on; a fork (a different site name) may.
  if (site.name === 'Studio Starter') assert.equal(CLIENT_NOTES_ON, false);
});

test('page paths: the draft preview finds the live page', () => {
  assert.equal(livePagePath('/preview/'), '/');
  assert.equal(livePagePath('/preview'), '/');
  assert.equal(livePagePath('/preview/about'), '/about/');
  assert.equal(livePagePath('/about'), '/about/');
  assert.equal(livePagePath('/'), '/');
  assert.deepEqual(notesFor('/preview/'), notesFor('/'));
});

test('markers: the pattern matches the listed words only', () => {
  const re = new RegExp(markerPattern(MARKERS), 'g');
  assert.ok('say [Client: the hours] now'.match(re));
  assert.ok('[Placeholder: a welcome]'.match(re));
  assert.equal('[Other: no]'.match(re), null);
  assert.equal('[Clients: no]'.match(re), null);
  assert.equal(markerPattern(['Bad(', 'Ok']), '\\[(?:Ok)\\b[^\\]\\n]*\\]');
});

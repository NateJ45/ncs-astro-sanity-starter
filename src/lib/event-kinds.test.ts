// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Pins the privacy page's event wording (src/lib/event-kinds.ts, PORTS.md card 217):
// it follows the events map, drops what is switched off, and cannot miss an event.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventKinds, eventsSentence } from './event-kinds.ts';

test('an empty map still names the built-in kinds', () => {
  const kinds = eventKinds({});
  assert.ok(kinds.some((k) => k.startsWith('video links')));
  assert.ok(kinds.some((k) => k.startsWith('email and phone links')));
  assert.ok(kinds.some((k) => k.startsWith('how far down an article')));
  assert.ok(!kinds.some((k) => k.startsWith('giving links')));
});

test('a rule adds its own kind, once', () => {
  const kinds = eventKinds({
    links: [
      { host: 'give.example.net', event: 'give_click' },
      { own: true, path: /^\/give/, event: 'give_click' },
    ],
  });
  assert.equal(kinds.filter((k) => k === 'giving links').length, 1);
});

test('switched-off events leave the wording', () => {
  const kinds = eventKinds({ off: ['outbound_click', 'download_click', 'js_error'] });
  assert.ok(!kinds.includes('file downloads'));
  assert.ok(!kinds.includes('links to other sites'));
  assert.ok(!kinds.some((k) => k.includes('scripts')));
});

test('a form kind stays while any one of its events is sent', () => {
  const some = eventKinds({ off: ['form_view', 'embed_interact'] });
  assert.ok(some.some((k) => k.startsWith('whether a form')));
  const none = eventKinds({ off: ['form_view', 'embed_interact', 'generate_lead'] });
  assert.ok(!none.some((k) => k.startsWith('whether a form')));
});

test('a site event uses its own words, or is never sent unmentioned', () => {
  const described = eventKinds({
    links: [{ host: 'app.example.net', event: 'app_click', describe: 'links to the church app' }],
  });
  assert.ok(described.includes('links to the church app'));
  const bare = eventKinds({ links: [{ host: 'x.example.net', event: 'badge_click' }] });
  assert.ok(bare.includes('other links the site marks'));
  const gone = eventKinds({
    links: [{ host: 'x.example.net', event: 'badge_click' }],
    off: ['badge_click'],
  });
  assert.ok(!gone.includes('other links the site marks'));
});

test('the sentence reads as plain words with no em-dash', () => {
  const s = eventsSentence({ off: ['outbound_click', 'download_click'] });
  assert.match(s, /^It also records what visitors do on the site: .+ and .+\.$/);
  assert.ok(!s.includes('\u2014'));
});

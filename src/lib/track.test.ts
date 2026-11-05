// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Pins the link classifier (src/lib/track.ts, PORTS.md card 217) against a SAMPLE
// map written here, so the test passes in any site whatever its own
// src/config/events.ts says. A site's own rules are pinned by its e2e spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink, cleanSearchTerm, type EventsConfig } from './track.ts';

const OWN = 'www.example.org';

const sample: EventsConfig = {
  links: [
    { path: /\.ics$/, event: 'calendar_add' },
    { own: true, path: /^\/give(\/|$)/, event: 'give_click', params: { destination: 'give_page' } },
    { host: 'give.example.net', event: 'give_click', params: { destination: 'platform' } },
    { host: 'register.example.net', event: 'register_click' },
  ],
};

/** Classify a link as a browser would: the href as written, resolved against the page. */
function hit(href: string, config: EventsConfig = sample, where = 'page') {
  return classifyLink(href, new URL(href, `https://${OWN}/page/`).href, OWN, where, config);
}

test('email and phone links send the kind, never the address', () => {
  assert.deepEqual(hit('mailto:someone@example.org'), {
    event: 'contact_click',
    params: { method: 'email', location: 'page' },
  });
  assert.deepEqual(hit('tel:+15555550100', sample, 'footer'), {
    event: 'contact_click',
    params: { method: 'phone', location: 'footer' },
  });
  assert.ok(!JSON.stringify(hit('mailto:someone@example.org')).includes('someone'));
});

test('the site map names giving, registering and calendar links', () => {
  assert.deepEqual(hit('/give/'), {
    event: 'give_click',
    params: { destination: 'give_page', location: 'page' },
  });
  assert.equal(hit('/give')?.event, 'give_click');
  assert.equal(hit('https://give.example.net/fund/1')?.params.destination, 'platform');
  assert.equal(hit('https://register.example.net/e/2')?.event, 'register_click');
  assert.equal(hit('/visit/sunday.ics')?.event, 'calendar_add');
  assert.equal(hit('https://elsewhere.org/a.ics')?.event, 'calendar_add');
});

test('a path that only starts like a site rule is not that rule', () => {
  assert.equal(hit('/giveaway/'), null);
  // The rule says own: true, so another site's /give is only an outbound link.
  assert.equal(hit('https://elsewhere.org/give')?.event, 'outbound_click');
});

test('video links say streams, video or channel', () => {
  const dest = (u: string) => hit(u)?.params.destination;
  assert.equal(hit('https://www.youtube.com/@Someone/streams')?.event, 'watch_click');
  assert.equal(dest('https://www.youtube.com/@Someone/streams'), 'streams');
  assert.equal(dest('https://www.youtube.com/@Someone/live'), 'streams');
  assert.equal(dest('https://www.youtube.com/watch?v=abc'), 'video');
  assert.equal(dest('https://youtu.be/abc'), 'video');
  assert.equal(dest('https://vimeo.com/123'), 'video');
  assert.equal(dest('https://www.youtube.com/@Someone'), 'channel');
});

test('map links are directions; a bare google.com link is not', () => {
  assert.equal(hit('https://www.google.com/maps/search/?api=1&query=x')?.event, 'directions_click');
  assert.equal(hit('https://maps.apple.com/?q=x')?.event, 'directions_click');
  assert.equal(hit('https://maps.app.goo.gl/abc')?.event, 'directions_click');
  assert.equal(hit('https://www.google.com/search?q=x')?.event, 'outbound_click');
});

test('files send download_click with the extension and name', () => {
  assert.deepEqual(hit('/files/Bulletin-Nov.PDF')?.params, {
    file_extension: 'pdf',
    file_name: 'bulletin-nov.pdf',
    location: 'page',
  });
  assert.equal(hit('https://cdn.example.net/a/b.zip')?.event, 'download_click');
});

test('a link to another site is an outbound click named by host', () => {
  assert.deepEqual(hit('https://www.example.com/a?b=1', sample, 'nav'), {
    event: 'outbound_click',
    params: { destination: 'example.com', location: 'nav' },
  });
});

test('ordinary links on this site send nothing', () => {
  assert.equal(hit('/visit/'), null);
  assert.equal(hit('#top'), null);
  assert.equal(hit('https://example.org/about/'), null); // apex counts as this site
  assert.equal(hit('sms:+15555550100'), null);
});

test('with an empty map only the built-in rules run', () => {
  assert.equal(hit('/give/', {}), null);
  assert.equal(hit('https://give.example.net/fund/1', {})?.event, 'outbound_click');
  assert.equal(hit('tel:+15555550100', {})?.event, 'contact_click');
});

test('the site map runs before the built-in rules', () => {
  const own: EventsConfig = {
    links: [{ host: 'youtube.com', event: 'sermon_click', params: { destination: 'channel' } }],
  };
  assert.equal(hit('https://www.youtube.com/watch?v=abc', own)?.event, 'sermon_click');
});

test('events listed in off are not sent, and do not fall through to another rule', () => {
  const off: EventsConfig = { ...sample, off: ['outbound_click', 'download_click', 'give_click'] };
  assert.equal(hit('https://www.example.com/', off), null);
  assert.equal(hit('/files/a.pdf', off), null);
  assert.equal(hit('/give/', off), null);
  assert.equal(hit('tel:+15555550100', off)?.event, 'contact_click');
});

test('a rule can compute its parameters from the link', () => {
  const dynamic: EventsConfig = {
    links: [
      {
        host: 'play.google.com',
        event: 'app_click',
        params: (l) => ({ destination: l.path.includes('ios') ? 'ios' : 'android' }),
      },
    ],
  };
  assert.equal(hit('https://play.google.com/store/apps/x', dynamic)?.params.destination, 'android');
});

test('search words that look like an email or a phone number are withheld', () => {
  assert.equal(cleanSearchTerm('  Sunday Service '), 'sunday service');
  assert.equal(cleanSearchTerm('me@example.org'), '(withheld)');
  assert.equal(cleanSearchTerm('555 123 4567'), '(withheld)');
  assert.equal(cleanSearchTerm('x'.repeat(200)).length, 80);
});

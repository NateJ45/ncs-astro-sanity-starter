// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for social-links.ts (PORTS.md card 167): the platform is read from the link's address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SOCIAL_LINKS,
  isValidWhatsAppUrl,
  platformFromUrl,
  resolveSocialLinks,
  socialLabel,
  socialUrlWarning,
} from './social-links.ts';

const fb = 'https://www.facebook.com/ExampleStudio';
const tiktok = 'https://www.tiktok.com/@example.studio';

test('the Social links list comes through in order, skipping empty rows', () => {
  const links = resolveSocialLinks({
    socialLinks: [
      { platform: 'Facebook', url: fb },
      { platform: 'YouTube', url: '' },
      { platform: 'TikTok', url: tiktok },
    ],
  });
  assert.deepEqual(
    links.map((l) => l.platform),
    ['Facebook', 'TikTok'],
  );
});

test('a pinned Facebook address is not doubled when the list already has Facebook', () => {
  const links = resolveSocialLinks(
    {
      socialLinks: [
        { platform: 'Facebook', url: fb },
        { platform: 'TikTok', url: tiktok },
      ],
    },
    fb,
  );
  assert.equal(links.length, 2);
});

test('a pinned Facebook address joins the front when the list lacks it', () => {
  const links = resolveSocialLinks({ socialLinks: [{ platform: 'TikTok', url: tiktok }] }, fb);
  assert.deepEqual(
    links.map((l) => l.platform),
    ['Facebook', 'TikTok'],
  );
});

test('an empty list falls back to the legacy fields', () => {
  const links = resolveSocialLinks({ socialLinks: [], socialInstagram: 'https://instagram.com/x' });
  assert.deepEqual(links, [{ platform: 'Instagram', url: 'https://instagram.com/x' }]);
});

test('nothing set gives no buttons', () => {
  assert.deepEqual(resolveSocialLinks(null), []);
});

test('the label wins over the platform for the accessible name', () => {
  assert.equal(socialLabel({ platform: 'Other', url: 'x', label: 'Our blog' }), 'Our blog');
  assert.equal(socialLabel({ platform: 'TikTok', url: 'x' }), 'TikTok');
});

test('the icon platform is read from the address for every common account', () => {
  const cases: [string, string][] = [
    ['https://www.facebook.com/ExampleStudio', 'Facebook'],
    ['https://m.facebook.com/ExampleStudio', 'Facebook'],
    ['https://www.instagram.com/example', 'Instagram'],
    ['https://www.youtube.com/@example', 'YouTube'],
    ['https://youtu.be/abc123', 'YouTube'],
    ['https://www.tiktok.com/@example.studio', 'TikTok'],
    ['https://wa.me/15555550100', 'WhatsApp'],
    ['https://chat.whatsapp.com/AbCdEf123', 'WhatsApp'],
    ['https://x.com/example', 'X'],
    ['https://twitter.com/example', 'X'],
    ['https://www.threads.net/@example', 'Threads'],
    ['https://open.spotify.com/show/abc', 'Spotify'],
    ['https://podcasts.apple.com/us/podcast/x/id1', 'Apple Podcasts'],
    ['https://vimeo.com/123', 'Vimeo'],
    ['https://www.linkedin.com/company/example', 'LinkedIn'],
    ['https://www.pinterest.com/example', 'Pinterest'],
    ['https://nextdoor.com/pages/example', 'Nextdoor'],
    ['https://www.flickr.com/photos/example', 'Flickr'],
    ['https://linktr.ee/example', 'Linktree'],
    ['https://www.houzz.com/professionals/example', 'Houzz'],
  ];
  for (const [url, platform] of cases) {
    assert.equal(platformFromUrl(url)?.key, platform, url);
    assert.equal(resolveSocialLinks({ socialLinks: [{ url }] })[0]?.platform, platform, url);
  }
});

test('a site we do not know gets the plain link and the label, or its domain', () => {
  const [withLabel] = resolveSocialLinks({
    socialLinks: [{ url: 'https://www.exampleblog.org/news', label: 'Our blog' }],
  });
  assert.equal(withLabel.platform, 'Other');
  assert.equal(socialLabel(withLabel), 'Our blog');
  const [bare] = resolveSocialLinks({ socialLinks: [{ url: 'https://www.exampleblog.org/news' }] });
  assert.equal(socialLabel(bare), 'exampleblog.org');
  assert.equal(platformFromUrl('https://notfacebook.com/x'), null);
});

test('existing rows keep working: the stored platform stands in for an unknown address', () => {
  const links = resolveSocialLinks({
    socialLinks: [
      // Rows saved with the old Platform dropdown.
      { platform: 'Facebook', url: fb },
      { platform: 'TikTok', url: tiktok, label: 'Our studio on TikTok' },
      // A vanity address that forwards to Facebook.
      { platform: 'Facebook', url: 'https://examplefb.example.org' },
      // A value the dropdown offered that this file does not know falls to the plain link.
      { platform: 'Myspace', url: 'https://example.org/old' },
    ],
  });
  assert.deepEqual(
    links.map((l) => [l.platform, socialLabel(l)]),
    [
      ['Facebook', 'Facebook'],
      ['TikTok', 'Our studio on TikTok'],
      ['Facebook', 'Facebook'],
      ['Other', 'example.org'],
    ],
  );
});

test('the address wins over a wrong stored platform', () => {
  const [link] = resolveSocialLinks({ socialLinks: [{ platform: 'Other', url: tiktok }] });
  assert.equal(link.platform, 'TikTok');
});

test('a WhatsApp link renders only with a valid invite or number address', () => {
  for (const url of ['https://wa.me/15555550100', 'https://chat.whatsapp.com/AbCdEf123']) {
    assert.equal(isValidWhatsAppUrl(url), true, url);
    const links = resolveSocialLinks({ socialLinks: [{ url }] });
    assert.equal(links.length, 1, url);
    assert.equal(socialLabel(links[0]), 'WhatsApp');
  }
  for (const url of [
    '',
    'https://wa.me/',
    'http://wa.me/15555550100',
    'https://www.whatsapp.com/',
    'https://api.whatsapp.com/send?phone=15555550100',
    'https://web.whatsapp.com/',
  ]) {
    assert.equal(isValidWhatsAppUrl(url), false, url);
    assert.deepEqual(resolveSocialLinks({ socialLinks: [{ url }] }), [], url);
    assert.deepEqual(
      resolveSocialLinks({ socialLinks: [{ platform: 'WhatsApp', url }] }),
      [],
      `${url} (stored WhatsApp)`,
    );
  }
  // A row picked as WhatsApp in the old dropdown but pointing elsewhere is not drawn either.
  assert.deepEqual(
    resolveSocialLinks({ socialLinks: [{ platform: 'WhatsApp', url: 'https://example.org/x' }] }),
    [],
  );
});

test('no WhatsApp row means no WhatsApp button', () => {
  const links = resolveSocialLinks(
    {
      socialLinks: [
        { platform: 'Facebook', url: fb },
        { platform: 'TikTok', url: tiktok },
      ],
    },
    fb,
  );
  assert.equal(
    links.some((l) => l.platform === 'WhatsApp'),
    false,
  );
});

test('a non-web address is left out, and the row count is capped', () => {
  assert.deepEqual(resolveSocialLinks({ socialLinks: [{ url: 'javascript:alert(1)' }] }), []);
  assert.deepEqual(resolveSocialLinks({ socialLinks: [{ url: 'not a link' }] }), []);
  const many = Array.from({ length: MAX_SOCIAL_LINKS + 3 }, (_, i) => ({
    url: `https://example${i}.org/`,
  }));
  assert.equal(resolveSocialLinks({ socialLinks: many }).length, MAX_SOCIAL_LINKS);
});

test('the Studio warns, without blocking, on an odd address', () => {
  assert.equal(socialUrlWarning(fb), null);
  assert.equal(socialUrlWarning('https://www.exampleblog.org/'), null);
  assert.match(socialUrlWarning('https://www.whatsapp.com/') ?? '', /will not show/);
  assert.match(socialUrlWarning('https://www.facebook.com/') ?? '', /home page/);
  assert.match(socialUrlWarning('https://www.google.com/search?q=example') ?? '', /search/);
});

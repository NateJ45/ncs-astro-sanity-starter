// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The sitemap filter (src/lib/sitemap-filter.ts, card 122).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSitemapPage } from './sitemap-filter.ts';

const hidden = new Set(['/staff-only']);
const keep = (u: string) => isSitemapPage(`https://example.com${u}`, hidden);

describe('isSitemapPage', () => {
  it('keeps ordinary pages', () => {
    for (const u of ['/', '/about/', '/visit/', '/journal/a-post/', '/private-hire/'])
      assert.equal(keep(u), true, u);
  });
  it('drops a page hidden from Google and the menus', () => {
    assert.equal(keep('/staff-only/'), false);
    assert.equal(keep('/staff-only'), false);
  });
  it('drops plumbing, the 404, the styleguide and password pages', () => {
    for (const u of ['/404/', '/studio/', '/preview/about/', '/styleguide/', '/private/members/'])
      assert.equal(keep(u), false, u);
  });
  it('drops the visitor search page (card 126) but keeps a page that only starts with search', () => {
    assert.equal(keep('/search/'), false);
    assert.equal(keep('/search-and-rescue/'), true);
  });
  it('keeps a URL it cannot parse rather than guess', () => {
    assert.equal(isSitemapPage('not a url', hidden), true);
  });
});

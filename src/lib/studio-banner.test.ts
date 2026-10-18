// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 118: Home's banner (src/lib/studio-banner.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  colorLetters,
  fontFaceCss,
  letteringStack,
  readableColors,
  readableOn,
  siteHref,
  splitName,
} from './studio-banner.ts';

const NAVY = '#1B4A75';

describe('readableOn', () => {
  it('keeps a colour that reads at the bar and drops one that does not', () => {
    assert.equal(readableOn('#E8A93A', NAVY), null); // gold on navy, about 4.1:1: not body text
    assert.equal(readableOn('#E8A93A', NAVY, 3), '#E8A93A'); // but fine as large text
    assert.equal(readableOn('#2C5B3A', NAVY), null); // green on navy vanishes
    assert.equal(readableOn('#FFFFFF', NAVY), '#FFFFFF');
  });
  it('drops anything that is not a hex colour', () => {
    assert.equal(readableOn('gold', NAVY), null);
    assert.equal(readableOn(undefined, NAVY), null);
    assert.equal(readableOn('#fff', 'navy'), null);
  });
});

describe('readableColors', () => {
  it('keeps large-text colours at 3:1 in order', () => {
    assert.deepEqual(readableColors(['#FFFFFF', '#2C5B3A', '#96C3EA', '#E8A93A'], NAVY), [
      '#FFFFFF',
      '#96C3EA',
      '#E8A93A',
    ]);
  });
  it('is empty for no colours', () => {
    assert.deepEqual(readableColors(undefined, NAVY), []);
  });
});

describe('splitName', () => {
  it('splits around the last match, keeping the name as written', () => {
    assert.deepEqual(splitName('First Baptist Church of Auburn', 'auburn'), {
      before: 'First Baptist Church of ',
      lettered: 'Auburn',
      after: '',
    });
    assert.deepEqual(splitName('Auburn Road Auburn Hall', 'Auburn'), {
      before: 'Auburn Road ',
      lettered: 'Auburn',
      after: ' Hall',
    });
  });
  it('is null with no word or no match', () => {
    assert.equal(splitName('First Baptist', undefined), null);
    assert.equal(splitName('First Baptist', '  '), null);
    assert.equal(splitName('First Baptist', 'Auburn'), null);
  });
});

describe('colorLetters', () => {
  it('cycles the colours over letters and skips spaces', () => {
    const out = colorLetters('ab c', ['#1', '#2']);
    assert.deepEqual(
      out.map((l) => l.color),
      ['#1', '#2', null, '#1'],
    );
  });
  it('leaves every letter uncoloured with no colours', () => {
    assert.ok(colorLetters('Auburn', []).every((l) => l.color === null));
  });
});

describe('fontFaceCss', () => {
  it('writes a woff2 rule for a same-origin path', () => {
    assert.equal(
      fontFaceCss('Auburn Stone', '/fonts/auburn-stone.woff2'),
      "@font-face{font-family:'Auburn Stone';src:url('/fonts/auburn-stone.woff2') format('woff2');font-display:swap}",
    );
  });
  it('refuses another host, an empty value, and strips characters that could close the rule', () => {
    assert.equal(fontFaceCss('X', 'https://example.com/x.woff2'), null);
    assert.equal(fontFaceCss('', '/x.woff2'), null);
    const css = fontFaceCss("X'}body{", '/x.woff2') ?? '';
    assert.ok(!css.includes('}body{'));
  });
  it('builds a stack that falls back to the heading font', () => {
    assert.equal(
      letteringStack('Auburn Stone', '"Young Serif", serif'),
      '\'Auburn Stone\', "Young Serif", serif',
    );
  });
});

describe('siteHref', () => {
  it('defaults to this origin', () => {
    assert.equal(siteHref(undefined, 'https://example.org'), 'https://example.org/');
    assert.equal(siteHref('', 'http://localhost:4321/'), 'http://localhost:4321/');
    assert.equal(siteHref(undefined, undefined), '/');
  });
  it('uses a configured absolute address', () => {
    assert.equal(siteHref('https://church.org/', 'http://localhost:4321'), 'https://church.org/');
    assert.equal(siteHref('javascript:alert(1)', 'https://a.org'), 'https://a.org/');
  });
});

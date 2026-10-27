// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  footerStyle,
  phoneMenuGroups,
  pickActionBar,
  studioSlugOf,
  whereNextRows,
} from './wayfinding.ts';

const row = (label: string, href: string, note = '') => ({ link: { label, href }, note });

test('where next: three rows, the page you are on drops out and the next moves up', () => {
  const raw = [
    row('Contact', '/contact/', 'Say hello'),
    row('About', '/about/'),
    row('Pricing', '/pricing/'),
    row('Privacy', '/privacy/'),
  ];
  // Which of these are site routes differs per site, so list them all as published.
  const published = ['contact', 'about', 'pricing', 'privacy'];
  const onHome = whereNextRows(raw, '/', published);
  assert.deepEqual(
    onHome.map((r) => r.href),
    ['/contact/', '/about/', '/pricing/'],
  );
  assert.equal(onHome[0].note, 'Say hello');
  const onAbout = whereNextRows(raw, '/about/', published);
  assert.deepEqual(
    onAbout.map((r) => r.href),
    ['/contact/', '/pricing/', '/privacy/'],
  );
});

test('where next: a Studio page shows only while it is published', () => {
  const raw = [row('Pricing', '/pricing'), row('Studio', '/studio/')];
  assert.deepEqual(
    whereNextRows(raw, '/', []).map((r) => r.href),
    ['/studio/'],
  );
  const picked = [{ link: { label: 'Team', linkType: 'internal', docType: 'page', slug: 'team' } }];
  assert.equal(whereNextRows(picked, '/', []).length, 0);
  assert.equal(whereNextRows(picked, '/', ['team'])[0].href, '/team/');
});

test('where next: empty or broken settings draw nothing', () => {
  assert.deepEqual(whereNextRows(null, '/', []), []);
  assert.deepEqual(whereNextRows([null, { link: { label: 'No address' } }], '/', []), []);
});

test('studioSlugOf: site routes and outside links are never Studio pages', () => {
  assert.equal(studioSlugOf({ href: '/studio/' }, '/studio/'), undefined);
  assert.equal(studioSlugOf({ href: '/team/' }, '/team/'), 'team');
  assert.equal(studioSlugOf({ href: '/journal/post/' }, '/journal/post/'), undefined);
  assert.equal(studioSlugOf({ href: '/brochure.pdf' }, '/brochure.pdf'), undefined);
});

test('phone menu groups: titled groups with working links; the menu button is not repeated', () => {
  const groups = phoneMenuGroups(
    [
      {
        title: 'New here',
        links: [
          { label: 'Visit', href: '/visit' },
          { label: 'About', href: '/about/' },
        ],
      },
      { title: '', links: [{ label: 'X', href: '/x/' }] },
      { title: 'Empty', links: [] },
      { title: 'Reach us', links: [{ label: 'Contact', href: '/contact/' }] },
    ],
    '/visit/',
  );
  assert.deepEqual(groups, [
    { title: 'New here', links: [{ label: 'About', href: '/about/' }] },
    { title: 'Reach us', links: [{ label: 'Contact', href: '/contact/' }] },
  ]);
  assert.deepEqual(phoneMenuGroups(undefined), []);
});

test('footer style: only "compact" changes anything', () => {
  assert.equal(footerStyle('compact'), 'compact');
  assert.equal(footerStyle(undefined), 'columns');
  assert.equal(footerStyle('columns'), 'columns');
  assert.equal(footerStyle('something else'), 'columns');
});

test('action bar: the page own bar wins, then the every-page bar, else none', () => {
  const bars = [
    { everyPage: true, text: 'Open today', action: { label: 'Book', href: '/contact/' } },
    { page: { docType: 'homePage' }, text: 'Welcome', action: { label: 'Visit', href: '/visit/' } },
    { page: { docType: 'page', slug: 'team' }, action: { label: 'Join', href: '/join/' } },
  ];
  assert.deepEqual(pickActionBar(bars, '/'), { text: 'Welcome', label: 'Visit', href: '/visit/' });
  assert.deepEqual(pickActionBar(bars, '/team/'), { text: '', label: 'Join', href: '/join/' });
  assert.deepEqual(pickActionBar(bars, '/about/'), {
    text: 'Open today',
    label: 'Book',
    href: '/contact/',
  });
  // Never a button to the page you are on.
  assert.equal(pickActionBar(bars, '/contact/'), null);
  assert.equal(pickActionBar([bars[1]], '/about/'), null);
  assert.equal(pickActionBar([{ everyPage: true, text: 'No button' }], '/'), null);
  assert.equal(pickActionBar(null, '/'), null);
});

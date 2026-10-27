// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Popups (src/lib/popup.ts, PORTS.md card 170): which popup is live, where it shows, the
// overlap warning and the dismissal key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POPUP_PAGE_TYPES,
  pathForPage,
  pickPopup,
  popupSeenKey,
  popupShowsOn,
  popupsOverlap,
} from './popup.ts';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const p = (id: string, extra: Record<string, unknown> = {}) => ({ _id: id, title: id, ...extra });

test('picks the popup that started most recently, ignoring ended ones', () => {
  const list = [
    p('old', { startDate: '2026-11-01T00:00:00Z' }),
    p('newer', { startDate: '2026-11-08T00:00:00Z' }),
    p('ended', { startDate: '2026-11-09T00:00:00Z', endDate: '2026-11-09T23:00:00Z' }),
    p('future', { startDate: '2026-11-20T00:00:00Z' }),
  ];
  assert.equal(pickPopup(list, NOW)?._id, 'newer');
});

test('with none started, picks the soonest upcoming (the browser checks its start date)', () => {
  const list = [
    p('later', { startDate: '2026-12-01T00:00:00Z' }),
    p('sooner', { startDate: '2026-11-20T00:00:00Z' }),
  ];
  assert.equal(pickPopup(list, NOW)?._id, 'sooner');
  assert.equal(pickPopup([], NOW), null);
  assert.equal(pickPopup(null, NOW), null);
  assert.equal(pickPopup([p('untitled', { title: ' ' })], NOW), null);
});

test('maps chosen pages to their addresses', () => {
  assert.equal(pathForPage({ _type: 'page', slug: 'plan-your-visit' }), '/plan-your-visit/');
  assert.equal(pathForPage({ _type: 'aboutPage' }), '/about/');
  assert.equal(pathForPage({ _type: 'homePage' }), '/');
  assert.equal(pathForPage({ _type: 'page' }), null);
  assert.equal(pathForPage({ _type: 'notFoundPage' }), null, 'the 404 page is not a choice');
  assert.equal(pathForPage(null), null);
});

test('the page types offered are pages with an address of their own', () => {
  assert.equal(POPUP_PAGE_TYPES[0], 'page');
  assert.ok(POPUP_PAGE_TYPES.includes('homePage'));
  assert.ok(!POPUP_PAGE_TYPES.includes('notFoundPage'));
  for (const type of POPUP_PAGE_TYPES.slice(1)) {
    assert.match(pathForPage({ _type: type }) ?? '', /^\/([^#]*\/)?$/, type);
  }
});

test('shows on all pages, Home only, or the chosen pages, never on the Studio or preview', () => {
  const all = p('a');
  assert.equal(popupShowsOn(all, '/about/'), true);
  assert.equal(popupShowsOn(all, '/studio/'), false);
  assert.equal(popupShowsOn(all, '/preview/about'), false);
  assert.equal(popupShowsOn(all, '/private/staff/'), false);
  assert.equal(popupShowsOn(all, '/api/contact/'), false);
  const home = p('h', { where: 'home' });
  assert.equal(popupShowsOn(home, '/'), true);
  assert.equal(popupShowsOn(home, '/about/'), false);
  const chosen = p('c', {
    where: 'chosen',
    pages: [{ _type: 'page', slug: 'plan-your-visit' }, { _type: 'contactPage' }],
  });
  assert.equal(popupShowsOn(chosen, '/plan-your-visit/'), true);
  assert.equal(popupShowsOn(chosen, '/plan-your-visit'), true);
  assert.equal(popupShowsOn(chosen, '/contact/'), true);
  assert.equal(popupShowsOn(chosen, '/'), false);
  assert.equal(popupShowsOn(null, '/'), false);
});

test('overlap: open-ended windows overlap everything after them', () => {
  const a = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-07T00:00:00Z' };
  const b = { startDate: '2026-11-07T00:00:00Z', endDate: '2026-11-14T00:00:00Z' };
  assert.equal(popupsOverlap(a, b), false, 'back to back is fine');
  assert.equal(popupsOverlap(a, { startDate: '2026-11-05T00:00:00Z' }), true);
  assert.equal(popupsOverlap({}, {}), true);
  assert.equal(popupsOverlap(a, { endDate: '2026-10-30T00:00:00Z' }), false);
});

test('the dismissal key changes when the popup is edited', () => {
  const k1 = popupSeenKey({ _id: 'drafts.x', _updatedAt: '2026-11-01T00:00:00Z' });
  const k2 = popupSeenKey({ _id: 'x', _updatedAt: '2026-11-02T00:00:00Z' });
  assert.match(k1, /^site-popup:x:/);
  assert.notEqual(k1, k2);
});

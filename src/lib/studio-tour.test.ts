// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Spotlight tours, welcome and What's new: the pure half (card 137)
// =============================================================================
// Also runs over THIS site's kit.config.ts tour data, so a site agent's typo
// (a welcome naming a tour that is not there, an em-dash) fails the unit tests.
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allTours,
  anchorSelectors,
  firstRunTour,
  newestNews,
  pickTour,
  placePopover,
  seenKeys,
  spotlightBox,
  toolTour,
  tourConfigProblems,
  unseenNews,
  type TourDef,
} from './studio-tour.ts';

const tours: TourDef[] = [
  {
    id: 'staff-start',
    title: 'A quick tour',
    role: 'staff',
    firstRun: true,
    steps: [{ title: 'Home', body: 'Start here.' }],
  },
  {
    id: 'editor-start',
    title: 'A quick tour',
    role: 'editor',
    firstRun: true,
    steps: [{ title: 'Home', body: 'Start here.' }],
  },
  {
    id: 'quick',
    title: 'How this screen works',
    tool: 'quick-update',
    steps: [{ anchor: 'quick-list', title: 'Jobs', body: 'Pick one.' }],
  },
];

describe('anchors', () => {
  it('maps kit hooks, Sanity names, quick tiles, tools and raw css', () => {
    assert.deepEqual(anchorSelectors('home-this-week'), ['[data-tour="home-this-week"]']);
    assert.ok(anchorSelectors('publish').some((s) => s.includes('action-publish')));
    assert.deepEqual(anchorSelectors('quick:post-notice'), ['[data-quick="post-notice"]']);
    assert.ok(anchorSelectors('tool:structure')[0].includes('tool-structure'));
    assert.deepEqual(anchorSelectors('css:.x > a'), ['.x > a']);
    assert.deepEqual(anchorSelectors('field:raceDate'), ['[data-testid="field-raceDate"]']);
    assert.deepEqual(anchorSelectors(undefined), []);
  });
});

describe('which tour', () => {
  it('keeps old tourSteps working as one first-run tour', () => {
    const t = allTours(undefined, [{ title: 'Hi', body: 'There' }]);
    assert.equal(t.length, 1);
    assert.equal(t[0].firstRun, true);
    assert.equal(t[0].id, 'first-run');
    assert.deepEqual(allTours(undefined, []), []);
  });
  it('picks by role, by tool and by id', () => {
    assert.equal(firstRunTour(tours, true)?.id, 'staff-start');
    assert.equal(firstRunTour(tours, false)?.id, 'editor-start');
    assert.equal(toolTour(tours, 'quick-update', true)?.id, 'quick');
    assert.equal(toolTour(tours, 'home', true), undefined);
    assert.equal(pickTour(tours, false, 'quick')?.id, 'quick');
    assert.equal(pickTour(tours, false)?.id, 'editor-start');
  });
  it('keys storage per person, tour and version', () => {
    assert.notEqual(
      seenKeys.tour('u1', tours[0]),
      seenKeys.tour('u1', { ...tours[0], version: 2 }),
    );
    assert.notEqual(seenKeys.tour('u1', tours[0]), seenKeys.tour('u2', tours[0]));
  });
});

describe("What's new", () => {
  const news = [
    { date: '2026-09-01', title: 'Older', items: ['a'] },
    { date: '2026-10-19', title: 'Newer', items: ['b'] },
  ];
  it('shows only what is newer than the last seen, newest first', () => {
    assert.deepEqual(
      unseenNews(news, null).map((n) => n.title),
      ['Newer', 'Older'],
    );
    assert.deepEqual(
      unseenNews(news, '2026-09-01').map((n) => n.title),
      ['Newer'],
    );
    assert.deepEqual(unseenNews(news, '2026-10-19'), []);
    assert.equal(newestNews(news), '2026-10-19');
    assert.equal(newestNews(undefined), null);
  });
});

describe('geometry', () => {
  it('keeps the cut-out on screen', () => {
    const b = spotlightBox({ x: 0, y: 0, w: 100, h: 40 }, 1280, 800);
    assert.ok(b.x >= 4 && b.y >= 4);
  });
  it('puts the popover below when there is room, beside when not, a sheet on a phone', () => {
    const below = placePopover({ x: 100, y: 100, w: 200, h: 50 }, 380, 240, 1280, 800);
    assert.equal(below.side, 'bottom');
    const above = placePopover({ x: 100, y: 600, w: 200, h: 150 }, 380, 240, 1280, 800);
    assert.equal(above.side, 'top');
    const sheet = placePopover({ x: 10, y: 700, w: 200, h: 50 }, 351, 240, 375, 812);
    assert.equal(sheet.mode, 'sheet');
    assert.equal(sheet.y, 12, 'anchor low on a phone: sheet at the top');
    assert.equal(placePopover(null, 380, 240, 1280, 800).mode, 'center');
  });
  it('never places the popover off screen', () => {
    for (const x of [0, 600, 1200]) {
      const p = placePopover({ x, y: 300, w: 80, h: 40 }, 380, 240, 1280, 800);
      assert.ok(p.x >= 0 && p.x + 380 <= 1280, `x=${x}`);
      assert.ok(p.y >= 0 && p.y + 240 <= 800, `x=${x}`);
    }
  });
});

describe('config checks', () => {
  it('finds a welcome that names a missing tour, an em-dash and a bad date', () => {
    const p = tourConfigProblems(tours, { title: 'Hi', body: 'x', tour: 'nope' }, [
      { date: '19 Oct', title: 'A — b', items: [] },
    ]);
    assert.equal(p.length, 3);
    assert.deepEqual(tourConfigProblems(tours), []);
  });
});

describe("this site's tours", () => {
  it('has no broken references, em-dashes or bad dates', async () => {
    const site = await import('../sanity/studio-tours.ts');
    assert.deepEqual(tourConfigProblems(site.TOURS, site.WELCOME, site.WHATS_NEW), []);
  });
});

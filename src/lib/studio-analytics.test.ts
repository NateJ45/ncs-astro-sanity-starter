// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 115: the Visitors card's mapping (src/lib/studio-analytics.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsRequest,
  analyticsWindow,
  isTag,
  SERIES_DAYS,
  sourceGroup,
  visitorsReport,
  weekCompare,
  type AnalyticsAnswer,
} from './studio-analytics.ts';

const NOW = new Date('2026-10-18T15:00:00Z');
const TAG = 'a'.repeat(32);

describe('analytics window and request', () => {
  it('covers 28 UTC days ending today, oldest first', () => {
    const w = analyticsWindow(NOW);
    assert.equal(w.days.length, SERIES_DAYS);
    assert.equal(w.days[0], '2026-09-21');
    assert.equal(w.days.at(-1), '2026-10-18');
    assert.equal(w.start, '2026-09-21T00:00:00.000Z');
    assert.equal(w.weekStart, '2026-10-11T15:00:00.000Z');
    assert.equal(w.end, NOW.toISOString());
  });

  it('sends the account and site tag as variables, never in the query text', () => {
    const body = analyticsRequest({ token: 'secret', accountTag: TAG, siteTag: TAG }, NOW);
    assert.equal(body.variables.accountTag, TAG);
    assert.ok(!body.query.includes(TAG));
    assert.ok(!JSON.stringify(body).includes('secret'));
    assert.match(body.query, /rumPageloadEventsAdaptiveGroups/);
  });

  it('accepts only 32-hex tags', () => {
    assert.equal(isTag(TAG), true);
    assert.equal(isTag('abc'), false);
    assert.equal(isTag(undefined), false);
    assert.equal(isTag(`${TAG}"}`), false);
  });
});

describe('referrer groups', () => {
  it('sorts hosts into search, direct, social and other', () => {
    assert.equal(sourceGroup('www.google.com'), 'search');
    assert.equal(sourceGroup('google.co.uk'), 'search');
    assert.equal(sourceGroup('duckduckgo.com'), 'search');
    assert.equal(sourceGroup(''), 'direct');
    assert.equal(sourceGroup(null), 'direct');
    assert.equal(sourceGroup('m.facebook.com'), 'social');
    assert.equal(sourceGroup('l.facebook.com'), 'social');
    assert.equal(sourceGroup('t.co'), 'social');
    assert.equal(sourceGroup('hamiltonohio.gov'), 'other');
  });

  it('leaves out the site itself (moving between its own pages)', () => {
    assert.equal(sourceGroup('www.example.org', 'example.org'), null);
    assert.equal(sourceGroup('example.org', 'www.example.org'), null);
  });
});

describe('visitorsReport', () => {
  const answer: AnalyticsAnswer = {
    data: {
      viewer: {
        accounts: [
          {
            daily: [
              { sum: { visits: 5 }, dimensions: { date: '2026-10-18' } },
              { sum: { visits: 7 }, dimensions: { date: '2026-10-12' } },
              { sum: { visits: 4 }, dimensions: { date: '2026-10-11' } },
              { sum: { visits: 6 }, dimensions: { date: '2026-10-05' } },
              { sum: { visits: 99 }, dimensions: { date: '2026-08-01' } }, // outside: ignored
            ],
            pages: [
              { count: 30, dimensions: { requestPath: '/' } },
              { count: 12, dimensions: { requestPath: '/plan-your-visit/' } },
              { count: 40, dimensions: { requestPath: '/studio/structure' } },
              { count: 3, dimensions: { requestPath: '/give/?utm=x' } },
              { count: 2, dimensions: { requestPath: '/give/' } },
            ],
            referers: [
              { sum: { visits: 8 }, dimensions: { refererHost: 'www.google.com' } },
              { sum: { visits: 3 }, dimensions: { refererHost: '' } },
              { sum: { visits: 2 }, dimensions: { refererHost: 'facebook.com' } },
              { sum: { visits: 1 }, dimensions: { refererHost: 'example.org' } },
              { sum: { visits: 50 }, dimensions: { refererHost: 'fbc.example' } }, // own host
            ],
          },
        ],
      },
    },
  };
  const r = visitorsReport(answer, NOW, 'fbc.example');

  it('fills every day, zero where Cloudflare had none', () => {
    assert.equal(r.days.length, SERIES_DAYS);
    assert.equal(r.days.at(-1)?.visits, 5);
    assert.equal(r.days.filter((d) => d.visits === 0).length, SERIES_DAYS - 4);
  });

  it('takes the week totals from the series: the last 7 days against the 7 before', () => {
    assert.equal(r.thisWeek, 5 + 7); // Oct 12 to 18
    assert.equal(r.lastWeek, 4 + 6); // Oct 5 to 11
  });

  it('lists the most-read pages without Studio visits, query strings merged', () => {
    assert.deepEqual(r.pages, [
      { path: '/', views: 30 },
      { path: '/plan-your-visit/', views: 12 },
      { path: '/give/', views: 5 },
    ]);
  });

  it('groups the referrers biggest first, without the site itself', () => {
    assert.deepEqual(
      r.sources.map((s) => [s.group, s.visits]),
      [
        ['search', 8],
        ['direct', 3],
        ['social', 2],
        ['other', 1],
      ],
    );
  });

  it('throws on GraphQL errors or a missing account, so the card never shows false zeros', () => {
    assert.throws(() => visitorsReport({ errors: [{ message: 'not authorized' }] }, NOW));
    assert.throws(() => visitorsReport({ data: { viewer: { accounts: [] } } }, NOW));
  });
});

describe('weekCompare', () => {
  it('says the change in plain words', () => {
    assert.equal(weekCompare(12, 10), '2 more visits than the week before (up 20%).');
    assert.equal(weekCompare(9, 10), '1 fewer visit than the week before (down 10%).');
    assert.equal(weekCompare(100, 98), 'About the same as the week before.');
    assert.equal(weekCompare(0, 0), 'No visits in the last two weeks yet.');
    assert.equal(weekCompare(4, 0), 'The week before had none to compare with.');
  });
});

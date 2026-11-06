// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 218: the Report tool's arithmetic (src/lib/studio-board.ts) and the
// two chart-kit files, which must stay the bytes the WordPress themes carry.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  addMonths,
  boardDelta,
  boardPeriod,
  boardTtl,
  boardView,
  channelName,
  gapsHit,
  monthWindow,
  NOT_TRACKED,
  periodOptions,
  searchPrevOk,
  seriesGood,
  sinceFor,
  switchKind,
  todayIn,
  validPeriodRequest,
  yearBefore,
  type BoardConfig,
} from './studio-board.ts';
import { BENCH_CONFIG, BENCH_TODAY, fixtureReport } from './studio-board-fixture.ts';

const cfg = BENCH_CONFIG;
const view = (p: string, k: string, today = BENCH_TODAY, c: BoardConfig = cfg) => {
  const per = boardPeriod(c, p, k, today);
  return boardView(c, per, fixtureReport(per.from, per.to), today);
};
const tile = (v: ReturnType<typeof view>, measure: string) =>
  v.overview.tiles.find((t) => t.measure === measure)!;

describe('the period', () => {
  it('a finished month runs to the first day after it, against the same month a year before', () => {
    const per = boardPeriod(cfg, 'm', '2026-10', BENCH_TODAY);
    assert.deepEqual(
      [per.k, per.label, per.start, per.end, per.from, per.to, per.running, per.through],
      [
        '2026-10',
        'October 2026',
        '2026-10-01',
        '2026-11-01',
        '2026-10-01',
        '2026-10-31',
        false,
        '',
      ],
    );
    assert.deepEqual(
      [per.prevStart, per.prevEnd, per.prevThru, per.vs],
      ['2025-10-01', '2025-11-01', '2025-11-01', 'October 2025'],
    );
  });

  it('a running month is counted through yesterday and says so', () => {
    const per = boardPeriod(cfg, 'm', '', BENCH_TODAY);
    assert.equal(per.k, '2026-11');
    assert.equal(per.running, true);
    assert.equal(per.to, '2026-11-04');
    assert.equal(per.through, 'so far, through November 4');
    assert.equal(per.prevThru, '2025-11-05');
    assert.equal(per.vs, 'the same days in November 2025');
  });

  it('on the first day of a period that one day is counted as it stands', () => {
    const per = boardPeriod(cfg, 'm', '', '2026-11-01');
    assert.deepEqual(
      [per.from, per.to, per.through],
      ['2026-11-01', '2026-11-01', 'so far, through November 1'],
    );
  });

  it('quarter keys, labels and months', () => {
    const q4 = boardPeriod(cfg, 'q', '2026-Q4', '2027-02-10');
    assert.deepEqual(
      [q4.k, q4.label, q4.start, q4.end, q4.running],
      ['2026-Q4', 'October to December 2026', '2026-10-01', '2027-01-01', false],
    );
    assert.deepEqual(q4.months, ['2026-10', '2026-11', '2026-12']);
    assert.deepEqual(q4.prevMonths, ['2025-10', '2025-11', '2025-12']);
    assert.equal(boardPeriod(cfg, 'q', '2026-Q1', BENCH_TODAY).label, 'January to March 2026');
    assert.equal(boardPeriod(cfg, 'q', '', BENCH_TODAY).k, '2026-Q4');
  });

  it('crosses the year boundary', () => {
    const jan = boardPeriod(cfg, 'm', '2026-01', BENCH_TODAY);
    assert.deepEqual(
      [jan.prevStart, jan.prevEnd, jan.prevLabel],
      ['2025-01-01', '2025-02-01', 'January 2025'],
    );
    const dec = boardPeriod(cfg, 'm', '2025-12', BENCH_TODAY);
    assert.deepEqual([dec.end, dec.to], ['2026-01-01', '2025-12-31']);
    assert.equal(addMonths('2026-01-15', -1), '2025-12-01');
    assert.deepEqual(monthWindow('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02']);
    const y = boardPeriod(cfg, 'y', '2025', BENCH_TODAY);
    assert.deepEqual(
      [y.title, y.from, y.to, y.months.length, y.vs],
      ['The year 2025', '2025-01-01', '2025-12-31', 12, '2024'],
    );
  });

  it('leap day: February 2024 has 29 days, and a year before the 29th is the 28th', () => {
    const c = { firstMonth: '2023-01' };
    const feb = boardPeriod(c, 'm', '2024-02', '2024-06-01');
    assert.equal(feb.to, '2024-02-29');
    assert.equal(yearBefore('2024-02-29'), '2023-02-28');
    // Running on 1 March 2024 in the quarter: yesterday is the leap day.
    const q = boardPeriod(c, 'q', '', '2024-03-01');
    assert.equal(q.to, '2024-02-29');
    assert.equal(q.prevThru, '2023-03-01');
    // A leap year is 366 days: still inside what the series route accepts.
    const y = boardPeriod(c, 'y', '2024', '2025-06-01');
    assert.equal((Date.parse(y.to) - Date.parse(y.from)) / 86400000 + 1, 366);
  });

  it('a bad, future or too-early key gives the period running now', () => {
    for (const k of ['2026-13', 'x', '2027-01', '2024-06', '2026-Q5']) {
      assert.equal(boardPeriod(cfg, 'm', k, BENCH_TODAY).k, '2026-11', k);
    }
    assert.equal(boardPeriod(cfg, 'z', '2026-10', BENCH_TODAY).k, '2026-10');
    assert.equal(validPeriodRequest('m', '2026-10'), true);
    assert.equal(validPeriodRequest('q', '2026-10'), false);
    assert.equal(validPeriodRequest('y', ''), true);
    assert.equal(validPeriodRequest('w', '2026'), false);
    assert.equal(validPeriodRequest('m', '2026-10-01'), false);
  });

  it('a quarter or year that begins before the first month is still offered', () => {
    const c = { firstMonth: '2026-10' };
    assert.deepEqual(
      periodOptions(c, 'y', '2027-03-02').map((o) => o.k),
      ['2027', '2026'],
    );
    assert.equal(boardPeriod(c, 'y', '2026', '2027-03-02').k, '2026');
    assert.deepEqual(
      periodOptions(c, 'm', '2026-12-10').map((o) => o.label),
      ['December 2026 (so far)', 'November 2026', 'October 2026'],
    );
    assert.equal(boardPeriod(c, 'm', '2026-09', '2026-12-10').k, '2026-12');
  });

  it('switching kind keeps the reader near where they were', () => {
    const per = boardPeriod(cfg, 'm', '2026-05', BENCH_TODAY);
    assert.equal(switchKind(per, 'q'), '2026-Q2');
    assert.equal(switchKind(per, 'y'), '2026');
  });

  it('today is read in the site zone', () => {
    assert.equal(todayIn('America/New_York', new Date('2026-11-05T03:00:00Z')), '2026-11-04');
    assert.equal(todayIn('UTC', new Date('2026-11-05T03:00:00Z')), '2026-11-05');
  });
});

describe('the change against last year', () => {
  it('up, down, the same, and nothing to compare', () => {
    assert.deepEqual(boardDelta(113, 100, 'October 2025'), {
      chip: 'Up 13%',
      against: 'October 2025',
      tone: 'good',
    });
    assert.equal(boardDelta(90, 100, 'x')!.tone, 'bad');
    assert.equal(boardDelta(90, 100, 'x')!.chip, 'Down 10%');
    assert.equal(boardDelta(100.2, 100, 'x')!.chip, 'About the same');
    assert.equal(boardDelta(120, 100, 'x', 'flat')!.tone, 'flat');
  });

  it('null is never compared, and neither is a year-before of zero', () => {
    assert.equal(boardDelta(null, 100, 'x'), null);
    assert.equal(boardDelta(100, null, 'x'), null);
    assert.equal(boardDelta(100, 0, 'x'), null);
    // A real zero now against a real number then IS a change.
    assert.equal(boardDelta(0, 50, 'x')!.chip, 'Down 100%');
  });
});

describe('not tracked yet', () => {
  it('a measure that did not exist in the period is null, never 0, and has no change', () => {
    const v = view('m', '2026-06');
    const give = tile(v, 'event:give_click');
    assert.equal(give.value, null);
    assert.equal(give.delta, null);
    assert.match(give.line, /Counting began September 1, 2026/);
    // The same period, a measure that was counted: a number and a change.
    assert.ok(tile(v, 'visitors').value! > 0);
    assert.ok(tile(v, 'visitors').delta);
    const chart = v.parts[0].charts[1];
    assert.equal(chart.spec, null);
    assert.match(chart.empty!, new RegExp(NOT_TRACKED));
  });

  it('after the start date, an event nobody has triggered is a true 0; with no start date or no feed it stays null', () => {
    const per = boardPeriod(cfg, 'm', '2026-10', BENCH_TODAY);
    const r = fixtureReport(per.from, per.to);
    r.events = { ...r.events, give_click: { cur: 0, prev: 0 } };
    r.eventsByMonth = { ...r.eventsByMonth, give_click: r.months.map(() => null) };
    const counted = tile(boardView(cfg, per, r, BENCH_TODAY), 'event:give_click');
    assert.equal(counted.value, 0);
    assert.equal(counted.delta, null);
    assert.match(counted.line, /None counted since September 1, 2026/);
    assert.equal(counted.spark.at(-1)!.value, 0);
    const noDate: BoardConfig = { ...cfg, since: {} };
    assert.equal(
      tile(
        boardView(noDate, boardPeriod(noDate, 'm', '2026-10', BENCH_TODAY), r, BENCH_TODAY),
        'event:give_click',
      ).value,
      null,
    );
    const noFeed = { ...r, events: {}, eventsByMonth: {} };
    const unlisted = tile(boardView(cfg, per, noFeed, BENCH_TODAY), 'event:give_click');
    assert.equal(unlisted.value, null);
    assert.equal(unlisted.spark.at(-1)!.value, null);
  });

  it('once counted it has a number, but no change until a year has passed', () => {
    const give = tile(view('m', '2026-10'), 'event:give_click');
    assert.ok(give.value! > 0);
    assert.equal(give.delta, null);
    assert.match(give.line, /not counted a year ago/);
  });

  it('the months before counting began are null in the chart and the sparkline', () => {
    const v = view('m', '2026-10');
    const spec = v.parts[0].charts[1].spec!;
    assert.equal(spec.labels.at(-1), 'Oct 2026');
    assert.equal(spec.series[0].values.at(-3), null); // Aug 2026
    assert.ok(spec.series[0].values.at(-2)! > 0); // Sep 2026
    const spark = tile(v, 'event:give_click').spark;
    assert.equal(spark.find((s) => s.ym === '2026-08')!.value, null);
    assert.ok(spark.find((s) => s.ym === '2026-09')!.value! > 0);
  });

  it('the first month: a part month says so and is not compared', () => {
    const c: BoardConfig = {
      ...cfg,
      firstMonth: '2026-10',
      since: { all: '2026-10-19' },
      gaps: [],
    };
    const v = view('m', '2026-10', BENCH_TODAY, c);
    assert.match(v.notices[0], /Counting began on October 19, so this is a part month/);
    const t = tile(v, 'visitors');
    assert.ok(t.value! > 0);
    assert.equal(t.delta, null);
    assert.match(t.line, /Counted from October 19/);
    assert.equal(sinceFor(c, 'visitors'), '2026-10-19');
    assert.equal(sinceFor({ firstMonth: '2026-10' }, 'visitors'), '2026-10-01');
    // September 2026 is before the first month: the picker never offers it.
    assert.equal(boardPeriod(c, 'm', '2026-09', BENCH_TODAY).k, '2026-11');
  });

  it('an event never seen and with no start date is null, and with one it is 0', () => {
    const per = boardPeriod(cfg, 'm', '2026-10', BENCH_TODAY);
    const r = fixtureReport(per.from, per.to);
    r.events.generate_lead = { cur: 0, prev: 0 };
    r.eventsByMonth.generate_lead = r.months.map(() => null);
    assert.equal(boardView(cfg, per, r, BENCH_TODAY).overview.tiles[2].value, 0);
    const noDate: BoardConfig = { ...cfg, since: {} };
    assert.equal(boardView(noDate, per, r, BENCH_TODAY).overview.tiles[2].value, null);
    delete r.events.generate_lead;
    assert.equal(boardView(cfg, per, r, BENCH_TODAY).overview.tiles[2].value, null);
  });
});

describe('gaps', () => {
  it('a period that touches a gap month loses its change, and so does the year after', () => {
    assert.equal(gapsHit(cfg, '2025-12-01', '2025-12-31').length, 1);
    assert.equal(gapsHit(cfg, '2026-01-01', '2026-01-31').length, 0);
    assert.equal(gapsHit(cfg, '2025-10-01', '2026-03-31').length, 1);
    const dec = view('m', '2025-12');
    assert.equal(tile(dec, 'visitors').delta, null);
    assert.match(dec.notices.join(' '), /December 2025/);
    assert.match(dec.notices.at(-1)!, /not compared/);
    // While Q4 2026 is running it is set against October 1 to November 4, 2025: no gap there.
    assert.ok(tile(view('q', '2026-Q4'), 'visitors').delta);
    // Once finished it is set against all of Q4 2025, which holds the gap.
    const q4 = view('q', '2026-Q4', '2027-02-10');
    assert.equal(tile(q4, 'visitors').delta, null);
    assert.match(tile(q4, 'visitors').line, /counting was down/);
    // October 2026 touches no gap on either side.
    assert.ok(tile(view('m', '2026-10'), 'visitors').delta);
  });

  it('gap months are left out of charts and sparklines, with a note', () => {
    const v = view('m', '2026-10');
    const spec = v.overview.charts[0].spec!;
    assert.equal(spec.labels.includes('Dec 2025'), false);
    assert.equal(spec.labels.length, 11);
    assert.match(spec.note!, /Left out, because counting was down: Dec 2025/);
    assert.equal(
      tile(v, 'visitors').spark.some((s) => s.ym === '2025-12'),
      false,
    );
    const y = view('y', '2025').overview.charts[0].spec!;
    assert.deepEqual(y.labels.slice(-2), ['Oct', 'Nov']);
  });
});

describe('charts', () => {
  it('a year sets its months beside the year before; a running one stops at this month', () => {
    const y = view('y', '2026').overview.charts[0].spec!;
    assert.equal(y.labels.length, 11);
    assert.deepEqual(
      y.series.map((s) => [s.name, s.tone]),
      [
        ['2026', 'now'],
        ['2025', 'then'],
      ],
    );
    assert.match(y.note!, /Nov 2026 is so far, through November 4/);
  });

  it('lists are ranked, cut and named', () => {
    const v = view('m', '2026-10');
    const pages = v.overview.charts[3].spec!;
    assert.equal(pages.type, 'rank');
    assert.equal(pages.labels[0], 'Home');
    assert.deepEqual(pages.types, ['rank', 'bar', 'donut']);
    const places = v.parts[1].charts[1].spec!;
    assert.deepEqual(places.types, ['rank', 'tilemap', 'bar']);
    assert.ok(places.states!.Indiana > 0);
  });

  it('Search Console: no answer is said plainly, and an old year-before is not compared', () => {
    const per = boardPeriod(cfg, 'm', '2026-10', BENCH_TODAY);
    const r = fixtureReport(per.from, per.to);
    r.search = null;
    const v = boardView(cfg, per, r, BENCH_TODAY);
    assert.equal(tile(v, 'searchClicks').value, null);
    assert.match(tile(v, 'searchClicks').line, /did not answer/);
    assert.match(v.parts[1].charts[0].empty!, /did not answer/);
    assert.equal(boardTtl(per, r, BENCH_TODAY), 3600);
    assert.equal(searchPrevOk(per, BENCH_TODAY), true);
    const old = boardPeriod(cfg, 'm', '2026-03', BENCH_TODAY);
    assert.equal(searchPrevOk(old, BENCH_TODAY), false);
    assert.equal(tile(view('m', '2026-03'), 'searchClicks').delta, null);
    assert.match(tile(view('m', '2026-03'), 'searchClicks').line, /sixteen months/);
    assert.ok(tile(view('m', '2026-03'), 'visitors').delta);
  });
});

describe('keeping the answer', () => {
  it('three hours while it can still change, a month once settled', () => {
    const run = boardPeriod(cfg, 'm', '', BENCH_TODAY);
    assert.equal(boardTtl(run, fixtureReport(run.from, run.to), BENCH_TODAY), 3 * 3600);
    const oct = boardPeriod(cfg, 'm', '2026-10', BENCH_TODAY);
    assert.equal(boardTtl(oct, fixtureReport(oct.from, oct.to), BENCH_TODAY), 30 * 86400);
    assert.equal(boardTtl(oct, fixtureReport(oct.from, oct.to), '2026-11-02'), 3 * 3600);
  });

  it('an answer full of zeros is not an answer', () => {
    const r = fixtureReport('2026-10-01', '2026-10-31');
    assert.equal(seriesGood(r), true);
    assert.equal(seriesGood({ ...r, months: r.months.map((m) => ({ ...m, views: 0 })) }), false);
    assert.equal(seriesGood(null), false);
    assert.equal(seriesGood({ totals: {} }), false);
  });
});

describe('the chart kit files', () => {
  // The same bytes as tm-theme assets/admin/ncs-charts.{js,css}. They carry no
  // PORTABLE marker (that would change them), so this is their drift check:
  // change the kit in the WordPress theme first, copy it here, then update these.
  const sha = (f: string) =>
    createHash('sha256')
      .update(
        readFileSync(new URL(`../sanity/kit/board/${f}`, import.meta.url))
          .toString('utf8')
          .replace(/\r\n/g, '\n'),
      )
      .digest('hex');
  it('are the copies the WordPress themes carry', () => {
    assert.equal(
      sha('ncs-charts.js'),
      '3246b4ac4a517d2f881169772cc3636f6c2bc80c3027a0f630014fce3c846765',
    );
    assert.equal(
      sha('ncs-charts.css'),
      'a426cc8825b3fd16169e8c91a39c47e957e5e442149a59599e8b5e28d0a2ab3e',
    );
  });
});

describe('channelName', () => {
  it("puts Google's channel names in plain words and passes an unknown one through", () => {
    assert.equal(channelName('Organic Search'), 'Search engines');
    assert.equal(channelName('Direct'), 'Typed or bookmarked');
    assert.equal(channelName('Something New'), 'Something New');
  });
});

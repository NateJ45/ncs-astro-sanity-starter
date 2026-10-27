// Safe to edit by hand
// Pins the opening-hours logic (src/lib/business-hours.ts, PORTS.md card 196):
// the stored rows and changes, one day's hours, open now on the site's clock
// either side of midnight and of both daylight saving changes, the week table,
// the dated changes dropping off, and the structured data.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOURS_TIME_OPTIONS,
  changeText,
  clockLabel,
  dayHours,
  openState,
  openingHoursSpecification,
  rangeLabel,
  resolveHoursChanges,
  resolveWeeklyHours,
  statusParts,
  upcomingChanges,
  weekRows,
  whenLabel,
  zonedClock,
} from './business-hours.ts';

const NY = 'America/New_York';

// A shop: Monday to Friday 9 to 5, Saturday 10 to 2, Sunday closed.
const SHOP = resolveWeeklyHours(
  [
    { _key: 'wk', days: ['mon', 'tue', 'wed', 'thu', 'fri'], opens: '09:00', closes: '17:00' },
    { _key: 'sat', days: ['sat'], opens: '10:00', closes: '14:00' },
  ],
  [
    { _key: 'tg', date: '2026-11-26', kind: 'closed', note: 'Thanksgiving' },
    { _key: 'eve', date: '2026-11-25', kind: 'hours', opens: '09:00', closes: '12:00' },
    { _key: 'xmas', date: '2026-12-24', endDate: '2026-12-26', kind: 'closed' },
  ],
);

// A bar: Friday and Saturday 6 pm to 2 am.
const BAR = resolveWeeklyHours([{ days: ['fri', 'sat'], opens: '18:00', closes: '02:00' }], []);

/** An instant from a New York wall time (the offset is given, so the test is explicit). */
const at = (iso: string) => new Date(iso);

describe('labels', () => {
  it('reads times the way people say them', () => {
    assert.equal(clockLabel(540), '9 am');
    assert.equal(clockLabel(1050), '5:30 pm');
    assert.equal(clockLabel(720), 'noon');
    assert.equal(clockLabel(0), 'midnight');
    assert.equal(clockLabel(1440), 'midnight');
    assert.equal(rangeLabel(540, 1020), '9 am to 5 pm');
    assert.equal(rangeLabel(0, 1440), 'Open 24 hours');
  });
  it('offers every quarter hour', () => {
    assert.equal(HOURS_TIME_OPTIONS.length, 96);
    assert.deepEqual(HOURS_TIME_OPTIONS[0], { title: 'midnight', value: '00:00' });
    assert.deepEqual(HOURS_TIME_OPTIONS[38], { title: '9:30 am', value: '09:30' });
  });
});

describe('resolving', () => {
  it('drops half-filled rows and changes', () => {
    const h = resolveWeeklyHours(
      [
        { days: [], opens: '09:00', closes: '17:00' },
        { days: ['mon'], opens: '9am', closes: '17:00' },
        { days: ['mon'], opens: '09:00' },
        { days: ['Monday', 'mon'], opens: '09:00', closes: '17:00' },
      ],
      [{ kind: 'closed' }, { date: '2026-11-25', kind: 'hours', opens: '09:00' }],
    );
    assert.equal(h.rows.length, 1);
    assert.deepEqual(h.rows[0].days, [1]);
    assert.equal(h.changes.length, 0);
  });
  it('runs a closing time at or before the opening past midnight', () => {
    assert.equal(BAR.rows[0].closes, 26 * 60);
    const allDay = resolveWeeklyHours([{ days: ['sun'], opens: '00:00', closes: '00:00' }], []);
    assert.equal(allDay.rows[0].closes - allDay.rows[0].opens, 1440);
  });
  it('ignores an end date before the start', () => {
    const [c] = resolveHoursChanges([{ date: '2026-12-24', endDate: '2026-12-20' }]);
    assert.equal(c.to, '2026-12-24');
  });
  it('reads confirmed: only an untick is provisional, unless strict', () => {
    const rows = [
      { days: ['mon'], opens: '09:00', closes: '17:00' },
      { days: ['tue'], opens: '09:00', closes: '17:00', confirmed: false },
    ];
    assert.deepEqual(
      resolveWeeklyHours(rows, []).rows.map((r) => r.confirmed),
      [true, false],
    );
    assert.deepEqual(
      resolveWeeklyHours(rows, [], { strict: true }).rows.map((r) => r.confirmed),
      [false, false],
    );
  });
});

describe('one day', () => {
  it('applies a closure and new hours on their dates only', () => {
    assert.equal(dayHours(SHOP, '2026-11-26').closed, true);
    assert.equal(dayHours(SHOP, '2026-11-26').change?.note, 'Thanksgiving');
    assert.deepEqual(
      dayHours(SHOP, '2026-11-25').intervals.map((i) => [i.opens, i.closes]),
      [[540, 720]],
    );
    assert.equal(dayHours(SHOP, '2026-11-27').change, null);
    assert.equal(dayHours(SHOP, '2026-12-25').closed, true);
    assert.equal(dayHours(SHOP, '2026-11-29').closed, true); // a Sunday
  });
});

describe('the site clock', () => {
  it('is the zone, not the machine, either side of midnight', () => {
    // 03:30 UTC on a Thursday is still Wednesday 11:30 pm in New York.
    assert.deepEqual(zonedClock(at('2026-10-29T03:30:00Z'), NY), {
      date: '2026-10-28',
      minutes: 23 * 60 + 30,
    });
    assert.deepEqual(zonedClock(at('2026-10-29T04:00:00Z'), NY), {
      date: '2026-10-29',
      minutes: 0,
    });
  });
  it('follows both daylight saving changes', () => {
    // Clocks go back on 2026-11-01: 9 am is 14:00 UTC after, 13:00 UTC before.
    assert.equal(zonedClock(at('2026-11-02T14:00:00Z'), NY).minutes, 540);
    assert.equal(zonedClock(at('2026-10-30T13:00:00Z'), NY).minutes, 540);
    // Clocks go forward on 2026-03-08.
    assert.equal(zonedClock(at('2026-03-09T13:00:00Z'), NY).minutes, 540);
    assert.equal(zonedClock(at('2026-03-06T14:00:00Z'), NY).minutes, 540);
  });
});

describe('open now', () => {
  it('is open in hours and says until when', () => {
    const s = openState(SHOP, at('2026-10-28T15:00:00Z'), NY); // Wed 11 am EDT
    assert.equal(s.open, true);
    assert.deepEqual(statusParts(s), { headline: 'Open now', detail: 'until 5 pm' });
  });
  it('opens at 9 sharp and closes at 5 sharp, on both sides of the clock change', () => {
    // Monday 2026-11-02 is after the change (EST, UTC-5).
    assert.equal(openState(SHOP, at('2026-11-02T13:59:00Z'), NY).open, false);
    assert.equal(openState(SHOP, at('2026-11-02T14:00:00Z'), NY).open, true);
    assert.equal(openState(SHOP, at('2026-11-02T22:00:00Z'), NY).open, false);
    // Friday 2026-10-30 is before it (EDT, UTC-4).
    assert.equal(openState(SHOP, at('2026-10-30T13:00:00Z'), NY).open, true);
    assert.equal(openState(SHOP, at('2026-10-30T12:59:00Z'), NY).open, false);
  });
  it('names the next opening', () => {
    // Friday 6 pm: next is Saturday 10 am.
    const fri = openState(SHOP, at('2026-10-30T22:00:00Z'), NY);
    assert.equal(statusParts(fri).detail, 'Opens tomorrow at 10 am');
    // Saturday 3 pm: Sunday is closed, so Monday.
    const sat = openState(SHOP, at('2026-10-31T19:00:00Z'), NY);
    assert.equal(statusParts(sat).detail, 'Opens Monday at 9 am');
    // Monday 7 am: today.
    const early = openState(SHOP, at('2026-11-02T12:00:00Z'), NY);
    assert.equal(statusParts(early).detail, 'Opens today at 9 am');
  });
  it('skips a closure when it looks for the next opening', () => {
    // Wednesday 2026-11-25 at 1 pm (short day, closed at noon); Thursday is Thanksgiving.
    const s = openState(SHOP, at('2026-11-25T18:00:00Z'), NY);
    assert.equal(s.open, false);
    assert.deepEqual(s.next, { date: '2026-11-27', opens: 540 });
    assert.equal(statusParts(s).detail, 'Opens Friday at 9 am');
  });
  it('keeps a late spell open past midnight into the next day', () => {
    // Saturday 1 am (UTC 05:00 in EDT): Friday's 6 pm to 2 am is still on.
    const s = openState(BAR, at('2026-10-31T05:00:00Z'), NY);
    assert.equal(s.open, true);
    assert.equal(statusParts(s).detail, 'until 2 am');
    // Saturday 2:30 am: closed, opens tonight.
    const after = openState(BAR, at('2026-10-31T06:30:00Z'), NY);
    assert.equal(after.open, false);
    assert.equal(statusParts(after).detail, 'Opens today at 6 pm');
  });
  it('is open 24 hours without an "until"', () => {
    const h = resolveWeeklyHours(
      [
        {
          days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
          opens: '00:00',
          closes: '00:00',
        },
      ],
      [],
    );
    assert.deepEqual(statusParts(openState(h, at('2026-10-28T15:00:00Z'), NY)), {
      headline: 'Open now',
      detail: '',
    });
  });
  it('says closed with nothing to come', () => {
    const none = resolveWeeklyHours([], []);
    assert.deepEqual(statusParts(openState(none, at('2026-10-28T15:00:00Z'), NY)), {
      headline: 'Closed now',
      detail: '',
    });
  });
  it('names a far day in full', () => {
    assert.equal(whenLabel('2026-11-09', '2026-10-28'), 'Monday, November 9');
  });
});

describe('the week table', () => {
  it('runs equal days together, Monday first', () => {
    assert.deepEqual(
      weekRows(SHOP).map((r) => [r.label, r.text]),
      [
        ['Monday to Friday', '9 am to 5 pm'],
        ['Saturday', '10 am to 2 pm'],
        ['Sunday', 'Closed'],
      ],
    );
    assert.deepEqual(
      weekRows(BAR).map((r) => [r.label, r.text]),
      [
        ['Monday to Thursday', 'Closed'],
        ['Friday and Saturday', '6 pm to 2 am'],
        ['Sunday', 'Closed'],
      ],
    );
  });
  it('gives seven rows ungrouped and nothing without hours', () => {
    assert.equal(weekRows(SHOP, { grouped: false }).length, 7);
    assert.deepEqual(weekRows(resolveWeeklyHours([], [])), []);
  });
  it('shows a split day as two spells', () => {
    const h = resolveWeeklyHours(
      [
        { days: ['mon'], opens: '09:00', closes: '12:00' },
        { days: ['mon'], opens: '13:00', closes: '17:00' },
      ],
      [],
    );
    assert.equal(weekRows(h)[0].text, '9 am to noon, 1 pm to 5 pm');
  });
});

describe('dated changes', () => {
  it('drop off after their last day', () => {
    assert.deepEqual(
      upcomingChanges(SHOP, '2026-11-26').map((c) => c.key),
      ['tg', 'xmas'],
    );
    assert.deepEqual(
      upcomingChanges(SHOP, '2026-12-26').map((c) => c.key),
      ['xmas'],
    );
    assert.deepEqual(upcomingChanges(SHOP, '2026-12-27'), []);
  });
  it('read as one line', () => {
    const [eve, tg, xmas] = SHOP.changes;
    assert.equal(changeText(eve), 'Wednesday, November 25: 9 am to noon');
    assert.equal(changeText(tg), 'Thursday, November 26: Closed (Thanksgiving)');
    assert.equal(changeText(xmas), 'Thursday, December 24 to Saturday, December 26: Closed');
  });
});

describe('structured data', () => {
  it('lists confirmed rows and upcoming specials only', () => {
    const spec = openingHoursSpecification(SHOP, '2026-11-26');
    assert.deepEqual(spec[0], {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Monday',
        'https://schema.org/Tuesday',
        'https://schema.org/Wednesday',
        'https://schema.org/Thursday',
        'https://schema.org/Friday',
      ],
      opens: '09:00',
      closes: '17:00',
    });
    const specials = spec.filter((s) => s.validFrom);
    assert.deepEqual(
      specials.map((s) => [s.validFrom, s.validThrough, s.opens, s.closes]),
      [
        ['2026-11-26', '2026-11-26', '00:00', '00:00'],
        ['2026-12-24', '2026-12-26', '00:00', '00:00'],
      ],
    );
  });
  it('writes a late spell and 24 hours the way Google reads them', () => {
    assert.equal(openingHoursSpecification(BAR, '2026-10-28')[0].closes, '02:00');
    const allDay = resolveWeeklyHours([{ days: ['sun'], opens: '00:00', closes: '00:00' }], []);
    assert.equal(openingHoursSpecification(allDay, '2026-10-28')[0].closes, '23:59');
  });
  it('publishes nothing unconfirmed', () => {
    const h = resolveWeeklyHours(
      [{ days: ['mon'], opens: '09:00', closes: '17:00', confirmed: false }],
      [{ date: '2026-12-24', kind: 'closed' }],
    );
    assert.deepEqual(openingHoursSpecification(h, '2026-10-28'), []);
  });
});

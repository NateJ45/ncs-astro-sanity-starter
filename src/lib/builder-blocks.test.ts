// Safe to edit by hand
// Pins the builder kit's pure logic (src/lib/builder-blocks.ts, PORTS.md card 173):
// the dated notice window, the countdown phases, the time lists, which event dates
// are still to come, the place and directions, the calendar file, the event
// structured data and the photo-card columns.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_OPTIONS,
  countdownState,
  daysToGo,
  eventIcs,
  eventJsonLd,
  eventPlace,
  icsFileName,
  icsHref,
  inDateWindow,
  isoDay,
  longDate,
  minutesOf,
  noticeParts,
  photoCardColumns,
  plain,
  siteToday,
  timeOf,
  timeRange,
  upcomingOccurrences,
  zoneOffset,
} from './builder-blocks.ts';

const NY = 'America/New_York';

describe('plain and days', () => {
  it('strips stega markers and trims', () => {
    assert.equal(plain(' urgent​‌‍ '), 'urgent');
    assert.equal(plain(undefined), '');
  });
  it('reads a date or a datetime, and refuses junk', () => {
    assert.equal(isoDay('2026-12-24'), '2026-12-24');
    assert.equal(isoDay('2026-12-24T10:00:00Z'), '2026-12-24');
    assert.equal(isoDay('2026-13-01'), '');
    assert.equal(isoDay('soon'), '');
    assert.equal(longDate('2026-12-24'), 'December 24, 2026');
  });
  it("works out today's day in the site's zone, not UTC", () => {
    // 03:00 UTC on Dec 25 is still Dec 24 in New York.
    assert.equal(siteToday(new Date('2026-12-25T03:00:00Z'), NY), '2026-12-24');
    assert.equal(siteToday(new Date('2026-12-25T03:00:00Z'), 'UTC'), '2026-12-25');
  });
});

describe('dated notice', () => {
  it('shows inside the window, both ends included', () => {
    assert.equal(inDateWindow('2026-01-10', '2026-01-11', '2026-01-10'), true);
    assert.equal(inDateWindow('2026-01-10', '2026-01-11', '2026-01-11'), true);
    assert.equal(inDateWindow('2026-01-10', '2026-01-11', '2026-01-12'), false);
    assert.equal(inDateWindow('2026-01-10', '2026-01-11', '2026-01-09'), false);
  });
  it('treats blank ends as open, and a backwards window as hidden', () => {
    assert.equal(inDateWindow(null, null, '2026-01-10'), true);
    assert.equal(inDateWindow(null, '2026-01-11', '2026-01-01'), true);
    assert.equal(inDateWindow('2026-01-11', '2026-01-10', '2026-01-10'), false);
  });
  it('turns a phone number into a tap-to-call part', () => {
    const parts = noticeParts('Call (513) 555-0100 for a ride.');
    assert.deepEqual(parts, [
      { text: 'Call ' },
      { text: '(513) 555-0100', tel: 'tel:+15135550100' },
      { text: ' for a ride.' },
    ]);
    assert.deepEqual(noticeParts('No numbers here.'), [{ text: 'No numbers here.' }]);
  });
});

describe('countdown', () => {
  it('counts days before, says now during, and over after', () => {
    assert.deepEqual(countdownState('2026-06-15', '2026-06-19', '2026-06-01'), {
      phase: 'before',
      days: 14,
    });
    assert.equal(countdownState('2026-06-15', '2026-06-19', '2026-06-19').phase, 'during');
    assert.equal(countdownState('2026-06-15', null, '2026-06-15').phase, 'during');
    assert.equal(countdownState('2026-06-15', null, '2026-06-16').phase, 'after');
    assert.equal(countdownState(null, null, '2026-06-16').phase, 'none');
  });
  it('says "day" once and "days" otherwise', () => {
    assert.equal(daysToGo(1), '1 day to go');
    assert.equal(daysToGo(12), '12 days to go');
  });
});

describe('times', () => {
  it('offers quarter hours from 6 am to 11:45 pm', () => {
    assert.equal(TIME_OPTIONS[0].value, '06:00');
    assert.equal(TIME_OPTIONS[0].title, '6 am');
    assert.equal(TIME_OPTIONS.at(-1)?.value, '23:45');
    assert.equal(TIME_OPTIONS.find((t) => t.value === '12:00')?.title, '12 noon');
  });
  it('reads a stored time, and refuses junk', () => {
    assert.equal(minutesOf('16:30'), 990);
    assert.equal(minutesOf('25:00'), null);
    assert.equal(timeOf('09:15'), '9:15 am');
    assert.equal(timeOf(''), '');
  });
  it('writes a range with one am or pm when both ends share it', () => {
    assert.equal(timeRange(17 * 60 + 30, 60), '5:30 to 6:30 pm');
    assert.equal(timeRange(11 * 60 + 30, 90), '11:30 am to 1 pm');
    assert.equal(timeRange(19 * 60, null), '7 pm');
    assert.equal(timeRange(null, null), 'All day');
  });
});

describe('event details', () => {
  const raw = [
    { _key: 'b', date: '2026-12-24', startTime: '19:00', label: 'Late service' },
    { _key: 'a', date: '2026-12-24', startTime: '17:30', endTime: '18:30' },
    { _key: 'old', date: '2026-12-01', startTime: '10:00' },
    { _key: 'day', date: '2026-12-26' },
    { _key: 'bad', date: 'soon' },
  ];

  it('keeps the dates still to come, soonest first, and drops past ones', () => {
    const rows = upcomingOccurrences(raw, '2026-12-10');
    assert.deepEqual(
      rows.map((r) => r.key),
      ['a', 'b', 'day'],
    );
    assert.equal(rows[0].day, 'Thursday, December 24');
    assert.equal(rows[0].time, '5:30 to 6:30 pm');
    assert.equal(rows[1].label, 'Late service');
    assert.equal(rows[2].time, 'All day');
    assert.equal(upcomingOccurrences(raw, '2027-01-01').length, 0);
  });

  it('ignores an end time at or before the start', () => {
    const [row] = upcomingOccurrences(
      [{ date: '2026-12-24', startTime: '18:00', endTime: '17:00' }],
      '2026-12-01',
    );
    assert.equal(row.duration, null);
    assert.equal(row.time, '6 pm');
  });

  it('reads a typed place into lines and a directions link', () => {
    const place = eventPlace('The community hall\n123 Main Street, Springfield');
    assert.deepEqual(place?.lines, ['The community hall', '123 Main Street, Springfield']);
    assert.equal(place?.oneLine, 'The community hall, 123 Main Street, Springfield');
    assert.match(place?.mapsUrl ?? '', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.equal(eventPlace('   '), null);
  });

  it('builds a calendar file with wall times in the site zone', () => {
    const rows = upcomingOccurrences(raw, '2026-12-10');
    const ics = eventIcs({
      title: 'Winter open house',
      occurrences: rows,
      place: eventPlace('The community hall'),
      note: 'Bring a friend.',
      url: 'https://example.com/open-house/',
      uidBase: 'k1',
      host: 'example.com',
      timeZone: NY,
      now: new Date('2026-12-01T00:00:00Z'),
    });
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 3);
    assert.match(ics, /DTSTART;TZID=America\/New_York:20261224T173000/);
    assert.match(ics, /DURATION:PT60M/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261226/);
    assert.match(ics, /SUMMARY:Winter open house: Late service/);
    assert.match(ics, /LOCATION:The community hall/);
    assert.equal(
      eventIcs({
        title: 'x',
        occurrences: [],
        place: null,
        uidBase: 'k',
        host: 'example.com',
        timeZone: NY,
        now: new Date(),
      }),
      '',
    );
    assert.ok(icsHref(ics).startsWith('data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR'));
    assert.equal(icsFileName('Winter Open House!'), 'winter-open-house.ics');
  });

  it('writes the offset the zone has on that date', () => {
    assert.equal(zoneOffset('2026-12-24', 17 * 60, NY), '-05:00');
    assert.equal(zoneOffset('2026-07-04', 17 * 60, NY), '-04:00');
    assert.equal(zoneOffset('2026-07-04', 17 * 60, 'UTC'), '+00:00');
  });

  it('describes each date as a schema.org Event, safely escaped', () => {
    const rows = upcomingOccurrences(raw, '2026-12-10');
    const ld = JSON.parse(
      eventJsonLd({
        title: 'Open house </script>',
        occurrences: rows,
        place: eventPlace('The community hall'),
        url: 'https://example.com/open-house/',
        timeZone: NY,
        organizer: { name: 'Example', url: 'https://example.com' },
      }),
    );
    assert.equal(ld['@graph'].length, 3);
    assert.equal(ld['@graph'][0].startDate, '2026-12-24T17:30:00-05:00');
    assert.equal(ld['@graph'][0].endDate, '2026-12-24T18:30:00-05:00');
    assert.equal(ld['@graph'][2].startDate, '2026-12-26');
    assert.equal(ld['@graph'][0].location.name, 'The community hall');
    const raw2 = eventJsonLd({
      title: '</script>',
      occurrences: rows,
      place: null,
      url: 'https://example.com/',
      timeZone: NY,
      organizer: { name: 'Example', url: 'https://example.com' },
    });
    assert.ok(!raw2.includes('</script>'));
  });
});

describe('photo cards', () => {
  it('pairs two and four, and rows the rest in threes', () => {
    assert.deepEqual([2, 3, 4, 5, 6].map(photoCardColumns), [2, 3, 2, 3, 3]);
  });
});

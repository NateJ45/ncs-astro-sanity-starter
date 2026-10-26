// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIcs,
  escapeText,
  foldLine,
  ruleValue,
  timeProperty,
  utcStamp,
  type IcsEvent,
} from './ics.ts';

const NOW = new Date('2026-10-25T12:34:56Z');
const bytes = (s: string) => new TextEncoder().encode(s).length;

test('escapes backslash, semicolon, comma and line breaks', () => {
  assert.equal(escapeText('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
});

test('folds at 75 octets with a leading space, never splitting a character', () => {
  const line = `DESCRIPTION:${'é'.repeat(100)}`;
  const folded = foldLine(line);
  const parts = folded.split('\r\n');
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(bytes(p) <= 75, `${bytes(p)} octets`);
  for (const p of parts.slice(1)) assert.ok(p.startsWith(' '));
  assert.equal(parts.map((p, i) => (i ? p.slice(1) : p)).join(''), line);
  assert.equal(foldLine('SUMMARY:short'), 'SUMMARY:short');
});

test('times: UTC instant, local time in a zone, all-day date', () => {
  assert.equal(utcStamp(NOW), '20261025T123456Z');
  assert.equal(timeProperty('DTSTART', NOW), 'DTSTART:20261025T123456Z');
  assert.equal(
    timeProperty('DTSTART', { date: '2026-11-01', time: '10:30', tzid: 'America/Chicago' }),
    'DTSTART;TZID=America/Chicago:20261101T103000',
  );
  assert.equal(timeProperty('DTSTART', { date: '2026-12-25' }), 'DTSTART;VALUE=DATE:20261225');
  assert.throws(() => timeProperty('DTSTART', { date: '11/01/2026' }));
  assert.throws(() => timeProperty('DTSTART', { date: '2026-11-01', time: '9am' }));
});

test('repeat rules from an object or a string', () => {
  assert.equal(ruleValue({ freq: 'WEEKLY', byDay: ['SU'] }), 'FREQ=WEEKLY;BYDAY=SU');
  assert.equal(
    ruleValue({ freq: 'MONTHLY', interval: 2, count: 6, until: NOW }),
    'FREQ=MONTHLY;INTERVAL=2;COUNT=6;UNTIL=20261025T123456Z',
  );
  assert.equal(ruleValue('RRULE:FREQ=DAILY'), 'FREQ=DAILY');
});

test('a weekly event in a US zone: one VTIMEZONE, CRLF throughout', () => {
  const ics = buildIcs({
    prodId: '-//example//events//EN',
    now: NOW,
    name: 'Example, events',
    events: [
      {
        uid: 'weekly-worship@example.com',
        start: { date: '2026-11-01', time: '10:00', tzid: 'America/New_York' },
        duration: 'PT1H',
        rrule: { freq: 'WEEKLY', byDay: ['SU'] },
        summary: 'Worship, all ages',
        location: '1 Main St; Hamilton, OH',
        url: 'https://example.com/events/',
      },
      {
        uid: 'fair@example.com',
        start: { date: '2026-11-07', time: '09:00', tzid: 'America/New_York' },
        end: { date: '2026-11-07', time: '12:00', tzid: 'America/New_York' },
        summary: 'Fall fair',
      },
    ],
  });
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line break is CRLF');
  const lines = ics.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines.filter((l) => l === 'BEGIN:VTIMEZONE').length, 1);
  assert.ok(lines.includes('TZID:America/New_York'));
  assert.ok(lines.includes('TZOFFSETTO:-0400'));
  assert.ok(lines.includes('X-WR-CALNAME:Example\\, events'));
  assert.ok(lines.includes('DTSTAMP:20261025T123456Z'));
  assert.ok(lines.includes('DTSTART;TZID=America/New_York:20261101T100000'));
  assert.ok(lines.includes('RRULE:FREQ=WEEKLY;BYDAY=SU'));
  assert.ok(lines.includes('SUMMARY:Worship\\, all ages'));
  assert.ok(lines.includes('LOCATION:1 Main St\\; Hamilton\\, OH'));
  assert.ok(lines.includes('DTEND;TZID=America/New_York:20261107T120000'));
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 2);
  assert.equal(lines.at(-2), 'END:VCALENDAR');
});

test('a UTC event needs no VTIMEZONE', () => {
  const ics = buildIcs({
    prodId: '-//example//rsvp//EN',
    now: NOW,
    events: [{ uid: 'a@example.com', start: new Date('2026-11-01T15:00:00Z'), summary: 'Talk' }],
  });
  assert.ok(!ics.includes('VTIMEZONE'));
  assert.ok(ics.includes('DTSTART:20261101T150000Z\r\n'));
});

// Card 177: exceptions to a repeat (RFC 5545 3.8.4.4 RECURRENCE-ID, 3.8.5.1 EXDATE).
const NY = 'America/New_York';
const series: IcsEvent = {
  uid: 'weekly-worship@example.com',
  start: { date: '2026-11-01', time: '10:00', tzid: NY },
  duration: 'PT1H',
  rrule: { freq: 'WEEKLY', byDay: ['SU'] },
  summary: 'Worship',
};

test('exdate: one EXDATE per skipped date, same zone as DTSTART, right after the RRULE', () => {
  const ics = buildIcs({
    prodId: '-//example//events//EN',
    now: NOW,
    events: [
      {
        ...series,
        exdate: [
          { date: '2026-11-15', time: '10:00', tzid: NY },
          { date: '2026-11-29', time: '10:00', tzid: NY },
        ],
      },
    ],
  });
  const lines = ics.split('\r\n');
  const rrule = lines.indexOf('RRULE:FREQ=WEEKLY;BYDAY=SU');
  assert.equal(lines[rrule + 1], 'EXDATE;TZID=America/New_York:20261115T100000');
  assert.equal(lines[rrule + 2], 'EXDATE;TZID=America/New_York:20261129T100000');
  assert.equal(lines.filter((l) => l === 'BEGIN:VTIMEZONE').length, 1);
});

test('exdate on an all-day series is VALUE=DATE; on a UTC series it ends in Z', () => {
  const allDay = buildIcs({
    prodId: '-//example//events//EN',
    now: NOW,
    events: [
      {
        uid: 'market@example.com',
        start: { date: '2026-11-07' },
        rrule: { freq: 'WEEKLY', byDay: ['SA'] },
        summary: 'Market',
        exdate: [{ date: '2026-11-28' }],
      },
    ],
  });
  assert.ok(allDay.includes('\r\nEXDATE;VALUE=DATE:20261128\r\n'));
  const utc = buildIcs({
    prodId: '-//example//events//EN',
    now: NOW,
    events: [
      {
        uid: 'call@example.com',
        start: new Date('2026-11-02T15:00:00Z'),
        rrule: { freq: 'WEEKLY' },
        summary: 'Call',
        exdate: [new Date('2026-11-09T15:00:00Z')],
      },
    ],
  });
  assert.ok(utc.includes('\r\nEXDATE:20261109T150000Z\r\n'));
});

test('recurrenceId: an override VEVENT with the same UID, original time, new start, no RRULE', () => {
  const ics = buildIcs({
    prodId: '-//example//events//EN',
    now: NOW,
    events: [
      series,
      {
        uid: series.uid,
        recurrenceId: { date: '2026-11-22', time: '10:00', tzid: NY },
        start: { date: '2026-11-22', time: '11:00', tzid: NY },
        duration: 'PT1H',
        summary: 'Worship (one service at 11)',
      },
    ],
  });
  const events = ics.split('BEGIN:VEVENT\r\n').slice(1);
  assert.equal(events.length, 2);
  const override = events[1].split('\r\n');
  assert.equal(override[0], 'UID:weekly-worship@example.com');
  assert.equal(override[1], 'DTSTAMP:20261025T123456Z');
  assert.equal(override[2], 'RECURRENCE-ID;TZID=America/New_York:20261122T100000');
  assert.equal(override[3], 'DTSTART;TZID=America/New_York:20261122T110000');
  assert.ok(!override.some((l) => l.startsWith('RRULE:') || l.startsWith('EXDATE')));
  assert.ok(events[0].includes('RRULE:FREQ=WEEKLY;BYDAY=SU'));
  assert.equal(ics.split('\r\n').filter((l) => l === 'BEGIN:VTIMEZONE').length, 1);
});

test('an event without exceptions is written exactly as before', () => {
  const ics = buildIcs({ prodId: '-//example//events//EN', now: NOW, events: [series] });
  assert.ok(!ics.includes('EXDATE') && !ics.includes('RECURRENCE-ID'));
  assert.ok(ics.includes('\r\nDTSTAMP:20261025T123456Z\r\nDTSTART;TZID=America/New_York:'));
});

test('exceptions that break RFC 5545 throw instead of writing a bad file', () => {
  const build = (e: Record<string, unknown>) =>
    buildIcs({ prodId: '-//x//y//EN', now: NOW, events: [{ ...series, ...e }] });
  // EXDATE must match DTSTART's value type and zone.
  assert.throws(() => build({ exdate: [{ date: '2026-11-15' }] }), /all-day but start is local/);
  assert.throws(() => build({ exdate: [new Date('2026-11-15T15:00:00Z')] }), /UTC/);
  assert.throws(() =>
    build({ exdate: [{ date: '2026-11-15', time: '10:00', tzid: 'America/Chicago' }] }),
  );
  // EXDATE needs a repeat to except from.
  assert.throws(
    () => build({ rrule: undefined, exdate: [{ date: '2026-11-15', time: '10:00', tzid: NY }] }),
    /needs an rrule/,
  );
  // An override is one occurrence: no rrule, and the same form as its start.
  const at10 = { date: '2026-11-22', time: '10:00', tzid: NY };
  assert.throws(() => build({ recurrenceId: at10 }), /takes no rrule/);
  assert.throws(
    () => build({ rrule: undefined, recurrenceId: { date: '2026-11-22' } }),
    /all-day but start is local/,
  );
});

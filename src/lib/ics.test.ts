// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, escapeText, foldLine, ruleValue, timeProperty, utcStamp } from './ics.ts';

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

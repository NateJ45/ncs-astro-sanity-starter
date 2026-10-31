// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripCalendarStamps } from './parity-ics.mjs';

test('two builds of the same event link normalise to the same markup', () => {
  const a =
    '<a href="data:text/calendar;charset=utf-8,BEGIN%3AVEVENT%0D%0ADTSTAMP%3A20261031T001201Z%0D%0A">';
  const b =
    '<a href="data:text/calendar;charset=utf-8,BEGIN%3AVEVENT%0D%0ADTSTAMP%3A20261031T004037Z%0D%0A">';
  assert.equal(stripCalendarStamps(a), stripCalendarStamps(b));
  assert.match(stripCalendarStamps(a), /DTSTAMP%3ASTAMP%0D%0A/);
});

test('a plain-text stamp is masked too', () => {
  assert.equal(stripCalendarStamps('DTSTAMP:20261025T123456Z\r\n'), 'DTSTAMP:STAMP\r\n');
});

test('the event itself is still compared', () => {
  const start1 = 'DTSTAMP%3A20261031T001201Z%0D%0ADTSTART%3A20261101T100000Z';
  const start2 = 'DTSTAMP%3A20261031T004037Z%0D%0ADTSTART%3A20261101T110000Z';
  assert.notEqual(stripCalendarStamps(start1), stripCalendarStamps(start2));
});

test('text that is not a calendar stamp is left alone', () => {
  const html = '<p>DTSTAMP is the time a calendar file was made.</p>';
  assert.equal(stripCalendarStamps(html), html);
});

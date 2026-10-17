// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, SHORT_DATE, LONG_MONTH_YEAR, SHORT_MONTH_YEAR } from './format-date.ts';

// Node re-reads process.env.TZ when it changes, so each test can pretend to be
// a build machine somewhere else. Zones picked to straddle the date line.
const ZONES = ['UTC', 'America/New_York', 'Pacific/Pago_Pago', 'Pacific/Kiritimati'];
const originalTz = process.env.TZ;

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

test('the TZ switch is real (control: the naive call drifts)', () => {
  process.env.TZ = 'America/New_York';
  assert.equal(new Date('2026-01-15').toLocaleDateString('en-US'), '1/14/2026');
});

test('a date-only value keeps its calendar day in every build zone', () => {
  for (const tz of ZONES) {
    process.env.TZ = tz;
    assert.equal(formatDate('2026-01-15'), 'January 15, 2026', tz);
    assert.equal(formatDate('2026-01-01', SHORT_DATE), 'Jan 1, 2026', tz);
    assert.equal(formatDate('2026-03-01', LONG_MONTH_YEAR), 'March 2026', tz);
    assert.equal(formatDate('2025-12-31', SHORT_MONTH_YEAR), 'Dec 2025', tz);
  }
});

test('a date-only value ignores a site timeZone', () => {
  assert.equal(formatDate('2026-01-15', undefined, 'Pacific/Pago_Pago'), 'January 15, 2026');
  assert.equal(formatDate('2026-01-15', undefined, 'Pacific/Kiritimati'), 'January 15, 2026');
});

test('a datetime is formatted in UTC by default, whatever the build zone', () => {
  for (const tz of ZONES) {
    process.env.TZ = tz;
    // 02:30 UTC on the 15th is the evening of the 14th in New York.
    assert.equal(formatDate('2026-01-15T02:30:00Z'), 'January 15, 2026', tz);
    assert.equal(formatDate('2026-01-15T23:30:00.000Z', SHORT_DATE), 'Jan 15, 2026', tz);
  }
});

test('a datetime follows an explicit site timeZone', () => {
  process.env.TZ = 'Pacific/Kiritimati';
  assert.equal(
    formatDate('2026-01-15T02:30:00Z', undefined, 'America/New_York'),
    'January 14, 2026',
  );
});

test('missing or unparseable values give an empty string', () => {
  for (const v of [undefined, null, '', 'not a date', '2026-13-45']) {
    assert.equal(formatDate(v), '', String(v));
  }
});

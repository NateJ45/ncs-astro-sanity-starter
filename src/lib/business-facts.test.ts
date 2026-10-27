// Safe to edit by hand
// Pins the business facts resolver (src/lib/business-facts.ts) and the place
// line (src/lib/place-line.ts), PORTS.md card 196.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBusinessFacts, todayBarLine } from './business-facts.ts';
import { placeLine, townOf } from './place-line.ts';

describe('place line', () => {
  it('drops the ZIP and the starter placeholders', () => {
    assert.equal(townOf('Hamilton, OH 45013'), 'Hamilton, OH');
    assert.equal(townOf('Hamilton, OH 45013-1234'), 'Hamilton, OH');
    assert.equal(placeLine({ city: 'Hamilton', state: 'OH' }), 'Hamilton, OH');
    assert.equal(placeLine({ city: 'Hamilton', state: 'XX' }), 'Hamilton');
    assert.equal(placeLine({ city: 'Your City', state: 'XX' }), '');
    assert.equal(placeLine({}), '');
  });
});

describe('business facts', () => {
  it('shows nothing new for an untouched starter', () => {
    const f = resolveBusinessFacts({ city: 'Your City', state: 'XX', email: 'hi@example.com' });
    assert.equal(f.address, null);
    assert.equal(f.place, '');
    assert.equal(f.hasHours, false);
    assert.equal(f.phone, null);
    assert.deepEqual(f.email, { address: 'hi@example.com', confirmed: true });
  });

  it('builds the address, its place line and the map links from the stored parts', () => {
    const f = resolveBusinessFacts({
      street: '12 Main Street',
      city: 'Hamilton',
      state: 'OH',
      zip: '45013',
      findUs: 'Park behind the building.',
      geoLat: 39.4,
      geoLng: -84.5,
    });
    assert.deepEqual(f.address?.lines, ['12 Main Street', 'Hamilton, OH 45013']);
    assert.equal(f.address?.place, 'Hamilton, OH');
    assert.equal(f.place, 'Hamilton, OH');
    assert.equal(
      f.address?.mapsUrl,
      'https://www.google.com/maps/search/?api=1&query=12%20Main%20Street%2C%20Hamilton%2C%20OH%2C%2045013',
    );
    assert.ok(f.address?.appleMapsUrl.startsWith('https://maps.apple.com/?q=12%20Main'));
    assert.deepEqual(f.address?.geo, { lat: 39.4, lng: -84.5 });
    assert.equal(f.address?.findUs, 'Park behind the building.');
    assert.equal(f.address?.confirmed, true);
  });

  it('needs a street for an address, and none for a remote business', () => {
    assert.equal(resolveBusinessFacts({ city: 'Hamilton', state: 'OH' }).address, null);
    assert.equal(resolveBusinessFacts({ city: 'Hamilton', state: 'OH' }).place, 'Hamilton, OH');
    const remote = resolveBusinessFacts({
      businessModel: 'remote',
      street: '12 Main Street',
      city: 'Hamilton',
    });
    assert.equal(remote.address, null);
    assert.equal(remote.place, '');
  });

  it('carries each confirmed flag', () => {
    const f = resolveBusinessFacts({
      street: '12 Main Street',
      city: 'Hamilton',
      addressConfirmed: false,
      phone: '(513) 555-0100',
      phoneConfirmed: false,
      email: 'hi@example.com',
    });
    assert.equal(f.address?.confirmed, false);
    assert.deepEqual(f.phone, {
      display: '(513) 555-0100',
      href: 'tel:+15135550100',
      confirmed: false,
    });
    assert.equal(f.email?.confirmed, true);
    const strict = resolveBusinessFacts({ email: 'hi@example.com' }, { strict: true });
    assert.equal(strict.email?.confirmed, false);
  });

  it('strips preview markers before using a value', () => {
    const f = resolveBusinessFacts({ street: '12 Main Street​', city: 'Hamilton‌' });
    assert.equal(f.address?.oneLine, '12 Main Street, Hamilton');
  });

  it('reads the hours', () => {
    const f = resolveBusinessFacts({
      openingHours: [{ days: ['mon'], opens: '09:00', closes: '17:00' }],
      hoursNote: 'By appointment on Saturdays.',
    });
    assert.equal(f.hasHours, true);
    assert.equal(f.hoursNote, 'By appointment on Saturdays.');
  });
});

describe('todayBarLine (card 198)', () => {
  const hours = [{ _key: 'wk', days: ['mon', 'tue'], opens: '09:00', closes: '17:00' }];
  const monday = new Date('2026-11-02T17:00:00Z'); // Monday noon in New York
  const sunday = new Date('2026-11-01T17:00:00Z');
  it('names today in the site zone, or says closed', () => {
    const f = resolveBusinessFacts({ openingHours: hours });
    assert.equal(todayBarLine(f, monday, 'America/New_York'), 'Today 9 am to 5 pm');
    assert.equal(todayBarLine(f, sunday, 'America/New_York'), 'Closed today');
  });
  it('is empty with no hours or an unconfirmed row', () => {
    assert.equal(todayBarLine(resolveBusinessFacts({}), monday, 'America/New_York'), '');
    const guess = resolveBusinessFacts({ openingHours: [{ ...hours[0], confirmed: false }] });
    assert.equal(todayBarLine(guess, monday, 'America/New_York'), '');
  });
});

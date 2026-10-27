// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand
// =============================================================================
// business-facts - the business's facts, typed once, each with a confirmed flag
// (PORTS.md card 196, the non-church form of first-baptist-auburn's church facts)
// =============================================================================
// The address, phone, email and opening hours are typed ONCE (Business info, and
// the phone and email in Site settings) and every place the site shows them
// reads them through resolveBusinessFacts(). Never type a time, an address or a
// phone number into a component (rule 15).
//
// Each fact carries a `confirmed` flag. Untick it while a fact is still a guess
// (a new site built from an old flyer): the site shows a small "To confirm" tag
// beside it (src/components/business/ToConfirm.astro) and keeps it out of the
// structured data search engines read, until someone ticks the box again. By
// default only an explicit untick counts, so data saved before the flag existed
// shows as it always did; `strict: true` wants an explicit tick instead.
//
// Pure (no Sanity, no site import) and unit-tested in business-facts.test.ts.
// Components call getBusinessFacts() in src/lib/business-data.ts.
// =============================================================================

import { telHref } from './phone.ts';
import { placeLine } from './place-line.ts';
import {
  dayHours,
  dayText,
  hasHours,
  isConfirmed,
  plain,
  resolveWeeklyHours,
  zonedClock,
  type RawHoursChange,
  type RawHoursRow,
  type WeeklyHours,
} from './business-hours.ts';

/** The flat names SITE_SETTINGS_PROJECTION folds in from Business info (src/lib/queries.ts). */
export interface RawBusinessFacts {
  title?: string | null;
  phone?: string | null;
  phoneConfirmed?: boolean | null;
  email?: string | null;
  emailConfirmed?: boolean | null;
  businessModel?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  addressConfirmed?: boolean | null;
  findUs?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  openingHours?: RawHoursRow[] | null;
  hoursChanges?: RawHoursChange[] | null;
  hoursNote?: string | null;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  /** ["12 Main Street", "Hamilton, OH 45013"] */
  lines: string[];
  oneLine: string;
  /** "Hamilton, OH" */
  place: string;
  mapsUrl: string;
  appleMapsUrl: string;
  geo: { lat: number; lng: number } | null;
  /** The optional "how to find us" sentence (parking, which door). */
  findUs: string;
  confirmed: boolean;
}

export interface BusinessFacts {
  address: BusinessAddress | null;
  /** "Hamilton, OH" from the address (a city with no street still gives one). */
  place: string;
  phone: { display: string; href: string; confirmed: boolean } | null;
  email: { address: string; confirmed: boolean } | null;
  hours: WeeklyHours;
  /** True when there are usual hours; a site without them shows nothing new. */
  hasHours: boolean;
  /** One optional line under the hours ("By appointment on Mondays"). */
  hoursNote: string;
}

const PLACEHOLDERS = new Set(['your city', 'xx', 'your state']);
const real = (v?: string | null) => {
  const t = plain(v);
  return PLACEHOLDERS.has(t.toLowerCase()) ? '' : t;
};

function resolveAddress(raw: RawBusinessFacts, strict: boolean): BusinessAddress | null {
  if (raw.businessModel === 'remote') return null;
  const street = real(raw.street);
  const city = real(raw.city);
  if (!street || !city) return null;
  const state = real(raw.state);
  const zip = real(raw.zip);
  const second = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const lines = [street, second];
  const query = [street, city, state, zip].filter(Boolean).join(', ');
  const lat = typeof raw.geoLat === 'number' && Math.abs(raw.geoLat) <= 90 ? raw.geoLat : null;
  const lng = typeof raw.geoLng === 'number' && Math.abs(raw.geoLng) <= 180 ? raw.geoLng : null;
  return {
    street,
    city,
    state,
    zip,
    lines,
    oneLine: lines.join(', '),
    place: placeLine({ city, state }),
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    appleMapsUrl: `https://maps.apple.com/?q=${encodeURIComponent(query)}`,
    geo: lat !== null && lng !== null && (lat !== 0 || lng !== 0) ? { lat, lng } : null,
    findUs: plain(raw.findUs),
    confirmed: isConfirmed(raw.addressConfirmed, strict),
  };
}

export function resolveBusinessFacts(
  raw?: RawBusinessFacts | null,
  opts: { strict?: boolean } = {},
): BusinessFacts {
  const s = raw ?? {};
  const strict = opts.strict === true;
  const phone = plain(s.phone);
  const email = plain(s.email);
  const hours = resolveWeeklyHours(s.openingHours, s.hoursChanges, { strict });
  return {
    address: resolveAddress(s, strict),
    place: s.businessModel === 'remote' ? '' : placeLine({ city: s.city, state: s.state }),
    phone:
      phone && telHref(phone)
        ? { display: phone, href: telHref(phone), confirmed: isConfirmed(s.phoneConfirmed, strict) }
        : null,
    email: email ? { address: email, confirmed: isConfirmed(s.emailConfirmed, strict) } : null,
    hours,
    hasHours: hasHours(hours),
    hoursNote: plain(s.hoursNote),
  };
}

/**
 * The line a bar (the phone action bar, card 191) shows when its own text is empty: "Today 9 am to
 * 5 pm" or "Closed today", on the site's clock (PORTS.md card 198). Empty when the site has no
 * hours, or while any usual-hours row is still unconfirmed (a guess is not put in a bar).
 */
export function todayBarLine(facts: BusinessFacts, now: Date, timeZone: string): string {
  if (!facts.hasHours || facts.hours.rows.some((r) => !r.confirmed)) return '';
  const today = dayHours(facts.hours, zonedClock(now, timeZone).date);
  return today.closed ? 'Closed today' : `Today ${dayText(today.intervals)}`;
}

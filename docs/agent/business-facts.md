# Business facts: typed once, confirmed, and opening hours that change themselves

PORTABLE in spirit: this page describes the starter's shape (PORTS.md card 196). It is the non-church
form of first-baptist-auburn's church facts (`docs/agent/church-data.md` there).

The address, phone, email and opening hours are typed ONCE and every place the site shows them reads
them through one resolver, so a move or a new phone number is one edit (CLAUDE.md rule 15). Never type
a time, an address or a phone number into a component.

## Where the data lives

| Fact              | Where in the Studio                                                          | Confirmed flag         |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Street address    | Business info: `street`, `city`, `state`, `zip`                              | `addressConfirmed`     |
| How to find us    | Business info: `findUs` (one optional sentence)                              | n/a                    |
| Phone             | Site settings: `phone`                                                       | `phoneConfirmed`       |
| Email             | Site settings: `email`                                                       | `emailConfirmed`       |
| Opening hours     | Business info: `openingHours[]` { days, opens, closes, label }               | each row's `confirmed` |
| A line under them | Business info: `hoursNote`                                                   | n/a                    |
| Hours changes     | Business info: `hoursChanges[]` { date, endDate, kind, opens, closes, note } | n/a                    |

- `SITE_SETTINGS_PROJECTION` (`src/lib/queries.ts`) folds the Business info fields in under flat names,
  so one memoized read per build carries everything.
- `src/lib/business-facts.ts` (`resolveBusinessFacts`, PORTABLE, pure) turns them into
  `{ address, place, phone, email, hours, hasHours, hoursNote }`. Components call `getBusinessFacts()`
  (`src/lib/business-data.ts`); the footer and Contact resolve the settings they already hold.
- `src/lib/business-hours.ts` (PORTABLE, pure, runs at build time AND in the browser) holds every rule
  about hours. `src/lib/place-line.ts` (PORTABLE) is the one place line, "Hamilton, OH", town and state
  with no ZIP.
- The starter's placeholders (`Your City`, `XX`) count as empty everywhere.
- `days`, `opens`, `closes` and `kind` are in `NON_STEGA_FIELDS` (rule 8b); the resolver also strips
  markers with `plain()`.

## Hours are optional

A site with no `openingHours` rows shows nothing new anywhere: no footer line, no Contact hours, the
Opening hours block draws nothing, and the LocalBusiness data has no `openingHoursSpecification`. A
site with no street address gets no address card, and the Map block draws nothing.

## The "To confirm" tag

`src/components/business/ToConfirm.astro` is the small inline tag. Pass the resolved flag
(`<ToConfirm confirmed={facts.phone?.confirmed} />`); it renders only when the flag is `false`, so it
disappears the day someone ticks the box. An unconfirmed fact is also kept out of the site-wide
LocalBusiness JSON-LD (`src/lib/schemas.ts`): no street, ZIP, phone, email or hours row reaches search
engines until it is confirmed (city and state were published before card 196 and still are).

**Default versus strict.** In the starter only an explicit untick (`false`) is provisional, so data saved
before the flags existed shows as it always did. `resolveBusinessFacts(raw, { strict: true })` wants an
explicit tick instead, which is how Auburn treats church facts (every fact starts unconfirmed). The
Studio's Checkup already lists any document with a `confirmed` or `...Confirmed` box left unticked
(`unconfirmedRule`, card 66), so the new flags are reported there with no extra code.

## Opening hours

- **Rows.** One row per set of days with the same hours (Monday to Friday, 9 am to 5 pm). A day with no
  row is closed. Two rows on one day are two spells (9 to noon, then 1 to 5). Times are picked from a
  quarter-hour list stored as "HH:MM". A closing time at or before the opening time runs past midnight
  (6 pm to 2 am); the same time twice means open 24 hours. `label` names a part of the business with
  its own hours ("Kitchen").
- **Hours changes** never touch the usual week. Each is a date (and an optional last day), closed all day
  or different hours, and an optional reason. `dayHours()` applies one on its dates (a closure beats new
  hours); `upcomingChanges()` ignores any whose last day has passed. Quick update has **Change the hours
  for a day** (`kit.config.ts`, id `hours-change`), which appends one.
- **Time zone.** Every "today" and "now" is on `site.timeZone` (`src/data/site.ts`), never the build
  machine's or the visitor's. Days are YYYY-MM-DD strings and times are minutes after midnight, so a
  daylight saving change never moves an opening time. `business-hours.test.ts` pins both clock changes
  in America/New_York, either side of midnight, a spell past midnight and a closure skipped by "next
  opening".

### Built, then kept right in the browser

A static page cannot know when it is read. The HTML is built with today's hours ("Today 9 am to 5 pm",
right without JavaScript) and carries the week as data; `src/scripts/business-live.ts` then works out
"Open now until 5 pm" or "Closed now, Opens tomorrow at 9 am" with the same functions, re-checks once a
minute, hides any dated change whose last day has passed (`[data-biz-until]`) and marks today's row in an
hours table (`[data-biz-days]`). So an expired holiday never shows even when no rebuild ran. The
structured data only moves on a rebuild: `deploy.yml` rebuilds on every publish, and a site that relies on
dated changes in search results should turn on a daily scheduled deploy.

## Where it shows

| Piece                                     | Draws                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `business/OpenStatus.astro`               | The open-now line (`size="lead"` for the big one)                                      |
| `business/HoursTable.astro`               | The week, Monday first, equal days run together, plus "Changes coming up"              |
| `business/BusinessAddress.astro`          | `<address>`, the tag, "how to find us", Directions (Google Maps) and Apple Maps links  |
| `business/ToConfirm.astro`                | The tag                                                                                |
| Opening hours block (`hoursSection`)      | "Today beside the week" (status card on the narrow track) or "One slim band"           |
| Map and directions block (`mapSection`)   | A drawn map card (no map service loads), the address, today's hours, two buttons       |
| Footer, Get in touch                      | The address and the open-now line, only when set; tags beside phone and email          |
| Contact form block (`ContactFormSection`) | Visit (address and links) and Hours in its side column, only when set                  |
| LocalBusiness JSON-LD                     | `streetAddress`, `postalCode`, `telephone` when confirmed; `openingHoursSpecification` |

Both blocks are self-filling (`SELF_FILLING_SECTIONS`) and sit in the "Hours and location" insert group.
On `/styleguide/sections/` they carry made-up facts through a fixture-only `facts` key, so the thumbnail
and tests have something to draw; a block on a real page never carries facts.

## A church on the same shape

Auburn keeps its own church layer. A church site starting fresh can map its gatherings onto this one:

| Church fact (Auburn)                                            | Business facts (starter)                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `churchAddress` { street, city, state, zip, findUs, confirmed } | `street`, `city`, `state`, `zip`, `findUs`, `addressConfirmed`                     |
| `serviceTimes[]` { label, day, time, note, confirmed }          | `openingHours[]` rows with a `label` ("Worship"), one day, a start and an end time |
| "A different Sunday" `timeChanges[]` (time, cancelled, extra)   | `hoursChanges[]` (hours, closed); an extra service has no starter equivalent yet   |
| `dayPlan()`, `thisSunday()`                                     | `dayHours()`, `openState()`                                                        |
| `NotConfirmed.astro`                                            | `ToConfirm.astro` (Auburn shows the tag unless ticked: `strict`)                   |
| `TimesBand.astro`, `ServiceTimes.astro`                         | The Opening hours block (band and card layouts)                                    |
| `ChurchMap.astro`, `MapBlock.astro`                             | The Map and directions block                                                       |
| `lib/place-line.ts`                                             | `lib/place-line.ts` (same `townOf`, generic `placeLine`)                           |

What the church layer adds on top (start times rather than open spells, "This Sunday" cards, named times,
`.ics` per gathering, the live banner) stays church-only.

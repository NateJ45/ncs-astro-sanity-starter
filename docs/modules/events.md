# Module: Events

**What it adds:** Route `/events` -- an events listing page. Upcoming events (startDate >= now) are shown sorted by start date ascending, each as a card with title, date/time, location, description, and an optional registration button that links to an external registration service (Eventbrite, Luma, etc.). Past events collapse under a `<details>` element so the page stays focused on what is coming up. A coming-soon state renders when no `event` documents exist. Studio schemas: `eventsPage` (singleton for SEO and hero) and `event` (collection, one document per event).

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `SanityImage.astro`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showEvents` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/events/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add two import lines and two array entries:

```ts
// add with the other imports, alphabetical by symbol name
import { event } from './event';
import { eventsPage } from './eventsPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  eventsPage,   // <-- add here

  // Reusable content collections
  // ... existing collections ...
  event,        // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'eventsPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'eventsPage',   // <-- add
] as const;
```

**b) Add `CalendarIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  CalendarIcon,
} from '@sanity/icons';
```

**c) Add the Events page singleton inside the Pages list item** (after the other page singletons, before the divider above Privacy):

```ts
singletonWithPreview(S, 'eventsPage', 'Events Page', CalendarIcon),
```

**d) Add the Events list inside the Content list item** (after the other collections):

```ts
S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/events/src/* src/
```

### Step 4b -- Copy the co-located query file

The events page imports `getEventsPage`, `getUpcomingEvents`, and `getPastEvents` from `@/lib/eventQueries`. Copy the co-located query file:

```powershell
Copy-Item modules/events/src/lib/eventQueries.ts src/lib/
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the events link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.events ? [{ kind: 'flat' as const, label: 'Events', href: '/events' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/events/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `eventsPage` singleton and three neutral `event` documents with start dates approximately 2, 4, and 8 weeks from the day the script runs, so they always appear in the "Upcoming" section immediately after seeding. Replace all placeholder content in Studio before publishing.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /events appears in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'eventsPage', 'Events Page', CalendarIcon),
```

Paste the **collection list** into the Content `S.list().items([...])` block:

```ts
S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
```

Add this import if `CalendarIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  CalendarIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.events ? [{ kind: 'flat' as const, label: 'Events', href: '/events' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/events` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `event` documents, `/events` shows the coming-soon holding state and does not crash.
- After seeding, the three placeholder events appear in the "Upcoming Events" section sorted by date.
- Changing an event's `startDate` to a past date causes it to move to the "Past Events" collapsed section on the next build or reload.
- The "Past Events" `<details>` element opens and closes correctly.
- Events with `registrationUrl` show a "Register" button linking to the external URL with `target="_blank" rel="noopener noreferrer"`.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Events nav link appears in the header and navigates to `/events`.

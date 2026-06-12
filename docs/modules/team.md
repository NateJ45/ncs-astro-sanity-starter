# Module: Team

**What it adds:** Route `/team` -- a team member listing page. The page opens with a hero and optional intro copy from the `teamPage` singleton, then displays all `teamMember` documents as a responsive card grid ordered by `displayOrder` (then name alphabetically). Each card shows a headshot, name, role, bio, and optional email and social links. A coming-soon state renders automatically when no `teamMember` documents exist. Studio schemas: `teamPage` (singleton for SEO, hero, and intro) and `teamMember` (collection, one document per person).

No per-member detail pages are included by default. If the client needs individual team member pages (e.g. `/team/[slug]`), they are a custom extension: create `src/pages/team/[slug].astro` and a `getTeamMemberBySlug` query in `teamQueries.ts` following the same pattern as the portfolio detail page.

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `SanityImage.astro`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showTeam` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/team/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add two import lines and two array entries:

```ts
// add with the other imports, alphabetical by symbol name
import { teamMember } from './teamMember';
import { teamPage } from './teamPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  teamPage,     // <-- add here

  // Reusable content collections
  // ... existing collections ...
  teamMember,   // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'teamPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'teamPage',   // <-- add
] as const;
```

**b) Add `UsersIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  UsersIcon,
} from '@sanity/icons';
```

**c) Add the Team page singleton inside the Pages list item** (after the other page singletons, before the divider above Privacy):

```ts
singletonWithPreview(S, 'teamPage', 'Team Page', UsersIcon),
```

**d) Add the Team Members list inside the Content list item** (after the other collections):

```ts
S.documentTypeListItem('teamMember').title('Team Members').icon(UsersIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/team/src/* src/
```

### Step 4b -- Copy the co-located query file

The team page imports `getTeamPage` and `getTeamMembers` from `@/lib/teamQueries`. Copy the co-located query file:

```powershell
Copy-Item modules/team/src/lib/teamQueries.ts src/lib/
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the team link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.team ? [{ kind: 'flat' as const, label: 'Team', href: '/team' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/team/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `teamPage` singleton and three neutral `teamMember` documents (Alex Morgan, Jordan Lee, Sam Rivera) with placeholder bios and display orders 1, 2, 3. Replace names, roles, bios, and headshots with real content in Studio.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /team appears in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'teamPage', 'Team Page', UsersIcon),
```

Paste the **collection list** into the Content `S.list().items([...])` block:

```ts
S.documentTypeListItem('teamMember').title('Team Members').icon(UsersIcon),
```

Add this import if `UsersIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  UsersIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.team ? [{ kind: 'flat' as const, label: 'Team', href: '/team' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/team` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `teamMember` documents, `/team` shows the coming-soon holding state with a "Get in touch" button and does not crash.
- After seeding, all three placeholder member cards appear in the grid with names, roles, and placeholder bio text.
- Cards without headshots show an initial-letter fallback without crashing.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Team nav link appears in the header and navigates to `/team`.

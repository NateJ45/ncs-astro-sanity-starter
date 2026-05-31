# Module: Style Quiz

**What it adds:** Route `/quiz` -- an interactive style-preference quiz that helps visitors discover their design aesthetic and optionally captures their email for follow-up. Visitors answer four image-choice questions, then optionally answer qualifier questions (timeline, budget), then see an archetype result with a description, sample images, and a contextual CTA (book a consult for high-intent visitors, a guide for lower-intent visitors). Studio schema: `styleQuiz` singleton (controls copy, questions, archetype descriptions, email-gate mode, routing rules).
**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `BaseLayout.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`), `subscribeEmail` (from `@/lib/subscribe`), and shadcn UI primitives.
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.styleQuiz` flag controls whether `/quiz` is accessible; set it to `true` to enable.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/style-quiz/studio/*.ts studio/schemaTypes/
```

> **Dependency:** The `styleQuiz` schema has a `routing.guideRef` field that
> references the `leadMagnet` type. If the `lead-magnets` module is **not**
> enabled, you must still copy its schema file so the Sanity schema extract
> does not fail:
>
> ```powershell
> Copy-Item modules/lead-magnets/studio/leadMagnet.ts studio/schemaTypes/
> ```
>
> Then register it in `studio/schemaTypes/index.ts` (import + add to the array)
> and add `'leadMagnet'` to `ORDERABLE_TYPES` in `studio/structure.ts`.
> The `leadMagnet` type will be hidden from the desk (it floats into
> `HIDDEN_FROM_DEFAULT` via `ORDERABLE_TYPES`) but the schema will resolve.
> If `lead-magnets` is already enabled, no extra step is needed.

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry. Follow the existing grouping comments:

```ts
// add with the other imports, alphabetical by symbol name
import { styleQuiz } from './styleQuiz';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  styleQuiz,   // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `styleQuiz` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'styleQuiz',   // <-- add
] as const;
```

**b) Add `SearchIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  SearchIcon,
} from '@sanity/icons';
```

**c) Add the Style Quiz page singleton inside the Pages list item** (after the Journal entry, before the Privacy Policy divider):

```ts
singletonWithPreview(S, 'styleQuiz', 'Style Quiz', SearchIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/style-quiz/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The quiz page imports `getStyleQuiz` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Style Quiz module ------------------------------------------------------

export async function getStyleQuiz() {
  return sanityFetch(`*[_type == "styleQuiz"][0]{
    seoTitle, seoDescription,
    heroEyebrow, heroHeadline, heroSubhead,
    heroScriptAccent,
    questions[]{
      _key, question, answers[]{_key, label, value, image${IMAGE_PROJECTION}}
    },
    qualifierQuestions[]{
      _key, question, field, answers[]{_key, label, value}
    },
    archetypes[]{
      _key, id, name, description,
      images[]${IMAGE_PROJECTION},
      ctaLabel, ctaHref,
      secondaryCtaLabel, secondaryCtaHref
    },
    emailGateMode,
    emailGateHeading, emailGateBlurb, emailGateButtonLabel,
    emailGateSkipLabel
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the quiz link, wrapped in the `sectionVisibility` conditional:

```ts
...(visible.styleQuiz ? [{ kind: 'flat' as const, label: 'Style Quiz', href: '/quiz' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/style-quiz/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `styleQuiz` singleton with 4 neutral questions, 2 qualifier questions, and 3 archetype results (Clean Modern, Warm Traditional, Relaxed Eclectic).

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /quiz appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'styleQuiz', 'Style Quiz', SearchIcon),
```

Add this import if `SearchIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  SearchIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.styleQuiz ? [{ kind: 'flat' as const, label: 'Style Quiz', href: '/quiz' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/quiz` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no seeded content (before running `seed.mjs`), `/quiz` shows the coming-soon state and does not crash.
- After seeding, the quiz progresses through all four image-answer questions (without answer images -- the island renders a label-only fallback), the two qualifier questions, and the archetype result screen.
- The email gate form in optional mode shows a "Skip and see my result" link.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Style Quiz nav link appears in the header and navigates to `/quiz`.

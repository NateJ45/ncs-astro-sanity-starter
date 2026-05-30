# Final CTA Background Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional background photo to each page's Final CTA, with a fixed charcoal scrim that keeps the headline and button readable, falling back to the current solid panel when no image is set.

**Architecture:** Mirror the existing per-page `finalCta*` pattern. Add one optional `image` field to the `'final'` group of all 7 page singleton schemas, project it in the 7 query functions that feed a Final CTA, render it in `FinalCta.astro` behind a `bg-accent-dark/70` scrim, and pass it from each page. The solid Charcoal Dark panel stays as the base layer, so absence of an image (or a broken asset) degrades to today's look.

**Tech Stack:** Astro 6, Sanity v5 (schemas + GROQ via `npm run typegen`), Tailwind v4, `SanityImage.astro` wrapper, Cloudflare Workers build.

**Reference spec:** `docs/superpowers/specs/2026-05-30-finalcta-background-image-design.md`

**Testing note:** This codebase has no unit-test harness for Astro components, Sanity schemas, or GROQ, and verification is done with `npm run typegen`, the dev/build compile, and visual checks in the browser (see CLAUDE.md "Visual verification workflow"). The change is declarative schema plus presentational rendering with no algorithmic logic to unit-test, so each task verifies via typegen, a clean dev compile, and browser inspection rather than failing unit tests.

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `studio/schemaTypes/homePage.ts` | Add `finalCtaBackgroundImage` to `'final'` group |
| Modify | `studio/schemaTypes/aboutPage.ts` | Same |
| Modify | `studio/schemaTypes/processPage.ts` | Same |
| Modify | `studio/schemaTypes/servicesPage.ts` | Same |
| Modify | `studio/schemaTypes/faqPage.ts` | Same |
| Modify | `studio/schemaTypes/journalPage.ts` | Same (shared by journal index + posts) |
| Modify | `studio/schemaTypes/eDesignPage.ts` | Same |
| Modify | `src/lib/queries.ts` | Project the image in 7 query functions |
| Modify | `src/components/FinalCta.astro` | Render image + scrim behind content |
| Modify | `src/pages/index.astro` | Pass `backgroundImage` prop |
| Modify | `src/pages/about.astro` | Same |
| Modify | `src/pages/process.astro` | Same |
| Modify | `src/pages/services.astro` | Same |
| Modify | `src/pages/faq.astro` | Same |
| Modify | `src/pages/e-design.astro` | Same |
| Modify | `src/pages/journal/index.astro` | Same |
| Modify | `src/pages/journal/[slug].astro` | Same (reads shared `getJournalPage` Final CTA) |
| Modify | `docs/agent/*.md` | Document the new field |

---

### Task 1: Add `finalCtaBackgroundImage` to all 7 page schemas

**Files:**
- Modify: `studio/schemaTypes/homePage.ts`
- Modify: `studio/schemaTypes/aboutPage.ts`
- Modify: `studio/schemaTypes/processPage.ts`
- Modify: `studio/schemaTypes/servicesPage.ts`
- Modify: `studio/schemaTypes/faqPage.ts`
- Modify: `studio/schemaTypes/journalPage.ts`
- Modify: `studio/schemaTypes/eDesignPage.ts`

Each of these schemas has a `'final'` field group containing a `finalCta` field defined as:

```js
defineField({ name: 'finalCta', title: 'Final CTA button', type: 'ctaBlock', group: 'final' }),
```

(In `homePage.ts` this is the last field in the `fields` array, around line 285. The other six have the same `finalCta` ctaBlock field in their `'final'` group; locate it by name.)

- [ ] **Step 1: Add the image field in each schema**

In each of the 7 files, immediately AFTER the `finalCta` ctaBlock `defineField({...})` line, add:

```js
    defineField({
      name: 'finalCtaBackgroundImage',
      title: 'Final CTA background image (optional)',
      type: 'image',
      group: 'final',
      options: { hotspot: true },
      description:
        'Optional. A photo behind the closing call-to-action. The site automatically darkens it so the headline and button stay readable. Leave empty to keep the solid charcoal panel.',
    }),
```

Do this in all 7 files. Do not add an `alt` sub-field: the image is decorative.

- [ ] **Step 2: Regenerate Sanity types**

Run: `npm run typegen`
Expected: completes without error. `src/lib/sanity.types.ts` now contains `finalCtaBackgroundImage` on the `HomePage`, `AboutPage`, `ProcessPage`, `ServicesPage`, `FaqPage`, `JournalPage`, and `EDesignPage` types (an internal Sanity image reference shape).

- [ ] **Step 3: Deploy the Studio**

Run: `npm run studio:deploy`
Expected: ends with `Success! Studio deployed to https://reid-design.sanity.studio/`. This is required after any schema change (CLAUDE.md rule 1) so the hosted Studio shows the new field instead of an "unknown field" warning.

- [ ] **Step 4: Commit**

```bash
git add studio/schemaTypes/homePage.ts studio/schemaTypes/aboutPage.ts studio/schemaTypes/processPage.ts studio/schemaTypes/servicesPage.ts studio/schemaTypes/faqPage.ts studio/schemaTypes/journalPage.ts studio/schemaTypes/eDesignPage.ts src/lib/sanity.types.ts
git commit -m "feat: add optional finalCtaBackgroundImage field to page singletons"
```

---

### Task 2: Project the background image in the 7 query functions

**Files:**
- Modify: `src/lib/queries.ts`

`queries.ts` defines `IMAGE_PROJECTION` (around line 12):

```js
const IMAGE_PROJECTION = `{
  ...,
  asset->,
  "alt": coalesce(alt, asset->altText, "")
}`;
```

Seven functions project the Final CTA fields. In each, there is a line:

```
    finalCta${CTA_PROJECTION}
```

(In `getFaqPage` it is `finalCta${CTA_PROJECTION},` followed by a `secondaryCta` line. In `getJournalPage` the block has no `finalCtaEyebrow`. The insertion is the same regardless.)

- [ ] **Step 1: Insert the projection in each of the 7 functions**

In each function below, add this line immediately ABOVE its `finalCta${CTA_PROJECTION}` line (inserting above keeps the existing trailing-comma layout untouched):

```
    finalCtaBackgroundImage${IMAGE_PROJECTION},
```

The 7 functions and the approximate line of their `finalCta` projection:

| Function | `finalCta` projection near line |
|----------|--------------------------------|
| `getHomePage` | 125 |
| `getAboutPage` | 155 |
| `getProcessPage` | 172 |
| `getServicesPage` | 195 |
| `getFaqPage` | 213 |
| `getJournalPage` | 342 |
| `getEDesignPage` | 428 |

Because `finalCta${CTA_PROJECTION}` appears 7 times, edit each occurrence within its own function (use the surrounding function body to disambiguate). After the edit, a representative block reads:

```
    finalCtaEyebrow,
    finalCtaHeadline,
    finalCtaScriptAccent,
    finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`);
```

- [ ] **Step 2: Regenerate types and verify the dev compile**

Run: `npm run typegen`
Expected: completes without error.

Run: `npm run dev`
Expected: dev server starts with no TypeScript or Astro errors in the terminal. (Leave it running for the later visual steps, or restart as needed.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts src/lib/sanity.types.ts
git commit -m "feat: project finalCtaBackgroundImage in page queries"
```

---

### Task 3: Render the background image + scrim in `FinalCta.astro`

**Files:**
- Modify: `src/components/FinalCta.astro`

The component is a Charcoal Dark panel. It currently imports `CtaLink` and `splitScriptAccent`, defines a `Props` interface, destructures props, and renders `<section class="bg-accent-dark text-bg">` with a bronze stripe `<div>` and a centered content `<div>`.

- [ ] **Step 1: Import `SanityImage`**

Find:

```astro
import CtaLink from '@/components/CtaLink.astro';
import { splitScriptAccent } from '@/lib/scriptAccent';
```

Replace with:

```astro
import CtaLink from '@/components/CtaLink.astro';
import SanityImage from '@/components/SanityImage.astro';
import { splitScriptAccent } from '@/lib/scriptAccent';
```

- [ ] **Step 2: Add the `backgroundImage` prop to the interface**

Find (the end of the `Props` interface, the `scriptAccent?: string;` field and its closing brace):

```astro
  scriptAccent?: string;
}
```

Replace with:

```astro
  scriptAccent?: string;
  /**
   * Optional decorative background photo. When set, it fills the panel behind a
   * fixed charcoal scrim that keeps the cream headline and bronze button
   * readable. When absent, the panel renders as the solid Charcoal Dark surface,
   * exactly as before. The shape matches what SanityImage accepts.
   */
  backgroundImage?: {
    asset?: { _ref?: string; _id?: string };
    alt?: string;
    hotspot?: { x: number; y: number; height: number; width: number };
    crop?: { top: number; bottom: number; left: number; right: number };
  } | null;
}
```

- [ ] **Step 3: Destructure the prop and compute a flag**

Find:

```astro
  headingId = 'final-cta',
  fallbackCtaLabel = 'Book a Consultation',
  scriptAccent,
} = Astro.props as Props;
```

Replace with:

```astro
  headingId = 'final-cta',
  fallbackCtaLabel = 'Book a Consultation',
  scriptAccent,
  backgroundImage,
} = Astro.props as Props;

// Only treat the background as present when a real asset is attached, so an
// empty image object never flips on the overlay path.
const hasBackground = !!backgroundImage?.asset;
```

- [ ] **Step 4: Make the section position-aware and add the image + scrim layer**

Find:

```astro
<section
  class="bg-accent-dark text-bg"
  aria-labelledby={headingId}
>
  {/* Bronze accent stripe — same 2px brand signature used at the top of the
      site header, mobile menu, footer, and every marketing card. Softens the
      transition from the previous (usually light) section into this dark
      panel and ties the close-of-page back into the brand vocabulary. */}
  <div class="h-0.5 bg-primary" aria-hidden="true"></div>
```

Replace with:

```astro
<section
  class:list={['bg-accent-dark text-bg', hasBackground && 'relative overflow-hidden']}
  aria-labelledby={headingId}
>
  {/* Optional background photo + fixed charcoal scrim. Rendered only when an
      image is set; otherwise the section stays the solid Charcoal Dark panel.
      The scrim is tuned dark enough that the cream headline and bronze button
      stay readable over any photo. The image is decorative, so it is
      aria-hidden with empty alt and sits at z-0 behind the stripe + content. */}
  {hasBackground && (
    <div class="absolute inset-0 z-0" aria-hidden="true">
      <SanityImage
        source={backgroundImage}
        width={1920}
        sizes="100vw"
        loading="lazy"
        alt=""
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-accent-dark/70"></div>
    </div>
  )}

  {/* Bronze accent stripe, same 2px brand signature used at the top of the
      site header, mobile menu, footer, and every marketing card. Softens the
      transition from the previous (usually light) section into this dark
      panel and ties the close-of-page back into the brand vocabulary. */}
  <div class:list={['h-0.5 bg-primary', hasBackground && 'relative z-10']} aria-hidden="true"></div>
```

- [ ] **Step 5: Lift the content above the background layer**

Find:

```astro
  <div class="mx-auto max-w-content px-m py-section-lg text-center">
```

Replace with:

```astro
  <div class:list={['mx-auto max-w-content px-m py-section-lg text-center', hasBackground && 'relative z-10']}>
```

- [ ] **Step 6: Verify the no-image path is unchanged**

With the dev server running, open any page (e.g., `http://localhost:4321/`) and scroll to the Final CTA. No page sets a background image yet, so it must look identical to before: solid Charcoal Dark panel, bronze stripe, centered content. Check both light and dark theme via the header toggle.

Expected: no visual change anywhere, no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/FinalCta.astro
git commit -m "feat: render optional background image + scrim in FinalCta"
```

---

### Task 4: Pass `backgroundImage` from every page

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/process.astro`
- Modify: `src/pages/services.astro`
- Modify: `src/pages/faq.astro`
- Modify: `src/pages/e-design.astro`
- Modify: `src/pages/journal/index.astro`
- Modify: `src/pages/journal/[slug].astro`

Each page renders `<FinalCta ... />` and already passes `finalCta*` props from a page-data variable. In `index.astro` that block is:

```astro
  <FinalCta
    eyebrow={page?.finalCtaEyebrow}
    headline={page?.finalCtaHeadline}
    subhead={page?.finalCtaSubhead}
    cta={page?.finalCta}
    scriptAccent={page?.finalCtaScriptAccent}
  />
```

- [ ] **Step 1: Add the prop to each `<FinalCta>` call**

In each of the 8 files, add this line inside the `<FinalCta ... />` props, using the SAME page-data variable the existing `finalCtaHeadline` prop uses in that file (it is `page` in most; confirm per file, and in `journal/[slug].astro` use whichever variable holds the shared `getJournalPage` data):

```astro
    backgroundImage={page?.finalCtaBackgroundImage}
```

For `index.astro` the result is:

```astro
  <FinalCta
    eyebrow={page?.finalCtaEyebrow}
    headline={page?.finalCtaHeadline}
    subhead={page?.finalCtaSubhead}
    cta={page?.finalCta}
    scriptAccent={page?.finalCtaScriptAccent}
    backgroundImage={page?.finalCtaBackgroundImage}
  />
```

If a page renders `<FinalCta>` without a secondary line yet uses a different variable name (for example `aboutPage`, `journalPage`), match that file's existing `finalCta*` props exactly.

- [ ] **Step 2: Handle any type narrowing**

If `npm run dev` reports a type error on `backgroundImage={...}` (the generated query type can be broader than the prop type, as happened with the About stats field), cast at the call site the same way that precedent did, e.g. `backgroundImage={page?.finalCtaBackgroundImage as any}` only if required. Prefer no cast; add one only if the compile fails.

- [ ] **Step 3: Verify the compile**

Run: `npm run dev` (or check the already-running server)
Expected: no TypeScript or Astro errors. Every page still renders its Final CTA unchanged (no image set yet).

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/pages/about.astro src/pages/process.astro src/pages/services.astro src/pages/faq.astro src/pages/e-design.astro src/pages/journal/index.astro "src/pages/journal/[slug].astro"
git commit -m "feat: pass finalCtaBackgroundImage to FinalCta on every page"
```

---

### Task 5: Visual verification with a real image + scrim tuning

**Files:**
- Modify (only if tuning is needed): `src/components/FinalCta.astro`

The background path has not been seen rendered yet. Set a test image in the dataset, verify legibility, and tune the scrim if needed. Sanity content lives in the dataset, not the repo, so setting/clearing the test image does not create a repo diff.

- [ ] **Step 1: Set a test background image on one page**

Run `npm run studio:dev`, open the About page document, set a **Final CTA background image** using any available photo (reuse an existing uploaded asset, e.g. a project hero), and publish. Keep the dev site (`npm run dev`) running.

- [ ] **Step 2: Verify on the rendered page**

Open `http://localhost:4321/about` and scroll to the Final CTA.

Expected: the photo fills the panel, darkened by the scrim; the cream headline, subhead, and bronze button are clearly readable; the bronze top stripe still shows. Check all of:
- Light theme and dark theme (header toggle).
- Desktop (~1280px) and mobile (~375px) widths.
- No layout shift or overflow; the image is clipped to the panel (`overflow-hidden`).

- [ ] **Step 3: Tune the scrim if text is hard to read**

If the headline or button does not clearly clear contrast over the brightest part of the photo, adjust the scrim opacity in `src/components/FinalCta.astro`. Find:

```astro
      <div class="absolute inset-0 bg-accent-dark/70"></div>
```

Raise toward `bg-accent-dark/80` (darker) for legibility, or lower toward `bg-accent-dark/60` if it is too heavy and the photo is lost. If a token-opacity issue ever leaves the scrim fully transparent, substitute a known-good value `bg-black/65`. Re-check both themes and both widths after any change.

- [ ] **Step 4: Confirm the empty path still works**

In Studio, clear the test image on the About page (so we do not ship a placeholder photo) and publish. Reload `http://localhost:4321/about`.

Expected: the Final CTA returns to the solid Charcoal Dark panel with no errors.

- [ ] **Step 5: Commit any tuning**

Only if you changed the scrim value in Step 3:

```bash
git add src/components/FinalCta.astro
git commit -m "fix: tune FinalCta background scrim for text legibility"
```

If no tuning was needed, skip this commit.

---

### Task 6: Document the new field

**Files:**
- Modify: `docs/agent/sanity.md`
- Modify: `docs/agent/components.md`
- Modify: `docs/agent/changelog.md`

- [ ] **Step 1: Note the field in `sanity.md`**

In the page-singletons area of `docs/agent/sanity.md` (near the existing `aboutPage` / page-singleton notes), add a sentence:

```markdown
- Every page singleton with a Final CTA (`homePage`, `aboutPage`, `processPage`, `servicesPage`, `faqPage`, `journalPage`, `eDesignPage`) has an optional `finalCtaBackgroundImage` in its `'final'` group. When set, `FinalCta.astro` renders it behind a fixed charcoal scrim; when empty, the Final CTA stays the solid Charcoal Dark panel. The journal image is shared across the journal index and every post (it lives on `journalPage`). Projected with `IMAGE_PROJECTION` in each page query.
```

- [ ] **Step 2: Note the behavior in `components.md`**

Find the `FinalCta`-related text or the dark-panel description and add (place near where `CtaLink onDark` / FinalCta is discussed):

```markdown
`FinalCta.astro` accepts an optional `backgroundImage` (Sanity image). When set, the closing panel renders the photo full-bleed behind a `bg-accent-dark/70` scrim with the content lifted to `z-10`; the bronze stripe stays on top. Empty or missing asset falls back to the solid Charcoal Dark panel. Image is decorative (`aria-hidden`, empty alt).
```

- [ ] **Step 3: Prepend a changelog entry**

In `docs/agent/changelog.md`, add to the current `*Last updated: ...*` entry (before the `Earlier:` marker) a sentence:

```
Final CTA sections can now carry an optional background photo per page (new `finalCtaBackgroundImage` on all 7 page singletons, projected in `queries.ts`, rendered in `FinalCta.astro` behind a fixed `bg-accent-dark/70` charcoal scrim so the cream headline and bronze button stay readable; empty falls back to the solid charcoal panel; journal uses one shared image across index + posts).
```

- [ ] **Step 4: Commit**

```bash
git add docs/agent/sanity.md docs/agent/components.md docs/agent/changelog.md
git commit -m "docs: document optional FinalCta background image"
```

---

## Done criteria

- The `finalCtaBackgroundImage` field is in all 7 page schemas, the Studio is deployed, and `npm run typegen` is clean.
- All 7 query functions project the image; all 8 pages pass it to `FinalCta`.
- With an image set, the Final CTA shows the photo behind a legible charcoal scrim in both themes and both viewports; with no image it is the unchanged solid panel.
- Docs updated. All changes committed.

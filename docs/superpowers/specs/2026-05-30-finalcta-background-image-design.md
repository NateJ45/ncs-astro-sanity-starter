# Final CTA Background Image: Design Spec

**Date:** 2026-05-30

## Goal

Let Staci optionally set a background photo on each page's closing Final CTA section. The site automatically darkens the photo so the headline and button stay readable. When no image is set, the Final CTA renders exactly as it does today (solid Charcoal Dark panel), with no change.

## Current state

- `FinalCta.astro` is the shared closing call-to-action used on every page. It is a Charcoal Dark panel (`bg-accent-dark text-bg`) with a 2px bronze top stripe, an optional eyebrow plus cream hairline, a display headline (with optional Pinyon Script accent via `splitScriptAccent`), an optional subhead, a primary CTA pill, and an optional secondary CTA. It takes props: `eyebrow`, `headline`, `subhead`, `cta`, `secondaryCta`, `headingId`, `fallbackCtaLabel`, `scriptAccent`.
- Each page singleton schema carries flat Final CTA fields inside a `'final'` field group: `finalCtaEyebrow`, `finalCtaHeadline`, `finalCtaScriptAccent`, `finalCtaSubhead`, `finalCta` (a `ctaBlock`). The seven singletons with these fields are `homePage`, `aboutPage`, `processPage`, `servicesPage`, `faqPage`, `journalPage`, and `eDesignPage`.
- Each page's query in `src/lib/queries.ts` projects those fields. The seven functions that project Final CTA fields are `getHomePage`, `getAboutPage`, `getProcessPage`, `getServicesPage`, `getFaqPage`, `getJournalPage`, and `getEDesignPage`. Image fields are projected with the shared `IMAGE_PROJECTION` = `{ ..., asset->, "alt": coalesce(alt, asset->altText, "") }`.
- The journal index page and every journal post both render their Final CTA from `getJournalPage` (the shared journal config). There is no per-post Final CTA.
- `SanityImage.astro` renders a responsive Sanity image and returns `null` when the source has no asset.

## Decisions (from brainstorming)

- **Overlay control: automatic and fixed.** The editor only picks an image. The site applies a tuned dark scrim sized for legibility. There is no editor-facing opacity field.
- **Scope: all seven page singletons.** Journal uses one shared image across the journal index and every journal post (matching how the journal headline and subhead already behave).
- **The background image is decorative.** It is `aria-hidden` with `alt=""`. No required alt field on the schema.
- **Overlay darkness is tuned in code**, not editor-controlled, and verified against real photos.

## Schema changes

Add one field to the `'final'` group of each of the seven page singletons, placed next to the other `finalCta*` fields:

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

No `alt` sub-field: the image is decorative and the headline carries the meaning.

Files: `studio/schemaTypes/homePage.ts`, `aboutPage.ts`, `processPage.ts`, `servicesPage.ts`, `faqPage.ts`, `journalPage.ts`, `eDesignPage.ts`.

After editing schemas: `npm run typegen`, then `npm run studio:deploy`, then commit (per CLAUDE.md rule 1).

## Query changes

In each of the seven query functions listed above, add this line next to the existing `finalCta` projection:

```
finalCtaBackgroundImage${IMAGE_PROJECTION}
```

This gives every Final CTA surface its image. Because `getJournalPage` feeds both the journal index and journal posts, adding it there covers both.

## Component changes (`FinalCta.astro`)

- Add an optional prop `backgroundImage` typed as the Sanity image object shape that `SanityImage` accepts (`{ asset?, alt?, hotspot?, crop? } | null`).
- Compute `const hasBg = !!backgroundImage?.asset;`.
- When `hasBg` is true:
  - The `<section>` gains `relative overflow-hidden` and keeps `bg-accent-dark text-bg` as the base color layer.
  - A background layer is rendered behind the content: an absolutely positioned, `aria-hidden` wrapper (`absolute inset-0`) containing `<SanityImage source={backgroundImage} width={1920} sizes="100vw" loading="lazy" alt="" class="w-full h-full object-cover" />` and a scrim `<div class="absolute inset-0 bg-accent-dark/70">` (final opacity tuned during implementation).
  - The existing content container gains `relative z-10` so it paints above the image and scrim. The bronze top stripe stays above the image as well.
- When `hasBg` is false, the markup is unchanged from today (no `relative`/`overflow`, no image, no scrim, solid charcoal).

Overlay tuning: start around a 70% charcoal scrim (`bg-accent-dark/70`) and adjust so the cream headline (`text-bg`) and the bronze CTA button clear WCAG AA contrast over the brightest representative photo. The panel is always dark regardless of light or dark theme, so the scrim behavior is theme-independent, but verify the bronze button and cream text over a bright photo region in both themes.

## Page changes

Each page that renders `<FinalCta>` passes the new prop from its page data:

```
backgroundImage={page?.finalCtaBackgroundImage}
```

Files: `src/pages/index.astro`, `about.astro`, `process.astro`, `services.astro`, `faq.astro`, `e-design.astro`, `journal/index.astro`, and `journal/[slug].astro` (the journal post page reads the shared Final CTA from `getJournalPage`).

## Accessibility

- The background image is decorative: `alt=""` and `aria-hidden` on the image layer.
- Text legibility is guaranteed by the fixed scrim. Verify cream headline and bronze CTA contrast against a real darkened photo (WCAG AA).
- No motion is introduced, so there is nothing to gate for reduced motion.

## Fallback and error states

- No image selected: the Final CTA renders the current solid charcoal panel, unchanged.
- Asset missing or broken: `SanityImage` returns `null`, so the `bg-accent-dark` base shows through and the panel degrades to the solid charcoal look.

## Out of scope

- Per-journal-post background images (journal uses one shared image).
- An editor-controlled opacity or darkness field.
- Background images on any section other than the Final CTA.
- Parallax, zoom, or any motion on the background image.

## Verification

- `npm run typegen` runs clean; `npm run studio:deploy` succeeds.
- In Studio, the new field appears in each page's Final CTA group with the helper text.
- Visual check on at least one page with an image set (overlay legibility) and one without (unchanged), in both light and dark themes, at mobile (~375px) and desktop (~1280px).
- Lighthouse is not regressed on a page carrying a Final CTA image (it is lazy-loaded and uses the responsive srcset from `SanityImage`).

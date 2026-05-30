# Home Hero Slideshow: Design Spec

**Date:** 2026-05-30

## Goal

Let the home page hero optionally be a slideshow of multiple images that slowly cross-fade, each with a subtle Ken Burns zoom. A single image renders exactly as today: one static photo, no fade, no zoom. Reduced-motion users always see a single static image.

## Decisions (locked during brainstorming)

- **Motion:** each image holds about 3 seconds, then a slow 1.5 second cross-fade to the next. A subtle Ken Burns zoom (scale 1.0 to 1.07, alternating zoom-in / zoom-out per slide) runs while a slide is active. The sequence loops. Confirmed against a live demo.
- **Schema:** ONE `heroImages` array field on `homePage`. The existing single `heroImage` is migrated into `heroImages[0]` and then hidden in Studio. One image in the array means a static hero, two or more means a slideshow.
- **Implementation:** an inline vanilla script plus CSS (matches the hero's existing inline scripts for rotating words and the scroll cue). No React island, to protect the homepage LCP.
- **Structure:** extract the hero background layer into a new `HeroBackground.astro` so `Hero.astro` does not grow unwieldy and the slideshow logic is isolated.
- **Accessibility:** the slideshow sits behind the headline, so it is decorative. The first image carries its alt text; the rest are `aria-hidden`. Alt is optional on the array images.
- **Performance:** the first slide stays eager with `fetchpriority="high"` (the LCP element). The remaining slides are `loading="lazy"` and low priority so they load after the LCP without competing.

## Current state

- `Hero.astro` has an image variant and a text variant. The image variant renders a single eager `<SanityImage width={2400} loading="eager" fetchpriority="high" quality={70} class="absolute inset-0 w-full h-full object-cover" />`, then a uniform overlay (`bg-accent-dark/25`) and a bottom gradient, then bottom-anchored content (eyebrow, h1, subhead, CTAs) and, for `size="tall"`, a scroll cue. It already uses `<script is:inline>` blocks for the `--header-h` measurement / scroll cue and the rotating-word animation, and respects `prefers-reduced-motion` throughout.
- `Hero.astro` props include `backgroundImage?: SanityImageObject | null`; `hasImage = !!backgroundImage?.asset` chooses the image vs text hero.
- `homePage.heroImage` is an image field (hotspot, required alt) in the `'hero'` group. `index.astro` passes `backgroundImage={page?.heroImage}`. `getHomePage` projects `heroImage${IMAGE_PROJECTION}`.
- `heroImage` is a per-page field repeated across every page schema and projected in every page query. This feature is home-only and must not touch other pages' hero images.
- `SanityImage.astro` renders a responsive `<img>` (eager/lazy, fetchpriority, srcset) and returns `null` when the source has no asset.

## Schema changes (`studio/schemaTypes/homePage.ts`)

- Add a `heroImages` array field in the `'hero'` group. Each array member is an `image` (`options: { hotspot: true }`) with an optional `alt` string sub-field. Description, roughly: "The home hero. Add one photo for a single static hero (current behavior). Add two or more for a slow cross-fading slideshow with a subtle zoom. Drag to set the order they appear in."
- Set `hidden: true` on the existing `heroImage` field (home page only). Keep the field so its data is preserved.
- After editing: `npm run typegen`, then `npm run studio:deploy`, then commit.

## Migration (`scripts/migrate-home-hero-images.mjs`)

- Idempotent script using the Sanity write client. Reads the `homePage` singleton. If `heroImages` is empty or unset and `heroImage` exists, patch `heroImages` to `[heroImage]` (copy the image object: asset reference, hotspot, crop, alt). Skip if `heroImages` already has entries. Run once after the schema deploy. Follows the pattern of the existing `scripts/seed-*.mjs` write scripts.

## Query change (`src/lib/queries.ts`, `getHomePage`)

- Add `heroImages[]${IMAGE_PROJECTION}` to the `getHomePage` projection. Keep the existing `heroImage${IMAGE_PROJECTION}` for the silent fallback.

## Component changes

### New: `src/components/HeroBackground.astro`

- Props: `images: SanityImageObject[]` (the resolved hero image list, possibly empty).
- If `images.length >= 2`: render the slideshow. For each image, a `<SanityImage>` wrapped/classed as a stacked slide (`.hero-slide`, `absolute inset-0 w-full h-full object-cover`). The first slide is eager, `fetchpriority="high"`, visible (`is-active`), and carries its alt. The remaining slides are `loading="lazy"`, low priority, and `aria-hidden` with `alt=""`. Then the two existing overlays (uniform `bg-accent-dark/25` and the bottom gradient). Then the inline slideshow script.
- If `images.length === 1`: render exactly today's single background: one eager `<SanityImage width={2400} loading="eager" fetchpriority="high" quality={70} class="absolute inset-0 w-full h-full object-cover" />` plus the two overlays. No slides, no script, no Ken Burns.
- (`images.length === 0` never reaches here; `Hero.astro` renders the text hero in that case.)
- Scoped `<style>`: `.hero-slide { opacity: 0; transition: opacity 1.5s ease; }`, `.hero-slide.is-active { opacity: 1; }`, the Ken Burns keyframes (alternating direction by `:nth-child` even/odd, varied `transform-origin`), and a `@media (prefers-reduced-motion: reduce)` block that disables the transition and zoom so the first slide simply shows.
- Inline `<script is:inline>` (rendered only for the slideshow case): an idempotent IIFE that runs on load and `astro:page-load`. If `prefers-reduced-motion` matches or there are fewer than 2 slides, it does nothing (the first slide is already `is-active`). Otherwise it advances the active slide on a 4500ms interval (3s hold + 1.5s fade), wrapping at the end, re-triggers the Ken Burns on the newly active slide, and pauses/resumes on `visibilitychange` (clear the interval when `document.hidden`).

### Modify: `src/components/Hero.astro`

- Add prop `backgroundImages?: SanityImageObject[]`.
- Compute the effective list: `backgroundImages` when it has assets, else `backgroundImage` wrapped as a one-item list, else empty. `hasImage` becomes "list has at least one image with an asset."
- Replace the inline `<SanityImage>` and the two overlay `<div>`s in the image branch with `<HeroBackground images={list} />`. Keep everything else (content wrapper, hero-entry-stagger, scroll cue, scoped styles, inline header/rotating scripts) unchanged.
- Other pages still pass only `backgroundImage` (single), which becomes a one-item list and renders the single static background exactly as before.

### Modify: `src/pages/index.astro`

- Pass `backgroundImages={page?.heroImages}` to `<Hero>` (keep `backgroundImage={page?.heroImage}` as the fallback the Hero already reads).

## Fallback, accessibility, and reduced motion

- Zero images (and no `heroImage`): text hero, current behavior.
- One image: single static hero, byte-for-byte today's render.
- Two or more: slideshow.
- Reduced motion: only the first slide shows, static, no fade or zoom.
- The background is decorative behind the headline: the first slide keeps its alt; the rest are `aria-hidden` with empty alt. The h1 and subhead remain the accessible content, and `aria-labelledby` on the section is unchanged.

## Performance

- First slide: eager, `fetchpriority="high"`, `width={2400}`, `quality={70}` (identical to today's hero image), so the LCP is unchanged.
- Remaining slides: `loading="lazy"` and low priority, so they load after the LCP. The 3 second first hold gives the second image time to arrive before its fade.
- No layout shift: slides are absolutely positioned inside the fixed-height hero (`hero-fill` / min-height), so adding images does not move anything.

## Out of scope

- Slideshow on any page other than the home page.
- Manual controls (arrows, dots, pause button), per-slide captions, or per-slide overlays.
- Video slides or mixed media.
- Configurable timing or zoom intensity in Sanity (the timing is fixed in code, matching the approved feel).

## Verification

- `npm run typegen` clean, `npm run studio:deploy` succeeds, migration script runs and populates `heroImages[0]`.
- Visual check on the home page: one image (unchanged static hero), two or three images (slow cross-fade plus subtle Ken Burns), and reduced motion emulation (single static image). Check both light and dark themes and mobile (~375px) plus desktop (~1280px).
- Confirm the LCP is not regressed (the first image still loads eagerly and quickly; Lighthouse on `/`).

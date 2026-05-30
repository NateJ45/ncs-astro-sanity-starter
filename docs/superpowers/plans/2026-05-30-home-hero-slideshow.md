# Home Hero Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page hero optionally a slideshow of multiple images that slowly cross-fade with a subtle Ken Burns zoom; a single image renders the current static hero, and reduced-motion users always see one static image.

**Architecture:** Add a `heroImages` array to the `homePage` singleton (migrate the existing single image into it, hide the old field). Extract the hero background into a new `HeroBackground.astro` that renders either the single static image (today's behavior) or, for 2+ images, a stacked cross-fading slideshow driven by CSS plus a small inline script (matching the hero's existing inline-script pattern). The first slide stays the eager LCP image; the rest lazy-load.

**Tech Stack:** Astro 6 (static), Sanity v5 (schema + GROQ via `npm run typegen`), Tailwind v4, `SanityImage.astro`, `@sanity/client` for the migration script.

**Reference spec:** `docs/superpowers/specs/2026-05-30-home-hero-slideshow-design.md`

**Testing note:** This codebase has no unit-test harness for Astro components, Sanity schemas, or GROQ; verification is `npm run typegen`, the production build (`npm run build`), and visual checks in the browser (CLAUDE.md "Visual verification workflow"). The work is declarative schema plus presentational rendering with a small DOM timer, so each task verifies via typegen, a clean build, and browser inspection rather than failing unit tests.

**Note on em-dashes:** Per CLAUDE.md, em-dashes are only disallowed in public-facing site copy. The one piece of public copy here is the Sanity field `description` in Task 1, which must avoid them. Code comments and this plan are exempt.

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `studio/schemaTypes/homePage.ts` | Add `heroImages` array; hide the old `heroImage` |
| Create | `scripts/migrate-home-hero-images.mjs` | Copy existing `heroImage` into `heroImages[0]` |
| Modify | `src/lib/queries.ts` | Project `heroImages[]` in `getHomePage` |
| Create | `src/components/HeroBackground.astro` | Single image or cross-fading slideshow + overlays |
| Modify | `src/components/Hero.astro` | Use `HeroBackground`; accept `backgroundImages` |
| Modify | `src/pages/index.astro` | Pass `backgroundImages={page?.heroImages}` |
| Modify | `docs/agent/*.md` | Document the slideshow |

---

### Task 1: Add `heroImages` array to the home page schema; hide the old field

**Files:**
- Modify: `studio/schemaTypes/homePage.ts`

The `heroImage` field is defined in the `'hero'` group (around lines 54-63):

```js
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'hero',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
```

`defineField`, `defineType`, and `defineArrayMember` are already imported in this file (the `heroRotatingWords` array uses `defineArrayMember`).

- [ ] **Step 1: Hide the existing `heroImage` field**

Replace the `heroImage` field above with the same field plus `hidden: true` (data is preserved; it just disappears from the Studio form):

```js
    defineField({
      name: 'heroImage',
      title: 'Hero image (legacy)',
      type: 'image',
      group: 'hero',
      hidden: true,
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
```

- [ ] **Step 2: Add the `heroImages` array field**

Immediately after the (now hidden) `heroImage` field, add:

```js
    defineField({
      name: 'heroImages',
      title: 'Hero images',
      type: 'array',
      group: 'hero',
      description:
        'The home hero. Add one photo for a single static hero. Add two or more for a slow cross-fading slideshow with a subtle zoom. Drag to set the order they appear in.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
          ],
        }),
      ],
    }),
```

- [ ] **Step 3: Regenerate types**

Run: `npm run typegen`
Expected: completes without error; `src/lib/sanity.types.ts` now has `heroImages` on the `HomePage` type.

- [ ] **Step 4: Deploy the Studio**

Run: `npm run studio:deploy`
Expected: ends with `Success! Studio deployed to https://reid-design.sanity.studio/`. Required after any schema change (CLAUDE.md rule 1). (A version-mismatch warning is fine; only a hard error is a problem.)

- [ ] **Step 5: Commit**

```bash
git add studio/schemaTypes/homePage.ts src/lib/sanity.types.ts
git commit -m "feat: add homePage heroImages array and hide legacy heroImage"
```

---

### Task 2: Migration script to seed `heroImages` from the existing `heroImage`

**Files:**
- Create: `scripts/migrate-home-hero-images.mjs`

Mirrors the write-client setup in `scripts/patch-page-hero-images.mjs`.

- [ ] **Step 1: Create the script**

Create `scripts/migrate-home-hero-images.mjs`:

```js
// One-time migration: copy the home page's single heroImage into the new
// heroImages array so the hero looks identical after the slideshow ships.
// Idempotent: skips if heroImages already has entries. Run once after the
// schema deploy. Mirrors scripts/patch-page-hero-images.mjs.
//
// Run with: node scripts/migrate-home-hero-images.mjs

import { createClient } from '@sanity/client';
import { config as loadDotenv } from 'dotenv';
import { randomUUID } from 'node:crypto';

loadDotenv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const writeToken = (process.env.SANITY_API_WRITE_TOKEN ?? '').trim();

if (!projectId || !writeToken) {
  console.error('Need PUBLIC_SANITY_PROJECT_ID + SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-19',
  useCdn: false,
  token: writeToken,
});

const doc = await client.fetch(`*[_type == "homePage"][0]{ _id, heroImage, heroImages }`);
if (!doc) {
  console.error('! homePage singleton not found.');
  process.exit(1);
}

if (Array.isArray(doc.heroImages) && doc.heroImages.length > 0) {
  console.log('= homePage.heroImages already populated. Nothing to migrate.');
  process.exit(0);
}

if (!doc.heroImage?.asset?._ref) {
  console.log('= homePage has no heroImage to migrate. Nothing to do.');
  process.exit(0);
}

const slide = {
  _key: randomUUID().replace(/-/g, '').slice(0, 12),
  _type: 'image',
  asset: { _type: 'reference', _ref: doc.heroImage.asset._ref },
};
if (doc.heroImage.hotspot) slide.hotspot = doc.heroImage.hotspot;
if (doc.heroImage.crop) slide.crop = doc.heroImage.crop;
if (doc.heroImage.alt) slide.alt = doc.heroImage.alt;

try {
  await client.patch(doc._id).set({ heroImages: [slide] }).commit();
  console.log('✓ homePage.heroImages seeded from heroImage.');
} catch (err) {
  console.error('✗ migration failed:', err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run the migration**

Run: `node scripts/migrate-home-hero-images.mjs`
Expected: prints `✓ homePage.heroImages seeded from heroImage.` (or, if re-run, `= homePage.heroImages already populated.`). If it prints the env error, the `.env` is missing `SANITY_API_WRITE_TOKEN`; stop and report (do not hardcode a token).

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-home-hero-images.mjs
git commit -m "feat: add migration to seed homePage.heroImages from heroImage"
```

---

### Task 3: Project `heroImages` in `getHomePage`

**Files:**
- Modify: `src/lib/queries.ts`

`getHomePage` (around line 59) projects the hero fields. The relevant line is:

```
    heroImage${IMAGE_PROJECTION},
```

- [ ] **Step 1: Add the array projection**

In `getHomePage` only, add this line immediately AFTER the `heroImage${IMAGE_PROJECTION},` line:

```
    heroImages[]${IMAGE_PROJECTION},
```

Result:

```
    heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroImages[]${IMAGE_PROJECTION},
    heroPrimaryCta${CTA_PROJECTION},
```

Do not touch any other query (only `getHomePage` gets a slideshow).

- [ ] **Step 2: Regenerate types and build**

Run: `npm run typegen`
Expected: clean.

Run: `npm run build`
Expected: completes with no TypeScript or Astro errors (the home page still renders from `heroImage` until Task 4 wires the array).

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts src/lib/sanity.types.ts
git commit -m "feat: project heroImages in getHomePage"
```

---

### Task 4: Render the slideshow (`HeroBackground.astro`) and wire it into `Hero.astro` + `index.astro`

**Files:**
- Create: `src/components/HeroBackground.astro`
- Modify: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `HeroBackground.astro`**

Create `src/components/HeroBackground.astro` with exactly:

```astro
---
// Safe to edit by hand
// The hero background layer. With 0-1 images it renders a single static photo
// exactly as the hero always has. With 2+ images it renders a slow cross-fading
// slideshow with a subtle Ken Burns zoom, driven by CSS plus a small inline
// script (the same pattern the hero already uses for its other scripts).
//
// The first slide is the LCP image (eager + high priority) and carries its alt,
// like the single-image hero; the additional slides use empty alt so they are
// decorative. Reduced-motion users get a single static image (the script never
// starts and the CSS animation/transition is disabled).

import SanityImage from '@/components/SanityImage.astro';

interface SanityImageObject {
  asset?: { _ref?: string; _id?: string };
  alt?: string;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
}

interface Props {
  images: SanityImageObject[];
}

const { images } = Astro.props as Props;
const slides = (images ?? []).filter((img) => !!img?.asset);
const isSlideshow = slides.length >= 2;
const first = slides[0];
---

{first && (
  <>
    {isSlideshow ? (
      <div class="hero-slideshow" data-hero-slideshow>
        {slides.map((img, i) => (
          <SanityImage
            source={img}
            width={2400}
            sizes="100vw"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchpriority={i === 0 ? 'high' : 'low'}
            quality={70}
            alt={i === 0 ? undefined : ''}
            class={`hero-slide${i === 0 ? ' is-active' : ''}`}
          />
        ))}
      </div>
    ) : (
      <SanityImage
        source={first}
        width={2400}
        sizes="100vw"
        loading="eager"
        fetchpriority="high"
        quality={70}
        class="absolute inset-0 w-full h-full object-cover"
      />
    )}

    {/* Uniform overlay — minimum readability across the whole image. */}
    <div class="absolute inset-0 bg-accent-dark/25" aria-hidden="true"></div>
    {/* Bottom-weighted gradient — extra darkening behind the text area. */}
    <div
      class="absolute inset-0 bg-gradient-to-t from-accent-dark/85 via-accent-dark/45 to-transparent"
      aria-hidden="true"
    ></div>
  </>
)}

{isSlideshow && (
  <script is:inline>
    (function () {
      function initHeroSlideshow() {
        var box = document.querySelector('[data-hero-slideshow]');
        if (!box || box.dataset.wired === '1') return;
        var slides = box.querySelectorAll('.hero-slide');
        if (slides.length < 2) return;
        var reduce = false;
        try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
        if (reduce) return; // first slide stays visible, no motion
        box.dataset.wired = '1';

        var current = 0;
        var STEP_MS = 4500; // 3s hold + 1.5s cross-fade
        var timer = null;

        function advance() {
          slides[current].classList.remove('is-active');
          current = (current + 1) % slides.length;
          slides[current].classList.add('is-active');
        }
        function start() { if (!timer) timer = setInterval(advance, STEP_MS); }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }

        start();
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) stop(); else start();
        });
      }
      initHeroSlideshow();
      document.addEventListener('astro:page-load', initHeroSlideshow);
    })();
  </script>
)}

<style>
  .hero-slideshow { position: absolute; inset: 0; }
  .hero-slide {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 1.5s ease;
    /* Continuous, gentle Ken Burns. Alternate keeps it from snapping when a
       slide goes inactive mid-zoom. Varied origin/duration per slide reads
       organic rather than mechanical. */
    transform-origin: center;
    animation: hero-kb 16s ease-in-out infinite alternate;
    will-change: opacity, transform;
  }
  .hero-slide.is-active { opacity: 1; }
  .hero-slide:nth-child(3n + 2) { transform-origin: top left; animation-duration: 18s; }
  .hero-slide:nth-child(3n + 3) { transform-origin: bottom right; animation-duration: 20s; }
  @keyframes hero-kb {
    from { transform: scale(1); }
    to   { transform: scale(1.07); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-slide { transition: none; animation: none; transform: none; }
  }
</style>
```

- [ ] **Step 2: Import `HeroBackground` in `Hero.astro`**

Find:

```astro
import SanityImage from '@/components/SanityImage.astro';
import CtaLink from '@/components/CtaLink.astro';
```

Replace with:

```astro
import SanityImage from '@/components/SanityImage.astro';
import HeroBackground from '@/components/HeroBackground.astro';
import CtaLink from '@/components/CtaLink.astro';
```

- [ ] **Step 3: Add the `backgroundImages` prop to the interface**

Find:

```astro
  backgroundImage?: SanityImageObject | null;
  primaryCta?: CtaBlock | null;
```

Replace with:

```astro
  backgroundImage?: SanityImageObject | null;
  /** Optional list of hero images. 2+ render a cross-fading slideshow; 1 (or
      falling back to backgroundImage) renders a single static image. */
  backgroundImages?: SanityImageObject[] | null;
  primaryCta?: CtaBlock | null;
```

- [ ] **Step 4: Destructure the prop and compute the effective image list**

Find:

```astro
  backgroundImage,
  primaryCta,
```

Replace with:

```astro
  backgroundImage,
  backgroundImages,
  primaryCta,
```

Then find:

```astro
const hasImage = !!backgroundImage?.asset;
```

Replace with:

```astro
// Prefer the slideshow array; fall back to the single backgroundImage so every
// other page (which only passes backgroundImage) is unaffected.
const heroImageList = (Array.isArray(backgroundImages) ? backgroundImages : []).filter(
  (img) => !!img?.asset,
);
const effectiveImages = heroImageList.length > 0
  ? heroImageList
  : (backgroundImage?.asset ? [backgroundImage] : []);
const hasImage = effectiveImages.length > 0;
```

- [ ] **Step 5: Replace the inline background + overlays with `<HeroBackground>`**

Find:

```astro
    {/* Background image — eager loaded; two layered overlays handle readability.
        fetchpriority="high" tells the browser this is the LCP image so it
        races to the front of the network queue ahead of other resources. */}
    <SanityImage
      source={backgroundImage}
      width={2400}
      sizes="100vw"
      loading="eager"
      fetchpriority="high"
      quality={70}
      class="absolute inset-0 w-full h-full object-cover"
    />
    {/* Uniform overlay — guarantees minimum readability across the whole image. */}
    <div class="absolute inset-0 bg-accent-dark/25" aria-hidden="true"></div>
    {/* Bottom-weighted gradient — adds extra darkening behind the text area at the bottom. */}
    <div
      class="absolute inset-0 bg-gradient-to-t from-accent-dark/85 via-accent-dark/45 to-transparent"
      aria-hidden="true"
    ></div>
```

Replace with:

```astro
    {/* Background — single static image or a cross-fading slideshow (2+ images),
        plus the readability overlays. See HeroBackground.astro. */}
    <HeroBackground images={effectiveImages} />
```

- [ ] **Step 6: Pass `backgroundImages` from `index.astro`**

In `src/pages/index.astro`, find:

```astro
    backgroundImage={page?.heroImage}
```

Replace with:

```astro
    backgroundImage={page?.heroImage}
    backgroundImages={page?.heroImages}
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: completes with no TypeScript or Astro errors (all routes prerender). With one image in `heroImages` (from the migration), the home hero renders a single static image; other pages are unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/components/HeroBackground.astro src/components/Hero.astro src/pages/index.astro
git commit -m "feat: render optional cross-fading slideshow in the home hero"
```

---

### Task 5: Visual verification and tuning

**Files:**
- Modify (only if tuning is needed): `src/components/HeroBackground.astro`

Verify the slideshow, the single-image fallback, and reduced motion in the browser. The dev server is started with the preview tooling (`npm run dev`, port 4321).

- [ ] **Step 1: Verify the single-image case is unchanged**

Start the dev server and open `http://localhost:4321/`. With one image in `heroImages` (post-migration), the hero must look identical to before: one static photo, the two overlays, no motion. Check light and dark themes.

Expected: no visual change from the prior hero; no console errors.

- [ ] **Step 2: Verify the slideshow with multiple images**

Temporarily pass extra images to exercise the slideshow without writing to the dataset. In `src/pages/index.astro`, temporarily change:

```astro
    backgroundImages={page?.heroImages}
```

to (reusing existing home-page images so there are 3 distinct slides):

```astro
    backgroundImages={[page?.heroImage, page?.meetStaciPhoto, page?.heroImage].filter(Boolean)}
```

Reload `http://localhost:4321/`. Watch a full loop.

Expected: slides cross-fade slowly (about 3s hold, 1.5s fade), each drifts with a subtle zoom, the headline/subhead/CTAs stay readable over the motion, the bronze-free dark overlays keep contrast, and the loop is seamless. Check desktop (~1280px) and mobile (~375px), light and dark.

- [ ] **Step 3: Verify reduced motion**

In Chrome DevTools, Rendering panel, set "Emulate CSS prefers-reduced-motion: reduce", and reload.

Expected: a single static image (the first slide), no fade, no zoom, no errors.

- [ ] **Step 4: Tune if needed**

If the zoom feels too strong or too weak, adjust the `to { transform: scale(1.07); }` value in `HeroBackground.astro` (try `1.05` gentler or `1.09` stronger). If the drift feels too fast/slow, adjust the `animation-duration` values (16s/18s/20s). The hold/fade cadence (`STEP_MS` 4500 and the `1.5s` opacity transition) was approved in the demo; only change it if explicitly desired.

- [ ] **Step 5: Revert the temporary test change**

Restore `src/pages/index.astro` to:

```astro
    backgroundImages={page?.heroImages}
```

Confirm `git status` shows `index.astro` clean (no diff) after the revert.

- [ ] **Step 6: Commit any tuning**

Only if you changed values in `HeroBackground.astro` in Step 4:

```bash
git add src/components/HeroBackground.astro
git commit -m "fix: tune home hero slideshow zoom and timing"
```

If no tuning was needed, skip this commit.

---

### Task 6: Document the slideshow

**Files:**
- Modify: `docs/agent/polish-layer.md`
- Modify: `docs/agent/components.md`
- Modify: `docs/agent/sanity.md`
- Modify: `docs/agent/changelog.md`

- [ ] **Step 1: Add a `polish-layer.md` section**

In `docs/agent/polish-layer.md`, after the "Full-viewport home hero + scroll cue" section, add:

```markdown
### Home hero slideshow (`HeroBackground.astro`)

The home hero can be a single static image (default) or a slideshow. `homePage.heroImages` is an array: one image renders the static hero, two or more render a slow cross-fading slideshow with a subtle Ken Burns zoom. `HeroBackground.astro` owns the background layer (single image vs. stacked slides plus the two readability overlays). Each slide is `position: absolute`, `opacity 0` with a `1.5s` opacity transition; the active slide is `opacity 1` and all slides run a gentle continuous `scale(1) -> scale(1.07)` zoom (alternating, varied origin/duration). A small `<script is:inline>` advances the active slide every 4500ms (3s hold + 1.5s fade), pauses when the tab is hidden, re-inits on `astro:page-load`, and never starts under `prefers-reduced-motion`. The first slide stays the eager `fetchpriority="high"` LCP image; the rest lazy-load. Reduced-motion users always see the first slide, static. The first slide carries its alt (like the single-image hero); the additional slides use empty alt so they are decorative.
```

- [ ] **Step 2: Add `components.md` entries**

In `docs/agent/components.md`, in the "Hero + page-top" list, update the `Hero.astro` bullet to note the new prop and add a `HeroBackground.astro` bullet right after it:

Find:

```markdown
- `Hero.astro` — image variant (full-bleed photo + gradient overlay) OR text variant (delegates to SectionHeading). Accepts `rotatingWords?: string[]` for a once-per-session H1 first-word swap. Image variant passes `onDark` to its CTAs automatically. On the homepage (`size="tall"`) it fills the viewport below the sticky header and shows a soft pulsing scroll cue (see Polish layer).
```

Replace with:

```markdown
- `Hero.astro` — image variant (full-bleed photo + gradient overlay) OR text variant (delegates to SectionHeading). Accepts `rotatingWords?: string[]` for a once-per-session H1 first-word swap, and `backgroundImages?: SanityImageObject[]` for the home hero slideshow (falls back to the single `backgroundImage` for every other page). Image variant passes `onDark` to its CTAs automatically. On the homepage (`size="tall"`) it fills the viewport below the sticky header and shows a soft pulsing scroll cue (see Polish layer).
- `HeroBackground.astro` — the hero background layer. Renders a single static `SanityImage` (today's behavior) for 0-1 images, or a cross-fading Ken Burns slideshow for 2+ (see Polish layer → Home hero slideshow). Owns the two readability overlays. Used only by `Hero.astro`.
```

- [ ] **Step 3: Add a `sanity.md` note**

In `docs/agent/sanity.md`, find the page-singletons bullet that begins "`homePage`, `aboutPage`, ... All seven page-hero variants now accept a `heroImage` field". Add a new bullet immediately after it:

```markdown
- `homePage` additionally has a `heroImages` array (images with optional alt). One image renders the static hero; two or more render a cross-fading slideshow (`HeroBackground.astro`). It supersedes the home page's single `heroImage`, which is migrated into `heroImages[0]` by `scripts/migrate-home-hero-images.mjs` and then hidden in the Studio (data preserved, used only as a fallback). Projected as `heroImages[]` in `getHomePage`. Slideshow is home-only; other pages keep their single `heroImage`.
```

- [ ] **Step 4: Prepend a `changelog.md` entry**

In `docs/agent/changelog.md`, in the current `*Last updated: ...*` entry, insert this sentence immediately before the `Earlier:` marker that precedes the older history:

```
Home hero can now be a slideshow: new `homePage.heroImages` array (one image = static hero as before, two or more = a slow cross-fading slideshow with a subtle Ken Burns zoom), rendered by the new `HeroBackground.astro` via CSS + a small inline script (3s hold, 1.5s fade, pauses when the tab is hidden, off under reduced motion); first slide stays the eager LCP image, the rest lazy-load; the legacy single `heroImage` is migrated into `heroImages[0]` and hidden. 
```

- [ ] **Step 5: Commit**

```bash
git add docs/agent/polish-layer.md docs/agent/components.md docs/agent/sanity.md docs/agent/changelog.md
git commit -m "docs: document the home hero slideshow"
```

---

## Done criteria

- `homePage.heroImages` exists, the Studio is deployed, the old `heroImage` is hidden, and the migration populated `heroImages[0]`.
- `getHomePage` projects `heroImages[]`; `HeroBackground.astro` renders single-image (unchanged) or the slideshow; `Hero.astro` and `index.astro` are wired.
- With one image the hero is byte-for-byte today's static hero; with 2+ it cross-fades with a subtle zoom; reduced motion shows one static image; the LCP image still loads eagerly.
- Docs updated. All changes committed.

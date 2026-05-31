# Image handling

> Local asset pipeline, Sanity-hosted image handling, orientation caps, hotspot/crop, and editor upload guidelines.

## Image handling

The starter has two image sources, each with its own pipeline:

1. **Local assets** -- files committed to the repo. Optimized by Astro's `<Image>` / `getImage()` at build time (Sharp under the hood). Output is content-hashed WebP/AVIF in `/_astro/`.
2. **Sanity-hosted images** -- uploaded by editors. Optimized on the fly by Sanity's CDN (`cdn.sanity.io`) at request time. The `<SanityImage />` wrapper builds the URL with the right transform params and srcset.

The two pipelines never mix. Don't reach for Astro `<Image>` on a Sanity URL -- `image.domains` in `astro.config.mjs` is intentionally NOT configured, because Sanity's CDN is already excellent and there is no need to pay the build-time hit of pulling every remote image through Sharp.

### Local assets (`src/assets/`)

Files live in `src/assets/` (NOT `public/`). The `src/assets/` location is what lets Astro's pipeline see them.

- **Logo**: `logo-light.png` + `logo-dark.png`. Astro's `<Image>` (in `Footer.astro`) or `getImage()` (in `Header.astro`, for the theme-aware `<img>` data-attribute URLs) emits hashed WebPs at the right dimensions. See the theme-aware single-img logo pattern in `docs/agent/theme-and-color.md`.
- **Regenerating logos**: after swapping in a project logo, run `scripts/optimize-logo-files.mjs` to shrink the source PNGs to 400 px tall before Astro emits them (large source = large Astro output).

### Sanity-hosted images (everything from Studio)

`src/components/SanityImage.astro` is the wrapper. Reads the Sanity image object (asset ref + alt text + optional hotspot/crop), builds the URL via Sanity's `image()` builder, and renders an `<img>` with a real responsive srcset.

**Always pull alt text from the Sanity image field**, not from page-level fields. Editors set alt text once on the image and it carries everywhere the image is used.

**Props:**
- `width` (required) -- maximum width the image will ever render at. Caps the srcset ladder. Don't request larger than the slot displays at -- that's wasted bytes.
- `height` (optional) -- only set when you need a specific aspect-ratio crop. Otherwise the wrapper derives height from the asset's intrinsic dimensions via `parseSanityAssetDimensions()` and writes both width + height to the `<img>` (kills CLS).
- `sizes` (recommended) -- the `sizes` attribute. If omitted, defaults to `(max-width: {width}px) 100vw, {width}px`. Pass an accurate value for layouts where the image doesn't fill the viewport on mobile (e.g., a 2-column layout would want `(min-width: 768px) 45vw, 100vw`).
- `quality` (default 75) -- drop to 65 for big hero photos where every byte matters more than micro-detail.
- `format` (default `'auto'`) -- Sanity serves AVIF on supporting browsers (~25% smaller than WebP), WebP elsewhere, JPEG as final fallback. Force `'webp'` only if you have a specific reason to bypass AVIF.
- `loading` (default `'lazy'`) -- set to `'eager'` for above-the-fold hero images.
- `fetchpriority` -- pass `"high"` on the page's LCP image so the browser fetches it ahead of other resources. `Hero.astro` does this on the eager background image.

**Responsive srcset ladder** (hardcoded in `SanityImage.astro`):
```
[400, 600, 700, 800, 900, 1200, 1600, 2400]
```
Each entry is a width. The wrapper filters this down to entries <= requested `width` and always includes the explicit `width` as the largest. The 700 entry closes the mobile-retina gap (DPR 1.875 needs ~713 effective px) -- without it, mobile rounds up to 800 unnecessarily.

**Hotspot and crop.** Enable `hotspot: true` on every Sanity image field. Editors can then click to set the focal point, and the URL builder passes that hotspot to Sanity so crops at smaller sizes keep the right part of the image in frame. Faces, key visual elements, anything that matters when the image gets cropped down.

### Portrait orientation caps

The journal inline image block detects orientation from the Sanity asset `_ref` (it encodes `{W}x{H}` in the filename) via `parseSanityAssetDimensions()`. When `height > width`:

- `JournalPortableText.tsx` (`inlineImage` block): figure wrapper becomes `my-section-md mx-auto max-w-[600px]`. Landscape shots get the editor's chosen size treatment.

Why: portrait shots blown out to full column width are taller than the viewport, which is hostile. ~600 px is the readable inset for an editorial portrait.

If the starter is extended with a case-study or portfolio detail page, apply the same orientation cap in its Portable Text renderer -- the same `parseSanityAssetDimensions()` helper handles the detection.

### Hero/cover image cap

The journal (`/journal/[slug]`) detail page caps its hero image at `max-w-4xl` (~896 px), with `<SanityImage width={1800}>` and `sizes="(min-width: 920px) 896px, 100vw"`. Reads as an editorial feature, not a billboard. The Sanity request stops at 1800 so the site isn't pulling a 1920 px file for a slot that maxes around 900 px even at 2x retina.

### Image guidelines for editors

When uploading images via Sanity:

- **Source size:** at least 2000 px on the longest edge for hero and feature images. Sanity downsizes; it cannot upsize without losing quality.
- **Format:** JPEG for photos (Sanity converts to AVIF/WebP on delivery), PNG for graphics with transparency, SVG for logos.
- **Color profile:** sRGB. Some cameras shoot Adobe RGB by default; convert before upload or browsers will shift the colors.
- **File size:** original up to 5 MB is fine. Sanity optimizes on the way out.
- **Alt text:** required on every image. Describe the image like a friend describing it to someone who cannot see it. Skip "Photo of..." or "Image of..." since screen readers already announce that.
- **Filename:** matters less than alt text but still matters. Upload `living-room-after.jpg` instead of `IMG_4827.jpg`. The Sanity asset filename is preserved in the CDN URL and contributes a small signal to image search.
- **Hotspot:** click the image after upload to set the focal point. The site crops around it at smaller sizes. Set it on faces, focal centerpieces, anything that matters at thumbnail size.

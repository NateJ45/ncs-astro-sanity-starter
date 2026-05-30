# Image handling

> Local asset pipeline, Sanity-hosted image handling, orientation caps, hotspot/crop, and editor upload guidelines.

## Image handling

Reid Design has two image sources, each with its own pipeline:

1. **Local assets** — files committed to the repo. Optimized by Astro's `<Image>` / `getImage()` at build time (Sharp under the hood). Output is content-hashed WebP/AVIF in `/_astro/`.
2. **Sanity-hosted images** — uploaded by editors. Optimized on the fly by Sanity's CDN (`cdn.sanity.io`) at request time. The `<SanityImage />` wrapper builds the URL with the right transform params and srcset.

The two pipelines never mix. Don't reach for Astro `<Image>` on a Sanity URL — `image.domains` in `astro.config.mjs` is intentionally NOT configured, because Sanity's CDN is already excellent and we don't want to pay the build-time hit of pulling every remote image through Sharp.

### Local assets (`src/assets/`)

Files live in `src/assets/` (NOT `public/`). The `src/assets/` location is what lets Astro's pipeline see them.

- **Logo**: `logo-light.png` + `logo-dark.png`. Both at 378×400 source. Astro's `<Image>` (in Footer.astro) or `getImage()` (in Header.astro, for the theme-aware `<img>` data-attribute URLs) emits hashed WebPs at the right dimensions. See the Theme-aware single-img logo pattern in the Theme system section.
- **Regenerating logos**: `scripts/generate-logo-variants.mjs` produces both variants from the source JPG in `09-Logos/`. After regeneration, run `scripts/optimize-logo-files.mjs` to shrink the source PNGs to ≤400 px tall before Astro emits them (large source = large Astro output).

### Sanity-hosted images (everything from Studio)

`src/components/SanityImage.astro` is the wrapper. Reads the Sanity image object (asset ref + alt text + optional hotspot/crop), builds the URL via Sanity's `image()` builder, and renders an `<img>` with a real responsive srcset.

**Always pull alt text from the Sanity image field**, not from page-level fields. Editors set alt text once on the image and it carries everywhere the image is used.

**Props:**
- `width` (required) — maximum width the image will ever render at. Caps the srcset ladder. Don't request larger than the slot displays at — that's wasted bytes.
- `height` (optional) — only set when you need a specific aspect-ratio crop. Otherwise the wrapper derives height from the asset's intrinsic dimensions via `parseSanityAssetDimensions()` and writes both width + height to the `<img>` (kills CLS).
- `sizes` (recommended) — the `sizes` attribute. If omitted, defaults to `(max-width: {width}px) 100vw, {width}px`. Pass an accurate value for layouts where the image doesn't fill the viewport on mobile (e.g., a 2-column layout would want `(min-width: 768px) 45vw, 100vw`).
- `quality` (default 75) — drop to 65 for big hero photos where every byte matters more than micro-detail.
- `format` (default `'auto'`) — Sanity serves AVIF on supporting browsers (~25% smaller than WebP), WebP elsewhere, JPEG as final fallback. Force `'webp'` only if you have a reason to bypass AVIF.
- `loading` (default `'lazy'`) — set to `'eager'` for above-the-fold hero images.
- `fetchpriority` — pass `"high"` on the page's LCP image so the browser fetches it ahead of other resources. Hero.astro does this on the eager background image.

**Responsive srcset ladder** (hardcoded in SanityImage.astro):
```
[400, 600, 700, 800, 900, 1200, 1600, 2400]
```
Each entry is a width. The wrapper filters this down to entries ≤ requested `width` and always includes the explicit `width` as the largest. The mobile-retina gap (DPR 1.875 needs ~713 effective px) is what motivated the 700 entry — without it, mobile would round up to 800 unnecessarily.

**Hotspot and crop.** Enable `hotspot: true` on every Sanity image field. Staci can then click to set the focal point, and the URL builder passes that hotspot to Sanity so crops at smaller sizes keep the right part of the image in frame. Faces, key visual elements, anything that matters when the image gets cropped down.

For project galleries (case studies), pass the Sanity image array to `ProjectGallery.tsx`, which composes `react-photo-album` for the justified grid and `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer.

For before/after pairs on project pages, use `BeforeAfterSlider.tsx` (React island). It accepts two Sanity image references and renders a drag-handle slider that reveals the after image as the user drags.

### Portrait orientation caps

Portfolio + journal inline images detect orientation from the Sanity asset `_ref` (it encodes `{W}x{H}` in the filename) via `parseSanityAssetDimensions()`. When `height > width`:

- `PortableText.tsx` (`image` block, case-study intro story): figure wrapper becomes `my-section-md mx-auto max-w-[600px]`. Landscape shots keep the original `-mx-m md:mx-0` (full column, edge-to-edge on mobile).
- `JournalPortableText.tsx` (`inlineImage` block): same `mx-auto max-w-[600px]`, overrides the editor's `standard`/`wide`/`full` size choice. Landscape shots get the chosen size treatment.

Why: portrait shots blown out to full column width are taller than the viewport, which is hostile. ~600 px is the readable inset for an editorial portrait.

### Hero / cover image cap

The portfolio (`/portfolio/[slug]`) and journal (`/journal/[slug]`) detail pages cap their hero image at `max-w-4xl` (~896 px), with `<SanityImage width={1800}>` and `sizes="(min-width: 920px) 896px, 100vw"`. Reads as an editorial feature, not a billboard. Sanity request stops at 1800 so we're not pulling a 1920 px file for a slot that maxes around 900 px even at 2× retina.

### Image guidelines for editors

When Staci uploads images via Sanity:

- **Source size:** at least 2000px on the longest edge for hero and project images. Sanity downsizes; it can't upsize without losing quality.
- **Format:** JPEG for photos (Sanity converts to AVIF/WebP on delivery), PNG for graphics with transparency, SVG for logos.
- **Color profile:** sRGB. Some pro cameras shoot Adobe RGB by default; convert before upload or browsers will shift the colors.
- **File size:** original up to 5MB is fine. Sanity optimizes on the way out.
- **Alt text:** required on every image. Describe the image like a friend describing it to someone who can't see. Include location if relevant ("Living room redesign in Fishers, Indiana"). Skip "Photo of..." or "Image of..." since screen readers already announce that.
- **Filename:** matters less than alt text but still matters. Upload `fishers-living-room-after.jpg` instead of `IMG_4827.jpg`. The Sanity asset filename is preserved in the CDN URL and contributes a tiny bit to image search.
- **Hotspot:** click the image after upload to set the focal point. The site crops around it at smaller sizes. Set it on faces, lamp focal points, sofa centerpieces, anything that matters at thumbnail size.

For project before/after pairs: shoot from the same angle, same lens, same lighting, ideally same time of day. The slider only works when the geometry matches. If they don't, use a captioned pair in the `gallery` array instead of the before/after slider.

### Hotspot and crop

Enable `hotspot: true` on every Sanity image field. Staci can then click to set the focal point, and the `<SanityImage />` wrapper passes that hotspot to the URL builder so crops at smaller sizes keep the right part of the image in frame. Faces, key visual elements, anything that matters when the image gets cropped down.

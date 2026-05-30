# SEO

> BaseLayout foundation, JSON-LD schemas, Google Business Profile, internal linking, image SEO, and the pre-launch checklist.

## SEO

Reid Design competes on local search ("Plainfield interior designer", "Indianapolis interior design", "interior designer near me" from a Plainfield IP). Every SEO decision passes the local-search lens.

### Foundation (BaseLayout, every page)

- `<title>` — unique per page, 50–60 characters, brand name as suffix ("Services — Reid Design LLC"). Pulled from the page singleton's `seoTitle` field, falls back to the page's primary headline.
- `<meta name="description">` — unique per page, 150–160 characters, written as a sentence a human would click. Pulled from `seoDescription`. No marketing puffery, match the on-page voice.
- `<link rel="canonical">` — absolute URL computed from `Astro.url.pathname` + `site.url`. Prevents the workers.dev URL and the staging domain from competing with reiddesignllc.com once DNS cuts over.
- Open Graph + Twitter meta — set in BaseLayout. The OG image resolves in priority order: (1) the `ogImage` prop a page passes (project/journal detail pages pass their real hero/cover photo, served from cdn.sanity.io); (2) the page singleton's `seoImage` field — a per-page override Staci sets in that page's SEO section; (3) `siteSettings.seoImage` — the site-wide default social image Staci sets in Site Settings; (4) the auto-generated branded card at `/og/<route>.png` (from `npm run og:pages`); (5) `og-default.png`. Sanity images (2 and 3) run through `urlFor().width(1200).height(630).fit('crop')` via the `ogUrlFromImage` helper. BaseLayout also emits `og:locale`, `og:image:alt`, and a theme-aware `theme-color`.
- `<html lang="en">`.

### JSON-LD schemas

Every page receives a relevant structured data block via the `schemas` prop on BaseLayout. The site-wide LocalBusiness schema renders on every page; per-page schemas add to it.

**Site-wide LocalBusiness (template):**

```json
{
  "@context": "https://schema.org",
  "@type": "InteriorDesigner",
  "@id": "https://reiddesignllc.com/#business",
  "name": "Reid Design LLC",
  "url": "https://reiddesignllc.com",
  "image": "https://reiddesignllc.com/og-default.png",
  "telephone": "+1-XXX-XXX-XXXX",
  "email": "owner@example.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Plainfield",
    "addressRegion": "IN",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 39.7042,
    "longitude": -86.3994
  },
  "areaServed": [
    { "@type": "City", "name": "Plainfield" },
    { "@type": "City", "name": "Indianapolis" },
    { "@type": "City", "name": "Carmel" },
    { "@type": "City", "name": "Fishers" },
    { "@type": "City", "name": "Westfield" },
    { "@type": "City", "name": "Zionsville" },
    { "@type": "City", "name": "Noblesville" }
  ],
  "priceRange": "$$",
  "sameAs": [
    "https://www.instagram.com/reiddesignin/",
    "https://www.facebook.com/ReidDesignLLC"
  ]
}
```

Source the values from `siteSettings`. The `address`, `telephone`, and `geo` MUST match Google Business Profile exactly — Google compares them for NAP (Name/Address/Phone) consistency, and a mismatch tanks local ranking.

**Per-page schemas to add:**

- `/services` — array of `Service` schemas, one per active `service` document, each with `provider` referencing the LocalBusiness `@id`.
- `/faq` — `FAQPage` schema with each Q/A as `Question` and `acceptedAnswer`.
- `/portfolio/[slug]` (post-launch) — `CreativeWork` schema for the project.
- Every internal page — `BreadcrumbList` from `/` to the current page.

Test every schema with Google's Rich Results Test (https://search.google.com/test/rich-results) before launch. Errors at scale will tank rankings rather than fail loudly.

### Google Business Profile

A complete GBP listing is the single biggest local-SEO lever for a Plainfield service business. The site supports the listing but doesn't replace it. Confirm at launch:
- Business name exactly "Reid Design LLC" (matches the site's NAP)
- Address, phone, hours match `siteSettings`
- Service area set to the same cities listed in `siteSettings.serviceAreas`
- Primary category: "Interior Designer"
- Photos uploaded (different shots from the site's hero/portfolio)
- Posts active (at least one per quarter)

If GBP and the site disagree on phone, address, or hours, Google treats the site as suspect. Make `siteSettings` the source of truth and reflect it in GBP.

### Internal linking strategy

Plainfield-first means Plainfield gets named in:
- The home hero eyebrow
- The footer service area list (first item)
- The OG description
- The contact page's geographic copy
- At least one inline link from each major page back to home using "Plainfield interior design" anchor text where it reads naturally

Other cities appear in the service-area list and (optionally) in case-study geo tags. Don't keyword-stuff city names into body copy — Google detects it and Staci's voice rejects it. One mention per page is plenty.

### Image SEO

For Sanity-uploaded images, the alt text field does double duty: accessibility (required) and SEO (ranked in image search). Good alt text describes the image AND uses relevant terms where natural. "Living room redesign in Fishers, Indiana" beats "Living room" and waaaay beats empty alt.

See the [Image guidelines for editors](#image-guidelines-for-editors) section above for filename, format, and color profile rules.

### Title and description rules

- Every Sanity page singleton has `seoTitle` and `seoDescription` fields. They MUST be unique across pages.
- Title: target 50–60 characters. Front-load the keyword (location or service).
- Description: target 150–160 characters. Speak to the reader, not the search engine. Don't restate the title.
- If `seoTitle` is empty, BaseLayout falls back to the page's primary headline. Don't rely on the fallback for launch — fill the field.

### Sitemap and robots

`@astrojs/sitemap` generates `sitemap-index.xml` + `sitemap-0.xml` automatically from every prerendered page on `astro build`. The default `<priority>` and `<changefreq>` are fine for a marketing site of this size.

`public/robots.txt` ships with the build (allow-all):

```
User-agent: *
Allow: /

Sitemap: https://reiddesignllc.com/sitemap-index.xml
```

`public/llms.txt` also ships — an AI/LLM crawler index of the site for tools that follow the emerging llms.txt convention. Keep it updated if major pages are added or removed.

After DNS cutover, submit `sitemap-index.xml` to Google Search Console. Verify the property via DNS TXT record (preferred — survives redeploys) or HTML file upload.

### Pre-launch SEO checklist

- [ ] Every page has unique `seoTitle` and `seoDescription` in Sanity
- [ ] LocalBusiness JSON-LD validates in Google Rich Results Test
- [ ] FAQPage JSON-LD validates
- [ ] Service schemas validate
- [ ] BreadcrumbList present on every internal page
- [ ] OG previews look right in Slack, Twitter, Facebook (verify with opengraph.xyz or similar)
- [ ] Google Business Profile NAP matches `siteSettings` NAP exactly
- [ ] All Sanity image alt text is meaningful (no "image1" placeholders, no empty strings)
- [ ] Sitemap submitted to Google Search Console
- [ ] `robots.txt` ships (allow-all + sitemap reference)
- [ ] `llms.txt` is accurate for current page set
- [ ] Canonical URL points at the production domain on every page

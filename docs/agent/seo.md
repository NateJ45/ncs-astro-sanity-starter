# SEO

> BaseLayout foundation, JSON-LD schemas, robots.txt, llms.txt, sitemap, OG generation, and pre-launch checklist.

## SEO

### Foundation (BaseLayout, every page)

- `<title>` -- unique per page, 50-60 characters, brand name as suffix ("Services -- Studio Starter"). Pulled from the page singleton's `seoTitle` field, falls back to the page's primary headline.
- `<meta name="description">` -- unique per page, 150-160 characters, written as a sentence a human would click. Pulled from `seoDescription`. No marketing puffery; match the on-page voice.
- `<link rel="canonical">` -- absolute URL computed from `Astro.url.pathname` + `site.domain`. Prevents a workers.dev URL or staging domain from competing with the production domain once DNS cuts over. Not emitted on a noindex page (404, `/search/`, a hidden page): "do not index" and "index this address" contradict each other (card 159).
- Open Graph + Twitter meta -- set in BaseLayout. The OG image resolves in priority order (`src/lib/og-card-marker.ts`, PORTS.md card 169): (1) the `ogImage` prop a page passes (detail pages pass their real hero/cover photo, served from cdn.sanity.io); (2) the page singleton's `seoImage` field -- a per-page override set in the page's SEO section in Studio; (3) the branded card drawn at build time at `/og/<route>.jpg?v=<hash>` (every prerendered page; see "Share images" below); (4) `siteSettings.seoImage`, now only for pages rendered on request (password pages); (5) `og-default.png`. Sanity images (2 and 4) run through `urlFor().width(1200).height(630).fit('crop').format('jpg').quality(80)` (JPEG, because some link scrapers skip WebP; card 159) via the `ogUrlFromImage` helper. BaseLayout also emits `og:locale`, `og:image:alt`, and a theme-aware `theme-color`.
- `<html lang="en">`. Update this if the site ships in another language.

**Share images make themselves (PORTS.md card 169).** Nothing is committed per page and there is nothing to remember after a title changes or a page is added:

1. BaseLayout decides each page's share image (order above). For the card it writes an `x-og-card` marker in the head (base64url JSON: title, kicker, home). Pages say their words through the `ogCard` prop: `{ kicker }` (a section or a date), `{ title }`, `{ home: true }` (Home: the site name with the Site settings tagline).
2. `scripts/build-og-cards.mjs` (PORTABLE, in `npm run build` after the icon step) reads every marker in `dist/client`, draws the card as a JPEG into `dist/client/og/`, adds `?v=<hash>` to og:image so Facebook and text apps fetch a changed card, and removes the marker. The pure half (marker, rewrite, fallback) is `scripts/lib/og-build.mjs`, unit tested.
3. Each card is cached by a hash of its full HTML in `node_modules/.cache/og-cards`, restored between CI and deploy runs by `actions/cache`, so only a new or changed card launches a browser.
4. The browser is Playwright's Chromium when installed, else the machine's Chrome or Edge (a GitHub runner's Chrome). With none, or a card that fails, those pages share `og-default.png` with a warning: the build never fails for a card. No Sanity project still draws every card; only the Studio icon (card 168) is skipped.

**The design is the site's own file.** `scripts/lib/og-card.mjs` exports `cardHtml`, `renderHtml` and `closeCards`. The starter's version is the generic card from `scripts/lib/render-og.mjs` (PORTABLE: `ogCardHtml`, `renderOgHtml`) in `scripts/og-theme.mjs`'s colors and face, with the `brand.config.json` name as the wordmark, the page title under it, an optional kicker and, when Site settings has a square icon, the icon above. A site with its own card design (first-baptist-auburn) replaces `og-card.mjs` and keeps the three exports.

**OG regeneration is a per-project step.** The `og-default.png` committed in the starter is a placeholder. Run `npm run og` after updating the brand inputs in `scripts/generate-og-default.mjs` (brand colors, tagline, wordmark) to regenerate it for the actual project.

**llms.txt regeneration is also per-project.** `public/llms.txt` ships as an AI/LLM crawler index for the core routes. Update it when pages are added or removed, and review it before launch to make sure it describes the actual project.

### JSON-LD schemas (via `StructuredData.astro`)

Every page receives a relevant structured data block via the `schemas` prop on BaseLayout. The site-wide LocalBusiness schema renders on every page; per-page schemas add to it.

**Site-wide LocalBusiness (configure per project):**

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#business",
  "name": "Your Business Name",
  "url": "https://example.com",
  "image": "https://example.com/og-default.png",
  "telephone": "+1-XXX-XXX-XXXX",
  "email": "hello@example.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Your City",
    "addressRegion": "ST",
    "addressCountry": "US"
  },
  "priceRange": "$$",
  "sameAs": []
}
```

Source the values from `siteSettings`. The `address`, `telephone`, and any Google Business Profile data MUST match exactly -- Google compares them for NAP (Name/Address/Phone) consistency, and a mismatch hurts local ranking.

**Per-page schemas to consider:**

- `/services` -- array of `Service` schemas, one per active `service` document, each with `provider` referencing the LocalBusiness `@id`.
- `/faq` -- `FAQPage` schema with each Q/A as `Question` and `acceptedAnswer`.
- Every internal page -- `BreadcrumbList` from `/` to the current page.

Test every schema with Google's Rich Results Test (https://search.google.com/test/rich-results) before launch. Errors at scale will suppress rich results without loud failures.

### Sitemap and robots

`@astrojs/sitemap` generates `sitemap-index.xml` + `sitemap-0.xml` automatically from every prerendered page on `astro build`. The default `<priority>` and `<changefreq>` values are fine for a marketing site of this size.

`robots.txt` is generated at build time by `src/pages/robots.txt.ts`. It reads the production URL from `src/data/site.ts` and writes:

```
User-agent: *
Allow: /

Sitemap: <site.url>/sitemap-index.xml
```

There is no static `public/robots.txt`. The generated endpoint ensures the sitemap URL is always the correct production domain as long as `site.ts` `url` is set correctly -- no manual file editing needed.

`public/llms.txt` also ships -- an AI/LLM crawler index of the site for tools that follow the emerging llms.txt convention. Keep it updated if major pages are added or removed.

After DNS cutover, submit `sitemap-index.xml` to Google Search Console. Verify the property via DNS TXT record (preferred -- survives redeploys) or HTML file upload.

### Title and description rules

- Every Sanity page singleton has `seoTitle` and `seoDescription` fields. They MUST be unique across pages.
- Title: target 50-60 characters. Front-load the keyword (location or service).
- Description: target 150-160 characters. Speak to the reader, not the search engine. Don't restate the title.
- If `seoTitle` is empty, BaseLayout falls back to the page's primary headline. Don't rely on the fallback for launch -- fill the field.

### The "Search & sharing" panel on a custom page (PORTS.md card 21)

The `page` document type builds its SEO group through `seoFields()` in
`src/sanity/schemaTypes/_seoFields.ts`. The page's own `seoTitle`, `seoDescription`, and
`seoImage` definitions are passed back in by REFERENCE, so their names and wording are
unchanged; the helper adds two things:

- `seoPreview` -- a value-less field whose custom input (`src/sanity/components/SeoSnippetInput.tsx`)
  draws a live Google result and a live share card as the editor types. It is an INPUT and
  must never be re-registered as a document VIEW: a view mounted inside the Presentation
  tool has no `FormValueProvider`, so `useFormValue` throws and freezes the panel.
- `hideFromSearch` -- "Hide this page from Google and the menus" (card 122 widened it to the menus,
  the menu picker and site search too; `docs/agent/private-pages.md`). **Two halves, and both are required**,
  or the switch silently does nothing: `src/pages/[slug].astro` passes `noindex` to
  BaseLayout (which emits `<meta name="robots" content="noindex, follow">`), and the
  `sitemap()` filter in `astro.config.mjs` drops the same path using a build-time query.

Page singletons do NOT have `hideFromSearch` yet, on purpose -- nothing on their routes
reads it. Adding it means doing both halves for that page in the same change.

### Redirects when a page is renamed (PORTS.md card 22)

Changing a page's web address files an old-path -> new-path `redirect` document
automatically at publish time (`src/sanity/components/slugRedirect.tsx`). Published
redirects are read at build time in `astro.config.mjs` and folded into Astro's `redirects`
map, which the Cloudflare adapter emits as real 301/302s. The editor can also add one by
hand under Pages -> Redirects for an address that never existed on this site. The path
normalization rules are shared with the build and unit-tested in `src/lib/redirects.ts`.
The two sides are normalized differently on purpose (PORTS.md card 79): an OLD address is
matched on its path alone, so its `?query` and `#fragment` are dropped, while a NEW address
keeps both byte for byte (`/visit#accessibility` lands on the heading, `/blog?category=x`
arrives filtered). A redirect from a path to the same path plus a query or fragment is
dropped as a loop.

One redirect is never served: one whose OLD address is where a published page lives now.
Cloudflare applies `_redirects` before it serves files, so it would shadow the page, and
a rename followed by a rename back leaves exactly that pair (`/a -> /b`, `/b -> /a`). The
build drops it with a `[redirects] skipped ...` warning and leaves the document in the
Studio (`src/lib/redirect-guard.ts`, card 22's 2026-09-29 addendum).

An OLD address that looks like a file (`/index.htm`, `/about.php`) needs one more step
(card 160). With `trailingSlash: 'always'` Astro writes it as `/index.htm/`, and the host
only adds a trailing slash to extensionless paths, so the visitor would get a 404. The
`fileStyleRedirects()` integration in `astro.config.mjs` puts an exact slashless rule for
each one at the top of `dist/client/_redirects` after the build (the build log says
`added N slashless rule(s)`). Check one with curl on `wrangler dev`, not a static server.

An **archived** page is not built at all, so its URL 404s, it drops out of the menus, and
it never reaches the sitemap.

### Short links (PORTS.md card 171)

A **short link** (`shortLink` document, Pages > Short links, or Quick update's "Make a short
link") is a short address an editor makes on purpose, like `/spring`, for a flyer, a card or a
QR code. It points at a page (a reference, so it follows a rename) or at another website. It is
not a Redirect: a Redirect keeps an OLD address working; a short link is new, often seasonal.

- **Served** by the `shortLinks()` integration in `astro.config.mjs`, which writes two lines
  per link at the very top of `dist/client/_redirects` (`/spring` and `/spring/`, so either form
  is one hop; Astro's own redirect lines only carry the slash, card 160). Destinations to a page
  end in a slash (rule 19). It runs after `fileStyleRedirects()`, so short links sit above
  card 160's slashless lines.
- **Status** in plain words: "For now" is a 302 (the default; browsers do not cache it, so it can
  be repointed next year), "For good" is a 301.
- **Expiry**: an optional last day, read in `site.timeZone` (`src/data/site.ts`, `'America/New_York'` by default; change it for a
  site in another zone). The link works through that day and is dropped by the next build. Content is
  statically built, so a site that wants "stops the next morning" adds a daily `schedule` to
  `deploy.yml`; otherwise it stops at the next publish or push.
- **Clashes**: a reserved route (`src/lib/reservedSlugs.ts`), a published page, a Redirect or a
  launch redirect (the keys of the config's `redirects` map, so card 160's file-style sources
  too), or an older short link. The Studio shows each as an error on the address field (an
  archived page as a warning); the build skips the same ones and logs
  `[short-links] skipped /x: ...`. Pages always win. A site with hand-written launch redirects
  lists their old addresses in `LAUNCH_FORWARDS` in `shortLink.ts` so the Studio warns too.
- **Limits**: Cloudflare allows 2,000 static rules and 1,000 characters a line in `_redirects`.
  Short links are capped at 200 (400 lines); an over-long target is skipped; the build fails if
  the whole file passes 2,000 rules.
- **No Sanity project**: `cmsQuery` returns the empty fallback and nothing is written.
- Rules and tests: `src/lib/short-links.ts` (`short-links.test.ts`), both PORTABLE. The
  schema (`src/sanity/schemaTypes/shortLink.ts`, its `PAGE_TARGETS` list and wording) is per
  site; a site with more routed types adds them there and to `pathForDoc()`.

### QR codes (PORTS.md card 171)

Every short link, and every document with a page of its own, has **QR code** in its document menu
(`src/sanity/actions/qrCode.tsx`): an SVG (one path of whole squares, crispEdges) and a PNG
(whole pixels per square, at least 1200px), with the four-square quiet border. A short link's code
holds `https://<site domain>/spring`; a page's holds its full address on `site.url`
(`src/data/site.ts`), with the trailing slash. While `site.domain` is a `workers.dev` address the
dialog warns that codes point at the temporary address. The library is `qrcode-generator` (MIT,
no dependencies), imported lazily by that action only, so it is never in a public page's bundle.
File-making is `src/lib/qr.ts` (`qr.test.ts`, against the real library). Private pages and the
not-found page get no button. The action, the address input and both libraries are PORTABLE.

### Image SEO

For Sanity-uploaded images, the alt text field does double duty: accessibility (required) and image search signal. Good alt text describes the image AND uses relevant terms where natural. Descriptive alt beats empty alt; meaningful descriptive alt beats generic.

See the [Image guidelines for editors](images.md#image-guidelines-for-editors) section for filename, format, and color profile rules.

### Pre-launch SEO checklist

- [ ] Every page has unique `seoTitle` and `seoDescription` in Sanity
- [ ] No page is left with "Keep this page out of Google" on by mistake (check Pages, then each custom page's Search & sharing tab)
- [ ] `og-default.png` regenerated with the actual project brand inputs
- [ ] `src/data/site.ts` `url` set to the production domain (robots.txt is generated from this automatically)
- [ ] `llms.txt` updated for the actual page set
- [ ] LocalBusiness JSON-LD validates in Google Rich Results Test
- [ ] FAQPage JSON-LD validates (if `/faq` is included)
- [ ] Service schemas validate (if per-service schemas are wired)
- [ ] BreadcrumbList present on every internal page
- [ ] OG previews look right in Slack, iMessage, or a social debugger (verify with opengraph.xyz or similar)
- [ ] All Sanity image alt text is meaningful (no "image1" placeholders, no empty strings)
- [ ] Sitemap submitted to Google Search Console
- [ ] Canonical URL points at the production domain on every page

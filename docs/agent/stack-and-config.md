# Stack and Astro config

> Full stack/version notes and the astro.config.mjs levers that look tempting but break things.

## Stack

Pinned versions reflect what's known to work together as of May 2026. Bump deliberately, not casually.

- Astro 6.3.x with TypeScript in strict mode and `output: 'static'`. Requires Node 22.12+.
- **Sanity v5** as the headless CMS. Schemas in `studio/schemaTypes/`, written with `defineType`/`defineField`/`defineArrayMember` from `'sanity'`. Sanity TypeGen generates TypeScript types from the schemas (`npm run typegen`). All editable content lives in Sanity (services, testimonials, FAQs, projects, page singletons). Studio deployed alongside the site at `studio.<yourdomain>` or hosted on Sanity's free hosting.
- **Env-driven Sanity config:** the Sanity project ID and dataset are read from `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` at build time. `src/lib/sanity.ts` exposes a `sanityFetch(query, params, fallback)` wrapper that returns the fallback value when no project is configured (either env var absent or empty), so `npm run build` succeeds with no Sanity project set up. Pages render their empty-state fallback content rather than erroring. This is intentional: you can build and verify the site skeleton before wiring up Sanity.
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file.
- React 19 islands for anything interactive (mobile nav drawer, contact form, lightbox, theme toggle, back-to-top). Astro components for everything static.
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base). Extend Button with project-specific marketing variants only when the standard variants don't carry the brand.
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`).
- sharp for image processing. Sanity handles its own image transformation pipeline for content images; sharp is for any locally-bundled assets (logo, OG image generator).
- opentype.js (dev-only) for the OG image generator at `scripts/generate-og-default.mjs`.
- `@astrojs/rss` reserved for `/rss.xml` (not wired at launch by default).
- `@astrojs/sitemap` for `sitemap-index.xml` (production sitemap).
- Three-state dark/light/system theme system: `ThemeToggle.tsx` React island plus an anti-FOUC bootstrap script in BaseLayout, persisted to `localStorage["theme"]`. The site is light-primary; dark mode is supported for visitor preference but not the primary read of the brand.
- `src/data/site.ts` as the single source of truth for hardcoded site identity (brand name, domain, asset paths, social URL strings the build needs at compile time). Editor-controlled content goes through Sanity.
- **Web3Forms** for the contact form (NCS standard pattern). Free tier covers 250 submissions/month.
- Cloudflare Web Analytics for privacy-friendly traffic (no cookie banner needed).
- **Cloudflare Workers** for hosting (not Pages). The two products merged in early 2026; Pages is in maintenance mode, Workers gets all new investment. Use `wrangler deploy`. Astro adapter config is `cloudflare({ imageService: 'compile' })` so image processing stays at build-time via Sharp -- never reaches the Cloudflare Images runtime binding (avoids surprise per-transform fees, no Workers binding required).
- **`@astrojs/cloudflare` is pinned to exactly `13.5.5`.** Version 13.6.0 introduced a regression: the image optimizer writes optimized assets to `dist/client/_astro/` but then reads them back from `dist/_astro/`, a mismatch that causes the build to fail or produce broken image URLs. Do not upgrade this package without verifying the image pipeline still works end-to-end. Pinned in `package.json` with an exact version (no `^`).
- GitHub for version control.

### Astro config don'ts

A few `astro.config.mjs` levers that look tempting but break things -- left documented here so a future agent doesn't waste a cycle rediscovering them:

- **`security.csp` is disabled on purpose.** Astro 6 has a hash-based CSP feature that auto-generates SHA-256 hashes for inline scripts + styles. Enabling it satisfies Lighthouse's `csp-xss` audit on paper, but in practice the build-time hash pass misses at least one runtime-generated inline script (ClientRouter's view-transitions runtime emits one) and one inline style from the astro-island markup. The browser then blocks them -- theme bootstrap breaks, Lenis init breaks, polish observer breaks. Re-enabling would need either nonce-based SSR (doesn't apply to our `output: 'static'`) or an audit of every inline script Astro and React might emit at runtime. Not worth chasing for an unscored audit. The `public/_headers` file still ships a `frame-ancestors` CSP, which is the only security-relevant directive for this setup (lets Sanity Studio iframe the live site for the preview pane).

- **`crossorigin="anonymous"` on Sanity CDN images breaks them.** Sanity's CDN doesn't send `Access-Control-Allow-Origin` for credential-less image requests, so the browser refuses the response and the image fails to render. Lighthouse's third-party-cookie warning about `sanitySession` is a real cookie, but the only known fix would proxy every image through a Cloudflare Worker -- not worth the engineering for an unscored Best Practices flag.

### Build order: typegen before build

Run `npm run typegen` before `npm run build` whenever schemas change. The TypeScript types generated from Sanity schemas are consumed by page-level GROQ queries; a stale type file causes `astro check` and `tsc` to surface type errors that disappear once types are regenerated. The `npm run build` script in `package.json` chains these: `typegen && astro check && astro build`. Do not remove the typegen step from the chain.

### Sitemap `/404` filter

`astro.config.mjs` passes a `filter` function to `@astrojs/sitemap` that excludes `/404` from the generated sitemap. Without the filter, Astro includes the 404 page in `sitemap-index.xml`, which tells crawlers to index a page that should never appear in search results. The filter is one line and should stay.

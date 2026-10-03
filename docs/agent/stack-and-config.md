# Stack and Astro config

> Full stack/version notes and the astro.config.mjs levers that look tempting but break things.

## Stack

Pinned versions reflect what's known to work together as of May 2026. Bump deliberately, not casually.

- Astro 6.3.x with TypeScript in strict mode and `output: 'static'`. Requires Node 22.12+.
- **Sanity v5** as the headless CMS. Schemas in `src/sanity/schemaTypes/`, written with `defineType`/`defineField`/`defineArrayMember` from `'sanity'`. Sanity TypeGen generates TypeScript types from the schemas (`npm run typegen`). All editable content lives in Sanity (services, testimonials, FAQs, projects, page singletons). Studio deployed alongside the site at `studio.<yourdomain>` or hosted on Sanity's free hosting.
- **Env-driven Sanity config:** the Sanity project ID and dataset are read from `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` at build time. `src/lib/sanity.ts` exposes a `sanityFetch(query, params, fallback)` wrapper that returns the fallback value when no project is configured (either env var absent or empty), so `npm run build` succeeds with no Sanity project set up. Pages render their empty-state fallback content rather than erroring. This is intentional: you can build and verify the site skeleton before wiring up Sanity.
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file.
- React 19 islands for anything interactive (mobile nav drawer, contact form, lightbox, theme toggle, back-to-top). Astro components for everything static.
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base). Extend Button with project-specific marketing variants only when the standard variants don't carry the brand.
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`).
- sharp for image processing. Sanity handles its own image transformation pipeline for content images; sharp is for any locally-bundled assets (logo, OG image generator).
- opentype.js (dev-only) for the OG image generator at `scripts/generate-og-default.mjs`.
- `@astrojs/rss` wired at `/journal/rss.xml` via `src/pages/journal/rss.xml.ts`.
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

- **`fixSanityDedupeAlias()` in `vite.plugins` stays, and `SANITY_ASTRO_DISABLE_MODULE_DEDUPE=1` is not the alternative** (PORTS.md card 60, 2026-09-29). `@sanity/astro` adds a dev-only plugin, `sanity:module-dedupe`, that aliases `sanity` and `styled-components` to one directory each. On Windows its forward-slash-only regex leaves the alias pointing at the `package.json` file, and `astro dev` dies in under a minute with `[MISSING_EXPORT] "..." is not exported by "node_modules/sanity/package.json"`. `astro build` never loads the plugin, so nothing but a Windows dev server shows it. The canonical `src/lib/sanity-dedupe-alias.ts` repairs the alias in place from a post-ordered `config` hook. The upstream env off switch stops the crash but also drops the plugin's pre-bundling list, and the Studio then fails to hydrate in the browser (`react-compiler-runtime ... does not provide an export named 'c'`). Remove the repair only when the upstream regex is fixed (read `node_modules/@sanity/astro/dist/sanity-astro.js` for `sanity:module-dedupe`).

### Dev-only: pre-bundle what the first render discovers (PORTS.md card 63)

`vite.environments.ssr.optimizeDeps.include: ['astro/app/manifest', 'astro/logger/json']` in `astro.config.mjs` is load-bearing for `astro dev` on the pinned adapter (14.2.4). Without it, those two modules are discovered DURING the first render, the Vite optimizer re-bundles and reloads the module graph mid-request, `react-dom/server` is left holding a React from the previous pass, and every React island fails to server-render with "Invalid hook call" then "Cannot read properties of null (reading 'useState')" while the page still answers 200 (withastro/astro#17834). Reproduced in the starter on 2026-10-03 from a cold `.vite` cache (one request to `/`; see the card for the numbers). `astro build` never runs the optimizer, so CI and production cannot show it. `astro/logger/json` only loads when the dev server logs JSON, which is what `astro dev` does under an AI agent or with `--background`, so a plain foreground terminal can look clean. Remove the block only when the adapter pin moves, and re-measure with a cold request.

**Debugging rule from the same hunt: prove module identity by making the file THROW, not by reading a stack trace.** In a bundled runtime a path in a stack is source-map output: it says where code was WRITTEN, not which copy executed, and the two differ exactly when you are chasing a duplicate-instance bug (the trace named a raw `node_modules/react` frame beside a pre-bundled one and read as a textbook dual instance; it was not, the component's React also came from `deps_ssr`). Prepend `throw new Error('PROBE_X')` to the candidate file, restart, and see whether it surfaces; guard it (for example throw only when `process.versions.node` is absent) so an unrelated Node-side config load still works. Two corollaries: **a probe that reports nothing has proved nothing until you have proved its channel** (`console.log` from inside the workerd module runner never reaches Astro's dev log, though thrown errors do, so send a signal you know should arrive before trusting silence), and **confirm WHICH Vite environment is running** (`client`, `ssr`, and `astro`, the workerd runner): a fix aimed at the wrong one half-works for weeks and looks right in review. A `configEnvironment` probe prints the names; an A/B with each block removed says which one carries the fix.

### Build order: typegen before build

`npm run build` runs `astro build` only. It does NOT chain typegen.

After any schema change, run `npm run typegen` first, then `npm run build`. The TypeScript types generated from Sanity schemas are consumed by page-level GROQ queries; a stale type file causes `astro check` and `tsc` to surface type errors that disappear once types are regenerated. Use `npm run build:full` (`npm run typegen && astro build`) to run both in one step.

### Sitemap `/404` filter

`astro.config.mjs` passes a `filter` function to `@astrojs/sitemap` that excludes `/404` from the generated sitemap. Without the filter, Astro includes the 404 page in `sitemap-index.xml`, which tells crawlers to index a page that should never appear in search results. The filter is one line and should stay.

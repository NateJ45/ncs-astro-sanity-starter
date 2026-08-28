// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

import { buildRedirectMap } from './src/lib/redirects.ts';

// The Sanity project id is PUBLIC by design: it ships in every client bundle.
// A fresh clone with no .env still builds; the Studio then shows a project-not-
// found screen until PUBLIC_SANITY_PROJECT_ID is set (see .env.example).
const SANITY_PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder-project-id';
const SANITY_DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';

// -----------------------------------------------------------------------------
// Build-time reads from Sanity (redirects + pages kept out of search)
// -----------------------------------------------------------------------------
// Both are FULLY fail-safe. Any problem - no project, no token, Sanity down, bad
// data - returns the empty answer and the build carries on exactly as it did
// before this feature existed. Neither read may ever fail a build.
//
// This runs in the Astro CONFIG, before any integration, so it cannot use
// src/lib/sanity.ts (that module reads import.meta.env, which is not populated
// yet). loadEnv is Vite's own .env reader and is already a dependency of Astro.
const configEnv = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const SANITY_API_VERSION =
  process.env.PUBLIC_SANITY_API_VERSION || configEnv.PUBLIC_SANITY_API_VERSION || '2026-05-01';
const SANITY_READ_TOKEN = process.env.SANITY_API_READ_TOKEN || configEnv.SANITY_API_READ_TOKEN;
const SANITY_CONFIGURED =
  SANITY_PROJECT_ID !== 'placeholder-project-id' && SANITY_PROJECT_ID !== 'your-project-id';

/** One GROQ query against the Sanity HTTP API. Returns `fallback` on anything
 *  that is not a clean 200. */
async function cmsQuery(query, fallback) {
  if (!SANITY_CONFIGURED) return fallback;
  try {
    const url =
      `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}` +
      `/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: SANITY_READ_TOKEN ? { Authorization: `Bearer ${SANITY_READ_TOKEN}` } : {},
    });
    if (!res.ok) return fallback;
    const { result } = await res.json();
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

// Editor-managed redirects. Each published `redirect` document becomes one entry
// in Astro's `redirects` map, which the Cloudflare adapter emits as a real
// 301/302. Most of them are filed automatically when a page's web address
// changes (src/sanity/components/slugRedirect.tsx); the shaping rules live in
// src/lib/redirects.ts so the Studio and the build agree on what a path is.
const cmsRedirects = buildRedirectMap(
  await cmsQuery('*[_type == "redirect" && defined(from) && defined(to)]{from,to,permanent}', []),
);

// Pages the editor keeps out of search. "Keep this page out of Google"
// (page.hideFromSearch) has to do two things: put a robots tag on the page
// (src/pages/[slug].astro does that) and drop the page from the sitemap, which
// is built here. Archived pages are listed too, belt and braces - they are never
// built, so no URL of theirs can reach the sitemap anyway.
const hiddenPagePaths = new Set(
  (
    await cmsQuery(
      '*[_type == "page" && defined(slug.current) && (hideFromSearch == true || archived == true)].slug.current',
      [],
    )
  )
    .filter((slug) => typeof slug === 'string' && slug)
    .map((slug) => `/${slug}`),
);

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  // 2026-08-28: no sessions anywhere in this template (there is no gated area
  // or login), so opt out. Left on, @astrojs/cloudflare v14 auto-declares a
  // "SESSION" KV binding in the generated dist/server/wrangler.json, and a KV
  // binding with no namespace id fails the deploy. A fork that adds a login
  // turns this back on and creates the namespace deliberately.
  session: false,
  // `imageService: 'compile'` tells @astrojs/cloudflare to process images
  // with Sharp at build time and ship plain static files — no Cloudflare
  // Images runtime, no per-transform fees, no Workers binding required.
  // The adapter's default would otherwise wire up the IMAGES binding which
  // is meant for SSR sites that want on-demand transforms (we don't).
  adapter: cloudflare({ imageService: 'compile' }),
  // Old address -> new address forwards, managed by the editor in the Studio and
  // read at build time above. The Cloudflare adapter turns these into real
  // 301/302s. A repo that also needs hand-written launch redirects puts them
  // BEFORE the spread, so an editor entry can correct one without a code change.
  redirects: { ...cmsRedirects },
  integrations: [
    mdx(),
    // Embedded Sanity Studio at /studio (added 2026-08-28). This is the ONE
    // studio: it rebuilds with every deploy, so it can never drift stale the
    // way a hosted *.sanity.studio deploy does. The config it loads is the
    // repo-root sanity.config.ts.
    sanity({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      useCdn: false,
      studioBasePath: '/studio',
    }),
    sitemap({
      // /studio and /preview are Studio plumbing (SSR, noindex). The sitemap
      // only walks prerendered routes so they are mostly excluded already, but
      // the filter makes it explicit and future-proof.
      //
      // A custom page whose editor ticked "Keep this page out of Google" (or
      // that is archived) drops out here too. `page` is a full URL, so compare
      // on the pathname with the trailing slash Astro's directory format adds.
      filter: (page) => {
        if (page.includes('/404') || page.includes('/studio') || page.includes('/preview'))
          return false;
        try {
          const path = new URL(page).pathname.replace(/\/+$/, '');
          return !hiddenPagePaths.has(path);
        } catch {
          return true;
        }
      },
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    // @sanity/ui ships an ESM build that Vite's dependency pre-bundler
    // mis-scans on this stack (MISSING_EXPORT errors for styled-components).
    // Excluding it from pre-bundling matches presacademy's working config; it
    // is still bundled correctly by `astro build`.
    //
    // Deliberately NO custom chunking here. An `advancedChunks` group forcing
    // styled-components + @sanity/ui into one chunk was tried in presacademy on
    // 2026-08-26 (chasing a theming crash) and made things worse: merging those
    // modules changes evaluation order and broke @sanity/ui's theme init,
    // surfacing as "TypeError: Cannot read properties of undefined (reading
    // 'v2')" from inside styled-components' generateAndInjectStyles. Leave the
    // bundler's default chunking alone.
    optimizeDeps: {
      exclude: ['@sanity/ui', 'styled-components'],
    },
    // -----------------------------------------------------------------------
    // ONE module instance per package
    // -----------------------------------------------------------------------
    // The studio now lives in this package (the nested studio/ package was
    // folded in 2026-08-28), so there is only one node_modules tree and this is
    // belt-and-braces rather than the load-bearing fix it was in presacademy.
    // Keep it anyway: it is cheap, and it also protects against a fork adding a
    // second resolution root. Two instances of styled-components means two
    // React contexts, and the ThemeProvider mounted by one is invisible to
    // useTheme in the other, which kills the signed-in Studio while leaving the
    // login screen (core code only) working.
    //
    // @sanity/icons is deliberately NOT here: sanity core wants v5 while
    // @sanity/ui v3 wants v3.8, and icons are stateless SVG components with no
    // React context, so two instances are harmless. Deduping them broke the
    // build (CogIcon is gone in v5).
    //
    // Verify after any Sanity dependency work:
    //   grep -l "errors.md#" dist/client/_astro/*.js   # must list ONE file
    resolve: {
      dedupe: [
        'react',
        'react-dom',
        'react-is',
        'styled-components',
        '@sanity/ui',
        '@sanity/client',
        'sanity',
        'rxjs',
      ],
    },
  },
  // NOTE: A previous attempt at `security.csp` shipped a hash-based CSP
  // meta tag. It got past Lighthouse's csp-xss check on paper, but Astro
  // missed at least one runtime-generated inline script (probably from
  // ClientRouter view-transitions) and one inline style, which the browser
  // then blocked — breaking theme bootstrap and various islands. The
  // current `public/_headers` carries a `frame-ancestors` CSP for the
  // Sanity iframe-pane preview, which is enough for the actual security
  // surface. Re-enabling a full CSP needs an audit of every inline script
  // (incl. ClientRouter's runtime scripts), or a switch to a nonce-based
  // SSR strategy. Not worth chasing for the cookie/csp-xss informational
  // warnings — our Lighthouse runs already score Best Practices 100.
});

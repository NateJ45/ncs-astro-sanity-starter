// Foundation, edit with care
// =============================================================================
// Sanity CLI config - used by `sanity typegen`, `sanity dataset`, `sanity cors`
// =============================================================================
// There is ONE canonical Studio: the one embedded at /studio on the built site.
// It rebuilds on every deploy, so its schema is always current and cannot drift.
//
// DO NOT run `npx sanity deploy`. That publishes a SEPARATE standalone Studio
// to <studioHost>.sanity.studio, which only updates when someone re-runs the
// deploy by hand: it silently falls behind the embedded Studio while pointing
// at the same production data. There is deliberately no studioHost/deployment
// block here so a stray `sanity deploy` cannot recreate the split. (Anti-drift
// pattern taken from presacademy, which learned it the hard way.)
//
// Also note `sanity build` writes to ./dist by default, which would clobber the
// Astro build output. There is no `studio:build` script for that reason: the
// Studio is built by `astro build` as part of the site. If you ever need a
// standalone Studio bundle, pass an explicit output dir:
//   npx sanity build .studio-dist

import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID,
    dataset:
      process.env.SANITY_STUDIO_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production',
  },
  // The embedded Studio is served at /studio (set by @sanity/astro's
  // studioBasePath in astro.config.mjs). Mirror it here so standalone CLI
  // tooling agrees the Studio lives at the sub-path.
  project: { basePath: '/studio' },
  // Typegen reads the extracted schema and writes types into src/lib/.
  // Extract via `sanity schema extract`; generate via `sanity typegen generate`
  // (both wrapped by `npm run typegen`).
  typegen: {
    path: './schema.json',
    generates: './src/lib/sanity.types.ts',
  },
});

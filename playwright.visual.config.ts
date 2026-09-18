// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
/* ============================================================================
   Visual-regression config - SEPARATE from the main suite on purpose
   ============================================================================
   PORTS.md card 37. Technique from west-chester-preschool, proven on
   stonesteps-50k, brought home 2026-09-18.

   WHY IT IS SEPARATE. Screenshot baselines are platform-sensitive: font
   rasterisation differs between Windows and the Linux CI runners. CI is the
   arbiter, exactly as it is for the a11y sweeps.

   AND WHY THE SUITE SKIPS ITSELF ON WINDOWS. The baselines committed here are
   Linux artefacts, so a local Windows run diffs Windows glyphs against Linux
   glyphs and fails. On stonesteps-50k that failure was "expected", which is a
   terrible thing for a gate to be: every agent who touched the repo in its
   first week hit a red dark-theme snapshot, spent time on it, and learned to
   discount the suite. tests/visual/styleguide.spec.ts therefore skips on win32
   and prints why.

   The alternative was to suffix baselines by platform and commit both sets.
   That is rejected here for one reason: it makes a Windows-rendered image a
   SECOND BASELINE, reviewed by nobody, that a laptop can regenerate at will.
   The whole value of this gate is that exactly one set of pixels is the truth
   and CI owns it. Skipping keeps that; suffixing quietly gives it away.
   `VISUAL_FORCE=1 npm run test:visual` runs anyway when you are debugging the
   harness itself rather than the design.

   REGENERATING MEANS ALL OF THEM. `npm run test:visual:update` passes
   --update-snapshots=all, not the bare flag. Since Playwright 1.51 the bare
   flag means "changed", which only rewrites baselines whose comparison FAILED,
   so a real visual change that lands UNDER maxDiffPixelRatio is left behind in
   the baseline: the run goes green, nothing is committed, and the stored image
   quietly stops matching the site. An explicit regenerate has to mean what its
   name says, or the drift accumulates until some unrelated change finally
   trips the gate and gets blamed for all of it.

   Baselines are generated IN CI by .github/workflows/visual.yml
   (workflow_dispatch with `update: true`) and committed under
   tests/visual/__screenshots__/. Regenerate them only when a visual change is
   INTENDED, in the same change that causes it. A baseline refreshed "to make
   the red go away" converts this gate into decoration.

   WHAT IT SHOOTS. /styleguide only, which renders the design system with FIXED
   data. Real pages carry live content; shooting those would churn the baseline
   on content and teach everyone to ignore it.
   ============================================================================ */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_VISUAL_PORT ?? 4322);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  // One baseline per screenshot name, with no platform or project suffix. That
  // is what makes the Linux set the single source of truth; see the header.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Loose enough to ignore antialiasing shimmer, tight enough that a moved
      // band, a lost logo or a colour shift trips it.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    // Reduced motion freezes the reveal and scroll systems so content renders
    // in its resting state, which is what a stable screenshot needs. It is a
    // browser-context option: at the top level of `use` it is a type error and
    // silently does nothing.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx http-server dist/client -p ${PORT} -s -c-1 --silent`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

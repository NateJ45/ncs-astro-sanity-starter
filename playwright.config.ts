// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { defineConfig, devices } from '@playwright/test';

// =============================================================================
// Playwright config (family test standard)
// =============================================================================
// Tests run against the REAL production build (dist/client) served statically,
// not `astro dev`: the Cloudflare workerd dev runtime is flakier and can serve
// error pages that a naive check would read as "fine". Fresh build + no-cache
// serve each run avoids stale-CSS false results.
//
// dist/client holds only the PRERENDERED site. The SSR routes (/studio,
// /preview/**, /api/draft-mode/*) need a Worker behind them and are not here;
// exercise those with `npm run preview` (wrangler dev) by hand.
//
// The port is 4321 by default and overridable with PLAYWRIGHT_PORT, so a run
// can share a machine with a dev server or another repo's suite. The webServer
// command is assembled here rather than read from `npm run serve:dist` so the
// override needs no shell interpolation (Windows and POSIX disagree about it).
// =============================================================================

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Chromium runs everything. A real WebKit iPhone profile runs the
  // viewport-agnostic suites (smoke + both axe sweeps): Safari's engine finds
  // layout and JS issues Chromium never will, and it is where the
  // focus-indicator bug in a11y-dark.spec.ts actually lives (WebKit renders
  // native form controls itself and drops box-shadow on them, so a Tailwind
  // `focus:ring` is invisible there). reflow.spec.ts drives its own explicit
  // viewport widths, which fights device emulation, so it is chromium-only.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
      testMatch: /(smoke|a11y|a11y-dark)\.spec\.ts$/,
    },
  ],
  webServer: {
    command: `npm run build && npx http-server dist/client -p ${PORT} -s -c-1 --silent`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// redirect-guard - never let an editor redirect shadow a page that exists
// =============================================================================
// Companion to src/lib/redirects.ts (PORTS.md card 22). Folded back from
// reid-design-site on 2026-09-29, where it was written against this sequence,
// which the Studio's publish action (slugRedirect.tsx) cannot see:
//
//   1. An editor renames /kitchen-refresh to /kitchen-remodel and publishes.
//      The action files /kitchen-refresh -> /kitchen-remodel. Correct.
//   2. Later they change their mind and rename it back to /kitchen-refresh.
//      The action files /kitchen-remodel -> /kitchen-refresh. Also correct.
//   3. But the step-1 redirect is still there, and its `from` is now the page's
//      LIVE address. The repoint step skips it (its `from` equals the new `to`),
//      so the map holds /kitchen-refresh -> /kitchen-remodel -> /kitchen-refresh.
//
// Cloudflare applies `_redirects` before it serves any file, so that redirect
// would win over the real page and every visitor would bounce in a loop. The
// same thing happens when an editor hand-files a redirect FROM an address a
// published page already uses.
//
// The fix lives here, at build time, rather than in the Studio action, because
// the build is the one place that knows every address a page currently lives
// at. A dropped entry is logged by astro.config.mjs; the `redirect` document
// stays in the Studio, harmless, and starts working again if the page ever
// moves away. Nothing is deleted.
//
// Kept in its own file rather than added to redirects.ts on purpose: every repo
// in the family carries redirects.ts marked PORTABLE, and changing it would turn
// every one of their sync-checks red for an addition they can adopt at leisure.
//
// Pure string work, unit-tested in redirect-guard.test.ts.
// =============================================================================

import { normalizeRedirectPath, type RedirectTarget } from './redirects.ts';

export interface GuardResult {
  /** The map with every entry whose `from` is a live page address removed. */
  redirects: Record<string, RedirectTarget>;
  /** The `from` paths that were removed, for the build log. */
  dropped: string[];
}

/**
 * Remove redirects whose source path is the current address of a real page.
 * `livePaths` may be in any shape an editor or a route might produce
 * ("/a", "/a/", "a"); they are normalized the same way the map keys are.
 */
export function dropRedirectsOverLivePages(
  redirects: Record<string, RedirectTarget>,
  livePaths: Iterable<string | null | undefined>,
): GuardResult {
  const live = new Set<string>();
  for (const p of livePaths) {
    const n = normalizeRedirectPath(p);
    if (n) live.add(n);
  }
  const kept: Record<string, RedirectTarget> = {};
  const dropped: string[] = [];
  for (const [from, target] of Object.entries(redirects)) {
    if (live.has(from)) dropped.push(from);
    else kept[from] = target;
  }
  return { redirects: kept, dropped };
}

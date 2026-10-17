// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /build-info.json: when the live site was built (Studio kit, PORTS.md card 106)
// =============================================================================
// Prerendered, so the file holds the moment this build rendered it. The
// Studio's Home card ("Is it live?") compares it with the newest published
// change: anything published after it is not on the website yet (CLAUDE.md
// rule 6). The time is taken when this route renders, late in the build, so a
// Publish made DURING a build can briefly read as live; the next build fixes
// that, and Home re-checks every minute.
//
// `commit` is the short SHA of the build, or null when it cannot be known. It
// comes from astro.config.mjs as the Vite define __NCS_BUILD_COMMIT__ (from
// GITHUB_SHA in Actions, else `git rev-parse`). Reading process.env here does
// NOT work: the prerender runs inside workerd, which cannot see the build
// machine's environment, so the first version always said null. A repo whose
// astro.config.mjs lacks the define still builds and reports null.
// =============================================================================

import type { APIRoute } from 'astro';

declare const __NCS_BUILD_COMMIT__: string | null | undefined;

export const prerender = true;

export const GET: APIRoute = () => {
  const commit = typeof __NCS_BUILD_COMMIT__ === 'string' ? __NCS_BUILD_COMMIT__ : null;
  return new Response(JSON.stringify({ builtAt: new Date().toISOString(), commit }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

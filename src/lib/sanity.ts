// Foundation, edit with care
// Sanity client + image URL builder. Reads project ID / dataset / API version
// from env at build time. The site is fully prerendered (output: 'static'),
// so all Sanity reads happen at build time in Node, not in the Cloudflare runtime.
//
// Token-based reads (current default):
//   This project's dataset is configured such that anonymous queries are filtered
//   down to a subset of document types (a Sanity-side restriction we couldn't
//   surface in Manage UI — only the page singletons came through anon, every
//   collection returned empty). Passing SANITY_API_READ_TOKEN bypasses the
//   filter and reads the full dataset.
//
//   When a token is set, Sanity disables CDN caching for the request (auth
//   responses can vary by user, so CDN can't safely cache). Build-time only,
//   not a runtime hot path, so the latency is harmless.
//
// Anon fallback:
//   If SANITY_API_READ_TOKEN is missing, the client still constructs and queries
//   work for whatever the API surfaces anonymously. Useful for local-dev sanity
//   checks before the token's been wired into Cloudflare's env vars.
//
// Graceful empty-state:
//   When PUBLIC_SANITY_PROJECT_ID is absent or set to the placeholder string
//   "your-project-id", sanityFetch() short-circuits and returns the provided
//   fallback without making any network call. This lets `npm run build` succeed
//   on a fresh clone with no Sanity project configured — pages render their
//   existing empty-state fallbacks. The populated case (real project ID set)
//   works exactly as before.

import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const readToken = import.meta.env.SANITY_API_READ_TOKEN as string | undefined;

/** Returns true when no real Sanity project has been configured. */
const PLACEHOLDER_IDS = new Set(['', 'your-project-id', 'placeholder']);
export const isSanityUnconfigured =
  !projectId || PLACEHOLDER_IDS.has(projectId.trim());

// Warnings below are scoped to server-only (build + SSR pass) so they don't
// leak into the browser console. The Sanity client module gets imported by
// React components (PortableText, ProjectGallery, etc) for the `urlFor`
// helper, which means the module evaluates client-side too — without this
// guard, every browser session would see the readToken warning, even though
// the token is irrelevant in the browser (it's a server-only env var).
if (import.meta.env.SSR) {
  if (isSanityUnconfigured) {
    // Soft warning — build still succeeds; pages render empty-state fallbacks.
    // Set PUBLIC_SANITY_PROJECT_ID in .env (or Cloudflare → Workers → Variables)
    // to connect a real Sanity project and populate content.
    console.warn(
      '[sanity] PUBLIC_SANITY_PROJECT_ID is not set. Build will succeed with empty content (empty-state fallbacks). Configure it in .env to connect a Sanity project.',
    );
  }

  if (!isSanityUnconfigured && !readToken) {
    // Soft warning — pages still render via fallback copy when the token is missing,
    // but collections (services, testimonials, etc.) won't populate.
    console.warn(
      '[sanity] SANITY_API_READ_TOKEN is not set. Build-time reads will use the anonymous API; collection content (services, testimonials, processSteps, faqs, projects) may render empty. Set it in .env locally and in Cloudflare → Workers → Variables (as Secret) for production builds.',
    );
  }
}

export const client: SanityClient = createClient({
  projectId: projectId || 'unconfigured',
  dataset,
  apiVersion,
  // CDN is incompatible with token-based reads (Sanity rejects token + useCdn:true).
  // When no token, we can use the CDN safely; it serves the same anon-filtered subset
  // as the API anyway.
  useCdn: !readToken,
  perspective: 'published',
  ...(readToken ? { token: readToken } : {}),
});

/**
 * Guarded fetch wrapper — the single chokepoint for all Sanity data queries.
 *
 * When Sanity is unconfigured (PUBLIC_SANITY_PROJECT_ID absent or placeholder),
 * returns `fallback` immediately without any network call so the build succeeds
 * with empty-state content. When configured, forwards to `client.fetch` and
 * catches any network error, logging a warning and returning `fallback` rather
 * than crashing the build.
 *
 * All query helpers in queries.ts route through this function.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
): Promise<T> {
  if (isSanityUnconfigured) {
    return fallback;
  }
  try {
    return await client.fetch<T>(query, params);
  } catch (err) {
    console.warn('[sanity] fetch error (returning empty fallback):', err);
    return fallback;
  }
}

const builder = createImageUrlBuilder({
  projectId: projectId ?? 'placeholder',
  dataset,
});

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Pull intrinsic width + height out of a Sanity image's asset ref.
 * Asset refs follow the pattern `image-{hash}-{W}x{H}-{ext}` (e.g.
 * `image-e05a4e2...-5712x4284-jpg`), so the dimensions can be extracted
 * with a single regex without an extra Sanity query.
 *
 * Returns null when the ref is missing or doesn't match — callers should
 * fall back to letting the browser size the image naturally (with a layout
 * shift) rather than fabricating dimensions.
 *
 * Used by the Portable Text image renderers to set width/height on inline
 * <img> tags, which lets the browser reserve aspect-ratio space before the
 * image loads and eliminates the CLS hit Lighthouse was flagging on
 * project + journal detail pages.
 */
export function parseSanityAssetDimensions(
  source: { asset?: { _ref?: string; _id?: string } } | null | undefined,
): { width: number; height: number } | null {
  const ref = source?.asset?._ref ?? source?.asset?._id;
  if (!ref) return null;
  const m = ref.match(/-(\d+)x(\d+)-[a-z0-9]+$/i);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!width || !height) return null;
  return { width, height };
}

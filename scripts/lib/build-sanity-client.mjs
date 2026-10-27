// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 168)
// The read-only Sanity client the post-build steps share (build-brand-icons.mjs, and any later
// step that reads content after astro build): published content, the CDN unless a token is set, and the pinned CI
// snapshot when SANITY_SNAPSHOT_URL is set (PORTS.md card 138), exactly like the page build.
// Returns null when no project id is configured (a fresh clone), so the steps skip quietly.

import { createClient } from '@sanity/client';
import { loadEnv } from './loadEnv.mjs';
import { snapshotClientOptions } from '../snapshot.mjs';

export function buildSanityClient(root) {
  const env = loadEnv(root);
  const projectId = env.PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return null;
  const readToken = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN;
  return createClient({
    projectId,
    dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
    apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
    useCdn: !readToken,
    perspective: 'published',
    ...(readToken ? { token: readToken } : {}),
    ...snapshotClientOptions(process.env),
  });
}

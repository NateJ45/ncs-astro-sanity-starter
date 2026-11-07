// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// worker: the site's Worker, Astro's handler plus video byte ranges (PORTS.md card 222)
// =============================================================================
// wrangler.jsonc names this file as "main" and lists *.mp4 and *.webm under run_worker_first, so
// those two reach this code before the asset store. A clip that exists goes through
// src/lib/video-ranges.ts. A .mp4 path with no file behind it goes to Astro like any other miss,
// so the 404 page and any route that serves files itself keep working. Every other request is
// handled exactly as it would be by the adapter's default entry, which is this same handle().
import { handle } from '@astrojs/cloudflare/handler';
import { isVideoPath, rangedVideo } from './lib/video-ranges';

type Env = Parameters<typeof handle>[1] & {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

export default {
  async fetch(request: Request, env: Env, context: Parameters<typeof handle>[2]) {
    if (env.ASSETS && isVideoPath(new URL(request.url).pathname)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return rangedVideo(request, asset);
    }
    return handle(request, env, context);
  },
};

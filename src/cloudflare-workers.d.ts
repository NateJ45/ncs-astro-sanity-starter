// Foundation, edit with care
// Ambient typing for the `cloudflare:workers` runtime module that the
// live-preview stack imports (src/lib/cms-preview.ts, src/lib/preview-auth.ts,
// src/pages/preview/live.ts). Without it `astro check` fails with "Cannot find
// module 'cloudflare:workers'" because the real module only exists inside the
// workerd runtime.
//
// This is deliberately minimal rather than the 15,000-line file
// `wrangler types` generates: that file declares the same module with
// `export =`, which cannot coexist with this one, and it types `env` from the
// bindings in wrangler.jsonc, where secrets like SANITY_TOKEN never appear.
// The callers all narrow with `(env as { SANITY_TOKEN?: string })`, so a loose
// string map is all they need. `worker-configuration.d.ts` is excluded in
// tsconfig.json and gitignored so running `npm run generate-types` stays
// harmless.

declare module 'cloudflare:workers' {
  /**
   * Worker runtime bindings and secrets: `.dev.vars` locally,
   * `npx wrangler secret put <NAME>` in production.
   */
  export const env: Record<string, string | undefined>;
}

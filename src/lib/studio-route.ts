// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The site owns the /studio page (PORTS.md card 120)
// =============================================================================
// @sanity/astro used to inject /studio itself, from a page in node_modules: the
// tab said "Sanity Studio", the icon was Sanity's red S and the body had no
// background, so every load opened on a blank white page (a white flash in dark
// mode) until React arrived. src/pages/studio/index.astro is now the site's own
// page with the site's title, icons and a branded splash; this file holds the
// two pieces of build plumbing it needs.
//
// 1. studioConfigModule(): a Vite plugin that serves the `sanity:studio`
//    module. @sanity/astro's StudioComponentHash (the React side we still use,
//    public export `@sanity/astro/studio/studio-component.tsx`) reads the
//    Studio config from that module. The integration only provides it when
//    `studioBasePath` is set, and setting `studioBasePath` also injects
//    Sanity's own /studio page, which would collide with ours. So astro.config
//    drops `studioBasePath` and this plugin answers the import instead, with
//    exactly what the integration produced for a single workspace in hash
//    mode: the repo-root sanity.config with `basePath: '/'`. `enforce: 'pre'`
//    puts it ahead of the integration's own resolver.
//
// 2. pickWordmark(): the brand logo the Studio navbar shows, resolved to a
//    built asset URL at build time (see the page).
// =============================================================================

import type { Plugin } from 'vite';

/** The module id @sanity/astro's studio component imports its config from. */
export const STUDIO_CONFIG_MODULE = 'sanity:studio';
const RESOLVED_ID = '\0ncs:studio-config';

/** The source of the `sanity:studio` module for a given sanity.config path. */
export function studioConfigModuleSource(configId: string): string {
  return [
    `import studioConfig from ${JSON.stringify(configId)};`,
    // Hash history (/studio/#/structure/...): the workspace lives at "/" inside
    // the hash, the same value @sanity/astro gives a single workspace.
    `export const config = Array.isArray(studioConfig)`,
    // Several workspaces (none in this family yet) get "/<name-slug>" each.
    `  ? studioConfig.map((w, i, all) => ({ ...w, basePath: all.length === 1 ? '/' : '/' + (String(w.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace-' + (i + 1)) }))`,
    `  : { ...studioConfig, basePath: '/' };`,
    '',
  ].join('\n');
}

/** Vite plugin: serves `sanity:studio` from the repo-root sanity.config. */
export function studioConfigModule(): Plugin {
  return {
    name: 'ncs:studio-config-module',
    enforce: 'pre',
    resolveId(id) {
      return id === STUDIO_CONFIG_MODULE ? RESOLVED_ID : null;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return null;
      const resolved = await this.resolve('/sanity.config');
      if (!resolved) {
        throw new Error('[studio-route] The Studio needs a sanity.config.ts at the repo root.');
      }
      return studioConfigModuleSource(resolved.id);
    },
  };
}

/** The wordmark the Studio's navbar draws: a built URL and its width:height ratio. */
export interface StudioWordmark {
  src: string;
  /** Width over height of what shows (the crop when there is one), or null if unknown. */
  ratio: number | null;
}

/** What the page hands the Studio's navbar (#ncs-studio-boot). */
export interface StudioBootData {
  wordmark: StudioWordmark | null;
}

const VIEW = /^\s*-?[\d.]+(\s*,\s*-?[\d.]+){3}\s*$/;

/**
 * The built URL of a brand logo, from an `import.meta.glob` of src/assets
 * (keys like `/src/assets/logo-dark.svg`) and a brand.config.json logoPaths
 * entry (`src/assets/logo-dark.svg`). `view` is an optional SVG crop
 * ("x,y,width,height" in the file's own viewBox units), sent as an
 * `#svgView(viewBox(...))` fragment so a lockup can show its words only. The
 * ratio lets the navbar size the image box to the crop: an <img> otherwise keeps
 * the whole file's proportions and letterboxes the crop inside them.
 * Anything missing or odd gives null, and the navbar then shows no wordmark.
 */
export function pickWordmark(
  assets: Record<string, unknown>,
  logoPath: unknown,
  view?: string | null,
): StudioWordmark | null {
  if (typeof logoPath !== 'string' || !logoPath.trim()) return null;
  const key = '/' + logoPath.trim().replace(/^\.?\/+/, '');
  const mod = assets[key] as { src?: unknown; width?: unknown; height?: unknown } | string;
  const src = typeof mod === 'string' ? mod : mod && typeof mod.src === 'string' ? mod.src : null;
  if (!src) return null;
  if (view && VIEW.test(view) && /\.svg(\?|$)/i.test(src)) {
    const [, , w, h] = view.split(',').map((n) => Number(n.trim()));
    return {
      src: `${src}#svgView(viewBox(${view.replace(/\s+/g, '')}))`,
      ratio: w > 0 && h > 0 ? Math.round((w / h) * 1000) / 1000 : null,
    };
  }
  const w = typeof mod === 'object' ? Number(mod.width) : NaN;
  const h = typeof mod === 'object' ? Number(mod.height) : NaN;
  return { src, ratio: w > 0 && h > 0 ? Math.round((w / h) * 1000) / 1000 : null };
}

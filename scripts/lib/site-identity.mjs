// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
/**
 * site-identity.mjs - the site's name and absolute URL for scripts that write
 * them into a published file (generate-llms-full.mjs today).
 *
 * WHY THIS EXISTS (PORTS.md card 81, promoted from fbcm 2026-10-03)
 * generate-llms-full.mjs used to fall back to the literal strings 'Studio
 * Starter' and 'https://example.com' when SITE_NAME / PUBLIC_SITE_URL were not
 * in the environment. A fork that had filled in brand/brand.config.json (the
 * committed source of truth for identity, written to src/data/site.ts by
 * apply-brand) but never set those env vars therefore published another
 * business's name and a dead domain in a file whose whole purpose is to be
 * ingested and repeated by language models. A build, a type check and a test
 * all pass on that: the code is right and only the noun is wrong.
 *
 * ORDER, per field: env, then brand/brand.config.json, then today's placeholder.
 * The last step is the backward-compatible part: a repo with no brand config, an
 * unreadable one, or one without the field behaves exactly as before. This
 * module never throws and never exits, so it cannot fail a build.
 *
 * URL SHAPE: `https://<brand.domain>`, the apex, to match `url` in
 * src/data/site.ts (`https://${_domain}`). A site served from www sets
 * PUBLIC_SITE_URL, which wins.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PLACEHOLDER_NAME = 'Studio Starter';
export const PLACEHOLDER_SITE = 'https://example.com';

/** brand/brand.config.json under `root`, or {} when missing, unreadable or not an object. */
export function readBrandConfig(root) {
  try {
    const parsed = JSON.parse(readFileSync(resolve(root, 'brand/brand.config.json'), 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');

/**
 * @param {{ env: Record<string, string | undefined>, brand?: Record<string, unknown> }} args
 * @returns {{ siteName: string, site: string, fallback: { name: boolean, site: boolean } }}
 *   `fallback.*` is true when that field fell all the way back to the placeholder.
 */
export function resolveSiteIdentity({ env, brand = {} }) {
  // Env keeps `??` semantics (an explicitly empty value still wins), as before.
  const envName = env.SITE_NAME;
  const envSite = env.PUBLIC_SITE_URL ?? env.SITE_URL;

  const brandName = clean(brand.name);
  const domain = clean(brand.domain)
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  const siteName = envName ?? (brandName || PLACEHOLDER_NAME);
  const site = envSite ?? (domain ? `https://${domain}` : PLACEHOLDER_SITE);

  return {
    siteName,
    site,
    fallback: {
      name: envName === undefined && !brandName,
      site: envSite === undefined && !domain,
    },
  };
}

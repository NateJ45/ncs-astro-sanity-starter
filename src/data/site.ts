// Safe to edit by hand
// Static identity values that don't change between deploys.
// Content editors update their fields through Sanity instead — see studio/ and src/lib/queries.ts.
// Replace these placeholders with your project's real values before launch.

/** Slugify a display name for use in localStorage key prefixes.
 *  "Studio Starter" -> "studio-starter"
 *  "My Client & Co." -> "my-client-co"
 *  Keeps apply-brand from ever needing to rewrite these fields — they stay
 *  in sync automatically whenever `name` is updated.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// apply-brand rewrites the two quoted strings on `name:` and `domain:` below.
// All derived fields (studio, storageKeyPrefix, themeStorageKey) are computed
// from `name` at module load time — they are never rewritten by the script and
// can never go stale across reskins.
const _name   = "Studio Starter";
const _domain = "example.com";
const _slug   = slugify(_name);

export const site = {
  name:   _name,
  domain: _domain,
  url: `https://${_domain}`,
  // BCP 47 language tag for the <html lang> attribute. Change if the site is not in English.
  lang: "en",

  /** Short display name alias — same as name, kept for any consumer that
   *  accessed the old `site.studio` property. */
  studio: _name,

  /** localStorage key prefix derived from name — e.g. "studio-starter".
   *  Never needs to be touched by apply-brand; updates automatically. */
  storageKeyPrefix: _slug,

  /** localStorage key for theme preference — e.g. "studio-starter-theme".
   *  Never needs to be touched by apply-brand; updates automatically. */
  themeStorageKey: _slug + '-theme',

  // Brand colors are also declared in src/styles/globals.css.
  // Mirrored here for any script that needs them outside CSS (OG generator, structured data, etc.).
  brandColors: {
    primary: "#586577",       // Slate
    primaryDark: "#434E5C",   // Slate Dark
    accent: "#2A2D31",        // Ink
    accentDark: "#1E2024",    // Ink Dark
    secondary: "#AAB0B8",     // Cool Gray
    tertiary: "#9DB0A6",      // Muted Sage
    bg: "#FBFBFA",            // Paper
    bgSoft: "#F3F4F2",        // Soft Paper
    border: "#E6E7E5",        // Faint dividers
  },

  // Static asset paths under public/
  // Note: the logo files are in `src/assets/` and are imported directly
  // by Header.astro / Footer.astro so Astro's <Image> component can emit
  // optimized WebP variants with content-hashed filenames. The keys below
  // stay only for the OG image + favicon, which are still served straight
  // from public/.
  assets: {
    ogDefault: "/og-default.png",
    favicon: "/favicon.svg",
  },

  // Public repo URL (used in footer credit if shown)
  repo: "",
};

export type Site = typeof site;

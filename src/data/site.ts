// Safe to edit by hand
// Static identity values that don't change between deploys.
// Anything Staci edits goes through Sanity instead — see studio/ and src/lib/queries.ts.

export const site = {
  name: "Reid Design LLC",
  studio: "Reid Design LLC",
  domain: "reiddesignllc.com",
  url: "https://reiddesignllc.com",
  storageKeyPrefix: "reid-design",
  themeStorageKey: "reid-design-theme",

  // Brand colors are also declared in src/styles/globals.css.
  // Mirrored here for any script that needs them outside CSS (OG generator, structured data, etc.).
  brandColors: {
    primary: "#9C7661",       // Warm Bronze
    primaryDark: "#7A5D4C",   // Bronze Dark
    accent: "#3D3D3D",        // Charcoal
    accentDark: "#2A2A2A",    // Charcoal Dark
    secondary: "#B8A99A",     // Warm Taupe
    tertiary: "#A8B5A0",      // Soft Sage
    bg: "#FAF8F5",            // Soft Linen
    bgSoft: "#F5F0EB",        // Cream
    border: "#E8E4E0",        // Light Gray
  },

  // Static asset paths under public/
  // Note: the logo files moved to `src/assets/` and are now imported directly
  // by Header.astro / Footer.astro so Astro's <Image> component can emit
  // optimized WebP variants with content-hashed filenames. The keys below
  // stay only for the OG image + favicon, which are still served straight
  // from public/.
  assets: {
    ogDefault: "/og-default.png",
    favicon: "/favicon.svg",
  },

  // Public repo URL (used in footer credit if shown)
  repo: "https://github.com/NateJ45/reid-design-site",
} as const;

export type Site = typeof site;

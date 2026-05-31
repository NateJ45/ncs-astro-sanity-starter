// Safe to edit by hand
// Static identity values that don't change between deploys.
// Content editors update their fields through Sanity instead — see studio/ and src/lib/queries.ts.
// Replace these placeholders with your project's real values before launch.

export const site = {
  name: "Studio Starter",
  studio: "Studio Starter",
  domain: "example.com",
  url: "https://example.com",
  storageKeyPrefix: "studio-starter",
  themeStorageKey: "studio-starter-theme",

  // Brand colors are also declared in src/styles/globals.css.
  // Mirrored here for any script that needs them outside CSS (OG generator, structured data, etc.).
  brandColors: {
    primary: "#586577",       // Slate
    primaryDark: "#3E4A57",   // Slate Dark
    accent: "#2A2D31",        // Ink
    accentDark: "#1A1D20",    // Ink Dark
    secondary: "#8E9DAD",     // Slate Mid
    tertiary: "#A8B5C2",      // Slate Light
    bg: "#FBFBFA",            // Paper
    bgSoft: "#F4F4F2",        // Paper Soft
    border: "#E2E4E6",        // Border Gray
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
} as const;

export type Site = typeof site;

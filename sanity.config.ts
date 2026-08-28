// Foundation, edit with care
// =============================================================================
// Sanity Studio configuration - loaded by the EMBEDDED /studio
// =============================================================================
// The studio lives in the SAME package as the site (folded in from the old
// nested studio/ package on 2026-08-28). One node_modules, one copy of every
// module, which is what keeps the styled-components / @sanity/ui theme context
// intact: a nested studio package gives two module instances of
// styled-components, so the ThemeProvider mounted by one is invisible to
// useTheme in the other and the desk dies on its first custom-component render
// (styled-components error #18, then "Cannot read properties of undefined
// (reading 'v2')") while the login screen renders fine. That was presacademy's
// 2026-08-26 production outage; see PORTS.md card 10.
//
// @sanity/astro mounts this config at /studio (see astro.config.mjs); the
// sanity CLI (sanity.cli.ts) uses it for typegen and dataset commands.
//
// FOR A NEW PROJECT: set PUBLIC_SANITY_PROJECT_ID in .env (and
// SANITY_STUDIO_PROJECT_ID if you also drive the CLI), change `name` and
// `title` below, and add your deployed origin to the project's CORS allow list
// (`npx sanity cors add https://your-site.workers.dev --credentials`).

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { buildTheme, type RootTheme, type ThemeFont } from '@sanity/ui/theme';
import { visionTool } from '@sanity/vision';
import { media } from 'sanity-plugin-media';
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash';
import { schemaTypes } from './src/sanity/schemaTypes';
import { deskStructure } from './src/sanity/structure';
import { resolve } from './src/sanity/resolve';
import { PreviewNavigator } from './src/sanity/components/PreviewNavigator';
import { envVal } from './src/sanity/urls';
import StudioLogo from './src/sanity/components/StudioLogo';
import { CharacterCountInput } from './src/sanity/components/CharacterCountInput';
import { documentBadges } from './src/sanity/components/documentBadges';
import { shareDraftLinkAction } from './src/sanity/components/shareDraftLink';

// =============================================================================
// Studio theme
// =============================================================================
// @sanity/ui's buildTheme() ships BOTH a light and a dark color scheme, so the
// Studio's Appearance toggle (System / Light / Dark) works properly. Only the
// FONT families are overridden here.
//
// This replaced buildLegacyTheme(), which was light-ONLY: it hard-codes white
// component backgrounds and dark text, so flipping the Studio to Dark left
// every panel white. The brand now lives in the logo and the guide-card
// accents rather than in tinted Studio chrome.
//
// The families have to go INTO buildTheme({ font }): it bakes the CSS at build
// time, and a post-hoc `theme.fonts.family` patch is ignored. Point these at
// whatever `npm run apply-brand` writes into globals.css; the stacks below end
// in system fallbacks so a fresh clone with no font files still reads well.
// =============================================================================
// These two lines are REWRITTEN by `npm run apply-brand` from
// brand/brand.config.json (studio.fonts.display / studio.fonts.body). Keep them
// as single-quoted one-line string literals or the rewrite will not match.
const DISPLAY_STACK = '"Libre Baskerville", Georgia, "Times New Roman", serif';
const BODY_STACK = '"Inter Variable", system-ui, -apple-system, sans-serif';

function withFamily(font: ThemeFont, family: string): ThemeFont {
  return { ...font, family };
}

const themeDefaults = buildTheme();
const studioTheme: RootTheme = buildTheme({
  font: {
    ...themeDefaults.fonts,
    text: withFamily(themeDefaults.fonts.text, BODY_STACK),
    label: withFamily(themeDefaults.fonts.label, BODY_STACK),
    heading: withFamily(themeDefaults.fonts.heading, DISPLAY_STACK),
  },
});

// Dev detection must FAIL CLOSED. An earlier version elsewhere in the family
// also treated `process.env.NODE_ENV !== 'production'` as dev, but the
// Astro/Vite client bundle injects `globalThis.process ??= {}`, so `process`
// exists with an empty env and NODE_ENV is undefined, which made that true in
// PRODUCTION and shipped the Vision tool to editors.
const IS_DEV =
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

export default defineConfig({
  name: 'my-studio',
  // Short title shown in the browser tab when editing. Update per project.
  title: 'My Studio',

  projectId:
    envVal('SANITY_STUDIO_PROJECT_ID', 'PUBLIC_SANITY_PROJECT_ID') || 'placeholder-project-id',
  dataset: envVal('SANITY_STUDIO_DATASET', 'PUBLIC_SANITY_DATASET') || 'production',

  theme: studioTheme,

  // Studio chrome overrides. Logo replaces the default Sanity wordmark.
  studio: {
    components: {
      logo: StudioLogo,
    },
  },

  // Global form customization. Registering the character-count input once here
  // applies it to every capped text field across all schemas. The component
  // falls through to the default input for anything that isn't a string/text
  // field with a max length, so it's safe as a global wrapper.
  form: {
    components: {
      input: CharacterCountInput,
    },
  },

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    // Click-to-edit live preview against the Studio-only /preview/* routes
    // (never the real public pages: see src/sanity/resolve.ts and the site's
    // src/pages/preview/). previewMode only sets `enable`, because `disable` is
    // a documented no-op in this Sanity version, so exiting preview is a plain
    // link to /api/draft-mode/disable (see PreviewLayout.astro). The relative
    // URLs assume the EMBEDDED /studio, i.e. same origin as the site.
    //
    // REQUIRES the SANITY_TOKEN runtime secret. Without it the preview routes
    // fail closed and this tool shows an error page rather than draft content;
    // see .dev.vars.example and docs/agent/deployment.md.
    presentationTool({
      resolve,
      previewUrl: {
        initial: '/preview',
        previewMode: { enable: '/api/draft-mode/enable' },
      },
      // The Squarespace-style page list beside the preview: click a page, the
      // preview jumps there and the edit panel follows.
      components: {
        unstable_navigator: {
          component: PreviewNavigator,
          minWidth: 160,
          maxWidth: 280,
        },
      },
    }),
    // Unsplash plugin - adds an "Unsplash" tab to every image picker. The
    // package's correct registration is via the plugins array (not
    // form.image.assetSources). Held at 7.0.15: newer versions demand
    // @sanity/ui ^3.4, which would drag the pinned 3.3.5 forward.
    unsplashImageAsset(),
    // Media browser - a top-level "Media" icon in the Studio sidebar for
    // browsing every uploaded image at once with tag + filter + bulk-edit.
    media(),
    // Vision (GROQ query runner) is a developer tool, not an editor tool.
    // Gate it to local dev so it doesn't clutter the deployed Studio.
    ...(IS_DEV ? [visionTool()] : []),
  ],

  schema: {
    types: schemaTypes,
  },

  // Singleton enforcement: hide these from the global "+" create menu so editors
  // can't make duplicates. Reusable content types stay available.
  document: {
    // Custom at-a-glance status badges (Featured / Needs a photo / Add SEO)
    // rendered next to the publish status. Keep Sanity's built-in badges and
    // append ours.
    badges: (prev) => [...prev, ...documentBadges],
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter((option) => !SINGLETON_TYPES.has(option.templateId));
      }
      return prev;
    },
    actions: (prev, { schemaType }) => {
      const base = SINGLETON_TYPES.has(schemaType)
        ? prev.filter(({ action }) => !['unpublish', 'delete', 'duplicate'].includes(action || ''))
        : prev;
      // "Copy share link" sits in the publish menu of every document that has a
      // page of its own; the action returns null for the rest, so appending it
      // unconditionally is safe. See src/sanity/components/shareDraftLink.tsx.
      return [...base, shareDraftLinkAction];
    },
  },
});

// Singleton document types - one instance each, not duplicable.
const SINGLETON_TYPES = new Set<string>([
  'siteSettings',
  'businessInfo',
  'homePage',
  'aboutPage',
  'processPage',
  'servicesPage',
  'faqPage',
  'contactPage',
  'journalPage',
  'notFoundPage',
  'privacyPage',
  'studioGuide',
  'studioNotes',
  'studioPlaybook',
]);

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
// SANITY_STUDIO_PROJECT_ID if you also drive the CLI), change `name` below
// (the title comes from brand.config.json), and add your deployed origin to the project's CORS allow list
// (`npx sanity cors add https://your-site.workers.dev --credentials`).

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { media } from 'sanity-plugin-media';
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash';
import { schemaTypes } from './src/sanity/schemaTypes';
import { PAGE_TEMPLATES } from './src/sanity/pageTemplates';
import { deskStructure } from './src/sanity/structure';
import { resolve } from './src/sanity/resolve';
import { PreviewNavigator } from './src/sanity/components/PreviewNavigator';
import { envVal } from './src/sanity/urls';
import { StudioIcon } from './src/sanity/components/StudioIdentity';
import { buildStudioTheme, seedLightScheme } from './src/sanity/studioTheme';
import {
  studioLook,
  StudioWordmarkNavbar,
  withEditorTypography,
} from './src/sanity/components/StudioLook';
// The Studio's edges: sign-in line, wording, navbar wordmark (card 120).
import { studioWording } from './src/sanity/studioWording';
import { studioEdges } from './src/sanity/studioEdges.config';
// The site's own font files for the Studio (rewritten by apply-brand; card 116).
import './src/sanity/studioFonts.css';
import brand from './brand/brand.config.json';
import { CharacterCountInput } from './src/sanity/components/CharacterCountInput';
import { documentBadges } from './src/sanity/components/documentBadges';
import { shareDraftLinkAction } from './src/sanity/components/shareDraftLink';
import {
  archivePageAction,
  duplicatePageAction,
  PAGE_OPS_TYPES,
} from './src/sanity/components/pageActions';
import { withSlugRedirect } from './src/sanity/components/slugRedirect';
import { SaveSectionPresetAction } from './src/sanity/actions/saveSectionPreset';
import { CheckPageAction } from './src/sanity/actions/checkPage';
import { UndoAction, RedoAction, undoRedoShortcuts } from './src/sanity/components/UndoRedo';
import { PAGE_BUILDER_TYPES } from './src/sanity/pageBuilderConfig';
import { ncsStudioKit } from './src/sanity/kit';
// Writing suggestions under chosen fields (PORTS.md card 122).
import { ncsWritingHelp } from './src/sanity/ai';
import { kitConfig } from './src/sanity/kit.config';
import { ncsWorkflowTools } from './src/sanity/workflow';
import { brandIcons, typeIcon, withBrandPreviews } from './src/sanity/brandIcons';

// =============================================================================
// Studio theme
// =============================================================================
// The theme is built in src/sanity/studioTheme.ts from brand.config.json
// (PORTS.md cards 110 and 116): a warm paper, the brand accent, re-hued greys,
// the brand's fonts and radius, in BOTH schemes so the Appearance menu works.
// Light is the default for new editors (seedLightScheme). The navbar's navy
// chrome and the Portable Text typography are StudioLook.tsx.
//
// The families have to go INTO buildTheme({ font }): it bakes the CSS at build
// time, and a post-hoc `theme.fonts.family` patch is ignored. The font files
// themselves load from src/sanity/studioFonts.css, imported above.
// =============================================================================
// These two lines are REWRITTEN by `npm run apply-brand` from
// brand/brand.config.json (studio.fonts.display / studio.fonts.body). Keep them
// as single-quoted one-line string literals or the rewrite will not match.
const DISPLAY_STACK = '"Libre Baskerville", Georgia, "Times New Roman", serif';
const BODY_STACK = '"Inter Variable", system-ui, -apple-system, sans-serif';
const STUDIO_FONTS = { display: DISPLAY_STACK, body: BODY_STACK };

const studioTheme = buildStudioTheme(STUDIO_FONTS);
seedLightScheme();

// The Studio tab's title and icons come from the site's own /studio page
// (src/pages/studio/index.astro, card 120), so no runtime swap is needed.
const wording = studioWording(brand.name, studioEdges);

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
  // The site's own name and mark (PORTS.md card 110). Both come from the brand,
  // so a reskin renames the Studio too: `title` is brand.config.json `name`,
  // the icon is public/favicon.svg. (The old `studio.components.logo` is
  // deprecated and was never drawn; the login screen showed "My Studio".)
  title: brand.name,
  icon: StudioIcon,
  // The line under the name on the sign-in card (card 120).
  subtitle: wording.subtitle,
  // The site's words on Sanity's screens: signed-out notice, user menu.
  i18n: { bundles: wording.bundles },
  // The wordmark beside the icon. At the ROOT on purpose: the root's middleware
  // sits innermost, right around Sanity's bar (see StudioLook.tsx).
  studio: { components: { navbar: StudioWordmarkNavbar } },

  projectId:
    envVal('SANITY_STUDIO_PROJECT_ID', 'PUBLIC_SANITY_PROJECT_ID') || 'placeholder-project-id',
  dataset: envVal('SANITY_STUDIO_DATASET', 'PUBLIC_SANITY_DATASET') || 'production',

  theme: studioTheme,

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
        previewMode: { enable: '/api/draft-mode/enable/' },
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
    // form.image.assetSources). Version is part of the matched Sanity set
    // (.claude/rules/dependencies.md rule 8, PORTS.md card 103).
    unsplashImageAsset(),
    // Media browser - a top-level "Media" icon in the Studio sidebar for
    // browsing every uploaded image at once with tag + filter + bulk-edit.
    media(),
    // Vision (GROQ query runner) is a developer tool, not an editor tool.
    // Gate it to local dev so it doesn't clutter the deployed Studio.
    ...(IS_DEV ? [visionTool()] : []),
    // Ctrl+Z / Ctrl+Shift+Z (Cmd on a Mac) for everything that is not typing:
    // sections added, dragged or removed, photos cleared, options changed
    // (PORTS.md card 27). The buttons are the two document actions below; this
    // plugin only adds the keyboard layer, and it stays out of text boxes so
    // their own undo keeps working. See src/sanity/components/UndoRedo.tsx.
    undoRedoShortcuts(),
    // Navy chrome for the top bar (StudioLook.tsx, PORTS.md card 116).
    studioLook(STUDIO_FONTS),
    // Share a preview, Messages, the previewShare type (PORTS.md card 117).
    // Before the kit, so the kit's tool order and staff view place "messages".
    ncsWorkflowTools({
      shareTypes: [
        'homePage',
        'aboutPage', // scaffold: about
        'servicesPage', // scaffold: services
        'processPage', // scaffold: process
        'faqPage', // scaffold: faq
        'contactPage',
        'journalPage', // scaffold: journal
        'privacyPage',
        'page',
      ],
    }),
    // "Suggest" buttons under the Google description, photo descriptions and
    // summaries, and "Improve this paragraph" in rich text (card 122). They
    // appear only once the Worker has ANTHROPIC_API_KEY; nothing is written
    // until the editor presses "Use this".
    ncsWritingHelp(),
    // The Studio kit (src/sanity/kit/, settings in src/sanity/kit.config.ts):
    // Home, Site Guide and Checkup tools, plain tool names, the staff view,
    // Trash instead of Delete, the note after Publish and the first-run tour.
    // KEEP IT LAST: its tools reducer has to see every other plugin's tools.
    // See docs/agent/studio-kit.md and PORTS.md card 106.
    ncsStudioKit(kitConfig),
    // Icons by meaning on every tool, and on plugin-registered types (card 119,
    // src/sanity/brandIcons.tsx). After the kit so its tools get icons too; it
    // only swaps icons, so the kit still decides what shows and in what order.
    brandIcons(),
  ],

  schema: {
    // Portable Text styles drawn in the site's fonts (StudioLook.tsx, card 116).
    // Every document type gets its icon and a picture in list rows (card 119).
    types: withBrandPreviews(withEditorTypography(schemaTypes, STUDIO_FONTS)),
    // Page templates (the authoring kit, PORTS.md card 109): the starting
    // points offered when someone makes a Custom page. The list is the site's
    // own, in src/sanity/pageTemplates.ts. `value` is a function so every new
    // page gets fresh _keys. The stock 'page' template stays registered (links
    // and intents that name it keep working); newDocumentOptions below hides it
    // from the menus, where "Blank page" stands in for it.
    templates: (prev) => [
      ...prev,
      ...PAGE_TEMPLATES.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        schemaType: 'page',
        icon: typeIcon('page'),
        value: () => ({ pageBuilder: t.sections() }),
      })),
    ],
  },

  // Singleton enforcement: hide these from the global "+" create menu so editors
  // can't make duplicates. Reusable content types stay available.
  document: {
    // Custom at-a-glance status badges (Featured / Needs a photo / Add SEO)
    // rendered next to the publish status. Keep Sanity's built-in badges and
    // append ours.
    badges: (prev) => [...prev, ...documentBadges],
    newDocumentOptions: (prev, { creationContext }) => {
      // Custom pages are made from a page template; the bare stock one is
      // hidden because "Blank page" is the same thing with a clearer name.
      const options = PAGE_TEMPLATES.length
        ? prev.filter((option) => option.templateId !== 'page')
        : prev;
      if (creationContext.type === 'global') {
        return options.filter((option) => !SINGLETON_TYPES.has(option.templateId));
      }
      return options;
    },
    actions: (prev, { schemaType }) => {
      let base = SINGLETON_TYPES.has(schemaType)
        ? prev.filter(({ action }) => !['unpublish', 'delete', 'duplicate'].includes(action || ''))
        : prev;

      // Pages as first-class objects (PORTS.md card 21). On the `page` type the
      // stock "Duplicate" is replaced: it copies the web address too, so the
      // copy is a second document claiming an address that is already taken.
      // See src/sanity/components/pageActions.tsx.
      if (PAGE_OPS_TYPES.has(schemaType)) {
        base = base.filter(({ action }) => action !== 'duplicate');
      }

      // Safe rename (PORTS.md card 21): Publish files an old-address ->
      // new-address redirect first when the address changed. The wrapper is
      // memoized by the action it wraps, so this resolver may run on every
      // render without remounting the publish button.
      base = base.map((action) =>
        action.action === 'publish' ? withSlugRedirect(action) : action,
      );

      // "Copy share link" sits in the publish menu of every document that has a
      // page of its own; the action returns null for the rest, so appending it
      // unconditionally is safe. See src/sanity/components/shareDraftLink.tsx.
      // The two page actions return null for every type but `page`.
      //
      // Page-builder helpers (PORTS.md card 24): "Save a section as preset..."
      // keeps one band of this page for reuse, and "Check this page..." reads
      // the draft back for missing photo descriptions, empty sections and odd
      // links. Both are offered only where a page-builder array exists, which
      // is one list in src/sanity/pageBuilderConfig.ts.
      //
      // Undo / Redo (PORTS.md card 27) sit beside them, on the page-builder
      // types for the same reason: a page is where a mis-drag or a wrong
      // background actually costs something, and where "which change do you
      // mean?" has an obvious answer. The keyboard shortcut is registered
      // separately, by the plugin in the plugins array above.
      const pageHelpers = PAGE_BUILDER_TYPES.has(schemaType)
        ? [SaveSectionPresetAction, CheckPageAction, UndoAction, RedoAction]
        : [];

      return [
        ...base,
        duplicatePageAction,
        archivePageAction,
        ...pageHelpers,
        shareDraftLinkAction,
      ];
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
]);

// Foundation, edit with care
// Sanity Studio configuration for the ncs-astro-sanity-starter template.
// Replace SANITY_STUDIO_PROJECT_ID in studio/.env with the real ID from
// manage.sanity.io after running `sanity init` (or after creating the project
// manually). Studio reads it via the cli config — see sanity.cli.ts for
// runtime overrides.

import { defineConfig, buildLegacyTheme } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { media } from 'sanity-plugin-media';
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash';
import { Iframe } from 'sanity-plugin-iframe-pane';
import { schemaTypes } from './schemaTypes';
import { deskStructure } from './structure';
import StudioLogo from './components/StudioLogo';
import { CharacterCountInput } from './components/CharacterCountInput';
import { documentBadges } from './components/documentBadges';

// Brand theme for the Studio UI. Uses Sanity's legacy theme builder which
// maps a handful of CSS custom properties to the Studio's full internal design
// system (it derives the complete light + dark palette from these inputs).
// Slate primary (#586577) — update to match your brand's primary action color.
//
// The three "foundation" values do the heavy lifting: a near-black, a near-white,
// and a gray-base tint every neutral surface, border, and muted label toward the
// site's Paper-and-Ink feel instead of Sanity's stock cool gray. The state colors
// keep inline validation and the custom document badges visually consistent.
const studioThemeProps = {
  // Foundation — neutrals everything else derives from.
  '--black': '#2A2D31',   // Ink
  '--white': '#FBFBFA',   // Paper
  '--gray-base': '#586577', // Slate

  // Brand accent.
  '--brand-primary': '#586577',
  '--brand-primary--inverted': '#ffffff',
  '--focus-color': '#586577',

  // Paper surfaces for inputs and components.
  '--input-bg': '#F3F4F2',
  '--component-bg': '#F3F4F2',
  '--component-text-color': '#2A2D31',

  // Buttons.
  '--default-button-color': '#586577',
  '--default-button-primary-color': '#586577',
  '--default-button-success-color': '#43a85e',
  '--default-button-warning-color': '#d99a3f',
  '--default-button-danger-color': '#e34141',

  // Validation + status states.
  '--state-success-color': '#43a85e',
  '--state-warning-color': '#d99a3f',
  '--state-danger-color': '#e34141',

  // Top navigation bar.
  '--main-navigation-color': '#2A2D31',
  '--main-navigation-color--inverted': '#FBFBFA',
};

// Assign the props to a const before passing them so TypeScript skips
// excess-property checking. The object keeps a couple of legacy `--*--inverted`
// CSS-variable keys (notably --brand-primary--inverted, which sets white text on
// the primary button) that predate, and aren't included in, Sanity's current
// LegacyThemeProps type. Passing a variable leaves the runtime object
// byte-identical while keeping `tsc --noEmit` clean. Don't inline this back.
const studioTheme = buildLegacyTheme(studioThemeProps);

// Re-export so structure.ts can attach the iframe view to every singleton.
export { Iframe };
// Set this to your deployed Workers URL (e.g. 'https://my-project.workers.dev') after deploy.
export const SITE_URL_FOR_PREVIEW = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321';

// Map doc _type → live-site path. Singletons get a fixed path; slug-based
// docs build the path from the doc's slug. Returns null for types that have
// no viewable page (siteSettings) — the preview pane is hidden for those.
// Exported so structure.ts can call it when wiring per-doc views.
export function urlForDoc(schemaType: string, doc: any): string | null {
  const SITE_URL = SITE_URL_FOR_PREVIEW;
  const slug = doc?.slug?.current;
  switch (schemaType) {
    case 'homePage':      return `${SITE_URL}/`;
    case 'aboutPage':     return `${SITE_URL}/about`;
    case 'processPage':   return `${SITE_URL}/process`;
    case 'servicesPage':  return `${SITE_URL}/services`;
    case 'portfolioPage': return `${SITE_URL}/portfolio`;
    case 'faqPage':       return `${SITE_URL}/faq`;
    case 'contactPage':   return `${SITE_URL}/contact`;
    case 'journalPage':   return `${SITE_URL}/journal`;
    case 'notFoundPage':  return `${SITE_URL}/404`;
    case 'journalEntry':  return slug ? `${SITE_URL}/journal/${slug}` : `${SITE_URL}/journal`;
    case 'project':       return slug ? `${SITE_URL}/portfolio/${slug}` : `${SITE_URL}/portfolio`;
    // New page singletons (Phase 1)
    case 'eDesignPage':   return `${SITE_URL}/e-design`;
    case 'shopPage':      return `${SITE_URL}/shop`;
    case 'giftPage':      return `${SITE_URL}/gift-certificates`;
    case 'resourcesPage': return `${SITE_URL}/resources`;
    case 'privacyPage':   return `${SITE_URL}/privacy`;
    case 'pressPage':     return `${SITE_URL}/press`;
    case 'styleQuiz':     return `${SITE_URL}/quiz`;
    case 'budgetCalculator': return `${SITE_URL}/calculator`;
    // service/processStep/etc don't have individual pages; preview their parent
    case 'service':      return `${SITE_URL}/services`;
    case 'processStep':  return `${SITE_URL}/process`;
    case 'faqItem':      return `${SITE_URL}/faq`;
    // Press items list on /press page
    case 'pressItem':    return `${SITE_URL}/press`;
    // Shop collections/items list on /shop page
    case 'shopCollection': return `${SITE_URL}/shop`;
    case 'shopItem':       return `${SITE_URL}/shop`;
    // Lead magnets preview at /guides/[slug]
    case 'leadMagnet':   return slug ? `${SITE_URL}/guides/${slug}` : `${SITE_URL}/guides`;
    default:             return null;
  }
}

export default defineConfig({
  name: 'my-studio',
  // Short title shown in the browser tab when editing. Update to match your project.
  title: 'My Studio',

  // Set SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET in studio/.env
  // (or as env vars) after creating your Sanity project at sanity.io/manage.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'placeholder-project-id',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  // Brand theme — Slate primary + Paper background.
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
      // Inject an iframe "Preview" tab alongside the form on every document
      // type that has a viewable page. Editing /about? You see the editor on
      // the left, the live About page on the right. Saves the context-switch
      // of opening another tab. Hidden for types like siteSettings that don't
      // map to a page.
      //
      // Note: this only fires for documents opened via paths in the structure
      // that DON'T pre-define their own views. Singletons in structure.ts that
      // use S.document().views([...]) get explicit per-doc views attached
      // there; this default handles everything else (orderable lists, journal
      // entries, the generic document-type lists, etc.).
      defaultDocumentNode: (S, { schemaType }) => {
        const url = urlForDoc(schemaType, {});
        if (!url) return S.document().views([S.view.form()]);
        return S.document().views([
          S.view.form(),
          S.view
            .component(Iframe)
            .options({
              url: (doc: any) => urlForDoc(schemaType, doc) ?? `${SITE_URL_FOR_PREVIEW}/`,
              reload: { button: true },
              defaultSize: 'desktop',
            })
            .title('Preview'),
        ]);
      },
    }),
    // Unsplash plugin — adds an "Unsplash" tab to every image picker. The
    // package's correct registration is via the plugins array (not
    // form.image.assetSources — that was my earlier bug). Picking a photo
    // uploads it to the Sanity library + attaches to the field in one shot.
    unsplashImageAsset(),
    // Media browser — adds a top-level "Media" icon in the Studio sidebar
    // for browsing every uploaded image at once with tag + filter + bulk-edit.
    // Much better than the inline image picker for "what's in our library".
    media(),
    // Vision (GROQ query runner) is a developer tool, not an editor tool.
    // Gate it to local dev so it doesn't clutter the deployed Studio.
    ...(process.env.NODE_ENV !== 'production' ? [visionTool()] : []),
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
      if (SINGLETON_TYPES.has(schemaType)) {
        return prev.filter(
          ({ action }) => !['unpublish', 'delete', 'duplicate'].includes(action || ''),
        );
      }
      return prev;
    },
  },
});

// Singleton document types — one instance each, not duplicable.
const SINGLETON_TYPES = new Set<string>([
  'siteSettings',
  'homePage',
  'aboutPage',
  'processPage',
  'servicesPage',
  'portfolioPage',
  'faqPage',
  'contactPage',
  'journalPage',
  'notFoundPage',
  // New singletons (Phase 1)
  'eDesignPage',
  'shopPage',
  'giftPage',
  'resourcesPage',
  'privacyPage',
  'pressPage',
  'styleQuiz',
  'budgetCalculator',
  'studioGuide',
  'studioNotes',
  'studioPlaybook',
]);

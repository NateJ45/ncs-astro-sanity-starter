// Foundation, edit with care
// =============================================================================
// Presentation Tool location resolver
// (ported from presacademy 2026-08-28; original lineage: the WCP site)
// =============================================================================
// Two halves:
//
//  - `mainDocuments` (URL -> document): as you click through the preview iframe
//    like a normal website, Presentation opens the matching document in the
//    editor panel automatically. Routes match the iframe pathname (which lives
//    under /preview). Order matters: the singleton routes come before the
//    catch-all `page` route.
//
//  - `locations` (document -> URL): the reverse, so opening a document from the
//    desk points the preview at the right page. Singletons map to their fixed
//    preview path; `page` docs resolve from the slug. Collection docs (service,
//    testimonial, faqItem, journalEntry, ...) have no dedicated draft-preview
//    route, so they land on the page they appear on.
//
// The preview routes themselves live in the site app: src/pages/preview/.
// SINGLETON_PREVIEW_PATHS is the SAME map as SINGLETON_BY_PATH in
// src/pages/preview/[...slug].astro, and as FIRST_SEGMENT_PREVIEWABLE in
// src/layouts/PreviewLayout.astro's click interceptor. Three places, one truth:
// change one and change all three.
// =============================================================================
import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from 'sanity/presentation';

/** Preview path per singleton type. */
export const SINGLETON_PREVIEW_PATHS: Record<string, string> = {
  homePage: '/preview',
  aboutPage: '/preview/about',
  servicesPage: '/preview/services',
  processPage: '/preview/process',
  faqPage: '/preview/faq',
  contactPage: '/preview/contact',
  journalPage: '/preview/journal',
  privacyPage: '/preview/privacy',
  notFoundPage: '/preview/404',
};

const previewHref = (slug?: string) => (slug === 'home' ? '/preview' : `/preview/${slug}`);

// One static location entry per singleton.
const singletonLocations = Object.fromEntries(
  Object.entries(SINGLETON_PREVIEW_PATHS).map(([type, href]) => [
    type,
    { locations: [{ title: 'Preview', href }] },
  ]),
);

export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments([
    { route: '/preview', filter: '_type == "homePage"' },
    // Singleton routes before the generic :slug catch-all.
    ...Object.entries(SINGLETON_PREVIEW_PATHS)
      .filter(([type]) => type !== 'homePage')
      .map(([type, href]) => ({ route: href, filter: `_type == "${type}"` })),
    { route: '/preview/:slug', filter: '_type == "page" && slug.current == $slug' },
  ]),
  locations: {
    ...singletonLocations,
    page: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) => {
        const slug = doc?.slug;
        if (!slug) return { locations: [], message: 'Give this page a slug to preview it.' };
        return { locations: [{ title: doc?.title ?? slug, href: previewHref(slug) }] };
      },
    }),
    // Collection docs have no draft-preview route of their own. Send each to
    // the page it renders on, with a note when a detail page exists live.
    journalEntry: {
      locations: [{ title: 'Journal', href: '/preview/journal' }],
      message: 'Journal entry pages preview on the live site after publish.',
    },
    service: { locations: [{ title: 'Services', href: '/preview/services' }] },
    processStep: { locations: [{ title: 'Process', href: '/preview/process' }] },
    philosophyPoint: { locations: [{ title: 'About', href: '/preview/about' }] },
    testimonial: { locations: [{ title: 'Home', href: '/preview' }] },
    faqItem: { locations: [{ title: 'FAQ', href: '/preview/faq' }] },
    faqCategory: { locations: [{ title: 'FAQ', href: '/preview/faq' }] },
    journalCategory: { locations: [{ title: 'Journal', href: '/preview/journal' }] },
    announcement: { locations: [{ title: 'Home', href: '/preview' }] },
    siteSettings: { locations: [{ title: 'Home', href: '/preview' }] },
    businessInfo: { locations: [{ title: 'Contact', href: '/preview/contact' }] },
  },
};

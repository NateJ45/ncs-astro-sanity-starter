// Foundation, edit with care
// =============================================================================
// Studio URL helpers - shared by the repo-root sanity.config.ts, the desk
// structure, and (from Phase C) the Presentation location resolver.
// =============================================================================
// Extracted out of the old studio/sanity.config.ts when the studio folded into
// the root package (2026-08-28). Components import this small sibling module
// instead of reaching up to the repo-root config file, which keeps the config
// free to import them without a cycle.

// -----------------------------------------------------------------------------
// Env access that works in BOTH bundlers. The sanity CLI defines
// process.env.SANITY_STUDIO_*; the EMBEDDED /studio (bundled by Astro/Vite) has
// no `process` global at all in the browser and exposes PUBLIC_* vars on
// import.meta.env instead. A bare `process.env.X` read would throw a
// ReferenceError the moment the embedded studio chunk evaluates.
// -----------------------------------------------------------------------------
export const envVal = (...names: string[]): string | undefined => {
  for (const n of names) {
    const fromProcess = typeof process !== 'undefined' ? process.env?.[n] : undefined;
    if (fromProcess) return fromProcess;
    const fromVite = (import.meta as { env?: Record<string, string | undefined> }).env?.[n];
    if (fromVite) return fromVite;
  }
  return undefined;
};

// Preview/site base used by urlForDoc. A fresh clone has no deployed URL yet,
// so this defaults to the local dev server; set SANITY_STUDIO_PREVIEW_URL (or
// PUBLIC_SITE_URL) to the real origin once the project is deployed.
export const SITE_URL_FOR_PREVIEW =
  envVal('SANITY_STUDIO_PREVIEW_URL', 'PUBLIC_SITE_URL') || 'http://localhost:4321';

// Map doc _type -> live-site PATH (no host). Singletons get a fixed path;
// slug-based docs build it from the slug. Returns null for types with no public
// page of their own (siteSettings, businessInfo, the studio help documents).
//
// Two callers depend on this staying accurate: the "view it live" affordances
// in the Studio, and src/sanity/resolve.ts, which turns these paths into the
// Presentation tool's document <-> URL mapping.
export function pathForDoc(schemaType: string, doc: any): string | null {
  const slug = doc?.slug?.current;
  switch (schemaType) {
    // Core page singletons
    case 'homePage':      return '/';
    case 'aboutPage':     return '/about';
    case 'servicesPage':  return '/services';
    case 'processPage':   return '/process';
    case 'faqPage':       return '/faq';
    case 'contactPage':   return '/contact';
    case 'journalPage':   return '/journal';
    case 'privacyPage':   return '/privacy';
    case 'notFoundPage':  return '/404';
    // Collections with their own detail route
    case 'journalEntry':  return slug ? `/journal/${slug}` : '/journal';
    // Collections that render inside a parent page
    case 'service':         return '/services';
    case 'processStep':     return '/process';
    case 'philosophyPoint': return '/about';
    case 'testimonial':     return '/';
    case 'faqItem':         return '/faq';
    case 'faqCategory':     return '/faq';
    case 'journalCategory': return '/journal';
    // Generic custom pages live at /<slug>.
    case 'page':          return slug ? `/${slug}` : null;
    default:              return null;
  }
}

/** Full URL on the preview/site base. */
export function urlForDoc(schemaType: string, doc: any): string | null {
  const path = pathForDoc(schemaType, doc);
  return path === null ? null : `${SITE_URL_FOR_PREVIEW}${path}`;
}

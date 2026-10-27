// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// cta-href: one Sanity ctaBlock becomes one path (PORTS.md card 187)
// =============================================================================
// CtaLink.astro used to hold this resolver inside its frontmatter, so anything
// that needed to know where a button GOES (the page's accent-button budget, a
// link card that should behave like a button, a "does this repeat the header
// button?" check) had to copy it. It now lives here, pure and unit-tested;
// CtaLink still owns the button markup.
//
// Page types map to routes through SINGLETON_LIVE_PATHS (src/lib/nav-href.ts),
// the same table the menus use, so a page type has ONE route in the whole
// site. Only the two slug-based types are handled here.
//
// Imports are relative with `.ts`, so node --test can run the unit test. No scaffold markers: a
// PORTABLE file carries none, so the journal branch stays even when the journal module is removed
// (its document type goes with it and the branch is never taken).
// =============================================================================
import { withTrailingSlash } from './href.ts';
import { SINGLETON_LIVE_PATHS } from './nav-href.ts';

export interface CtaTarget {
  linkType?: 'internal' | 'external' | 'email' | 'phone';
  internalLink?: { _type?: string; slug?: string } | null;
  externalUrl?: string;
  emailAddress?: string;
  phoneNumber?: string;
  /** A plain path. Only the built-in default sections name their path this way. */
  href?: string;
}

function resolveHref(c: CtaTarget | null | undefined, fallbackHref: string): string {
  // No linkType: a built-in default button, which names its path directly.
  if (!c?.linkType) return c?.href ?? fallbackHref;
  switch (c.linkType) {
    case 'internal': {
      const t = c.internalLink?._type;
      if (!t) return fallbackHref;
      // Slug-based types need the slug appended. Singletons use a fixed path.
      if (t === 'journalEntry' && c.internalLink?.slug) {
        return `/journal/${c.internalLink.slug}`;
      }
      // Custom pages (type 'page') route via /[slug].astro.
      if (t === 'page' && c.internalLink?.slug) {
        return `/${c.internalLink.slug}`;
      }
      return SINGLETON_LIVE_PATHS[t] ?? fallbackHref;
    }
    case 'external':
      return c.externalUrl ?? fallbackHref;
    case 'email':
      return c.emailAddress ? `mailto:${c.emailAddress}` : fallbackHref;
    case 'phone':
      return c.phoneNumber ? `tel:${c.phoneNumber.replace(/[^\d+]/g, '')}` : fallbackHref;
    default:
      return fallbackHref;
  }
}

/** The finished href for a ctaBlock, trailing slash included (rule 19). */
export function ctaHref(c: CtaTarget | null | undefined, fallbackHref = '/contact/'): string {
  return withTrailingSlash(resolveHref(c, fallbackHref));
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Which analytics this build actually ships, in ONE place.
//
// This exists because of a specific near-miss. The privacy page shipped a
// reassurance reading "traffic is measured with Cloudflare Web Analytics, which
// counts page visits without setting cookies", which was true for years. The day
// GA4 became available (PORTS.md card 54) that sentence became false for any
// fork that set PUBLIC_GA_ID, and it was sitting in a list headed "What doesn't
// happen". A privacy statement that is merely absent is a gap; one that actively
// denies a cookie the site is setting is a false statement to visitors, and
// nothing in the build would ever have flagged it.
//
// So the tags and the page that DESCRIBES the tags read the same two booleans.
// A fork that turns GA4 on cannot end up telling visitors it is off, because the
// copy is derived from the same values that decide whether the script renders.
// That is CLAUDE.md rule 15 applied to prose: anything computable from the
// configuration is derived, never restated by hand.
//
// Consumers: src/components/Analytics.astro (renders the tags) and
// src/pages/privacy.astro (describes them).

/**
 * The GA4 web data stream Measurement ID (G-XXXXXXXXXX), or '' when unset.
 * Deliberately NOT the numeric property id.
 */
export const gaId: string = (import.meta.env.PUBLIC_GA_ID ?? '').trim();

/** The Cloudflare Web Analytics site token, or '' when unset. */
export const cfAnalyticsToken: string = (import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN ?? '').trim();

/**
 * True when a syntactically valid Measurement ID is configured. The shape test
 * is what makes a typo render nothing rather than a broken tag.
 */
export const hasGa: boolean = /^G-[A-Z0-9]+$/.test(gaId);

/** True when a Cloudflare Web Analytics token is configured. */
export const hasCfAnalytics: boolean = cfAnalyticsToken.length > 0;

/**
 * True when this build sets at least one analytics cookie on the visitor.
 *
 * Cloudflare Web Analytics is genuinely cookieless. GA4 is not: it sets a
 * first-party `_ga` cookie plus a per-stream `_ga_<id>` cookie. Privacy copy
 * and any consent decision should branch on THIS, not on whether analytics
 * exists at all, because the two are not the same question.
 */
export const setsAnalyticsCookies: boolean = hasGa;

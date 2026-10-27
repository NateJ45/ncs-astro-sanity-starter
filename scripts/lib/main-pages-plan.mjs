// Safe to edit by hand
// The plan for scripts/main-pages-builder.mjs (PORTS.md card 190, ported from FBC Auburn's
// "every main page a page builder"): what each page's new Page layout holds, built from the
// page's old fields. Pure, so main-pages-plan.test.mjs checks it and a site can run it against a
// document copy before it writes anything.
//
// The shapes mirror what contact.astro, privacy.astro and journal/index.astro drew before the
// pages became page builders, fallback copy included, so the migrated page reads the same.
// A fork that edited those fallbacks edits them here too.

/** Drop null and undefined so the patch never writes `field: null`. */
export const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

/** The opening banner a page drew from its hero fields. */
const hero = (key, doc, fallback) =>
  defined({
    _type: 'heroSection',
    _key: key,
    eyebrow: doc?.heroEyebrow ?? fallback.eyebrow,
    headline: doc?.heroHeadline || fallback.headline,
    subhead: doc?.heroSubhead ?? fallback.subhead,
    backgroundImage: doc?.heroImage,
    scriptAccent: doc?.heroScriptAccent ?? fallback.scriptAccent,
    size: 'short',
  });

export const plans = {
  contactPage: (d) => [
    hero('ct-hero', d, {
      eyebrow: 'Request a Consultation.',
      headline: 'Start the Conversation.',
      subhead: '',
    }),
    { _type: 'contactFormSection', _key: 'ct-form', sidebar: true },
  ],
  privacyPage: (d) => [
    hero('pv-hero', d, { eyebrow: 'Transparency first.', headline: 'Privacy Policy', subhead: '' }),
    defined({
      _type: 'privacyPolicySection',
      _key: 'pv-policy',
      lastUpdated: d?.lastUpdated,
      body: d?.body,
    }),
  ],
  journalPage: (d) => {
    const closing = defined({
      _type: 'ctaBandSection',
      _key: 'jn-cta',
      headline: d?.finalCtaHeadline,
      subhead: d?.finalCtaSubhead,
      scriptAccent: d?.finalCtaScriptAccent,
      backgroundImage: d?.finalCtaBackgroundImage,
      cta: d?.finalCta,
    });
    return [
      hero('jn-hero', d, {
        eyebrow: 'The Journal.',
        headline: 'Notes from the studio.',
        subhead:
          'Project walkthroughs, design thinking, and the occasional opinion. Written between projects.',
        scriptAccent: 'studio',
      }),
      {
        _type: 'journalPostsSection',
        _key: 'jn-posts',
        showCategories: true,
        showNewsletter: true,
      },
      // A closing band needs a headline (the band's schema requires one); without it the page
      // never had a closing band, so none is added.
      ...(closing.headline ? [closing] : []),
    ];
  },
};

/** The singleton ids the script touches, in order. */
export const PAGE_IDS = Object.keys(plans);

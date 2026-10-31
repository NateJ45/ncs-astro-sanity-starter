// Foundation, edit with care
// GROQ queries per page. Each function returns the page singleton plus any
// auto-populated collections that page needs (testimonials grid, services
// where showOnHomepage, process steps in order, etc.).
//
// Types: until `sanity typegen generate` runs, return types are `any`.
// Run `npm run typegen` after schema changes to regenerate src/lib/sanity.types.ts.

import { sanityFetch } from './sanity';
import type { PopupDoc } from './popup';

// Common Portable Text + image projection shorthand
export const IMAGE_PROJECTION = `{
  ...,
  asset->,
  "alt": coalesce(alt, asset->altText, "")
}`;

export const CTA_PROJECTION = `{
  ...,
  internalLink->{ _type, "slug": slug.current }
}`;

// Page-builder array projection. Spreads each block, then resolves the nested
// images and ctaBlocks inside the block types that carry them, so SectionRenderer
// gets ready-to-use data. Block types without images/ctas (text, quote, stats,
// video, spacer) pass through on the leading `...`.
//
// Parameterized by field name so it serves both `pageBuilder` (custom pages)
// and `additionalSections` (the flexible append zone on core pages).
// The per-type arms, shared by a page's own sections and by the sections a
// synced section shows (below), so a block renders the same either way.
const SECTION_ARMS = `
    // The RSVP form names its event "<document id>:<block key>" (card 127).
    _type == "rsvpSection" => { "pageId": ^._id },
    // The documents list (card 197): the newest 60 files; the block picks its group and count.
    // scaffold: documents
    _type == "documentsSection" => {
      ...,
      "items": *[_type == "libraryDocument" && defined(file.asset)] | order(date desc)[0...60]{
        _id, title, category, date, note, expires,
        "file": file{
          "url": asset->url, "size": asset->size,
          "extension": asset->extension, "originalFilename": asset->originalFilename
        }
      }
    },
    // scaffold:end
    // Every main page a page builder (card 190): the Contact form block draws the form's
    // settings from the Contact page document, so it is the same form wherever it is placed.
    _type == "contactFormSection" => {
      ...,
      "settings": *[_type == "contactPage"][0]{
        formIntroNote,
        formProjectTypeOptions, formLocationOptions, formBudgetOptions,
        formTimelineOptions, formSourceOptions,
        formFields[]{ label, kind, options, required },
        whatToExpectEyebrow, whatToExpectHeadline, whatToExpectContent,
        postInquiryRoadmap[]{ title, body, timeEstimate },
        schedulingLink, schedulingLinkLabel, availabilityNote
      }
    },
    // The form builder (card 194): the form's words only. The recipient's NAME is looked up for
    // the page; its address is never in the dataset (src/lib/site-form.ts).
    _type == "formSection" => {
      ...,
      "form": form->{
        _id, title, intro, mode, askForContact, allowAnonymous, questions, recipient,
        submitLabel, successMessage,
        "recipientName": *[_type == "siteSettings"][0].formRecipients[key == ^.recipient][0].name
      }
    },
    // The builder kit (builderSections.ts, PORTS.md card 173). Columns, fold-outs,
    // tabs and the schedule carry no image or button, so they need no arm.
    _type == "buttonRowSection" => { ..., links[]{ ..., link${CTA_PROJECTION} } },
    _type == "photoSection" => { ..., image${IMAGE_PROJECTION} },
    _type == "countdownSection" => { ..., link${CTA_PROJECTION} },
    _type == "noticeSection" => { ..., link${CTA_PROJECTION} },
    _type == "timelineSection" => { ..., entries[]{ ..., image${IMAGE_PROJECTION} } },
    _type == "letterSection" => { ..., signature${IMAGE_PROJECTION}, link${CTA_PROJECTION} },
    _type == "eventDetailsSection" => { ..., image${IMAGE_PROJECTION}, button${CTA_PROJECTION} },
    _type == "photoCardsSection" => {
      ...,
      cards[]{ ..., image${IMAGE_PROJECTION}, link${CTA_PROJECTION} }
    },
    // Card 193: blocks with pictures or buttons inside them. The contact card, newsletter and
    // calendar blocks carry plain fields only.
    _type == "progressSection" => { ..., link${CTA_PROJECTION} },
    _type == "iconCardsSection" => {
      ...,
      cards[]{ ..., image${IMAGE_PROJECTION}, link${CTA_PROJECTION} }
    },
    _type == "stepsRailSection" => {
      ...,
      steps[]{ ..., link${CTA_PROJECTION} },
      link${CTA_PROJECTION}
    },
    _type == "hubSection" => {
      ...,
      groups[]{ ..., cards[]{ ..., image${IMAGE_PROJECTION}, link${CTA_PROJECTION} } }
    },
    _type == "heroSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      primaryCta${CTA_PROJECTION},
      secondaryCta${CTA_PROJECTION},
      // The photo hero (card 189): the clips as URL and type, the short-facts card's link resolved.
      backgroundVideo{ "url": asset->url, "mimeType": asset->mimeType },
      backgroundVideoPhone{ "url": asset->url, "mimeType": asset->mimeType },
      glance{ ..., link${CTA_PROJECTION} }
    },
    _type == "ctaBandSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "imageTextSection" => {
      ...,
      image${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "gallerySection" => {
      ...,
      images[]${IMAGE_PROJECTION}
    },
    // scaffold: about
    _type == "founderSection" => {
      ...,
      portrait${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    // scaffold:end
    // scaffold: about
    _type == "storySection" => {
      ...,
      portrait${IMAGE_PROJECTION}
    },
    // scaffold:end
    // scaffold: services
    _type == "servicesGridSection" => {
      ...,
      cta${CTA_PROJECTION},
      "services": *[_type == "service"] | order(orderRank asc, displayOrder asc)
    },
    // scaffold:end
    // scaffold: testimonials
    _type == "testimonialsSection" => {
      ...,
      "featuredQuote": featuredQuote->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      },
      "testimonialsToShow": testimonialsToShow[]->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      }
    },
    // scaffold:end
    // scaffold: philosophy
    _type == "valuesSection" => {
      ...,
      "points": *[_type == "philosophyPoint"] | order(orderRank asc, displayOrder asc){
        title, description, displayOrder
      }
    },
    // scaffold:end
    // scaffold: process
    _type == "processSection" => {
      ...,
      cta${CTA_PROJECTION},
      "steps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc){
        stepNumber, title, timeEstimate, shortDescription, features, tierNote
      }
    },
    // scaffold:end
    _type == "serviceAreaSection" => {
      ...,
      "travelFees": *[_type == "businessInfo"][0].travelFees
    },
    _type == "guaranteeSection" => {
      ...,
      "siteSettingsText": *[_type == "siteSettings"][0].satisfactionGuarantee
    },
    // scaffold: faq
    _type == "faqSection" => {
      ...,
      cta${CTA_PROJECTION},
      "items": items[]->{
        _id, _type, question, answer,
        "category": coalesce(categoryRef->title, category),
        displayOrder
      }
    },
    // scaffold:end
    _type == "logoStripSection" => {
      ...,
      logos[]${IMAGE_PROJECTION}
    },
    _type == "teamSection" => {
      ...,
      members[]{
        ...,
        photo${IMAGE_PROJECTION}
      }
    },
    // dynamicListSection: items fetched inline via a GROQ select() per source,
    // each normalised to a flat items array so the component handles one shape.
    _type == "dynamicListSection" => {
      ...,
      cta${CTA_PROJECTION},
      // GROQ subscript ranges must have INTEGER endpoints. A slice written as
      // 0...limit is a parse error, not a dynamic slice, and the limit here is
      // a per-BLOCK field so a single $param cannot stand in for it either.
      // Slice at 12, the schema's max (richSections.ts, limit field), and let
      // DynamicList.astro trim to the block's own limit. sanityFetch swallows
      // the parse error and returns its fallback, so the symptom was an empty
      // section, never a failed build (PORTS.md card 62). NOTE: no backticks in
      // this comment. It lives inside a template literal, so one would
      // terminate the query string.
      "items": select(
        // scaffold: journal
        source == "journal" => *[_type == "journalEntry"] | order(publishedAt desc)[0...12]{
          _id, "title": title, "meta": publishedAt, "summary": excerpt,
          "href": "/journal/" + slug.current + "/",
          "coverImage": coverImage${IMAGE_PROJECTION}
        },
        // scaffold:end
        // scaffold: services
        source == "services" => *[_type == "service"] | order(orderRank asc, displayOrder asc)[0...12]{
          _id, "title": name, "meta": price, "summary": shortDescription,
          "href": "/services/#" + slug.current
        },
        // scaffold:end
        // scaffold: testimonials
        source == "testimonials" => *[_type == "testimonial"] | order(_createdAt desc)[0...12]{
          _id, "title": attribution, "meta": detail, "summary": quote, "href": null
        },
        // scaffold:end
        // scaffold: faq
        source == "faqs" => *[_type == "faqItem"] | order(displayOrder asc, _createdAt asc)[0...12]{
          _id, "title": question, "summary": null, "meta": coalesce(categoryRef->title, category), "href": null,
          "answer": answer
        },
        // scaffold:end
        // 2026-09-18: the trailing [] is the select's DEFAULT arm, and it is
        // load-bearing for the scaffold. Every other arm here belongs to a
        // removable capability, so without a default a fork that removes the
        // last one would be left with a dangling comma, or an empty select(),
        // neither of which is valid GROQ. An empty list is also the right
        // answer for a
        // source nothing serves any more: the component renders nothing.
        []
      )
    }`;

// Synced sections (the authoring kit, PORTS.md card 109). The block holds only
// a reference to a saved section; resolve it here into `sections`, run through
// the SAME arms, and SectionRenderer swaps the block for them in place
// (expandSyncedSections in src/lib/authoring.ts). One level only: a saved
// section cannot hold a synced section, so there is nothing deeper to resolve.
// A missing saved section resolves to null and renders nothing. (The reference is strong, so
// Sanity refuses to delete a saved section that a page still uses.)
export function sectionsProjection(field = 'pageBuilder'): string {
  return `${field}[]{
    ...,
    ${SECTION_ARMS},
    _type == "syncedSection" => {
      ...,
      "presetTitle": preset->title,
      "sections": preset->section[]{
        ...,
        ${SECTION_ARMS}
      }
    }
  }`;
}

// ---- Site settings (used in BaseLayout / Header / Footer) -----------------
// availabilityStatus, serviceAreas, travelFees, city, state, serviceRegion,
// geoLat, and geoLng moved to the businessInfo singleton. Pulled in here under
// the same flat field names so Header / Footer / pages that read
// siteSettings.serviceAreas etc. keep working with no change; only the source
// document changed.

// One menu link (schemaTypes/navLink.ts), as every menu needs it: the label,
// the hand-typed address that older items still carry, and the picked page
// DEREFERENCED down to a type + slug. src/lib/nav-href.ts turns that into an
// href. The field list is separate from the braces so it can also be spread
// into a projection that adds children (navItems' dropdown groups).
const NAV_LINK_FIELDS = `_key, _type, label, linkType, href, externalUrl,
    "slug": internalPage->slug.current,
    "docType": internalPage->_type,
    "pageArchived": internalPage->archived`;
export const NAV_LINK_PROJECTION = `{ ${NAV_LINK_FIELDS} }`;

// Module-level memoized promise. The first call triggers the actual Sanity
// fetch; every subsequent call (across all pages in the same build process)
// returns the same promise, collapsing 11+ per-page calls to one request.
let _siteSettingsPromise: Promise<any> | null = null;

// Exported so the preview shell (src/layouts/PreviewLayout.astro) fetches the
// chrome through the SAME projection. Fetching the raw document would leave
// every dereferenced menu link null in the preview.
export const SITE_SETTINGS_PROJECTION = `{
    title,
    tagline,
    email,
    emailConfirmed,
    phone,
    phoneConfirmed,
    businessType,
    "availabilityStatus": *[_type == "businessInfo"][0].availabilityStatus,
    "serviceAreas": *[_type == "businessInfo"][0].serviceAreas,
    "travelFees": *[_type == "businessInfo"][0].travelFees,
    "geoLat": *[_type == "businessInfo"][0].geoLat,
    "geoLng": *[_type == "businessInfo"][0].geoLng,
    "city": *[_type == "businessInfo"][0].city,
    "state": *[_type == "businessInfo"][0].state,
    "serviceRegion": *[_type == "businessInfo"][0].serviceRegion,
    // The business facts (card 196, src/lib/business-facts.ts): the street
    // address, its confirmed flag, and the opening hours with their dated changes.
    ...*[_type == "businessInfo"][0]{
      businessModel,
      street,
      zip,
      addressConfirmed,
      findUs,
      openingHours[]{ _key, days, opens, closes, label, confirmed },
      hoursNote,
      hoursChanges[]{ _key, date, endDate, kind, opens, closes, note }
    },
    socialInstagram,
    socialFacebook,
    socialLinks[]{
      platform,
      url,
      label
    },
    seoImage${IMAGE_PROJECTION},
    footerCredit,
    footerCreditUrl,
    newsletter,
    googleBusinessUrl,
    reviewsNote,
    satisfactionGuarantee,
    logo${IMAGE_PROJECTION},
    // Optional editor-managed menus. Empty arrays mean "use the built-in defaults."
    navItems[]{
      ${NAV_LINK_FIELDS},
      links[]${NAV_LINK_PROJECTION}
    },
    footerColumns[]{
      _key,
      title,
      links[]${NAV_LINK_PROJECTION}
    },
    legalNav[]${NAV_LINK_PROJECTION},
    headerCta{ show, label, link${NAV_LINK_PROJECTION} },
    headerSecondary{ label, link${NAV_LINK_PROJECTION} },
    showEmail,
    showSocials,
    showFooterSocials,
    // Wayfinding (card 191, src/lib/wayfinding.ts). All empty on an untouched site.
    phoneMenuGroups[]{ _key, title, links[]${NAV_LINK_PROJECTION} },
    whereNext[]{ _key, note, link${NAV_LINK_PROJECTION} },
    footerStyle,
    actionBars[]{
      _key,
      everyPage,
      text,
      "page": page->{ "docType": _type, "slug": slug.current, archived },
      action${NAV_LINK_PROJECTION}
    },
    sectionVisibility{
      showPortfolio,
      showJournal,
      showShop,
      showGiftCertificates,
      showPress,
      showResources,
      showGuides,
      showStyleQuiz,
      showBudgetCalculator
    }
  }`;

// Site settings' "Code on every page" (PORTS.md card 121). Its own memoized
// query, deliberately NOT in SITE_SETTINGS_PROJECTION: that projection also
// feeds the preview shell, and this code must never reach the preview or the
// Studio. BaseLayout calls it only on public routes (isSiteCodeRoute).
let _siteCodePromise: Promise<{ headCode?: string; bodyEndCode?: string } | null> | null = null;

export async function getSiteCode() {
  if (_siteCodePromise) return _siteCodePromise;
  _siteCodePromise = sanityFetch<{ headCode?: string; bodyEndCode?: string } | null>(
    `*[_type == "siteSettings"][0]{ headCode, bodyEndCode }`,
    {},
    null,
  );
  return _siteCodePromise;
}

export async function getSiteSettings() {
  if (_siteSettingsPromise) return _siteSettingsPromise;
  _siteSettingsPromise = sanityFetch(
    `*[_type == "siteSettings"][0]${SITE_SETTINGS_PROJECTION}`,
    {},
    null,
  );
  return _siteSettingsPromise;
}

// ---- Business info (service areas, travel, availability, geo) -------------
// Most consumers read these through getSiteSettings (flat names), but pages
// or blocks that need businessInfo directly can use this.
export async function getBusinessInfo() {
  return sanityFetch(
    `*[_type == "businessInfo"][0]{
    businessModel,
    city,
    state,
    serviceRegion,
    serviceAreas,
    travelFees,
    availabilityStatus,
    geoLat,
    geoLng,
    additionalLocations[]{
      city,
      state,
      geoLat,
      geoLng
    }
  }`,
    {},
    null,
  );
}

// ---- Announcement banner --------------------------------------------------
// Fetches the single active announcement: enabled, started (or no startDate),
// not yet ended (or no endDate). Urgency ordering: urgent first, then highlight,
// then info; ties broken by soonest endDate so the most time-sensitive shows.
//
// "now" is evaluated at BUILD TIME (static site). A banner appears or disappears
// after the next rebuild. Use a scheduled Cloudflare deploy hook for auto-expiry.
//
// Returns null when no announcement is active (graceful absence: no banner renders).
export async function getActiveAnnouncement() {
  const now = new Date().toISOString();
  return sanityFetch(
    `*[_type == "announcement" && enabled == true
      && (!defined(startDate) || startDate <= $now)
      && (!defined(endDate) || endDate >= $now)]
      | order(select(style == "urgent" => 0, style == "highlight" => 1, 2) asc, endDate asc)[0]{
        message, style, link
      }`,
    { now },
    null,
  );
}

// ---- Popup (PORTS.md card 170) ---------------------------------------------
// Every popup switched on and not yet ended; src/lib/popup.ts picks the one to show (pickPopup)
// and the pages it shows on. Read once per build (BaseLayout runs on every page, so the promise
// is shared). Null-safe: no popup documents, no markup and no script.
let _popupsPromise: Promise<PopupDoc[]> | null = null;
export function getPopups(): Promise<PopupDoc[]> {
  _popupsPromise ??= sanityFetch(
    `*[_type == "popup" && enabled == true && (!defined(endDate) || endDate >= $now)]{
      _id, _updatedAt, title, text, button{ label, link }, image${IMAGE_PROJECTION},
      startDate, endDate, where, frequency,
      "pages": pages[]->{ _type, "slug": slug.current }
    }`,
    { now: new Date().toISOString() },
    [],
  ).then((v) => (Array.isArray(v) ? (v as PopupDoc[]) : []));
  return _popupsPromise;
}

// ---- Home page ------------------------------------------------------------

export async function getHomePage() {
  return sanityFetch(
    `*[_type == "homePage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`,
    {},
    null,
  );
}

// scaffold: about
// ---- About page -----------------------------------------------------------

export async function getAboutPage() {
  return sanityFetch(
    `*[_type == "aboutPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`,
    {},
    null,
  );
}
// scaffold:end

// ---- Services page --------------------------------------------------------

// scaffold: services
export async function getServicesPage() {
  return sanityFetch(
    `*[_type == "servicesPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`,
    {},
    null,
  );
}
// scaffold:end

// Minimal service list for JSON-LD on the services page.
// scaffold: services
export async function getServiceListForSchema() {
  return sanityFetch(
    `*[_type == "service"] | order(orderRank asc, displayOrder asc){
    _id, name, slug, shortDescription, price, priceNumeric
  }`,
    {},
    [],
  );
}
// scaffold:end

// scaffold: process
// ---- Process page -----------------------------------------------------------

export async function getProcessPage() {
  return sanityFetch(
    `*[_type == "processPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`,
    {},
    null,
  );
}
// scaffold:end

// scaffold: faq
// ---- FAQ page -------------------------------------------------------------

export async function getFaqPage() {
  return sanityFetch(
    `*[_type == "faqPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    categoryOrder,
    "faqs": *[_type == "faqItem"] | order(category asc, displayOrder asc){
      question, answer,
      "category": coalesce(categoryRef->title, category),
      displayOrder
    },
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION},
    secondaryCta${CTA_PROJECTION}
  }`,
    {},
    null,
  );
}
// scaffold:end

// ---- Contact page ---------------------------------------------------------

export async function getContactPage() {
  return sanityFetch(
    `*[_type == "contactPage"][0]{
    ${sectionsProjection('pageBuilder')},
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    formIntroNote,
    formProjectTypeOptions,
    formLocationOptions,
    formBudgetOptions,
    formTimelineOptions,
    formSourceOptions,
    formFields[]{ label, kind, options, required },
    whatToExpectEyebrow,
    whatToExpectHeadline,
    whatToExpectContent,
    postInquiryRoadmap[]{
      title, body, timeEstimate
    },
    schedulingLink,
    schedulingLinkLabel,
    availabilityNote
  }`,
    {},
    null,
  );
}

// ---- 404 page -------------------------------------------------------------

export async function getNotFoundPage() {
  return sanityFetch(
    `*[_type == "notFoundPage"][0]{
    seoTitle,
    seoDescription,
    eyebrow,
    headline,
    body,
    heroImage${IMAGE_PROJECTION},
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref,
    tertiaryCtaLabel, tertiaryCtaHref
  }`,
    {},
    null,
  );
}

// ---- Projects (used by Footer.astro for Latest Projects column) -----------

/** Minimal project shape used by core surfaces (footer "Latest Projects" column,
 *  home Featured Work section). Fields mirror the GROQ projection below.
 *  Defined locally so core typechecks whether or not the portfolio module is enabled. */
export interface CoreProjectCard {
  _id: string;
  title?: string;
  slug?: { current?: string };
  location?: string;
  year?: number;
  roomType?: string;
  designStyle?: string;
  briefSummary?: string;
  featured?: boolean;
  heroImage?: any;
}

export async function getAllProjects(): Promise<CoreProjectCard[]> {
  return sanityFetch(
    `*[_type == "project"] | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
    _id, title, slug, location, year, roomType, designStyle, briefSummary,
    heroImage${IMAGE_PROJECTION}
  }`,
    {},
    [],
  );
}

// ---- Journal --------------------------------------------------------------

// scaffold: journal
// Projection for a journal card (index page) — small surface, no body.
const JOURNAL_CARD_PROJECTION = `{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  featured,
  coverImage${IMAGE_PROJECTION},
  "categories": categories[]->{ _id, title, slug, description }
}`;
// scaffold:end

// scaffold: journal
export async function getJournalPage() {
  return sanityFetch(
    `*[_type == "journalPage"][0]{
    ${sectionsProjection('pageBuilder')},
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    stickyCtaLabel,
    finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`,
    {},
    null,
  );
}
// scaffold:end

// scaffold: journal
export async function getAllJournalEntries() {
  // Featured first, then newest first. Excerpt + cover only (no body).
  return sanityFetch(
    `*[_type == "journalEntry"] | order(featured desc, publishedAt desc) ${JOURNAL_CARD_PROJECTION}`,
    {},
    [],
  );
}
// scaffold:end

// scaffold: journal
export async function getAllJournalCategories() {
  return sanityFetch(
    `*[_type == "journalCategory"] | order(title asc){
    _id, title, slug, description,
    "postCount": count(*[_type == "journalEntry" && references(^._id)])
  }`,
    {},
    [],
  );
}
// scaffold:end

// scaffold: journal
export async function getJournalEntryBySlug(slug: string) {
  // Full doc including body. The body's inline image blocks get their asset
  // resolved + alt fallback at the GROQ layer so the renderer doesn't have to
  // chase asset refs for every block. Image gallery items + beforeAfter pairs
  // + sourceCard images + inline images all get the same treatment.
  return sanityFetch(
    `*[_type == "journalEntry" && slug.current == $slug][0]{
      _id, title, slug, excerpt, author, publishedAt, updatedAt, featured,
      seoTitle, seoDescription,
      coverImage${IMAGE_PROJECTION},
      "categories": categories[]->{ _id, title, slug, description },
      "relatedProject": relatedProject->{ _id, title, slug, location, year, heroImage${IMAGE_PROJECTION} },
      body[]{
        ...,
        _type == "inlineImage" => ${IMAGE_PROJECTION},
        _type == "beforeAfter" => {
          ...,
          beforeImage${IMAGE_PROJECTION},
          afterImage${IMAGE_PROJECTION}
        },
        _type == "sourceCard" => {
          ...,
          image${IMAGE_PROJECTION}
        },
        _type == "imageGallery" => {
          ...,
          images[]${IMAGE_PROJECTION}
        }
      },
      // Explicit relatedPosts if set; otherwise auto-pick 3 most recent in the
      // same primary category, excluding this post itself.
      "relatedPosts": coalesce(
        relatedPosts[]->${JOURNAL_CARD_PROJECTION},
        *[_type == "journalEntry" && _id != ^._id && count(categories[@._ref in ^.^.categories[]._ref]) > 0]
          | order(publishedAt desc)[0..2] ${JOURNAL_CARD_PROJECTION}
      )
    }`,
    { slug },
    null,
  );
}
// scaffold:end

// Static path generation for /journal/[slug]. Returns just the slugs.
// scaffold: journal
export async function getAllJournalSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await sanityFetch(
    `*[_type == "journalEntry" && defined(slug.current)]{ slug }`,
    {},
    [],
  );
  return list.map((e) => e.slug?.current).filter(Boolean);
}
// scaffold:end

// ---- Privacy page ---------------------------------------------------------

export async function getPrivacyPage() {
  return sanityFetch(
    `*[_type == "privacyPage"][0]{
    ${sectionsProjection('pageBuilder')},
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    lastUpdated,
    body
  }`,
    {},
    null,
  );
}

// ---- Press items (used by core: about.astro + index.astro PressStrip) ----

/** Minimal press item shape used by the core PressStrip component.
 *  Defined locally so core typechecks whether or not the press module is enabled. */
export interface CorePressItem {
  _id: string;
  outlet?: string;
  logo?: any;
  quote?: string;
  url?: string;
  date?: string;
  orderRank?: string;
}

// Press items ordered by orderRank for the PressStrip on the home + about pages.
export async function getPressItems(): Promise<CorePressItem[]> {
  return sanityFetch(
    `*[_type == "pressItem"] | order(orderRank asc){
    _id, outlet,
    logo${IMAGE_PROJECTION},
    quote, url, date, orderRank
  }`,
    {},
    [],
  );
}

// ---- Custom pages (page builder) ------------------------------------------

// One published custom page by slug, with its section array fully resolved.
export async function getPage(slug: string) {
  return sanityFetch(
    `*[_type == "page" && slug.current == $slug][0]{
      title,
      "slug": slug.current,
      seoTitle, seoDescription, hideFromSearch,
      seoImage${IMAGE_PROJECTION},
      ${sectionsProjection('pageBuilder')}
    }`,
    { slug },
    null,
  );
}

// Slugs of every published custom page, for getStaticPaths in [slug].astro.
//
// `archived != true`, never `archived == false`: a page made before the archive
// field existed has no value there and must stay visible. An archived page is
// simply not built, so its URL 404s and never reaches the sitemap.
export async function getAllPageSlugs(): Promise<string[]> {
  const list: Array<{ slug: string }> = await sanityFetch(
    `*[_type == "page" && defined(slug.current) && archived != true]{ "slug": slug.current }`,
    {},
    [],
  );
  return list.map((p) => p.slug).filter(Boolean);
}

// Custom pages flagged to appear in the main nav and/or footer. Header.astro
// and Footer.astro can inject these alongside the built-in links.
//
// Archived pages drop out: the page is not built, so a menu link to it would be
// a 404 in the middle of the navigation. Hidden pages drop out too (card 122):
// "Hide this page from Google and the menus" means the menus as well, even if
// "Show in the top menu" was left on.
export async function getNavPages() {
  return sanityFetch(
    `*[_type == "page" && defined(slug.current) && archived != true && hideFromSearch != true && (addToMainNav == true || addToFooter == true)]{
    title,
    "slug": slug.current,
    navLabel,
    addToMainNav,
    navGroup,
    addToFooter
  }`,
    {},
    [],
  );
}

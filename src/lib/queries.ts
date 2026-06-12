// Foundation, edit with care
// GROQ queries per page. Each function returns the page singleton plus any
// auto-populated collections that page needs (testimonials grid, services
// where showOnHomepage, process steps in order, etc.).
//
// Types: until `sanity typegen generate` runs, return types are `any`.
// Run `npm run typegen` after schema changes to regenerate src/lib/sanity.types.ts.

import { sanityFetch } from './sanity';

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
export function sectionsProjection(field = 'pageBuilder'): string {
  return `${field}[]{
    ...,
    _type == "heroSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      primaryCta${CTA_PROJECTION},
      secondaryCta${CTA_PROJECTION}
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
    }
  }`;
}

// ---- Site settings (used in BaseLayout / Header / Footer) -----------------
// availabilityStatus, serviceAreas, travelFees, city, state, serviceRegion,
// geoLat, and geoLng moved to the businessInfo singleton. Pulled in here under
// the same flat field names so Header / Footer / pages that read
// siteSettings.serviceAreas etc. keep working with no change; only the source
// document changed.

export async function getSiteSettings() {
  return sanityFetch(`*[_type == "siteSettings"][0]{
    title,
    tagline,
    email,
    phone,
    "availabilityStatus": *[_type == "businessInfo"][0].availabilityStatus,
    "serviceAreas": *[_type == "businessInfo"][0].serviceAreas,
    "travelFees": *[_type == "businessInfo"][0].travelFees,
    "geoLat": *[_type == "businessInfo"][0].geoLat,
    "geoLng": *[_type == "businessInfo"][0].geoLng,
    "city": *[_type == "businessInfo"][0].city,
    "state": *[_type == "businessInfo"][0].state,
    "serviceRegion": *[_type == "businessInfo"][0].serviceRegion,
    socialInstagram,
    socialFacebook,
    seoImage${IMAGE_PROJECTION},
    footerCredit,
    footerCreditUrl,
    newsletter,
    googleBusinessUrl,
    reviewsNote,
    satisfactionGuarantee,
    sectionVisibility{
      showPortfolio,
      showJournal,
      showShop,
      showEDesign,
      showGiftCertificates,
      showPress,
      showResources,
      showGuides,
      showStyleQuiz,
      showBudgetCalculator
    }
  }`, {}, null);
}

// ---- Business info (service areas, travel, availability, geo) -------------
// Most consumers read these through getSiteSettings (flat names), but pages
// or blocks that need businessInfo directly can use this.
export async function getBusinessInfo() {
  return sanityFetch(`*[_type == "businessInfo"][0]{
    city,
    state,
    serviceRegion,
    serviceAreas,
    travelFees,
    availabilityStatus,
    geoLat,
    geoLng
  }`, {}, null);
}

// ---- Home page ------------------------------------------------------------

export async function getHomePage() {
  return sanityFetch(`*[_type == "homePage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow,
    heroHeadline,
    heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroImages[]${IMAGE_PROJECTION},
    heroPrimaryCta${CTA_PROJECTION},
    heroSecondaryCta${CTA_PROJECTION},
    heroRotatingWords,
    heroScriptAccent,
    meetFounderPhoto${IMAGE_PROJECTION},
    meetFounderEyebrow,
    meetFounderHeadline,
    meetFounderContent,
    meetFounderCta${CTA_PROJECTION},
    featuredWorkEyebrow,
    featuredWorkHeadline,
    featuredWorkSubhead,
    featuredWorkCta${CTA_PROJECTION},
    featuredJournalEyebrow,
    featuredJournalHeadline,
    featuredJournalSubhead,
    featuredJournalCta${CTA_PROJECTION},
    processPreviewEyebrow,
    processPreviewHeadline,
    processPreviewSubhead,
    processPreviewCta${CTA_PROJECTION},
    testimonialsEyebrow,
    testimonialsHeadline,
    testimonialsScriptAccent,
    testimonialsSubhead,
    testimonialsAttribution,
    "featuredTestimonial": featuredTestimonial->{
      ...,
      "relatedProject": relatedProject->{ title, "slug": slug.current }
    },
    "testimonialsToShow": testimonialsToShow[]->{
      ...,
      "relatedProject": relatedProject->{ title, "slug": slug.current }
    },
    servicesGridEyebrow,
    servicesGridHeadline,
    servicesGridScriptAccent,
    servicesGridSubhead,
    servicesGridCta${CTA_PROJECTION},
    servicesGridFootnote,
    "services": *[_type == "service" && showOnHomepage == true] | order(orderRank asc, displayOrder asc),
    "processSteps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc){
      stepNumber, title, timeEstimate, shortDescription, features, tierNote
    },
    "featuredProjects": *[_type == "project"] | order(featured desc, publishedAt desc)[0..3]{
      _id, title, slug, location, year, roomType, designStyle, briefSummary, featured,
      heroImage${IMAGE_PROJECTION}
    },
    "featuredJournalEntries": *[_type == "journalEntry"] | order(featured desc, publishedAt desc)[0..3]{
      _id, title, slug, excerpt, publishedAt, featured,
      coverImage${IMAGE_PROJECTION},
      "categories": categories[]->{ _id, title, slug, description }
    },
    serviceAreaCue,
    finalCtaEyebrow,
    finalCtaHeadline,
    finalCtaScriptAccent,
    finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`, {}, null);
}

// ---- About page -----------------------------------------------------------

export async function getAboutPage() {
  return sanityFetch(`*[_type == "aboutPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    storyEyebrow, storyHeadline, storyContent,
    founderPhoto${IMAGE_PROJECTION},
    founderAttribution,
    backgroundLine,
    serviceAreaMention,
    philosophyEyebrow, philosophyHeadline,
    "philosophyPoints": *[_type == "philosophyPoint"] | order(orderRank asc, displayOrder asc){
      title, description, displayOrder
    },
    personalEyebrow, personalHeadline, personalIntro,
    currentlyList[]{label, value},
    rapidFire[]{prompt, answer},
    localSpots[]{name, note},
    beyondDesign,
    candidPhoto${IMAGE_PROJECTION},
    stats[]{number, suffix, label},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`, {}, null);
}

// ---- Services page --------------------------------------------------------

export async function getServicesPage() {
  return sanityFetch(`*[_type == "servicesPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    stickyCtaLabel,
    servicesListEyebrow, servicesListHeadline, servicesListSubhead,
    "services": *[_type == "service"] | order(orderRank asc, displayOrder asc),
    builderRealtorSection{
      ...,
      cta${CTA_PROJECTION}
    },
    serviceAreaSection,
    "travelFees": *[_type == "siteSettings"][0].travelFees,
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`, {}, null);
}

// ---- FAQ page -------------------------------------------------------------

export async function getFaqPage() {
  return sanityFetch(`*[_type == "faqPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    categoryOrder,
    "faqs": *[_type == "faqItem"] | order(category asc, displayOrder asc){
      question, answer, category, displayOrder
    },
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION},
    secondaryCta${CTA_PROJECTION}
  }`, {}, null);
}

// ---- Contact page ---------------------------------------------------------

export async function getContactPage() {
  return sanityFetch(`*[_type == "contactPage"][0]{
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
    whatToExpectEyebrow,
    whatToExpectHeadline,
    whatToExpectContent,
    postInquiryRoadmap[]{
      title, body, timeEstimate
    },
    schedulingLink,
    schedulingLinkLabel,
    availabilityNote
  }`, {}, null);
}

// ---- 404 page -------------------------------------------------------------

export async function getNotFoundPage() {
  return sanityFetch(`*[_type == "notFoundPage"][0]{
    seoTitle,
    seoDescription,
    eyebrow,
    headline,
    body,
    heroImage${IMAGE_PROJECTION},
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref,
    tertiaryCtaLabel, tertiaryCtaHref
  }`, {}, null);
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
  return sanityFetch(`*[_type == "project"] | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
    _id, title, slug, location, year, roomType, designStyle, briefSummary,
    heroImage${IMAGE_PROJECTION}
  }`, {}, []);
}

// ---- Journal --------------------------------------------------------------

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

export async function getJournalPage() {
  return sanityFetch(`*[_type == "journalPage"][0]{
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
  }`, {}, null);
}

export async function getAllJournalEntries() {
  // Featured first, then newest first. Excerpt + cover only (no body).
  return sanityFetch(`*[_type == "journalEntry"] | order(featured desc, publishedAt desc) ${JOURNAL_CARD_PROJECTION}`, {}, []);
}

export async function getAllJournalCategories() {
  return sanityFetch(`*[_type == "journalCategory"] | order(title asc){
    _id, title, slug, description,
    "postCount": count(*[_type == "journalEntry" && references(^._id)])
  }`, {}, []);
}

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

// Static path generation for /journal/[slug]. Returns just the slugs.
export async function getAllJournalSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await sanityFetch(
    `*[_type == "journalEntry" && defined(slug.current)]{ slug }`,
    {},
    [],
  );
  return list.map((e) => e.slug?.current).filter(Boolean);
}

// ---- Privacy page ---------------------------------------------------------

export async function getPrivacyPage() {
  return sanityFetch(`*[_type == "privacyPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    lastUpdated,
    body
  }`, {}, null);
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
  return sanityFetch(`*[_type == "pressItem"] | order(orderRank asc){
    _id, outlet,
    logo${IMAGE_PROJECTION},
    quote, url, date, orderRank
  }`, {}, []);
}

// ---- Custom pages (page builder) ------------------------------------------

// One published custom page by slug, with its section array fully resolved.
export async function getPage(slug: string) {
  return sanityFetch(
    `*[_type == "page" && slug.current == $slug][0]{
      title,
      "slug": slug.current,
      seoTitle, seoDescription,
      seoImage${IMAGE_PROJECTION},
      ${sectionsProjection('pageBuilder')}
    }`,
    { slug },
    null,
  );
}

// Slugs of every published custom page, for getStaticPaths in [slug].astro.
export async function getAllPageSlugs(): Promise<string[]> {
  const list: Array<{ slug: string }> = await sanityFetch(
    `*[_type == "page" && defined(slug.current)]{ "slug": slug.current }`,
    {},
    [],
  );
  return list.map((p) => p.slug).filter(Boolean);
}

// Custom pages flagged to appear in the main nav and/or footer. Header.astro
// and Footer.astro can inject these alongside the built-in links.
export async function getNavPages() {
  return sanityFetch(`*[_type == "page" && defined(slug.current) && (addToMainNav == true || addToFooter == true)]{
    title,
    "slug": slug.current,
    navLabel,
    addToMainNav,
    navGroup,
    addToFooter
  }`, {}, []);
}


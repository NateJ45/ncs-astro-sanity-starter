// Foundation, edit with care
// GROQ queries per page. Each function returns the page singleton plus any
// auto-populated collections that page needs (testimonials grid, services
// where showOnHomepage, process steps in order, etc.).
//
// Types: until `sanity typegen generate` runs, return types are `any`.
// Run `npm run typegen` after schema changes to regenerate src/lib/sanity.types.ts.

import { client } from './sanity';

// Common Portable Text + image projection shorthand
const IMAGE_PROJECTION = `{
  ...,
  asset->,
  "alt": coalesce(alt, asset->altText, "")
}`;

const CTA_PROJECTION = `{
  ...,
  internalLink->{ _type, "slug": slug.current }
}`;

// ---- Site settings (used in BaseLayout / Header / Footer) -----------------

export async function getSiteSettings() {
  return client.fetch(`*[_type == "siteSettings"][0]{
    title,
    tagline,
    email,
    phone,
    availabilityStatus,
    serviceAreas,
    travelFees,
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
  }`);
}

// ---- Home page ------------------------------------------------------------

export async function getHomePage() {
  return client.fetch(`*[_type == "homePage"][0]{
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
    meetStaciPhoto${IMAGE_PROJECTION},
    meetStaciEyebrow,
    meetStaciHeadline,
    meetStaciContent,
    meetStaciCta${CTA_PROJECTION},
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
  }`);
}

// ---- About page -----------------------------------------------------------

export async function getAboutPage() {
  return client.fetch(`*[_type == "aboutPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    storyEyebrow, storyHeadline, storyContent,
    staciPhoto${IMAGE_PROJECTION},
    staciAttribution,
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
  }`);
}

// ---- Process page ---------------------------------------------------------

export async function getProcessPage() {
  return client.fetch(`*[_type == "processPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    faqSectionEyebrow, faqSectionHeadline,
    "processSteps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc),
    "faqs": *[_type == "faqItem" && alsoShowOnProcessPage == true] | order(category asc, displayOrder asc),
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`);
}

// ---- Services page --------------------------------------------------------

export async function getServicesPage() {
  return client.fetch(`*[_type == "servicesPage"][0]{
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
  }`);
}

// ---- FAQ page -------------------------------------------------------------

export async function getFaqPage() {
  return client.fetch(`*[_type == "faqPage"][0]{
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
  }`);
}

// ---- Contact page ---------------------------------------------------------

export async function getContactPage() {
  return client.fetch(`*[_type == "contactPage"][0]{
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
  }`);
}

// ---- Portfolio index page -------------------------------------------------

export async function getPortfolioPage() {
  return client.fetch(`*[_type == "portfolioPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent
  }`);
}

// ---- 404 page -------------------------------------------------------------

export async function getNotFoundPage() {
  return client.fetch(`*[_type == "notFoundPage"][0]{
    seoTitle,
    seoDescription,
    eyebrow,
    headline,
    body,
    heroImage${IMAGE_PROJECTION},
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref,
    tertiaryCtaLabel, tertiaryCtaHref
  }`);
}

// ---- Projects (post-launch portfolio) -------------------------------------

export async function getAllProjects() {
  return client.fetch(`*[_type == "project"] | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
    _id, title, slug, location, year, roomType, designStyle, briefSummary,
    heroImage${IMAGE_PROJECTION}
  }`);
}

export async function getProjectBySlug(slug: string) {
  // Note: stickyCtaLabel is spread in via `...` since the schema field is on
  // the project doc itself. journalPage's stickyCtaLabel is passed in
  // separately so `journalPageStickyCta` from journal/[slug].astro is keyed
  // to the right source.
  //
  // relatedJournalEntries is a reverse reference: journal posts whose "Related
  // project" field points at this project. Deriving it here means the link is
  // kept only on the journal side, so there is nothing for an editor to
  // maintain on the project, and the project page surfaces coverage on its own.
  return client.fetch(
    `*[_type == "project" && slug.current == $slug][0]{
      ...,
      heroImage${IMAGE_PROJECTION},
      gallery[]${IMAGE_PROJECTION},
      beforeAfters[]{
        ...,
        beforeImage${IMAGE_PROJECTION},
        afterImage${IMAGE_PROJECTION}
      },
      "servicesUsed": servicesUsed[]->{ name, slug, price },
      "relatedTestimonial": relatedTestimonial->,
      "relatedJournalEntries": *[_type == "journalEntry" && relatedProject._ref == ^._id] | order(publishedAt desc){
        _id,
        title,
        slug,
        excerpt,
        publishedAt,
        featured,
        coverImage${IMAGE_PROJECTION},
        "categories": categories[]->{ _id, title, slug, description }
      }
    }`,
    { slug },
  );
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
  return client.fetch(`*[_type == "journalPage"][0]{
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
  }`);
}

export async function getAllJournalEntries() {
  // Featured first, then newest first. Excerpt + cover only (no body).
  return client.fetch(`*[_type == "journalEntry"] | order(featured desc, publishedAt desc) ${JOURNAL_CARD_PROJECTION}`);
}

export async function getAllJournalCategories() {
  return client.fetch(`*[_type == "journalCategory"] | order(title asc){
    _id, title, slug, description,
    "postCount": count(*[_type == "journalEntry" && references(^._id)])
  }`);
}

export async function getJournalEntryBySlug(slug: string) {
  // Full doc including body. The body's inline image blocks get their asset
  // resolved + alt fallback at the GROQ layer so the renderer doesn't have to
  // chase asset refs for every block. Image gallery items + beforeAfter pairs
  // + sourceCard images + inline images all get the same treatment.
  return client.fetch(
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
  );
}

// Static path generation for /journal/[slug]. Returns just the slugs.
export async function getAllJournalSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await client.fetch(
    `*[_type == "journalEntry" && defined(slug.current)]{ slug }`,
  );
  return list.map((e) => e.slug?.current).filter(Boolean);
}

// ---- E-Design page --------------------------------------------------------

export async function getEDesignPage() {
  return client.fetch(`*[_type == "eDesignPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    howItWorks[]{
      stepNumber, title, body
    },
    whatsIncluded,
    tiers[]{
      name, price, priceNumeric, features, bestFor, ctaLabel
    },
    "faqRefs": faqRefs[]->{
      question, answer, category
    },
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`);
}

// ---- Shop page + collections + items -------------------------------------

export async function getShopPage() {
  return client.fetch(`*[_type == "shopPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    enabled,
    intro,
    disclosure,
    "collections": collections[]->{
      _id,
      title,
      "slug": slug.current,
      blurb,
      orderRank,
      "items": *[_type == "shopItem" && collection._ref == ^._id]
        | order(orderRank asc){
          _id, title,
          image${IMAGE_PROJECTION},
          vendor, affiliateUrl, note
        }
    }
  }`);
}

// ---- Gift certificates page -----------------------------------------------

export async function getGiftPage() {
  return client.fetch(`*[_type == "giftPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    options[]{
      label, amount, blurb
    },
    howItWorks[]{
      stepNumber, title, body
    },
    finePrint,
    ctaLabel
  }`);
}

// ---- Resources hub page ---------------------------------------------------

export async function getResourcesPage() {
  return client.fetch(`*[_type == "resourcesPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    cards[]{
      title, blurb,
      icon${IMAGE_PROJECTION},
      link
    }
  }`);
}

// ---- Privacy page ---------------------------------------------------------

export async function getPrivacyPage() {
  return client.fetch(`*[_type == "privacyPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    lastUpdated,
    body
  }`);
}

// ---- Press page + press items ---------------------------------------------

export async function getPressPage() {
  return client.fetch(`*[_type == "pressPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro
  }`);
}

// Press items ordered by orderRank for the strip + /press listing.
export async function getPressItems() {
  return client.fetch(`*[_type == "pressItem"] | order(orderRank asc){
    _id, outlet,
    logo${IMAGE_PROJECTION},
    quote, url, date, orderRank
  }`);
}

// ---- Style quiz config ----------------------------------------------------

export async function getStyleQuiz() {
  return client.fetch(`*[_type == "styleQuiz"][0]{
    seoImage${IMAGE_PROJECTION},
    introEyebrow, introHeadline, introSubhead,
    introImage${IMAGE_PROJECTION},
    questions[]{
      prompt, helpText,
      answers[]{
        label,
        image${IMAGE_PROJECTION},
        archetypeWeights[]{ archetypeSlug, weight }
      }
    },
    qualifiers[]{
      prompt, type,
      options[]{ label, value }
    },
    archetypes[]{
      name,
      "slug": slug.current,
      description,
      images[]${IMAGE_PROJECTION},
      "recommendedServiceRef": recommendedServiceRef->{ _id, name, "slug": slug.current },
      resultCtaLabel
    },
    gate{ mode, heading, blurb, consentNote, espTag },
    routing{
      highIntentRule, bookCtaLabel, guideCtaLabel,
      "guideRef": guideRef->{ _id, title, "slug": slug.current }
    }
  }`);
}

// ---- Budget calculator config ---------------------------------------------

export async function getBudgetCalculator() {
  return client.fetch(`*[_type == "budgetCalculator"][0]{
    seoImage${IMAGE_PROJECTION},
    introEyebrow, introHeadline, introSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    rooms[]{ label, baseLow, baseHigh },
    scopeOptions[]{ label, addLow, addHigh },
    addOns[]{ label, low, high },
    resultCopy,
    disclaimer,
    ctaLabel,
    consultPriceNote
  }`);
}

// ---- Lead magnets ---------------------------------------------------------

// All published lead magnets ordered for /guides index.
export async function getLeadMagnets() {
  return client.fetch(`*[_type == "leadMagnet" && published == true]
    | order(orderRank asc){
      _id, title,
      "slug": slug.current,
      summary,
      coverImage${IMAGE_PROJECTION},
      gateHeading, gateBlurb, buttonLabel, successMessage, espTag,
      seoTitle, seoDescription, orderRank
    }`);
}

// Single published lead magnet by slug for /guides/[slug].
export async function getLeadMagnet(slug: string) {
  return client.fetch(
    `*[_type == "leadMagnet" && slug.current == $slug && published == true][0]{
      _id, title,
      "slug": slug.current,
      summary,
      coverImage${IMAGE_PROJECTION},
      file{ asset->{ url } },
      gateHeading, gateBlurb, buttonLabel, successMessage, espTag,
      seoTitle, seoDescription
    }`,
    { slug },
  );
}

// Static path generation for /guides/[slug].
export async function getAllLeadMagnetSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await client.fetch(
    `*[_type == "leadMagnet" && published == true && defined(slug.current)]{ slug }`,
  );
  return list.map((m) => m.slug?.current).filter(Boolean);
}

// ---- Projects with before/after pairs ------------------------------------

// Projects that have at least one beforeAfter pair — for /portfolio/before-after.
export async function getProjectsWithBeforeAfter() {
  return client.fetch(`*[_type == "project" && count(beforeAfters) > 0]
    | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
      _id, title,
      "slug": slug.current,
      location, year, roomType, designStyle, briefSummary,
      heroImage${IMAGE_PROJECTION},
      beforeAfters[]{
        beforeImage${IMAGE_PROJECTION},
        afterImage${IMAGE_PROJECTION},
        caption
      }
    }`);
}

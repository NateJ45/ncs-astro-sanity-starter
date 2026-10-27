// Page-builder discriminated union.
//
// Generated types (sanity.types.ts) describe the raw *schema* shapes. The GROQ
// sectionsProjection() in queries.ts RESHAPES several fields at query time:
//   - Images: asset reference is resolved to a full asset document via `asset->`
//     and alt gets a coalesce fallback. The projected shape is wider than the
//     raw SanityImageAssetReference.
//   - CTA blocks: internalLink is resolved to `{ _type: string; slug: string }`
//     (not a union of Reference types).
//   - Rich sections inject collection fields that do not exist on the schema
//     type at all (services, points, steps, travelFees, siteSettingsText).
//
// For each divergence we use a locally-scoped override type rather than `as any`,
// so callers that read these fields get a meaningful type (not `unknown`).
//
// This file is safe to edit by hand. Do NOT import from it in sanity.types.ts.

import type {
  HeroSection as _HeroSection,
  RichTextSection as _RichTextSection,
  ImageTextSection as _ImageTextSection,
  GallerySection as _GallerySection,
  QuoteSection as _QuoteSection,
  StatSection as _StatSection,
  CtaBandSection as _CtaBandSection,
  VideoSection as _VideoSection,
  SpacerSection as _SpacerSection,
  FounderSection as _FounderSection, // scaffold: about
  ServicesGridSection as _ServicesGridSection, // scaffold: services
  TestimonialsSection as _TestimonialsSection, // scaffold: testimonials
  StorySection as _StorySection, // scaffold: about
  ValuesSection as _ValuesSection, // scaffold: philosophy
  ProcessSection as _ProcessSection, // scaffold: process
  ServiceAreaSection as _ServiceAreaSection,
  GuaranteeSection as _GuaranteeSection,
  // U7 new blocks — hand-authored below since typegen has not run yet
  // FaqSection, LogoStripSection, TeamSection, EmbedSection — not imported from
  // sanity.types yet; their projected types are fully defined below.
} from './sanity.types';
import type { BuilderPageBlock } from './builderBlocks.types';
import type { LibraryDocument } from './documents'; // scaffold: documents
import type { PortableTextBlock } from '@portabletext/types';

// ---------------------------------------------------------------------------
// Shared projected shapes
// ---------------------------------------------------------------------------

/** Image after `asset->` + alt coalesce in the GROQ projection. */
export interface ProjectedImage {
  _type: 'image';
  asset?: {
    _id?: string;
    _ref?: string;
    _type?: string;
    url?: string;
    metadata?: {
      dimensions?: { width?: number; height?: number; aspectRatio?: number };
      lqip?: string;
      blurHash?: string;
    };
    [key: string]: unknown;
  } | null;
  alt?: string;
  hotspot?: { x?: number; y?: number; height?: number; width?: number };
  crop?: { top?: number; bottom?: number; left?: number; right?: number };
  caption?: string;
  [key: string]: unknown;
}

/**
 * The image shape every component that renders a Sanity image should accept.
 *
 * Nine components used to redeclare their own `interface SanityImageObject`
 * with `asset?: { _ref?: string; _id?: string }` and REQUIRED hotspot/crop
 * numbers. None of those matched `ProjectedImage`, which is what the GROQ
 * projection actually returns: `asset->` resolves to a whole asset document
 * (extra keys, and `null` when the reference is broken) and Sanity marks every
 * hotspot and crop number optional. `astro check` reported eight assignment
 * errors along that seam the first time it ran here, 2026-09-06. Every one was
 * the prop contract being narrower than the data, not the data being wrong.
 *
 * `_type` is optional because the code-defined fallbacks in
 * src/data/defaultSections.ts build image objects without it.
 */
export interface SanityImageObject extends Omit<ProjectedImage, '_type'> {
  // Spelled out rather than written as `Omit<ProjectedImage, '_type'>` alone:
  // ProjectedImage carries an index signature, and Omit over an index signature
  // drops every named property with it, which would leave `.alt` typed `{}`.
  _type?: string;
  asset?: ProjectedImage['asset'];
  alt?: string;
  hotspot?: { x?: number; y?: number; height?: number; width?: number };
  crop?: { top?: number; bottom?: number; left?: number; right?: number };
  caption?: string;
}

/** CTA block after `internalLink->{ _type, "slug": slug.current }` projection. */
export interface ProjectedCtaBlock {
  _type: 'ctaBlock';
  label?: string;
  linkType?: 'internal' | 'external' | 'email' | 'phone';
  /** Resolved internal link — shape is `{ _type: string; slug: string }` after deref. */
  internalLink?: { _type?: string; slug?: string } | null;
  externalUrl?: string;
  emailAddress?: string;
  phoneNumber?: string;
  openInNewTab?: boolean;
  /** Fallback href used by default sections (no Sanity project). */
  href?: string;
}

// ---------------------------------------------------------------------------
// Per-block projected types
// Each member carries _key (required for page-builder arrays in Sanity) and
// overrides only the fields that the projection reshapes.
// ---------------------------------------------------------------------------

export type ProjectedHeroSection = { _key: string } & Omit<
  _HeroSection,
  | 'backgroundImage'
  | 'primaryCta'
  | 'secondaryCta'
  | 'backgroundVideo'
  | 'backgroundVideoPhone'
  | 'glance'
> & {
    backgroundImage?: ProjectedImage | null;
    primaryCta?: ProjectedCtaBlock | null;
    secondaryCta?: ProjectedCtaBlock | null;
    // The photo hero (card 189): the clips as URL and type, the short-facts card's link resolved.
    backgroundVideo?: { url?: string | null; mimeType?: string | null } | null;
    backgroundVideoPhone?: { url?: string | null; mimeType?: string | null } | null;
    glance?: {
      title?: string | null;
      lines?: (string | null)[] | null;
      link?: ProjectedCtaBlock | null;
    } | null;
  };

export type ProjectedRichTextSection = { _key: string } & _RichTextSection & {
    /** Non-schema extra field present in some defaultSections entries. */
    cta?: ProjectedCtaBlock | null;
    [key: string]: unknown;
  };

export type ProjectedImageTextSection = { _key: string } & Omit<
  _ImageTextSection,
  'image' | 'cta'
> & {
    image?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
    /** Non-schema alias for imageSide present in some defaultSections entries. */
    imagePosition?: 'left' | 'right';
    [key: string]: unknown;
  };

export type ProjectedGallerySection = { _key: string } & Omit<_GallerySection, 'images'> & {
    images?: ProjectedImage[];
  };

export type ProjectedQuoteSection = { _key: string } & _QuoteSection;

export type ProjectedStatSection = { _key: string } & _StatSection;

export type ProjectedCtaBandSection = { _key: string } & Omit<
  _CtaBandSection,
  'backgroundImage' | 'cta'
> & {
    backgroundImage?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
  };

export type ProjectedVideoSection = { _key: string } & _VideoSection;

export type ProjectedSpacerSection = { _key: string } & _SpacerSection & {
    /** Non-schema size field present in some defaultSections entries. */
    size?: string;
    [key: string]: unknown;
  };

// scaffold: about
export type ProjectedFounderSection = { _key: string } & Omit<
  _FounderSection,
  'portrait' | 'cta'
> & {
    portrait?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
  };
// scaffold:end

// scaffold: services
/** servicesGridSection adds a `services` array resolved from the collection. */
export type ProjectedServicesGridSection = { _key: string } & Omit<_ServicesGridSection, 'cta'> & {
    cta?: ProjectedCtaBlock | null;
    /** Resolved service documents from `*[_type == "service"]`. */
    services?: Array<{
      _id?: string;
      _type?: string;
      name?: string;
      slug?: { current?: string };
      price?: string;
      priceNumeric?: number;
      shortDescription?: string;
      features?: string[];
      bestFor?: string;
      featuredImage?: ProjectedImage;
      ctaLabel?: string;
      [key: string]: unknown;
    }>;
  };
// scaffold:end

// scaffold: testimonials
/** Testimonial shape after dereffing in the projection. */
interface ProjectedTestimonial {
  _id?: string;
  _type?: string;
  quote?: string;
  attribution?: string;
  detail?: string;
  relatedProject?: { title?: string; slug?: string } | null;
  [key: string]: unknown;
}

export type ProjectedTestimonialsSection = { _key: string } & Omit<
  _TestimonialsSection,
  'featuredQuote' | 'testimonialsToShow'
> & {
    featuredQuote?: ProjectedTestimonial | null;
    testimonialsToShow?: ProjectedTestimonial[];
  };
// scaffold:end

// scaffold: about
export type ProjectedStorySection = { _key: string } & Omit<_StorySection, 'portrait'> & {
    portrait?: ProjectedImage | null;
  };
// scaffold:end

// scaffold: philosophy
/** valuesSection adds a `points` array resolved from the collection. */
export type ProjectedValuesSection = { _key: string } & _ValuesSection & {
    points?: Array<{
      title?: string;
      description?: string;
      displayOrder?: number;
    }>;
  };
// scaffold:end

// scaffold: process
/** processSection adds a `steps` array resolved from the collection + cta projection. */
export type ProjectedProcessSection = { _key: string } & Omit<_ProcessSection, 'cta'> & {
    cta?: ProjectedCtaBlock | null;
    steps?: Array<{
      stepNumber?: number;
      title?: string;
      timeEstimate?: string;
      shortDescription?: string;
      features?: string[];
      tierNote?: string;
    }>;
  };
// scaffold:end

/** serviceAreaSection adds `travelFees` resolved from businessInfo. */
export type ProjectedServiceAreaSection = { _key: string } & _ServiceAreaSection & {
    travelFees?: Array<{ distanceLabel?: string; fee?: string }>;
  };

/** guaranteeSection adds `siteSettingsText` resolved from siteSettings. */
export type ProjectedGuaranteeSection = { _key: string } & _GuaranteeSection & {
    siteSettingsText?: string;
  };

// ---------------------------------------------------------------------------
// U7 new blocks — hand-authored projected types (typegen will regenerate
// sanity.types.ts after this unit lands; at that point the orchestrator should
// verify these align with the generated shapes and update the imports above).
// ---------------------------------------------------------------------------

// scaffold: faq
/** A dereffed faqItem projected inside faqSection.items. */
export interface ProjectedFaqItem {
  _id?: string;
  _type?: string;
  question?: string;
  answer?: any;
  category?: string;
  displayOrder?: number;
}

/**
 * faqSection — references faqItem documents, dereffed at query time.
 * SELF_CONTAINED (no surface prop).
 * NOTE: does not emit FAQPage JSON-LD (Google penalises duplicate markup).
 */
export interface ProjectedFaqSection {
  _type: 'faqSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  /** Word in `headline` rendered in the script accent face. */
  headingAccent?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  /** faqItem refs resolved to { question, answer, category, displayOrder }. */
  items?: ProjectedFaqItem[];
  cta?: ProjectedCtaBlock | null;
}
// scaffold:end

/** A single logo image inside logoStripSection, after asset-> projection. */
export type ProjectedLogoStripLogo = ProjectedImage;

/**
 * logoStripSection — grayscale logo row or grid.
 * SELF_CONTAINED (no surface prop).
 */
export interface ProjectedLogoStripSection {
  _type: 'logoStripSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  logos?: ProjectedLogoStripLogo[];
  layout?: 'row' | 'grid';
}

/** A single team member inline object inside teamSection. */
export interface ProjectedTeamMember {
  _key?: string;
  name?: string;
  role?: string;
  photo?: ProjectedImage | null;
  bio?: string;
  socialLinks?: Array<{ _key?: string; label?: string; url?: string }>;
}

/**
 * teamSection — inline team member grid (no teamMember collection dependency).
 * SELF_CONTAINED (no surface prop).
 * A future modules/team module will own a full teamMember collection.
 */
export interface ProjectedTeamSection {
  _type: 'teamSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  members?: ProjectedTeamMember[];
}

/**
 * embedSection — sandboxed iframe, URL or raw code variant.
 * SELF_CONTAINED (no surface prop).
 */
export interface ProjectedEmbedSection {
  _type: 'embedSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  embedUrl?: string;
  embedCode?: string;
  /** Card 121: run embedCode directly on the page instead of in its own box. */
  runsOnPage?: boolean;
  heightHint?: 'short' | 'medium' | 'tall';
}

/**
 * latestVideoSection - the newest video from a YouTube channel (card 197). CONTENT type.
 * The video itself is read at build time from the channel feed, not projected from Sanity.
 */
export interface ProjectedLatestVideoSection {
  _type: 'latestVideoSection';
  _key: string;
  heading?: string;
  intro?: string;
  channelId?: string;
  showChannelLink?: boolean;
  /** The /styleguide/sections/ wall only: draw a sample, touch no network. */
  _fixture?: boolean;
}

// scaffold: documents
/**
 * documentsSection - a list of downloadable files (card 197). CONTENT type.
 * `items` is the newest libraryDocuments, projected by the GROQ arm in queries.ts.
 */
export interface ProjectedDocumentsSection {
  _type: 'documentsSection';
  _key: string;
  heading?: string;
  intro?: string;
  category?: string;
  limit?: number;
  showDates?: boolean;
  items?: LibraryDocument[];
}
// scaffold:end

/**
 * rsvpSection - an RSVP form for one event (card 127). CONTENT type.
 * `pageId` is projected (^._id) so the form can name its event.
 */
export interface ProjectedRsvpSection {
  _type: 'rsvpSection';
  _key: string;
  pageId?: string;
  heading?: string;
  intro?: string;
  eventName?: string;
  startsAt?: string;
  where?: string;
  capacity?: number;
  waitlist?: boolean;
  maxParty?: number;
  closesAt?: string;
  questions?: unknown[];
  confirmationNote?: string;
}

/**
 * formSection - one editor-written form (the form builder, card 194). CONTENT type.
 * `form` is the dereferenced form document; src/lib/site-form.ts normalizes it.
 */
export interface ProjectedFormSection {
  _type: 'formSection';
  _key: string;
  form?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Church-reverse-port: dynamicListSection
// ---------------------------------------------------------------------------

/**
 * A single item inside dynamicListSection.items after the per-source GROQ
 * subquery. All sources normalise to the same shape so the component is
 * source-agnostic. `href` is null for sources that have no detail page
 * (testimonials, faqs).
 */
export interface ProjectedDynamicListItem {
  _id?: string;
  title?: string;
  meta?: string | null;
  summary?: string | null;
  href?: string | null;
  coverImage?: ProjectedImage | null;
  /** FAQ answer (present only when source == "faqs"). */
  answer?: any;
}

/**
 * dynamicListSection — auto-pulls the latest items from a core collection.
 * SELF_CONTAINED (no surface prop).
 * Source-specific behaviour:
 *   journal      -> latest journalEntry cards (title, excerpt, publishedAt, coverImage)
 *   services     -> all services ordered by orderRank (name, price, shortDescription)
 *   testimonials -> latest testimonials (attribution, detail, quote)
 *   faqs         -> faqItems ordered by displayOrder (question, answer, category)
 */
export interface ProjectedDynamicListSection {
  _type: 'dynamicListSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  columns?: 2 | 3;
  /**
   * Which collection to pull from. Every value this can take belongs to a
   * scaffold capability (journal, services, testimonials, faq), so this is a
   * plain string rather than a union: a fork that removes all four would
   * otherwise be left with an empty union, which does not parse. The dropdown
   * in `sections.ts` is what actually limits an editor's choice, and each of
   * its options carries its own scaffold marker.
   */
  source?: string;
  limit?: number;
  items?: ProjectedDynamicListItem[];
  cta?: ProjectedCtaBlock | null;
}

// ---------------------------------------------------------------------------
// Every main page a page builder (card 190, ported from FBC Auburn): the parts of Contact,
// Privacy and Journal that were drawn in code. Self-contained.
// ---------------------------------------------------------------------------

/** The Contact page's form settings, read into the Contact form block by its GROQ arm. */
export interface ContactFormSettings {
  formIntroNote?: string | null;
  formProjectTypeOptions?: string[] | null;
  formLocationOptions?: string[] | null;
  formBudgetOptions?: string[] | null;
  formTimelineOptions?: string[] | null;
  formSourceOptions?: string[] | null;
  formFields?: { label?: string; kind?: string; options?: string[]; required?: boolean }[] | null;
  whatToExpectEyebrow?: string | null;
  whatToExpectHeadline?: string | null;
  whatToExpectContent?: PortableTextBlock[] | null;
  postInquiryRoadmap?: { title?: string; body?: string; timeEstimate?: string }[] | null;
  schedulingLink?: string | null;
  schedulingLinkLabel?: string | null;
  availabilityNote?: string | null;
}
/** contactFormSection: the contact form and its sidebar. */
export interface ProjectedContactFormSection {
  _type: 'contactFormSection';
  _key: string;
  sidebar?: boolean;
  settings?: ContactFormSettings | null;
}
/** privacyPolicySection: the policy text and its date. */
export interface ProjectedPrivacyPolicySection {
  _type: 'privacyPolicySection';
  _key: string;
  lastUpdated?: string | null;
  body?: PortableTextBlock[] | null;
}
// scaffold: journal
/** journalPostsSection: the category chips, every post and the newsletter. */
export interface ProjectedJournalPostsSection {
  _type: 'journalPostsSection';
  _key: string;
  showCategories?: boolean;
  showNewsletter?: boolean;
}
// scaffold:end

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type PageBuilderBlock =
  | ProjectedHeroSection
  | ProjectedRichTextSection
  | ProjectedImageTextSection
  | ProjectedGallerySection
  | ProjectedQuoteSection
  | ProjectedStatSection
  | ProjectedCtaBandSection
  | ProjectedVideoSection
  | ProjectedSpacerSection
  | ProjectedFounderSection // scaffold: about
  | ProjectedServicesGridSection // scaffold: services
  | ProjectedTestimonialsSection // scaffold: testimonials
  | ProjectedStorySection // scaffold: about
  | ProjectedValuesSection // scaffold: philosophy
  | ProjectedProcessSection // scaffold: process
  | ProjectedServiceAreaSection
  | ProjectedGuaranteeSection
  // U7 new blocks
  | ProjectedFaqSection // scaffold: faq
  | ProjectedLogoStripSection
  | ProjectedTeamSection
  | ProjectedEmbedSection
  | ProjectedRsvpSection
  | ProjectedLatestVideoSection
  | ProjectedDocumentsSection // scaffold: documents
  | ProjectedFormSection
  // Church-reverse-port
  | ProjectedDynamicListSection
  // Every main page a page builder (card 190)
  | ProjectedContactFormSection
  | ProjectedPrivacyPolicySection
  | ProjectedJournalPostsSection // scaffold: journal
  // The builder kit (builderBlocks.types.ts, PORTS.md card 173)
  | BuilderPageBlock;

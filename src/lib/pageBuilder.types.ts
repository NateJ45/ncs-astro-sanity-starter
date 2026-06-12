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
  FounderSection as _FounderSection,
  ServicesGridSection as _ServicesGridSection,
  TestimonialsSection as _TestimonialsSection,
  StorySection as _StorySection,
  ValuesSection as _ValuesSection,
  ProcessSection as _ProcessSection,
  ServiceAreaSection as _ServiceAreaSection,
  GuaranteeSection as _GuaranteeSection,
} from './sanity.types';

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
  'backgroundImage' | 'primaryCta' | 'secondaryCta'
> & {
  backgroundImage?: ProjectedImage | null;
  primaryCta?: ProjectedCtaBlock | null;
  secondaryCta?: ProjectedCtaBlock | null;
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

export type ProjectedGallerySection = { _key: string } & Omit<
  _GallerySection,
  'images'
> & {
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

export type ProjectedFounderSection = { _key: string } & Omit<
  _FounderSection,
  'portrait' | 'cta'
> & {
  portrait?: ProjectedImage | null;
  cta?: ProjectedCtaBlock | null;
};

/** servicesGridSection adds a `services` array resolved from the collection. */
export type ProjectedServicesGridSection = { _key: string } & Omit<
  _ServicesGridSection,
  'cta'
> & {
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

export type ProjectedStorySection = { _key: string } & Omit<
  _StorySection,
  'portrait'
> & {
  portrait?: ProjectedImage | null;
};

/** valuesSection adds a `points` array resolved from the collection. */
export type ProjectedValuesSection = { _key: string } & _ValuesSection & {
  points?: Array<{
    title?: string;
    description?: string;
    displayOrder?: number;
  }>;
};

/** processSection adds a `steps` array resolved from the collection + cta projection. */
export type ProjectedProcessSection = { _key: string } & Omit<
  _ProcessSection,
  'cta'
> & {
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

/** serviceAreaSection adds `travelFees` resolved from businessInfo. */
export type ProjectedServiceAreaSection = { _key: string } & _ServiceAreaSection & {
  travelFees?: Array<{ distanceLabel?: string; fee?: string }>;
};

/** guaranteeSection adds `siteSettingsText` resolved from siteSettings. */
export type ProjectedGuaranteeSection = { _key: string } & _GuaranteeSection & {
  siteSettingsText?: string;
};

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
  | ProjectedFounderSection
  | ProjectedServicesGridSection
  | ProjectedTestimonialsSection
  | ProjectedStorySection
  | ProjectedValuesSection
  | ProjectedProcessSection
  | ProjectedServiceAreaSection
  | ProjectedGuaranteeSection;

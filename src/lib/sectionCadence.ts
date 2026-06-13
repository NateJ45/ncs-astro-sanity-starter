// Foundation, edit with care
// Surface-cadence classifier for the page builder.
//
// SectionRenderer.astro calls `classifySections()` to assign background surface
// classes before rendering. This module owns the classification logic so it can
// be unit-tested independently of the Astro component.
//
// Rules (from the spec):
//   Self-contained blocks: heroSection, ctaBandSection, statSection, spacerSection
//     — manage their own surface; do NOT participate in the alternating sequence.
//   Content blocks: richTextSection, imageTextSection, gallerySection,
//     quoteSection, videoSection
//     — assigned alternating 'background' / 'muted' surface in sequence.
//
// The leading-muted offset:
//   When the first block is a heroSection WITHOUT a backgroundImage (a "text
//   hero" — renders on the default bg-background surface), start the content
//   cadence at index 1 (muted) so the first content block contrasts rather
//   than blending into the hero. An image hero is dark, so the default
//   starting index 0 (background = light) already contrasts.

/** _type strings for blocks that manage their own surface. */
export const SELF_CONTAINED_TYPES = new Set([
  'heroSection',
  'ctaBandSection',
  'statSection',
  'spacerSection',
  // Rich section types — phase B
  'founderSection',
  'servicesGridSection',
  'testimonialsSection',
  'valuesSection',
  'processSection',
  // U7 new blocks — all four are SELF_CONTAINED (manage their own surface)
  'faqSection',
  'logoStripSection',
  'teamSection',
  'embedSection',
  // Church-reverse-port: dynamic list section manages its own surface
  'dynamicListSection',
]);

/** _type strings for blocks that receive alternating surface assignment. */
export const CONTENT_TYPES = new Set([
  'richTextSection',
  'imageTextSection',
  'gallerySection',
  'quoteSection',
  'videoSection',
  // Rich section types — phase B
  'storySection',
  'serviceAreaSection',
  'guaranteeSection',
]);

export interface SectionBlock {
  _type: string;
  [key: string]: unknown;
}

export interface ClassifiedRow<T extends SectionBlock = SectionBlock> {
  block: T;
  /** Assigned surface for content blocks; null for self-contained blocks. */
  surface: 'background' | 'muted' | null;
  /** Whether a SectionDivider should be inserted BEFORE this row. */
  insertDividerBefore: boolean;
  /** Generated heading id for accessible aria-labelledby. */
  headingId: string;
}

/**
 * Classify an array of section blocks into rows with surface assignments and
 * divider insertion markers.
 *
 * Generic over T so callers can pass a typed block union and receive
 * ClassifiedRow<T> back — enabling narrowing in templates without index sigs.
 * Minimal stub objects (e.g. `{ _type: 'heroSection' }`) still satisfy the
 * `T extends { _type: string }` constraint, so existing tests compile unchanged.
 *
 * @param sections  Raw section array from Sanity (may contain nulls — filtered out).
 * @param idPrefix  Prefix for generated heading ids (default: 'section').
 */
export function classifySections<T extends { _type: string }>(
  sections: unknown[],
  idPrefix = 'section',
): ClassifiedRow<T & SectionBlock>[] {
  const list = (sections ?? []).filter(
    (s): s is SectionBlock => !!s && typeof s === 'object' && '_type' in s,
  ) as (T & SectionBlock)[];

  // If the page opens with a text hero (no backgroundImage asset), start the
  // content cadence on muted so the first section contrasts.
  const first = list[0];
  const opensWithTextHero =
    first?._type === 'heroSection' &&
    !(first as Record<string, unknown>)?.backgroundImage;

  let contentIdx = opensWithTextHero ? 1 : 0;
  let prevContentSurface: 'background' | 'muted' | null = null;

  return list.map((block, i): ClassifiedRow<T & SectionBlock> => {
    let surface: 'background' | 'muted' | null = null;

    if (CONTENT_TYPES.has(block._type)) {
      surface = contentIdx % 2 === 0 ? 'background' : 'muted';
      contentIdx += 1;
    }

    // Insert a divider before this row when:
    //   - Both this and the previous content block are content blocks.
    //   - Their surfaces differ.
    // Self-contained blocks neither trigger nor suppress dividers between
    // adjacent content blocks.
    const insertDividerBefore =
      surface !== null &&
      prevContentSurface !== null &&
      surface !== prevContentSurface;

    if (surface !== null) {
      prevContentSurface = surface;
    }

    return {
      block,
      surface,
      insertDividerBefore,
      headingId: `${idPrefix}-${i}`,
    };
  });
}

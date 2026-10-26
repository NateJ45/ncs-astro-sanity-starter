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
//
// LOOKS (2026-10-18, src/lib/section-looks.ts, rule 9 as amended):
//   An eligible content block can carry a `look`. Unset or Standard is the
//   cadence above, untouched, so every existing page renders as before.
//   Quiet: always the plain page surface ('background'). The cadence restarts
//     from it, so the next Standard block is 'muted' and the page keeps
//     alternating after it.
//   Feature: the deep brand band ('feature'). It sits OUTSIDE the alternation,
//     like a self-contained block: it neither advances the counter nor takes a
//     divider on either side (a dark band is its own edge). Two dark bands may
//     never touch, so a Feature directly after a dark row (another Feature, an
//     image hero, a CTA band) or directly before a CTA band or image hero falls
//     back to Standard. The Studio says so in the field's description.

import { resolveLook, type SectionLook } from './section-looks.ts';
import type { CadenceSurface } from './surfaces.ts';

/** _type strings for blocks that manage their own surface. */
export const SELF_CONTAINED_TYPES = new Set([
  'heroSection',
  'ctaBandSection',
  'statSection',
  'spacerSection',
  // Rich section types — phase B
  'founderSection', // scaffold: about
  'servicesGridSection', // scaffold: services
  'testimonialsSection', // scaffold: testimonials
  'valuesSection', // scaffold: philosophy
  'processSection', // scaffold: process
  // U7 new blocks — all four are SELF_CONTAINED (manage their own surface)
  'faqSection', // scaffold: faq
  'logoStripSection',
  'teamSection',
  'embedSection',
  // Church-reverse-port: dynamic list section manages its own surface
  'dynamicListSection',
  // The builder kit (card 173): the dated notice draws its own slim band.
  'noticeSection',
]);

/** _type strings for blocks that receive alternating surface assignment. */
export const CONTENT_TYPES = new Set([
  'richTextSection',
  'imageTextSection',
  'gallerySection',
  'quoteSection',
  'videoSection',
  // Rich section types — phase B
  'storySection', // scaffold: about
  'serviceAreaSection',
  'guaranteeSection',
  // The email backbone (card 127)
  'rsvpSection',
  // The builder kit (builderSections.ts, PORTS.md card 173)
  'columnsSection',
  'buttonRowSection',
  'photoSection',
  'accordionSection',
  'tabsSection',
  'countdownSection',
  'timelineSection',
  'letterSection',
  'eventDetailsSection',
  'scheduleSection',
  'photoCardsSection',
]);

/**
 * Self-contained rows that paint a DARK band, so a Feature look must not touch
 * them. The CTA band is always the Ink slab; a hero is dark only when it has a
 * background photo (see the leading-muted offset above).
 */
function isDarkSelfContained(block: SectionBlock | undefined): boolean {
  if (!block) return false;
  if (block._type === 'ctaBandSection') return true;
  return block._type === 'heroSection' && !!block.backgroundImage;
}

export interface SectionBlock {
  _type: string;
  [key: string]: unknown;
}

export interface ClassifiedRow<T extends SectionBlock = SectionBlock> {
  block: T;
  /** Assigned surface for content blocks; null for self-contained blocks. */
  surface: CadenceSurface | null;
  /**
   * The look this row RENDERS with, after the cadence's overrule (a Feature
   * that would touch another dark band renders as Standard). Always
   * 'standard' for self-contained blocks.
   */
  look: SectionLook;
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
    first?._type === 'heroSection' && !(first as Record<string, unknown>)?.backgroundImage;

  let contentIdx = opensWithTextHero ? 1 : 0;
  let prevContentSurface: CadenceSurface | null = null;
  // Whether the row just rendered paints a dark band (a Feature row or a dark
  // self-contained block), for the "two dark bands never touch" rule.
  let prevDark = false;

  return list.map((block, i): ClassifiedRow<T & SectionBlock> => {
    let surface: CadenceSurface | null = null;
    let look: SectionLook = 'standard';

    if (CONTENT_TYPES.has(block._type)) {
      look = resolveLook(block._type, block.look);
      if (look === 'feature' && (prevDark || isDarkSelfContained(list[i + 1]))) {
        look = 'standard';
      }

      if (look === 'feature') {
        surface = 'feature';
        // Out of the alternation: no counter step, and no divider either side.
        prevContentSurface = null;
      } else if (look === 'quiet') {
        surface = 'background';
        // Restart the rhythm from the plain surface: the next Standard is muted.
        contentIdx = 1;
      } else {
        surface = contentIdx % 2 === 0 ? 'background' : 'muted';
        contentIdx += 1;
      }
    }
    const dark = surface === 'feature' || isDarkSelfContained(block);

    // Insert a divider before this row when:
    //   - Both this and the previous content block are content blocks.
    //   - Their surfaces differ.
    // Self-contained blocks neither trigger nor suppress dividers between
    // adjacent content blocks.
    const insertDividerBefore =
      surface !== null && prevContentSurface !== null && surface !== prevContentSurface;

    if (surface !== null && surface !== 'feature') {
      prevContentSurface = surface;
    }
    prevDark = dark;

    return {
      block,
      surface,
      look,
      insertDividerBefore,
      headingId: `${idPrefix}-${i}`,
    };
  });
}

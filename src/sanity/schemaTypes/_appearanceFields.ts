// Safe to edit by hand
// =============================================================================
// Appearance fields shared by the two block libraries (PORTS.md card 26)
// =============================================================================
// sections.ts and richSections.ts both define page-builder blocks, and both
// need the same four controls. They live here rather than being copied twice,
// which is what the header comment in richSections.ts already asked for.
//
// WHAT IS NOT HERE, and why. There is no surface or colour field. That is this
// template's oldest architecture rule (CLAUDE.md #9: the alternating-surface
// cadence lives in src/lib/sectionCadence.ts and blocks carry no colour field),
// and it holds so that reordering a page can never break the page rhythm. The
// controls below change TEXT and ARRANGEMENT, never a band's colour:
//
//   headingAccentField  one word of a heading in the brand accent - the editor
//                       picks the WORD, the palette picks the colour.
//   richTwin            the bold/italic twin of a plain support-text string.
//   hideWhenRich        hides the plain field once its twin holds text.
//   columnsField        how many cards across, from the shared registry.
// =============================================================================

import { defineField, defineArrayMember } from 'sanity';
import { hasInlineRich } from '../../lib/inline-rich';
import { columnFallback, columnOptions } from '../../lib/layout-variants';

// -----------------------------------------------------------------------------
// Inline emphasis on curated plain-string support text
// -----------------------------------------------------------------------------
// A handful of short SUPPORT-TEXT fields (a subhead, an intro) are plain
// strings, so an editor could not italicise a product name or bold one promise
// inside them. Each curated one now has a "rich twin": a sibling portable text
// field allowing exactly two marks, bold and italic, and nothing else.
//
// The rules that make this safe to ship against a live dataset:
//   - the plain field keeps its name, its type and its stored value,
//   - the twin is a NEW field, so no document has one and every page renders
//     the string exactly as before (scripts/page-parity.mjs holds that line),
//   - the plain field HIDES only once the twin holds text, so an editor never
//     sees two boxes both claiming to be the subhead,
//   - the twin is always visible, so it is discoverable without a hunt.
// Headlines are deliberately NOT on the list. One emphasis device per heading
// is the house rule, and the two devices for a heading are the script accent
// and the accent word below.
const inlineRichBody = {
  type: 'array' as const,
  of: [
    defineArrayMember({
      type: 'block',
      // One style, two marks, no lists, no links, no annotations. The Studio
      // toolbar collapses to a bold button and an italic button.
      styles: [{ title: 'Normal', value: 'normal' }],
      lists: [],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
        ],
        annotations: [],
      },
    }),
  ],
};

/** The rich twin of a plain string field. Title matches the field it twins. */
export function richTwin(name: string, title: string) {
  return defineField({
    name,
    title,
    ...inlineRichBody,
    description: 'You can bold or italicize here.',
  });
}

/** Hide the plain field once its twin holds text. */
export function hideWhenRich(twin: string) {
  return ({ parent }: { parent?: Record<string, unknown> }) => hasInlineRich(parent?.[twin]);
}

/**
 * One word of a heading, set in the brand accent colour.
 *
 * The colour sibling of the existing script accent, and held to the same rule:
 * at most one accent per heading (SectionHeading.astro enforces the precedence).
 * Matching is case-insensitive and stops at the first hit; a word that is not in
 * the heading simply does nothing.
 */
export function headingAccentField() {
  return defineField({
    name: 'headingAccent',
    title: 'Accent word in the heading',
    type: 'string',
    description:
      'Optional. Type a word or short phrase from the heading above and it is set in the brand accent colour. Leave it blank for a plain heading, and leave it blank if you are already using the script accent.',
  });
}

/**
 * The "how many across" control for one grid section.
 *
 * The list and the stored default both come from src/lib/layout-variants.ts,
 * which also holds the class strings the component emits, so the Studio and the
 * site cannot disagree. Stored as a number, matching gallerySection.columns,
 * which has been a number since it was written.
 */
export function columnsField(type: string) {
  return defineField({
    name: 'columns',
    title: 'How many across',
    type: 'number',
    description: 'On a phone this section always stacks, whichever you pick.',
    options: { list: columnOptions(type), layout: 'radio' },
    initialValue: columnFallback(type),
  });
}

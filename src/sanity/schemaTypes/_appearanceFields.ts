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
//   lookField           (2026-10-18) a short enum of DESIGNED looks (Standard,
//                       Quiet, Feature) from src/lib/section-looks.ts. The
//                       editor picks a look; SectionRenderer's cadence turns it
//                       into a measured surface with the neighbours in view, so
//                       this is still not a colour field (rule 9 as amended).
// =============================================================================

import { defineField, defineArrayMember } from 'sanity';
import { hasInlineRich } from '../../lib/inline-rich';
import { columnFallback, columnOptions } from '../../lib/layout-variants';
import { lookOptionsFor } from '../../lib/section-looks';
import { SectionLookInput } from '../components/SectionLookInput';

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

/**
 * The rich twin of a plain string field. Title matches the field it twins.
 *
 * It HIDES while it is empty (PORTS.md card 187, from FBC Auburn), so the Studio
 * shows exactly one "Subhead" box at a time. Both boxes used to show side by side
 * with the same title and nothing to say which one counted. The plain field is
 * the one an editor types into; the twin appears only once it holds text (the
 * in-canvas editor fills it the first time someone bolds or italicizes a word),
 * and at that point hideWhenRich() hides the plain field, so the two never show
 * together. The stored value is never touched.
 */
export function richTwin(name: string, title: string) {
  return defineField({
    name,
    title,
    ...inlineRichBody,
    description:
      'This version of the line has bold or italic in it, so it shows on the page instead of the plain line. Empty this box to go back to the plain line.',
    hidden: ({ value }: { value?: unknown }) => !hasInlineRich(value),
  });
}

/**
 * The older script accent ("Handwritten accent word"), kept for its data only.
 *
 * (PORTS.md card 187, from FBC Auburn.) Blocks that also offer "Accent word in
 * the heading" showed two accent boxes, and an editor cannot tell them apart.
 * This one now shows only on a block that already holds a word, with a note to
 * move it, so no page loses an accent it has. A block with no word stored shows
 * just the accent word box. Never delete the field (rule 1). Use it only where
 * headingAccentField() sits right after it; the hero has no twin, so its
 * script accent stays a plain visible field.
 */
export function scriptAccentField(heading: 'heading' | 'headline') {
  return defineField({
    name: 'scriptAccent',
    title: 'Handwritten accent word (older, please move)',
    type: 'string',
    description: `An older way to style one word of the ${heading}. Please type the word into "Accent word in the heading" instead and clear this box.`,
    hidden: ({ value }: { value?: unknown }) => !value,
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
      'Optional. Type a word or short phrase from the heading above and it is set in the brand accent color. Leave it blank for a plain heading, and leave it blank if you are already using the script accent.',
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

/**
 * The "Look" control for one content block (rule 9 as amended, 2026-10-18).
 *
 * A string enum, never a colour: the list comes from src/lib/section-looks.ts,
 * which also says which blocks offer which looks. No initialValue on purpose:
 * unset means Standard, so new blocks and every block that existed before this
 * field store the same nothing, and no page moves until an editor picks a look.
 * `look` is in NON_STEGA_FIELDS (src/lib/cms-preview.ts, rule 8b).
 */
export function lookField(type: string) {
  return defineField({
    name: 'look',
    title: 'Look',
    type: 'string',
    description:
      'How this section sits on the page. Standard follows the page rhythm. Two Feature sections never sit side by side, and a Feature next to the closing call to action shows as Standard.',
    options: {
      list: lookOptionsFor(type).map((l) => ({ title: l.title, value: l.value })),
      layout: 'radio',
    },
    components: { input: SectionLookInput },
  });
}

// Safe to edit by hand
// =============================================================================
// Page templates - the starting points offered when someone makes a new page
// =============================================================================
// When an editor clicks "+" on Custom pages, the Studio asks which of these to
// start from (PORTS.md card 109). Each one fills the page with sections and
// clearly marked example text, so nobody faces an empty page wondering what
// goes where, and nothing example-shaped can go live unnoticed: every example
// line starts "Example:", and the page builder shows a warning on any section
// that still has one (src/lib/page-guardrails.ts).
//
// THIS FILE IS THE SITE'S OWN. It is not PORTABLE: a church, a shop and a
// studio want different starting points, so each fork rewrites this list. Keep
// to block types a custom page accepts (SECTION_TYPES in schemaTypes/sections.ts);
// src/lib/authoring.test.ts fails if a template names one that does not exist,
// leaves an array member without a `_key`, or forgets the example marker.
//
// `sections` is a FUNCTION, called each time a page is made, and it runs the
// result through freshKeys(), so two pages made from one template never share a
// `_key`. Write any `_key` you like below (or none): they are all replaced.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// sanity.config.ts turns the list into Studio templates.
// =============================================================================

import { example, freshKeys } from '../lib/authoring.ts';

export interface PageTemplate {
  /** Stable id. Changing it only changes the menu; pages already made keep their content. */
  id: string;
  /** What the "new page" menu says. */
  title: string;
  /** One line under the title, in the menu. */
  description: string;
  /** The sections a new page starts with. */
  sections: () => Record<string, unknown>[];
}

// ── Small builders, so the templates read as page outlines ───────────────────

/** One Portable Text paragraph (or heading, with a style). */
const para = (text: string, style = 'normal') => ({
  _type: 'block',
  style,
  markDefs: [],
  children: [{ _type: 'span', marks: [], text }],
});

/** A button the editor points at a page of their choice. */
const button = (label: string) => ({ _type: 'ctaBlock', label, linkType: 'internal' });

const hero = (headline: string, subhead: string, withButton = true) => ({
  _type: 'heroSection',
  headline: example(headline),
  subhead: example(subhead),
  size: 'short',
  ...(withButton ? { primaryCta: button(example('Get in touch')) } : {}),
});

const callToAction = () => ({
  _type: 'ctaBandSection',
  headline: example('Ready to take the next step?'),
  subhead: example('One line that tells a visitor what happens when they press the button.'),
  cta: button(example('Contact us')),
});

/** Build a list and give every array member a fresh key. */
const page = (...sections: Record<string, unknown>[]) => freshKeys(sections);

// ── The templates, in menu order ─────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'page-simple',
    title: 'Simple page',
    description: 'A heading, then text. Good for most pages.',
    sections: () =>
      page(hero('Page title', 'One sentence that says what this page is about.', false), {
        _type: 'richTextSection',
        heading: example('A section heading'),
        body: [
          para(example('Write the main text of the page here. Short paragraphs read best.')),
          para(example('Add a second paragraph, or delete this one.')),
        ],
      }),
  },
  {
    id: 'page-landing',
    title: 'Landing page',
    description: 'A banner, a picture with text, three numbers, a quote and a button band.',
    sections: () =>
      page(
        hero('A clear promise in a few words', 'Who this is for, and what they get.'),
        {
          _type: 'imageTextSection',
          imageSide: 'right',
          heading: example('Why it matters'),
          body: [
            para(example('Two or three sentences next to a photo. Add the photo on the left.')),
          ],
        },
        {
          _type: 'statSection',
          heading: example('At a glance'),
          stats: [
            { _type: 'statItem', number: 10, suffix: '+', label: example('years of experience') },
            { _type: 'statItem', number: 200, label: example('people helped') },
            { _type: 'statItem', number: 5, label: example('things we do best') },
          ],
        },
        {
          _type: 'quoteSection',
          quote: example('A short, real quote from someone you have helped.'),
          attribution: example('Their name'),
        },
        callToAction(),
      ),
  },
  {
    id: 'page-questions',
    title: 'Questions page',
    description: 'Common questions and their answers, then a way to ask more.',
    sections: () =>
      page(
        hero('Questions and answers', 'The things people ask us most.', false),
        {
          _type: 'richTextSection',
          body: [
            para(example('The first question someone asks?'), 'h3'),
            para(example('A short, friendly answer.')),
            para(example('A second question?'), 'h3'),
            para(example('Another answer. Add as many pairs as you need.')),
          ],
        },
        callToAction(),
      ),
  },
  {
    id: 'page-blank',
    title: 'Blank page',
    description: 'No sections. Add your own with "+ Add item".',
    sections: () => [],
  },
];

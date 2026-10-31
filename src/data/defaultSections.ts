// Foundation, edit with care
// Default section arrays for the four core pages.
// Used when: (a) no Sanity project is connected, or (b) the page's pageBuilder
// is empty (unseeded project). Routes render these arrays instead of a blank page.
//
// IMPORTANT: only use blocks that render fully from INLINE data:
//   heroSection, richTextSection, imageTextSection (no image), statSection,
//   ctaBandSection, quoteSection, spacerSection.
// Collection-dependent rich sections (servicesGridSection, testimonialsSection,
// processSection, valuesSection) are NOT used here — they'd render empty without
// Sanity collections and would defeat the purpose of a no-data safety net.
//
// Each block carries a _key for parity with Sanity-seeded pageBuilder arrays.
// The seed script (scripts/seed-core.mjs) imports from this file so these
// arrays are the single source of truth — a fresh clone renders the same copy
// that a seeded project receives as its first content.

import { site } from './site';
import type { PageBuilderBlock } from '@/lib/pageBuilder.types';

// ── Home page ────────────────────────────────────────────────────────────────

export const DEFAULT_HOME_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-home-hero',
    eyebrow: 'Your City, Your State.',
    headline: 'Your Headline Goes Here.',
    subhead: 'One or two sentences on what you do and who it is for. Replace this in the Studio.',
    size: 'tall',
    primaryCta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact/' },
    secondaryCta: { _type: 'ctaBlock', label: 'About Us', href: '/about/' }, // scaffold: about
  },
  {
    _type: 'richTextSection',
    _key: 'default-home-intro',
    eyebrow: 'Welcome.',
    heading: 'A Short Introduction Goes Here.',
    body: [
      {
        _type: 'block',
        _key: 'default-home-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-home-intro-p1-s1',
            text: `Welcome to ${site.name}. Replace this with a few sentences on who you are, who you serve and what a visitor should do next. Edit it in Sanity Studio under the Home Page document.`,
          },
        ],
      },
    ],
  },
  {
    _type: 'statSection',
    _key: 'default-home-stats',
    stats: [
      {
        _type: 'statItem',
        _key: 'default-home-stat-1',
        number: 5,
        suffix: '+',
        label: 'A Number Worth Knowing',
      },
      {
        _type: 'statItem',
        _key: 'default-home-stat-2',
        number: 50,
        suffix: '+',
        label: 'Another Number',
      },
      {
        _type: 'statItem',
        _key: 'default-home-stat-3',
        number: 100,
        suffix: '%',
        label: 'A Third Number',
      },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-home-services-intro',
    eyebrow: 'What We Do.',
    heading: 'Our Services.',
    body: [
      {
        _type: 'block',
        _key: 'default-home-services-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-home-services-intro-p1-s1',
            text: 'Say in a sentence or two what you offer. Once your Sanity Studio is seeded, this section will display your real services.',
          },
        ],
      },
    ],
    cta: { _type: 'ctaBlock', label: 'See All Services', href: '/services/' }, // scaffold: services
    imageSide: 'right',
  },
  {
    _type: 'quoteSection',
    _key: 'default-home-quote',
    quote: 'A short, real quote from someone you have helped goes here. Replace it in the Studio.',
    attribution: 'Name, Role',
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-home-cta',
    eyebrow: 'Ready to Begin?',
    headline: 'Ready to Talk?',
    subhead: "Let's start with a conversation.",
    cta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact/' },
  },
];

// ── About page ───────────────────────────────────────────────────────────────

// scaffold: about
export const DEFAULT_ABOUT_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-about-hero',
    eyebrow: 'About Us.',
    headline: 'Who We Are.',
    subhead: 'A sentence about who you are goes here.',
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-about-story',
    eyebrow: 'Our Story.',
    heading: 'How We Started.',
    body: [
      {
        _type: 'block',
        _key: 'default-about-story-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-about-story-p1-s1',
            text: `Replace this with your real origin story. Tell visitors how you began, what you noticed was missing, and what you set out to do differently. Edit this in Sanity Studio under the About Page document.`,
          },
        ],
      },
    ],
  },
  {
    _type: 'statSection',
    _key: 'default-about-stats',
    stats: [
      {
        _type: 'statItem',
        _key: 'default-about-stat-1',
        number: 5,
        suffix: '+',
        label: 'A Number Worth Knowing',
      },
      {
        _type: 'statItem',
        _key: 'default-about-stat-2',
        number: 50,
        suffix: '+',
        label: 'Another Number',
      },
      {
        _type: 'statItem',
        _key: 'default-about-stat-3',
        number: 100,
        suffix: '%',
        label: 'A Third Number',
      },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-about-philosophy',
    eyebrow: 'How We Work.',
    heading: 'Principles that guide every project.',
    body: [
      {
        _type: 'block',
        _key: 'default-about-philosophy-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-about-philosophy-p1-s1',
            text: 'Add your philosophy points in Sanity Studio under Philosophy Points. Once seeded, this will display your numbered values cards.',
          },
        ],
      },
    ],
    imageSide: 'left',
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-about-cta',
    eyebrow: "Let's Work Together.",
    headline: 'Ready to Start?',
    subhead: 'Send a message and we will be back in touch within two business days.',
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact/' },
  },
];
// scaffold:end

// ── Services page ─────────────────────────────────────────────────────────────

export const DEFAULT_SERVICES_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-services-hero',
    eyebrow: 'What We Offer.',
    headline: 'Our Services.',
    subhead: 'A sentence on what you offer and who it is for.',
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-services-intro',
    eyebrow: 'The Tiers.',
    heading: 'Find the right fit for your project.',
    body: [
      {
        _type: 'block',
        _key: 'default-services-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-services-intro-p1-s1',
            text: 'Add your service documents in Sanity Studio. Once seeded, this page will display your full service tier list with pricing and features.',
          },
        ],
      },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-services-area',
    eyebrow: 'Service Area.',
    heading: 'Where We Work.',
    body: [
      {
        _type: 'block',
        _key: 'default-services-area-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-services-area-p1-s1',
            text: 'Say where you work or who you serve. Edit your service area details in Sanity Studio under Business Info.',
          },
        ],
      },
    ],
    imageSide: 'right',
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-services-cta',
    eyebrow: "Let's Talk.",
    headline: 'Not sure which service is right?',
    subhead: 'Send a message and we will point you toward the right place.',
    cta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact/' },
  },
];

// ── Process page ──────────────────────────────────────────────────────────────

export const DEFAULT_PROCESS_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-process-hero',
    eyebrow: 'The Process.',
    headline: 'What to Expect.',
    subhead: 'A sentence on what happens after someone gets in touch.',
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-process-overview',
    eyebrow: 'How It Works.',
    heading: 'A clear process, start to finish.',
    body: [
      {
        _type: 'block',
        _key: 'default-process-overview-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-process-overview-p1-s1',
            text: 'Add your process steps in Sanity Studio under Process Steps. Once seeded, this page will display your full step-by-step workflow in detailed cards. No guesswork, no surprises: you will always know exactly where things stand.',
          },
        ],
      },
    ],
  },
  {
    _type: 'spacerSection',
    _key: 'default-process-spacer',
  },
  {
    _type: 'imageTextSection',
    _key: 'default-process-inquiry',
    eyebrow: 'Step 1.',
    heading: 'Initial Inquiry.',
    body: [
      {
        _type: 'block',
        _key: 'default-process-inquiry-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-process-inquiry-p1-s1',
            text: 'Fill out the contact form with a few details about your project. We review every inquiry personally and reply within two business days.',
          },
        ],
      },
    ],
    imageSide: 'left',
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact/' },
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-process-cta',
    eyebrow: 'Ready to Begin?',
    headline: 'Start the Conversation.',
    subhead: 'Fill out the contact form and we will reply.',
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact/' },
  },
];

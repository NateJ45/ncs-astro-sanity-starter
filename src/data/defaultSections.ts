// Foundation, edit with care
// Default section arrays for the four core pages.
// Used when: (a) no Sanity project is connected, or (b) the page's pageBuilder
// is empty (unseeded project). Routes render these arrays instead of a blank page.
//
// IMPORTANT: only use blocks that render fully from INLINE data:
//   heroSection, richTextSection, imageTextSection (no image), statSection,
//   ctaBandSection, quoteSection, spacerSection.
// Collection-dependent rich sections (servicesGridSection, testimonialsSection,
// processSection, valuesSection) are NOT used here â€” they'd render empty without
// Sanity collections and would defeat the purpose of a no-data safety net.
//
// Each block carries a _key for parity with Sanity-seeded pageBuilder arrays.
// The seed script (scripts/seed-core.mjs) imports from this file so these
// arrays are the single source of truth â€” a fresh clone renders the same copy
// that a seeded project receives as its first content.

import { site } from './site';
import type { PageBuilderBlock } from '@/lib/pageBuilder.types';

// â”€â”€ Home page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEFAULT_HOME_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-home-hero',
    eyebrow: 'Your City, Your State.',
    headline: 'Design That Feels Like Home.',
    subhead:
      'We help people create spaces that work as hard as they do â€” and feel good to come home to.',
    size: 'tall',
    primaryCta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact' },
    secondaryCta: { _type: 'ctaBlock', label: 'See Our Work', href: '/portfolio' },
  },
  {
    _type: 'richTextSection',
    _key: 'default-home-intro',
    eyebrow: 'Meet the Founder.',
    headline: 'Good design starts with a real conversation.',
    body: [
      {
        _type: 'block',
        _key: 'default-home-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-home-intro-p1-s1',
            text: `Welcome to ${site.name}. Every project starts the same way: a conversation about how you actually use your space, not just how you want it to look. Add your founder intro in Sanity Studio under the Home Page document.`,
          },
        ],
      },
    ],
    cta: { _type: 'ctaBlock', label: 'Learn More About the Studio', href: '/about' },
  },
  {
    _type: 'statSection',
    _key: 'default-home-stats',
    stats: [
      { _type: 'statItem', _key: 'default-home-stat-1', number: 5, suffix: '+', label: 'Years in Business' },
      { _type: 'statItem', _key: 'default-home-stat-2', number: 50, suffix: '+', label: 'Projects Completed' },
      { _type: 'statItem', _key: 'default-home-stat-3', number: 100, suffix: '%', label: 'Client Satisfaction' },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-home-services-intro',
    eyebrow: 'The Studio.',
    headline: 'Design Services for Every Space.',
    body: [
      {
        _type: 'block',
        _key: 'default-home-services-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-home-services-intro-p1-s1',
            text: 'Whether you need a fresh set of eyes or a full room overhaul, there is a service for you. Once your Sanity Studio is seeded, this section will display your real services.',
          },
        ],
      },
    ],
    cta: { _type: 'ctaBlock', label: 'See All Services', href: '/services' },
    imageSide: 'right',
  },
  {
    _type: 'quoteSection',
    _key: 'default-home-quote',
    quote:
      'Working with this studio was the best decision I made for my home. The whole process was clear and the result speaks for itself.',
    attribution: 'A Happy Client',
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-home-cta',
    eyebrow: 'Ready to Begin?',
    headline: 'Ready to Love Your Space?',
    subhead: "Let's start with a conversation.",
    cta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact' },
  },
];

// â”€â”€ About page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEFAULT_ABOUT_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-about-hero',
    eyebrow: 'The Designer.',
    headline: 'People Hire People.',
    subhead: "Here's who you'd be working with.",
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-about-story',
    eyebrow: 'My Story.',
    headline: 'Why I Started This Studio.',
    body: [
      {
        _type: 'block',
        _key: 'default-about-story-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-about-story-p1-s1',
            text: `Replace this with your real origin story. Tell visitors what led you to design, what you noticed was missing in your market, and what you set out to do differently. Edit this in Sanity Studio under the About Page document.`,
          },
        ],
      },
    ],
  },
  {
    _type: 'statSection',
    _key: 'default-about-stats',
    stats: [
      { _type: 'statItem', _key: 'default-about-stat-1', number: 5, suffix: '+', label: 'Years in Business' },
      { _type: 'statItem', _key: 'default-about-stat-2', number: 50, suffix: '+', label: 'Projects Completed' },
      { _type: 'statItem', _key: 'default-about-stat-3', number: 100, suffix: '%', label: 'Client Satisfaction' },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-about-philosophy',
    eyebrow: 'How We Work.',
    headline: 'Principles that guide every project.',
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
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact' },
  },
];

// â”€â”€ Services page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEFAULT_SERVICES_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-services-hero',
    eyebrow: 'What We Offer.',
    headline: 'Design Services for Every Space and Stage.',
    subhead:
      'Whether you need a fresh perspective or want to hand the whole project over, there is a service for you.',
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-services-intro',
    eyebrow: 'The Tiers.',
    headline: 'Find the right fit for your project.',
    body: [
      {
        _type: 'block',
        _key: 'default-services-intro-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-services-intro-p1-s1',
            text: 'Add your service documents in Sanity Studio. Once seeded, this page will display your full service tier list with pricing and features. Each pricing is discussed before any work begins.',
          },
        ],
      },
    ],
  },
  {
    _type: 'imageTextSection',
    _key: 'default-services-area',
    eyebrow: 'Service Area.',
    headline: 'Where We Work.',
    body: [
      {
        _type: 'block',
        _key: 'default-services-area-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-services-area-p1-s1',
            text: 'We serve the greater metro area and surrounding region. Travel fees for out-of-area projects are always quoted upfront. Edit your service area details in Sanity Studio under Business Info.',
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
    subhead:
      'Send a message with a few details about your space. We will point you toward the best fit.',
    cta: { _type: 'ctaBlock', label: 'Start a Conversation', href: '/contact' },
  },
];

// â”€â”€ Process page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEFAULT_PROCESS_SECTIONS: PageBuilderBlock[] = [
  {
    _type: 'heroSection',
    _key: 'default-process-hero',
    eyebrow: 'The Process.',
    headline: 'From First Call to Final Reveal.',
    subhead:
      'A clear, pressure-free process from the first inquiry through installation day.',
    size: 'short',
  },
  {
    _type: 'richTextSection',
    _key: 'default-process-overview',
    eyebrow: 'How It Works.',
    headline: 'A clear process, start to finish.',
    body: [
      {
        _type: 'block',
        _key: 'default-process-overview-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-process-overview-p1-s1',
            text: 'Add your process steps in Sanity Studio under Process Steps. Once seeded, this page will display your full step-by-step workflow in detailed cards. No guesswork, no surprises â€” you will always know exactly where things stand.',
          },
        ],
      },
    ],
  },
  {
    _type: 'spacerSection',
    _key: 'default-process-spacer',
    size: 'md',
  },
  {
    _type: 'imageTextSection',
    _key: 'default-process-consultation',
    eyebrow: 'Step 1.',
    headline: 'Initial Inquiry.',
    body: [
      {
        _type: 'block',
        _key: 'default-process-consultation-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'default-process-consultation-p1-s1',
            text: 'Fill out the contact form with a few details about your project. We review every inquiry personally and reply within two business days.',
          },
        ],
      },
    ],
    imageSide: 'left',
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact' },
  },
  {
    _type: 'ctaBandSection',
    _key: 'default-process-cta',
    eyebrow: 'Ready to Begin?',
    headline: 'Start the Conversation.',
    subhead: 'Fill out the contact form with a few details about your space.',
    cta: { _type: 'ctaBlock', label: 'Get in Touch', href: '/contact' },
  },
];

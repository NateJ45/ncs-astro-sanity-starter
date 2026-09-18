// scripts/seed-core.mjs
//
// Seeds CORE document types with neutral "Studio Starter" placeholder content
// so a fresh clone shows real populated pages instead of empty fallbacks.
//
// Prerequisites:
//   - A configured Sanity project (PUBLIC_SANITY_PROJECT_ID in .env)
//   - A write token (SANITY_API_WRITE_TOKEN in .env)
//   - PUBLIC_SANITY_DATASET defaults to "production"
//
// Idempotent: uses client.createOrReplace with deterministic _id values.
// Re-running this script is safe and will never duplicate documents.
//
// Module types (service modules, etc.) have their own per-module seed.mjs.
// Run ONLY this file for the core pages.
//
// -----------------------------------------------------------------------------
// EVERY SEEDED STRING READS AS A PLACEHOLDER. THAT IS THE RULE (2026-09-18).
// -----------------------------------------------------------------------------
// PORTS.md card 44. This file used to seed plausible copy for a real trade: an
// interior-design studio's services at $150 and $650, budget brackets from
// "Under $2,000" to "$25,000+", testimonials about living rooms, process steps
// ending in an installation day. All of it was well written and none of it
// belonged to the fork that ran the seeder, and a fork could ship it simply by
// not noticing it. Plausible copy for the wrong business looks exactly like
// copy; an obvious placeholder does not.
//
// So a seeded string either says "replace this" in so many words, or it is
// structurally neutral ("How long it takes", "Category one (replace me)"). If
// you find yourself writing a sentence a real business could publish, that is
// the signal to stop. The one exception is the privacy policy, which is generic
// boilerplate every site needs, and the Studio help documents, which are
// instructions to the editor rather than content for a visitor.
//
// -----------------------------------------------------------------------------
// THE SCAFFOLD MARKERS
// -----------------------------------------------------------------------------
// Each numbered section that belongs to a removable capability is wrapped in a
// scaffold block, so `npm run scaffold --remove faq` takes the FAQ page and its
// four questions out of the seeder along with the schema and the route.
//
// ONE LIMIT, AND IT IS DELIBERATE. Markers never nest (see scripts/scaffold.mjs),
// so a section gets the ONE capability that owns the page it seeds. The
// aboutPage seed is `about` end to end, including the valuesSection block inside
// its pageBuilder, which really belongs to `philosophy`. A fork that removed
// philosophy and kept about would seed a block whose type the schema no longer
// declares. That is a DATASET problem, not a build problem: the Studio shows it
// as an unknown type and the editor deletes it, exactly as it does for any
// document of a removed type. The scaffold has never been able to touch the
// dataset, on purpose, and this is the same boundary.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.log('PUBLIC_SANITY_PROJECT_ID is not set. Configure your .env and re-run.');
  process.exit(0);
}
if (!token) {
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required to seed content.');
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2026-05-01',
  useCdn: false,
});

// ── Helper: portable-text paragraph block ────────────────────────────────

let _keyCounter = 0;
function key() {
  _keyCounter += 1;
  return `seed-${_keyCounter}`;
}

function pt(text) {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  };
}

function ptH2(text) {
  return {
    _type: 'block',
    _key: key(),
    style: 'h2',
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  };
}

function ptH3(text) {
  return {
    _type: 'block',
    _key: key(),
    style: 'h3',
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  };
}

// ── CTA helper (ctaBlock object type) ────────────────────────────────────

function cta(label, href) {
  return { label, linkType: 'external', externalUrl: href, openInNewTab: false };
}

// ── Documents to seed ────────────────────────────────────────────────────

const docs = [];

// ── 1. siteSettings (singleton) ──────────────────────────────────────────
// Fields: title, tagline, email, phone?, availabilityStatus, serviceAreas,
//         travelFees, socialInstagram?, socialFacebook?, seoImage?,
//         footerCredit?, footerCreditUrl?, newsletter{enabled,...},
//         googleBusinessUrl?, reviewsNote?, sectionVisibility, satisfactionGuarantee?

docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  title: 'Studio Starter',
  tagline: 'Your tagline goes here.',
  email: 'hello@example.com',
  availabilityStatus: 'Replace with your current availability',
  serviceAreas: ['Your City', 'Surrounding Region'],
  travelFees: [
    {
      _type: 'travelFeeTier',
      _key: key(),
      distanceLabel: 'Nearest tier (replace me)',
      fee: 'None',
    },
    {
      _type: 'travelFeeTier',
      _key: key(),
      distanceLabel: 'Middle tier (replace me)',
      fee: 'Replace with a fee',
    },
    {
      _type: 'travelFeeTier',
      _key: key(),
      distanceLabel: 'Furthest tier (replace me)',
      fee: 'Replace with a fee',
    },
  ],
  newsletter: {
    enabled: false,
    heading: 'Your signup heading goes here.',
    blurb: 'Say what a subscriber gets and how often. Replace this line.',
    buttonLabel: 'Subscribe',
    successMessage: "You're in. Check your inbox.",
    consentNote: 'No spam. Unsubscribe anytime.',
  },
  sectionVisibility: {
    showPortfolio: true,
    showJournal: true,
    showShop: true,
    showEDesign: true,
    showGiftCertificates: true,
    showPress: true,
    showResources: true,
    showGuides: true,
    showStyleQuiz: true,
    showBudgetCalculator: true,
  },
  satisfactionGuarantee:
    'Replace this with the promise this business actually makes, or clear the field to hide it.',
});

// ── 2. homePage (singleton) ───────────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImages, heroPrimaryCta, heroSecondaryCta, heroRotatingWords?,
//         heroScriptAccent?, meetFounderEyebrow, meetFounderHeadline,
//         meetFounderContent, meetFounderCta, featuredWorkEyebrow,
//         featuredWorkHeadline, featuredWorkSubhead, featuredWorkCta,
//         featuredJournalEyebrow, featuredJournalHeadline,
//         featuredJournalSubhead, featuredJournalCta,
//         processPreviewEyebrow, processPreviewHeadline,
//         processPreviewSubhead, processPreviewCta,
//         testimonialsEyebrow, testimonialsHeadline, testimonialsSubhead,
//         testimonialsToShow (refs), testimonialsAttribution?,
//         featuredTestimonial?, servicesGridEyebrow, servicesGridHeadline,
//         servicesGridSubhead, servicesGridCta, servicesGridFootnote?,
//         serviceAreaCue?, finalCtaEyebrow, finalCtaHeadline,
//         finalCtaSubhead, finalCta

docs.push({
  _id: 'homePage',
  _type: 'homePage',
  seoTitle: 'Studio Starter - replace this title',
  seoDescription:
    'Replace this with one sentence describing what this business does, for search results.',

  heroEyebrow: 'Welcome.',
  heroHeadline: 'Your Headline Goes Here.',
  heroSubhead: 'Replace this with one or two sentences saying what you do and who you do it for.',
  heroPrimaryCta: cta('Primary button label', '/contact'),
  heroSecondaryCta: cta('Second button label', '/about'),

  meetFounderEyebrow: 'Meet the Founder.',
  meetFounderHeadline: 'Replace this headline.',
  meetFounderContent: [
    pt(
      'Replace this with a short introduction. Two paragraphs is plenty: who you are and what you do.',
    ),
    pt(
      'Then say why someone should trust you with the work. Be specific; specifics are what make a stranger believe you.',
    ),
  ],
  meetFounderCta: cta('Button label', '/about'),

  featuredWorkEyebrow: 'Recent Work.',
  featuredWorkHeadline: 'Replace this headline.',
  featuredWorkSubhead:
    'Replace this with a line introducing whatever this business wants to show off.',
  featuredWorkCta: cta('Button label', '/about'),

  featuredJournalEyebrow: 'From the Journal.',
  featuredJournalHeadline: 'Replace this headline.',
  featuredJournalSubhead:
    'Replace this with a line saying what gets written about here and how often.',
  featuredJournalCta: cta('Read the Journal', '/journal'),

  processPreviewEyebrow: 'How It Works.',
  processPreviewHeadline: 'Replace this headline.',
  processPreviewSubhead:
    'Replace this with a line describing how working with this business goes, in plain words.',
  processPreviewCta: cta('Button label', '/process'),

  // scaffold: testimonials
  testimonialsEyebrow: 'Kind Words.',
  testimonialsHeadline: 'Replace this headline.',
  testimonialsSubhead: 'Replace this with a line framing the reviews below.',
  testimonialsToShow: [
    { _type: 'reference', _key: key(), _ref: 'testimonial-1' },
    { _type: 'reference', _key: key(), _ref: 'testimonial-2' },
    { _type: 'reference', _key: key(), _ref: 'testimonial-3' },
  ],
  // scaffold:end

  servicesGridEyebrow: 'What We Offer.',
  servicesGridHeadline: 'Replace this headline.',
  servicesGridSubhead: 'Replace this with a line introducing the list of services below.',
  servicesGridCta: cta('Button label', '/services'),
  servicesGridFootnote: 'Optional small print under the list. Replace or clear it.',

  serviceAreaCue: 'Replace this with where this business works.',
  finalCtaEyebrow: 'Ready to Begin?',
  finalCtaHeadline: 'Replace this closing headline.',
  finalCtaSubhead:
    'Replace this with the one thing you want a visitor to do next, and what happens when they do.',
  finalCta: cta('Primary button label', '/contact'),

  // ── pageBuilder (section-driven layout, Phase B) ─────────────────────────
  // NOTE: This content mirrors DEFAULT_HOME_SECTIONS in src/data/defaultSections.ts.
  // The seed uses rich section types (founderSection, testimonialsSection, etc.)
  // that require Sanity collection data; the route fallback uses simpler inline
  // sections (heroSection, richTextSection, etc.) that render without a dataset.
  // If you update copy here, update defaultSections.ts in parallel.
  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'Welcome.',
      headline: 'Your Headline Goes Here.',
      subhead: 'Replace this with one or two sentences saying what you do and who you do it for.',
      size: 'tall',
      primaryCta: cta('Primary button label', '/contact'),
      secondaryCta: cta('Second button label', '/about'),
    },
    // scaffold: about
    {
      _type: 'founderSection',
      _key: key(),
      eyebrow: 'Meet the Founder.',
      headline: 'Replace this headline.',
      content: [
        pt(
          'Replace this with a short introduction. Two paragraphs is plenty: who you are and what you do.',
        ),
        pt(
          'Then say why someone should trust you with the work. Be specific; specifics are what make a stranger believe you.',
        ),
      ],
      cta: cta('Button label', '/about'),
    },
    // scaffold:end
    // scaffold: testimonials
    {
      _type: 'testimonialsSection',
      _key: key(),
      eyebrow: 'Kind Words.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with a line framing the reviews below.',
      testimonialsToShow: [
        { _type: 'reference', _key: key(), _ref: 'testimonial-1' },
        { _type: 'reference', _key: key(), _ref: 'testimonial-2' },
        { _type: 'reference', _key: key(), _ref: 'testimonial-3' },
      ],
    },
    // scaffold:end
    // scaffold: process
    {
      _type: 'processSection',
      _key: key(),
      eyebrow: 'How It Works.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with a line describing how working with this business goes.',
      variant: 'preview',
      cta: cta('Button label', '/process'),
    },
    // scaffold:end
    // scaffold: services
    {
      _type: 'servicesGridSection',
      _key: key(),
      eyebrow: 'What We Offer.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with a line introducing the list of services below.',
      cta: cta('Button label', '/services'),
      footnote: 'Optional small print under the list. Replace or clear it.',
      variant: 'grid',
    },
    // scaffold:end
    {
      _type: 'serviceAreaSection',
      _key: key(),
      eyebrow: 'Service Area.',
      headline: 'Replace this headline.',
      description:
        'Replace this with where this business works and what it charges to travel, if anything.',
      showTravelFees: true,
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: 'Ready to Begin?',
      headline: 'Replace this closing headline.',
      subhead: 'Replace this with the one thing you want a visitor to do next.',
      cta: cta('Primary button label', '/contact'),
    },
  ],
});

// scaffold: about
// ── 3. aboutPage (singleton) ──────────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, storyEyebrow, storyHeadline,
//         storyContent, founderPhoto?, founderAttribution, backgroundLine?,
//         serviceAreaMention?, philosophyEyebrow, philosophyHeadline,
//         personalEyebrow, personalHeadline, personalIntro?,
//         currentlyList, rapidFire, localSpots, beyondDesign?,
//         candidPhoto?, stats, finalCtaEyebrow, finalCtaHeadline,
//         finalCtaSubhead?, finalCta

docs.push({
  _id: 'aboutPage',
  _type: 'aboutPage',
  seoTitle: 'About Studio Starter - replace this title',
  seoDescription:
    'Replace this with one sentence about who is behind this business, for search results.',

  heroEyebrow: 'The Team.',
  heroHeadline: 'People Hire People.',
  heroSubhead: "Here's who you'd be working with.",

  storyEyebrow: 'My Story.',
  storyHeadline: 'Replace this headline.',
  storyContent: [
    pt(
      'Replace this with your real origin story: what led you into this work, what you noticed was missing, and what you set out to do differently.',
    ),
    pt(
      'Be specific. The more concrete you are about where you came from and what you stand for, the more easily the right people will recognise themselves in it.',
    ),
  ],
  founderAttribution: 'Your Name, Founder',
  backgroundLine: 'Your credentials, training, or experience in one plain sentence.',
  serviceAreaMention: 'Based in Your City, serving the surrounding region.',

  philosophyEyebrow: 'How We Work.',
  philosophyHeadline: 'Replace this headline.',

  personalEyebrow: 'Off the Clock.',
  personalHeadline: 'A little more about me.',
  personalIntro: 'Replace this with one line introducing the off-the-clock section.',
  currentlyList: [
    {
      _type: 'currentlyRow',
      _key: key(),
      label: 'Reading',
      value: 'Add the book you are reading right now (replace me)',
    },
    {
      _type: 'currentlyRow',
      _key: key(),
      label: 'Listening to',
      value: 'Add your current playlist or podcast (replace me)',
    },
    {
      _type: 'currentlyRow',
      _key: key(),
      label: 'Obsessed with',
      value: 'Add something you keep recommending (replace me)',
    },
  ],
  rapidFire: [
    {
      _type: 'rapidFireRow',
      _key: key(),
      prompt: 'Coffee order',
      answer: 'Replace me with a real answer',
    },
    {
      _type: 'rapidFireRow',
      _key: key(),
      prompt: 'Replace this prompt',
      answer: 'Replace me with a real answer',
    },
    {
      _type: 'rapidFireRow',
      _key: key(),
      prompt: 'Replace this prompt',
      answer: 'Replace me with a real answer',
    },
  ],
  localSpots: [
    {
      _type: 'localSpotRow',
      _key: key(),
      name: 'Your favourite coffee shop (replace me)',
      note: 'Best place to think',
    },
    {
      _type: 'localSpotRow',
      _key: key(),
      name: 'A second local spot (replace me)',
      note: 'Say why it is worth knowing about',
    },
  ],
  beyondDesign:
    'Replace this with a short paragraph about life outside work. Family, community, hobbies. Write the way you actually talk.',

  stats: [
    { _type: 'statItem', _key: key(), number: 5, suffix: '+', label: 'Years in Business' },
    { _type: 'statItem', _key: key(), number: 50, suffix: '+', label: 'Projects Completed' },
    { _type: 'statItem', _key: key(), number: 100, suffix: '%', label: 'Client Satisfaction' },
  ],

  finalCtaEyebrow: "Let's Work Together.",
  finalCtaHeadline: 'Replace this closing headline.',
  finalCtaSubhead: 'Replace this with what happens after someone gets in touch.',
  finalCta: cta('Button label', '/contact'),

  // ── pageBuilder (section-driven layout, Phase B) ─────────────────────────
  // NOTE: Mirrors DEFAULT_ABOUT_SECTIONS in src/data/defaultSections.ts.
  // The seed uses richer section types (storySection, valuesSection) that need
  // Sanity collections; the route fallback uses simpler inline types.
  // Keep copy in sync between here and defaultSections.ts when updating.
  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'The Team.',
      headline: 'People Hire People.',
      subhead: "Here's who you'd be working with.",
      size: 'short',
    },
    {
      _type: 'storySection',
      _key: key(),
      eyebrow: 'My Story.',
      headline: 'Replace this headline.',
      content: [
        pt(
          'Replace this with your real origin story: what led you into this work, what you noticed was missing, and what you set out to do differently.',
        ),
      ],
      attribution: 'Your Name, Founder',
      credentialLine: 'Your credentials or training in one plain sentence.',
      serviceAreaLine: 'Based in Your City, serving the surrounding region.',
    },
    {
      _type: 'valuesSection',
      _key: key(),
      eyebrow: 'How We Work.',
      headline: 'Replace this headline.',
    },
    {
      _type: 'statSection',
      _key: key(),
      stats: [
        { _type: 'statItem', _key: key(), number: 5, suffix: '+', label: 'Years in Business' },
        { _type: 'statItem', _key: key(), number: 50, suffix: '+', label: 'Projects Completed' },
        { _type: 'statItem', _key: key(), number: 100, suffix: '%', label: 'Client Satisfaction' },
      ],
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: "Let's Work Together.",
      headline: 'Replace this closing headline.',
      subhead: 'Replace this with what happens after someone gets in touch.',
      cta: cta('Button label', '/contact'),
    },
  ],
});
// scaffold:end

// scaffold: services
// ── 4. servicesPage (singleton) ──────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, stickyCtaLabel?,
//         servicesListEyebrow, servicesListHeadline, servicesListSubhead,
//         serviceAreaSection{eyebrow, headline, description},
//         finalCtaEyebrow, finalCtaHeadline, finalCtaSubhead, finalCta

docs.push({
  _id: 'servicesPage',
  _type: 'servicesPage',
  seoTitle: 'Services - Studio Starter',
  seoDescription:
    'Replace this with one sentence listing what this business sells, for search results.',

  heroEyebrow: 'What We Offer.',
  heroHeadline: 'Replace this headline.',
  heroSubhead: 'Replace this with one or two sentences covering the range of what is on offer.',

  servicesListEyebrow: 'The Tiers.',
  servicesListHeadline: 'Replace this headline.',
  servicesListSubhead:
    'Replace this with a line introducing the list below, including how pricing works.',

  serviceAreaSection: {
    eyebrow: 'Service Area.',
    headline: 'Replace this headline.',
    description:
      'Replace this with where this business works and what it charges to travel, if anything.',
  },

  finalCtaEyebrow: "Let's Talk.",
  finalCtaHeadline: 'Replace this closing headline.',
  finalCtaSubhead: 'Replace this with what to do when none of the options above is an obvious fit.',
  finalCta: cta('Primary button label', '/contact'),

  // ── pageBuilder (section-driven layout, Phase B) ─────────────────────────
  // NOTE: Mirrors DEFAULT_SERVICES_SECTIONS in src/data/defaultSections.ts.
  // Keep copy in sync between here and defaultSections.ts when updating.
  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'What We Offer.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with one or two sentences covering the range of what is on offer.',
      size: 'short',
    },
    {
      _type: 'servicesGridSection',
      _key: key(),
      eyebrow: 'The Tiers.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with a line introducing the list below, including how pricing works.',
      variant: 'list',
    },
    {
      _type: 'serviceAreaSection',
      _key: key(),
      eyebrow: 'Service Area.',
      headline: 'Replace this headline.',
      description:
        'Replace this with where this business works and what it charges to travel, if anything.',
      showTravelFees: true,
    },
    {
      _type: 'guaranteeSection',
      _key: key(),
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: "Let's Talk.",
      headline: 'Replace this closing headline.',
      subhead: 'Replace this with what to do when none of the options above is an obvious fit.',
      cta: cta('Primary button label', '/contact'),
    },
  ],
});
// scaffold:end

// scaffold: services
// ── 5. service docs (3 collection items) ─────────────────────────────────
// Required fields: name, slug{_type,current}, price, shortDescription,
//                  features, bestFor, displayOrder
// Optional: priceNumeric, longDescription, showOnHomepage, ctaLabel

docs.push({
  _id: 'service-one',
  _type: 'service',
  name: 'Service one (replace me)',
  slug: { _type: 'slug', current: 'service-one' },
  price: 'Replace with a price',
  shortDescription:
    'Replace this with two sentences: what this service includes, and what someone walks away with.',
  features: ['Replace this with what is included', 'One line per item', 'Four or five is plenty'],
  bestFor: 'Replace this with the person this one is right for.',
  displayOrder: 1,
  showOnHomepage: true,
  ctaLabel: 'Button label',
});

docs.push({
  _id: 'service-two',
  _type: 'service',
  name: 'Service two (replace me)',
  slug: { _type: 'slug', current: 'service-two' },
  price: 'Replace with a price',
  shortDescription:
    'Replace this with two sentences: what this service includes, and what someone walks away with.',
  features: ['Replace this with what is included', 'One line per item', 'Four or five is plenty'],
  bestFor: 'Replace this with the person this one is right for.',
  displayOrder: 2,
  showOnHomepage: true,
  ctaLabel: 'Button label',
  longDescription: [
    pt(
      'Replace this with the longer version, for the people who want to know exactly how it goes before they commit.',
    ),
  ],
});

docs.push({
  _id: 'service-three',
  _type: 'service',
  name: 'Service three (replace me)',
  slug: { _type: 'slug', current: 'service-three' },
  price: 'Custom quote',
  shortDescription:
    'Replace this with two sentences: what this service includes, and what someone walks away with.',
  features: ['Replace this with what is included', 'One line per item', 'Four or five is plenty'],
  bestFor: 'Replace this with the person this one is right for.',
  displayOrder: 3,
  showOnHomepage: true,
  ctaLabel: 'Button label',
  longDescription: [
    pt(
      'Replace this with the longer version, for the people who want to know exactly how it goes before they commit.',
    ),
    pt(
      'Say plainly how pricing works. Vagueness about money costs more enquiries than a high number does.',
    ),
  ],
});
// scaffold:end

// scaffold: process
// ── 6. processPage (singleton) ───────────────────────────────────────────
// NOTE: pageBuilder mirrors DEFAULT_PROCESS_SECTIONS in src/data/defaultSections.ts.
// Keep copy in sync when updating.

docs.push({
  _id: 'processPage',
  _type: 'processPage',
  seoTitle: 'Our Process - Studio Starter',
  seoDescription:
    'Replace this with one sentence describing how working with this business goes, for search results.',

  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'The Process.',
      headline: 'Replace this headline.',
      subhead: 'Replace this with one line covering the whole arc, first contact to finished.',
      size: 'short',
    },
    {
      _type: 'processSection',
      _key: key(),
      variant: 'full',
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: 'Ready to Begin?',
      headline: 'Replace this closing headline.',
      subhead: 'Replace this with the one thing you want a visitor to do next.',
      cta: cta('Button label', '/contact'),
    },
  ],
});
// scaffold:end

// scaffold: process
// ── 7. processStep docs (4 steps) ────────────────────────────────────────
// Idempotent: createOrReplace with deterministic _id values.
// Steps auto-populate into any processSection via sectionsProjection().

docs.push({
  _id: 'process-step-1',
  _type: 'processStep',
  stepNumber: 1,
  title: 'Step one (replace me)',
  timeEstimate: 'How long it takes',
  shortDescription:
    'Replace this with what happens in this step and what the other person has to do.',
  features: ['Replace this with what happens', 'One line each', 'Three is plenty'],
  orderRank: 'a0',
});

docs.push({
  _id: 'process-step-2',
  _type: 'processStep',
  stepNumber: 2,
  title: 'Step two (replace me)',
  timeEstimate: 'How long it takes',
  shortDescription:
    'Replace this with what happens in this step and what the other person has to do.',
  features: ['Replace this with what happens', 'One line each', 'Three is plenty'],
  orderRank: 'a1',
});

docs.push({
  _id: 'process-step-3',
  _type: 'processStep',
  stepNumber: 3,
  title: 'Step three (replace me)',
  timeEstimate: 'How long it takes',
  shortDescription:
    'Replace this with what happens in this step and what the other person has to do.',
  features: ['Replace this with what happens', 'One line each', 'Three is plenty'],
  orderRank: 'a2',
});

docs.push({
  _id: 'process-step-4',
  _type: 'processStep',
  stepNumber: 4,
  title: 'Step four (replace me)',
  timeEstimate: 'How long it takes',
  shortDescription:
    'Replace this with what happens in this step and what the other person has to do.',
  features: ['Replace this with what happens', 'One line each', 'Three is plenty'],
  orderRank: 'a3',
});
// scaffold:end

// scaffold: faq
// ── 9. faqPage (singleton) ───────────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, categoryOrder,
//         finalCtaEyebrow, finalCtaHeadline, finalCtaSubhead, finalCta,
//         secondaryCta?

docs.push({
  _id: 'faqPage',
  _type: 'faqPage',
  seoTitle: 'FAQ - Studio Starter',
  seoDescription:
    'Replace this with one sentence saying what these questions cover, for search results.',

  heroEyebrow: 'Common Questions.',
  heroHeadline: 'Everything You Want to Know.',
  heroSubhead: 'Replace this with what to do when the answer is not on this page.',

  categoryOrder: ['Pricing & Cost', 'The Process', 'Logistics', 'Service Area', 'Getting Started'],

  finalCtaEyebrow: 'Not Finding Your Answer?',
  finalCtaHeadline: 'Just ask.',
  finalCtaSubhead: 'Replace this with how quickly someone can expect a reply.',
  finalCta: cta('Button label', '/contact'),
});
// scaffold:end

// scaffold: faq
// ── 10. faqItem docs (4 items) ───────────────────────────────────────────
// Required fields: question, answer (Portable Text), category, displayOrder
// Optional: alsoShowOnProcessPage

docs.push({
  _id: 'faq-what-does-it-cost',
  _type: 'faqItem',
  question: 'How much does it cost to work with you?',
  answer: [
    pt(
      'Replace this with real numbers. This is the question every visitor has and the one they will not ask, so answer it plainly rather than inviting them to enquire.',
    ),
    pt('Then say what is and is not included, so the number means something.'),
  ],
  category: 'Pricing & Cost',
  displayOrder: 1,
  alsoShowOnProcessPage: false,
});

docs.push({
  _id: 'faq-how-long-does-it-take',
  _type: 'faqItem',
  question: 'How long does a typical project take?',
  answer: [
    pt('Replace this with real timings, per service, including the parts you do not control.'),
    pt('Say when someone finds out their own timeline, and who tells them.'),
  ],
  category: 'The Process',
  displayOrder: 1,
  alsoShowOnProcessPage: true,
});

docs.push({
  _id: 'faq-do-you-travel',
  _type: 'faqItem',
  question: 'Do you work outside the immediate area?',
  answer: [
    pt(
      'Replace this with where this business actually travels, what that costs, and who agrees to it before anything is charged.',
    ),
  ],
  category: 'Service Area',
  displayOrder: 1,
  alsoShowOnProcessPage: false,
});

docs.push({
  _id: 'faq-how-to-get-started',
  _type: 'faqItem',
  question: 'How do I get started?',
  answer: [
    pt(
      'Replace this with the first step, in one sentence, and what happens after it. Link the form if the first step is the form.',
    ),
  ],
  category: 'Getting Started',
  displayOrder: 1,
  alsoShowOnProcessPage: false,
});
// scaffold:end

// ── 11. contactPage (singleton) ──────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, formIntroNote?, formProjectTypeOptions,
//         formLocationOptions, formBudgetOptions, formTimelineOptions,
//         formSourceOptions, whatToExpectEyebrow, whatToExpectHeadline,
//         whatToExpectContent, postInquiryRoadmap,
//         schedulingLink?, schedulingLinkLabel, availabilityNote?

docs.push({
  _id: 'contactPage',
  _type: 'contactPage',
  seoTitle: 'Contact Studio Starter',
  seoDescription: 'Replace this with one sentence about getting in touch, for search results.',

  heroEyebrow: 'Get in Touch.',
  heroHeadline: 'Start the Conversation.',
  heroSubhead: 'Replace this with what to send and how quickly a reply comes back.',

  formIntroNote: 'Replace this with what a visitor can expect after they press send.',
  // These three lists are what the visitor picks from, so every entry here is a
  // labelled placeholder rather than plausible copy for somebody else's trade.
  // A fork that ships one of these has shipped an obvious placeholder, which is
  // the point: the old list read like a real interior-design studio's options
  // and could be shipped by not noticing it.
  formProjectTypeOptions: [
    'Service one (replace me)',
    'Service two (replace me)',
    'Service three (replace me)',
    'Not sure yet',
  ],
  formLocationOptions: [],
  formBudgetOptions: [
    'Lowest bracket (replace me)',
    'Second bracket (replace me)',
    'Third bracket (replace me)',
    'Highest bracket (replace me)',
    'Not sure yet',
  ],
  formTimelineOptions: [
    'As soon as possible',
    '1 to 3 months',
    '3 to 6 months',
    '6 months or more',
    'Flexible',
  ],
  formSourceOptions: [
    'Google search',
    'Instagram',
    'Facebook',
    'Referral from a friend or family member',
    'Another channel (replace me)',
    'Other',
  ],

  whatToExpectEyebrow: 'What to Expect.',
  whatToExpectHeadline: 'When you submit this form...',
  whatToExpectContent: [
    pt(
      'Replace this with what actually happens to a submission: who reads it, how fast, and whether a human replies.',
    ),
    pt(
      'Then say what happens next if it is a fit, and what happens if it is not. Both answers are reassuring; only one of them is usually written down.',
    ),
  ],
  postInquiryRoadmap: [
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Step one (replace me).',
      body: 'Replace this with what happens first after someone presses send.',
      timeEstimate: 'How long it takes',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Step two (replace me).',
      body: 'Replace this with what happens next, and who does it.',
      timeEstimate: 'How long it takes',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Step three (replace me).',
      body: 'Replace this with the conversation, the visit, or whatever the middle of this looks like.',
      timeEstimate: 'How long it takes',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Step four (replace me).',
      body: 'Replace this with the point at which someone has to decide, and what they are deciding on.',
      timeEstimate: 'How long it takes',
    },
  ],

  schedulingLinkLabel: 'Replace this with the label on the scheduling link.',
});

// scaffold: testimonials
// ── 12. testimonial docs (3 items) ───────────────────────────────────────
// Required fields: quote, attribution, date, source
// Optional: location, photo, featured, sourceType, reviewUrl

docs.push({
  _id: 'testimonial-1',
  _type: 'testimonial',
  quote: 'Replace this with a real quote from a real client. Placeholder one of three.',
  attribution: 'Client name (replace me)',
  date: '2025-01-15',
  source: 'Google',
  sourceType: 'Google',
  location: 'Your City',
  featured: true,
});

docs.push({
  _id: 'testimonial-2',
  _type: 'testimonial',
  quote: 'Replace this with a real quote from a real client. Placeholder two of three.',
  attribution: 'Client name (replace me)',
  date: '2025-03-20',
  source: 'Facebook',
  sourceType: 'Facebook',
  location: 'Your City',
  featured: false,
});

docs.push({
  _id: 'testimonial-3',
  _type: 'testimonial',
  quote: 'Replace this with a real quote from a real client. Placeholder three of three.',
  attribution: 'Client name (replace me)',
  date: '2025-06-01',
  source: 'Direct (email or text)',
  sourceType: 'Direct',
  featured: false,
});
// scaffold:end

// scaffold: philosophy
// ── 13. philosophyPoint docs (3 items) ───────────────────────────────────
// Required fields: title, description
// Optional: displayOrder, orderRank (managed by plugin, omit here)

docs.push({
  _id: 'philosophy-1',
  _type: 'philosophyPoint',
  title: 'First value (replace me)',
  description:
    'Replace this with something this business actually does differently. A value nobody would disagree with says nothing.',
  displayOrder: 1,
});

docs.push({
  _id: 'philosophy-2',
  _type: 'philosophyPoint',
  title: 'Second value (replace me)',
  description:
    'Replace this with something this business actually does differently. A value nobody would disagree with says nothing.',
  displayOrder: 2,
});

docs.push({
  _id: 'philosophy-3',
  _type: 'philosophyPoint',
  title: 'Third value (replace me)',
  description:
    'Replace this with something this business actually does differently. A value nobody would disagree with says nothing.',
  displayOrder: 3,
});
// scaffold:end

// scaffold: journal
// ── 14. journalCategory docs (2 items) ───────────────────────────────────
// Required fields: title, slug{_type,current}
// Optional: description

docs.push({
  _id: 'journal-category-one',
  _type: 'journalCategory',
  title: 'Category one (replace me)',
  slug: { _type: 'slug', current: 'category-one' },
  description: 'Replace this with what gets filed under this category.',
});

docs.push({
  _id: 'journal-category-two',
  _type: 'journalCategory',
  title: 'Category two (replace me)',
  slug: { _type: 'slug', current: 'category-two' },
  description: 'Replace this with what gets filed under this category.',
});
// scaffold:end

// scaffold: journal
// ── 15. journalPage (singleton) ──────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, stickyCtaLabel?,
//         finalCtaHeadline, finalCtaSubhead, finalCta

docs.push({
  _id: 'journalPage',
  _type: 'journalPage',
  seoTitle: 'Journal - Studio Starter',
  seoDescription:
    'Replace this with one sentence saying what gets written here, for search results.',

  heroEyebrow: 'The Journal.',
  heroHeadline: 'Notes from the studio.',
  heroSubhead: 'Replace this with what gets written about here and roughly how often.',
  stickyCtaLabel: 'Got a question?',

  finalCtaHeadline: 'Replace this closing headline.',
  finalCtaSubhead: 'Replace this with the one thing you want a reader to do next.',
  finalCta: cta('Primary button label', '/contact'),
});
// scaffold:end

// scaffold: journal
// ── 16. journalEntry docs (2 items) ──────────────────────────────────────
// Required fields: title, slug, excerpt, publishedAt, body (min 1 block)
// Optional: coverImage, categories (refs), author, featured, updatedAt,
//           seoTitle, seoDescription, relatedPosts

docs.push({
  _id: 'journal-entry-welcome',
  _type: 'journalEntry',
  title: 'Welcome to the Journal',
  slug: { _type: 'slug', current: 'welcome-to-the-journal' },
  excerpt:
    'This is a placeholder post. Replace it with your first real journal entry once the site is live.',
  author: 'Author name (replace me)',
  publishedAt: '2025-06-01T12:00:00.000Z',
  featured: true,
  categories: [{ _type: 'reference', _key: key(), _ref: 'journal-category-two' }],
  body: [
    pt('This is a placeholder journal entry. Replace this content with your first real post.'),
    pt(
      'A journal is a good place for walkthroughs of real work and honest notes about how it goes. Write the way you talk. Be specific.',
    ),
    ptH2('What to write about'),
    pt(
      'Start with something you did recently. Walk readers through the brief, what went wrong, and the decisions you made. Specific detail is more interesting than general advice.',
    ),
    pt(
      'Once you have a few of those, mix in shorter notes: something you keep recommending, something worth knowing about, something that changed how you approach a common problem.',
    ),
  ],
});

docs.push({
  _id: 'journal-entry-second-post',
  _type: 'journalEntry',
  title: 'Second placeholder post (replace me)',
  slug: { _type: 'slug', current: 'second-placeholder-post' },
  excerpt:
    'Replace this with a real summary. The excerpt is what shows on the index page and in search results, so write it for a stranger.',
  author: 'Author name (replace me)',
  publishedAt: '2025-05-15T12:00:00.000Z',
  featured: false,
  categories: [{ _type: 'reference', _key: key(), _ref: 'journal-category-two' }],
  body: [
    pt(
      'Replace this with your own content. This placeholder post exists so the journal index has two entries to lay out on launch day, not because anything in it is worth publishing.',
    ),
    ptH2('A heading'),
    pt('Replace this paragraph. It is here to show what a body paragraph looks like.'),
    ptH2('A second heading'),
    pt('Replace this paragraph too.'),
    ptH3('A subheading'),
    pt('And this one, which shows the third heading level rendering.'),
  ],
});
// scaffold:end

// ── 17. notFoundPage (singleton) ─────────────────────────────────────────
// Fields: seoTitle, seoDescription, eyebrow, headline, body, heroImage?,
//         primaryCtaLabel, primaryCtaHref, secondaryCtaLabel,
//         secondaryCtaHref, tertiaryCtaLabel, tertiaryCtaHref

docs.push({
  _id: 'notFoundPage',
  _type: 'notFoundPage',
  seoTitle: 'Page not found',
  seoDescription: 'That page wandered off. Head back to the homepage or get in touch.',

  eyebrow: '404',
  headline: 'That page wandered off.',
  body: "It happens. Maybe a link is old, maybe the URL has a typo. Either way, here's where to head next.",

  primaryCtaLabel: 'Back home',
  primaryCtaHref: '/',
  // scaffold: services
  secondaryCtaLabel: 'See our services',
  secondaryCtaHref: '/services',
  // scaffold:end
  tertiaryCtaLabel: 'Get in touch',
  tertiaryCtaHref: '/contact',
});

// ── 18. privacyPage (singleton) ──────────────────────────────────────────
// Required fields: heroHeadline, lastUpdated, body (Portable Text)
// Optional: seoTitle, seoDescription, heroEyebrow, heroSubhead

docs.push({
  _id: 'privacyPage',
  _type: 'privacyPage',
  seoTitle: 'Privacy Policy - Studio Starter',
  seoDescription:
    'How Studio Starter collects, uses, and protects information submitted through this website.',

  heroEyebrow: 'Studio Starter.',
  heroHeadline: 'Privacy Policy',
  lastUpdated: '2025-06-01',

  body: [
    ptH2('1. Information We Collect'),
    pt(
      'When you submit the contact form on this website, we collect the information you provide: your name, email address, and any details about your project. We do not collect information automatically beyond standard server logs.',
    ),

    ptH2('2. How We Use Your Information'),
    pt(
      'We use the information you provide solely to respond to your inquiry and, if you become a client, to manage your project. We do not sell, share, or rent your information to third parties.',
    ),

    ptH2('3. Email Communications'),
    pt(
      'If you subscribe to a newsletter or mailing list through this site, we use your email address only to send the communications you signed up for. You can unsubscribe at any time by clicking the unsubscribe link in any message.',
    ),

    ptH2('4. Cookies and Analytics'),
    pt(
      'This site may use basic analytics to understand how visitors find and use the site. This data is aggregated and anonymous. We do not use cookies to track you across other websites.',
    ),

    ptH2('5. Data Security'),
    pt(
      'We take reasonable precautions to protect your information. Contact form submissions are transmitted over encrypted connections. We do not store payment information on this site.',
    ),

    ptH2('6. Third-Party Services'),
    pt(
      'This site is hosted on Cloudflare. Contact form submissions may be processed through a third-party form service. Each of these providers has its own privacy policy governing the data they handle.',
    ),

    ptH2('7. Your Rights'),
    pt(
      'You may request a copy of any personal information we hold about you, or ask us to delete it, by emailing hello@example.com. We will respond within 30 days.',
    ),

    ptH2('8. Changes to This Policy'),
    pt(
      'We may update this policy from time to time. The date at the top of this page reflects when it was last revised. Continued use of the site after a change constitutes acceptance of the updated policy.',
    ),

    ptH2('9. Contact'),
    pt(
      'Questions about this policy? Email hello@example.com. Replace this address with your actual contact email once the site is configured.',
    ),
  ],
});

// ── 19. studioGuide (singleton) ──────────────────────────────────────────
// Fields: guideTitle, guideIntro, studioMap [{area, description}],
//         howTos [{title, steps[]}], tips [{heading, tone, body}]

docs.push({
  _id: 'studioGuide',
  _type: 'studioGuide',
  guideTitle: 'How the website works',
  guideIntro:
    'Welcome to Studio Starter. This guide walks you through where everything lives in Sanity and how to make changes to the site without breaking anything.',
  studioMap: [
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Site Settings',
      description:
        'Your business name, tagline, email, phone, service areas, travel fees, social links, and newsletter settings. Start here after setup.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Preview (the tool with the page list)',
      description:
        'The live editing view. Pick a page from the list on the left and it appears on the right exactly as visitors will see it, including changes you have not published yet. Click any text on the page to jump straight to the field that holds it.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Home Page',
      description:
        'The headline, hero text, section copy, and CTA buttons on the homepage. Images are uploaded separately and referenced here.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'About Page',
      description:
        'Your story, philosophy, personal section, and stats. Replace the placeholder text with your real content.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Services + Service docs',
      description:
        'The Services page controls the hero and section copy. Individual Service documents control each service card: name, price, features, and description.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'FAQ Page + FAQ Items',
      description:
        'The FAQ page controls the hero. Individual FAQ Item documents hold each question and answer, organized by category.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Journal Page + Journal Entries',
      description:
        'The Journal page controls the index hero. Individual Journal Entry documents are your blog posts.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Testimonials',
      description:
        'Individual Testimonial documents. Add them here, then reference them from the Home Page to control which ones appear and in what order.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Philosophy Points',
      description:
        'The three values shown on the About page. Edit the title and description for each.',
    },
  ],
  howTos: [
    {
      _type: 'howTo',
      _key: key(),
      title: 'Update your business name and tagline',
      steps: [
        'Open "Site Settings" from the left navigation.',
        'Edit the "Site title" and "Tagline" fields.',
        'Click Publish.',
      ],
    },
    {
      _type: 'howTo',
      _key: key(),
      title: 'Rearrange a page while looking at it',
      steps: [
        'Open "Preview" from the top of the Studio.',
        'Pick the page you want from the list on the left.',
        'Hover a section on the page. An outline appears around it with a small toolbar.',
        'Use the plus buttons to add a section above or below it. The menu that opens is grouped and searchable, so you can type "gallery" instead of hunting.',
        'Drag the section by its outline to move it up or down the page.',
        'Use the toolbar to duplicate a section, or to remove one you do not want.',
        'Changes save as you go. Click Publish when the page looks right.',
      ],
    },
    {
      _type: 'howTo',
      _key: key(),
      title: 'Change wording without hunting for the field',
      steps: [
        'Open "Preview" and pick the page.',
        'Click the words you want to change, right there on the page.',
        'The edit panel opens on that exact field.',
        'Type the new wording. The page beside you updates as you type.',
        'Click Publish when you are happy with it.',
      ],
    },
    {
      _type: 'howTo',
      _key: key(),
      title: 'Add a new testimonial',
      steps: [
        'Open "Testimonials" from the left navigation.',
        'Click "New Testimonial".',
        'Fill in the quote, attribution, date, and source.',
        'Click Publish.',
        'Open "Home Page" and add the new testimonial to the "Testimonials in grid" field.',
        'Click Publish on the Home Page.',
      ],
    },
    {
      _type: 'howTo',
      _key: key(),
      title: 'Write a journal post',
      steps: [
        'Open "Journal Entries" from the left navigation.',
        'Click "New Journal Entry".',
        'Fill in the title, slug, excerpt, and body.',
        'Set the publish date and click Publish.',
        'The post appears automatically on the journal index page.',
      ],
    },
    {
      _type: 'howTo',
      _key: key(),
      title: 'Change service pricing',
      steps: [
        'Open "Services" from the left navigation.',
        'Click the service you want to update.',
        'Edit the "Price display" field to the new price.',
        'Click Publish.',
      ],
    },
  ],
  tips: [
    {
      _type: 'tip',
      _key: key(),
      heading: 'Start with Site Settings',
      tone: 'primary',
      body: 'The most important first step: open Site Settings and replace the placeholder email, business name, service areas, and travel fees with your real information. Everything else on the site pulls from here.',
    },
    {
      _type: 'tip',
      _key: key(),
      heading: 'Replace placeholder content before going live',
      tone: 'caution',
      body: 'The seed content is neutral placeholder copy. Every page has text that says "replace this with your own content." Make sure you have reviewed and updated all of it before pointing your real domain at the site.',
    },
    {
      _type: 'tip',
      _key: key(),
      heading: 'Edit on the page, not in a list of fields',
      tone: 'positive',
      body: 'The "Preview" tool is the easiest way to work. You see the real page, click the thing you want to change, and the right field opens. You can also add, duplicate, reorder and remove whole sections without leaving the page. Everything you do there is a draft until you press Publish.',
    },
    {
      _type: 'tip',
      _key: key(),
      heading: 'Publishing is immediate',
      tone: 'default',
      body: 'When you click Publish in Sanity, the change goes live on the site within a few seconds. There is no staging step. If you want to draft something before it goes live, leave it as a Draft in Sanity.',
    },
    {
      _type: 'tip',
      _key: key(),
      heading: 'Photos are optional but worth it',
      tone: 'positive',
      body: 'Every page works without photos -- the layouts fall back gracefully. But a real hero photo on the home page and About page will make the site feel finished faster than any other single change.',
    },
  ],
});

// ── 20. studioNotes (singleton) ──────────────────────────────────────────
// Fields: businessSummary, idealClient, voiceSummary, wordsToAvoid

docs.push({
  _id: 'studioNotes',
  _type: 'studioNotes',
  businessSummary:
    'Studio Starter is a placeholder business description. Replace this with a clear, plain-English description of this business: what it does, where it works, and what makes its approach different.',
  idealClient:
    'Replace this with a description of your ideal client. Be specific. The more clearly you can picture who you are writing for, the easier it is to write copy that speaks to them.',
  voiceSummary:
    'Replace this with a description of your voice. Plain-spoken and warm? Confident and direct? A little irreverent? Pick a lane and describe it in a sentence or two so anyone writing for the site stays consistent.',
  wordsToAvoid: [
    'transformative',
    'curated',
    'elevated',
    'tailored',
    'seamless',
    'bespoke',
    'meticulous',
    'leverage',
    'robust',
  ],
});

// ── 21. studioPlaybook (singleton) ───────────────────────────────────────
// Fields: title, intro, guides [{title, summary, sections [{heading, tone,
//         body, bullets, links}]}]

// The 'Grow your studio' playbook was removed on 2026-09-08. It was seeded
// with interior-design business content (photographing finished rooms,
// trade sourcing accounts) inherited from the build this starter was forked
// from, so every project made from it shipped another business's playbook
// that had to be found and deleted by hand. See PORTS.md card 44.

// ── Announcement banner example ───────────────────────────────────────────
// A single disabled example announcement so the collection is not empty after
// seeding. The editor can duplicate this, set a message and date window, then
// enable it. Disabled by default so it does not appear on the live site.
docs.push({
  _id: 'announcement-example',
  _type: 'announcement',
  internalTitle: 'Example announcement (disabled)',
  message: 'Welcome to our new website. Reach out any time if you have questions.',
  style: 'info',
  link: { label: 'Contact us', url: '/contact' },
  enabled: false,
});

// ── Seed all documents ────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${docs.length} documents to ${projectId}/${dataset}...`);

  let created = 0;
  let replaced = 0;

  for (const doc of docs) {
    try {
      const existing = await client.fetch(`*[_id == $id][0]._id`, { id: doc._id });
      await client.createOrReplace(doc);
      if (existing) {
        replaced += 1;
        console.log(`  replaced  ${doc._type}  ${doc._id}`);
      } else {
        created += 1;
        console.log(`  created   ${doc._type}  ${doc._id}`);
      }
    } catch (err) {
      console.error(`  ERROR on ${doc._id}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${created} created, ${replaced} replaced.`);
  console.log('Replace all placeholder text in Sanity before going live.');
}

seed();

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

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset   = env.PUBLIC_SANITY_DATASET ?? 'production';
const token     = env.SANITY_API_WRITE_TOKEN;

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
  tagline: 'Good design lives in the details.',
  email: 'hello@example.com',
  availabilityStatus: 'Accepting new clients',
  serviceAreas: ['Your City', 'Surrounding Region'],
  travelFees: [
    { _type: 'travelFeeTier', _key: key(), distanceLabel: 'Under 30 minutes', fee: 'None' },
    { _type: 'travelFeeTier', _key: key(), distanceLabel: '30 to 60 minutes', fee: '$50' },
    { _type: 'travelFeeTier', _key: key(), distanceLabel: '60 to 90 minutes', fee: '$100' },
  ],
  newsletter: {
    enabled: false,
    heading: 'Stay in the loop.',
    blurb: 'Design notes, project updates, and the occasional resource. No filler.',
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
  satisfactionGuarantee: 'We stand behind every project. If something is not right, we make it right.',
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
  seoTitle: 'Studio Starter - Interior Design',
  seoDescription: 'A design studio for people who want their home to feel finished and lived-in, not staged.',

  heroEyebrow: 'Welcome.',
  heroHeadline: 'Design That Feels Like You.',
  heroSubhead: 'We help people create spaces that work as hard as they do and feel good to come home to.',
  heroPrimaryCta: cta('Start a Conversation', '/contact'),
  heroSecondaryCta: cta('See Our Work', '/portfolio'),

  meetFounderEyebrow: 'Meet the Founder.',
  meetFounderHeadline: 'Good design starts with a real conversation.',
  meetFounderContent: [
    pt('Every project starts the same way: a conversation about how you actually use your space, not just how you want it to look. That conversation shapes everything that follows.'),
    pt('Replace this placeholder with your own story. Tell visitors who you are, what drives your work, and why they should trust you with their home.'),
  ],
  meetFounderCta: cta('Learn More About the Studio', '/about'),

  featuredWorkEyebrow: 'Recent Work.',
  featuredWorkHeadline: 'Rooms that feel finished.',
  featuredWorkSubhead: 'A look at recent projects. Each one starts with a conversation about how the space actually needs to function, then the design follows from there.',
  featuredWorkCta: cta('See All Work', '/portfolio'),

  featuredJournalEyebrow: 'From the Journal.',
  featuredJournalHeadline: 'How we think about design.',
  featuredJournalSubhead: 'Posts on the design moves that change a room, source roundups behind specific projects, and the occasional honest note about process.',
  featuredJournalCta: cta('Read the Journal', '/journal'),

  processPreviewEyebrow: 'How It Works.',
  processPreviewHeadline: 'A clear process, start to finish.',
  processPreviewSubhead: 'No guesswork and no pressure. From your first inquiry to the day everything comes together, you will always know exactly where things stand and what happens next.',
  processPreviewCta: cta('See the Full Process', '/services'),

  testimonialsEyebrow: 'Kind Words.',
  testimonialsHeadline: 'Words from real homes.',
  testimonialsSubhead: 'The part that matters most: how it felt to work together, and how each space holds up to everyday life.',
  testimonialsToShow: [
    { _type: 'reference', _key: key(), _ref: 'testimonial-1' },
    { _type: 'reference', _key: key(), _ref: 'testimonial-2' },
    { _type: 'reference', _key: key(), _ref: 'testimonial-3' },
  ],

  servicesGridEyebrow: 'The Studio.',
  servicesGridHeadline: 'Design Services for Every Space.',
  servicesGridSubhead: 'Whether you need a fresh set of eyes or a full room overhaul, there is a tier designed for where you are.',
  servicesGridCta: cta('See All Services', '/services'),
  servicesGridFootnote: 'Final pricing is always discussed before any work begins.',

  serviceAreaCue: 'Serving the greater metro area and surrounding region.',
  finalCtaEyebrow: 'Ready to Begin?',
  finalCtaHeadline: 'Ready to Love Your Space?',
  finalCtaSubhead: "Let's start with a conversation. Fill out the form and we'll be in touch within two business days.",
  finalCta: cta('Start a Conversation', '/contact'),

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
      headline: 'Design That Feels Like You.',
      subhead: 'We help people create spaces that work as hard as they do and feel good to come home to.',
      size: 'tall',
      primaryCta: cta('Start a Conversation', '/contact'),
      secondaryCta: cta('See Our Work', '/portfolio'),
    },
    {
      _type: 'founderSection',
      _key: key(),
      eyebrow: 'Meet the Founder.',
      headline: 'Good design starts with a real conversation.',
      content: [
        pt('Every project starts the same way: a conversation about how you actually use your space, not just how you want it to look.'),
        pt('Replace this placeholder with your own story. Tell visitors who you are, what drives your work, and why they should trust you with their home.'),
      ],
      cta: cta('Learn More About the Studio', '/about'),
    },
    {
      _type: 'testimonialsSection',
      _key: key(),
      eyebrow: 'Kind Words.',
      headline: 'Words from real clients.',
      subhead: 'The part that matters most: how it felt to work together.',
      testimonialsToShow: [
        { _type: 'reference', _key: key(), _ref: 'testimonial-1' },
        { _type: 'reference', _key: key(), _ref: 'testimonial-2' },
        { _type: 'reference', _key: key(), _ref: 'testimonial-3' },
      ],
    },
    {
      _type: 'processSection',
      _key: key(),
      eyebrow: 'How It Works.',
      headline: 'A clear process, start to finish.',
      subhead: 'No guesswork and no pressure. You will always know exactly where things stand.',
      variant: 'preview',
      cta: cta('See the Full Process', '/process'),
    },
    {
      _type: 'servicesGridSection',
      _key: key(),
      eyebrow: 'The Studio.',
      headline: 'Design Services for Every Space.',
      subhead: 'Whether you need a fresh set of eyes or a full room overhaul, there is a tier for you.',
      cta: cta('See All Services', '/services'),
      footnote: 'Final pricing is always discussed before any work begins.',
      variant: 'grid',
    },
    {
      _type: 'serviceAreaSection',
      _key: key(),
      eyebrow: 'Service Area.',
      headline: 'Where We Work.',
      description: 'We serve the greater metro area and surrounding region. Travel fees for out-of-area projects are always quoted upfront.',
      showTravelFees: true,
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: 'Ready to Begin?',
      headline: 'Ready to Love Your Space?',
      subhead: "Let's start with a conversation.",
      cta: cta('Start a Conversation', '/contact'),
    },
  ],
});

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
  seoTitle: 'About Studio Starter - Interior Design',
  seoDescription: 'Learn about the studio, the founder, and the philosophy behind every project we take on.',

  heroEyebrow: 'The Designer.',
  heroHeadline: 'People Hire People.',
  heroSubhead: "Here's who you'd be working with.",

  storyEyebrow: 'My Story.',
  storyHeadline: 'Why I Started This Studio.',
  storyContent: [
    pt('Replace this with your real origin story. Tell visitors what led you to design, what you noticed was missing in the industry, and what you set out to do differently.'),
    pt('Be specific. The more concrete you are about where you came from and what you stand for, the more easily the right clients will recognize themselves in your work.'),
  ],
  founderAttribution: 'Your Name, Founder of Studio Starter',
  backgroundLine: 'Your credentials, training, or experience in one plain sentence.',
  serviceAreaMention: 'Based in Your City, serving the surrounding region.',

  philosophyEyebrow: 'How We Work.',
  philosophyHeadline: 'Three principles that guide every project.',

  personalEyebrow: 'Off the Clock.',
  personalHeadline: 'A little more about me.',
  personalIntro: 'Design is what I do, but it is not all I am.',
  currentlyList: [
    { _type: 'currentlyRow', _key: key(), label: 'Reading', value: 'Add the book you are reading right now' },
    { _type: 'currentlyRow', _key: key(), label: 'Listening to', value: 'Add your current playlist or podcast' },
    { _type: 'currentlyRow', _key: key(), label: 'Obsessed with', value: 'Add something you keep recommending to people' },
  ],
  rapidFire: [
    { _type: 'rapidFireRow', _key: key(), prompt: 'Coffee order', answer: 'Black, always' },
    { _type: 'rapidFireRow', _key: key(), prompt: 'Favorite room to design', answer: 'Living rooms -- the hardest to get right' },
    { _type: 'rapidFireRow', _key: key(), prompt: 'Renovate or decorate', answer: 'Decorate first, then renovate if you still need to' },
  ],
  localSpots: [
    { _type: 'localSpotRow', _key: key(), name: 'Your Favorite Coffee Shop', note: 'Best place to think' },
    { _type: 'localSpotRow', _key: key(), name: 'Your Favorite Furniture Store', note: 'For when clients need to see things in person' },
  ],
  beyondDesign: 'Replace this with a short paragraph about life outside work. What do you care about beyond design? Family, community, hobbies. Write the way you actually talk.',

  stats: [
    { _type: 'statItem', _key: key(), number: 5, suffix: '+', label: 'Years in Business' },
    { _type: 'statItem', _key: key(), number: 50, suffix: '+', label: 'Projects Completed' },
    { _type: 'statItem', _key: key(), number: 100, suffix: '%', label: 'Client Satisfaction' },
  ],

  finalCtaEyebrow: "Let's Work Together.",
  finalCtaHeadline: 'Ready to Start?',
  finalCtaSubhead: 'Send a message and we will be back in touch within two business days.',
  finalCta: cta('Get in Touch', '/contact'),

  // ── pageBuilder (section-driven layout, Phase B) ─────────────────────────
  // NOTE: Mirrors DEFAULT_ABOUT_SECTIONS in src/data/defaultSections.ts.
  // The seed uses richer section types (storySection, valuesSection) that need
  // Sanity collections; the route fallback uses simpler inline types.
  // Keep copy in sync between here and defaultSections.ts when updating.
  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'The Designer.',
      headline: 'People Hire People.',
      subhead: "Here's who you'd be working with.",
      size: 'short',
    },
    {
      _type: 'storySection',
      _key: key(),
      eyebrow: 'My Story.',
      headline: 'Why I Started This Studio.',
      content: [
        pt('Replace this with your real origin story. Tell visitors what led you to design, what you noticed was missing, and what you set out to do differently.'),
      ],
      attribution: 'Your Name, Founder',
      credentialLine: 'Your credentials or training in one plain sentence.',
      serviceAreaLine: 'Based in Your City, serving the surrounding region.',
    },
    {
      _type: 'valuesSection',
      _key: key(),
      eyebrow: 'How We Work.',
      headline: 'Three principles that guide every project.',
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
      headline: 'Ready to Start?',
      subhead: 'Send a message and we will be back in touch within two business days.',
      cta: cta('Get in Touch', '/contact'),
    },
  ],
});

// ── 4. servicesPage (singleton) ──────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, stickyCtaLabel?,
//         servicesListEyebrow, servicesListHeadline, servicesListSubhead,
//         serviceAreaSection{eyebrow, headline, description},
//         finalCtaEyebrow, finalCtaHeadline, finalCtaSubhead, finalCta

docs.push({
  _id: 'servicesPage',
  _type: 'servicesPage',
  seoTitle: 'Interior Design Services - Studio Starter',
  seoDescription: 'Design services for every space and stage. From a single room consultation to a full project, we have a tier for where you are.',

  heroEyebrow: 'What We Offer.',
  heroHeadline: 'Design Services for Every Space and Stage.',
  heroSubhead: 'Whether you need a fresh perspective or want to hand the whole project over, there is a service for you.',

  servicesListEyebrow: 'The Tiers.',
  servicesListHeadline: 'Find the right fit.',
  servicesListSubhead: 'Each service is priced to match the scope. Everything is discussed before any work begins.',

  serviceAreaSection: {
    eyebrow: 'Service Area.',
    headline: 'Based Locally, Available Regionally.',
    description: 'We serve the greater metro area and surrounding region. Travel fees for out-of-area projects are always quoted upfront before any work begins.',
  },

  finalCtaEyebrow: "Let's Talk.",
  finalCtaHeadline: 'Not sure which service is right?',
  finalCtaSubhead: 'Send a message with a few details about your space. We will point you toward the best fit, no pressure.',
  finalCta: cta('Start a Conversation', '/contact'),

  // ── pageBuilder (section-driven layout, Phase B) ─────────────────────────
  // NOTE: Mirrors DEFAULT_SERVICES_SECTIONS in src/data/defaultSections.ts.
  // Keep copy in sync between here and defaultSections.ts when updating.
  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'What We Offer.',
      headline: 'Design Services for Every Space and Stage.',
      subhead: 'Whether you need a fresh perspective or want to hand the whole project over, there is a service for you.',
      size: 'short',
    },
    {
      _type: 'servicesGridSection',
      _key: key(),
      eyebrow: 'The Tiers.',
      headline: 'Find the right fit.',
      subhead: 'Each service is priced to match the scope. Everything is discussed before any work begins.',
      variant: 'list',
    },
    {
      _type: 'serviceAreaSection',
      _key: key(),
      eyebrow: 'Service Area.',
      headline: 'Based Locally, Available Regionally.',
      description: 'We serve the greater metro area and surrounding region. Travel fees are quoted upfront.',
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
      headline: 'Not sure which service is right?',
      subhead: 'Send a message with a few details about your space. We will point you toward the best fit.',
      cta: cta('Start a Conversation', '/contact'),
    },
  ],
});

// ── 5. service docs (3 collection items) ─────────────────────────────────
// Required fields: name, slug{_type,current}, price, shortDescription,
//                  features, bestFor, displayOrder
// Optional: priceNumeric, longDescription, showOnHomepage, ctaLabel

docs.push({
  _id: 'service-consultation',
  _type: 'service',
  name: 'Consultation',
  slug: { _type: 'slug', current: 'consultation' },
  price: '$150',
  priceNumeric: 150,
  shortDescription: 'A two-hour in-home session to work through what is not working, prioritize what to tackle first, and leave with a clear action list.',
  features: [
    '2-hour in-home session',
    'Room-by-room walkthrough',
    'Written action list with priorities',
    'Paint and product recommendations',
  ],
  bestFor: 'Homeowners who know something feels off but are not sure where to start.',
  displayOrder: 1,
  showOnHomepage: true,
  ctaLabel: 'Book a Consultation',
});

docs.push({
  _id: 'service-single-room',
  _type: 'service',
  name: 'Single Room Design',
  slug: { _type: 'slug', current: 'single-room-design' },
  price: 'Starting at $650',
  priceNumeric: 650,
  shortDescription: 'Full design for one room: a concept board, sourcing list, and layout plan you can hand off to a contractor or shop yourself.',
  features: [
    'In-home discovery session',
    'Concept board with color story',
    'Full sourcing list with links and pricing',
    'Furniture layout to scale',
    'One revision round',
  ],
  bestFor: 'When you want one room done right before committing to the whole house.',
  displayOrder: 2,
  showOnHomepage: true,
  ctaLabel: 'Start a Conversation',
  longDescription: [
    pt('We start with an in-home session to understand how the room is used, what is not working, and what you want it to feel like when it is finished. From there we build a concept, source everything, and hand you a plan you can execute on your own timeline.'),
  ],
});

docs.push({
  _id: 'service-full-project',
  _type: 'service',
  name: 'Full Project Design',
  slug: { _type: 'slug', current: 'full-project-design' },
  price: 'Custom quote',
  shortDescription: 'Whole-home or multi-room design with full project management, contractor coordination, and installation oversight.',
  features: [
    'Full discovery session',
    'Concept and color story for each space',
    'Complete sourcing and procurement',
    'Contractor coordination',
    'Installation day oversight',
    'Final styling',
  ],
  bestFor: 'When you would rather hand the project off than manage it yourself.',
  displayOrder: 3,
  showOnHomepage: true,
  ctaLabel: 'Get a Quote',
  longDescription: [
    pt('This is the full service. We handle everything from the initial concept through installation day. You make the decisions; we handle the logistics, the sourcing, the contractor communication, and the final styling.'),
    pt('Pricing is based on scope and is always discussed in detail before any work begins.'),
  ],
});

// ── 6. processPage (singleton) ───────────────────────────────────────────
// NOTE: pageBuilder mirrors DEFAULT_PROCESS_SECTIONS in src/data/defaultSections.ts.
// Keep copy in sync when updating.

docs.push({
  _id: 'processPage',
  _type: 'processPage',
  seoTitle: 'Our Process - Studio Starter Interior Design',
  seoDescription: 'From the first conversation to the final reveal, here is exactly how our process works.',

  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'The Process.',
      headline: 'From First Call to Final Reveal.',
      subhead: 'A clear, pressure-free process from the first inquiry through installation day.',
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
      headline: 'Start the Conversation.',
      subhead: 'Fill out the contact form with a few details about your space.',
      cta: cta('Get in Touch', '/contact'),
    },
  ],
});

// ── 7. processStep docs (4 steps) ────────────────────────────────────────
// Idempotent: createOrReplace with deterministic _id values.
// Steps auto-populate into any processSection via sectionsProjection().

docs.push({
  _id: 'process-step-1',
  _type: 'processStep',
  stepNumber: 1,
  title: 'Initial Inquiry',
  timeEstimate: '2 business days',
  shortDescription: 'Fill out the contact form with a few details about your project. We review every inquiry personally and reply within two business days.',
  features: [
    'Tell us about your space',
    'Share your goals and timeline',
    'We respond personally, no automated sequences',
  ],
  orderRank: 'a0',
});

docs.push({
  _id: 'process-step-2',
  _type: 'processStep',
  stepNumber: 2,
  title: 'Discovery Call',
  timeEstimate: '20 minutes',
  shortDescription: 'A short call to talk through your project, figure out which service is the best fit, and answer any questions before we start.',
  features: [
    'Review your goals and budget',
    'Determine the right service tier',
    'No pressure, just a conversation',
  ],
  orderRank: 'a1',
});

docs.push({
  _id: 'process-step-3',
  _type: 'processStep',
  stepNumber: 3,
  title: 'Design & Sourcing',
  timeEstimate: '2 to 3 weeks',
  shortDescription: 'We build your concept, source every piece, and hand you a complete plan you can act on.',
  features: [
    'In-home session to assess the space',
    'Concept board with color story',
    'Full sourcing list with links and pricing',
    'Furniture layout to scale',
  ],
  orderRank: 'a2',
});

docs.push({
  _id: 'process-step-4',
  _type: 'processStep',
  stepNumber: 4,
  title: 'Installation & Reveal',
  timeEstimate: 'One day',
  shortDescription: 'We coordinate delivery, direct placement, and add the final styling details. You walk in at the end of the day to a finished room.',
  features: [
    'Delivery and placement coordination',
    'Final styling',
    'Walkthrough and care notes',
  ],
  orderRank: 'a3',
});

// ── 9. faqPage (singleton) ───────────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, categoryOrder,
//         finalCtaEyebrow, finalCtaHeadline, finalCtaSubhead, finalCta,
//         secondaryCta?

docs.push({
  _id: 'faqPage',
  _type: 'faqPage',
  seoTitle: 'FAQ - Studio Starter Interior Design',
  seoDescription: 'Answers to the most common questions about our design services, pricing, process, and service area.',

  heroEyebrow: 'Common Questions.',
  heroHeadline: 'Everything You Want to Know.',
  heroSubhead: 'If your question is not here, just ask. We respond to every message within two business days.',

  categoryOrder: ['Pricing & Cost', 'The Process', 'Logistics', 'Service Area', 'Getting Started'],

  finalCtaEyebrow: 'Not Finding Your Answer?',
  finalCtaHeadline: 'Just ask.',
  finalCtaSubhead: 'Send a message and we will get back to you within two business days.',
  finalCta: cta('Send a Message', '/contact'),
});

// ── 10. faqItem docs (4 items) ───────────────────────────────────────────
// Required fields: question, answer (Portable Text), category, displayOrder
// Optional: alsoShowOnProcessPage

docs.push({
  _id: 'faq-what-does-it-cost',
  _type: 'faqItem',
  question: 'How much does it cost to work with you?',
  answer: [
    pt('Consultations are $150 for a two-hour in-home session. Single room design starts at $650. Full-project work is custom quoted based on scope.'),
    pt('We always discuss pricing in detail before any work begins. No surprises.'),
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
    pt('A consultation takes two hours. Single-room design plans are usually ready within two to three weeks. Full projects vary based on scope, contractor availability, and lead times on furniture.'),
    pt('We will give you a realistic timeline at the start of every project so you can plan accordingly.'),
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
    pt('Yes. We serve the greater metro area and surrounding region. For out-of-area projects, travel fees are quoted upfront based on drive time. Nothing is charged without your approval first.'),
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
    pt('Fill out the contact form with a few details about your space and what you are hoping to do. We will review your inquiry and follow up within two business days to talk through your project and figure out which service is the best fit.'),
  ],
  category: 'Getting Started',
  displayOrder: 1,
  alsoShowOnProcessPage: false,
});

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
  seoTitle: 'Contact Studio Starter - Start a Conversation',
  seoDescription: 'Tell us about your project. We respond to every inquiry within two business days.',

  heroEyebrow: 'Request a Consultation.',
  heroHeadline: 'Start the Conversation.',
  heroSubhead: "Tell us a little about your space. We'll be back in touch within two business days.",

  formIntroNote: 'No automated sequences and no sales calls. Just a real reply from a real person.',
  formProjectTypeOptions: [
    'Single room',
    'Multiple rooms',
    'Whole home',
    'New construction',
    'Builder or realtor partnership',
    'Not sure yet',
  ],
  formLocationOptions: [],
  formBudgetOptions: [
    'Under $2,000',
    '$2,000 to $5,000',
    '$5,000 to $10,000',
    '$10,000 to $25,000',
    '$25,000+',
    'Not sure yet',
  ],
  formTimelineOptions: ['As soon as possible', '1 to 3 months', '3 to 6 months', '6 months or more', 'Flexible'],
  formSourceOptions: [
    'Google search',
    'Instagram',
    'Facebook',
    'Houzz',
    'Referral from a friend or family member',
    'Saw your work in person',
    'Journal post',
    'Other',
  ],

  whatToExpectEyebrow: 'What to Expect.',
  whatToExpectHeadline: 'When you submit this form...',
  whatToExpectContent: [
    pt('A real person reads every inquiry. No automated follow-up sequences, no sales calls. We review your message, look at your project details, and reply personally within two business days.'),
    pt('If we are a good fit, we will set up a brief call to talk through your space, your goals, and which service makes sense for where you are. If we are not the right fit, we will say so and point you in a better direction.'),
  ],
  postInquiryRoadmap: [
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'We review your inquiry.',
      body: 'A real person reads your form within two business days.',
      timeEstimate: 'Within 48 hours',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'We send a personal reply.',
      body: 'If we are a good fit, we reach out to schedule a short discovery call.',
      timeEstimate: '1 to 2 business days',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Discovery call.',
      body: 'A 20-minute call to talk through your space and figure out which service is the right fit.',
      timeEstimate: '20 minutes',
    },
    {
      _type: 'roadmapStep',
      _key: key(),
      title: 'Proposal and next steps.',
      body: 'If we move forward, we send a scope and pricing summary for your review. Nothing starts until you approve it.',
      timeEstimate: '2 to 3 business days',
    },
  ],

  schedulingLinkLabel: 'Schedule a 20-minute discovery call.',
});

// ── 12. testimonial docs (3 items) ───────────────────────────────────────
// Required fields: quote, attribution, date, source
// Optional: location, photo, featured, sourceType, reviewUrl

docs.push({
  _id: 'testimonial-1',
  _type: 'testimonial',
  quote: 'Working with this studio changed how I feel about coming home. Our living room finally makes sense. Replace this with a real client quote.',
  attribution: 'Happy Client',
  date: '2025-01-15',
  source: 'Google',
  sourceType: 'Google',
  location: 'Your City',
  featured: true,
});

docs.push({
  _id: 'testimonial-2',
  _type: 'testimonial',
  quote: 'I kept putting off dealing with our dining room because it felt too hard. One consultation and a clear plan later, we finally did it. Replace this with a real client quote.',
  attribution: 'Satisfied Client',
  date: '2025-03-20',
  source: 'Facebook',
  sourceType: 'Facebook',
  location: 'Your City',
  featured: false,
});

docs.push({
  _id: 'testimonial-3',
  _type: 'testimonial',
  quote: 'The process was clear from start to finish and the result is exactly what we hoped for. Replace this with a real client quote.',
  attribution: 'Returning Client',
  date: '2025-06-01',
  source: 'Direct (email or text)',
  sourceType: 'Direct',
  featured: false,
});

// ── 13. philosophyPoint docs (3 items) ───────────────────────────────────
// Required fields: title, description
// Optional: displayOrder, orderRank (managed by plugin, omit here)

docs.push({
  _id: 'philosophy-1',
  _type: 'philosophyPoint',
  title: 'Your Vision First',
  description: 'Good design starts by listening. We learn how you live before we suggest how anything should look.',
  displayOrder: 1,
});

docs.push({
  _id: 'philosophy-2',
  _type: 'philosophyPoint',
  title: 'Honest About Money',
  description: 'Pricing is always discussed before any work begins. We give you real numbers up front so you can decide with confidence.',
  displayOrder: 2,
});

docs.push({
  _id: 'philosophy-3',
  _type: 'philosophyPoint',
  title: 'Clear All the Way Through',
  description: 'You will always know where your project stands and what comes next. No radio silence, no guesswork.',
  displayOrder: 3,
});

// ── 14. journalCategory docs (2 items) ───────────────────────────────────
// Required fields: title, slug{_type,current}
// Optional: description

docs.push({
  _id: 'journal-category-project-stories',
  _type: 'journalCategory',
  title: 'Project Stories',
  slug: { _type: 'slug', current: 'project-stories' },
  description: 'Before, after, and the thinking in between.',
});

docs.push({
  _id: 'journal-category-design-notes',
  _type: 'journalCategory',
  title: 'Design Notes',
  slug: { _type: 'slug', current: 'design-notes' },
  description: 'Opinions, observations, and practical advice from the studio.',
});

// ── 15. journalPage (singleton) ──────────────────────────────────────────
// Fields: seoTitle, seoDescription, heroEyebrow, heroHeadline, heroSubhead,
//         heroImage?, heroScriptAccent?, stickyCtaLabel?,
//         finalCtaHeadline, finalCtaSubhead, finalCta

docs.push({
  _id: 'journalPage',
  _type: 'journalPage',
  seoTitle: 'Journal - Studio Starter',
  seoDescription: 'Project walkthroughs, design thinking, and practical notes from the studio. Written between projects.',

  heroEyebrow: 'The Journal.',
  heroHeadline: 'Notes from the studio.',
  heroSubhead: 'Project walkthroughs, design thinking, and the occasional opinion. Written between projects.',
  stickyCtaLabel: 'Have a room in mind?',

  finalCtaHeadline: 'Got a project of your own?',
  finalCtaSubhead: "Let's talk about it.",
  finalCta: cta('Start a Conversation', '/contact'),
});

// ── 16. journalEntry docs (2 items) ──────────────────────────────────────
// Required fields: title, slug, excerpt, publishedAt, body (min 1 block)
// Optional: coverImage, categories (refs), author, featured, updatedAt,
//           seoTitle, seoDescription, relatedPosts

docs.push({
  _id: 'journal-entry-welcome',
  _type: 'journalEntry',
  title: 'Welcome to the Journal',
  slug: { _type: 'slug', current: 'welcome-to-the-journal' },
  excerpt: 'This is a placeholder post. Replace it with your first real journal entry once the site is live.',
  author: 'Studio Starter',
  publishedAt: '2025-06-01T12:00:00.000Z',
  featured: true,
  categories: [
    { _type: 'reference', _key: key(), _ref: 'journal-category-design-notes' },
  ],
  body: [
    pt('This is a placeholder journal entry. Replace this content with your first real post.'),
    pt('The journal is a good place to share project walkthroughs, design tips, and honest notes about your process. Write the way you talk. Be specific.'),
    ptH2('What to write about'),
    pt('Start with a recent project. Walk readers through the brief, the challenges, and the decisions you made. Specific detail is more interesting than general advice.'),
    pt('Once you have a few project posts, mix in shorter notes: a product you keep recommending, a paint color worth knowing about, a sourcing find that changed the way you approach a common problem.'),
  ],
});

docs.push({
  _id: 'journal-entry-getting-started',
  _type: 'journalEntry',
  title: 'How to Get the Most Out of a Design Consultation',
  slug: { _type: 'slug', current: 'how-to-get-the-most-out-of-a-design-consultation' },
  excerpt: 'A consultation works best when you come prepared. Here is what to gather, what questions to have ready, and what to expect when we walk through your space.',
  author: 'Studio Starter',
  publishedAt: '2025-05-15T12:00:00.000Z',
  featured: false,
  categories: [
    { _type: 'reference', _key: key(), _ref: 'journal-category-design-notes' },
  ],
  body: [
    pt('Replace this with your own content. This placeholder post is here to give the journal index page something to show on launch.'),
    ptH2('Before the session'),
    pt('Walk through the room and take note of what bothers you most. You do not need to know why -- just what. That is a good starting point for the conversation.'),
    ptH2('During the session'),
    pt('Ask every question you have. There are no obvious ones. The more honest you are about how the space is actually used, the more useful the recommendations will be.'),
    ptH3('What to bring'),
    pt('Any inspiration images you have saved, even if you are not sure exactly what you like about them. Patterns in your taste are useful information.'),
    ptH2('After the session'),
    pt('You will leave with a written action list. Start with the lowest-cost, highest-impact items first. Quick wins build momentum.'),
  ],
});

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
  secondaryCtaLabel: 'See our services',
  secondaryCtaHref: '/services',
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
  seoDescription: 'How Studio Starter collects, uses, and protects information submitted through this website.',

  heroEyebrow: 'Studio Starter.',
  heroHeadline: 'Privacy Policy',
  lastUpdated: '2025-06-01',

  body: [
    ptH2('1. Information We Collect'),
    pt('When you submit the contact form on this website, we collect the information you provide: your name, email address, and any details about your project. We do not collect information automatically beyond standard server logs.'),

    ptH2('2. How We Use Your Information'),
    pt('We use the information you provide solely to respond to your inquiry and, if you become a client, to manage your project. We do not sell, share, or rent your information to third parties.'),

    ptH2('3. Email Communications'),
    pt('If you subscribe to a newsletter or mailing list through this site, we use your email address only to send the communications you signed up for. You can unsubscribe at any time by clicking the unsubscribe link in any message.'),

    ptH2('4. Cookies and Analytics'),
    pt('This site may use basic analytics to understand how visitors find and use the site. This data is aggregated and anonymous. We do not use cookies to track you across other websites.'),

    ptH2('5. Data Security'),
    pt('We take reasonable precautions to protect your information. Contact form submissions are transmitted over encrypted connections. We do not store payment information on this site.'),

    ptH2('6. Third-Party Services'),
    pt('This site is hosted on Cloudflare. Contact form submissions may be processed through a third-party form service. Each of these providers has its own privacy policy governing the data they handle.'),

    ptH2('7. Your Rights'),
    pt('You may request a copy of any personal information we hold about you, or ask us to delete it, by emailing hello@example.com. We will respond within 30 days.'),

    ptH2('8. Changes to This Policy'),
    pt('We may update this policy from time to time. The date at the top of this page reflects when it was last revised. Continued use of the site after a change constitutes acceptance of the updated policy.'),

    ptH2('9. Contact'),
    pt('Questions about this policy? Email hello@example.com. Replace this address with your actual contact email once the site is configured.'),
  ],
});

// ── 19. studioGuide (singleton) ──────────────────────────────────────────
// Fields: guideTitle, guideIntro, studioMap [{area, description}],
//         howTos [{title, steps[]}], tips [{heading, tone, body}]

docs.push({
  _id: 'studioGuide',
  _type: 'studioGuide',
  guideTitle: 'How the website works',
  guideIntro: 'Welcome to Studio Starter. This guide walks you through where everything lives in Sanity and how to make changes to the site without breaking anything.',
  studioMap: [
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Site Settings',
      description: 'Your business name, tagline, email, phone, service areas, travel fees, social links, and newsletter settings. Start here after setup.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Home Page',
      description: 'The headline, hero text, section copy, and CTA buttons on the homepage. Images are uploaded separately and referenced here.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'About Page',
      description: 'Your story, philosophy, personal section, and stats. Replace the placeholder text with your real content.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Services + Service docs',
      description: 'The Services page controls the hero and section copy. Individual Service documents control each service card: name, price, features, and description.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'FAQ Page + FAQ Items',
      description: 'The FAQ page controls the hero. Individual FAQ Item documents hold each question and answer, organized by category.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Journal Page + Journal Entries',
      description: 'The Journal page controls the index hero. Individual Journal Entry documents are your blog posts.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Testimonials',
      description: 'Individual Testimonial documents. Add them here, then reference them from the Home Page to control which ones appear and in what order.',
    },
    {
      _type: 'mapRow',
      _key: key(),
      area: 'Philosophy Points',
      description: 'The three values shown on the About page. Edit the title and description for each.',
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
  businessSummary: 'Studio Starter is a placeholder business description. Replace this with a clear, plain-English description of your studio: what you do, where you work, and what makes your approach different.',
  idealClient: 'Replace this with a description of your ideal client. Be specific. The more clearly you can picture who you are designing for, the easier it is to write copy that speaks to them.',
  voiceSummary: 'Replace this with a description of your voice. Plain-spoken and warm? Confident and direct? A little irreverent? Pick a lane and describe it in a sentence or two so anyone writing for the site stays consistent.',
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

docs.push({
  _id: 'studioPlaybook',
  _type: 'studioPlaybook',
  title: 'Grow your studio',
  intro: 'Practical guides for expanding what this site can do for your business. Each tab covers one area of growth.',
  guides: [
    {
      _type: 'playbookGuide',
      _key: key(),
      title: 'Photograph Your Work',
      summary: 'Good photos are the single highest-leverage investment for a design studio website. Here is how to approach it without a professional crew.',
      sections: [
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'What to shoot',
          tone: 'default',
          body: 'Finished rooms, before-and-after pairs, and a few detail shots of objects you sourced. Three or four strong images per project are better than twenty mediocre ones.',
          bullets: [
            'Wide shot of the whole room from the door',
            'Medium shot of the main seating or focal point',
            'Close-up of a detail: a lamp, a stack of books, hardware',
            'Before photo (even just a quick phone shot before you start)',
          ],
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Timing matters',
          tone: 'default',
          body: 'Shoot in the late morning or early afternoon when natural light is indirect and flattering. Turn off overhead fixtures and use lamps instead.',
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Camera vs. phone',
          tone: 'positive',
          body: 'A modern smartphone is enough to get started. Use the 1x or 2x lens (not ultra-wide, which distorts the room). Shoot in portrait mode for detail shots, landscape for room shots.',
        },
      ],
    },
    {
      _type: 'playbookGuide',
      _key: key(),
      title: 'Build Your Sourcing Toolkit',
      summary: 'Access to trade pricing and professional sourcing makes your service more valuable and your margins better. Here is where to apply.',
      sections: [
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Trade accounts worth having',
          tone: 'default',
          body: 'Most major furniture vendors offer trade programs with 20 to 40 percent discounts and longer lead-time transparency.',
          bullets: [
            'Crate and Barrel Trade',
            'Restoration Hardware (RH) Contract',
            'West Elm at Work',
            'Perigold / Wayfair Professional',
            'Local wholesale showrooms in your market',
          ],
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'What you need to apply',
          tone: 'default',
          body: 'Most trade programs require a business license or resale certificate, a business email address, and sometimes a portfolio or website URL. Have these ready before applying.',
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'How to pass savings to clients',
          tone: 'positive',
          body: 'You can pass the full discount to the client, keep a portion, or charge a procurement fee on top of trade pricing. All approaches are common. Be transparent with clients about how you handle pricing.',
        },
      ],
    },
    {
      _type: 'playbookGuide',
      _key: key(),
      title: 'Add E-Design',
      summary: 'E-design (remote design delivered as a PDF package) lets you serve clients outside your local area at a lower price point.',
      sections: [
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'What e-design typically includes',
          tone: 'default',
          body: 'A concept board, a sourcing list with live links, a furniture layout, and paint recommendations. Delivered as a PDF the client can execute on their own.',
          bullets: [
            'Concept board (mood board)',
            'Furniture plan to scale',
            'Sourcing list with prices and links',
            'Paint and color recommendations',
            'Optional: video walkthroughs',
          ],
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Pricing e-design',
          tone: 'default',
          body: 'Common price points range from $300 to $800 per room. Lower than in-person design because there is no travel and the deliverable is a document, not a managed installation.',
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Enable the E-Design section',
          tone: 'caution',
          body: 'The site has an E-Design module ready to activate. Go to Site Settings, find Section Visibility, and turn on the E-Design toggle.',
        },
      ],
    },
    {
      _type: 'playbookGuide',
      _key: key(),
      title: 'Get Set Up with Trade Sourcing',
      summary: 'A step-by-step checklist for getting your business set up to buy at trade pricing and manage client orders.',
      sections: [
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Legal and business setup',
          tone: 'default',
          body: 'Before applying to trade programs, make sure these are in place.',
          bullets: [
            'Business entity formed (LLC or sole prop)',
            'EIN (Employer Identification Number) from the IRS',
            'Business checking account',
            'Resale certificate from your state (for sales tax exemption)',
            'Business email address (not Gmail)',
          ],
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Client billing for products',
          tone: 'default',
          body: 'Decide how you will handle client billing before your first sourced project. Common approaches: invoice clients at retail and keep the trade discount as margin, or invoice at trade plus a procurement fee (typically 15 to 25 percent).',
        },
        {
          _type: 'playbookSection',
          _key: key(),
          heading: 'Track every order',
          tone: 'caution',
          body: 'Keep a simple spreadsheet for each project with every item ordered: vendor, order number, expected delivery date, and client price. Lead times slip. You need to be the one who catches it first.',
        },
      ],
    },
  ],
});

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

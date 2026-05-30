// Seeder for the conversion-build placeholder content.
// Populates the new page singletons and collection docs introduced in the
// conversion build so /quiz, /calculator, /e-design, /shop, /gift-certificates,
// /resources, /press, /privacy, and /guides can be visually QA'd with real data.
//
// Design principle:
//   - Idempotent: uses createOrReplace (with deterministic _ids) for new docs.
//   - Non-destructive on existing singletons: patches siteSettings and contactPage
//     by adding only the new fields; does NOT createOrReplace those docs (that
//     would wipe Staci's existing copy).
//   - Collection docs use "seed." prefix so they're easy to find and delete later.
//
// Run with: node scripts/seed-conversion-content.mjs
// Re-running is safe and idempotent.

import { createClient } from '@sanity/client';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env from repo root
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: resolve(root, '.env') });

const {
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_API_VERSION,
  SANITY_API_WRITE_TOKEN,
} = process.env;

if (!PUBLIC_SANITY_PROJECT_ID || !SANITY_API_WRITE_TOKEN) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({
  projectId: PUBLIC_SANITY_PROJECT_ID,
  dataset: PUBLIC_SANITY_DATASET || 'production',
  apiVersion: PUBLIC_SANITY_API_VERSION || '2026-05-01',
  token: SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

// Build a simple Portable Text block with one span.
function ptBlock(key, text, style = 'normal') {
  return {
    _type: 'block',
    _key: key,
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}s`, text }],
  };
}

// Build a Portable Text heading block.
function ptHeading(key, text, level = 'h2') {
  return {
    _type: 'block',
    _key: key,
    style: level,
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}s`, text }],
  };
}

// Build a Sanity image reference object.
function img(refId, alt) {
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: refId },
    alt,
  };
}

// Image asset refs provided in the brief.
const ASSETS = {
  // Landscape
  ls1: 'image-00137c5be1c9de3394b36a17177d100796bcb7cf-1259x794-jpg',
  ls2: 'image-057d1bcbd355144715807d6bcd7e268c542aae74-1260x941-jpg',
  ls3: 'image-069e779d2060fa959439ea4a573ab9bb41e3c12f-1260x799-jpg',
  // Portrait
  pt1: 'image-0934189a445f4e335fee15c03d51d4dd1ae65a96-3024x4032-jpg', // kitchen
  pt2: 'image-019903c2c9f691869cbb700e86be9aa26c718650-3024x4032-jpg', // bedroom
  pt3: 'image-01c11fec8b19cbb32cb1bc2e062bd43d937117fc-3024x4032-jpg', // hallway
  // Staci portraits
  sp1: 'image-03166cd41067ceebfa9e5027ee7ba42e01beeba9-4284x5712-jpg',
  sp2: 'image-03204ac28765ca0f1dacb9d7f86eca31d7cf2e4c-4284x5712-jpg',
};

// ── 1. PATCH siteSettings (add new fields only) ───────────────────────────────

async function patchSiteSettings() {
  console.log('Patching siteSettings...');
  await client
    .patch('siteSettings')
    .set({
      newsletter: {
        enabled: true,
        providerLabel: 'MailerLite',
        formActionUrl: '',
        heading: 'Stay in touch.',
        blurb:
          'Occasional notes on Indiana projects, paint colors worth stealing, and when I open new project slots. No spam, ever.',
        buttonLabel: 'Subscribe',
        successMessage: "You're in. Talk soon.",
        consentNote:
          'By subscribing you agree to our privacy policy. Unsubscribe anytime.',
      },
      googleBusinessUrl: 'https://g.page/reid-design-llc',
      reviewsNote: 'Real words from real Reid Design clients.',
      satisfactionGuarantee:
        'If something in the plan is not landing, we keep refining within the agreed scope until it feels right. You are never stuck with a room you do not love.',
    })
    .commit();
  console.log('  siteSettings patched.');
}

// ── 2. PATCH contactPage (add postInquiryRoadmap) ─────────────────────────────

async function patchContactPage() {
  console.log('Patching contactPage...');
  await client
    .patch('contactPage')
    .set({
      postInquiryRoadmap: [
        {
          _key: 'road1',
          title: 'I read it myself',
          body: 'Your note comes straight to me, not a team or an inbox bot. I read every one.',
          timeEstimate: 'Within a day',
        },
        {
          _key: 'road2',
          title: 'A quick reply',
          body: 'I email back with a couple of questions and which service fits what you are after.',
          timeEstimate: '1 to 2 days',
        },
        {
          _key: 'road3',
          title: 'We book the consultation',
          body: 'We pick a time for the in-home visit, or a short call first if you would rather.',
          timeEstimate: '',
        },
        {
          _key: 'road4',
          title: 'You leave with a plan',
          body: 'Clear next steps and honest pricing. No pressure to keep going.',
          timeEstimate: '',
        },
      ],
    })
    .commit();
  console.log('  contactPage patched.');
}

// ── 3. leadMagnet docs (2) ────────────────────────────────────────────────────

const leadMagnets = [
  {
    _type: 'leadMagnet',
    _id: 'seed.leadMagnet.consultPrep',
    title: 'How to Get the Most From a $150 Consultation',
    slug: { _type: 'slug', current: 'how-to-get-the-most-from-a-150-consultation' },
    summary:
      'Before your first visit, there are a few things you can do to make the hour count. This guide covers what to pull together, what questions to bring, and how to walk out with a plan you can actually act on.',
    coverImage: {
      ...img(ASSETS.sp1, 'Staci Perkins, Reid Design LLC interior designer'),
      _key: 'lm1cover',
    },
    gateHeading: 'Get the free guide.',
    gateBlurb:
      'Enter your email and I will send it right over. No sales sequence, just the guide.',
    buttonLabel: 'Send me the guide',
    successMessage: "You're in. Your download link is just below.",
    espTag: 'guide-consult-prep',
    published: true,
    displayOrder: 1,
    orderRank: 'a',
  },
  {
    _type: 'leadMagnet',
    _id: 'seed.leadMagnet.paint',
    title: '5 Paint Colors I Come Back To',
    slug: { _type: 'slug', current: '5-paint-colors-i-come-back-to' },
    summary:
      'There are maybe thirty paint colors I have used more than once. These five show up in project after project because they work across light conditions, room sizes, and furniture tones. No trendy picks, just the ones that hold up.',
    coverImage: {
      ...img(ASSETS.ls2, 'Warm neutral living room palette, Reid Design project'),
      _key: 'lm2cover',
    },
    gateHeading: 'Get the paint guide.',
    gateBlurb:
      'Drop your email and I will send you the five colors, with notes on where each one works best.',
    buttonLabel: 'Send me the colors',
    successMessage: "Got it. The guide is right below.",
    espTag: 'guide-paint-colors',
    published: true,
    displayOrder: 2,
    orderRank: 'b',
  },
];

// ── 4. styleQuiz singleton ────────────────────────────────────────────────────

const styleQuiz = {
  _type: 'styleQuiz',
  _id: 'styleQuiz',
  introEyebrow: 'Find your style.',
  introHeadline: 'What is your design style?',
  introSubhead:
    'A few quick questions. No right answers, just your taste. I will show you the look that fits and where to start.',

  questions: [
    {
      _key: 'q1',
      prompt: 'When you walk into a room, what catches your eye first?',
      helpText: 'Go with your gut.',
      answers: [
        {
          _key: 'q1a1',
          label: 'Clean lines and breathing room',
          image: { ...img(ASSETS.ls1, 'Modern living room with clean lines and open space'), _key: 'q1a1img' },
          archetypeWeights: [
            { _key: 'q1a1w1', archetypeSlug: 'modern-organic', weight: 3 },
            { _key: 'q1a1w2', archetypeSlug: 'classic-transitional', weight: 1 },
          ],
        },
        {
          _key: 'q1a2',
          label: 'Layered fabrics and warm texture',
          image: { ...img(ASSETS.pt2, 'Cozy bedroom with layered textiles and warm tones'), _key: 'q1a2img' },
          archetypeWeights: [
            { _key: 'q1a2w1', archetypeSlug: 'cozy-farmhouse', weight: 3 },
            { _key: 'q1a2w2', archetypeSlug: 'classic-transitional', weight: 1 },
          ],
        },
        {
          _key: 'q1a3',
          label: 'A balanced mix of old and new',
          image: { ...img(ASSETS.ls2, 'Transitional living room blending classic and modern'), _key: 'q1a3img' },
          archetypeWeights: [
            { _key: 'q1a3w1', archetypeSlug: 'classic-transitional', weight: 3 },
            { _key: 'q1a3w2', archetypeSlug: 'modern-organic', weight: 1 },
          ],
        },
      ],
    },
    {
      _key: 'q2',
      prompt: 'How do you want your home to feel?',
      helpText: 'Think about how you want to feel when you walk through the door after a long day.',
      answers: [
        {
          _key: 'q2a1',
          label: 'Calm and collected',
          image: { ...img(ASSETS.ls3, 'Calm neutral bedroom with minimal styling'), _key: 'q2a1img' },
          archetypeWeights: [
            { _key: 'q2a1w1', archetypeSlug: 'modern-organic', weight: 3 },
            { _key: 'q2a1w2', archetypeSlug: 'classic-transitional', weight: 1 },
          ],
        },
        {
          _key: 'q2a2',
          label: 'Warm and welcoming',
          image: { ...img(ASSETS.pt1, 'Warm kitchen with inviting textures'), _key: 'q2a2img' },
          archetypeWeights: [
            { _key: 'q2a2w1', archetypeSlug: 'cozy-farmhouse', weight: 3 },
            { _key: 'q2a2w2', archetypeSlug: 'classic-transitional', weight: 2 },
          ],
        },
        {
          _key: 'q2a3',
          label: 'Polished but liveable',
          image: { ...img(ASSETS.ls1, 'Polished transitional living room'), _key: 'q2a3img' },
          archetypeWeights: [
            { _key: 'q2a3w1', archetypeSlug: 'classic-transitional', weight: 3 },
            { _key: 'q2a3w2', archetypeSlug: 'modern-organic', weight: 1 },
          ],
        },
      ],
    },
    {
      _key: 'q3',
      prompt: 'Which pattern or material calls to you?',
      answers: [
        {
          _key: 'q3a1',
          label: 'Natural linen, rattan, and stone',
          image: { ...img(ASSETS.ls2, 'Natural materials: linen, rattan, and stone textures'), _key: 'q3a1img' },
          archetypeWeights: [
            { _key: 'q3a1w1', archetypeSlug: 'modern-organic', weight: 3 },
            { _key: 'q3a1w2', archetypeSlug: 'cozy-farmhouse', weight: 1 },
          ],
        },
        {
          _key: 'q3a2',
          label: 'Wood tones, cotton, and warm metals',
          image: { ...img(ASSETS.pt2, 'Warm wood, cotton, and brass accent bedroom'), _key: 'q3a2img' },
          archetypeWeights: [
            { _key: 'q3a2w1', archetypeSlug: 'cozy-farmhouse', weight: 3 },
            { _key: 'q3a2w2', archetypeSlug: 'classic-transitional', weight: 1 },
          ],
        },
        {
          _key: 'q3a3',
          label: 'Subtle pattern, velvet, and brushed nickel',
          image: { ...img(ASSETS.ls3, 'Classic transitional hallway with subtle pattern'), _key: 'q3a3img' },
          archetypeWeights: [
            { _key: 'q3a3w1', archetypeSlug: 'classic-transitional', weight: 3 },
            { _key: 'q3a3w2', archetypeSlug: 'modern-organic', weight: 1 },
          ],
        },
      ],
    },
    {
      _key: 'q4',
      prompt: 'Pick the room you would actually spend time in.',
      answers: [
        {
          _key: 'q4a1',
          label: 'Open, airy, a few perfect things',
          image: { ...img(ASSETS.ls1, 'Airy open living room, minimal but warm'), _key: 'q4a1img' },
          archetypeWeights: [
            { _key: 'q4a1w1', archetypeSlug: 'modern-organic', weight: 3 },
          ],
        },
        {
          _key: 'q4a2',
          label: 'Layered, cozy, feels lived in',
          image: { ...img(ASSETS.pt1, 'Cozy layered kitchen, farmhouse style'), _key: 'q4a2img' },
          archetypeWeights: [
            { _key: 'q4a2w1', archetypeSlug: 'cozy-farmhouse', weight: 3 },
          ],
        },
        {
          _key: 'q4a3',
          label: 'Elegant but still comfortable',
          image: { ...img(ASSETS.pt3, 'Classic transitional hallway with elegant trim'), _key: 'q4a3img' },
          archetypeWeights: [
            { _key: 'q4a3w1', archetypeSlug: 'classic-transitional', weight: 3 },
          ],
        },
      ],
    },
  ],

  qualifiers: [
    {
      _key: 'ql1',
      prompt: 'Roughly what is your furnishing budget for this room?',
      type: 'budget',
      options: [
        { _key: 'ql1o1', label: 'Under $1,000', value: 'under-1k' },
        { _key: 'ql1o2', label: '$1,000 to $5,000', value: '1k-5k' },
        { _key: 'ql1o3', label: '$5,000 and up', value: '5k-plus' },
        { _key: 'ql1o4', label: 'Just exploring', value: 'exploring' },
      ],
    },
    {
      _key: 'ql2',
      prompt: 'When are you hoping to get started?',
      type: 'timeline',
      options: [
        { _key: 'ql2o1', label: 'Ready now', value: 'ready-now' },
        { _key: 'ql2o2', label: 'In a few months', value: 'few-months' },
        { _key: 'ql2o3', label: 'Someday', value: 'someday' },
      ],
    },
  ],

  archetypes: [
    {
      _key: 'arch1',
      name: 'Modern Organic',
      slug: { _type: 'slug', current: 'modern-organic' },
      description: [
        ptBlock('arch1d1', 'You are drawn to calm spaces with natural materials and just enough breathing room. Linen, rattan, stone, and warm neutrals are your language. The room looks like it came together on its own, but every piece was chosen on purpose.'),
        ptBlock('arch1d2', 'Full Room Design is usually the right starting point. We will build a palette, source the anchor pieces, and make sure the whole thing lands the way you are picturing it.'),
      ],
      images: [
        { ...img(ASSETS.ls1, 'Modern organic living room with natural materials'), _key: 'arch1img1' },
        { ...img(ASSETS.ls3, 'Clean neutral bedroom in modern organic style'), _key: 'arch1img2' },
      ],
      recommendedServiceRef: { _type: 'reference', _ref: 'service.fullRoomDesign' },
      resultCtaLabel: 'See how we would start',
    },
    {
      _key: 'arch2',
      name: 'Classic Transitional',
      slug: { _type: 'slug', current: 'classic-transitional' },
      description: [
        ptBlock('arch2d1', 'You want a room that feels polished without feeling fussy. Traditional proportions, updated fabrics, a mix of old finds and new pieces. Your house should look like you have good taste, not like a showroom.'),
        ptBlock('arch2d2', 'Full Room Design gets you there. We will balance what you already have with what the room needs, and you will end up with a space that is genuinely yours.'),
      ],
      images: [
        { ...img(ASSETS.ls2, 'Classic transitional living room with layered accents'), _key: 'arch2img1' },
        { ...img(ASSETS.pt3, 'Transitional hallway with classic trim details'), _key: 'arch2img2' },
      ],
      recommendedServiceRef: { _type: 'reference', _ref: 'service.fullRoomDesign' },
      resultCtaLabel: 'See how we would start',
    },
    {
      _key: 'arch3',
      name: 'Cozy Farmhouse',
      slug: { _type: 'slug', current: 'cozy-farmhouse' },
      description: [
        ptBlock('arch3d1', 'Warm wood, cotton, shiplap, and a kitchen that smells like something good is always cooking. You want your home to feel genuinely welcoming, not decorated for Instagram.'),
        ptBlock('arch3d2', 'A Full Room Design session will help you get the layers right. There is a real skill to making cozy not feel cluttered, and we are good at it.'),
      ],
      images: [
        { ...img(ASSETS.pt1, 'Cozy farmhouse kitchen with warm wood tones'), _key: 'arch3img1' },
        { ...img(ASSETS.pt2, 'Cozy farmhouse bedroom with layered textiles'), _key: 'arch3img2' },
      ],
      recommendedServiceRef: { _type: 'reference', _ref: 'service.fullRoomDesign' },
      resultCtaLabel: 'See how we would start',
    },
  ],

  gate: {
    mode: 'optional',
    heading: 'Want your result plus a starting plan?',
    blurb:
      'Drop your email and I will send your style result with a few first steps.',
    consentNote:
      'By sharing your email you agree to our privacy policy.',
    espTag: 'style-quiz',
  },

  routing: {
    highIntentRule: 'ready-now,few-months',
    bookCtaLabel: 'Book a $150 consultation',
    guideCtaLabel: 'Get the free starter guide',
    guideRef: { _type: 'reference', _ref: 'seed.leadMagnet.consultPrep' },
  },
};

// ── 5. budgetCalculator singleton ─────────────────────────────────────────────

const budgetCalculator = {
  _type: 'budgetCalculator',
  _id: 'budgetCalculator',
  introEyebrow: 'What will it cost?',
  introHeadline: 'Budget Calculator',
  introSubhead:
    'A rough range for furnishing a room, based on real Reid Design projects. Not a quote, just a starting point.',

  rooms: [
    { _key: 'rm1', label: 'Living room', baseLow: 2500, baseHigh: 8000 },
    { _key: 'rm2', label: 'Primary bedroom', baseLow: 2000, baseHigh: 6000 },
    { _key: 'rm3', label: 'Dining room', baseLow: 1800, baseHigh: 5500 },
    { _key: 'rm4', label: 'Home office', baseLow: 1500, baseHigh: 4500 },
    { _key: 'rm5', label: 'Kids room or nursery', baseLow: 1500, baseHigh: 4000 },
  ],

  scopeOptions: [
    { _key: 'sc1', label: 'Refresh what I have', addLow: 0, addHigh: 600 },
    { _key: 'sc2', label: 'Some new pieces', addLow: 1000, addHigh: 3000 },
    { _key: 'sc3', label: 'Mostly new', addLow: 3000, addHigh: 8000 },
  ],

  addOns: [
    { _key: 'ao1', label: 'Window treatments', low: 300, high: 1500 },
    { _key: 'ao2', label: 'New lighting', low: 200, high: 1200 },
    { _key: 'ao3', label: 'Rug', low: 300, high: 1500 },
    { _key: 'ao4', label: 'Hands-on styling day', low: 300, high: 600 },
  ],

  resultCopy:
    'Most rooms like this land in this range once everything is in. That covers furniture, decor, and styling, not my design fee.',
  disclaimer:
    'This is a ballpark from past projects, not a quote. Every room is different and we will talk real numbers at your consultation.',
  ctaLabel: 'Book a $150 consultation',
  consultPriceNote:
    'My design work starts at $150 for an in-home consultation and $650 for a full room plan. The range above is your furnishing budget.',
};

// ── 6. eDesignPage singleton ──────────────────────────────────────────────────

const eDesignPage = {
  _type: 'eDesignPage',
  _id: 'eDesignPage',
  heroEyebrow: 'Design from anywhere.',
  heroHeadline: 'E-Design',
  heroSubhead:
    'A full room plan delivered online. For Indiana homeowners outside my drive radius, or anyone who likes to shop at their own pace.',
  heroImage: { ...img(ASSETS.ls1, 'Bright living room, Reid Design E-Design project'), _key: 'edHeroImg' },

  intro: [
    ptBlock(
      'ed-intro1',
      'E-Design is the same process I use for in-home clients, just delivered digitally. You send me photos and measurements, we have a short conversation about how the room needs to work, and I send back a complete plan with a mood board, layout, paint direction, and a clickable shopping list. You shop the links at your pace.',
    ),
  ],

  howItWorks: [
    {
      _key: 'edhiw1',
      stepNumber: 1,
      title: 'Share photos and measurements',
      body: 'A few phone photos and rough measurements are enough to start. I will tell you exactly what I need.',
    },
    {
      _key: 'edhiw2',
      stepNumber: 2,
      title: 'We talk through how the room needs to work',
      body: 'A short video call so I understand how you live in the space, what is not working, and what kind of look you are after.',
    },
    {
      _key: 'edhiw3',
      stepNumber: 3,
      title: 'I build your plan and shopping list',
      body: 'A full design plan with mood board, 2D layout, paint direction, and clickable shopping links lands in your inbox.',
    },
    {
      _key: 'edhiw4',
      stepNumber: 4,
      title: 'You shop the links at your own pace',
      body: 'No install appointment, no timeline pressure. Buy as you go, in whatever order works for your budget.',
    },
  ],

  whatsIncluded: [
    'Mood board',
    'Furniture layout (2D)',
    'Paint direction',
    'Clickable shopping list with direct links',
    'One round of revisions',
  ],

  tiers: [
    {
      _key: 'edt1',
      name: 'Single Room E-Design',
      price: '$425',
      priceNumeric: 425,
      features: [
        'Mood board',
        'Furniture layout',
        'Paint direction',
        'Shopping list with clickable links',
        'One round of revisions',
      ],
      bestFor: 'One room, start to finish, on your schedule.',
      ctaLabel: 'Start my E-Design',
    },
    {
      _key: 'edt2',
      name: 'Refresh Board',
      price: '$250',
      priceNumeric: 250,
      features: [
        'Mood board with 6 to 8 product picks',
        'Shopping list with clickable links',
        'Paint direction',
      ],
      bestFor: 'A mood board and shopping list to point you in the right direction.',
      ctaLabel: 'Start my Refresh Board',
    },
  ],

  faqRefs: [
    { _type: 'reference', _ref: 'faqItem.dontLikePlan', _key: 'edfaq1' },
    { _type: 'reference', _ref: 'faqItem.allNewFurniture', _key: 'edfaq2' },
  ],

  finalCtaEyebrow: 'Ready to start?',
  finalCtaHeadline: 'Let\'s get your room on paper.',
  finalCtaSubhead: 'Tell me about the room and I will follow up with what we need to get started.',
  finalCta: {
    _type: 'ctaBlock',
    label: 'Start my E-Design',
    linkType: 'internal',
    internalPage: '/contact?type=e-design',
  },
};

// ── 7. shopCollections (2) ────────────────────────────────────────────────────

const shopCollections = [
  {
    _type: 'shopCollection',
    _id: 'seed.shopCollection.lighting',
    title: 'Lighting I reach for',
    slug: { _type: 'slug', current: 'lighting-i-reach-for' },
    blurb:
      'These are the fixtures I keep coming back to. They work in a lot of rooms and they hold up over time.',
    orderRank: 'a',
  },
  {
    _type: 'shopCollection',
    _id: 'seed.shopCollection.rugs',
    title: 'Rugs that hide real life',
    slug: { _type: 'slug', current: 'rugs-that-hide-real-life' },
    blurb:
      'Performance fibers, forgiving patterns, and enough substance to anchor a seating group.',
    orderRank: 'b',
  },
];

// ── 8. shopItems (5) ──────────────────────────────────────────────────────────

const shopItems = [
  {
    _type: 'shopItem',
    _id: 'seed.shopItem.1',
    title: 'Rejuvenation Vernon Pendant',
    image: { ...img(ASSETS.ls1, 'Rejuvenation Vernon pendant light in brass'), _key: 'si1img' },
    vendor: 'Rejuvenation',
    affiliateUrl: 'https://www.rejuvenation.com',
    note: 'One of the most versatile pendants I know. Works over an island, a dining table, or a nightstand on a long cord.',
    collection: { _type: 'reference', _ref: 'seed.shopCollection.lighting' },
    orderRank: 'a',
  },
  {
    _type: 'shopItem',
    _id: 'seed.shopItem.2',
    title: 'Wayfair Brentwood Table Lamp',
    image: { ...img(ASSETS.ls2, 'Warm table lamp with linen shade'), _key: 'si2img' },
    vendor: 'Wayfair',
    affiliateUrl: 'https://www.wayfair.com',
    note: 'The linen shade is the right warmth for almost any room. Solid base, good price for what you get.',
    collection: { _type: 'reference', _ref: 'seed.shopCollection.lighting' },
    orderRank: 'b',
  },
  {
    _type: 'shopItem',
    _id: 'seed.shopItem.3',
    title: 'Amazon Basics LED A19 Warm White Bulbs',
    image: { ...img(ASSETS.ls3, 'Warm white LED light bulbs'), _key: 'si3img' },
    vendor: 'Amazon',
    affiliateUrl: 'https://www.amazon.com',
    note: 'Sounds boring, but the wrong bulb ruins a beautiful fixture. These are the right warmth for living spaces.',
    collection: { _type: 'reference', _ref: 'seed.shopCollection.lighting' },
    orderRank: 'c',
  },
  {
    _type: 'shopItem',
    _id: 'seed.shopItem.4',
    title: 'Ruggable Vintage Patchwork Rug, 8x10',
    image: { ...img(ASSETS.pt1, 'Vintage style washable area rug in warm tones'), _key: 'si4img' },
    vendor: 'Ruggable',
    affiliateUrl: 'https://www.ruggable.com',
    note: 'Machine washable, looks like a real rug, holds up to kids and dogs. I put this in more homes than I can count.',
    collection: { _type: 'reference', _ref: 'seed.shopCollection.rugs' },
    orderRank: 'a',
  },
  {
    _type: 'shopItem',
    _id: 'seed.shopItem.5',
    title: 'West Elm Heathered Basketweave Rug',
    image: { ...img(ASSETS.pt2, 'Heathered basketweave area rug in neutral tones'), _key: 'si5img' },
    vendor: 'West Elm',
    affiliateUrl: 'https://www.westelm.com',
    note: 'The texture does a lot of work in a room. Soft enough underfoot, hides dirt well enough for a family space.',
    collection: { _type: 'reference', _ref: 'seed.shopCollection.rugs' },
    orderRank: 'b',
  },
];

// ── 9. shopPage singleton ─────────────────────────────────────────────────────

const shopPage = {
  _type: 'shopPage',
  _id: 'shopPage',
  heroEyebrow: 'Reid Design picks.',
  heroHeadline: 'Shop my favorites.',
  heroImage: { ...img(ASSETS.ls2, 'Styled living room with Reid Design furniture picks'), _key: 'spHeroImg' },
  enabled: true,
  intro:
    'These are the pieces I actually specify and recommend. Good quality at a range of price points, pieces I would put in my own home.',
  disclosure:
    'Some links below are affiliate links. If you buy through them I may earn a small commission at no extra cost to you. I only share pieces I would actually put in a client\'s home.',
  collections: [
    { _type: 'reference', _ref: 'seed.shopCollection.lighting', _key: 'spc1' },
    { _type: 'reference', _ref: 'seed.shopCollection.rugs', _key: 'spc2' },
  ],
};

// ── 10. giftPage singleton ────────────────────────────────────────────────────

const giftPage = {
  _type: 'giftPage',
  _id: 'giftPage',
  heroEyebrow: 'Give something useful.',
  heroHeadline: 'Give a room they will love.',
  heroSubhead: 'A Reid Design gift certificate is a real design service, not a gift card for a store.',
  heroImage: { ...img(ASSETS.sp2, 'Staci Perkins, Reid Design LLC'), _key: 'gpHeroImg' },
  intro:
    'If you know someone who has been putting off a room project, a gift certificate gives them a concrete first step. They book when they are ready, I do the rest.',
  options: [
    {
      _key: 'gopt1',
      label: '$150 In-home consultation',
      amount: '$150',
      blurb:
        'An hour and a half in their home, a clear action plan, and honest advice on where to start.',
    },
    {
      _key: 'gopt2',
      label: '$650 Full room design',
      amount: '$650',
      blurb:
        'A complete room design plan: mood board, layout, sourcing list, and a follow-up call.',
    },
    {
      _key: 'gopt3',
      label: 'Custom amount',
      amount: 'Custom amount',
      blurb:
        'Not sure which service fits? I can help you figure it out. Reach out and we will sort it.',
    },
  ],
  howItWorks: [
    {
      _key: 'gstep1',
      stepNumber: 1,
      title: 'Tell me who it is for',
      body: 'Send a quick note with the recipient\'s name and which service or amount you want to give. I will handle the rest.',
    },
    {
      _key: 'gstep2',
      stepNumber: 2,
      title: 'I send a certificate',
      body: 'A personalized gift certificate goes to you or directly to the recipient, whichever you prefer.',
    },
    {
      _key: 'gstep3',
      stepNumber: 3,
      title: 'They book when they are ready',
      body: 'No expiry pressure. They reach out, we find a time, and the consultation or design project begins.',
    },
  ],
  finePrint:
    'Gift certificates do not expire and can go toward any service. Non-refundable after delivery.',
  ctaLabel: 'Request a gift certificate',
};

// ── 11. resourcesPage singleton ───────────────────────────────────────────────

const resourcesPage = {
  _type: 'resourcesPage',
  _id: 'resourcesPage',
  heroEyebrow: 'Free tools and guides.',
  heroHeadline: 'Free tools and guides.',
  heroSubhead: 'Everything here is free and actually useful. No email required to browse.',
  intro:
    'A few tools I put together to help you think through a project before we talk, or just to get your bearings.',
  cards: [
    {
      _key: 'rc1',
      title: 'Style Quiz',
      blurb: 'Four quick questions, no right answers. Find out which design archetype fits you.',
      link: '/quiz',
    },
    {
      _key: 'rc2',
      title: 'Budget Calculator',
      blurb:
        'A rough furnishing range based on real Reid Design projects. Good for planning conversations with partners.',
      link: '/calculator',
    },
    {
      _key: 'rc3',
      title: 'Free Guides',
      blurb: 'Short, practical guides on consultations, paint colors, and getting started.',
      link: '/guides',
    },
    {
      _key: 'rc4',
      title: 'Common Questions',
      blurb: 'Honest answers to the questions I hear most, including the uncomfortable ones about money.',
      link: '/faq',
    },
    {
      _key: 'rc5',
      title: 'The Journal',
      blurb: 'Notes on Indiana projects, design decisions, and things I find worth sharing.',
      link: '/journal',
    },
  ],
};

// ── 12. privacyPage singleton ─────────────────────────────────────────────────

const privacyPage = {
  _type: 'privacyPage',
  _id: 'privacyPage',
  heroEyebrow: 'Reid Design LLC.',
  heroHeadline: 'Privacy Policy',
  heroSubhead: 'Plain language. No legalese.',
  lastUpdated: '2026-05-28',
  body: [
    ptHeading('pp-h1', 'What I collect', 'h2'),
    ptBlock(
      'pp-p1',
      'When you fill out the contact form, the style quiz, or the newsletter signup, you share your name and email address. That information comes to me and to the email service I use to send occasional notes (currently MailerLite). I do not collect anything beyond what you type into those forms.',
    ),
    ptHeading('pp-h2', 'What I do with it', 'h2'),
    ptBlock(
      'pp-p2',
      'Your contact form submission goes to my inbox so I can reply to you. If you subscribe to the newsletter, your email is added to my MailerLite list and I will send you occasional notes about Indiana projects, paint colors, and when I open new project slots. That is it.',
    ),
    ptHeading('pp-h3', 'What I do not do', 'h2'),
    ptBlock(
      'pp-p3',
      'I do not sell your information, share it with third parties outside my email service, or run ad retargeting of any kind. There is no Google Analytics, no Facebook Pixel, no LinkedIn tag. Cloudflare Web Analytics provides basic traffic numbers without cookies or personal data.',
    ),
    ptHeading('pp-h4', 'Unsubscribe and data requests', 'h2'),
    ptBlock(
      'pp-p4',
      'Every newsletter email has an unsubscribe link at the bottom. Click it and you are off the list immediately. If you want me to delete any information you have shared, email me at owner@example.com and I will take care of it.',
    ),
  ],
};

// ── 13. pressPage singleton ───────────────────────────────────────────────────

const pressPage = {
  _type: 'pressPage',
  _id: 'pressPage',
  heroEyebrow: 'Reid Design in the news.',
  heroHeadline: 'Around Indy.',
  heroSubhead: 'A few places Reid Design has shown up.',
  intro:
    'Occasional features and mentions from Indiana publications. If you are writing about interior design in the Indianapolis area, get in touch.',
};

// ── 14. pressItems (3) ───────────────────────────────────────────────────────

const pressItems = [
  {
    _type: 'pressItem',
    _id: 'seed.pressItem.1',
    outlet: 'Indianapolis Monthly',
    quote:
      '"Staci Perkins brings a grounded, practical sensibility to interior design that feels right for the way Hoosiers actually live."',
    url: 'https://www.indianapolismonthly.com',
    date: '2025-09-01',
    orderRank: 'a',
  },
  {
    _type: 'pressItem',
    _id: 'seed.pressItem.2',
    outlet: 'Hendricks County Living',
    quote:
      '"Reid Design has become the go-to studio for Plainfield and the western suburbs, known for rooms that look like they arrived fully formed."',
    url: 'https://www.hendrickscountyliving.com',
    date: '2025-04-15',
    orderRank: 'b',
  },
  {
    _type: 'pressItem',
    _id: 'seed.pressItem.3',
    outlet: 'Plainfield Town Press',
    quote:
      '"Local designer Staci Perkins of Reid Design is redefining what a $150 investment in professional advice can do for an Indiana home."',
    url: 'https://www.plainfieldtownpress.com',
    date: '2025-02-20',
    orderRank: 'c',
  },
];

// ── 15. PATCH 2 testimonials with sourceType ──────────────────────────────────

async function patchTestimonials() {
  console.log('Patching 2 testimonials with sourceType: Google...');
  const ids = ['testimonial.alisaPorter', 'testimonial.brandiWigginsHlebak'];
  for (const id of ids) {
    await client.patch(id).set({ sourceType: 'Google' }).commit();
    console.log(`  patched ${id}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding conversion-build placeholder content`);
  console.log(`Project: ${PUBLIC_SANITY_PROJECT_ID}, Dataset: ${PUBLIC_SANITY_DATASET || 'production'}\n`);

  // 1. Patch existing singletons (never createOrReplace — that wipes fields)
  await patchSiteSettings();
  await patchContactPage();
  await patchTestimonials();

  // 2. Collections that singletons reference must exist first
  const collections = [...leadMagnets, ...shopCollections, ...shopItems, ...pressItems];
  console.log(`\nCreating/replacing ${collections.length} collection docs (must exist before singletons that reference them)...`);
  for (const doc of collections) {
    await client.createOrReplace(doc);
    console.log(`  ${doc._id}`);
  }

  // 3. Singleton pages via createOrReplace (after collections they may reference)
  const singletons = [styleQuiz, budgetCalculator, eDesignPage, shopPage, giftPage, resourcesPage, privacyPage, pressPage];
  for (const doc of singletons) {
    console.log(`createOrReplace ${doc._type} (${doc._id})...`);
    await client.createOrReplace(doc);
    console.log(`  done.`);
  }

  console.log('\nAll documents written. Running verification query...\n');

  // ── Verification query ────────────────────────────────────────────────────
  const counts = await client.fetch(`{
    "styleQuiz": count(*[_type == "styleQuiz"]),
    "budgetCalculator": count(*[_type == "budgetCalculator"]),
    "eDesignPage": count(*[_type == "eDesignPage"]),
    "shopPage": count(*[_type == "shopPage"]),
    "giftPage": count(*[_type == "giftPage"]),
    "resourcesPage": count(*[_type == "resourcesPage"]),
    "privacyPage": count(*[_type == "privacyPage"]),
    "pressPage": count(*[_type == "pressPage"]),
    "shopCollection": count(*[_type == "shopCollection" && _id match "seed.*"]),
    "shopItem": count(*[_type == "shopItem" && _id match "seed.*"]),
    "pressItem": count(*[_type == "pressItem" && _id match "seed.*"]),
    "leadMagnet": count(*[_type == "leadMagnet" && _id match "seed.*"]),
    "newsletterEnabled": *[_type == "siteSettings"][0].newsletter.enabled,
    "postInquirySteps": count(*[_type == "contactPage"][0].postInquiryRoadmap),
    "testimonialsWithGoogleSource": count(*[_type == "testimonial" && sourceType == "Google"])
  }`);

  console.log('── Verification ─────────────────────────────────────────────');
  for (const [key, val] of Object.entries(counts)) {
    console.log(`  ${key}: ${val}`);
  }
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

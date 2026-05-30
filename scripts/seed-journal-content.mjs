// One-shot seeder for the Journal feature.
//
// Creates:
//   - 5 journalCategory documents (the starting taxonomy: Project Stories,
//     Process, Style Notes, Behind the Scenes, Source Roundups)
//   - 1 journalPage singleton (hero copy + final CTA defaults)
//   - 1 journalEntry: a complete project walkthrough written as Staci that
//     demos most of the custom block types (lead, h2/h3, pull quote, lists,
//     tip callout, source cards, dividers, mark decorators including link
//     and highlight). Image-heavy blocks (inlineImage, beforeAfter, imageGallery)
//     are intentionally omitted because we don't have real photos yet —
//     Staci adds them via Studio when professional shots are delivered.
//
// Idempotent via --replace. Singletons here (journalPage) WILL be reset on
// re-run; don't re-run after Staci edits the journal index page copy.
//
// Run with: node scripts/seed-journal-content.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'tmp');
const outPath = resolve(outDir, 'journal-seed.ndjson');

// ---------------- Tiny Portable Text helpers ----------------
//
// Sanity Portable Text requires _key on every array member. We use short,
// human-readable keys so the seeded post is easy to inspect in Studio.

let keyCounter = 0;
const k = (prefix = 'k') => `${prefix}${++keyCounter}`;

/** A simple span with no marks. */
function span(text) {
  return { _type: 'span', _key: k('s'), text, marks: [] };
}
/** A span with one or more mark names (e.g., ['strong'], ['link-1']). */
function mspan(text, marks) {
  return { _type: 'span', _key: k('s'), text, marks };
}

/** A standard block — paragraph, heading, list item — with given style + children. */
function block(style, children, opts = {}) {
  return {
    _type: 'block',
    _key: k('b'),
    style,
    children,
    markDefs: opts.markDefs ?? [],
    ...(opts.listItem ? { listItem: opts.listItem, level: opts.level ?? 1 } : {}),
  };
}

/** Shortcut: paragraph from a single string. */
const p = (text) => block('normal', [span(text)]);
/** Shortcut: lead paragraph (large intro). */
const lead = (text) => block('lead', [span(text)]);
/** Shortcut: heading. */
const h2 = (text) => block('h2', [span(text)]);
const h3 = (text) => block('h3', [span(text)]);

/** Bullet list item. */
const li = (text) => block('normal', [span(text)], { listItem: 'bullet' });
/** Numbered list item with children (so the item can have bold lead-in). */
const ni = (children) => block('normal', children, { listItem: 'number' });

// ---------------- Categories ----------------

const categories = [
  {
    _type: 'journalCategory',
    _id: 'journalCategory.projectStories',
    title: 'Project Stories',
    slug: { _type: 'slug', current: 'project-stories' },
    description:
      'Full walkthroughs of completed projects — the brief, the choices, the dollars, the parts I would change.',
  },
  {
    _type: 'journalCategory',
    _id: 'journalCategory.process',
    title: 'Process',
    slug: { _type: 'slug', current: 'process' },
    description:
      'How interior design actually works in real homes. The questions I ask, the order I work in, the parts that surprise people.',
  },
  {
    _type: 'journalCategory',
    _id: 'journalCategory.styleNotes',
    title: 'Style Notes',
    slug: { _type: 'slug', current: 'style-notes' },
    description: 'Smaller thoughts on color, layout, lighting, layering, and the way rooms read.',
  },
  {
    _type: 'journalCategory',
    _id: 'journalCategory.behindTheScenes',
    title: 'Behind the Scenes',
    slug: { _type: 'slug', current: 'behind-the-scenes' },
    description: 'Studio notes, sourcing trips, install days, the mess before the reveal.',
  },
  {
    _type: 'journalCategory',
    _id: 'journalCategory.sourceRoundups',
    title: 'Source Roundups',
    slug: { _type: 'slug', current: 'source-roundups' },
    description: 'Where I actually source things — vendors, vintage spots, local makers, online finds.',
  },
];

// ---------------- journalPage singleton ----------------

const journalPage = {
  _type: 'journalPage',
  _id: 'journalPage',
  seoTitle: 'Journal · Reid Design',
  seoDescription:
    'Notes from a Plainfield interior designer — project walkthroughs, design thinking, and the occasional opinion.',
  heroEyebrow: 'The Journal.',
  heroHeadline: 'Notes from the studio.',
  heroSubhead:
    'Project walkthroughs, design thinking, and the occasional opinion. Written between projects.',
  finalCtaHeadline: 'Got a project of your own?',
  finalCtaSubhead:
    "Reid Design takes on a small handful of projects at a time. Tell me about your space and we'll see if it's a fit.",
  finalCta: {
    _type: 'ctaBlock',
    label: 'Start a Conversation',
    linkType: 'internal',
    internalLink: { _type: 'reference', _ref: 'contactPage' },
    openInNewTab: false,
  },
};

// ---------------- The example post ----------------
//
// "Inside a Plainfield Family Room" — a complete project walkthrough as Staci.
// Long-form, structurally rich, includes a pull quote, numbered process steps,
// a tip callout, three source cards, dividers, link + bold + italic + highlight
// marks. Written to feel like a real post, not a template.

const linkInline1 = {
  _type: 'link',
  _key: 'link-process',
  href: '/process',
  openInNewTab: false,
};
const linkInline2 = {
  _type: 'link',
  _key: 'link-contact',
  href: '/contact',
  openInNewTab: false,
};

const body = [
  // -- Lead ---------------------------------------------------------------
  lead(
    "Most of my favorite rooms didn't start with 'let's tear it down.' They started with 'let's move the sofa six feet.' This one is a sofa-six-feet story.",
  ),

  // -- Section: The room as it was ---------------------------------------
  h2('The room as it was'),
  p(
    'The family had a beautiful 16-by-18 living room with a gas fireplace, two long walls, and three windows looking out into their backyard. The previous arrangement: a 110-inch sectional pushed against the longest wall, a single armchair angled toward it, and a square coffee table you could not walk around. With five people in the family, every movie night ended with somebody sitting on the floor.',
  ),
  p(
    "Beautiful furniture, well-chosen pieces, perfectly fine room — and somehow nobody actually liked being in it. That's a story I hear a lot, and it almost never has anything to do with the furniture.",
  ),

  // -- Section: What they actually needed --------------------------------
  h2('What they actually needed (not what they thought they wanted)'),
  block('normal', [
    span('When we first walked through, the words I kept hearing were '),
    mspan('cozy', ['em']),
    span(' and '),
    mspan('intentional', ['em']),
    span(". But what they were "),
    mspan('doing', ['em']),
    span(' in that room every night was different than what they had told themselves they wanted. They were:'),
  ]),
  li('Watching movies on Friday nights, all five together'),
  li('Playing board games on the rug, with at least one kid on the floor'),
  li('Reading separately, usually two kids on a parent’s lap'),
  li('Hosting friends every other weekend, eight to twelve adults'),
  p(
    "That's four different rooms, basically. So we designed for the most demanding one (movie night with five) and let the others borrow the same furniture in different configurations. The room had to work the hardest on the night it mattered most, and gracefully relax on every other night.",
  ),

  // -- Pull quote --------------------------------------------------------
  {
    _type: 'pullQuote',
    _key: k('pq'),
    quote:
      'I had been telling people I wanted a beautiful room. What I actually wanted was a room that wasn’t a fight every night.',
    attribution: 'Maddie, the homeowner',
  },

  // -- Section: The plan -------------------------------------------------
  h2('The plan'),
  p('Five moves, in this order. Each one fixed a problem the previous one created.'),

  ni([
    mspan('Pull the sectional off the long wall. ', ['strong']),
    span(
      'Float it thirty-six inches in, anchored by a console behind it that catches keys, lamps, and a permanent stack of library books.',
    ),
  ]),
  ni([
    mspan('Replace the single armchair with a swivel pair. ', ['strong']),
    span(
      'Both face the sectional for movies, both pivot toward the windows for conversation, both face inward for board games. Three rooms, two chairs.',
    ),
  ]),
  ni([
    mspan('Build a reading nook in the bay window. ', ['strong']),
    span(
      "A bench with a tucked storage cushion and a single small lamp. Not a 'feature' — just a place a kid can wedge themselves into with a book without bothering anyone.",
    ),
  ]),
  ni([
    mspan('Swap the square coffee table for a round one. ', ['strong']),
    span(
      'A square coffee table forces walking paths around four corners. A round one forgives.',
    ),
  ]),
  ni([
    mspan('Layer a washable wool rug under everything. ', ['strong']),
    span(
      'Performance fabric on the sofa, washable wool on the floor, ceramic-and-brass accents that do not show fingerprints. Forgiveness, layered.',
    ),
  ]),

  // -- Subsection: The layout --------------------------------------------
  h3('The layout'),
  p(
    'The big move was step 1. Pulling the sectional off the wall created a thirty-six-inch lane behind it that became, in practice, the path from the kitchen to the back door — which means nobody walks through the seating arrangement anymore. The room got bigger by losing its edges.',
  ),

  // -- Subsection: The palette -------------------------------------------
  h3('The palette'),
  block('normal', [
    span('Warm and durable. Wall color: Benjamin Moore '),
    mspan('Soft Chamois (OC-13)', ['highlight']),
    span(
      ', which reads warm-cream in morning light and almost taupe at sunset. Sofa: performance linen in greige. Rug: cream wool with a subtle gridded weave. Accents: aged brass, oxblood ceramic, soft greens at the edges.',
    ),
  ]),

  // -- Tip callout -------------------------------------------------------
  {
    _type: 'tipCallout',
    _key: k('tip'),
    label: "Designer's note",
    content: [
      block('normal', [
        span(
          'Performance linen has caught up in the last three years. The brand I used here washes spot-clean with cold water and a microfiber cloth, no special spray. Worth asking your designer or sofa-maker which line they are spec’ing if you are choosing between standard and performance — the upcharge is usually 8 to 15% and worth every dollar with kids.',
        ),
      ]),
    ],
  },

  // -- Divider -----------------------------------------------------------
  { _type: 'divider', _key: k('div'), style: 'ornament' },

  // -- Section: Where everything came from ------------------------------
  h2('Where everything came from'),
  p(
    'A short, honest list. Some are direct trade sources I can pass on; some are pieces I would recommend you call about (sizing, fabric, lead time always matter more than the URL). Prices are what we paid in early 2026; expect drift.',
  ),

  // Source card 1: sofa
  {
    _type: 'sourceCard',
    _key: k('src'),
    itemName: 'Performance linen sectional, 110"',
    vendor: 'Maiden Home (Sutton, custom configuration)',
    price: 'Around $4,800 with the performance upgrade',
    url: 'https://www.maidenhome.com/products/sutton-sectional',
    notes:
      'Trade discount available. Lead time ran twelve weeks at the time we ordered; build that into your timeline if you go this route.',
  },
  // Source card 2: swivel chairs
  {
    _type: 'sourceCard',
    _key: k('src'),
    itemName: 'Swivel chairs (pair)',
    vendor: 'Local upholsterer working from a vintage Milo Baughman silhouette',
    price: 'Around $1,400 each, COM',
    notes:
      'I have a small list of upholsterers in central Indiana I trust for this kind of recreation. Ask me when we talk — picking the wrong shop is the easiest way to lose six weeks.',
  },
  // Source card 3: rug
  {
    _type: 'sourceCard',
    _key: k('src'),
    itemName: '8x10 washable wool rug, cream gridded weave',
    vendor: 'Annie Selke "Bowen"',
    price: '$1,250 on sale (regularly $1,650)',
    url: 'https://www.annieselke.com',
    notes:
      'Washable wool sounds gimmicky and is not. The fibers are treated to release stains; we have washed this one three times and it still looks new.',
  },

  // -- Divider -----------------------------------------------------------
  { _type: 'divider', _key: k('div'), style: 'ornament' },

  // -- Section: What I'd do differently ---------------------------------
  h2("What I'd do differently"),
  block('normal', [
    span(
      'The coffee table. We picked a round walnut piece I had been wanting to use for months — and the proportions were right, but the finish was a hair too dark for how the rest of the palette settled in. Three weeks after install I would have gone for the same shape in a lighter oak. If you are working on a similar room: ',
    ),
    mspan('commit to your wood tones last', ['strong']),
    span(
      '. Pick the sofa, the rug, the wall color, then choose your wood. Hard to do, easy to skip.',
    ),
  ]),

  // -- Section: The aftermath -------------------------------------------
  h2('The aftermath'),
  p(
    'We finished the reveal on a Friday. By Sunday, the family had hosted four neighbors and one of the kids had built a fort behind the swivel chair. Both, I think, count as success.',
  ),
  block('normal', [
    span(
      "I will post the photography here in a week or two — Sarah Lemmons shot it on the second day and I am waiting on her edits. In the meantime, if you'd like to walk through your own version of this — the room that ",
    ),
    mspan('should', ['em']),
    span(' work but doesn’t quite, the layout you suspect is wrong but can’t articulate why — that is literally what an '),
    mspan('in-home consultation', ['link-process']),
    span(' is for, or just '),
    mspan('start a conversation', ['link-contact']),
    span(' and we can talk through whether the timing is right.'),
  ], { markDefs: [linkInline1, linkInline2] }),
];

const journalEntry = {
  _type: 'journalEntry',
  _id: 'journalEntry.plainfieldFamilyRoomWalkthrough',
  title: 'Inside a Plainfield Family Room: How Pulling One Sectional Off the Wall Made the Whole Room Work',
  slug: { _type: 'slug', current: 'plainfield-family-room-walkthrough' },
  excerpt:
    'A young Plainfield family wanted a room that could handle five people, three kids at bedtime, and the occasional juice spill — without feeling like a daycare. Here’s exactly how we got there, what each piece cost, and the one decision I’d change.',
  author: 'Staci Perkins',
  publishedAt: '2026-05-15T14:00:00Z',
  featured: true,
  categories: [
    { _type: 'reference', _key: 'cat-1', _ref: 'journalCategory.projectStories' },
    { _type: 'reference', _key: 'cat-2', _ref: 'journalCategory.process' },
  ],
  relatedProject: { _type: 'reference', _ref: 'project.plainfieldFamilyRoom' },
  body,
  seoTitle: 'How One Sectional Move Fixed a Plainfield Family Room',
  seoDescription:
    'A complete walkthrough of a Plainfield family room project — the brief, the five design moves, every source with price, and the one thing the designer would change.',
};

// ---------------- Write NDJSON + import ----------------

const allDocs = [...categories, journalPage, journalEntry];
const lines = allDocs.map((d) => JSON.stringify(d));

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`Wrote ${allDocs.length} documents to ${outPath}`);
console.log(`  - ${categories.length} categories`);
console.log(`  - 1 journalPage singleton`);
console.log(`  - 1 journalEntry (the example post)`);
console.log('\nRunning sanity dataset import...\n');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['sanity', 'dataset', 'import', outPath, 'production', '--replace'],
  {
    cwd: resolve(root, 'studio'),
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 0);

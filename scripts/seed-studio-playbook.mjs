// Seed the studioPlaybook singleton with the four "Grow your studio" guides:
// photographing your work, building your software toolkit, offering e-design,
// and getting set up with trade vendor sourcing. Content is researched and
// current as of 2026; prices are approximate and worth re-checking over time.
//
// Run: node scripts/seed-studio-playbook.mjs
// (Do NOT run during an active editing session — createOrReplace is safe but it
// overwrites any in-progress edits in this document.)

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

// ─── helpers ─────────────────────────────────────────────────────────────────

let sectionCounter = 0;
function section({ heading, tone, body, bullets, links }) {
  sectionCounter += 1;
  const s = { _key: `s${sectionCounter}`, _type: 'playbookSection', heading };
  if (tone) s.tone = tone;
  if (body) s.body = body;
  if (bullets) s.bullets = bullets;
  if (links) {
    s.links = links.map((l, i) => ({ _key: `l${i + 1}`, _type: 'playbookLink', label: l.label, url: l.url }));
  }
  return s;
}

// ─── Guide 1: Photograph your projects ───────────────────────────────────────

sectionCounter = 0;
const guidePhotography = {
  _key: 'g1',
  _type: 'playbookGuide',
  title: 'Photograph your projects',
  summary:
    'You do not need expensive gear to make your rooms look great online. A recent phone, good light, and a few simple habits do most of the work. Here is how to shoot rooms that sell, plus the cheap upgrades worth making, in the order worth making them.',
  sections: [
    section({
      heading: 'Shoot a few kinds of each room',
      body: 'Every room tells a better story with a little variety. Capture these three and you will always have something strong for the portfolio.',
      bullets: [
        'The wide shot: your hero, showing the whole space and how it works. Pick the most flattering angle instead of cramming in every wall.',
        'Before and after pairs: shoot the before from the exact same spot, height, and zoom as the after so they line up. Mark where you stand. The before is allowed to look messy. That is the whole point.',
        'Detail shots: styled close-ups of texture, a corner of the sofa with a throw, the hardware, a stack of books, greenery against tile. These are the easiest shots to make look designer.',
      ],
    }),
    section({
      heading: 'Style and clean before you pick up the camera',
      bullets: [
        'Remove the clutter: cords, remotes, trash cans, fridge magnets, soap bottles, dish towels, personal photos.',
        'Fluff the pillows, straighten the throws, square up rugs and stacks of books, line up the chairs.',
        'Then add back one or two real touches: an open book, a coffee cup, fresh flowers. Totally empty looks like a listing. Over-styled looks fake.',
        'Wipe down counters, glass, and mirrors. Smudges show up clearly in photos.',
        'Frame the part you designed, not the whole room wall to wall like a real estate photo.',
      ],
    }),
    section({
      heading: 'Light it with the windows, not the bulbs',
      tone: 'primary',
      body:
        'This is the single biggest thing that separates an amateur interior photo from a professional one.\n\nTurn off every lamp and overhead light and shoot with natural light only. Mixing daylight with warm indoor bulbs creates an orange and blue color cast that is very hard to fix later.\n\nShoot when the sun is not blasting straight through the windows. Early morning, late afternoon, or an overcast day is ideal, because the soft, even light avoids harsh shadows and blown-out windows. If a window is too bright, close a sheer curtain to soften it.',
    }),
    section({
      heading: 'Keep your vertical lines straight',
      body: 'Leaning walls are the fastest way a photo reads as amateur. The fix is simple: hold the camera perfectly level and do not tilt it up or down.',
      bullets: [
        'Turn on your camera grid and the level overlay. Most phones have both built in.',
        'Line up the vertical edges of walls, doors, and windows with the grid lines.',
        'Stand square to a wall, or shoot into a corner where two walls meet, to give the room depth.',
        'A tripod removes accidental tilt and makes this almost automatic.',
      ],
    }),
    section({
      heading: 'Shoot a little lower than you think',
      bullets: [
        'Kitchens and counters: shoot around chest height so you do not see the tops of counters or the underside of the cabinets.',
        'Living rooms and bedrooms: shoot around waist or seated height so the viewer feels like they are sitting in the room.',
        'Standing eye-level shots are a common giveaway. Get the camera down a bit.',
      ],
    }),
    section({
      heading: 'The budget gear, in priority order',
      body: 'You can start by spending almost nothing. Add these only as you have the money, and roughly in this order.',
      bullets: [
        'Your phone, free: any recent phone with an ultrawide lens is enough to start. Use the normal 1x lens whenever the room fits, and only switch to the 0.5x ultrawide when you truly cannot back up further, since ultrawide bends the lines at the edges.',
        'A tripod, around 40 to 50 dollars: the K and F Concept 64 inch is a long-time budget favorite. Add a small phone clamp for about 10 dollars so it holds your phone too. This is the highest-impact thing you can buy.',
        'A reflector, around 15 to 25 dollars: a Neewer 5 in 1 bounces window light into the dark corners. A piece of white foam board for a couple of dollars does the same job.',
        'Later, a gimbal for video, around 90 dollars: the DJI Osmo Mobile 7 makes walkthrough video smooth. You can start without it by walking slowly.',
        'Much later, a used camera: a used Canon SL3 body with a used 10 to 18mm wide lens runs about 500 to 650 dollars and beats any phone. Only buy this once you have clearly outgrown the phone.',
      ],
    }),
    section({
      heading: 'Edit lightly, and for free',
      body: 'Two free apps do everything you need. Snapseed is completely free with no catches. Lightroom mobile has a strong free tier too.',
      bullets: [
        'Straighten first: use the perspective or geometry tool to fix any leaning walls, then level a crooked horizon.',
        'Fix the color: tap a white or gray area to set the white balance so whites look white, not orange.',
        'Open the shadows: lift the dark corners and pull the bright windows back down a little.',
        'Keep it real: do not crush the blacks or oversaturate. Wall colors especially need to look true. Use the same look across one room so the set feels cohesive.',
      ],
    }),
    section({
      heading: 'Simple video walkthroughs',
      bullets: [
        'Walk slowly, heel to toe, knees a little bent, phone held with both hands close to your body. Move your whole body, not just your arms.',
        'Pan slowly from your feet and hips. Fast pans look amateur and confuse the stabilization.',
        'Keep the phone level here too, so the walls do not lean as you move.',
        'Shoot vertical for Instagram and stories, horizontal for the website or YouTube.',
        'Keep each clip short, three to six seconds, and cut several together. Edit for free in CapCut or right inside Instagram.',
      ],
    }),
    section({
      heading: 'Free places to get better',
      bullets: [
        'YouTube: Inside Real Estate Photography, Adam Taylor, and Arturo and Lauren all teach interior and real estate shooting for free.',
        'Designer phone-photo guides from The Little Design Corner, Gray Malin, and Rebecca Hay are written for exactly your situation.',
        'When you have a little money, Mike Kelley has a beginner architecture photography course that is the most recommended paid step.',
      ],
    }),
  ],
};

// ─── Guide 2: Build your designer toolkit ────────────────────────────────────

sectionCounter = 0;
const guideSoftware = {
  _key: 'g2',
  _type: 'playbookGuide',
  title: 'Build your toolkit',
  summary:
    'You already have Google Workspace, which covers email, files, spreadsheets, calendar, video calls, and intake forms. Start almost free, then add paid tools only when paying clients justify them. Here is what to pick and, just as important, what to skip.',
  sections: [
    section({
      heading: 'Start here: the roughly five dollar a month stack',
      tone: 'primary',
      body: 'You can run a real design business for about five dollars a month plus a one-time measuring tool. Add anything fancier only once clients are paying for it.',
      bullets: [
        'Floor plans and basic 3D: Planner 5D Premium, around five dollars a month. Drag and drop, very easy to learn. RoomSketcher Pro at 99 dollars a year is a clean alternative if you mainly need accurate plans.',
        'Mood and concept boards: Canva Free. It is genuinely good. Upgrade to Canva Pro at about 120 dollars a year only when you want a saved brand kit.',
        'Project tracking: Trello Free or Notion Free. Google Workspace already covers files, budgets, calendar, and forms, so do not pay for more than you need.',
        'Contracts and invoices: Wave is free software. You only pay a small percent when a client pays by card. A Google Doc plus a free e-signature works for a simple contract.',
        'Measuring: a laser measure for about 36 to 49 dollars (Tacklife or Bosch Blaze) plus your phone. That is the only thing you really need to buy up front.',
      ],
    }),
    section({
      heading: 'Floor plans and 3D renders',
      body: 'These turn measurements into a layout and a picture the client can understand. Start simple. The fancier the render, the steeper the learning curve.',
      bullets: [
        'Planner 5D: cheapest and easiest, a great first pick, around five dollars a month.',
        'RoomSketcher: best for clean, accurate floor plans, 99 dollars a year on the Pro plan.',
        'Foyr Neo: fast, photo-real renders in your browser, around 42 to 49 dollars a month. Step up to this when nicer pictures start winning jobs.',
        'SketchUp Pro: the industry standard for custom furniture and built-ins, 399 dollars a year, and it needs a separate render add-on. Powerful, but it takes weeks to learn, so save it for later.',
        'Chief Architect Home Designer: a buy-once desktop option around 99 to 199 dollars if you would rather not subscribe.',
      ],
    }),
    section({
      heading: 'Mood and concept boards',
      bullets: [
        'Canva: free and capable, the best starting point for a good-looking client board.',
        'Morpholio Board: a designer favorite if you own an iPad and Apple Pencil. It builds shopping lists from the products you drop in.',
        'Milanote: nice for gathering inspiration before you build the final board.',
        'Google Slides: already yours, and fine for a simple client concept deck at no cost.',
      ],
    }),
    section({
      heading: 'All in one design platforms, when you are ready',
      body: 'These combine product sourcing from any website, boards, e-design delivery, a client portal, and invoicing in one place. You do not need one to start, but it is the natural next purchase once you have steady clients, especially if you want to offer e-design.',
      bullets: [
        'DesignFiles: the best value and the easiest e-design starting point. About 55 dollars a month for the e-design plan, 75 dollars a month for full service with invoicing and purchase orders. There is a free single-project plan to try it.',
        'Programa: clean, modern, with every feature on every plan, around 47 dollars a month billed yearly.',
        'Houzz Pro: pricier at about 99 to 159 dollars a month. Worth it mainly for the marketing and the leads from the Houzz marketplace.',
      ],
    }),
    section({
      heading: 'Do not pay twice for the same thing',
      tone: 'caution',
      body:
        'The most common money mistake is buying an all in one platform and also paying for a separate client manager like HoneyBook or Dubsado, plus separate invoicing. They overlap a lot. Pick one spine and let it do the job.\n\nAlso remember that Google Workspace already gives you file storage, spreadsheets for budgets, a calendar, and intake forms. Lean on it before you buy anything new.',
    }),
    section({
      heading: 'Measuring a room quickly',
      bullets: [
        'A laser measure for about 36 to 49 dollars is accurate and pays for itself almost immediately.',
        'Apps like magicplan, CubiCasa, or Polycam turn a phone walk-through into a floor plan. CubiCasa lets you pay per plan, which is friendly when you are low volume.',
      ],
    }),
    section({
      heading: 'Two stacks to grow into',
      bullets: [
        'Starter, about five dollars a month: Google Workspace, Planner 5D, Canva Free, Trello Free, Wave, and a laser measure. This already does sourcing, planning, presenting, contracts, and invoices.',
        'Step up, about 70 to 90 dollars a month: DesignFiles for the whole client workflow, Canva Pro for branding, and optionally Foyr Neo for premium renders. Drop HoneyBook and Dubsado here, since DesignFiles already covers that.',
      ],
    }),
  ],
};

// ─── Guide 3: Offer e-design to clients ──────────────────────────────────────

sectionCounter = 0;
const guideEdesign = {
  _key: 'g3',
  _type: 'playbookGuide',
  title: 'Offer e-design',
  summary:
    'E-design is interior design delivered online. You create the plan, the client buys the pieces and puts the room together. It is priced lower than full service, but it is scalable, you can do it from anywhere, and it is a great way to take on more clients.',
  sections: [
    section({
      heading: 'What e-design is',
      body:
        'Everything happens digitally: email, video calls, and shareable boards. You deliver a plan, not a finished room. The client orders the products and installs or styles the space themselves, or hands your plan to their contractor.\n\nCompared to full service, e-design is remote, lower priced, and far more scalable, because you are not driving to sites, placing orders, or managing deliveries.',
    }),
    section({
      heading: 'What goes in a package',
      body: 'Mix these deliverables into simple tiers. Most designers offer a good, better, best set.',
      bullets: [
        'An intake questionnaire and a style quiz.',
        'A mood or concept board. Always get this approved first, before you do the detailed work.',
        'A 2D floor plan with the furniture laid out to scale.',
        'A 3D render, usually on the higher tiers only.',
        'A shopping list with clickable buy links and prices. This is where the extra income comes from.',
        'A placement and how-to guide so the client can put it all together.',
        'A set number of revisions, usually one or two rounds.',
      ],
    }),
    section({
      heading: 'A simple three tier setup',
      bullets: [
        'Good: a style quiz, one concept board, and a shopping list. No floor plan or render, and one light revision.',
        'Better: adds a scaled floor plan, the full shopping list with links, a how-to guide, and two or three revisions.',
        'Best: adds 3D renders, paint and finish picks, more revisions, and a follow-up call.',
      ],
    }),
    section({
      heading: 'How the project flows',
      body: 'Keep the same steps every time and it becomes a smooth, repeatable product.',
      bullets: [
        'The client picks a room package and fills out your questionnaire and style quiz.',
        'They send photos, measurements, and inspiration images.',
        'You build the concept board and get their sign-off on the direction.',
        'You create the floor plan, render, shopping list, and how-to guide.',
        'One or two revision rounds.',
        'You deliver the final package as a PDF or an online board, with an optional paid follow-up.',
      ],
    }),
    section({
      heading: 'Exactly what to collect from the client',
      tone: 'primary',
      body: 'The whole plan rests on what the client sends you, so make this part easy and very specific.',
      bullets: [
        'Photos: one from each corner of the room, one straight on at each wall, and close-ups of anything they are keeping. Ask for landscape orientation.',
        'Measurements: room width and length, each wall length, the size and position of doors and windows, the ceiling height, and the size of any furniture they keep. A labeled hand sketch is perfect. It does not need to be to scale.',
        'Budget: a total, or a range per item.',
        'Style: their answers to your style quiz, plus five to ten inspiration images or a Pinterest board link.',
        'How they live: who uses the room, what is not working now, must-keep pieces, and any pets or kids to plan around.',
      ],
    }),
    section({
      heading: 'What to charge',
      body: 'Per-room flat fees are the standard. Set your price by what is included and how much custom work you do.',
      bullets: [
        'Entry packages run about 150 to 600 dollars a room, with simpler deliverables and a faster turnaround.',
        'Custom, personalized packages run about 700 to 2,500 dollars a room. This is a realistic target band as you build a name.',
        'You can also sell a paid consultation, often around 100 dollars, as a low-commitment way for a client to start.',
      ],
    }),
    section({
      heading: 'How you make money beyond the fee',
      bullets: [
        'Affiliate links on your shopping list earn a commission when the client buys through them. Trade and designer marketplaces like Side Door pay strong commissions, often around 30 percent. Longer cookie windows of 30 days or more convert better for furniture, since people take their time deciding.',
        'Trade discounts are a different path: you buy at wholesale and resell, which fits full service more than e-design. See the trade sourcing guide.',
        'Upsells: extra revisions, a follow-up call, more rooms, or re-sourcing an item that sold out.',
      ],
    }),
    section({
      heading: 'Set expectations up front',
      tone: 'caution',
      body:
        'Most e-design friction comes from fuzzy expectations. Say these plainly in your package description and your agreement.\n\nThe client must measure accurately, because the plan depends on it. Products can sell out or change price, so some swaps may be needed. You deliver the plan, you are not installing it. Spell out exactly how many revisions are included, and that anything beyond that is quoted first. Get the concept board approved before the heavy work, so revisions do not pile up.',
    }),
    section({
      heading: 'Tools that deliver e-design',
      bullets: [
        'DesignFiles and Morpholio Board both build the clickable shopping list and a client-friendly board. These are the purpose-built choices.',
        'Canva makes polished presentation pages, but it does not build a true shopping list.',
        'SketchUp adds 3D renders when a tier calls for them.',
      ],
    }),
  ],
};

// ─── Guide 4: Get set up with trade sourcing ─────────────────────────────────

sectionCounter = 0;
const guideTrade = {
  _key: 'g4',
  _type: 'playbookGuide',
  title: 'Trade sourcing',
  summary:
    'Trade accounts let you buy furniture and finishes at designer pricing the public cannot get, then source them for clients. The key that unlocks almost everything is a state resale certificate. Here is how to get set up, and which programs a brand-new designer can actually join.',
  sections: [
    section({
      heading: 'What you need before you apply',
      body: 'A trade application is really just proof that you are a real, tax-registered business. Get these in order first.',
      bullets: [
        'A registered business: an LLC or a sole proprietorship. An LLC adds a liability shield and looks a bit more official.',
        'An EIN, your free federal tax ID from the IRS. Never pay anyone for this.',
        'A resale certificate, also called a seller permit or sales tax permit depending on your state. This is the big one.',
        'A professional look: a simple website or a polished business Instagram, and an email on your own domain rather than a generic free address. Vendors do check.',
      ],
    }),
    section({
      heading: 'What a resale certificate is, and why it matters',
      tone: 'primary',
      body:
        'A resale certificate lets you buy goods without paying sales tax at checkout, because you are going to resell them. Sales tax gets collected once, at the final sale to your client.\n\nSo you buy the sofa tax-free from the vendor, then you collect and pass on the sales tax from your client. Vendors are legally required to have this on file before they sell to you tax-free, which is why nearly every trade application asks for it. On the form you usually give your resale number and the state that issued it.\n\nThe name and the rules vary by state. A few states have no sales tax at all, so there is nothing to get. Check your own state Department of Revenue for the exact document and any fee.',
    }),
    section({
      heading: 'The setup steps, in order',
      body: 'Work through these once and you are ready to apply anywhere.',
      bullets: [
        'Register your business with your state and pick your name.',
        'Get your EIN from the IRS online. It is free and immediate.',
        'Apply for your state resale or sales tax permit through your state Department of Revenue.',
        'Open a business bank account, and set up your website and a matching business email.',
        'Then apply to trade programs. Keep one reusable packet ready: EIN, resale number and state, business address, website link, and a short paragraph about your studio.',
      ],
      links: [
        { label: 'Get an EIN from the IRS (free)', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number' },
      ],
    }),
    section({
      heading: 'How you make money on trade',
      body: 'Trade pricing is how designers earn margin on the products themselves, not just on design time.',
      bullets: [
        'You buy below retail. Big retailer programs give roughly 10 to 25 percent off. True trade-only brands give roughly 30 to 60 percent off.',
        'You resell to the client at or near retail and keep the difference. A common markup on your trade cost is about 30 to 50 percent.',
        'That markup pays for the sourcing, ordering, tracking, and problem-solving you handle that the client never sees.',
      ],
    }),
    section({
      heading: 'Easy to approve retailer programs to start with',
      body: 'These usually approve on your business registration and resale certificate alone, with no portfolio required. A great place to begin.',
      bullets: [
        'Wayfair Professional: free to join, with designer-only products and a concierge. It covers AllModern, Birch Lane, and Joss and Main too.',
        'The Studio by Williams Sonoma: one account covers West Elm, Pottery Barn, Rejuvenation, and more, with a discount around 20 percent.',
        'CB2 and Crate and Barrel trade: around 10 to 20 percent off plus a concierge.',
        'Arhaus trade: at least 30 percent off, with no minimum order.',
        'RH trade and Lulu and Georgia: roughly 20 to 30 percent off for designers.',
        'Perigold trade: up to about 25 percent off the luxury catalog.',
      ],
      links: [
        { label: 'Wayfair Professional', url: 'https://www.wayfair.com/professional/' },
        { label: 'Arhaus trade services', url: 'https://www.arhaus.com/pages/trade-services' },
        { label: 'RH trade', url: 'https://rh.com/us/en/trade' },
      ],
    }),
    section({
      heading: 'Marketplaces that skip the no history problem',
      body: 'These give you access to hundreds of trade brands through one login, without opening an account with each one or meeting minimums. Perfect when you are brand new.',
      bullets: [
        'Side Door: free for designers, no minimums. You shop well over a hundred trade brands, see both your cost and the client price, and keep the spread, which averages around 30 percent. Side Door places the order and handles delivery.',
        'DesignerInc: a free business marketplace covering hundreds of thousands of trade-only items from many manufacturers, with quotes and concierge help.',
      ],
      links: [
        { label: 'Side Door', url: 'https://onsidedoor.com' },
        { label: 'DesignerInc', url: 'https://designerinc.com' },
      ],
    }),
    section({
      heading: 'The deeper discount trade-only brands',
      body: 'Trade-only manufacturers and design-center showrooms give the biggest discounts, around 30 to 60 percent, but they often want to see association credentials or a couple of finished projects first. Reach them through Side Door or DesignerInc in the meantime.',
      bullets: [
        'Lighting brands like Visual Comfort, Hudson Valley, and Arteriors run about 30 to 50 percent off.',
        'Fabric houses like Kravet and Schumacher run about 30 to 40 percent off.',
        'Design centers like theMART in Chicago, the D and D Building in New York, and ADAC in Atlanta house many trade-only showrooms. You need a trade account to buy.',
      ],
    }),
    section({
      heading: 'Tips for getting approved with no portfolio yet',
      tone: 'positive',
      body: 'Vendors are checking that you are a legitimate business, not judging your design work, so a brand-new designer can absolutely get approved.',
      bullets: [
        'Have the packet ready: EIN, resale number and state, business address, and your website link.',
        'Start with the easy retailer programs above. The resale certificate does most of the work.',
        'Use a real website and a domain email. It noticeably raises your approval odds.',
        'When you have no credit history, choose to prepay rather than ask for net 30 terms, so you can skip the trade-reference section.',
        'Open just a few accounts at first, in the categories you actually use, then grow from there.',
      ],
    }),
  ],
};

// ─── Guide 5: Write portfolio and journal posts ──────────────────────────────

sectionCounter = 0;
const guidePortfolioJournal = {
  _key: 'g5',
  _type: 'playbookGuide',
  title: 'Portfolio and journal posts',
  summary:
    'Your portfolio and your journal are two different tools. The portfolio proves you can do the work. The journal shows how you think and pulls people in from search. And the strongest posts are not written at the end, they are gathered as you go. Here is how to think about both, when something belongs in one or the other, and what to capture during a project so you finish with something worth showing off.',
  sections: [
    section({
      heading: 'What each one is for',
      tone: 'primary',
      body:
        'Think of the portfolio as your proof and the journal as your voice.\n\nA portfolio project is a finished room told as a short case study: the problem the client had, the call you made, and the result, with photos. It exists to show a future client one simple thing, that you can do this for them too.\n\nThe journal is everything else: how you think, what you would do differently, where you found a piece, the answer to a question clients always ask. It builds trust, shows your personality, and brings in people from Google who are not ready to hire yet but will remember you when they are.',
    }),
    section({
      heading: 'Which one is it? A quick rule',
      body: 'Most of the time the choice is obvious once you ask one question: do I have a finished room with photos, or do I have something to say?',
      bullets: [
        'Portfolio: a real project you completed and photographed. One entry per project. The before and after, the room, the story of the work.',
        'Journal: a lesson, a how-to, a source roundup, an opinion, a trend take, a personal note, or a question you answer. There is no finished-room requirement.',
        'The part most people miss: one project usually gives you both. The project itself becomes the portfolio piece, and a single decision or lesson from it becomes a journal post that links back to it. One project, two pieces of content, twice the mileage.',
        'When in doubt: if the point is the room, it is a portfolio project. If the point is the idea, it is a journal post.',
      ],
    }),
    section({
      heading: 'Document as you go (this is the real secret)',
      tone: 'positive',
      body: 'A strong post is almost never written from memory at the end. It is assembled from things you grab along the way. Build the habit of capturing these on every project and the writing at the end becomes easy.',
      bullets: [
        'Before photos, first thing, before you move anything. Shoot from the same spots and angles you will reshoot at the end so the pairs line up.',
        'The brief in the words the client used: what was not working, and what they wanted. This becomes the one-line brief on the project page.',
        'Your design call and why you made it, the pivotal decision in plain language. This is the part clients and other designers actually want to read.',
        'Quick phone snaps of the process: the mood board, the samples taped to the wall, delivery day, the piece going into place.',
        'The specific sources: the paint color, the light, the rug, and where each came from, so you can credit them later in a source card or a roundup post.',
        'A short client reaction at the end. Even one honest sentence makes a great quote.',
        'The after photos, reshot from the before angles. Then jot one line on how the room works now that it did not before.',
      ],
    }),
    section({
      heading: 'Write a portfolio project that sells',
      body: 'Keep it short and let the photos carry it. The goal is for a future client to see their own house somewhere in the story.',
      bullets: [
        'Name it for the place, not the client: a title like Fishers ranch refresh, not the family name.',
        'Lead with the transformation, then tell it simply: the problem, the call you made, the result.',
        'Use the one-line brief and call fields to set it up fast. The brief is what they came in with. The call is your move in response.',
        'Show the thinking, not your credentials. A line like, I started with the wall color because everything else has to answer to it, beats any list of qualifications.',
        'Add four to eight photos: a couple of wide shots, a few details, and a before-and-after pair if you have a clean one.',
        'Write captions like a person pointing something out, not a label. Skip the photo of openings.',
        'Keep the voice warm and plain, and skip the brochure words like transformative, curated, elevated, and sanctuary.',
      ],
    }),
    section({
      heading: 'Write a journal post worth reading',
      body: 'One post, one idea. If you are trying to say three things, that is three posts.',
      bullets: [
        'Pick a specific, useful headline. A 1970s ranch in Fishers beats a modern home. Specific gets clicked, and gets found in search.',
        'Open with the point. Do not warm up for three paragraphs. Then use headings so the post can be skimmed.',
        'Show real thinking and a little personality. The honest, here is what I would do differently, posts are often the best ones.',
        'Use the building blocks in the editor: before and after, source cards for products, a tip callout, a small gallery.',
        'If the post grew out of a project, link it as the related project so readers can go see the finished room.',
        'End with a soft nudge, not a hard sell: a line inviting them to reach out if they want help with their own space.',
      ],
    }),
    section({
      heading: 'Post ideas you already have',
      body: 'You are never really starting from a blank page. Almost every one of these comes straight out of work you have already done.',
      bullets: [
        'A walkthrough of a project you just finished.',
        'The one decision that fixed a room, and why it worked.',
        'Where I found it: a roundup of the sources from a single project.',
        'The answer to a question clients ask you constantly.',
        'A common mistake you see, and the simple fix for it.',
        'A short list with a point of view: five paint colors I come back to, or five things I would skip.',
        'A before and after with the reasoning behind each change.',
        'A look behind the scenes at how you actually work with a client.',
      ],
    }),
    section({
      heading: 'A simple rhythm',
      tone: 'primary',
      body:
        'You do not need to post constantly. You need to post consistently, and let each project do double duty.\n\nFor every finished project, publish one portfolio piece, then spin at least one journal post out of the notes and photos you already gathered. Aim for a new post every few weeks. The same set of photos and notes feeds the portfolio, the journal, and your Instagram, so work you did once shows up in three places.',
    }),
  ],
};

// ─── studioPlaybook document ─────────────────────────────────────────────────

const studioPlaybookDoc = {
  _id: 'studioPlaybook',
  _type: 'studioPlaybook',
  title: 'Grow your studio',
  intro:
    'Five guides for leveling up as a designer, whenever you are ready for them. The website runs fine without any of this, so there is no rush. Come back when you want to photograph your work better, write up your projects so they shine on the site, add the right tools, offer e-design, or start buying at trade prices. Everything here is editable, so add your own notes as you learn. Prices are rough and current as of 2026, worth a quick check before you commit to anything.',
  guides: [guidePhotography, guidePortfolioJournal, guideSoftware, guideEdesign, guideTrade],
};

// ─── write ───────────────────────────────────────────────────────────────────

async function run() {
  await client.createOrReplace(studioPlaybookDoc);
  console.log('[ok] seeded studioPlaybook');
}

run().catch((err) => {
  console.error('[fail] seeding studioPlaybook:', err.message);
  process.exit(1);
});

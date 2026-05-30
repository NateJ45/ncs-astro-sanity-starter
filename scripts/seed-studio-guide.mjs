// Seed studioGuide and studioNotes singletons with the content that was
// previously hardcoded in StudioGuide.tsx and BusinessOverview.tsx.
// Run ONCE after deploying the new schemas to Sanity Studio.
//
// Run: node scripts/seed-studio-guide.mjs
// (Do NOT run during an active editing session — createOrReplace is safe
// but it will overwrite any in-progress edits in those documents.)

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

// ─── studioGuide document ────────────────────────────────────────────────────
// Verbatim content from studio/components/StudioGuide.tsx (before migration).

const studioGuideDoc = {
  _id: 'studioGuide',
  _type: 'studioGuide',
  guideTitle: 'How the website works',
  guideIntro:
    'This is your content editor for reiddesignllc.com. Everything you change here appears on the live site after you hit Publish.',
  studioMap: [
    {
      _key: 'm1',
      _type: 'mapRow',
      area: 'Site Settings',
      description:
        'Your contact info (email, phone), social links (Instagram, Facebook), the list of cities you serve, travel fee tiers, and your availability status. Think of this as your business card inside the Studio.',
    },
    {
      _key: 'm2',
      _type: 'mapRow',
      area: 'Pages',
      description:
        'Every page on the site lives here. They are grouped into four buckets: core pages (Home, About, Services, Portfolio, FAQ, Contact, Journal), offerings (E-Design, Shop, Gift Certificates), resources and tools (Resources, Style Quiz, Budget Calculator), and other (Press, Privacy Policy, 404). If a visitor can click to a page, it is in here somewhere.',
    },
    {
      _key: 'm3',
      _type: 'mapRow',
      area: 'Content',
      description:
        'The building blocks that fill pages: services and their prices, testimonials, projects (case studies), shop items and collections, guides (free PDFs), press mentions, FAQ items, and philosophy values. Most of the time, this is where you will be adding new things.',
    },
    {
      _key: 'm4',
      _type: 'mapRow',
      area: 'Journal',
      description:
        'Your blog posts and their categories. Write a post, pick a category, publish.',
    },
  ],
  howTos: [
    {
      _key: 'h1',
      _type: 'howTo',
      title: "Edit a page's words or photos",
      steps: [
        'Click "Pages" in the left sidebar, then pick the page you want to update.',
        'Edit any field directly in the form on the left.',
        'Click the "Preview" tab at the top to see how it looks before you publish.',
        'When you are happy, click the blue "Publish" button at the bottom right. The live site updates in about 1 to 3 minutes.',
      ],
    },
    {
      _key: 'h2',
      _type: 'howTo',
      title: 'Add a project or case study',
      steps: [
        'Click "Content" in the left sidebar, then "Projects".',
        'Click the blue + button at the top right to create a new project.',
        'Fill in the title, location, room type, and year.',
        'Upload a hero photo and fill in its Alt text (a short description like "Living room redesign in Fishers, Indiana").',
        'Write the story in the Intro Story field. Add gallery photos below that.',
        'Flip the "Featured" toggle to pin the project to the homepage carousel.',
        'Click Publish when you are ready.',
      ],
    },
    {
      _key: 'h3',
      _type: 'howTo',
      title: 'Add a testimonial',
      steps: [
        'Click "Content" in the left sidebar, then "Testimonials".',
        'Click the + button to create a new testimonial.',
        "Paste the client's exact words into the Quote field. Do not edit them.",
        'Fill in the client\'s name, location (like "Fishers, IN"), and the source (Google, Facebook, etc.).',
        'Upload a photo if you have one. Click Publish.',
      ],
    },
    {
      _key: 'h4',
      _type: 'howTo',
      title: 'Write a journal post',
      steps: [
        'Click "Journal" in the left sidebar, then "Posts".',
        'Click + to start a new post.',
        'Fill in the title, slug (the URL-friendly version, auto-generated from the title), and your post body.',
        'Add a cover image with Alt text.',
        'Pick a category from the dropdown.',
        'Use the Preview tab to read through it before publishing.',
        'Click Publish when you are ready, or schedule it for later (see the tip below).',
      ],
    },
    {
      _key: 'h5',
      _type: 'howTo',
      title: 'Add a shop favorite',
      steps: [
        'Click "Content" in the left sidebar, then "Shop Items".',
        'Click + to create a new item.',
        'Fill in the item name, the affiliate link, a short note about why you love it, and an image.',
        'Pick which Shop Collection it belongs to from the dropdown.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h6',
      _type: 'howTo',
      title: 'Add a press mention',
      steps: [
        'Click "Content" in the left sidebar, then "Press Items".',
        'Click + to create a new press item.',
        'Fill in the outlet name, the date, a short pull quote if you have one, and the link to the article.',
        "Upload the outlet's logo if you have it.",
        'Click Publish.',
      ],
    },
    {
      _key: 'h7',
      _type: 'howTo',
      title: 'Add a free guide',
      steps: [
        'Click "Content" in the left sidebar, then "Guides (lead magnets)".',
        'Click + to create a new guide.',
        'Fill in the title, a short summary, and upload the PDF using the file field.',
        'Add a cover image.',
        'Flip the "Published" toggle on, then click Publish.',
      ],
    },
    {
      _key: 'h8',
      _type: 'howTo',
      title: 'Change a price or service description',
      steps: [
        'Click "Content" in the left sidebar, then "Services".',
        'Click the service you want to update.',
        'Edit the Price Display field (for example, change "$150" to "$175").',
        'Click Publish.',
      ],
    },
    {
      _key: 'h9',
      _type: 'howTo',
      title: 'Update your availability, contact info, or service area',
      steps: [
        'Click "Site Settings" in the left sidebar.',
        'Find the field you want to update: Availability Status, Public Email, Phone, or Service Areas.',
        'Make the change and click Publish.',
      ],
    },
    {
      _key: 'h10',
      _type: 'howTo',
      title: 'Turn a section on or off',
      steps: [
        'Click "Site Settings" in the left sidebar.',
        'Click the "Section visibility" tab at the top of the form.',
        'Find the toggle for the section you want to hide or show (Portfolio, Journal, Shop, E-Design, Gift Certificates, Press, Resources, Guides, Style Quiz, Budget Calculator).',
        'Flip it off (or back on) and click Publish.',
        'The site rebuilds in about 1 to 3 minutes. When a section is off it disappears from the menu, footer, and homepage, and its own page redirects visitors to the home page instead.',
        'Turning a section off does not delete anything. All your drafts and published content stay right where they are. Turn it back on when you are ready and everything reappears.',
      ],
    },
    {
      _key: 'h11',
      _type: 'howTo',
      title: 'Set up a home page slideshow (or a single hero photo)',
      steps: [
        'Click "Pages" in the left sidebar, then "Home".',
        'Find the "Hero images" field.',
        'If you add just one photo, the site shows it as a single still hero, which is how the site looks right now.',
        'Add two or more photos and they slowly cross-fade into each other with a gentle zoom effect, turning the hero into a slideshow.',
        'To reorder photos, drag them up or down in the list.',
        'Put your strongest photo first. It is the one visitors see first and the one the site loads fastest.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h12',
      _type: 'howTo',
      title: "Add a background photo behind a page's closing call to action",
      steps: [
        'Open the page you want to update in "Pages" (Home, About, Services, Process, FAQ, E-Design, or Journal).',
        'Look for the "Final CTA background image" field near the bottom of the form.',
        'Upload a photo. The site automatically darkens it so the headline and button stay easy to read.',
        'Leave the field empty if you want the plain dark panel instead.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h13',
      _type: 'howTo',
      title: 'Show your numbers on the About page',
      steps: [
        'Click "Pages" in the left sidebar, then "About".',
        'Find the "Stats" field.',
        'Click the + button to add a stat. You can add up to four.',
        'Each stat has three parts: the number (like 200), an optional suffix (like a + sign or the letter k), and a short label (like "Rooms designed" or "Years in business").',
        'When a visitor scrolls to that section, the numbers count up automatically.',
        'The whole row stays hidden until you add at least one stat, so there is nothing to clean up if you decide not to use it.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h14',
      _type: 'howTo',
      title: "Fill in your About 'off the clock' section",
      steps: [
        'Click "Pages" in the left sidebar, then "About".',
        'Look for the personal section of fields. You will see fields for Currently (a short list of what you are into right now), Rapid fire (quick one-liner answers), Favorite local spots, Beyond design, and a candid photo of yourself.',
        'Fill in whatever feels right and leave the rest blank.',
        'The whole section stays hidden on the site until you add the personal headline, so nothing shows up half-finished.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h15',
      _type: 'howTo',
      title: 'Add a handwritten accent word to a heading',
      steps: [
        'Several headings on the site, including the hero, section headings, and the closing call to action panel, have an optional script accent field next to them.',
        'Type one word in that field. It has to be a word that already appears in the heading, spelled exactly the same way.',
        'The site renders that word in the pretty handwritten font while the rest of the heading stays in the regular typeface.',
        'Use it on just one word per heading so it stays special.',
        'Leave the field blank to skip the accent on that heading.',
      ],
    },
    {
      _key: 'h16',
      _type: 'howTo',
      title: 'Setup: Connect your contact form email (Web3Forms)',
      steps: [
        'This is the service that emails you whenever someone fills out the contact form. It is free and takes about two minutes.',
        'Go to web3forms.com.',
        'Find the box on the homepage that asks for your email and type in the email address where you want contact messages to land.',
        'Click the button to create your access key.',
        'Check that inbox. Web3Forms emails you a short access key, which is just a string of letters and numbers.',
        'Copy that access key and send it to Nathan. He will connect it to the site.',
        'Until Nathan connects the key, the contact form cannot deliver messages, so this one is worth doing early.',
      ],
    },
    {
      _key: 'h17',
      _type: 'howTo',
      title: 'Setup: Turn on newsletter signups (Sender)',
      steps: [
        'Sender is the service that collects email addresses when visitors sign up for your newsletter and lets you email that list later. The free plan is plenty to start.',
        'Go to sender.net and click to sign up for free.',
        'Fill in your company name, your business email, and a password to create the account.',
        'In the left menu, click "Forms", then "Create a new form".',
        'Choose "Embedded form", give it a name like "Newsletter signup", and click Create.',
        'Pick the Default or Basic layout. You do not need to fuss over the design, the site has its own signup boxes. This is mostly to create the list behind them.',
        'Click "Save and continue" at the top right until you reach the last step.',
        'On that last step you will see the form\'s script, which comes in two parts. That is the integration detail.',
        'Copy that script (both parts) and send it to Nathan. He will wire it into the signup boxes on the site.',
      ],
    },
    {
      _key: 'h18',
      _type: 'howTo',
      title: 'Setup: Set up your discovery-call booking (Calendly)',
      steps: [
        'Calendly is the little calendar that lets people book a discovery call with you without the back-and-forth emails. The free plan covers one event type, which is all you need.',
        'Go to calendly.com and click "Sign up for free". You can sign up with your Google account or with an email and password.',
        'When it asks for a username, pick something simple like your studio name, because it becomes part of your booking link.',
        'Click the "+ Create" button and choose "Event Type", then choose "One-on-One".',
        'Name it something like "Discovery call".',
        'For the duration, the presets are 15, 30, 45, and 60 minutes. Click "Custom" and type 20 to make it a 20-minute call.',
        'Set your location to phone or video, whichever you prefer, then save.',
        'Back on the Calendly home screen, find your new event and click "Copy link". That is your public booking link.',
        'Give that link to Nathan. He sets it in the site settings code, not in this Studio, so it is not something you paste here.',
      ],
    },
    {
      _key: 'h19',
      _type: 'howTo',
      title: 'Setup: Add your Google reviews link',
      steps: [
        'This is the one place visitors click to read your reviews on Google and to leave one of their own.',
        'Open your Google Business profile (the listing that shows your hours and reviews when someone searches your studio name).',
        'Find the link that takes people straight to your reviews. From the Google Business dashboard, look for the "Ask for reviews" or "Get more reviews" option, which gives you a short shareable review link to copy.',
        'Copy that link.',
        'Back in the Studio, click "Site Settings" in the left sidebar.',
        'Paste the link into the Google reviews field. This is what drives the "Read more on Google" link and the reviews note on the site.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h20',
      _type: 'howTo',
      title: 'Setup: Add your Instagram and Facebook',
      steps: [
        'These are the social icons in your menu and footer. You just need the web addresses of your two profiles.',
        'Open Instagram in a browser, go to your profile, and copy the address from the top of the browser. It looks like https://instagram.com/yourname.',
        'Do the same for Facebook. Open your page and copy its address from the browser.',
        'In the Studio, click "Site Settings" in the left sidebar.',
        'Paste the Instagram address into the Instagram field and the Facebook address into the Facebook field.',
        'Click Publish.',
      ],
    },
    {
      _key: 'h21',
      _type: 'howTo',
      title: 'Setup: Replace the placeholder content before launch',
      steps: [
        'The site comes pre-filled with sample content so it never looks empty while you build. Swap it for the real thing before you go live.',
        'In "Content", open "Projects" and look for the ones with SAMPLE in the title. Replace them with your real projects, or delete the samples once you have added your own.',
        'Still in "Content", open "Testimonials" and replace the seeded ones with real client words. Do not edit what clients actually said.',
        'Click through your main pages and swap any placeholder photos for your real photography. A photo is placeholder if it does not look like your own work.',
        'Take your time. You can launch with a few real projects and add more later. Just make sure nothing labeled SAMPLE is still showing when you go live.',
        'Click Publish on each thing you change.',
      ],
    },
  ],
  tips: [
    {
      _key: 't1',
      _type: 'tip',
      tone: 'primary',
      heading: 'The most important thing to know',
      body: `Nothing goes live until you click the blue Publish button. You can edit any field, take a break, come back tomorrow, and the draft just sits there waiting. Only Publish pushes it to the real site.\n\nAfter you publish, the live site rebuilds in about 1 to 3 minutes. If you do not see the change right away, give it a moment and refresh.`,
    },
    {
      _key: 't2',
      _type: 'tip',
      tone: 'default',
      heading: 'Photo tips',
      body: `Upload photos at least 2,000 pixels wide. The site handles resizing automatically, but it cannot make a small photo look better than it is.\n\nAfter uploading, click the image in the editor to set the focal point. A small crosshair appears. Drag it to the most important part of the photo (a face, the sofa, the lamp). When the site crops the image for smaller screens, it keeps the focal point in frame.\n\nAlways fill in the Alt text field. Write a plain description: "Living room redesign in Fishers, Indiana." This helps Google find your photos and helps visitors who use screen readers. Skip "Photo of" or "Image of" at the start, and skip anything vague like "room photo."`,
    },
    {
      _key: 't3',
      _type: 'tip',
      tone: 'default',
      heading: 'Launching in stages? Turn a section on or off',
      body: `You do not have to launch every section of the site at the same time. If the shop is not ready, or you are still photographing projects for the portfolio, you can hide those sections completely until they are ready.\n\nGo to Site Settings, click the "Section visibility" tab, and flip the toggle off for whatever you want to hide. Click Publish. After about a minute or two, that section disappears from the menu, the footer, and the home page, and its own page quietly redirects visitors to the home page instead of showing a half-built page.\n\nWhen the section is ready, come back to Site Settings, flip the toggle back on, and publish again. Everything reappears. Your drafts and published content are completely safe the whole time.\n\nThis is great for launching now and finishing things like the portfolio, shop, or press section on your own timeline.`,
    },
    {
      _key: 't4',
      _type: 'tip',
      tone: 'default',
      heading: 'Schedule a publish for later',
      body: `You do not have to publish right now. Open any document, look for the small arrow icon next to the blue Publish button, and click it. You will see a "Schedule publish" option. Pick the date and time you want the content to go live. The site rebuilds automatically at that time, no action needed on your end.\n\nYou can change or cancel the scheduled time any time before it fires.`,
    },
    {
      _key: 't5',
      _type: 'tip',
      tone: 'default',
      heading: 'Ask a question without changing anything',
      body: `If you are unsure about a field and want to leave Nathan a note, hover over the field label and click the small speech-bubble icon that appears beside it. Type your question and click Submit.\n\nNathan sees it the next time he opens the Studio. Comments stay attached to that specific field until they are resolved, so nothing gets lost in a text thread. This is the best way to flag something without accidentally changing content.`,
    },
    {
      _key: 't6',
      _type: 'tip',
      tone: 'caution',
      heading: 'SEO hints',
      body: `Some pages have an SEO Title and SEO Description field. These are what Google shows in search results, so they matter.\n\nIf you see a small amber warning next to one of those fields, it means the text is getting too long for Google to show in full. Trim it down until the warning disappears. The field itself shows you how many characters you have left.`,
    },
    {
      _key: 't7',
      _type: 'tip',
      tone: 'positive',
      heading: 'Stuck?',
      body: 'Text Nathan. He set all of this up and can fix anything quickly.',
    },
    {
      _key: 't8',
      _type: 'tip',
      tone: 'primary',
      heading: 'Before you go live: a few one-time setups',
      body: `Before the site goes live, there are a handful of one-time account setups to do. You only do each of these once. Think contact form email, newsletter signups, and your booking calendar.\n\nA couple of them hand you a key or a link at the end. When that happens, you do not paste it here. You send it to Nathan and he connects it for you. The setup how-tos below tell you exactly what to copy and when.\n\nThe purely technical launch steps, like pointing your domain at the new site and deploying it, are Nathan's job. Those are not on your plate, so do not worry about them.`,
    },
    {
      _key: 't9',
      _type: 'tip',
      tone: 'default',
      heading: 'What Nathan handles (so you do not have to)',
      body: `A few launch pieces are purely technical, and Nathan takes care of all of them:\n\nPointing your domain and DNS at the new site, so reiddesignllc.com lands here. Setting the environment keys, which are the connection details for the services above. Deploying the site, which is the actual act of pushing it live. And setting up analytics so you can see your visitor numbers.\n\nThese are handled. None of them are your job, and there is nothing for you to set in this Studio for any of them.`,
    },
  ],
};

// ─── studioNotes document ────────────────────────────────────────────────────
// Verbatim content from studio/components/BusinessOverview.tsx (before migration).

const studioNotesDoc = {
  _id: 'studioNotes',
  _type: 'studioNotes',
  businessSummary: `Reid Design LLC is a residential interior design studio based in Plainfield, Indiana. You serve Plainfield, Indianapolis, and the surrounding suburbs: Carmel, Fishers, Westfield, Zionsville, and Noblesville.\n\nThe studio is warm and approachable. You show prices openly. You are mid-market, not white-glove. Your entry point is a $150 in-home consultation, which keeps the door low enough for homeowners who are not sure yet.`,
  idealClient: `A homeowner in Plainfield or the Indy suburbs. Their home feels off, and they do not know where to start. They have the budget for design help but are not shopping at the luxury tier. They usually find you on Instagram or through a referral from a friend or neighbor.\n\nThey are not looking for a high-end showroom experience. They want a smart friend who happens to be a designer, someone who will be honest with them, knows what works in real houses, and will not make them feel bad about their current furniture.`,
  voiceSummary: `Warm, plain-spoken, like a smart friend who happens to be a designer. Say prices plainly, no hedging. Be specific about real rooms and real situations. Write the way you talk.\n\nNo em-dashes: that is the long dash. Use a comma or period instead. The website's style guide skips them entirely.\n\nStop when you are done: end the paragraph. Do not add a closing sentence that restates the point. Two sentences that say the same thing is one sentence too many.`,
  wordsToAvoid: ['transformative', 'curated', 'elevated', 'tailored', 'investment in your space'],
};

// ─── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  await client.createOrReplace(studioGuideDoc);
  console.log('[ok] seeded studioGuide');

  await client.createOrReplace(studioNotesDoc);
  console.log('[ok] seeded studioNotes');

  console.log('[ok] seeded studioGuide + studioNotes');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

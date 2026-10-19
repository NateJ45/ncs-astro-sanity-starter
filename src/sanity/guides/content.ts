// =============================================================================
// Help & Guide content — plain-language walkthroughs for the site's owner
// =============================================================================
// PORTS.md card 41. This is DATA, not code: each guide is a list of typed
// blocks, rendered read-only by GuideView and grouped in the desk by category.
//
// WHY IT LIVES IN THE REPO. Guides held as Sanity documents can be deleted by
// the person who most needs them, do not travel with a fork, and are empty
// until somebody remembers to seed them. In the repo they cannot be lost and
// every fork inherits them with the code.
//
// ── THIS IS A TEMPLATE. REWRITE IT PER PROJECT. ─────────────────────────────
// What follows is the generic set: true of any site built on this starter, and
// therefore not very useful to any particular client. A real project replaces
// the wording with ITS jobs, in ITS language, named after the things that
// actually exist in ITS Studio. The stonesteps-50k fork is the worked example:
// twelve guides about race dates, results and trekkers, none of which are here.
//
// Two things to keep when you rewrite:
//   1. The reassurance first. "You cannot break the live site by editing" is
//      the single most useful sentence in the whole handbook.
//   2. The rebuild delay. Every static site owner's first support question is
//      "I published and nothing happened".
//
// ── EDITING CONVENTIONS ─────────────────────────────────────────────────────
//   - **double asterisks** for a concept worth emphasis.
//   - `backticks` for a THING YOU CLICK. Renders as a small button-look chip,
//     so a step can be skimmed for its clickable part.
//   - _underscores_ for a light aside.
//   - No em-dashes. Commas, or "and".
//   - Define any jargon in plain words the first time it appears.
//   - src/lib/studio-guides.test.ts enforces the structural half of this.
// =============================================================================

export type DiyLevel = 'self' | 'ask' | 'mixed';

/** Where a "Where in the Studio" breadcrumb can link to. */
export type PathLink = { doc: string; type?: string } | { pane: string } | { tool: string };

export type GuideBlock =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'path'; items: string[]; link?: PathLink }
  | {
      kind: 'callout';
      tone?: 'primary' | 'positive' | 'caution' | 'critical' | 'default';
      title?: string;
      text: string;
    }
  | { kind: 'seealso'; items: string[] };

/** Names the prose refers to. Replace these, do not hardcode them in guides. */
export const SITE = {
  /** Who the owner should ask when a guide does not cover it. */
  contactName: 'your developer',
};

export const GUIDE_CATEGORIES = [
  'Start here',
  'Pages and words',
  'Pictures',
  'Housekeeping',
] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

export interface Guide {
  slug: string;
  category: GuideCategory;
  title: string;
  icon: string;
  lead: string;
  diy: DiyLevel;
  body: GuideBlock[];
  /**
   * Optional short clip of the job being done (PORTS.md card 115). Shows under
   * "Watch how it is done" on Home and in the Site Guide; with no clips anywhere
   * the row hides itself. Either a file in public/ (record the screen, save as
   * MP4, put it at public/guides/<slug>.mp4 and write "/guides/<slug>.mp4"), or
   * a YouTube (unlisted is fine) or Vimeo link. Keep clips under two minutes.
   */
  video?: string;
}

export const guides: Guide[] = [
  {
    slug: 'start-here',
    category: 'Start here',
    title: 'Start here: how this all works',
    icon: '👋',
    lead: 'Two minutes that make everything else make sense.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'The Studio and the website are two different things' },
      {
        kind: 'p',
        text: 'What you are looking at now is the **Studio**. It is private, and it is where the website gets edited. The **website** is what your visitors see. You change things here, and they appear on the website a few minutes later.',
      },
      { kind: 'h', text: 'You cannot break the website by editing' },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Nothing is live until you press Publish.',
        text: 'While you type you are editing a private **draft**. The public website does not change at all until you click `Publish`. So open things, click around, and only publish when it looks right. If you make a mess and have not published, close the tab and walk away.',
      },
      { kind: 'h', text: 'How a change reaches the website' },
      {
        kind: 'steps',
        items: [
          'Open the thing you want to change from the menu on the left.',
          'Edit the boxes. Your typing saves itself as a draft as you go.',
          'When it looks right, click the `Publish` button at the bottom right.',
          'Wait two or three minutes. The website rebuilds itself and your change appears.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Give it a couple of minutes.',
        text: 'The website does not change the instant you publish. It is built in advance for speed, so it has to rebuild in the background. Publish, go and do something else, then refresh the page you changed.',
      },
      { kind: 'seealso', items: ['Change the words on a page'] },
    ],
  },

  {
    slug: 'edit-a-page',
    category: 'Pages and words',
    title: 'Change the words on a page',
    icon: '📄',
    lead: 'Every page is a stack of blocks. You edit the blocks.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'How a page is built' },
      {
        kind: 'p',
        text: 'A page is a stack of **sections**, one on top of the other. You edit what is inside a section. You do not have to think about colours or spacing: the design decides those from where the section sits on the page, which is why the site stays consistent no matter who edits it.',
      },
      { kind: 'h', text: 'Seeing it as you type' },
      {
        kind: 'steps',
        items: [
          'Click `Presentation` in the bar at the top of the Studio.',
          'Pick the page on the left. The real page appears beside it.',
          'Click any words on the page to jump to the box that holds them.',
          'Type. The page updates as you go.',
          'Publish when it reads right.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The preview shows your draft.',
        text: 'What you see in Presentation is your unpublished draft, not the live site. That is the point: you see the change before anyone else does.',
      },
    ],
  },

  {
    slug: 'add-a-page',
    category: 'Pages and words',
    title: 'Add a new page',
    icon: '➕',
    lead: 'And the one thing to get right before you publish it.',
    diy: 'self',
    body: [
      {
        kind: 'steps',
        items: [
          'Open `Pages` in the menu, then the `+` button.',
          'Pick a starting point: `Simple page`, `Landing page`, `Questions page` or `Blank page`. The guide on page templates says what each one gives you.',
          'Give it a title. The **slug**, which is the part of the web address after the slash, is generated from it.',
          'Replace the example text, and add or remove sections until it says what you want.',
          'Publish.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Think about the slug before you publish, not after.',
        text: 'The slug becomes the page address. Changing it later breaks every link anyone has saved or shared. If you do have to change one, see the guide on renaming.',
      },
      {
        kind: 'p',
        text: '_Some slugs are reserved because a built-in page already uses them. The Studio will tell you if you pick one._',
      },
      {
        kind: 'seealso',
        items: ['Start a page from a template', 'Rename a page without breaking links'],
      },
    ],
  },

  {
    slug: 'page-templates',
    category: 'Pages and words',
    title: 'Start a page from a template',
    icon: '🧩',
    lead: 'A new page can start with its sections already in place.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'When you make a new page the Studio asks where to start. A **template** is a page that is already laid out, with example text in every box, so you are filling in rather than starting from nothing.',
      },
      {
        kind: 'bullets',
        items: [
          '`Simple page`: a heading and some text. Right for most pages.',
          '`Landing page`: a banner, a picture with text, three numbers, a quote and a band with a button. Good for one event, one offer or one campaign.',
          '`Questions page`: questions and answers, then a way to ask more.',
          '`Blank page`: no sections at all. Add your own with `+ Add item`.',
        ],
      },
      { kind: 'h', text: 'Replace every line that starts "Example:"' },
      {
        kind: 'p',
        text: 'Every piece of example text starts with the word **Example:**, so it is easy to spot. Type over it with your own words. Any section that still has some shows a small yellow warning beside it, so nothing example-shaped goes live by accident.',
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'A template is only a starting point.',
        text: 'Once the page is made it is yours. Add, remove and drag sections exactly as on any other page; the template does not come back and change anything.',
      },
      {
        kind: 'seealso',
        items: ['Add a new page', 'Reuse a section on other pages'],
      },
    ],
  },

  {
    slug: 'reuse-sections',
    category: 'Pages and words',
    title: 'Reuse a section on other pages',
    icon: '♻️',
    lead: 'Build a section once, then drop it onto any page as a copy.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'A **saved section** is a section (or a group of sections that belong together, like a banner, a picture with text and a call to action) kept so you can add it again. Saved sections live under `Content`, then `Saved sections`.',
      },
      { kind: 'h', text: 'Save one' },
      {
        kind: 'steps',
        items: [
          'Open the page that has the section you like.',
          'Open the menu next to `Publish` and choose `Save a section as preset...`.',
          'Pick the section, give it a name you will recognise, and save.',
          'To keep several sections together, open the saved section under `Saved sections` and add more sections to it with `+ Add item`. Then publish it.',
        ],
      },
      { kind: 'h', text: 'Add one to a page' },
      {
        kind: 'steps',
        items: [
          'Open the page and scroll to its sections.',
          'Click `Insert a saved section` under the list.',
          'Pick one and click `Add a copy`. It goes at the bottom of the page; drag it where you want it.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'A copy is yours to change.',
        text: 'Changing a copied section on one page never changes the saved section or any other page. If you want one section that stays the same everywhere, use a synced section instead.',
      },
      {
        kind: 'p',
        text: '_The `+ Add item` menu opens on pictures of every kind of section. Type in its search box to find one by name, or switch it to a plain list with the buttons at the top._',
      },
      { kind: 'seealso', items: ['Keep a section the same on every page'] },
    ],
  },

  {
    slug: 'synced-sections',
    category: 'Pages and words',
    title: 'Keep a section the same on every page',
    icon: '🔗',
    lead: 'Edit it once and every page that uses it changes.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'A **synced section** shows a saved section, live. It holds no words of its own: the words live in the saved section. Change the saved section, publish it, and every page using it changes together. Good for a band that must say the same thing everywhere, like opening times or a "Get in touch" strip.',
      },
      { kind: 'h', text: 'Add one' },
      {
        kind: 'steps',
        items: [
          'Make and publish the saved section first (see the guide on reusing sections).',
          'Open a page and click `Insert a saved section` under its sections.',
          'Pick the saved section and click `Add synced`.',
          'In the sections list it shows as **Synced:** and the saved section name.',
        ],
      },
      { kind: 'h', text: 'Change it everywhere' },
      {
        kind: 'steps',
        items: [
          'Go to `Content`, then `Saved sections`, and open the one you want to change.',
          'Edit it, then `Publish`.',
          'Every page that shows it updates when the website rebuilds, in a few minutes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Changing it changes it everywhere.',
        text: 'That is the point, but check which pages use it before you rewrite it. If one page needs different words, remove the synced section from that page and add a copy instead.',
      },
      { kind: 'seealso', items: ['Reuse a section on other pages'] },
    ],
  },

  {
    slug: 'rename-a-page',
    category: 'Pages and words',
    title: 'Rename a page without breaking links',
    icon: '↪️',
    lead: 'Anyone who saved the old address should still arrive.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Changing a page address breaks every link to it: search results, other people’s websites, a printed flyer. A **redirect** sends the old address to the new one so nobody lands on an error.',
      },
      {
        kind: 'steps',
        items: [
          'Change the slug on the page and publish.',
          'Open `Redirects (old links)` in the menu.',
          'Add one: the old address in `From`, the new one in `To`.',
          'Publish that too.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Redirects cost nothing to keep.',
        text: 'There is no reason to ever delete one. An old redirect is a visitor who still arrives.',
      },
    ],
  },

  {
    slug: 'images-and-alt',
    category: 'Pictures',
    title: 'Add or change a picture',
    icon: '📷',
    lead: 'And write the one line that describes it.',
    diy: 'self',
    body: [
      {
        kind: 'steps',
        items: [
          'Open the page and find the section holding the picture.',
          'Click it, then `Replace`, and choose a new one.',
          'Fill in `Alt text`. See below, it matters.',
          'Publish.',
        ],
      },
      { kind: 'h', text: 'What alt text is' },
      {
        kind: 'p',
        text: 'One plain sentence describing what is in the picture, for somebody who cannot see it. It is read aloud by screen readers, shown if the image fails to load, and read by Google. Describe what is happening, not the file: "a full workshop with people at long tables" rather than "IMG_4471".',
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Do not shrink pictures before uploading.',
        text: 'Upload the biggest version you have. The site resizes every image itself and sends each visitor the size that suits their screen, so a large original gives a better result than one you shrank first.',
      },
    ],
  },

  {
    slug: 'menus-and-footer',
    category: 'Housekeeping',
    title: 'Change the menu or the footer',
    icon: '🧭',
    lead: 'The links across the top and along the bottom.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Site Settings'],
        link: { doc: 'siteSettings' },
      },
      {
        kind: 'p',
        text: 'The header menu and the footer columns both live in Site Settings. Drag rows to reorder them, and use the `...` menu on a row to remove one.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'A long menu is a worse menu.',
        text: 'Every item you add makes the others harder to find, and the header runs out of room on a phone before it does on your screen. If something has to go in, consider what comes out.',
      },
    ],
  },

  {
    slug: 'seo-fields',
    category: 'Housekeeping',
    title: 'What the SEO boxes do',
    icon: '🔍',
    lead: 'The title and description Google shows.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Each page has an **SEO title** and **SEO description**. They are not shown on the page itself. They are what appears in a search result and in the little card when somebody shares the link.',
      },
      {
        kind: 'bullets',
        items: [
          'Leave them empty and the page title is used, which is usually fine.',
          'Write a description as a sentence to a person, not a list of keywords.',
          'The counter under the box turns amber when it is long enough that Google will cut it off.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Google decides in the end.',
        text: 'These are strong hints, not instructions. Google sometimes shows its own wording if it thinks that answers the search better.',
      },
    ],
  },

  {
    slug: 'housekeeping',
    category: 'Housekeeping',
    title: 'The occasional tidy-up',
    icon: '🧹',
    lead: 'Worth ten minutes once or twice a year.',
    diy: 'self',
    body: [
      {
        kind: 'bullets',
        items: [
          'Look for **unpublished drafts**: somebody started an edit and did not finish, and nothing is live until it is published.',
          'Read the pages you have not touched in a year. Prices, names and opening hours go stale quietly.',
          'Check the links that leave your site still work. Other people move their pages without telling you.',
          'Look at the site on a phone. Most of your visitors are on one.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Never use "Remove field" in the Studio.',
        text:
          'It appears when a page has a box the design no longer uses. It deletes that box across EVERY page at once and cannot be undone without restoring a backup. If you see it, leave it and ask ' +
          SITE.contactName +
          '.',
      },
    ],
  },
];

// ── Studio kit helpers (PORTS.md card 110) ───────────────────────────────────
// Appended rather than written into the list above, so a site rewriting its
// guides keeps these two by default. Both describe kit features, not the site.
guides.push(
  {
    slug: 'home-page',
    category: 'Start here',
    title: 'What the Home page shows you',
    icon: '⌂',
    lead: 'Home opens first every time. Here is what each card is for, top to bottom.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Home is a dashboard: it changes nothing by itself. Every card points somewhere, and the buttons take you straight there.',
      },
      {
        kind: 'bullets',
        items: [
          '**Coming up**: pages set to publish by themselves, soonest first, with the time in plain words. To schedule one, open it, fill in **Publish automatically at** under Publishing, and leave it as a draft. `Open` takes you to it.',
          '**Fix-it list**: the things the Checkup found, by name, like a picture with no description or a page with no Google description. `Edit` opens the page at the right spot. `See the whole list` opens the Checkup.',
          '**Visitors**: how many people visited in the last 7 days against the week before, a small chart of the last four weeks, the most-read pages and how people found the website. Hover a bar to see that day.',
          '**Your pages**: every page you can change, in groups, one click each. Pages you build yourself are added to it automatically.',
          '**Watch how it is done**: short videos of common jobs, when there are any. `Watch` plays one without leaving the Studio.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Visitors says "not set up yet"?',
        text:
          'The numbers come from Cloudflare, which counts visits without cookies. ' +
          SITE.contactName +
          ' switches it on once, and after that it fills in by itself.',
      },
      { kind: 'seealso', items: ['The line under the top bar', 'Start here: how this all works'] },
    ],
  },
  {
    slug: 'website-status',
    category: 'Start here',
    title: 'The line under the top bar',
    icon: '🕒',
    lead: 'A quiet answer to "is my change on the website yet?", wherever you are in the Studio.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Under the top bar there is a thin line that says how the website is doing. It reads the same thing as the **Is it live?** card on Home, so the two always agree.',
      },
      {
        kind: 'bullets',
        items: [
          '**Website up to date**: everything you have published is on the website.',
          '**Updating the website, about 3 minutes**: you published something and the website is rebuilding. The minutes count down. You do not need to wait for it.',
          '**The website update is taking longer than usual**: it has been a while. Nothing is lost, your change is safe and published. Click `Details`, and if it still says this an hour later, ask ' +
            SITE.contactName +
            '.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'No line at all?',
        text:
          'The line only appears once the website has said when it was last built. On a brand new site, or while ' +
          SITE.contactName +
          ' is working on it, it can be missing. That is fine.',
      },
      { kind: 'seealso', items: ['Start here: how this all works'] },
    ],
  },
  {
    slug: 'help-panel',
    category: 'Start here',
    title: 'Help for this page',
    icon: '💡',
    lead: 'Help beside whatever you are editing, without leaving it.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'When something is open for editing, click `Help for this page` at the top of it (it can also sit in the menu with three dots). A panel opens beside the boxes you are typing in.',
      },
      {
        kind: 'bullets',
        items: [
          '**Worth a look** lists photos with no description, empty sections and links that go nowhere, and anything the Checkup found on this page. It updates as you type. None of it stops you publishing.',
          '**How to** shows the Site Guide steps for this kind of page, so you can follow them while you work.',
        ],
      },
      {
        kind: 'p',
        text: 'Close it with the cross at the top of the panel. It never changes anything on the page.',
      },
      { kind: 'seealso', items: ['Change the words on a page'] },
    ],
  },
);

// ── Workflow tools (PORTS.md card 117) ───────────────────────────────────────
// Appended like the kit helpers above, so a site rewriting its guides keeps them.
guides.push(
  {
    slug: 'share-a-preview',
    category: 'Pages and words',
    title: 'Show someone a page before it goes live',
    icon: '↗',
    lead: 'A private link to your draft that works for a few days, no login needed.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Sometimes you want a second pair of eyes on a page before you publish it. **Share a preview** makes a private link that shows your unpublished changes to that one page. The person opening it does not need a Studio login.',
      },
      {
        kind: 'steps',
        items: [
          'Open the page you are working on.',
          'Open the menu next to `Publish` and choose `Share a preview`.',
          'Pick how long the link should work: 1, 3, 7 or 14 days.',
          'Click `Make the link`, then `Copy`, and paste it into an email or a message.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The link is shown once.',
        text: 'Copy it straight away. If you lose it, make a new one; the old one keeps working until its date unless you stop it.',
      },
      { kind: 'h', text: 'Stop a link early' },
      {
        kind: 'p',
        text: 'Open `Share a preview` on the same page. Under **Links for this page that still work**, click `Stop this link`. Anyone who opens it after that sees the published page instead.',
      },
      { kind: 'seealso', items: ['Change the words on a page'] },
    ],
  },
  {
    slug: 'messages',
    category: 'Housekeeping',
    title: 'Read messages from the website',
    icon: '@',
    lead: 'Everything people send through the forms, in one list.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Click `Messages` in the top bar. Every form on the website lands here as well as in email, newest first. Click a name to read the message.',
      },
      {
        kind: 'bullets',
        items: [
          '**New**: nobody has dealt with it yet.',
          '**Needs a person**: someone has to answer it. A message whose email did not go out starts here, because nobody has seen it anywhere else.',
          '**Replied**: answered. Mark it so nobody answers twice.',
          '**Spam**: junk. Leave it there.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Prayer requests stay private.',
        text: 'A prayer request shows only that one arrived and when. Its words go to the email address set on the form and are not kept or shown here.',
      },
      {
        kind: 'p',
        text: 'If the page says **Forms are not set up yet**, the website forms have not been switched on. Ask for help.',
      },
    ],
  },
);

// ── Custom code (PORTS.md card 121) ──────────────────────────────────────────
// Appended like the blocks above, so a site rewriting its guides keeps it.
guides.push({
  slug: 'add-a-widget',
  category: 'Pages and words',
  title: 'Add a widget from an AI or a website',
  icon: '</>',
  lead: 'A countdown, a sign-up box, a map or a calculator, pasted in as code.',
  diy: 'mixed',
  body: [
    {
      kind: 'p',
      text: 'Sometimes you want something on a page that the Studio does not have a block for: a countdown to Vacation Bible School, a small sign-up gadget, a map, a calculator. You can ask an AI chat (ChatGPT, Claude, Gemini) to write it, or copy the code a website gives you, and paste it into a **Custom code or embed** section.',
    },
    { kind: 'h', text: 'What to ask the AI for' },
    {
      kind: 'p',
      text: 'Describe the widget, then add this sentence: _"Give me a single self-contained HTML snippet with inline CSS and JS, no external build step."_ That gets you one block of code you can paste in one go, instead of several files.',
    },
    { kind: 'h', text: 'Put it on the page' },
    {
      kind: 'steps',
      items: [
        'Open the page and click `+ Add item` where you want the widget.',
        'Pick `Custom code or embed`.',
        'Give it a headline if you like, then paste the whole snippet into `Custom code`. The count under the box tells you it all went in.',
        'Open `Presentation` and look at the page. The widget runs in the preview exactly as it will on the website.',
        'If it looks right, click `Publish`.',
      ],
    },
    {
      kind: 'callout',
      tone: 'positive',
      title: 'It runs in its own box.',
      text: 'The code cannot change the rest of the website, and it cannot see anything private, such as your Studio login. The box grows to fit what is inside it. Links in it open in a new tab.',
    },
    {
      kind: 'callout',
      tone: 'primary',
      title: 'It cannot restyle the rest of the site.',
      text:
        'Colours and fonts inside the box start out matching the website, but the code only ever styles itself. To change how the whole website looks, ask ' +
        SITE.contactName +
        ': design changes go through the theme.',
    },
    { kind: 'h', text: 'If it does not work' },
    {
      kind: 'bullets',
      items: [
        'Ask the AI to fix it, and tell it the code runs **inside a sandboxed iframe with no access to cookies, localStorage or the parent page**. Most widgets do not need any of those.',
        'A yellow warning under the box means the code tries to reach outside it. In the box that is blocked, so that part will not work.',
        'A widget cannot remember things between visits (it has no storage). For sign-ups, ask for a version that sends to a form service, or use one of the site forms.',
      ],
    },
    { kind: 'h', text: 'The "Runs directly on the page" switch' },
    {
      kind: 'callout',
      tone: 'caution',
      title: 'Leave it off unless a provider you trust needs it.',
      text: 'Some giving or booking services give you code that only works on the page itself. The switch lets it. With it on, the code can do anything the website can, including reading what a signed-in editor is doing, so never turn it on for code you are not sure about. The Checkup lists every page where it is on.',
    },
    { kind: 'seealso', items: ['Change the words on a page'] },
  ],
});

// ── Private pages and link checks (PORTS.md card 122) ──────────────────────
// Appended like the blocks above, so a site rewriting its guides keeps them.
guides.push(
  {
    slug: 'make-a-page-private',
    category: 'Pages and words',
    title: 'Make a page private',
    icon: '#',
    lead: 'Hide a page from Google and the menus, or put it behind a password.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'There are two ways to keep a page quiet. Pick the one that fits.',
      },
      { kind: 'h', text: 'Hidden: anyone with the link can open it' },
      {
        kind: 'p',
        text: 'Good for a page you only send to some people, like a sign-up form for one event. It stays off Google, the menus and the site search, but it is not secret.',
      },
      {
        kind: 'steps',
        items: [
          'Open the page under **Pages**, **Custom pages**.',
          'Click the `Search & sharing` tab.',
          'Turn on `Hide this page from Google and the menus`.',
          'Click `Publish`. Share the page address with the people who need it.',
        ],
      },
      { kind: 'h', text: 'Private: only people with the password can see it' },
      {
        kind: 'p',
        text: 'Good for things meant for members only. Visitors are asked for a password before they see anything.',
      },
      {
        kind: 'steps',
        items: [
          'Go to **Pages**, **Private pages (password)** and click the `+` button.',
          'Give it a title and click `Generate` beside the web address.',
          'Add sections the same way as any other page.',
          'Under **Only people with the password can see this**, type a password and click `Save password`. Write it down somewhere safe: nobody can look it up later.',
          'Click `Publish`. Copy the address shown under the password and share it, with the password, with the people who need it.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Pictures are less private than words.',
        text: 'The words on a private page are locked away. Pictures are stored where someone determined could find them, so keep anything truly sensitive as text, and never put photos of children on a page because it is private.',
      },
      {
        kind: 'bullets',
        items: [
          '**Changing the password** asks everyone for the new one. Use it if someone should no longer have access.',
          'Someone who types the right password is not asked again on that device for two weeks.',
          'Too many wrong tries and the page asks the person to wait a while.',
          'Private pages change the moment you publish. There is no rebuild to wait for.',
        ],
      },
      {
        kind: 'seealso',
        items: ['Show someone a page before it goes live', 'What the SEO boxes do'],
      },
    ],
  },
  {
    slug: 'keep-links-working',
    category: 'Housekeeping',
    title: 'Keep links working',
    icon: '~',
    lead: 'What the Checkup says about links and headings, and how to fix each one.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Once a week the website checks every link to another website. Anything that has stopped working shows in the `Checkup`, with an `Edit` button that opens the page it is on.',
      },
      { kind: 'h', text: 'What it looks for' },
      {
        kind: 'bullets',
        items: [
          '**A link to another website that no longer works**: change it to the right address, or take it out.',
          '**A link to a page that is not on the website**: pick the page from the list instead of typing its address.',
          '**Links that do not say where they go**: change "click here" or "read more" to words like "Our service times". People using screen readers often hear the links on their own.',
          '**A web address typed into the text**: select some words, click the link button and paste the address there instead.',
          '**Headings out of order**: use the headings in order, the bigger one first, then the next size down under it. Do not pick a size just for how it looks.',
          '**A page nobody can click through to**: add it to a menu or link to it from another page. If that is on purpose, hide it from Google and the menus.',
          '**A Google title or description that gets cut off**: shorten it so the important words come first.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Some websites refuse to be checked.',
        text: 'A few sites, like some social media pages, turn away automatic checks. Those are not reported as broken. Open them yourself now and then.',
      },
      { kind: 'seealso', items: ['Make a page private', 'What the SEO boxes do'] },
    ],
  },
);

/**
 * Which guides "Help for this page" shows for each document type (kit.config.ts
 * guide.forType, PORTS.md card 110). '*' is the fallback for anything unlisted.
 * A site that rewrites its guides rewrites this map with them.
 */
export const GUIDES_FOR_TYPE: Record<string, string[]> = {
  '*': ['edit-a-page', 'help-panel'],
  page: [
    'edit-a-page',
    'share-a-preview',
    'rename-a-page',
    'seo-fields',
    'make-a-page-private',
    'add-a-widget',
  ],
  privatePage: ['make-a-page-private', 'edit-a-page'],
  homePage: ['edit-a-page', 'images-and-alt', 'seo-fields'],
  siteSettings: ['menus-and-footer', 'website-status', 'add-a-widget'],
  businessInfo: ['menus-and-footer'],
  redirect: ['rename-a-page'],
};

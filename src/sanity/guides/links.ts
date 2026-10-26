// Safe to edit by hand
// =============================================================================
// Site Guide: short links and QR codes (PORTS.md card 171)
// =============================================================================
// Appended to the guides in content.ts (guides.push). Same conventions as
// content.ts: `backticks` for a thing you click, **bold** for a concept, no
// em-dashes, US spelling, the Studio's own names. src/lib/studio-guides.test.ts
// checks the structure.
// =============================================================================

import type { Guide } from './content.ts';
import { site } from '../../data/site.ts';

export const linkGuides: Guide[] = [
  {
    slug: 'short-links',
    category: 'Pages and words',
    title: 'Make a short link like /spring',
    icon: 'link',
    lead: 'A short address for a flyer, a card or a slide, that goes wherever you point it.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: `A **short link** is one easy word after the website's address, like **${site.domain}/spring**. People type it from a flyer or scan it as a QR code, and it takes them to a page on the website or to another website, such as a sign-up sheet.`,
      },
      { kind: 'h', text: 'Make one' },
      {
        kind: 'steps',
        items: [
          'Open `Quick update` and press `Make a short link`. (It is also under `Pages`, then `Short links`.)',
          'Type the word under `Short address`, like `spring` or `signup`. The full address people will type shows underneath.',
          'Under `Where does it go?`, pick `A page on this website` and choose the page, or pick `Another website` and paste its address.',
          'Leave `For now` picked unless the link will never change.',
          'If it is for one event, pick a `Last day`. The link stops working at the first website update after that day.',
          'Press `Publish`. The short link works once the website updates, usually within a few minutes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The Studio checks the word for you.',
        text: 'If a page, another short link or a part of the website already uses that word, a red note says so and the link cannot be published. Pick another word, like `spring-2027`.',
      },
      { kind: 'h', text: 'Change or end one' },
      {
        kind: 'bullets',
        items: [
          'To send it somewhere else next year, open it, pick a new page or address, and publish. Printed flyers and QR codes keep working.',
          'To end it now, set the `Last day` to yesterday and publish, or delete it.',
          'If you rename a page, a short link to it follows the page by itself.',
        ],
      },
      { kind: 'seealso', items: ['Make a QR code for print', 'Keep links working'] },
    ],
  },
  {
    slug: 'qr-codes',
    category: 'Pages and words',
    title: 'Make a QR code for print',
    icon: 'image',
    lead: 'A code people scan with their phone camera, ready to print.',
    diy: 'self',
    body: [
      {
        kind: 'steps',
        items: [
          'Open the short link or the page you want people to reach. It must be published.',
          'Open the menu next to `Publish` (the small arrow) and press `QR code`.',
          'Press `Download SVG` for anything printed, or `Download PNG` for Word, Canva or a slide.',
          'Scan it with your own phone before printing a whole run.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Use a short link for anything printed.',
        text: 'A code made from a short link keeps working when you point the short link somewhere new, or rename the page. A code made from a page holds that page’s full address.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Is the website on its own address yet?',
        text: 'If the website is still on a temporary address, codes made now point there. Make them again after the move.',
      },
      {
        kind: 'p',
        text: 'Print the code at least 2 cm (about an inch) wide, with some white space around it.',
      },
      { kind: 'seealso', items: ['Make a short link like /spring'] },
    ],
  },
];

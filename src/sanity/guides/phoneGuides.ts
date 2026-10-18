// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Site Guide entries for the Studio app and earlier versions (PORTS.md card 124)
// =============================================================================
// Three guides every site with the Studio kit shares: putting the Studio on a
// phone's home screen, posting a photo from the phone, and going back to an
// earlier version. Kept apart from the site's own content.ts (which every fork
// rewrites) so a fork keeps them by keeping one line there:
//
//     guides.push(...phoneGuides(SITE.contactName));
//
// Same conventions as content.ts: `backticks` for a thing you click, **bold**
// for a concept, no em-dashes. "See also" names only these three, so the list
// works whatever a site calls its other guides.
// =============================================================================

import type { Guide } from './content.ts';

export const PHONE_GUIDE_SLUGS = ['studio-on-your-phone', 'post-a-photo', 'earlier-versions'];

export function phoneGuides(contactName: string): Guide[] {
  return [
    {
      slug: 'studio-on-your-phone',
      category: 'Start here',
      title: "Put the Studio on your phone's home screen",
      icon: '▢',
      lead: 'An icon on your phone that opens the Studio like an app, ready for a quick update.',
      diy: 'self',
      body: [
        {
          kind: 'p',
          text: 'You only do this once on each phone. Afterwards the Studio opens from its own icon, full screen, without the browser around it. Sign in the first time and it remembers you.',
        },
        { kind: 'h', text: 'On an iPhone or iPad' },
        {
          kind: 'steps',
          items: [
            'Open **Safari** (it has to be Safari) and go to the website address with **/studio** on the end.',
            'Sign in.',
            'Tap the `Share` button: the square with an arrow pointing up, at the bottom of the screen (at the top on an iPad).',
            'Scroll down and tap `Add to Home Screen`.',
            'Keep the name or change it, then tap `Add`.',
          ],
        },
        { kind: 'h', text: 'On an Android phone' },
        {
          kind: 'steps',
          items: [
            'Open **Chrome** and go to the website address with **/studio** on the end.',
            'Sign in.',
            'Tap the menu with three dots at the top right.',
            'Tap `Install app` (on some phones it says `Add to Home screen`), then `Install`.',
          ],
        },
        {
          kind: 'callout',
          tone: 'primary',
          title: 'No signal?',
          text: "If you open it with no connection, it says you're offline instead of showing an error. Your changes are saved when you're back online.",
        },
        {
          kind: 'p',
          text:
            'To take it off, press and hold the icon and choose `Remove`, just like any app. It does not sign anyone else out. Stuck? Ask ' +
            contactName +
            '.',
        },
        { kind: 'seealso', items: ['Post a photo from your phone'] },
      ],
    },
    {
      slug: 'post-a-photo',
      category: 'Pictures',
      title: 'Post a photo from your phone',
      icon: '◉',
      lead: 'Take a photo, describe it, and put it in a gallery or a new post, all from your phone.',
      diy: 'self',
      body: [
        {
          kind: 'steps',
          items: [
            'Open `Quick update` in the top bar and tap `Post a photo`.',
            'Tap `Take a photo` to use the camera, or `Choose from your photos`.',
            'Under **Describe the photo**, say what is in it, for someone who cannot see it: "The children\'s choir singing at the Christmas service", not "IMG_2041".',
            'Pick where it goes: a gallery on one of the pages, or a new post.',
            'Tap `Save as a draft`, then `Open it to check and publish`.',
            'Look it over and press `Publish`.',
          ],
        },
        {
          kind: 'callout',
          tone: 'positive',
          title: 'Nothing goes on the website by itself.',
          text: 'The photo is saved as a draft. It only appears on the website when you press Publish.',
        },
        {
          kind: 'p',
          text: 'Big photos are made smaller on the way up so they load quickly, and the hidden details a phone adds to a photo, such as where it was taken, are left behind.',
        },
        {
          kind: 'callout',
          tone: 'caution',
          title: 'Photos of people',
          text: 'Only post photos of children with their parent or guardian happy for you to, and never with their names.',
        },
        {
          kind: 'seealso',
          items: ["Put the Studio on your phone's home screen", 'Go back to an earlier version'],
        },
      ],
    },
    {
      slug: 'earlier-versions',
      category: 'Housekeeping',
      title: 'Go back to an earlier version',
      icon: '↺',
      lead: 'Put a page back the way it was on any night in the last two weeks.',
      diy: 'mixed',
      body: [
        {
          kind: 'p',
          text: "The Studio's own history keeps the last three days. The website also keeps a backup of every night for two weeks. **Earlier versions** reaches into those backups.",
        },
        {
          kind: 'steps',
          items: [
            'Open the page you want to go back on.',
            'Open the menu with three dots at the top of it and choose `Earlier versions`.',
            'Tap `Look for this page in the backups`. It takes two or three minutes; you can keep working.',
            'Each night shows which parts of the page were different then, for example "Title, Sections (6 now, 5 then)".',
            'Pick the night you want and tap `Put this version back as a draft`, then `Yes, put it back`.',
            'When it says **Done**, look the page over and press `Publish`.',
          ],
        },
        {
          kind: 'callout',
          tone: 'primary',
          title: 'Changed your mind?',
          text: 'The old version comes back as a draft, so the website does not change until you publish. To undo it, choose `Discard changes` in the menu next to Publish.',
        },
        {
          kind: 'p',
          text:
            'If the panel says it is not switched on, or the page you need is older than two weeks, ask ' +
            contactName +
            ' and say which day you want back.',
        },
        { kind: 'seealso', items: ['Post a photo from your phone'] },
      ],
    },
  ];
}

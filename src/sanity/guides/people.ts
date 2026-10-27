// Safe to edit by hand
// =============================================================================
// Site Guide: adding someone to help (the People tool, PORTS.md card 176)
// =============================================================================
// The People tool (src/sanity/people/, rules in src/lib/studio-people.ts).
// Appended to the guides in content.ts. Not PORTABLE: a site rewords it with its
// own role words (kitConfig.people.roles) and nouns ("a deacon, a secretary").
// Same conventions as content.ts: `backticks` for a thing you click, **bold**
// for a concept, no em-dashes, US spelling.
// =============================================================================

import type { Guide } from './content.ts';

export const peopleGuides = (contactName: string): Guide[] => [
  {
    slug: 'add-a-helper',
    category: 'Housekeeping',
    title: 'Add someone to help with the website',
    icon: 'people',
    lead: 'Invite a colleague or a volunteer to edit the website with you.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['People'],
        link: { tool: 'people' },
      },
      {
        kind: 'p',
        text: `\`People\` is in the top bar for **administrators** only. If you cannot see it, ask ${contactName} to check your account.`,
      },
      {
        kind: 'steps',
        items: [
          'Click `People` in the top bar.',
          'Under `Invite someone`, type their name and the email address they will sign in with.',
          'Pick what they can do: `Helper` or `Administrator`.',
          'Click `Send the invitation`. Sanity, the company that runs this editor, emails them a link.',
          'Once they accept and sign in, they appear under `Who can edit the website`.',
        ],
      },
      { kind: 'h', text: 'Helper or Administrator?' },
      {
        kind: 'bullets',
        items: [
          '**Helper**: edits pages and posts and publishes them. They see the **simple view** of the Studio, and they cannot delete anything for good (deleted things go to the Trash, where you can bring them back).',
          '**Administrator**: can do everything, including inviting people and deleting for good. Keep this for one or two people.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Not arrived?',
        text: 'Ask them to check their spam folder. Under `Waiting to accept`, `Send again` sends a fresh link, and `Cancel` stops the old one working.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'If Helper is greyed out',
        text: 'The free Sanity plan only has Administrator and Viewer (look, no editing), so there is no Helper. Invite them as an `Administrator`, and once they have accepted, turn on `Simple view` next to their name. They then see the simpler Studio from their next visit.',
      },
      { kind: 'h', text: 'Changing or removing someone' },
      {
        kind: 'p',
        text: 'This is done at sanity.io/manage: sign in, pick the website, then `Members`. Change their role there, or remove them. Removing someone never deletes what they wrote.',
      },
    ],
  },
];

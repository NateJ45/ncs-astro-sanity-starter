// Safe to edit by hand
// =============================================================================
// block-icons - the small icon set the icon cards and the steps rail offer (PORTS.md card 193)
// =============================================================================
// A neutral set of line icons (24 by 24, drawn with a stroke in `currentColor`, so an icon takes the
// text colour of the card it sits in and works in light, dark and a Feature band). The Studio's icon
// picker lists these (`BLOCK_ICONS`, read by builderSections.ts), BlockIcon.astro draws them, and
// the field that stores one is called `icon` (on NON_STEGA_FIELDS in src/lib/cms-preview.ts).
//
// A SITE WITH ITS OWN ICONS (Auburn draws painted stones): keep the field name `icon` and the shape
// of this list, and change two things, both in the site's own files:
//   1. Replace the entries below with the site's picks: `value` is the stored name (a name that
//      is no longer on the list draws nothing, it never breaks a page), `title` is what the editor
//      reads in the picker, and `paths` is the strokes (one SVG path `d` string each).
//   2. If the art is a set of image files rather than paths, swap BlockIcon.astro for a component
//      that maps `name` to the file (Auburn's StoneIcon.astro does exactly this) and leave the cards
//      and the rail alone: they only ever call <BlockIcon name={...} />.
// docs/agent/block-icons.md walks through it.
// =============================================================================

export interface BlockIcon {
  value: string;
  title: string;
  /** SVG path `d` strings on a 24 by 24 grid, stroked, not filled. */
  paths: string[];
}

export const BLOCK_ICONS: readonly BlockIcon[] = [
  {
    value: 'home',
    title: 'House (home, welcome)',
    paths: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  },
  {
    value: 'heart',
    title: 'Heart (care, support)',
    paths: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  },
  {
    value: 'star',
    title: 'Star (favorites, quality)',
    paths: ['M12 3l2.6 6 6.4.6-4.8 4.2 1.4 6.2-5.6-3.2-5.6 3.2 1.4-6.2L3 9.6 9.4 9z'],
  },
  {
    value: 'calendar',
    title: 'Calendar (dates, booking)',
    paths: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  },
  {
    value: 'clock',
    title: 'Clock (times, hours)',
    paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  },
  {
    value: 'map-pin',
    title: 'Map pin (finding us)',
    paths: [
      'M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z',
      'M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    ],
  },
  {
    value: 'phone',
    title: 'Phone (call us)',
    paths: [
      'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
    ],
  },
  { value: 'mail', title: 'Envelope (email, messages)', paths: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'] },
  {
    value: 'chat',
    title: 'Speech bubble (questions, talk)',
    paths: ['M4 5h16v11H9l-5 4z', 'M8 9h8', 'M8 12h5'],
  },
  {
    value: 'users',
    title: 'People (community, team)',
    paths: [
      'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1',
      'M16 5.5a3 3 0 0 1 0 5.5',
      'M18 14a5 5 0 0 1 3 5v1',
    ],
  },
  {
    value: 'book',
    title: 'Open book (learning, guides)',
    paths: ['M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z', 'M4 19V5', 'M9 7h7'],
  },
  {
    value: 'coffee',
    title: 'Cup (welcome, refreshments)',
    paths: [
      'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z',
      'M16 9h2a2 2 0 0 1 0 5h-2',
      'M8 3v2',
      'M12 3v2',
    ],
  },
  {
    value: 'gift',
    title: 'Gift (giving, offers)',
    paths: [
      'M4 10h16v10H4z',
      'M3 7h18v3H3z',
      'M12 7v13',
      'M12 7C9 7 8 3.5 10 3.5S12 7 12 7z',
      'M12 7c3 0 4-3.5 2-3.5S12 7 12 7z',
    ],
  },
  {
    value: 'leaf',
    title: 'Leaf (growth, nature)',
    paths: ['M5 19C5 11 10 5 20 5c0 10-6 15-14 15', 'M5 19l8-8'],
  },
  {
    value: 'tool',
    title: 'Wrench (repairs, practical help)',
    paths: ['M14.5 6a4 4 0 0 0 4.9 5L9.6 20.7a2.1 2.1 0 0 1-3-3L16 8.3A4 4 0 0 0 14.5 6z'],
  },
  {
    value: 'door',
    title: 'Open door (come in)',
    paths: ['M6 21V4h12v17', 'M4 21h16', 'M14 12h.01'],
  },
  {
    value: 'check',
    title: 'Check mark (done, included)',
    paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12.5l3 3 5-6'],
  },
] as const;

export type BlockIconName = (typeof BLOCK_ICONS)[number]['value'];

export function blockIcon(name: unknown): BlockIcon | undefined {
  return BLOCK_ICONS.find((i) => i.value === name);
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 115: Home's dashboard cards (src/lib/studio-home.ts) and the
// Checkup's Fix-it items (src/lib/studio-checkup.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  comingUp,
  fixItList,
  guidesWithVideo,
  resolvePageMap,
  todayLine,
  videoSource,
  whenWords,
} from './studio-home.ts';
import { genericRules, runCheckup, unconfirmedRule, type Doc } from './studio-checkup.ts';

// Local-time dates throughout, so the tests pass in any timezone.
const NOW = new Date(2026, 9, 18, 10, 0); // Sunday, October 18, 2026, 10:00 local
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();

describe('the dated greeting', () => {
  it('reads like the WordPress dashboard', () => {
    assert.equal(todayLine(NOW), 'Sunday, October 18');
  });
});

describe('Coming up', () => {
  it('says the time in plain words', () => {
    assert.equal(whenWords(at(18, 15), NOW), 'Today at 3:00 PM');
    assert.equal(whenWords(at(19, 9), NOW), 'Tomorrow at 9:00 AM');
    assert.equal(whenWords(at(23, 9, 30), NOW), 'Friday at 9:30 AM');
    assert.equal(whenWords(at(30, 9), NOW), 'Friday, October 30 at 9:00 AM');
    assert.equal(whenWords(at(18, 9), NOW), 'Any minute now');
    assert.equal(
      whenWords(new Date(2027, 0, 3, 9).toISOString(), NOW),
      'Sunday, January 3, 2027 at 9:00 AM',
    );
  });

  it('lists drafts soonest first, one row per document, ignoring published leftovers', () => {
    const rows = comingUp(
      [
        { _id: 'drafts.b', _type: 'page', publishAt: at(25, 9), name: 'Later' },
        { _id: 'drafts.a', _type: 'page', publishAt: at(19, 9), name: ' Sooner ' },
        { _id: 'c', _type: 'page', publishAt: at(20, 9), name: 'Published leftover' },
        { _id: 'drafts.d', _type: 'sermon', publishAt: null, name: 'No time' },
        { _id: 'drafts.e', _type: 'sermon', publishAt: 'not a date', name: 'Bad' },
      ],
      NOW,
    );
    assert.deepEqual(
      rows.map((r) => [r.id, r.name, r.when]),
      [
        ['a', 'Sooner', 'Tomorrow at 9:00 AM'],
        ['b', 'Later', 'Sunday, October 25 at 9:00 AM'],
      ],
    );
  });

  it('is empty when nothing is scheduled', () => {
    assert.deepEqual(comingUp([], NOW), []);
  });
});

describe('Fix-it list (reusing the Checkup rules)', () => {
  const docs: Doc[] = [
    {
      _id: 'page-a',
      _type: 'page',
      title: 'Plan your visit',
      hero: { asset: { _ref: 'image-abc-10x10-jpg' } },
    },
    {
      _id: 'page-b',
      _type: 'page',
      title: 'Ministries',
      seoDescription: '',
      hero: { asset: { _ref: 'image-def-10x10-jpg' } },
    },
    { _id: 'aboutPage', _type: 'aboutPage', title: 'About', note: 'Founded 1902 [confirm]' },
  ];
  const results = runCheckup(docs, [...genericRules({ seoTypes: ['page'] }), unconfirmedRule()], {
    nameOf: (d) => String(d.title),
    typeTitle: (t) => t,
    now: NOW.getTime(),
  });

  it('names each page with its own Edit link, urgent ones first', () => {
    const { rows, total, more } = fixItList(results, 10);
    assert.deepEqual(
      rows.map((r) => [r.name, r.reason, r.severity]),
      [
        ['Plan your visit', 'A picture needs a description', 'Needs doing'],
        ['Ministries', 'A picture needs a description', 'Needs doing'],
        ['Plan your visit', 'No Google description', 'Worth a look'],
        ['Ministries', 'No Google description', 'Worth a look'],
        ['About', 'Facts to confirm', 'Worth a look'],
      ],
    );
    assert.deepEqual(rows[0].target, { doc: 'page-a', type: 'page', field: 'hero' });
    assert.deepEqual(rows[2].target, { doc: 'page-a', type: 'page', field: 'seoDescription' });
    assert.equal(rows[0].targetLabel, 'Edit');
    assert.equal(total, 5);
    assert.equal(more, 0);
  });

  it('keeps the rest for the Checkup', () => {
    const { rows, more } = fixItList(results, 2);
    assert.equal(rows.length, 2);
    assert.equal(more, 3);
  });

  it('shows a site rule without items as one row, and never "For information"', () => {
    const { rows } = fixItList([
      {
        id: 'site',
        severity: 'Worth a look',
        label: '2 notices past their end date',
        detail: 'Switch them off.',
        target: { pane: 'content;announcement' },
        targetLabel: 'Open the notices',
      },
      { id: 'info', severity: 'For information', label: 'x', detail: 'y' },
    ]);
    assert.deepEqual(
      rows.map((r) => [r.name, r.targetLabel]),
      [['2 notices past their end date', 'Open the notices']],
    );
  });
});

describe('Your pages map', () => {
  const groups = [
    {
      title: 'Main pages',
      links: [
        { title: 'Home', target: { doc: 'homePage' } },
        { title: 'Plan your visit', target: { doc: 'page-visit', type: 'page' } },
      ],
    },
    { title: 'Other pages you built', listType: 'page' },
    { title: 'Empty', listType: 'nothing' },
    {
      title: 'Settings',
      links: [{ title: 'Menus', target: { doc: 'siteSettings', field: 'navItems' } }],
    },
  ];
  const docs = [
    { _id: 'page-visit', _type: 'page', name: 'Plan your visit' },
    { _id: 'page-youth', _type: 'page', name: 'Youth' },
    { _id: 'drafts.page-youth', _type: 'page', name: 'Youth group' },
    { _id: 'drafts.page-new', _type: 'page', name: 'Fall festival' },
    { _id: 'homePage', _type: 'homePage', name: 'Home' },
  ];
  const map = resolvePageMap(groups, docs);

  it('keeps the configured groups in order and drops empty ones', () => {
    assert.deepEqual(
      map.map((g) => g.title),
      ['Main pages', 'Other pages you built', 'Settings'],
    );
  });

  it('lists custom pages not already linked, one per document, by name', () => {
    assert.deepEqual(
      map[1].links.map((l) => [l.title, 'doc' in l.target ? l.target.doc : '', 'draftOnly' in l]),
      [
        ['Fall festival', 'page-new', true],
        ['Youth group', 'page-youth', false],
      ],
    );
  });
});

describe('guide videos', () => {
  it('plays files on the site and direct files inline', () => {
    assert.deepEqual(videoSource('/guides/notice.mp4'), {
      kind: 'file',
      src: '/guides/notice.mp4',
    });
    assert.deepEqual(videoSource('https://cdn.example.org/a.webm'), {
      kind: 'file',
      src: 'https://cdn.example.org/a.webm',
    });
  });

  it('turns YouTube and Vimeo links into their players', () => {
    const yt = { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' };
    assert.deepEqual(videoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), yt);
    assert.deepEqual(videoSource('https://youtu.be/dQw4w9WgXcQ'), yt);
    assert.deepEqual(videoSource('https://youtube.com/shorts/dQw4w9WgXcQ'), yt);
    assert.deepEqual(videoSource('https://vimeo.com/123456789'), {
      kind: 'embed',
      src: 'https://player.vimeo.com/video/123456789',
    });
  });

  it('opens other addresses in a new tab and refuses anything unsafe', () => {
    assert.equal(videoSource('https://www.loom.com/share/abc')?.kind, 'link');
    assert.equal(videoSource('javascript:alert(1)'), null);
    assert.equal(videoSource('//evil.example/x.mp4'), null);
    assert.equal(videoSource(''), null);
    assert.equal(videoSource(undefined), null);
  });

  it('hides the row when no guide has a video', () => {
    assert.deepEqual(guidesWithVideo([{ slug: 'a' }, { slug: 'b', video: '' }]), []);
    assert.equal(guidesWithVideo([{ slug: 'a', video: '/x.mp4' }]).length, 1);
  });
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit: the pure rules behind the staff view, links, "Is it live?" and
// "This week" (src/lib/studio-kit.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checklist,
  comingSunday,
  deployProblem,
  drawsOwnHeader,
  fieldGuideLookup,
  firstName,
  guideSectionId,
  greeting,
  isDone,
  isStaffUser,
  isStaffView,
  lastSunday,
  liveStatus,
  navbarStatus,
  quickFormErrors,
  readOverride,
  studioTargetPath,
  timeAgo,
  VIEW_KEY,
  weekDocId,
  weekKey,
  weekStart,
  WEEK_TYPE,
} from './studio-kit.ts';

const admin = { email: 'Admin@Example.org', roles: [{ name: 'administrator' }] };
const editor = { email: 'editor@example.org', roles: [{ name: 'editor' }] };

describe('staff view', () => {
  it('a listed address is staff whatever the role, case-insensitively', () => {
    assert.equal(isStaffUser(admin, ['admin@example.org']), true);
    assert.equal(isStaffUser(editor, ['admin@example.org']), false);
    assert.equal(isStaffUser({ ...editor, id: 'pAbc123' }, ['pabc123']), true);
  });

  it('with no list, non-administrators are staff', () => {
    assert.equal(isStaffUser(editor, []), true);
    assert.equal(isStaffUser(admin, []), false);
    assert.equal(isStaffUser({ email: 'x@y.z', roles: [] }, []), false);
    assert.equal(isStaffUser(null, []), false);
  });

  it('the tab choice wins both ways', () => {
    assert.equal(isStaffView(admin, [], 'staff'), true);
    assert.equal(isStaffView(editor, [], 'full'), false);
    assert.equal(isStaffView(editor, [], null), true);
  });

  it('reads only the two known choices, and survives blocked storage', () => {
    const store = (v: string | null) => ({ getItem: (k: string) => (k === VIEW_KEY ? v : null) });
    assert.equal(readOverride(store('full')), 'full');
    assert.equal(readOverride(store('staff')), 'staff');
    assert.equal(readOverride(store('nonsense')), null);
    assert.equal(readOverride(null), null);
    assert.equal(
      readOverride({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
      null,
    );
  });

  it('greets by first name, or kindly with none', () => {
    assert.equal(firstName('Sam Rivera'), 'Sam');
    assert.equal(firstName('  '), 'there');
    assert.equal(firstName(undefined), 'there');
  });
});

describe('studioTargetPath', () => {
  it('builds intent, pane and tool paths under the base path', () => {
    assert.equal(
      studioTargetPath('/studio/', { doc: 'homePage' }),
      '/studio/intent/edit/id=homePage;type=homePage',
    );
    assert.equal(
      studioTargetPath('/studio', { doc: 'abc', type: 'page', field: 'seoDescription' }),
      '/studio/intent/edit/id=abc;type=page;path=seoDescription',
    );
    assert.equal(studioTargetPath('/studio', { pane: 'trash' }), '/studio/structure/trash');
    assert.equal(studioTargetPath('/studio', { tool: 'checkup' }), '/studio/checkup');
    assert.equal(
      studioTargetPath('/studio', { create: 'announcement' }),
      '/studio/intent/create/type=announcement',
    );
  });
});

describe('liveStatus', () => {
  const built = '2026-10-17T12:00:00Z';
  const t = (iso: string) => Date.parse(iso);

  it('is live when nothing was published after the build', () => {
    assert.equal(
      liveStatus(built, '2026-10-17T11:00:00Z', t('2026-10-17T13:00:00Z')).state,
      'live',
    );
    assert.equal(liveStatus(built, null, t('2026-10-17T13:00:00Z')).state, 'live');
  });

  it('is on its way just after a publish, then slow', () => {
    const pub = '2026-10-17T12:30:00Z';
    assert.equal(liveStatus(built, pub, t('2026-10-17T12:33:00Z')).state, 'on-its-way');
    assert.equal(liveStatus(built, pub, t('2026-10-17T12:50:00Z')).state, 'slow');
  });

  it('is unknown without a build time, and never uses an em-dash', () => {
    const s = liveStatus(null, built, Date.now());
    assert.equal(s.state, 'unknown');
    for (const state of [s, liveStatus(built, '2026-10-17T12:30:00Z', t('2026-10-17T13:30:00Z'))]) {
      assert.ok(!state.message.includes('—'));
    }
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  it('speaks plainly', () => {
    assert.equal(timeAgo('2026-10-17T12:00:00Z', now), 'just now');
    assert.equal(timeAgo('2026-10-17T11:59:00Z', now), '1 minute ago');
    assert.equal(timeAgo('2026-10-17T09:00:00Z', now), '3 hours ago');
    assert.equal(timeAgo('2026-10-16T10:00:00Z', now), 'yesterday');
    assert.equal(timeAgo('2026-10-12T12:00:00Z', now), '5 days ago');
    assert.equal(timeAgo(undefined, now), '');
  });
});

describe('weekStart and isDone', () => {
  it('goes back to the first day of the week at midnight local time', () => {
    const fri = new Date(2026, 9, 16, 15, 30); // Friday 16 October 2026
    const mon = new Date(weekStart(fri));
    assert.equal(mon.getDay(), 1);
    assert.equal(mon.getDate(), 12);
    assert.equal(mon.getHours(), 0);
    const sun = new Date(weekStart(fri, 0));
    assert.equal(sun.getDay(), 0);
    assert.equal(sun.getDate(), 11);
    // A Monday is its own week start.
    assert.equal(new Date(weekStart(new Date(2026, 9, 12, 9))).getDate(), 12);
  });

  it('counts true or a positive number as done', () => {
    assert.equal(isDone(true), true);
    assert.equal(isDone(2), true);
    assert.equal(isDone(0), false);
    assert.equal(isDone(null), false);
    assert.equal(isDone('yes'), false);
  });
});

describe('navbarStatus', () => {
  const t = (iso: string) => Date.parse(iso);
  const built = '2026-10-17T12:00:00Z';

  it('says nothing when the build time is unknown', () => {
    assert.equal(navbarStatus(null, built, t('2026-10-17T13:00:00Z')), null);
  });

  it('is neutral when everything published is live', () => {
    assert.deepEqual(navbarStatus(built, '2026-10-17T11:00:00Z', t('2026-10-17T13:00:00Z')), {
      tone: 'default',
      text: 'Website up to date',
    });
  });

  it('counts down while the website updates', () => {
    const pub = '2026-10-17T12:30:00Z';
    assert.equal(
      navbarStatus(built, pub, t('2026-10-17T12:30:10Z'))?.text,
      'Updating the website, about 3 minutes',
    );
    assert.equal(
      navbarStatus(built, pub, t('2026-10-17T12:32:30Z'))?.text,
      'Updating the website, about a minute',
    );
    const late = navbarStatus(built, pub, t('2026-10-17T12:40:00Z'));
    assert.deepEqual(late, { tone: 'primary', text: 'Updating the website, nearly there' });
  });

  it('turns to caution after liveSlowAfterMinutes', () => {
    const s = navbarStatus(built, '2026-10-17T12:30:00Z', t('2026-10-17T12:50:00Z'), 15);
    assert.equal(s?.tone, 'caution');
    assert.equal(
      navbarStatus(built, '2026-10-17T12:30:00Z', t('2026-10-17T12:50:00Z'), 30)?.tone,
      'primary',
    );
  });

  it('never uses an em-dash', () => {
    for (const now of ['12:30:10', '12:32:30', '12:40:00', '12:59:00']) {
      const s = navbarStatus(built, '2026-10-17T12:30:00Z', t(`2026-10-17T${now}Z`));
      assert.ok(!s?.text.includes('—'));
    }
  });
});

describe('greeting', () => {
  const at = (h: number) => new Date(2026, 9, 18, h, 5);
  it('follows the clock', () => {
    assert.equal(greeting(at(6)), 'Good morning');
    assert.equal(greeting(at(11)), 'Good morning');
    assert.equal(greeting(at(12)), 'Good afternoon');
    assert.equal(greeting(at(17)), 'Good afternoon');
    assert.equal(greeting(at(18)), 'Good evening');
    assert.equal(greeting(at(0)), 'Good morning');
  });
});

// -----------------------------------------------------------------------------
// Card 111: deploy failures, the weekly checklist, quick update forms
// -----------------------------------------------------------------------------

describe('deployProblem', () => {
  it('a failed deploy says so, naming the helper', () => {
    const p = deployProblem({ configured: true, state: 'failed' }, 'Sam');
    assert.equal(p?.tone, 'critical');
    assert.equal(p?.text, "The last update didn't go through. Sam has been told.");
    assert.match(p?.message ?? '', /Try again/);
  });
  it('anything else, or no route, keeps the old behaviour', () => {
    assert.equal(deployProblem({ configured: true, state: 'ok' }, 'Sam'), null);
    assert.equal(deployProblem({ configured: true, state: 'running' }, 'Sam'), null);
    assert.equal(deployProblem({ configured: false, state: 'failed' }, 'Sam'), null);
    assert.equal(deployProblem(null, 'Sam'), null);
  });
  it('the words carry no em-dash', () => {
    const p = deployProblem({ configured: true, state: 'failed' }, 'Sam');
    assert.ok(!`${p?.text}${p?.message}`.includes('\u2014'));
  });
});

describe('the week', () => {
  it('a Monday week: Wednesday and the Sunday after share a key; Monday starts a new one', () => {
    const wed = new Date(2026, 9, 14, 12); // Wed 14 Oct 2026
    const sun = new Date(2026, 9, 18, 20); // Sun 18 Oct
    const mon = new Date(2026, 9, 19, 0, 5); // Mon 19 Oct, just after midnight
    assert.equal(weekKey(wed, 1), '2026-10-12');
    assert.equal(weekKey(sun, 1), '2026-10-12');
    assert.equal(weekKey(mon, 1), '2026-10-19');
  });
  it('a Sunday week starts on the Sunday', () => {
    assert.equal(weekKey(new Date(2026, 9, 14, 12), 0), '2026-10-11');
  });
  it('the doc id is the type plus the key', () => {
    assert.equal(weekDocId('2026-10-12'), `${WEEK_TYPE}-2026-10-12`);
  });
  it('last and coming Sunday, with Sunday itself counting as both', () => {
    assert.equal(lastSunday(new Date(2026, 9, 14, 12)), '2026-10-11');
    assert.equal(comingSunday(new Date(2026, 9, 14, 12)), '2026-10-18');
    assert.equal(lastSunday(new Date(2026, 9, 18, 9)), '2026-10-18');
    assert.equal(comingSunday(new Date(2026, 9, 18, 9)), '2026-10-18');
  });
});

describe('checklist', () => {
  const tasks = [
    { id: 'sermon', query: 'count(*)' },
    { id: 'events', manual: true },
    { id: 'clean', check: 'checkup' as const },
    { id: 'plain' },
  ];
  it('content checks tick themselves and cannot be ticked by hand', () => {
    const [sermon] = checklist(tasks, { sermon: 1 }, [], null);
    assert.deepEqual(sermon, { id: 'sermon', done: true, by: 'content', tickable: false });
    assert.equal(checklist(tasks, { sermon: 0 }, ['sermon'], null)[0].done, false);
  });
  it("hand jobs follow this week's ticks; a job with no check is a hand job", () => {
    const rows = checklist(tasks, {}, ['events'], null);
    assert.deepEqual(rows[1], { id: 'events', done: true, by: 'hand', tickable: true });
    assert.deepEqual(rows[3], { id: 'plain', done: false, by: null, tickable: true });
  });
  it('the Checkup job is done only when the Checkup is known clear', () => {
    assert.equal(checklist(tasks, {}, [], null)[2].done, false);
    assert.equal(checklist(tasks, {}, [], false)[2].done, false);
    assert.deepEqual(checklist(tasks, {}, [], true)[2], {
      id: 'clean',
      done: true,
      by: 'checkup',
      tickable: false,
    });
  });
});

describe('quickFormErrors', () => {
  const fields = [
    { name: 'message', title: 'The notice', kind: 'text' as const, required: true, max: 20 },
    { name: 'link', title: 'Link', kind: 'url' as const },
    { name: 'ends', title: 'Last day', kind: 'date' as const, required: true },
  ];
  it('names the missing fields in plain words', () => {
    assert.deepEqual(quickFormErrors(fields, {}), {
      message: 'The notice is needed.',
      ends: 'Last day is needed.',
    });
  });
  it('checks length, links and dates', () => {
    const e = quickFormErrors(fields, {
      message: 'x'.repeat(25),
      link: 'church.org',
      ends: '18/10/2026',
    });
    assert.match(e.message, /under 20/);
    assert.match(e.link, /https/);
    assert.equal(e.ends, 'Pick a date.');
  });
  it('good answers give no errors; an empty optional field is fine', () => {
    assert.deepEqual(quickFormErrors(fields, { message: 'Snow', ends: '2026-10-18' }), {});
    assert.deepEqual(
      quickFormErrors(fields, { message: 'Snow', ends: '2026-10-18', link: 'https://a.org/x' }),
      {},
    );
  });
});

describe('fieldGuideLookup (card 134)', () => {
  const map = {
    fields: { seoTitle: { guide: 'seo-fields' }, alt: { guide: 'images-and-alt', section: 'Alt' } },
    types: { seo: { guide: 'seo-fields', section: 'Types' } },
  };
  it('finds a field by name first, then by its type chain', () => {
    const look = fieldGuideLookup(map);
    assert.deepEqual(look('seoTitle', ['string']), { guide: 'seo-fields' });
    assert.deepEqual(look('meta', ['seo', 'object']), { guide: 'seo-fields', section: 'Types' });
    assert.equal(look('alt', ['seo'])?.guide, 'images-and-alt');
  });
  it('leaves an unmapped field alone, and never reads inherited keys', () => {
    const look = fieldGuideLookup(map);
    assert.equal(look('title', ['string']), null);
    assert.equal(look('constructor', ['toString']), null);
    assert.equal(look('title', ['string']), null);
  });
  it('an empty or missing map always answers null', () => {
    assert.equal(fieldGuideLookup(undefined)('seoTitle', []), null);
    assert.equal(fieldGuideLookup({})('seoTitle', ['seo']), null);
  });
  it('makes a stable section anchor', () => {
    assert.equal(
      guideSectionId('images-and-alt', 'What alt text is'),
      'guide-images-and-alt--what-alt-text-is',
    );
    assert.equal(guideSectionId('x', '  '), 'guide-x--section');
  });
});

describe('drawsOwnHeader (card 142)', () => {
  it('is true for date and datetime, and for a type built on them', () => {
    assert.equal(drawsOwnHeader(['datetime']), true);
    assert.equal(drawsOwnHeader(['date']), true);
    assert.equal(drawsOwnHeader(['raceDay', 'datetime']), true);
  });
  it('is false for every other field', () => {
    assert.equal(drawsOwnHeader(['string']), false);
    assert.equal(drawsOwnHeader(['seoTitle', 'string']), false);
    assert.equal(drawsOwnHeader([]), false);
  });
});

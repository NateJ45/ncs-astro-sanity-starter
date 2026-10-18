// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit: the pure rules behind the staff view, links, "Is it live?" and
// "This week" (src/lib/studio-kit.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstName,
  greeting,
  isDone,
  isStaffUser,
  isStaffView,
  liveStatus,
  navbarStatus,
  readOverride,
  studioTargetPath,
  timeAgo,
  VIEW_KEY,
  weekStart,
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

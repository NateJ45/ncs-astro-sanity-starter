// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The People tool (PORTS.md card 176): role mapping, request validation and the
// route's order of checks (src/lib/studio-people.ts). Sanity is a fake fetch
// here; what still needs a signed-in test is listed in docs/agent/studio-people.md.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESS_API,
  handlePeople,
  inviteProblem,
  inviteRows,
  isEmail,
  isProjectAdmin,
  memberRows,
  noHelperSteps,
  PLAIN_ROLES,
  planOf,
  roleKeyOf,
  roleLabel,
  roleWords,
  sanityRoleFor,
  validatePeopleRequest,
  type PeopleDeps,
} from './studio-people.ts';

const PROJECT = 'abc123xy';
const GROWTH = ['roleEditor', 'roleViewer', 'roleContributor', 'roleDeveloper'];
const FREE = ['roleViewer'];

describe('role mapping', () => {
  it('a Helper is an Editor, an Administrator is an administrator', () => {
    assert.equal(sanityRoleFor('helper', GROWTH, 'auto'), 'editor');
    assert.equal(sanityRoleFor('administrator', GROWTH, 'auto'), 'administrator');
    // Free for good: a Growth trial still lists roleEditor, but no Helper is offered.
    assert.equal(sanityRoleFor('helper', GROWTH, 'free'), null);
    assert.equal(sanityRoleFor('administrator', GROWTH, 'free'), 'administrator');
  });

  it('the free plan has no Helper, but still has Administrator', () => {
    assert.equal(sanityRoleFor('helper', FREE), null);
    assert.equal(sanityRoleFor('helper', []), null);
    assert.equal(sanityRoleFor('administrator', FREE), 'administrator');
  });

  it('reads Sanity roles back, administrator first', () => {
    assert.equal(roleKeyOf(['editor', 'administrator']), 'administrator');
    assert.equal(roleKeyOf(['editor']), 'helper');
    assert.equal(roleKeyOf(['developer']), 'helper');
    assert.equal(roleKeyOf(['contributor']), 'drafts');
    assert.equal(roleKeyOf(['viewer']), 'viewer');
    assert.equal(roleKeyOf([]), 'other');
  });

  it("words a role in the site's own words, over the defaults", () => {
    const words = roleWords({ helper: { title: 'Volunteer' } });
    assert.equal(words.helper.title, 'Volunteer');
    assert.equal(words.helper.description, PLAIN_ROLES.helper.description);
    assert.equal(roleLabel('helper', words), 'Volunteer');
    assert.match(roleLabel('drafts', words), /^Volunteer .*cannot publish/);
    assert.equal(roleLabel('administrator', words), 'Administrator');
    assert.equal(roleLabel('viewer', words), 'Can look, cannot edit');
    assert.equal(roleLabel('other', words, 'custom-role'), 'custom-role');
    assert.equal(roleLabel('other', words), 'No role');
  });

  it("anything but 'free' is 'auto'", () => {
    assert.equal(planOf('free'), 'free');
    assert.equal(planOf('auto'), 'auto');
    assert.equal(planOf('Free'), 'auto');
    assert.equal(planOf(undefined), 'auto');
  });

  it('only a real administrator role counts as an admin', () => {
    assert.equal(isProjectAdmin({ roles: ['administrator'] }), true);
    assert.equal(isProjectAdmin({ roles: ['Administrator'] }), true);
    assert.equal(isProjectAdmin({ roles: ['editor', 'viewer'] }), false);
    assert.equal(isProjectAdmin(null), false);
  });

  it('the free-plan steps use the role words, name Simple view and the manage page', () => {
    const words = roleWords({ helper: { title: 'Volunteer' } });
    const free = noHelperSteps(PROJECT, words, 'free').join(' ');
    assert.match(free, /no Volunteer in between/);
    assert.match(free, /stays on the free plan/);
    assert.match(free, /Simple view/);
    assert.match(free, /sanity\.io\/manage\/project\/abc123xy\/members/);
    assert.doesNotMatch(free, /\u2014/);
    assert.match(noHelperSteps(PROJECT, words, 'auto').join(' '), /Growth plan/);
  });
});

describe('request validation', () => {
  it('accepts a tidy invite and normalises it', () => {
    const v = validatePeopleRequest({
      action: 'invite',
      name: '  Ruth   Miller ',
      email: ' Ruth@Example.ORG ',
      role: 'helper',
    });
    assert.deepEqual(v, {
      ok: true,
      value: { action: 'invite', name: 'Ruth Miller', email: 'ruth@example.org', role: 'helper' },
    });
  });

  it('says what is wrong with each field, in the role words', () => {
    const v = validatePeopleRequest(
      { action: 'invite', name: '', email: 'ruth', role: 'owner' },
      roleWords({ helper: { title: 'Volunteer' } }),
    );
    assert.equal(v.ok, false);
    if (v.ok) return;
    assert.ok(v.errors.name && v.errors.email);
    assert.equal(v.errors.role, 'Pick Volunteer or Administrator.');
  });

  it('caps the name and the email', () => {
    const long = validatePeopleRequest({
      action: 'invite',
      name: 'x'.repeat(81),
      email: `${'a'.repeat(250)}@b.co`,
      role: 'administrator',
    });
    assert.equal(long.ok, false);
    if (long.ok) return;
    assert.ok(long.errors.name && long.errors.email);
  });

  it('knows an email when it sees one', () => {
    assert.equal(isEmail('ruth@example.org'), true);
    assert.equal(isEmail('ruth@example'), false);
    assert.equal(isEmail('ruth smith@example.org'), false);
    assert.equal(isEmail('<a>@example.org'), false);
  });

  it('resend and cancel need a plain invite id', () => {
    assert.equal(validatePeopleRequest({ action: 'resend', id: 'inv_123-AB' }).ok, true);
    assert.equal(validatePeopleRequest({ action: 'cancel', id: '../users' }).ok, false);
    assert.equal(validatePeopleRequest({ action: 'cancel' }).ok, false);
  });

  it('refuses anything else', () => {
    for (const body of [null, 'invite', [], {}, { action: 'delete', id: 'x' }])
      assert.equal(validatePeopleRequest(body).ok, false);
  });
});

describe('rows', () => {
  it('keeps only this project, marks you, and drops other invites', () => {
    const rows = memberRows(
      [
        {
          sanityUserId: 'g1',
          profile: { displayName: 'Sam', email: 's@x.org', isCurrentUser: true },
          memberships: [
            {
              resourceType: 'project',
              resourceId: PROJECT,
              roleNames: ['administrator'],
              resourceUserId: 'p1',
            },
          ],
        },
        {
          sanityUserId: 'g2',
          profile: { displayName: 'Elsewhere', email: 'e@x.org' },
          memberships: [{ resourceType: 'project', resourceId: 'other', roleNames: ['editor'] }],
        },
      ],
      PROJECT,
      'p1',
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].isYou, true);
    assert.equal(rows[0].roleKey, 'administrator');
    // The project user id is what a "Simple view" mark uses (card 175).
    assert.equal(rows[0].userId, 'p1');
    const invites = inviteRows([
      { id: 'a', status: 'pending', role: 'editor', email: 'r@x.org', createdAt: '2026-10-01' },
      { id: 'b', status: 'accepted', role: 'editor', createdAt: '2026-10-02' },
    ]);
    assert.deepEqual(
      invites.map((i) => [i.id, i.roleKey]),
      [['a', 'helper']],
    );
  });

  it('puts Sanity refusals in plain words', () => {
    assert.match(inviteProblem(409, ''), /already/);
    assert.match(inviteProblem(400, 'Member quota exceeded'), /number of people/);
    assert.match(inviteProblem(403, ''), /permission/);
  });
});

// -----------------------------------------------------------------------------
// The route
// -----------------------------------------------------------------------------

interface Call {
  url: string;
  method: string;
  auth: string;
  body?: string;
}

function fakeSanity(
  opts: {
    features?: string[];
    invites?: unknown[];
    inviteStatus?: number;
    refuseRobot?: boolean;
  } = {},
) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init.method ?? 'GET',
      auth: headers.Authorization ?? '',
      body: init.body as string | undefined,
    });
    if (opts.refuseRobot && headers.Authorization === 'Bearer robot' && url.startsWith(ACCESS_API))
      return new Response('wrong session type', { status: 403 });
    const ok = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    if (url.endsWith('/features')) return ok(opts.features ?? GROWTH);
    if (url.includes('/invites') && (init.method ?? 'GET') === 'GET')
      return ok({ data: opts.invites ?? [], nextCursor: null });
    if (url.endsWith('/invites') && init.method === 'POST')
      return opts.inviteStatus
        ? new Response('nope', { status: opts.inviteStatus })
        : ok({ id: 'new' }, 201);
    if (url.includes('/invites/') && init.method === 'DELETE')
      return new Response(null, { status: 204 });
    if (url.includes('/users')) return ok({ data: [], nextCursor: null, totalCount: 0 });
    return new Response('?', { status: 404 });
  };
  return { calls, fetchImpl };
}

const admin = { id: 'p1', roles: ['administrator'], token: 'session-admin' };
const editor = { id: 'p2', roles: ['editor'], token: 'session-editor' };

function deps(over: Partial<PeopleDeps> = {}, f = fakeSanity()): PeopleDeps {
  return {
    sameOrigin: () => true,
    verify: async () => admin,
    membersToken: 'robot',
    projectId: PROJECT,
    fetchImpl: f.fetchImpl,
    ...over,
  };
}

const post = (body: Record<string, unknown>, plan = 'auto') =>
  new Request('https://site.test/api/studio/people/', {
    method: 'POST',
    body: JSON.stringify({ ...body, plan }),
    headers: { 'Content-Type': 'application/json' },
  });
const get = (plan = 'auto') => new Request(`https://site.test/api/studio/people/?plan=${plan}`);

describe('handlePeople', () => {
  it('if Sanity refuses the robot key, it tries once more as the administrator', async () => {
    const f = fakeSanity({ refuseRobot: true });
    const r = await handlePeople(
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }),
      deps({}, f),
    );
    assert.equal(r.status, 200);
    const posts = f.calls.filter((c) => c.method === 'POST').map((c) => c.auth);
    assert.deepEqual(posts, ['Bearer robot', 'Bearer session-admin']);
  });

  it('checks origin, then sign-in, then administrator, before calling Sanity', async () => {
    const f = fakeSanity();
    assert.equal((await handlePeople(get(), deps({ sameOrigin: () => false }, f))).status, 403);
    assert.equal((await handlePeople(get(), deps({ verify: async () => null }, f))).status, 401);
    const asEditor = await handlePeople(get(), deps({ verify: async () => editor }, f));
    assert.equal(asEditor.status, 403);
    assert.match(((await asEditor.json()) as { error: string }).error, /administrator/);
    assert.equal(f.calls.length, 0);
  });

  it('with no members key, says it is not set up and calls nothing', async () => {
    const f = fakeSanity();
    const r = await handlePeople(get(), deps({ membersToken: undefined }, f));
    const body = (await r.json()) as { configured: boolean; manageUrl: string };
    assert.equal(body.configured, false);
    assert.match(body.manageUrl, /abc123xy/);
    assert.equal(f.calls.length, 0);
  });

  it('lists with the robot key and reports the plan', async () => {
    const f = fakeSanity({ features: FREE });
    const r = await handlePeople(get(), deps({}, f));
    const body = (await r.json()) as { ok: boolean; helperAvailable: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.helperAvailable, false);
    assert.ok(f.calls.every((c) => c.auth === 'Bearer robot'));
  });

  it("plan 'free' greys Helper out even while a Growth trial lists the Editor role", async () => {
    const f = fakeSanity({ features: GROWTH });
    const free = (await (await handlePeople(get('free'), deps({}, f))).json()) as {
      helperAvailable: boolean;
    };
    assert.equal(free.helperAvailable, false);
    const auto = (await (await handlePeople(get('auto'), deps({}, f))).json()) as {
      helperAvailable: boolean;
    };
    assert.equal(auto.helperAvailable, true);
    const r = await handlePeople(
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }, 'free'),
      deps({}, f),
    );
    assert.equal(r.status, 409);
    assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
  });

  it('never puts the members key in an answer', async () => {
    const f = fakeSanity({ inviteStatus: 403 });
    for (const req of [
      get(),
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }),
    ]) {
      const res = await handlePeople(req, deps({ membersToken: 'robot-secret' }, f));
      assert.doesNotMatch(await res.text(), /robot-secret/);
    }
  });

  it('invites a Helper as an Editor with the robot key', async () => {
    const f = fakeSanity();
    const r = await handlePeople(
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }),
      deps({}, f),
    );
    assert.equal(r.status, 200);
    const sent = f.calls.find((c) => c.method === 'POST');
    assert.equal(sent?.url, `${ACCESS_API}/${PROJECT}/invites`);
    assert.equal(sent?.auth, 'Bearer robot');
    assert.deepEqual(JSON.parse(sent?.body ?? '{}'), { email: 'ruth@x.org', role: 'editor' });
  });

  it("invites an Administrator with the caller's own session", async () => {
    const f = fakeSanity({ features: FREE });
    const r = await handlePeople(
      post({ action: 'invite', name: 'Sam', email: 'sam@x.org', role: 'administrator' }),
      deps({}, f),
    );
    assert.equal(r.status, 200);
    const sent = f.calls.find((c) => c.method === 'POST');
    assert.equal(sent?.auth, 'Bearer session-admin');
    assert.deepEqual(JSON.parse(sent?.body ?? '{}'), { email: 'sam@x.org', role: 'administrator' });
  });

  it('on the free plan, a Helper invite is refused honestly and nothing is sent', async () => {
    const f = fakeSanity({ features: FREE });
    const r = await handlePeople(
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }),
      deps({}, f),
    );
    assert.equal(r.status, 409);
    const body = (await r.json()) as { planLimit: boolean; manageUrl: string };
    assert.equal(body.planLimit, true);
    assert.ok(body.manageUrl);
    assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
  });

  it('a bad request is a 400 with field messages, before Sanity is asked', async () => {
    const f = fakeSanity();
    const r = await handlePeople(
      post({ action: 'invite', name: '', email: 'x', role: 'helper' }),
      deps({}, f),
    );
    assert.equal(r.status, 400);
    assert.ok(((await r.json()) as { errors: Record<string, string> }).errors.email);
    assert.equal(f.calls.length, 0);
  });

  it('a Sanity refusal comes back in plain words', async () => {
    const f = fakeSanity({ inviteStatus: 409 });
    const r = await handlePeople(
      post({ action: 'invite', name: 'Ruth', email: 'ruth@x.org', role: 'helper' }),
      deps({}, f),
    );
    assert.equal(r.status, 502);
    assert.match(((await r.json()) as { error: string }).error, /already/);
  });

  it('resend revokes, then invites the same email and role again', async () => {
    const f = fakeSanity({
      invites: [
        {
          id: 'inv1',
          status: 'pending',
          role: 'editor',
          email: 'ruth@x.org',
          createdAt: '2026-10-20',
        },
      ],
    });
    const r = await handlePeople(post({ action: 'resend', id: 'inv1' }), deps({}, f));
    assert.equal(r.status, 200);
    const writes = f.calls.filter((c) => c.method !== 'GET').map((c) => c.method);
    assert.deepEqual(writes, ['DELETE', 'POST']);
    assert.deepEqual(JSON.parse(f.calls.find((c) => c.method === 'POST')?.body ?? '{}'), {
      email: 'ruth@x.org',
      role: 'editor',
    });
  });

  it('cancel revokes only; an unknown invite is a 404', async () => {
    const f = fakeSanity({
      invites: [
        {
          id: 'inv2',
          status: 'pending',
          role: 'administrator',
          email: 'sam@x.org',
          createdAt: '2026-10-20',
        },
      ],
    });
    const r = await handlePeople(post({ action: 'cancel', id: 'inv2' }), deps({}, f));
    assert.equal(r.status, 200);
    const del = f.calls.find((c) => c.method === 'DELETE');
    assert.equal(del?.url, `${ACCESS_API}/${PROJECT}/invites/inv2`);
    assert.equal(del?.auth, 'Bearer session-admin');
    assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
    assert.equal(
      (await handlePeople(post({ action: 'cancel', id: 'nope' }), deps({}, f))).status,
      404,
    );
  });
});

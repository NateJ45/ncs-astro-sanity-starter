// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The People tool: invite a helper or an administrator from the Studio
// (PORTS.md card 176), the pure half
// =============================================================================
// An administrator adds someone from inside the Studio: a name, an email and
// one of two plain roles.
//
//   Helper         edits and publishes, gets the simple staff view, and cannot
//                  delete anything for good. Sanity role: `editor`.
//   Administrator  everything, including this tool. Sanity role: `administrator`.
//
// The words for both roles, and the site's Sanity plan, are per site
// (kitConfig.people in src/sanity/kit.config.ts); this file only has the
// defaults. The route (src/pages/api/studio/people.ts) is a thin shell over
// handlePeople() below, so the unit tests (studio-people.test.ts) reach every
// rule: who may call it, what a valid request is, which Sanity role a plain
// role becomes, and what the tool says when the plan cannot do something.
//
// WHAT SANITY ALLOWS (read from the docs and a live project, 2026-10-26)
//   - Invitations live in the Access API:
//       GET    https://api.sanity.io/v2025-07-11/access/project/<id>/invites
//       POST   .../invites            { email, role }  (Sanity sends the email)
//       DELETE .../invites/<inviteId> (revoke)
//       GET    .../users              (members and their role names)
//     Inviting and revoking need `sanity.project.members.invite`; listing needs
//     `sanity.project.members.read`. There is no "resend": a resend is revoke,
//     then invite again (one pending invite per email and role).
//   - "Only administrators can invite other administrators", and a robot token
//     can never hold the Administrator role. So an Administrator invite (and
//     cancelling or resending one) is sent with the CALLER's own session, which
//     the route has already checked is a project administrator. Everything
//     else uses the Worker secret SANITY_MEMBERS_TOKEN, a robot token with the
//     "Access Manager (Token only)" role: members and invites, no content.
//   - Roles by plan (sanity.io/docs/user-guides/roles): Administrator and Viewer
//     on every plan; Editor, Developer and Contributor on Growth (and during the
//     Growth trial every new project starts on). On the Free plan there is no
//     role that can edit without being an Administrator, so the tool cannot
//     make a Helper there and says so instead of failing. The project's
//     `roleEditor` feature flag is how the route tells; a site that has chosen
//     Free for good sets plan 'free', so nobody is invited into a role that
//     turns read-only when a Growth trial ends.
//   - On Free, a helper is invited as an Administrator, and the tool's "Simple
//     view" switch marks them so the staff view applies anyway (card 175,
//     src/lib/studio-kit.ts).
//
// Nothing is stored here: the name is only used in the reply ("Invitation sent
// to Sam"); Sanity's invitation email asks the person for their own name.
// Emails pass through to Sanity and back to the signed-in administrator, never
// into the dataset or a log. The members token is never logged or echoed.
// =============================================================================

import type { StudioUser } from './studio-auth';

// -----------------------------------------------------------------------------
// Roles in plain words
// -----------------------------------------------------------------------------

/** The two roles the tool offers. */
export type PlainRole = 'helper' | 'administrator';

/** How a role reads in the tool. */
export interface RoleWords {
  title: string;
  description: string;
}

export type PeopleRoleWords = Record<PlainRole, RoleWords>;

/** The site's Sanity plan: 'free' never offers Helper; 'auto' trusts the project's feature list. */
export type SanityPlan = 'free' | 'auto';

/** The defaults; a site rewords them in kitConfig.people.roles. */
export const PLAIN_ROLES: PeopleRoleWords = {
  helper: {
    title: 'Helper',
    description:
      'Can edit pages and posts and publish them. Sees the simple view of the Studio and cannot delete anything for good.',
  },
  administrator: {
    title: 'Administrator',
    description:
      'Can do everything, including inviting people and deleting things for good. Keep this for one or two people.',
  },
};

/** The site's role words over the defaults, one role at a time. */
export function roleWords(over?: Partial<Record<PlainRole, Partial<RoleWords>>>): PeopleRoleWords {
  return {
    helper: { ...PLAIN_ROLES.helper, ...over?.helper },
    administrator: { ...PLAIN_ROLES.administrator, ...over?.administrator },
  };
}

/** The Sanity role each plain role is sent as. */
export const SANITY_ROLE: Record<PlainRole, string> = {
  helper: 'editor',
  administrator: 'administrator',
};

/** The Sanity feature flag that says the plan has the Editor role. */
export const EDITOR_FEATURE = 'roleEditor';

/** Anything but 'free' counts as 'auto', so a typo can only ever trust Sanity. */
export function planOf(value: unknown): SanityPlan {
  return value === 'free' ? 'free' : 'auto';
}

/** Does this plan really have the Editor role (Helper)? */
export function hasEditorRole(features: string[], plan: SanityPlan = 'auto'): boolean {
  return plan !== 'free' && features.includes(EDITOR_FEATURE);
}

/** Where the person goes for anything the tool cannot do. */
export function manageUrl(projectId: string): string {
  return `https://www.sanity.io/manage/project/${projectId}/members`;
}

/** A member's access, as a key the tool words for itself (roleLabel). */
export type RoleKey = 'administrator' | 'helper' | 'drafts' | 'viewer' | 'other';

/**
 * What a member's Sanity roles mean. Administrator wins; a role that can
 * publish is a Helper; a contributor writes drafts only; a viewer can only look.
 */
export function roleKeyOf(roleNames: string[]): RoleKey {
  const names = roleNames.map((r) => r.toLowerCase());
  if (names.includes('administrator')) return 'administrator';
  if (names.some((r) => r === 'editor' || r === 'developer')) return 'helper';
  if (names.includes('contributor')) return 'drafts';
  if (names.includes('viewer')) return 'viewer';
  return 'other';
}

/** A role key in the site's words. `raw` is Sanity's own role names, for anything unknown. */
export function roleLabel(key: RoleKey, words: PeopleRoleWords, raw = ''): string {
  switch (key) {
    case 'administrator':
      return words.administrator.title;
    case 'helper':
      return words.helper.title;
    case 'drafts':
      return `${words.helper.title} (drafts only, cannot publish)`;
    case 'viewer':
      return 'Can look, cannot edit';
    default:
      return raw || 'No role';
  }
}

/**
 * The Sanity role to invite with, or null when this plan has no such role.
 * `features` is the project's feature list (GET /projects/<id>/features).
 */
export function sanityRoleFor(
  role: PlainRole,
  features: string[],
  plan: SanityPlan = 'auto',
): string | null {
  if (role === 'administrator') return SANITY_ROLE.administrator;
  return hasEditorRole(features, plan) ? SANITY_ROLE.helper : null;
}

/** Is the caller an administrator of this project (by their real Sanity role)? */
export function isProjectAdmin(user: Pick<StudioUser, 'roles'> | null | undefined): boolean {
  return Boolean(user?.roles.some((r) => r.toLowerCase() === 'administrator'));
}

/** The plain steps when the plan has no Helper role. No em-dashes: an editor reads them. */
export function noHelperSteps(
  projectId: string,
  words: PeopleRoleWords,
  plan: SanityPlan,
): string[] {
  const helper = words.helper.title;
  const admin = words.administrator.title;
  return [
    `The free Sanity plan only has two kinds of account: ${admin} (can do everything) and Viewer (can look, cannot edit). There is no ${helper} in between.`,
    plan === 'free'
      ? `This website stays on the free plan, so invite a ${helper.toLowerCase()} as an ${admin} here. They can edit everything you can.`
      : `Invite them as an ${admin} here (they can edit everything you can), or ask about Sanity's Growth plan, which has a ${helper} role.`,
    `Once they have accepted, turn on "Simple view" next to their name under "Who can edit the website". They then see the simpler Studio, with no permanent delete.`,
    `You can also manage people yourself at ${manageUrl(projectId)} (Members, then Invite members).`,
  ];
}

// -----------------------------------------------------------------------------
// Request validation
// -----------------------------------------------------------------------------

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

/** A plain email shape: something@something.something, no spaces. */
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function isEmail(v: string): boolean {
  return v.length <= EMAIL_MAX && EMAIL_RE.test(v);
}

/** Sanity ids for invites: letters, digits, dashes and underscores. */
export function isInviteId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
}

export type PeopleRequest =
  | { action: 'invite'; name: string; email: string; role: PlainRole }
  | { action: 'resend'; id: string }
  | { action: 'cancel'; id: string };

export type Validated =
  { ok: true; value: PeopleRequest } | { ok: false; errors: Record<string, string> };

/** Check a POST body. Field messages are written for the person filling the form. */
export function validatePeopleRequest(
  body: unknown,
  words: PeopleRoleWords = PLAIN_ROLES,
): Validated {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { ok: false, errors: { form: 'That request was not understood. Try again.' } };
  const b = body as Record<string, unknown>;

  if (b.action === 'resend' || b.action === 'cancel') {
    return isInviteId(b.id)
      ? { ok: true, value: { action: b.action, id: b.id } }
      : { ok: false, errors: { form: 'That invitation was not found. Refresh and try again.' } };
  }
  if (b.action !== 'invite')
    return { ok: false, errors: { form: 'That request was not understood. Try again.' } };

  const errors: Record<string, string> = {};
  const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const role = b.role;

  if (!name) errors.name = 'Add their name, so you know who the invitation is for.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} letters.`;
  if (!email) errors.email = 'Add the email address they use.';
  else if (!isEmail(email)) errors.email = 'That does not look like an email address.';
  if (role !== 'helper' && role !== 'administrator')
    errors.role = `Pick ${words.helper.title} or ${words.administrator.title}.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { action: 'invite', name, email, role: role as PlainRole } };
}

// -----------------------------------------------------------------------------
// The route
// -----------------------------------------------------------------------------

export const ACCESS_API = 'https://api.sanity.io/v2025-07-11/access/project';
export const PROJECTS_API = 'https://api.sanity.io/v2021-06-07/projects';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface PeopleDeps {
  sameOrigin: (request: Request) => boolean;
  /** The caller, checked with Sanity, plus their own session token. */
  verify: (request: Request) => Promise<(StudioUser & { token: string }) | null>;
  /** SANITY_MEMBERS_TOKEN, or undefined when it is not set yet. */
  membersToken: string | undefined;
  projectId: string | undefined;
  fetchImpl?: FetchLike;
}

export interface MemberRow {
  /** Sanity's global user id. */
  id: string;
  /**
   * The project user id ("p..."): the id the Studio's current user carries, so
   * the one a "Simple view" mark uses (card 175). Null when Sanity omits it.
   */
  userId: string | null;
  name: string;
  email: string;
  roleKey: RoleKey;
  /** Sanity's own role names, for a role the tool has no words for. */
  roles: string;
  lastSeenAt: string | null;
  isYou: boolean;
}

export interface InviteRow {
  id: string;
  email: string;
  roleKey: RoleKey;
  roles: string;
  createdAt: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

interface SanityInvite {
  id: string;
  status: string;
  role: string;
  email?: string;
  createdAt: string;
}
interface SanityUser {
  sanityUserId: string;
  profile: { displayName?: string; email?: string; isCurrentUser?: boolean };
  memberships: Array<{
    resourceType: string;
    resourceId: string;
    roleNames: string[];
    lastSeenAt?: string | null;
    resourceUserId?: string | null;
  }>;
}

const ROLE_ORDER: RoleKey[] = ['administrator', 'helper', 'drafts', 'viewer', 'other'];

/** Turn Sanity's members list into the tool's rows (this project's roles only). */
export function memberRows(users: SanityUser[], projectId: string, callerId: string): MemberRow[] {
  const rows: MemberRow[] = [];
  for (const u of users) {
    const m = u.memberships.find((x) => x.resourceType === 'project' && x.resourceId === projectId);
    if (!m) continue;
    rows.push({
      id: u.sanityUserId,
      userId: m.resourceUserId ?? null,
      name: u.profile.displayName?.trim() || u.profile.email || 'Someone',
      email: u.profile.email ?? '',
      roleKey: roleKeyOf(m.roleNames),
      roles: m.roleNames.join(', '),
      lastSeenAt: m.lastSeenAt ?? null,
      isYou: Boolean(u.profile.isCurrentUser) || m.resourceUserId === callerId,
    });
  }
  return rows.sort((a, b) =>
    a.roleKey === b.roleKey
      ? a.name.localeCompare(b.name)
      : ROLE_ORDER.indexOf(a.roleKey) - ROLE_ORDER.indexOf(b.roleKey),
  );
}

/** Pending invitations only, newest first. */
export function inviteRows(invites: SanityInvite[]): InviteRow[] {
  return invites
    .filter((i) => i.status === 'pending')
    .map((i) => ({
      id: i.id,
      email: i.email ?? '',
      roleKey: roleKeyOf([i.role]),
      roles: i.role,
      createdAt: i.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Sanity's answer to an invite, in plain words. */
export function inviteProblem(status: number, detail: string): string {
  const d = detail.toLowerCase();
  if (status === 409 || d.includes('already'))
    return 'That person already has an invitation or an account here.';
  if (d.includes('quota') || d.includes('seat') || d.includes('limit'))
    return 'The website has reached the number of people the Sanity plan allows. Remove someone first, or ask about a bigger plan.';
  if (status === 401 || status === 403)
    return 'Sanity would not let the website send that invitation. The members key may be missing a permission.';
  if (status === 400)
    return 'Sanity did not accept that invitation. Check the email address and try again.';
  return 'Sanity did not answer. Try again in a minute.';
}

/**
 * The whole route. Order matters and is tested: same origin, then a signed-in
 * member, then an ADMINISTRATOR, then the members key. Nothing reaches Sanity's
 * Access API before all four pass. The plan comes with the request (the tool
 * sends kitConfig.people.plan): it only decides whether Helper is offered, and
 * the caller is already an administrator who could pick any role at
 * sanity.io/manage, so it is a courtesy, not a permission.
 */
export async function handlePeople(request: Request, deps: PeopleDeps): Promise<Response> {
  if (!deps.sameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await deps.verify(request);
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);
  if (!isProjectAdmin(user))
    return json({ ok: false, error: 'Only an administrator can invite people.' }, 403);
  const projectId = deps.projectId;
  if (!projectId || !/^[a-z0-9]+$/i.test(projectId))
    return json({ ok: false, error: 'The website does not know its Sanity project.' }, 500);
  const manage = manageUrl(projectId);
  if (!deps.membersToken) return json({ ok: true, configured: false, manageUrl: manage });

  const f = deps.fetchImpl ?? fetch;
  const robot = deps.membersToken;
  const send = (path: string, token: string, init: RequestInit) =>
    f(`${ACCESS_API}/${projectId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  // If Sanity refuses the robot key (the Access API docs speak of "an
  // authenticated user session"), try once more as the caller, who is an
  // administrator and so holds every members permission.
  const call = async (path: string, token: string, init: RequestInit = {}) => {
    const r = await send(path, token, init);
    if (token === robot && (r.status === 401 || r.status === 403))
      return send(path, user.token, init);
    return r;
  };
  // Administrator invites go out as the caller (see the header).
  const tokenForRole = (sanityRole: string) =>
    sanityRole === 'administrator' ? user.token : robot;

  const features = async (): Promise<string[] | null> => {
    try {
      // The members key can usually read it; the caller's session is the fallback.
      let r = await f(`${PROJECTS_API}/${projectId}/features`, {
        headers: { Authorization: `Bearer ${robot}` },
      });
      if (r.status === 401 || r.status === 403)
        r = await f(`${PROJECTS_API}/${projectId}/features`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      return r.ok ? ((await r.json()) as string[]) : null;
    } catch {
      return null;
    }
  };
  const pendingInvites = async (): Promise<SanityInvite[] | null> => {
    try {
      const r = await call('/invites?limit=100', robot);
      return r.ok ? ((await r.json()) as { data: SanityInvite[] }).data : null;
    } catch {
      return null;
    }
  };

  if (request.method === 'GET') {
    const plan = planOf(new URL(request.url).searchParams.get('plan'));
    try {
      const [usersRes, invites, feats] = await Promise.all([
        call('/users?limit=100', robot),
        pendingInvites(),
        features(),
      ]);
      if (!usersRes.ok || !invites)
        return json(
          {
            ok: false,
            error:
              usersRes.status === 401 || usersRes.status === 403
                ? 'The members key was refused by Sanity. It may have been removed, or made with the wrong role.'
                : 'Sanity did not answer. Try again in a minute.',
            manageUrl: manage,
          },
          502,
        );
      const users = ((await usersRes.json()) as { data: SanityUser[] }).data;
      return json({
        ok: true,
        configured: true,
        manageUrl: manage,
        projectId,
        helperAvailable: feats ? hasEditorRole(feats, plan) : plan !== 'free',
        members: memberRows(users, projectId, user.id),
        invites: inviteRows(invites),
      });
    } catch {
      return json(
        { ok: false, error: 'Sanity did not answer. Try again in a minute.', manageUrl: manage },
        502,
      );
    }
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'Not allowed.' }, 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const v = validatePeopleRequest(body);
  if (!v.ok) return json({ ok: false, errors: v.errors, error: Object.values(v.errors)[0] }, 400);
  const req = v.value;
  const plan = planOf((body as Record<string, unknown>).plan);

  const sendInvite = async (email: string, sanityRole: string) => {
    const r = await call('/invites', tokenForRole(sanityRole), {
      method: 'POST',
      body: JSON.stringify({ email, role: sanityRole }),
    });
    if (r.ok) return null;
    const detail = await r.text().catch(() => '');
    return inviteProblem(r.status, detail);
  };

  try {
    if (req.action === 'invite') {
      const feats = await features();
      // Unknown plan (Sanity did not say): on 'auto', try the Editor role and let Sanity answer.
      const sanityRole = sanityRoleFor(
        req.role,
        feats ?? (plan === 'free' ? [] : [EDITOR_FEATURE]),
        plan,
      );
      if (!sanityRole)
        return json(
          {
            ok: false,
            planLimit: true,
            error: 'The free Sanity plan has no role for that.',
            projectId,
            manageUrl: manage,
          },
          409,
        );
      const problem = await sendInvite(req.email, sanityRole);
      if (problem) return json({ ok: false, error: problem, manageUrl: manage }, 502);
      const first = req.name.split(' ')[0];
      return json({
        ok: true,
        message: `Invitation sent to ${first}. Sanity emails ${req.email} a link; once ${first} accepts and signs in, they appear under People.`,
      });
    }

    // Resend and cancel both start from the pending invitation itself.
    const invites = await pendingInvites();
    const invite = invites?.find((i) => i.id === req.id && i.status === 'pending');
    if (!invite)
      return json(
        { ok: false, error: 'That invitation was not found. It may have been accepted already.' },
        404,
      );
    const revoke = await call(
      `/invites/${encodeURIComponent(invite.id)}`,
      tokenForRole(invite.role),
      { method: 'DELETE' },
    );
    if (!revoke.ok)
      return json(
        { ok: false, error: 'Sanity would not change that invitation. Try again in a minute.' },
        502,
      );
    if (req.action === 'cancel')
      return json({
        ok: true,
        message: 'Invitation cancelled. The link in the email no longer works.',
      });

    if (!invite.email)
      return json({ ok: false, error: 'That invitation has no email address to send to.' }, 400);
    const problem = await sendInvite(invite.email, invite.role);
    if (problem) return json({ ok: false, error: problem, manageUrl: manage }, 502);
    return json({ ok: true, message: `A fresh invitation is on its way to ${invite.email}.` });
  } catch {
    return json(
      { ok: false, error: 'Sanity did not answer. Try again in a minute.', manageUrl: manage },
      502,
    );
  }
}

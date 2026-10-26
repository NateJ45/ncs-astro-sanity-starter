# People: invite a helper from the Studio (PORTS.md card 176)

An administrator adds someone to the Studio from the Studio itself: the `People` tool in the top bar. Name, email,
and one of two plain roles:

| In the tool   | Sanity role     | What it means                                                   |
| ------------- | --------------- | --------------------------------------------------------------- |
| Helper        | `editor`        | Edits and publishes; the simple staff view; no permanent delete |
| Administrator | `administrator` | Everything, including People and Delete forever                 |

The tool also lists who is a member (and what they can do) with a **Simple view** switch for each administrator
(card 175), and the pending invitations, each with `Send again` and `Cancel`. Changing a member's role or removing
them stays in sanity.io/manage, and the tool links there.

## Files

| Part        | File                               | Notes                                                                    |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Rules       | `src/lib/studio-people.ts`         | PORTABLE. Role mapping, validation, plain words, the route as a function |
| Tests       | `src/lib/studio-people.test.ts`    | PORTABLE. Order of checks, mapping, validation, which token is used      |
| Route       | `src/pages/api/studio/people.ts`   | PORTABLE. SSR, GET (list) and POST (invite, resend, cancel)              |
| Studio tool | `src/sanity/people/PeopleTool.tsx` | PORTABLE. Kit primitives (`../kit/ui`); invites through the route        |
| Plugin      | `src/sanity/people/index.tsx`      | PORTABLE. Registered AFTER the kit; adds the tool for administrators     |
| Guide       | `src/sanity/guides/people.ts`      | Per site. "Add someone to help with the website" (Housekeeping)          |
| Settings    | `kitConfig.people`                 | Per site. `plan`, role words, the lead line                              |

## Settings (`kitConfig.people` in `src/sanity/kit.config.ts`)

```ts
people: {
  plan: 'free',            // or 'auto' (the default): see "What Sanity allows"
  roles: {                 // optional; either role, either field
    helper: { title: 'Helper', description: 'Can edit pages and posts and publish them. ...' },
  },
  lead: 'Invite a colleague or a volunteer. ...', // optional line under the heading
},
```

`features.people: false` leaves the tool out. The route stays and answers only administrators.

## Who can call it

The route runs the same checks as every `/api/studio/*` route, then one more, in this order (tested): same origin, a
signed-in project member (`verifyStudioUser`), the caller's real Sanity role is `administrator`, then the members key
is set. Nothing reaches Sanity's Access API before all four pass. The tool is hidden from non-administrators too, but
that is a courtesy: the route is the lock. The plan travels with each request (`?plan=` and a `plan` body field): it
only decides whether Helper is offered, and the caller is already an administrator who could pick any role at
sanity.io/manage.

## What Sanity allows (checked 2026-10-26)

- Access API, `https://api.sanity.io/v2025-07-11/access/project/<projectId>`: `GET /users`, `GET /invites` (pending by
  default), `POST /invites` with `{ email, role }` (Sanity sends the email), `DELETE /invites/<id>`. There is no resend
  endpoint: resend is revoke, then invite again.
- Permissions: invite and revoke need `sanity.project.members.invite`; the lists need `sanity.project.members.read`.
- "Only administrators can invite other administrators", and the Administrator role cannot be given to a robot token.
  So Administrator invites, and cancelling or resending one, go out with the CALLER's own session token (already
  checked to be an administrator). Helper invites and both lists use the Worker secret; if Sanity refuses the robot
  key, the route tries once more as the caller.
- Roles by plan (sanity.io/docs/user-guides/roles): Administrator and Viewer on every plan; Editor, Developer and
  Contributor on Growth; custom roles Enterprise only. New projects start on a Growth trial. When a trial ends without
  an upgrade, non-admin members become viewers, so a Helper would become read-only.
- The route reads the project's feature list (`GET https://api.sanity.io/v2021-06-07/projects/<id>/features`):
  `roleEditor` there means Helper is available. **`plan: 'free'`** keeps Helper greyed out even while a trial still
  lists `roleEditor`, so nobody is invited into a role that turns read-only later. On Free, invite helpers as
  Administrators and turn on their **Simple view** (card 175): they get the staff view with no deploy.
- Seats: the Free plan and the Growth trial allow 20 users. A refusal for the seat limit comes back in plain words.

## The secret

`SANITY_MEMBERS_TOKEN`: a Sanity robot token for the project with the **Access Manager (Token only)** role, the least
that can invite: members and invitations, and no access to any content. Steps in `OPERATIONS.md`, "People: inviting
from the Studio". Never in the repo, `.env` or the dataset, and never logged or sent to the browser (a unit test checks
the route's answers never contain it). Without the secret the tool says "Inviting from here is not switched on yet" and
shows the sanity.io/manage steps; nothing fails and the build needs nothing.

## Simple view

The switch on each administrator writes the kit's `kit.studioStaff` document with the administrator's own Studio
session (no route): `setIfMissing`, then `unset` and `append` of that user id, so two administrators cannot overwrite
each other. Marks use the project user id (`resourceUserId`, the `p...` id the Studio's current user carries), not
Sanity's global id. Members who are not administrators already have the simple view by role, so the row says so
instead of offering a switch. How the Studio applies a mark: `docs/agent/studio-kit.md`, "The staff view".

## Still needs a signed-in test

Unit tests cover the rules with a fake Sanity. Not yet seen for real: the tool for an administrator (and absent for an
Editor), a real invite email arriving, a robot token with Access Manager being accepted by `POST /invites`, the
caller's session being accepted for an Administrator invite, the seat-limit wording, and the Simple view switch
applying on the marked person's next visit.

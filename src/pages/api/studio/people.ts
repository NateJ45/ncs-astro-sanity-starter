// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/people/ - the Studio's People tool (PORTS.md card 176)
// =============================================================================
// GET lists the project's members and pending invitations; POST invites a
// Helper or an Administrator, or resends or cancels an invitation. Protected
// like the other /api/studio/* routes (same origin and a signed-in Studio
// member, src/lib/studio-auth.ts), and on top of that the caller must be a
// project ADMINISTRATOR by their real Sanity role, checked before Sanity's
// Access API is touched.
//
// Needs one Worker secret, a Sanity robot token with the
// "Access Manager (Token only)" role:
//   SANITY_MEMBERS_TOKEN  (`npx wrangler secret put SANITY_MEMBERS_TOKEN`)
// Without it the route answers { configured: false } and the tool shows the
// sanity.io/manage steps instead. Administrator invites use the caller's own
// session (Sanity lets only administrators invite administrators). The token is
// never sent to the browser and never logged.
//
// Every rule is in src/lib/studio-people.ts, where the unit tests reach it.
// =============================================================================
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handlePeople } from '@/lib/studio-people';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const handler: APIRoute = async ({ request }) =>
  handlePeople(request, {
    sameOrigin: isSameOrigin,
    verify: async (req) => {
      const token = bearerToken(req);
      const user = await verifyStudioUser(token, import.meta.env.PUBLIC_SANITY_PROJECT_ID);
      return user && token ? { ...user, token } : null;
    },
    membersToken: (env as unknown as { SANITY_MEMBERS_TOKEN?: string }).SANITY_MEMBERS_TOKEN,
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  });

export const GET = handler;
export const POST = handler;

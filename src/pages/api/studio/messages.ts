// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/messages/ - the Studio's Messages inbox (PORTS.md card 114)
// =============================================================================
// Lists the form submissions in the Worker's D1 database (CONTACT_DB) and
// stores each one's status (New, Needs a person, Replied, Spam) back in D1.
// Protected exactly like the POST of /api/studio/deploy-status/: same origin
// and a signed-in Studio member (src/lib/studio-auth.ts), checked before the
// database is touched, on every method, including GET (these are people's
// messages). With no CONTACT_DB binding it answers { configured: false } and
// the tool says "Forms are not set up yet".
//
// All the rules (auth order, mapping, the prayer-request privacy rule) are in
// src/lib/studio-messages.ts, where the unit tests can reach them.
// The status table comes from migrations/*_message_status.sql.
// =============================================================================
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { d1Store, handleMessages, type D1Like } from '@/lib/studio-messages';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const handler: APIRoute = async ({ request }) => {
  const db = (env as unknown as { CONTACT_DB?: D1Like }).CONTACT_DB;
  return handleMessages(request, {
    store: db ? d1Store(db) : null,
    sameOrigin: isSameOrigin,
    verify: (req) => verifyStudioUser(bearerToken(req), import.meta.env.PUBLIC_SANITY_PROJECT_ID),
  });
};

export const GET = handler;
export const POST = handler;

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/rsvps/ - RSVP counts and replies for the Studio (PORTS.md card 127)
// =============================================================================
// GET                          -> { events: counts per event }
// GET ?event=<key>             -> that event's replies
// GET ?event=<key>&format=csv  -> the organiser's spreadsheet
// Names and emails: same origin and a signed-in Studio member first, on every
// method (src/lib/mail-studio.ts).
// =============================================================================
import type { APIRoute } from 'astro';
import { mailEnv } from '@/lib/mail-env';
import { handleRsvpStudio } from '@/lib/mail-studio';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const handler: APIRoute = async ({ request }) =>
  handleRsvpStudio(request, {
    db: mailEnv().CONTACT_DB ?? null,
    sameOrigin: isSameOrigin,
    verify: (req) => verifyStudioUser(bearerToken(req), import.meta.env.PUBLIC_SANITY_PROJECT_ID),
  });

export const GET = handler;
export const ALL = handler;

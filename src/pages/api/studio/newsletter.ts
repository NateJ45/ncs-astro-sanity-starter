// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/newsletter/ - the Studio's newsletter buttons (PORTS.md card 127)
// =============================================================================
// GET  ?id=<issue>  -> list size, this issue's send status, the signed-in email
// GET               -> list size and the last sends (Home's Newsletter card)
// POST { action: 'test' | 'start' | 'continue', id }
// Same origin and a signed-in Studio member first, on every method (fail
// closed); all the rules are in src/lib/mail-studio.ts and mail-newsletter.ts.
// =============================================================================
import type { APIRoute } from 'astro';
import { sendDeps } from '@/lib/mail-env';
import { handleNewsletterStudio } from '@/lib/mail-studio';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const handler: APIRoute = async ({ request }) => {
  const send = await sendDeps(request);
  if (send.reason) console.warn('[newsletter] not set up:', send.reason);
  return handleNewsletterStudio(request, {
    send,
    reason: send.reason,
    sameOrigin: isSameOrigin,
    verify: (req) => verifyStudioUser(bearerToken(req), import.meta.env.PUBLIC_SANITY_PROJECT_ID),
  });
};

export const GET = handler;
export const POST = handler;
